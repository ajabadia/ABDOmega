"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // omega_log.js
  var OmegaLog = class {
    static getTimestamp() {
      const now = /* @__PURE__ */ new Date();
      const h = now.getHours().toString().padStart(2, "0");
      const m = now.getMinutes().toString().padStart(2, "0");
      const s = now.getSeconds().toString().padStart(2, "0");
      const ms = now.getMilliseconds().toString().padStart(3, "0");
      return `[${h}:${m}:${s}.${ms}]`;
    }
    static info(tag, message, ...args) {
      console.log(`${this.getTimestamp()} [LOG] [${tag}] ${message}`, ...args);
    }
    static warn(tag, message, ...args) {
      console.warn(`${this.getTimestamp()} [WARN] [${tag}] ${message}`, ...args);
    }
    static error(tag, message, ...args) {
      console.error(`${this.getTimestamp()} [ERROR] [${tag}] ${message}`, ...args);
    }
    static debug(tag, message, ...args) {
      console.debug(`${this.getTimestamp()} [DEBUG] [${tag}] ${message}`, ...args);
    }
  };

  // omega_types.js
  function isRpcEnvelope(value) {
    return !!value && typeof value === "object" && "type" in value;
  }
  function normalizeIncomingEvent(value) {
    if (!isRpcEnvelope(value))
      return null;
    if (value.type === "PARAM_CHANGE") {
      const raw = value;
      return {
        type: "PARAMCHANGE",
        id: String(raw.target ?? raw.id ?? ""),
        value: Number(raw.value ?? 0)
      };
    }
    return value;
  }

  // omega_rpc.js
  var OmegaRPC = class {
    constructor() {
      __publicField(this, "requestId", 1e3);
      __publicField(this, "pendingRequests", /* @__PURE__ */ new Map());
      __publicField(this, "isConnected", false);
      __publicField(this, "lastActivity", Date.now());
      __publicField(this, "healthTimer", null);
      OmegaLog.info("RPC", "Aseptic Bridge Initialized");
      window.handleOmegaMessage = (json) => {
        this.lastActivity = Date.now();
        this.isConnected = true;
        this.updateHealthUI();
        try {
          const msg = typeof json === "string" ? JSON.parse(json) : json;
          if (msg.requestId && this.pendingRequests.has(msg.requestId)) {
            const req = this.pendingRequests.get(msg.requestId);
            clearTimeout(req.timer);
            this.pendingRequests.delete(msg.requestId);
            if (msg.type === "rpcError" || msg.type === "error") {
              req.reject(msg.payload || msg);
            } else {
              const data = msg.payload !== void 0 && msg.payload !== null ? msg.payload : msg;
              req.resolve(data);
            }
          } else {
            const norm = normalizeIncomingEvent(msg);
            if (norm) {
              const payload = norm.payload || norm;
              window.dispatchEvent(new CustomEvent(`omega:${norm.type}`, { detail: payload }));
            }
          }
        } catch (e) {
          OmegaLog.error("RPC", "Message parsing failed", e, json);
        }
      };
      this.startHealthMonitor();
    }
    handleNativeResponse(id, payload) {
      if (this.pendingRequests.has(id)) {
        const req = this.pendingRequests.get(id);
        clearTimeout(req.timer);
        this.pendingRequests.delete(id);
        if (payload && typeof payload === "object" && "payload" in payload && "type" in payload) {
          req.resolve(payload.payload);
        } else {
          req.resolve(payload);
        }
      }
    }
    startHealthMonitor() {
      if (this.healthTimer)
        clearInterval(this.healthTimer);
      this.healthTimer = setInterval(() => {
        const idleTime = Date.now() - this.lastActivity;
        if (idleTime > 5e3) {
          if (this.isConnected) {
            OmegaLog.warn("RPC", "Connection idle or lost (5s)");
            this.isConnected = false;
            this.updateHealthUI();
          }
        }
      }, 2e3);
    }
    updateHealthUI() {
      const led = document.getElementById("bridge-health-led");
      if (led) {
        led.classList.toggle("active", this.isConnected);
        led.style.backgroundColor = this.isConnected ? "var(--neon-cyan)" : "#331111";
        led.style.boxShadow = this.isConnected ? "0 0 10px var(--neon-cyan)" : "none";
      }
    }
    async _waitForBackend(timeout = 5e3) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const win2 = window;
        const bridge = win2.omegaNativeCall || win2.__JUCE__?.backend?.omegaNativeCall;
        if (typeof bridge === "function")
          return { omegaNativeCall: bridge };
        if (win2.__JUCE__?.backend?.emitEvent)
          return win2.__JUCE__.backend;
        await new Promise((r) => setTimeout(r, 100));
      }
      return null;
    }
    /**
     * Centralized Send Method with Timeout Protection
     */
    async send(type, payload = {}) {
      const id = this.requestId++;
      const message = { type, requestId: id, payload };
      const backend = await this._waitForBackend();
      if (!backend) {
        OmegaLog.error("RPC", `Backend UNREACHABLE for ${type}`);
        this.isConnected = false;
        this.updateHealthUI();
        return null;
      }
      const nativeFn = window.omegaNativeCall;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          if (this.pendingRequests.has(id)) {
            this.pendingRequests.delete(id);
            OmegaLog.error("RPC", `Request TIMEOUT [${id}] for ${type}`);
            reject(new Error(`RPC Timeout: ${type}`));
          }
        }, 1e4);
        this.pendingRequests.set(id, { resolve, reject, timer });
        try {
          if (typeof nativeFn === "function") {
            nativeFn(type, id, payload).then((res) => {
              if (res !== void 0 && res !== null) {
                this.handleNativeResponse(id, res);
              }
            });
          } else if (backend.emitEvent) {
            backend.emitEvent("omegaMessage", message);
          } else {
            throw new Error("No valid native invoke found");
          }
        } catch (e) {
          clearTimeout(timer);
          this.pendingRequests.delete(id);
          OmegaLog.error("RPC", `Native call failed for ${type}`, e);
          reject(e);
        }
      });
    }
    call(type, payload = {}) {
      return this.send(type, payload);
    }
    getState() {
      return this.send("getState");
    }
    getUiSchemas() {
      return this.send("getUiSchemas");
    }
    getSystemSettings() {
      return this.send("getSystemSettings");
    }
    uiReady() {
      return this.send("uiReady");
    }
  };
  var rpc = new OmegaRPC();
  window.omegaRPC = rpc;

  // SchemaStore.js
  var SchemaStore = class {
    constructor() {
      __publicField(this, "schemas", /* @__PURE__ */ new Map());
      __publicField(this, "isLoaded", false);
    }
    async ensureLoaded() {
      if (this.isLoaded)
        return true;
      try {
        const rpc2 = window.omegaRPC;
        if (!rpc2)
          return false;
        const response = await rpc2.send("getUiSchemas", {});
        if (response && response.schemas) {
          response.schemas.forEach((s) => {
            this.schemas.set(s.id, s);
          });
          this.isLoaded = true;
          return true;
        }
      } catch (e) {
        console.error("[SchemaStore] Load error:", e);
      }
      return false;
    }
    getSchema(id) {
      return this.schemas.get(id);
    }
    getAllSchemas() {
      return Array.from(this.schemas.values());
    }
  };
  window.schemaStore = new SchemaStore();

  // runtimeStores.js
  var BaseStore = class {
    constructor() {
      __publicField(this, "listeners", /* @__PURE__ */ new Set());
    }
    subscribe(callback) {
      this.listeners.add(callback);
      return () => this.listeners.delete(callback);
    }
    notify() {
      this.listeners.forEach((cb) => cb());
    }
  };
  var RuntimeStore = class extends BaseStore {
    constructor() {
      super(...arguments);
      __publicField(this, "state", {
        preset: null,
        params: {},
        telemetry: {},
        modulation: null,
        schemaVersion: null
      });
    }
    getSnapshot() {
      return this.state;
    }
    applyState(payload) {
      if (!payload)
        return;
      this.state = {
        ...this.state,
        schemaVersion: payload.schemaVersion || this.state.schemaVersion,
        preset: payload.preset || this.state.preset,
        params: payload.params ? { ...payload.params } : this.state.params
      };
      this.notify();
    }
    applyParamChange(event) {
      this.state = {
        ...this.state,
        params: {
          ...this.state.params,
          [event.id]: event.value
        }
      };
      this.notify();
    }
    applyTelemetryFrame(payload) {
      if (!payload)
        return;
      const nextTelemetry = { ...this.state.telemetry };
      for (const [key, value] of Object.entries(payload)) {
        if (key === "schemaVersion")
          continue;
        if (value && typeof value === "object") {
          nextTelemetry[key] = value;
        }
      }
      this.state = {
        ...this.state,
        schemaVersion: payload.schemaVersion || this.state.schemaVersion,
        telemetry: nextTelemetry
      };
      this.notify();
    }
    applyModulation(payload) {
      this.state = {
        ...this.state,
        modulation: payload
      };
      this.notify();
    }
    reduceEvent(event) {
      switch (event.type) {
        case "PARAMCHANGE":
          this.applyParamChange(event);
          return;
        case "onStateUpdate":
          this.applyState(event.payload);
          return;
        case "telemetryUpdate":
          this.applyTelemetryFrame(event.payload);
          return;
      }
    }
  };
  var SchemaStore2 = class extends BaseStore {
    constructor() {
      super(...arguments);
      __publicField(this, "state", {
        schemaVersion: null,
        uiSchema: null
      });
      __publicField(this, "loadPromise", null);
    }
    getSnapshot() {
      return this.state;
    }
    async ensureLoaded() {
      if (this.state.uiSchema)
        return true;
      if (this.loadPromise)
        return this.loadPromise;
      this.loadPromise = (async () => {
        try {
          const rpc2 = window.omegaRPC;
          if (!rpc2)
            return false;
          const response = await rpc2.getUiSchemas();
          if (response) {
            this.setSchema(response.schemas || response, response.schemaVersion || "1.0");
            return true;
          }
        } catch (e) {
          console.error("[SchemaStore] Load error:", e);
        } finally {
          this.loadPromise = null;
        }
        return false;
      })();
      return this.loadPromise;
    }
    setSchema(uiSchema, schemaVersion) {
      this.state = {
        schemaVersion: schemaVersion ?? this.state.schemaVersion,
        uiSchema
      };
      this.notify();
    }
    getSchemaForComponent(componentId) {
      if (!this.state.uiSchema)
        return null;
      return this.state.uiSchema[componentId] || null;
    }
  };
  var GraphStore = class extends BaseStore {
    constructor() {
      super(...arguments);
      __publicField(this, "state", {
        schemaVersion: null,
        graph: null
      });
    }
    getSnapshot() {
      return this.state;
    }
    setGraph(graph, schemaVersion) {
      this.state = {
        schemaVersion: schemaVersion ?? this.state.schemaVersion,
        graph
      };
      this.notify();
    }
  };
  var SessionStore = class extends BaseStore {
    constructor() {
      super();
      __publicField(this, "state", {
        selectedModuleId: null,
        focusedBinding: null,
        activeWorkspace: null,
        openPanels: []
      });
      this.loadFromStorage();
    }
    loadFromStorage() {
      const saved = localStorage.getItem("omega_session");
      if (saved) {
        try {
          this.state = { ...this.state, ...JSON.parse(saved) };
        } catch (e) {
        }
      }
    }
    persist() {
      localStorage.setItem("omega_session", JSON.stringify(this.state));
      this.notify();
    }
    getSnapshot() {
      return this.state;
    }
    setSelectedModule(moduleId) {
      this.state = { ...this.state, selectedModuleId: moduleId };
      this.persist();
    }
    setFocusedBinding(binding) {
      this.state = { ...this.state, focusedBinding: binding };
      this.persist();
    }
    setActiveWorkspace(workspace) {
      this.state = { ...this.state, activeWorkspace: workspace };
      this.persist();
    }
    openPanel(panelId) {
      if (this.state.openPanels.includes(panelId))
        return;
      this.state = { ...this.state, openPanels: [...this.state.openPanels, panelId] };
      this.persist();
    }
    closePanel(panelId) {
      this.state = { ...this.state, openPanels: this.state.openPanels.filter((id) => id !== panelId) };
      this.persist();
    }
  };

  // InventoryStore.js
  var InventoryStore = class extends BaseStore {
    constructor() {
      super(...arguments);
      __publicField(this, "items", /* @__PURE__ */ new Map());
      __publicField(this, "isLoaded", false);
      __publicField(this, "loadPromise", null);
    }
    async ensureLoaded() {
      if (this.isLoaded)
        return true;
      if (this.loadPromise)
        return this.loadPromise;
      this.loadPromise = (async () => {
        try {
          const rpc2 = window.omegaRPC;
          if (!rpc2)
            return false;
          const response = await rpc2.send("getInventory", {});
          const components = response.components || response.items || response;
          if (components && Array.isArray(components)) {
            this.items.clear();
            components.forEach((item) => {
              this.items.set(item.id, item);
            });
            this.isLoaded = true;
            this.notify();
            return true;
          }
        } catch (e) {
          console.error("[InventoryStore] Load error:", e);
        } finally {
          this.loadPromise = null;
        }
        return false;
      })();
      return this.loadPromise;
    }
    getItem(id) {
      return this.items.get(id);
    }
    getAllItems() {
      return Array.from(this.items.values());
    }
  };
  window.inventoryStore = new InventoryStore();

  // module_manager.js
  var ModuleManager = class {
    constructor() {
      __publicField(this, "activeModules", /* @__PURE__ */ new Map());
      __publicField(this, "oscilloscopes", []);
      __publicField(this, "midiViewer", null);
      __publicField(this, "lastState", null);
      __publicField(this, "isRendering", false);
      __publicField(this, "lastModuleCount", 0);
      this.activeModules = /* @__PURE__ */ new Map();
      this.oscilloscopes = [];
      this.midiViewer = null;
    }
    normalizeList(data) {
      if (!data)
        return [];
      let list = [];
      if (Array.isArray(data))
        list = data;
      else if (typeof data === "object")
        list = Object.values(data);
      return list.map((item) => Array.isArray(item) ? item[0] : item);
    }
    async updateRack(state) {
      if (this.isRendering)
        return;
      this.isRendering = true;
      try {
        console.log("[ModuleManager] updateRack checking stability...");
        const safeState = state || {};
        this.lastState = safeState;
        await window.schemaStore.ensureLoaded();
        await window.inventoryStore.ensureLoaded();
        const upper = document.getElementById("upper-rack");
        const lower = document.getElementById("lower-rack");
        const layerList = this.normalizeList(state.preset && state.preset.layers);
        const auxList = this.normalizeList(safeState.preset?.auxiliary || safeState.auxiliary || []);
        const mainChain = this.normalizeList(safeState.mainChain || []);
        const totalModules = layerList.length + auxList.length + mainChain.length;
        if (totalModules === this.lastModuleCount && totalModules > 0) {
          console.log("[ModuleManager] Structure stable. Skipping full re-render, notifying active instances.");
          this.activeModules.forEach((mod) => {
            if (mod.onStateUpdate)
              mod.onStateUpdate(state);
          });
          return;
        }
        this.lastModuleCount = totalModules;
        console.log(`[ModuleManager] Structural change detected (${totalModules} modules). Rebuilding racks...`);
        if (upper)
          upper.innerHTML = "";
        if (lower)
          lower.innerHTML = "";
        this.activeModules.clear();
        this.oscilloscopes = [];
        this.midiViewer = null;
        const layerData = layerList.length > 0 ? layerList[0] : null;
        const aux = auxList;
        if (aux.length === 0 && (!layerList || layerList.length === 0) && mainChain.length === 0) {
          console.log("[ModuleManager] No modules found. Awaiting legitimate preset data.");
          return;
        }
        for (const item of aux) {
          const id = item.instanceId || item.nodeId || item.id || item.slotName || "AUX";
          const label = item.label || item.name || item.slotName || id;
          const componentId = item.componentId || item.id || "";
          const schema = window.schemaStore.getSchema(componentId);
          const rackValue = item.rack?.toString().toLowerCase();
          const targetRack = rackValue === "upper" ? upper : lower;
          const rackType = rackValue === "upper" ? "aux" : "main";
          if (componentId === "patchbay_matrix" || componentId === "system.matrix") {
            continue;
          }
          if (schema) {
            const className = componentId === "midi_2_cv" || componentId === "midi_adapter" ? "ModuleMidiToCv" : "ModuleRenderer";
            await this.addModule(id, className, rackType, targetRack, {
              label,
              componentId,
              manifest: schema
            });
          } else {
            await this.renderContractError(id, rackType, targetRack, componentId, "MISSING_CONTRACT");
          }
        }
        if (layerData) {
          const arch = layerData.voiceArch || layerData.architecture || {};
          const chain = layerData.voiceChain;
          const layer = "A";
          if (chain && chain.nodes && chain.nodes.length > 0) {
            const nodes = this.normalizeList(chain.nodes);
            for (const node of nodes) {
              const componentId = node.componentId || node.id;
              const descriptor = null;
              let type = "core";
              const role = (node.role || "").toLowerCase();
              if (role === "source" || role === "oscillator")
                type = "osc";
              else if (role === "filter")
                type = "filter";
              else if (role === "amplifier")
                type = "amp";
              else if (role === "envelope" || role === "controller")
                type = "env";
              else if (role === "lfo")
                type = "lfo";
              else if (role === "fx")
                type = "fx";
              else if (role === "auxiliary" || role === "utility")
                type = "aux";
              if (descriptor && lower) {
                await this.addModule(node.nodeId || node.id || componentId, "ModuleRenderer", type, lower, {
                  descriptor,
                  componentId,
                  layer,
                  group: "MAIN"
                });
              } else if (lower) {
                await this.renderContractError(node.nodeId || node.id || componentId, type, lower, componentId, "UNRESOLVED_GRAPH_NODE");
              }
            }
          } else if (arch) {
            const categories = [
              { list: this.normalizeList(arch.oscillators || arch.oscillatorList), type: "osc" },
              { list: this.normalizeList(arch.filters || arch.filterList), type: "filter" },
              { list: this.normalizeList(arch.envelopes || arch.envelopeList), type: "env" },
              { list: this.normalizeList(arch.amplifiers || arch.amplifierList), type: "amp" },
              { list: this.normalizeList(arch.lfos || arch.lfoList), type: "lfo" },
              { list: this.normalizeList(arch.fxSlots || arch.fxList), type: "fx" }
            ];
            for (const cat of categories) {
              if (!cat.list || cat.list.length === 0)
                continue;
              for (const item of cat.list) {
                const componentId = item.componentId || item.id || item.type;
                const schema = window.schemaStore.getSchema(componentId);
                const layer2 = "A";
                if (schema && lower) {
                  await this.addModule(item.slotName || componentId, "ModuleRenderer", cat.type, lower, {
                    componentId,
                    layer: layer2,
                    group: "MAIN",
                    manifest: schema
                  });
                } else if (lower) {
                  await this.renderContractError(item.slotName || componentId, cat.type, lower, componentId, "ASEPTIC_SCHEMA_MISSING");
                }
              }
            }
          }
        }
        this.activeModules.forEach((mod) => {
          if (mod.onStateUpdate)
            mod.onStateUpdate(state);
        });
      } catch (e) {
        console.error("[ModuleManager] Error during rack update:", e);
        if (e && e.stack)
          console.error("[ModuleManager] Stack trace:", e.stack);
      } finally {
        this.isRendering = false;
      }
    }
    async renderContractError(id, type, container, componentId, reason) {
      if (!container)
        return;
      const el = document.createElement("div");
      el.className = `module module-${type} contract-error`;
      el.innerHTML = `
            <div class="module-header error">${id}</div>
            <div class="module-content">
                <div class="contract-error-icon">\u26A0\uFE0F</div>
                <div class="contract-error-msg">CONTRACT ERROR</div>
                <div class="contract-error-reason">${reason}</div>
                <div class="label-tiny">${componentId}</div>
            </div>
        `;
      container.appendChild(el);
    }
    async addModule(id, className, type, container, options = {}) {
      if (!container)
        return;
      const el = document.createElement("div");
      el.id = `mod-${id}`;
      el.className = `module module-${type} ${className} ${options.descriptor?.panelClass || ""}`;
      const header = document.createElement("div");
      header.className = "module-header";
      el.appendChild(header);
      const content = document.createElement("div");
      content.className = "module-content";
      el.appendChild(content);
      container.appendChild(el);
      if (window[className]) {
        const instance = new window[className](el, content, options.manifest);
        this.activeModules.set(id, instance);
        if (instance.init)
          await instance.init();
        if (instance.onStateUpdate && this.lastState)
          instance.onStateUpdate(this.lastState);
        if (className === "ModuleOscilloscope")
          this.oscilloscopes.push(instance);
        if (className === "ModuleMidiViewer")
          this.midiViewer = instance;
      }
    }
    getCanonicalId(id) {
      if (!id)
        return "";
      const parts = id.split("_");
      if (parts.length > 1 && !isNaN(parseInt(parts[parts.length - 1]))) {
        return parts.slice(0, -1).join("_");
      }
      return id;
    }
  };
  if (typeof window !== "undefined") {
    window.moduleManager = new ModuleManager();
  }

  // script.js
  var OmegaApp = class {
    constructor() {
      __publicField(this, "lastPresetName", "INITIAL PATCH");
      __publicField(this, "lcdTimer", null);
      __publicField(this, "initialized", false);
      OmegaLog.info("APP", "OmegaApp Constructor (Aseptic)");
    }
    async init() {
      OmegaLog.info("APP", "Initializing Aseptic App...");
      this.setupEventListeners();
      this.setupInteractions();
      this.setupMenus();
      this.setupModals();
      this.setupKeyboard();
      this.hideSplash();
      if (window.rpcCommandDispatcher) {
        await window.rpcCommandDispatcher.dispatch({ type: "uiReady", payload: {} });
        await window.rpcCommandDispatcher.dispatch({
          type: "subscribeTelemetry",
          payload: {
            pins: ["activity", "system:midi_monitor", "osc_va:v_out"]
          }
        });
      }
      this.initialized = true;
      OmegaLog.info("APP", "App Readiness Achieved.");
    }
    setupEventListeners() {
      window.addEventListener("omega:onLCDUpdate", (e) => this.updateLCD(e.detail, false));
      window.addEventListener("omega:onVersionUpdate", (e) => {
        const { version, build } = e.detail;
        this.updateVersion(version, build);
      });
      window.addEventListener("omega:telemetryUpdate", (e) => {
        const { payload, tier } = e.detail;
        if (!payload)
          return;
        if (payload["activity"]) {
          const active = payload["activity"].v > 0.01;
          document.querySelectorAll('.led[data-source="activity"]').forEach((led) => {
            led.classList.toggle("active", active);
          });
        }
        if (tier === "streaming") {
        }
      });
    }
    hideSplash() {
      const doHide = () => {
        const splash = document.getElementById("splash-screen");
        const rack = document.getElementById("omega-rack");
        if (splash) {
          splash.style.opacity = "0";
          splash.style.pointerEvents = "none";
          setTimeout(() => {
            splash.style.display = "none";
            if (rack) {
              rack.style.display = "flex";
              rack.classList.add("visible");
            }
          }, 1e3);
        }
      };
      setTimeout(doHide, 3500);
    }
    updateVersion(version, build, timestamp) {
      const topEl = document.getElementById("top-bar-version");
      if (topEl) {
        topEl.textContent = `OMEGA Era 6 [Build ${build || "ASEPTIC"}]`;
      }
      document.querySelectorAll(".splash-version, #app-title-mini, #about-version, .about-version").forEach((el) => {
        const htmlEl = el;
        htmlEl.textContent = version;
      });
      const buildEl = document.getElementById("about-build");
      if (buildEl)
        buildEl.textContent = build || "0";
      const tsEl = document.getElementById("about-timestamp");
      if (tsEl)
        tsEl.textContent = timestamp || "";
    }
    updateLCD(text, isTemporary) {
      const lcd = document.getElementById("lcd-text");
      if (!lcd)
        return;
      if (this.lcdTimer)
        clearTimeout(this.lcdTimer);
      if (isTemporary) {
        lcd.textContent = text;
        lcd.style.color = "#ff8888";
        this.lcdTimer = window.setTimeout(() => {
          lcd.textContent = this.lastPresetName;
          lcd.style.color = "#ff3c3c";
        }, 1500);
      } else {
        this.lastPresetName = text;
        lcd.textContent = text;
        lcd.style.color = "#ff3c3c";
      }
    }
    handleMenuAction(action) {
      switch (action) {
        case "clear_rack":
          if (window.confirm("WARNING: This will clear the entire modular rack. Are you sure?")) {
            window.rpcCommandDispatcher.dispatch({
              type: "newPreset",
              payload: {}
            });
          }
          break;
        case "new_preset":
          const presetName = window.prompt("New Preset Name:", "Init Preset");
          if (presetName !== null) {
            window.rpcCommandDispatcher.dispatch({
              type: "newPreset",
              payload: {}
              // Payload shape can be expanded if backend supports name
            });
          }
          break;
        case "exit":
          window.rpcCommandDispatcher.dispatch({ type: "exit", payload: {} });
          break;
        case "toggle_preferences_modal":
          this.showModal("preferences-modal");
          if (window.Preferences)
            window.Preferences.init();
          break;
        case "toggle_presets_modal":
          this.showModal("presets-modal");
          break;
        case "toggle_console":
          const c = document.getElementById("debug-console");
          if (c)
            c.style.display = c.style.display === "none" ? "block" : "none";
          break;
        case "toggle_matrix":
          this.showModal("modulation-modal");
          break;
        case "toggle_module_browser":
          this.showModal("module-browser-modal");
          break;
        case "about":
          if (window.rpcCommandDispatcher) {
            window.rpcCommandDispatcher.dispatch({ type: "getMetadata", payload: {} }).then((res) => {
              if (res)
                this.updateVersion(res.version, res.build, res.timestamp);
            });
          }
          this.showModal("about-modal");
          break;
        default:
          window.rpcCommandDispatcher.dispatch({ type: "systemAction", target: action });
          break;
      }
    }
    showModal(id) {
      const modal = document.getElementById(id);
      if (modal)
        modal.style.display = "flex";
    }
    setupModals() {
      document.querySelectorAll(".modal .close-btn, .modal .modal-ok-btn, .modal .pref-done-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const modal = btn.closest(".modal");
          if (modal)
            modal.style.display = "none";
        });
      });
    }
    setupInteractions() {
      const bind = (id, fn) => {
        const el = document.getElementById(id);
        if (el)
          el.onclick = fn;
      };
      bind("close-console", () => {
        const el = document.getElementById("debug-console");
        if (el)
          el.style.display = "none";
      });
      bind("clear-console", () => {
        const el = document.getElementById("debug-console-content");
        if (el)
          el.innerHTML = "";
      });
      bind("copy-console", () => {
        const el = document.getElementById("debug-console-content");
        if (!el)
          return;
        const text = el.innerText;
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          const successful = document.execCommand("copy");
          const btn = document.getElementById("copy-console");
          if (btn) {
            btn.innerText = successful ? "OK!" : "ERR";
            setTimeout(() => {
              if (btn)
                btn.innerText = "C";
            }, 1e3);
          }
        } catch (err) {
          console.error("Fallback copy failed", err);
        }
        document.body.removeChild(textArea);
      });
      this.setupSliders();
      this.setupButtons();
      this.setupBender();
    }
    setupSliders() {
      document.querySelectorAll(".v-slider, .v-slider-mini, .b-track").forEach((container) => {
        const pod = container.closest("[data-param]");
        if (!pod)
          return;
        const paramID = pod.getAttribute("data-param");
        const move = (e) => {
          const rect = container.getBoundingClientRect();
          let val = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
          window.rpcCommandDispatcher.dispatch({
            type: "setParameter",
            payload: { target: paramID, value: val }
          });
          this.updateLCD(paramID.toUpperCase() + ": " + val.toFixed(2), true);
        };
        container.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          container.setPointerCapture(e.pointerId);
          move(e);
          const onMove = (ev) => move(ev);
          const onUp = () => {
            container.removeEventListener("pointermove", onMove);
            container.removeEventListener("pointerup", onUp);
          };
          container.addEventListener("pointermove", onMove);
          container.addEventListener("pointerup", onUp);
        });
      });
    }
    setupButtons() {
      document.querySelectorAll(".sq[data-param], .tiny-btn[data-param], .juno-btn[data-param]").forEach((btn) => {
        const paramID = btn.getAttribute("data-param");
        btn.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          const isActive = btn.getAttribute("data-active") === "true";
          window.rpcCommandDispatcher.dispatch({ type: "setParameter", target: paramID, value: isActive ? 0 : 1 });
        });
      });
      document.querySelectorAll(".dropdown a[data-action]").forEach((btn) => {
        const action = btn.getAttribute("data-action");
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          OmegaLog.info("MENU", `Triggering action: ${action}`);
          this.handleMenuAction(action);
          document.querySelectorAll(".dropdown").forEach((d) => d.style.display = "none");
        };
      });
    }
    setupBender() {
      const stick = document.getElementById("bender-stick");
      const housing = document.getElementById("stick-housing");
      if (!stick || !housing)
        return;
      housing.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        housing.setPointerCapture(e.pointerId);
        const move = (ev) => {
          const rect = housing.getBoundingClientRect();
          let x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
          stick.style.left = x * 100 + "%";
          window.rpcCommandDispatcher.dispatch({ type: "setParameter", target: "bender", value: x });
        };
        const onUp = () => {
          housing.removeEventListener("pointermove", move);
          housing.removeEventListener("pointerup", onUp);
          stick.style.left = "50%";
          window.rpcCommandDispatcher.dispatch({ type: "setParameter", target: "bender", value: 0.5 });
        };
        housing.addEventListener("pointermove", move);
        housing.addEventListener("pointerup", onUp);
      });
    }
    setupMenus() {
      document.querySelectorAll(".menu-item").forEach((item) => {
        const htmlItem = item;
        if (htmlItem.id === "btn-global-matrix") {
          htmlItem.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleMenuAction("toggle_matrix");
          };
          return;
        }
        htmlItem.addEventListener("click", (e) => {
          const target = e.target;
          const dropdown = htmlItem.querySelector(".dropdown");
          if (target.tagName === "A" && target.hasAttribute("data-action")) {
            this.handleMenuAction(target.getAttribute("data-action"));
            if (dropdown)
              dropdown.style.display = "none";
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          if (!dropdown)
            return;
          const isVisible = dropdown.style.display === "block";
          document.querySelectorAll(".dropdown").forEach((d) => d.style.display = "none");
          dropdown.style.display = isVisible ? "none" : "block";
        });
      });
    }
    setupKeyboard() {
    }
  };
  var app = new OmegaApp();

  // preferences.js
  var OMEGA_Preferences = class {
    constructor() {
      __publicField(this, "settings", []);
      __publicField(this, "currentCategory", "GENERAL");
      console.log("[Preferences] Initialized (Aseptic)");
    }
    async init() {
      await this.refresh();
      this.setupTabs();
      this.render();
    }
    setupTabs() {
      const tabs = document.querySelectorAll(".pref-tab");
      tabs.forEach((tab) => {
        tab.onclick = () => {
          const htmlTab = tab;
          tabs.forEach((t) => t.classList.remove("active"));
          htmlTab.classList.add("active");
          this.currentCategory = htmlTab.textContent?.trim().toUpperCase() || "GENERAL";
          this.render();
        };
      });
    }
    async refresh() {
      try {
        const rpc2 = window.omegaRPC;
        if (rpc2) {
          const data = await rpc2.getSystemSettings();
          this.settings = Array.isArray(data) ? data : [];
        }
      } catch (e) {
        console.error("[Preferences] Refresh failed:", e);
      }
    }
    render() {
      const container = document.getElementById("preferences-body");
      if (!container)
        return;
      if (this.settings.length === 0) {
        container.innerHTML = `
                <div class="pref-loading">
                    <div class="spinner"></div>
                    <span>Communicating with OMEGA Engine...</span>
                </div>`;
        return;
      }
      container.innerHTML = "";
      const catSettings = this.settings.filter((s) => s.category.toUpperCase() === this.currentCategory.toUpperCase());
      if (catSettings.length === 0) {
        container.innerHTML = `<div class="pref-empty">No settings found for ${this.currentCategory}.</div>`;
        return;
      }
      catSettings.forEach((s) => {
        const row = document.createElement("div");
        row.className = "pref-row";
        let controlHtml = "";
        if (s.options) {
          const sortedKeys = Object.keys(s.options).sort((a, b) => parseFloat(a) - parseFloat(b));
          controlHtml = `<select class="pref-select" data-pref-id="${s.id}">
                    ${sortedKeys.map((val) => `<option value="${val}" ${Math.round(s.currentValue) == parseFloat(val) ? "selected" : ""}>${s.options[val]}</option>`).join("")}
                </select>`;
        } else {
          controlHtml = `<input type="number" class="pref-input" data-pref-id="${s.id}" value="${s.currentValue}" 
                                min="${s.minValue}" max="${s.maxValue}">`;
        }
        row.innerHTML = `
                <div class="pref-info">
                    <span class="pref-label">${s.label}</span>
                    <span class="pref-tooltip">${s.tooltip}</span>
                </div>
                <div class="pref-control">
                    ${controlHtml}
                    <button class="pref-reset-btn" data-reset-id="${s.id}">RESET</button>
                </div>
            `;
        container.appendChild(row);
        const ctrl = row.querySelector(`[data-pref-id="${s.id}"]`);
        ctrl.onchange = (e) => this.update(s.id, e.target.value);
        const resetBtn = row.querySelector(`[data-reset-id="${s.id}"]`);
        resetBtn.onclick = () => this.reset(s.id);
      });
    }
    async update(id, value) {
      const val = parseFloat(value);
      const rpc2 = window.omegaRPC;
      if (rpc2) {
        await rpc2.send("setSystemSetting", { id, value: val });
      }
      const s = this.settings.find((x) => x.id === id);
      if (s)
        s.currentValue = val;
    }
    reset(id) {
      const s = this.settings.find((x) => x.id === id);
      if (s) {
        this.update(id, s.defaultValue);
        this.render();
      }
    }
  };
  var Preferences = new OMEGA_Preferences();
  window.Preferences = Preferences;

  // service.js
  var OMEGA_ServiceMode = class {
    constructor() {
      __publicField(this, "params", []);
      __publicField(this, "activeVoice", -1);
      console.log("[Service] Initialized (Aseptic)");
    }
    async init() {
      try {
        await this.refreshParams();
      } catch (e) {
        console.error("[Service] Init failed:", e);
      }
      this.renderVoices();
    }
    async refreshParams() {
      const rpc2 = window.omegaRPC;
      if (rpc2) {
        try {
          this.params = await rpc2.send("getCalibrationParams");
          this.renderParams();
        } catch (e) {
          console.error("[Service] getCalibrationParams failed:", e);
        }
      }
    }
    renderParams() {
      const container = document.getElementById("service-params-list");
      if (!container)
        return;
      container.innerHTML = "";
      this.params.forEach((p) => {
        const row = document.createElement("div");
        row.className = "service-param-row";
        row.innerHTML = `
                <div class="service-param-info">
                    <span class="service-param-label">${p.label}</span>
                    <span class="service-param-value" id="val-${p.id}">${p.currentValue.toFixed(2)}${p.unit}</span>
                </div>
                <input type="range" class="service-slider" 
                    min="${p.minValue}" max="${p.maxValue}" step="${p.stepSize}" 
                    value="${p.currentValue}" data-param-id="${p.id}">
            `;
        container.appendChild(row);
        const slider = row.querySelector("input");
        slider.oninput = (e) => this.updateParam(p.id, e.target.value);
      });
    }
    async updateParam(id, value) {
      const val = parseFloat(value);
      const p = this.params.find((x) => x.id === id);
      const display = document.getElementById(`val-${id}`);
      if (display && p)
        display.innerText = val.toFixed(2) + p.unit;
      const dispatcher = window.rpcCommandDispatcher;
      if (dispatcher) {
        await dispatcher.dispatch({
          type: "serviceAction",
          value: { action: "setCalibrationParam", id, value: val }
        });
      }
    }
    renderVoices() {
      const container = document.getElementById("voice-test-grid");
      if (!container)
        return;
      container.innerHTML = "";
      for (let i = 0; i < 6; i++) {
        const btn = document.createElement("button");
        btn.className = "voice-test-btn";
        btn.innerText = `VOICE ${i + 1}`;
        btn.id = `btn-voice-${i}`;
        btn.onclick = () => this.toggleVoiceTest(i);
        container.appendChild(btn);
      }
    }
    async toggleVoiceTest(index) {
      const dispatcher = window.rpcCommandDispatcher;
      if (!dispatcher)
        return;
      if (this.activeVoice === index) {
        this.activeVoice = -1;
        await dispatcher.dispatch({ type: "serviceAction", value: { action: "stopVoiceTest" } });
        document.querySelectorAll(".voice-test-btn").forEach((b) => b.classList.remove("active"));
      } else {
        this.activeVoice = index;
        await dispatcher.dispatch({ type: "serviceAction", value: { action: "testVoice", voice: index } });
        document.querySelectorAll(".voice-test-btn").forEach((b) => b.classList.remove("active"));
        const btn = document.getElementById(`btn-voice-${index}`);
        if (btn)
          btn.classList.add("active");
      }
    }
    async serviceAction(action) {
      const dispatcher = window.rpcCommandDispatcher;
      if (dispatcher) {
        await dispatcher.dispatch({ type: "serviceAction", value: { action } });
      }
    }
  };
  var ServiceMode = new OMEGA_ServiceMode();
  window.ServiceMode = ServiceMode;

  // components/PresetBrowser.js
  var OMEGA_PresetBrowser = class {
    constructor() {
      __publicField(this, "data", { libraries: [] });
      __publicField(this, "selectedLibIdx", 0);
      __publicField(this, "selectedPresetIdx", -1);
      __publicField(this, "currentCategory", "All");
      __publicField(this, "searchQuery", "");
      console.log("[PresetBrowser] Initialized (Aseptic)");
    }
    async init() {
      this.setupListeners();
      await this.refresh();
    }
    setupListeners() {
      const search = document.getElementById("browser-search");
      if (search) {
        search.oninput = (e) => {
          this.searchQuery = e.target.value.toLowerCase();
          this.renderPresets();
        };
      }
      const attach = (id, fn) => {
        const el = document.getElementById(id);
        if (el)
          el.onclick = fn;
      };
      attach("preset-saveas-btn", () => this.showSaveAsModal());
    }
    async refresh() {
      try {
        const rpc2 = window.omegaRPC;
        if (rpc2) {
          const response = await rpc2.send("getBrowserData");
          if (response) {
            this.data = response;
            this.render();
          }
        }
      } catch (e) {
        console.error("[PresetBrowser] Refresh failed:", e);
      }
    }
    render() {
      this.renderCategories();
      this.renderLibraries();
      this.renderPresets();
    }
    renderCategories() {
      const list = document.getElementById("cat-list");
      if (!list)
        return;
      const system = ["All", "Factory", "User", "Favorites"];
      const custom = this.data.categories || [];
      const seen = /* @__PURE__ */ new Set();
      list.innerHTML = "";
      [...system, ...custom].forEach((cat) => {
        if (seen.has(cat))
          return;
        seen.add(cat);
        const li = document.createElement("li");
        li.textContent = cat;
        if (this.currentCategory === cat)
          li.classList.add("active");
        li.onclick = () => this.selectCategory(cat);
        list.appendChild(li);
      });
    }
    selectCategory(cat) {
      this.currentCategory = cat;
      this.selectedLibIdx = 0;
      this.selectedPresetIdx = -1;
      this.render();
    }
    renderLibraries() {
      const list = document.getElementById("lib-list");
      if (!list)
        return;
      list.innerHTML = "";
      this.data.libraries.forEach((lib, idx) => {
        let shouldShow = true;
        if (this.currentCategory === "Factory")
          shouldShow = lib.name.toUpperCase() === "FACTORY";
        else if (this.currentCategory === "User")
          shouldShow = lib.name.toUpperCase() === "USER" || lib.category === "User";
        else if (this.currentCategory === "Favorites")
          shouldShow = lib.patches.some((p) => p.favorite);
        else if (this.currentCategory !== "All")
          shouldShow = lib.category === this.currentCategory;
        if (!shouldShow)
          return;
        const li = document.createElement("li");
        li.innerHTML = `<span>${lib.name}</span>`;
        if (this.selectedLibIdx === idx)
          li.classList.add("active");
        li.onclick = () => this.selectLib(idx);
        list.appendChild(li);
      });
    }
    async selectLib(idx) {
      this.selectedLibIdx = idx;
      this.selectedPresetIdx = -1;
      const dispatcher = window.rpcCommandDispatcher;
      if (dispatcher) {
        await dispatcher.dispatch({ type: "selectLibrary", value: idx });
      }
      this.render();
    }
    renderPresets() {
      const list = document.getElementById("preset-list");
      if (!list)
        return;
      list.innerHTML = "";
      const lib = this.data.libraries[this.selectedLibIdx];
      if (!lib)
        return;
      lib.patches.forEach((p, idx) => {
        const matchesSearch = !this.searchQuery || p.name.toLowerCase().includes(this.searchQuery);
        if (!matchesSearch)
          return;
        const li = document.createElement("li");
        li.className = "preset-item";
        if (this.selectedPresetIdx === idx)
          li.classList.add("active");
        li.innerHTML = `<span class="preset-name">${p.name}</span>`;
        if (p.favorite)
          li.innerHTML += `<span class="preset-fav active">\u2605</span>`;
        li.onclick = () => this.selectPreset(idx);
        list.appendChild(li);
      });
    }
    async selectPreset(idx) {
      this.selectedPresetIdx = idx;
      const dispatcher = window.rpcCommandDispatcher;
      if (dispatcher) {
        await dispatcher.dispatch({
          type: "loadPreset",
          value: { libIdx: this.selectedLibIdx, prstIdx: idx }
        });
      }
      this.renderPresets();
      this.updateInfoPane();
    }
    updateInfoPane() {
      const lib = this.data.libraries[this.selectedLibIdx];
      const p = lib?.patches[this.selectedPresetIdx];
      if (!p)
        return;
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el)
          el.value = val;
      };
      setVal("meta-name", p.name);
      setVal("meta-author", p.author || "");
      setVal("meta-tags", p.tags || "");
      setVal("meta-notes", p.notes || "");
    }
    showSaveAsModal() {
      const modal = document.getElementById("modal-saveas");
      if (modal)
        modal.style.display = "flex";
    }
  };
  var PresetBrowser = new OMEGA_PresetBrowser();
  window.PresetBrowser = PresetBrowser;

  // module_renderer.js
  var ModuleRenderer = class {
    constructor(el, content, descriptor) {
      __publicField(this, "el");
      __publicField(this, "content");
      __publicField(this, "descriptor");
      __publicField(this, "values", {});
      __publicField(this, "isInitialized", false);
      this.el = el;
      this.content = content;
      this.descriptor = this.normalizeDescriptor(descriptor);
    }
    normalizeDescriptor(schema) {
      console.log(`[ModuleRenderer] Validating OMEGA Manifest for ${schema?.id || "unknown"}`);
      if (!schema || !schema.items || !schema.layout) {
        console.error("[ModuleRenderer] CONTRACT VIOLATION: Missing layout/items in manifest.", schema);
        throw new Error(`Critical Contract Violation: Module ${schema?.id} manifest is incomplete.`);
      }
      return {
        id: schema.id,
        version: schema.version || "6.0.0-ASEPTIC",
        hp: schema.layout.hp,
        theme: schema.theme,
        uiLayout: schema.layout,
        items: schema.items,
        registry: schema.registry
      };
    }
    getRegistryEntity(id) {
      if (!this.descriptor.registry)
        return null;
      return this.descriptor.registry.find((e) => e.id === id);
    }
    async init() {
      this.render();
      this.bind();
      this.isInitialized = true;
      if (window.runtimeStore) {
      }
    }
    render() {
      const desc = this.descriptor;
      const themeClass = `theme-${desc.theme || "default"}`;
      const classes = ["panel", desc.panelClass || "", "aseptic-panel", themeClass];
      const hpWidth = desc.hp ? desc.hp * 5.08 * 2.95 : 100;
      const widthStyle = `min-width: ${hpWidth}px; width: fit-content;`;
      this.content.innerHTML = `
            <div class="${classes.join(" ")}" style="${widthStyle}">
                <div class="module-grid" style="display:grid; grid-template-columns: repeat(${desc.uiLayout?.columns || 2}, 1fr); gap: ${desc.uiLayout?.gap || 12}px; padding: 30px 10px 10px 10px;">
                    ${desc.items ? desc.items.map((item) => this.renderItem(item)).join("") : ""}
                </div>
            </div>
        `;
    }
    renderItem(item) {
      const id = item.paramId || item.source || item.portId;
      const entity = id ? this.getRegistryEntity(id) : null;
      const style = `grid-row: ${item.row + 1}; grid-column: ${item.col + 1}${item.colSpan ? ` / span ${item.colSpan}` : ""};`;
      const label = item.label || (entity ? entity.label : id || "");
      return this.buildControlCell(item, entity, style, label);
    }
    buildControlCell(item, entity, style, label) {
      const id = item.paramId || item.source || item.portId || "";
      const cellClass = `control-cell variant-${item.variant || "default"}`;
      const bindAttr = id ? `data-bind="${id}"` : "";
      return `
            <div class="${cellClass}" style="${style}" ${bindAttr} data-id="${id}">
                <div class="cell-attachment-top">
                    ${item.look === "led" ? "" : this.renderAttachment(item, "top")}
                </div>

                <div class="cell-main">
                    ${this.renderComponent(item, entity, label)}
                </div>

                ${item.variant === "A" ? "" : `
                <div class="cell-info">
                    <label class="cell-label">${label.toUpperCase()}</label>
                    <div class="cell-display" data-precision="${item.look === "display" ? 0 : 2}">
                        ${entity ? this._getEntityValueLabel(entity, this.values[id] || entity.range?.default || 0) : "---"}
                    </div>
                </div>
                `}

                <div class="cell-attachment-bottom">
                    ${this.renderAttachment(item, "bottom")}
                </div>
            </div>
        `;
    }
    renderAttachment(item, position) {
      if (item.look === "led" && position === "top") {
        return `<div class="led variant-${item.variant || "default"}" data-source="${item.source || item.paramId || ""}"></div>`;
      }
      if (item.look === "meter" && position === "top") {
        return `<div class="mini-meter"><div class="meter-bar"></div></div>`;
      }
      return "";
    }
    renderComponent(item, entity, label) {
      const look = item.look || "knob";
      const id = item.paramId || item.source || item.portId || "";
      switch (look) {
        case "knob":
          return `
                    <div class="knob-ring" data-param="${id}">
                        <div class="knob"><div class="knob-marker white"></div></div>
                    </div>
                `;
        case "slider-v":
        case "slider-h":
          const range = entity?.range || { min: 0, max: 1, step: "any", default: 0 };
          return `<input type="range" class="${look === "slider-h" ? "h-slider" : "v-slider"}" data-param="${id}" min="${range.min}" max="${range.max}" step="${range.step}" value="${range.default}" />`;
        case "select":
          return `
                    <select class="selector-control" data-param="${id}">
                        ${entity?.options ? entity.options.map((o) => `<option value="${o.value}">${o.label}</option>`).join("") : '<option value="0">DEFAULT</option>'}
                    </select>
                `;
        case "switch":
        case "toggle":
        case "button":
          return `<div class="sw-unit" data-param="${id}"><div class="sw-path"><div class="sw-peg"></div></div></div>`;
        case "display":
          return `
                    <div class="display-unit" data-param="${id}">
                        <button class="stepper-btn minus" data-dir="-1">\uFF0D</button>
                        <div class="display-screen">
                            <span class="display-value">${entity ? this._getEntityValueLabel(entity, this.values[id] || entity.range?.default || 0) : "---"}</span>
                        </div>
                        <button class="stepper-btn plus" data-dir="1">\uFF0B</button>
                    </div>
                `;
        case "led":
          return `<div class="led variant-${item.variant || "default"}" id="led-${id}" data-source="${id}"></div>`;
        default:
          return `<!-- Component ${look} -->`;
      }
    }
    bind() {
      if (!this.descriptor.items)
        return;
      this.descriptor.items.forEach((item) => {
        const look = item.look || "knob";
        const id = item.paramId || item.source || item.portId;
        const entity = id ? this.getRegistryEntity(id) : null;
        if (!entity)
          return;
        if (look === "knob") {
          const ctrl = this.content.querySelector(`[data-param="${id}"].knob-ring`);
          if (ctrl)
            this._bindKnob(ctrl, entity);
        } else if (look === "slider-v" || look === "slider-h") {
          const input = this.content.querySelector(`input[data-param="${id}"]`);
          if (input)
            input.addEventListener("input", (e) => this.setParam(id, parseFloat(e.target.value)));
        } else if (look === "display") {
          const ctrl = this.content.querySelector(`.display-unit[data-param="${id}"]`);
          if (ctrl)
            this._bindDisplay(ctrl, entity);
        } else if (look === "select") {
          const sel = this.content.querySelector(`select[data-param="${id}"]`);
          if (sel)
            sel.addEventListener("change", (e) => this.setParam(id, parseFloat(e.target.value)));
        } else if (look === "button" || look === "switch" || look === "toggle") {
          const trigger = this.content.querySelector(`[data-param="${id}"]`);
          if (trigger) {
            trigger.addEventListener("click", () => {
              const current = this.values[id] || entity.range?.default || 0;
              this.setParam(id, current > 0.5 ? 0 : 1);
            });
          }
        }
      });
    }
    _bindKnob(ctrl, entity) {
      const knob = ctrl.querySelector(".knob");
      if (!knob)
        return;
      let isDragging = false;
      let startY = 0;
      let startVal = 0;
      const range = entity.range || { min: 0, max: 1 };
      knob.addEventListener("mousedown", (e) => {
        isDragging = true;
        startY = e.clientY;
        startVal = this.values[entity.id] || range.default || 0;
        e.preventDefault();
      });
      const onMove = (e) => {
        if (!isDragging)
          return;
        const delta = (startY - e.clientY) / 150;
        let next = startVal + delta * (range.max - range.min);
        next = Math.max(range.min, Math.min(range.max, next));
        this.setParam(entity.id, next);
      };
      const onUp = () => {
        isDragging = false;
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }
    _bindDisplay(ctrl, entity) {
      const btns = ctrl.querySelectorAll(".stepper-btn");
      btns.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const dir = parseInt(e.target.dataset.dir || "0");
          const range = entity.range || { min: 0, max: 1, step: 1 };
          const current = this.values[entity.id] ?? range.default ?? 0;
          const opts = entity.options;
          if (opts && opts.length > 0) {
            const currentIndex = opts.findIndex((o) => o.value === current);
            const nextIndex = Math.max(0, Math.min(opts.length - 1, currentIndex + dir));
            const selected = opts[nextIndex];
            if (selected)
              this.setParam(entity.id, selected.value);
          } else {
            let next = current + dir;
            next = Math.max(range.min, Math.min(range.max, next));
            this.setParam(entity.id, next);
          }
        });
      });
    }
    setParam(id, value) {
      this.values[id] = value;
      const paramId = `${this.descriptor.id}.${id}`;
      window.rpcCommandDispatcher.dispatch({ type: "setParameter", target: paramId, value });
      this.updateControlUI(id, value);
    }
    updateControlUI(id, value) {
      const entity = this.getRegistryEntity(id);
      if (!entity)
        return;
      const cell = this.content.querySelector(`[data-id="${id}"]`);
      if (!cell)
        return;
      const input = cell.querySelector(`input[data-param="${id}"]`);
      if (input)
        input.value = value.toString();
      const sw = cell.querySelector(`.sw-unit[data-param="${id}"]`);
      if (sw)
        sw.setAttribute("data-state", value > 0.5 ? "1" : "0");
      const sel = cell.querySelector(`select[data-param="${id}"]`);
      if (sel)
        sel.value = value.toString();
      const knob = cell.querySelector(`.knob-ring[data-param="${id}"]`);
      if (knob)
        this._updateKnobVisual(knob, entity, value);
      const display = cell.querySelector(".cell-display");
      if (display) {
        display.innerText = this._getEntityValueLabel(entity, value);
      }
    }
    _getEntityValueLabel(entity, value) {
      if (!entity)
        return value.toString();
      if (entity.options) {
        const opt = entity.options.find((o) => o.value === value);
        if (opt)
          return opt.label;
      }
      if (entity.id === "midi_channel" && value >= 0 && value <= 16) {
        return value === 0 ? "OMNI" : `CH ${Math.round(value)}`;
      }
      return typeof value === "number" ? value.toFixed(2) : value.toString();
    }
    _updateKnobVisual(ctrl, entity, value) {
      const marker = ctrl.querySelector(".knob-marker");
      if (!marker)
        return;
      const range = entity.range || { min: 0, max: 1 };
      const norm = (value - range.min) / (range.max - range.min || 1);
      const angle = -135 + norm * 270;
      marker.style.transform = `translateX(-50%) rotate(${angle}deg)`;
    }
    syncAllFromStore() {
      if (!this.isInitialized || !this.descriptor.items)
        return;
      this.descriptor.items.forEach((item) => {
        const id = item.paramId || item.id || item.source;
        if (id) {
          const globalId = `${this.descriptor.id}.${id}`;
          const store = window.runtimeStore.getSnapshot();
          const val = store.params[globalId];
          const tVal = store.telemetry[globalId];
          if (val !== void 0) {
            this.values[id] = val;
            this.updateControlUI(id, val);
          }
          if (tVal !== void 0) {
            this.updateTelemetryUI(id, tVal.v || 0);
          }
        }
      });
    }
    updateTelemetryUI(source, value) {
      const leds = this.content.querySelectorAll(`.led[data-source="${source}"]`);
      leds.forEach((led) => {
        led.classList.toggle("active", value > 0.05);
      });
      const meters = this.content.querySelectorAll(`[data-source="${source}"] .meter-bar, [data-source="${source}"] .mini-meter .meter-bar`);
      meters.forEach((bar) => {
        bar.style.height = `${Math.min(100, value * 100)}%`;
      });
    }
    onStateUpdate(state) {
      this.syncAllFromStore();
    }
  };

  // components/ModuleOscilloscope.js
  var ModuleOscilloscope = class {
    constructor(el, content, descriptor) {
      __publicField(this, "el");
      __publicField(this, "content");
      __publicField(this, "canvas");
      __publicField(this, "ctx");
      __publicField(this, "descriptor");
      __publicField(this, "isPowered", true);
      __publicField(this, "sourceA", 10);
      // Default DCO Main
      __publicField(this, "sourceB", 13);
      // Default VCF Out
      __publicField(this, "isDual", true);
      __publicField(this, "isFrozen", false);
      __publicField(this, "syncEnabled", true);
      __publicField(this, "timebase", 1);
      __publicField(this, "dataA", []);
      __publicField(this, "dataB", []);
      __publicField(this, "allSources", []);
      __publicField(this, "filteredSources", []);
      __publicField(this, "pollingInterval");
      __publicField(this, "animationId", 0);
      __publicField(this, "resizeObserver", null);
      // Modal state
      __publicField(this, "modalActive", false);
      __publicField(this, "modalCanvas", null);
      __publicField(this, "modalCtx", null);
      __publicField(this, "modalTimebase", 1);
      this.el = el;
      this.content = content;
      this.descriptor = descriptor;
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d");
      this.render();
    }
    async init() {
      this.setupResizeObserver();
      await this.fetchSourcesWithRetry();
      this.startPolling();
      this.startDrawLoop();
      this.bindEvents();
      this.bindModalEvents();
      setTimeout(() => this.resize(), 100);
      setTimeout(() => this.resize(), 500);
    }
    generateGroupedOptions(list) {
      const groups = {};
      for (const opt of list) {
        const groupName = opt.instance || "Global";
        if (!groups[groupName])
          groups[groupName] = [];
        groups[groupName].push(opt);
      }
      let html = "";
      for (const [group, items] of Object.entries(groups)) {
        html += `<optgroup label="${group.toUpperCase()}">`;
        for (const item of items) {
          const displayName = item.name.replace(group, "").trim() || item.name;
          html += `<option value="${item.telemetryIndex}">${displayName}</option>`;
        }
        html += `</optgroup>`;
      }
      return html;
    }
    setupResizeObserver() {
      const area = this.content.querySelector(".visualizer-container");
      if (area && typeof ResizeObserver !== "undefined") {
        this.resizeObserver = new ResizeObserver(() => {
          requestAnimationFrame(() => this.resize());
        });
        this.resizeObserver.observe(area);
      }
      window.addEventListener("resize", () => {
        requestAnimationFrame(() => this.resize());
      });
    }
    async fetchSourcesWithRetry() {
      if (window.rpcCommandDispatcher) {
        try {
          const resp = await window.rpcCommandDispatcher.dispatch({
            type: "systemQuery",
            target: "getModulationMetadata"
          });
          if (resp && resp.sources) {
            this.allSources = resp.sources.filter((s) => s.telemetryIndex !== -1);
            this.filteredSources = this.allSources;
            this.updateSelectors();
            return;
          }
        } catch (e) {
        }
      }
      setTimeout(() => this.fetchSourcesWithRetry(), 2e3);
    }
    render() {
      const isMaster = this.el.closest("#upper-rack") !== null;
      if (isMaster)
        this.el.classList.add("master-view");
      this.content.innerHTML = `
            <div class="ModuleOscilloscope-inner ${isMaster ? "master-layout" : ""}" style="display: flex; flex-direction: column; height: 100%;">
                <div class="module-controls" style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 4px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button id="osc-power" class="juno-btn power-btn active" style="width:24px; height:24px; font-size:10px;" title="POWER">\u23FB</button>
                        <span class="module-title" style="font-size: 9px; opacity: 0.6; letter-spacing: 1px;">SCOPE ${this.descriptor.label || "MASTER"}</span>
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button id="osc-modal-trigger" class="btn-scope-focus" style="width:24px; height:24px;" title="Advanced Analyzer">\u26F6</button>
                        <button id="osc-freeze" class="sq" style="width:24px; height:24px; font-size:10px;" title="FREEZE">\u2744\uFE0F</button>
                    </div>
                </div>

                <div class="visualizer-container" style="flex: 1; min-height: 60px; position: relative; border: 1px solid #222; background: #000;">
                    <canvas id="osc-canvas-mini"></canvas>
                    <div id="osc-standby" style="position: absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:rgba(0,242,255,0.1); font-size: 8px; letter-spacing: 4px; display: none;">STANDBY</div>
                </div>

                <div class="scope-footer-row" style="display: flex; gap: 4px; margin-top: 4px;">
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 2px;">
                        <label style="font-size: 7px; text-transform: uppercase; opacity: 0.5;">Src A</label>
                        <select id="sel-src-a" class="scope-select" style="width: 100%; font-size: 9px; height: 18px; padding: 0 2px;"></select>
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 2px;">
                        <label style="font-size: 7px; text-transform: uppercase; opacity: 0.5;">Src B</label>
                        <select id="sel-src-b" class="scope-select" style="width: 100%; font-size: 9px; height: 18px; padding: 0 2px;"></select>
                    </div>
                </div>
            </div>
        `;
      this.canvas = this.content.querySelector("#osc-canvas-mini");
      this.ctx = this.canvas.getContext("2d");
    }
    updateSelectors() {
      const selA = this.content.querySelector("#sel-src-a");
      const selB = this.content.querySelector("#sel-src-b");
      const modSelA = document.getElementById("scope-modal-src-a");
      const modSelB = document.getElementById("scope-modal-src-b");
      if (!selA || !selB)
        return;
      const options = this.generateGroupedOptions(this.filteredSources);
      selA.innerHTML = options;
      selB.innerHTML = `<option value="-1">OFF</option>` + options;
      if (modSelA && modSelB) {
        modSelA.innerHTML = options;
        modSelB.innerHTML = `<option value="-1">OFF</option>` + options;
      }
      selA.value = this.sourceA.toString();
      selB.value = this.sourceB.toString();
    }
    bindEvents() {
      const btnPower = this.content.querySelector("#osc-power");
      const btnFreeze = this.content.querySelector("#osc-freeze");
      const btnModal = this.content.querySelector("#osc-modal-trigger");
      const selA = this.content.querySelector("#sel-src-a");
      const selB = this.content.querySelector("#sel-src-b");
      const standby = this.content.querySelector("#osc-standby");
      btnPower.onclick = () => {
        this.isPowered = !this.isPowered;
        btnPower.classList.toggle("active", this.isPowered);
        if (standby)
          standby.style.display = this.isPowered ? "none" : "block";
      };
      btnFreeze.onclick = () => {
        this.isFrozen = !this.isFrozen;
        btnFreeze.classList.toggle("active", this.isFrozen);
      };
      btnModal.onclick = () => this.openModal();
      selA.onchange = () => {
        this.sourceA = parseInt(selA.value);
        this.syncModalInputs();
      };
      selB.onchange = () => {
        this.sourceB = parseInt(selB.value);
        this.isDual = this.sourceB !== -1;
        this.syncModalInputs();
      };
    }
    bindModalEvents() {
      const modal = document.getElementById("oscilloscope-modal");
      if (!modal)
        return;
      const selA = document.getElementById("scope-modal-src-a");
      const selB = document.getElementById("scope-modal-src-b");
      const timebaseRange = document.getElementById("scope-modal-timebase");
      const freezeBtn = document.getElementById("scope-modal-freeze");
      const okBtn = modal.querySelector(".modal-ok-btn");
      const closeBtn = modal.querySelector(".close-btn");
      if (selA)
        selA.onchange = () => {
          this.sourceA = parseInt(selA.value);
          this.updateSelectors();
        };
      if (selB)
        selB.onchange = () => {
          this.sourceB = parseInt(selB.value);
          this.isDual = this.sourceB !== -1;
          this.updateSelectors();
        };
      if (timebaseRange)
        timebaseRange.oninput = () => {
          this.modalTimebase = parseInt(timebaseRange.value) / 50;
          const valLabel = document.getElementById("scope-val-timebase");
          if (valLabel)
            valLabel.innerText = `${timebaseRange.value}ms`;
        };
      if (freezeBtn)
        freezeBtn.onclick = () => {
          this.isFrozen = !this.isFrozen;
          freezeBtn.classList.toggle("active", this.isFrozen);
          const miniFreeze = this.content.querySelector("#osc-freeze");
          if (miniFreeze)
            miniFreeze.classList.toggle("active", this.isFrozen);
        };
      const close = () => {
        modal.style.display = "none";
        this.modalActive = false;
      };
      if (okBtn)
        okBtn.onclick = close;
      if (closeBtn)
        closeBtn.onclick = close;
    }
    openModal() {
      const modal = document.getElementById("oscilloscope-modal");
      if (!modal)
        return;
      modal.style.display = "flex";
      this.modalActive = true;
      this.modalCanvas = document.getElementById("scope-large-canvas");
      if (this.modalCanvas) {
        this.modalCtx = this.modalCanvas.getContext("2d");
        const rect = this.modalCanvas.parentElement.getBoundingClientRect();
        this.modalCanvas.width = rect.width;
        this.modalCanvas.height = rect.height;
      }
      this.syncModalInputs();
    }
    syncModalInputs() {
      const modSelA = document.getElementById("scope-modal-src-a");
      const modSelB = document.getElementById("scope-modal-src-b");
      const modFreeze = document.getElementById("scope-modal-freeze");
      if (modSelA)
        modSelA.value = this.sourceA.toString();
      if (modSelB)
        modSelB.value = this.sourceB.toString();
      if (modFreeze)
        modFreeze.classList.toggle("active", this.isFrozen);
    }
    startPolling() {
      this.pollingInterval = setInterval(async () => {
        if (!this.isPowered || this.isFrozen)
          return;
        if (window.rpcCommandDispatcher) {
          const indices = [this.sourceA];
          if (this.isDual)
            indices.push(this.sourceB);
          try {
            const data = await window.rpcCommandDispatcher.dispatch({
              type: "getTelemetry",
              value: { indices }
            });
            if (data) {
              if (data[this.sourceA.toString()])
                this.dataA = data[this.sourceA.toString()].history || [];
              if (this.isDual && data[this.sourceB.toString()])
                this.dataB = data[this.sourceB.toString()].history || [];
            }
          } catch (e) {
          }
        }
      }, 33);
    }
    startDrawLoop() {
      const loop = () => {
        if (this.isPowered) {
          this.draw(this.ctx, this.canvas, this.timebase);
          if (this.modalActive && this.modalCtx && this.modalCanvas) {
            this.draw(this.modalCtx, this.modalCanvas, this.modalTimebase);
          }
        }
        this.animationId = requestAnimationFrame(loop);
      };
      loop();
    }
    resize() {
      const area = this.content.querySelector(".visualizer-container");
      if (area) {
        const rect = area.getBoundingClientRect();
        const w = Math.floor(rect.width);
        const h = Math.floor(rect.height);
        if (w > 2 && h > 2 && (this.canvas.width !== w || this.canvas.height !== h)) {
          this.canvas.width = w;
          this.canvas.height = h;
        }
      }
    }
    draw(ctx, canvas, tb) {
      const { width, height } = canvas;
      if (width === 0 || height === 0)
        return;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(0,242,255,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.02)";
      const gridX = 10;
      const gridY = 8;
      for (let i = 0; i <= gridX; i++) {
        const x = width / gridX * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let i = 0; i <= gridY; i++) {
        const y = height / gridY * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      this.renderTrace(ctx, canvas, this.dataA, "#00f2ff", tb);
      if (this.isDual) {
        this.renderTrace(ctx, canvas, this.dataB, "#ffaa00", tb);
      }
    }
    renderTrace(ctx, canvas, data, color, tb) {
      if (!data || data.length < 2)
        return;
      const { width, height } = canvas;
      const visibleCount = Math.floor(data.length * tb);
      let startIndex = 0;
      if (this.syncEnabled) {
        const limit = Math.floor(data.length / 2);
        for (let i = 0; i < limit; ++i) {
          if ((data[i] || 0) < 0 && (data[i + 1] || 0) >= 0) {
            startIndex = i;
            break;
          }
        }
      }
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = canvas.width > 400 ? 2.5 : 1.8;
      ctx.lineJoin = "round";
      const step = width / (visibleCount - 1);
      for (let i = 0; i < visibleCount; i++) {
        const idx = (startIndex + i) % data.length;
        const x = i * step;
        const val = data[idx] ?? 0;
        const y = height / 2 - val * (height / 2.2);
        if (i === 0)
          ctx.moveTo(x, y);
        else
          ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = canvas.width > 400 ? 10 : 6;
      ctx.shadowColor = color;
      ctx.globalAlpha = 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
    onStateUpdate(state) {
      this.fetchSourcesWithRetry();
    }
    destroy() {
      if (this.resizeObserver)
        this.resizeObserver.disconnect();
      if (this.pollingInterval)
        clearInterval(this.pollingInterval);
      if (this.animationId)
        cancelAnimationFrame(this.animationId);
    }
  };
  if (typeof window !== "undefined")
    window.ModuleOscilloscope = ModuleOscilloscope;

  // components/ModuleMidiTrigger.js
  var ModuleMidiTrigger = class {
    constructor(el, content, descriptor) {
      __publicField(this, "el");
      __publicField(this, "content");
      __publicField(this, "descriptor");
      __publicField(this, "currentNote", 0);
      // index in ["C", ...]
      __publicField(this, "currentOctave", 5);
      this.el = el;
      this.content = content;
      this.descriptor = descriptor;
      this.render();
    }
    async init() {
      this.bind();
    }
    render() {
      const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
      const octaves = [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8];
      this.content.innerHTML = `
            <div class="midi-trigger-container" style="display: flex; flex-direction: column; height: 100%; padding: 10px; gap: 10px; justify-content: center; align-items: center;">
                <div class="trigger-selectors" style="display: flex; gap: 5px; width: 100%;">
                    <select id="trigger-note" class="pref-select" style="flex: 2;">
                        ${notes.map((n, i) => `<option value="${i}" ${i === this.currentNote ? "selected" : ""}>${n}</option>`).join("")}
                    </select>
                    <select id="trigger-octave" class="pref-select" style="flex: 1;">
                        ${octaves.map((o) => `<option value="${o}" ${o === this.currentOctave ? "selected" : ""}>${o}</option>`).join("")}
                    </select>
                </div>
                
                <div class="trigger-main" style="flex: 1; display: flex; justify-content: center; align-items: center; width: 100%;">
                    <div id="big-fire-btn" class="sq juno-white" style="
                        width: 80px; height: 80px; 
                        border-radius: 50%; 
                        display: flex; justify-content: center; align-items: center; 
                        cursor: pointer; 
                        box-shadow: 0 0 15px rgba(0, 242, 255, 0.2);
                        transition: all 0.1s ease;
                        font-weight: bold;
                        border: 2px solid #00f2ff;
                    ">
                        FIRE
                    </div>
                </div>
            </div>
        `;
    }
    bind() {
      const noteSel = this.content.querySelector("#trigger-note");
      const octSel = this.content.querySelector("#trigger-octave");
      const fireBtn = this.content.querySelector("#big-fire-btn");
      noteSel.onchange = () => this.currentNote = parseInt(noteSel.value);
      octSel.onchange = () => this.currentOctave = parseInt(octSel.value);
      const trigger = (on) => {
        const midiNote = (this.currentOctave + 2) * 12 + this.currentNote;
        const velocity = on ? 127 : 0;
        const status = on ? 144 : 128;
        if (on) {
          fireBtn.style.backgroundColor = "#00f2ff";
          fireBtn.style.color = "#000";
          fireBtn.style.boxShadow = "0 0 30px #00f2ff";
          fireBtn.style.transform = "scale(0.95)";
        } else {
          fireBtn.style.backgroundColor = "";
          fireBtn.style.color = "";
          fireBtn.style.boxShadow = "0 0 15px rgba(0, 242, 255, 0.2)";
          fireBtn.style.transform = "";
        }
        if (window.rpcCommandDispatcher) {
          window.rpcCommandDispatcher.dispatch({
            type: "sendMidi",
            target: "system",
            args: [status, midiNote, velocity]
          });
        }
      };
      fireBtn.onmousedown = () => trigger(true);
      fireBtn.onmouseup = () => trigger(false);
      fireBtn.onmouseleave = () => trigger(false);
      fireBtn.ontouchstart = (e) => {
        e.preventDefault();
        trigger(true);
      };
      fireBtn.ontouchend = (e) => {
        e.preventDefault();
        trigger(false);
      };
    }
    onStateUpdate(state) {
    }
    destroy() {
    }
  };
  if (typeof window !== "undefined")
    window.ModuleMidiTrigger = ModuleMidiTrigger;

  // components/ModuleMidiViewer.js
  var ModuleMidiViewer = class {
    constructor(el, content, descriptor) {
      __publicField(this, "el");
      __publicField(this, "content");
      __publicField(this, "logEl");
      __publicField(this, "descriptor");
      __publicField(this, "maxLines", 32);
      __publicField(this, "isPowered", true);
      __publicField(this, "pollingInterval");
      __publicField(this, "lastSeenTs", 0);
      __publicField(this, "sources", []);
      __publicField(this, "selectedSource", 64);
      this.el = el;
      this.content = content;
      this.descriptor = descriptor;
      this.logEl = document.createElement("div");
      this.render();
    }
    async init() {
      this.addLogLine({ ts: Date.now() / 1e3, type: 0, ch: 0, d1: 0, d2: 0 }, "SYSTEM READY");
      this.bindEvents();
      await this.fetchMidiSources();
      this.startPolling();
    }
    async fetchMidiSources() {
      if (window.omegaRPC) {
        try {
          const resp = await window.omegaRPC.send("getModulationMetadata", {});
          if (resp && resp.sources) {
            this.sources = resp.sources.filter((s) => s.type === 3 && s.telemetryIndex !== -1);
            this.updateSourceSelector();
          }
        } catch (e) {
          console.error("[MidiProbe] Discovery failed", e);
        }
      }
    }
    updateSourceSelector() {
      const sel = this.content.querySelector("#midi-source-sel");
      if (!sel)
        return;
      let html = '<option value="64">GLOBAL TRAFFIC</option>';
      const groups = {};
      for (const s of this.sources) {
        if (s.telemetryIndex === 64)
          continue;
        const g = s.instance || "Modules";
        if (!groups[g])
          groups[g] = [];
        groups[g].push(s);
      }
      for (const [group, items] of Object.entries(groups)) {
        html += `<optgroup label="${group.toUpperCase()}">`;
        for (const item of items) {
          const displayName = item.name.replace(group, "").trim() || item.name;
          html += `<option value="${item.telemetryIndex}">${displayName}</option>`;
        }
        html += `</optgroup>`;
      }
      sel.innerHTML = html;
      sel.value = this.selectedSource.toString();
    }
    // Default MIDI_TRAFFIC
    render() {
      this.content.innerHTML = `
            <div class="midi-viewer-container" style="display: flex; flex-direction: column; height: 100%; font-family: 'Inter', sans-serif; font-size: 10px; color: #00f2ff; background: #050505; border: 1px solid rgba(0,242,255,0.2); border-radius: 4px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                <div class="header-toolbar" style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%); border-bottom: 1px solid rgba(0,242,255,0.3);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="font-weight: 800; font-size: 10px; letter-spacing: 2px; color: #fff; text-shadow: 0 0 5px rgba(0,242,255,0.5);">MIDI PROBE</div>
                        <select id="midi-source-sel" style="background: #000; color: #00f2ff; border: 1px solid #333; font-size: 9px; padding: 2px 5px; outline: none; border-radius: 3px;">
                            <option value="64">GLOBAL TRAFFIC</option>
                        </select>
                    </div>
                    <button id="midi-power-btn" class="sq active power-btn" style="width: 28px; height: 22px; font-size: 12px; color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 3px; background: linear-gradient(180deg, #333 0%, #111 100%); cursor: pointer;">\u23FB</button>
                </div>
                <!-- ... rest of render ... -->
                <div class="midi-header" style="display: grid; grid-template-columns: 60px 80px 40px 1fr 50px; gap: 4px; padding: 5px 10px; background: rgba(0,242,255,0.05); font-weight: 900; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 9px; text-transform: uppercase; color: rgba(0,242,255,0.5);">
                    <span>TIME</span>
                    <span>STATUS</span>
                    <span style="text-align: center;">CH</span>
                    <span>NOTE</span>
                    <span style="text-align: right;">VEL</span>
                </div>
                <div id="midi-log-body" style="flex: 1; overflow-y: auto; padding: 2px 0; background: #020202; scrollbar-width: thin;"></div>
            </div>
        `;
      this.logEl = this.content.querySelector("#midi-log-body");
    }
    bindEvents() {
      const pwrBtn = this.content.querySelector("#midi-power-btn");
      const sel = this.content.querySelector("#midi-source-sel");
      if (pwrBtn) {
        pwrBtn.onclick = () => {
          this.isPowered = !this.isPowered;
          pwrBtn.classList.toggle("active", this.isPowered);
          pwrBtn.style.boxShadow = this.isPowered ? "0 0 10px rgba(0,242,255,0.5)" : "none";
          this.logEl.style.opacity = this.isPowered ? "1" : "0.2";
          if (!this.isPowered)
            this.addLogLine({ ts: Date.now() / 1e3, type: 0, ch: 0, d1: 0, d2: 0 }, "MONITOR PAUSED");
        };
      }
      if (sel) {
        sel.onchange = () => {
          this.selectedSource = parseInt(sel.value);
          this.lastSeenTs = 0;
          this.addLogLine({ ts: Date.now() / 1e3, type: 0, ch: 0, d1: 0, d2: 0 }, `PROBE SWITCHED TO ID:${this.selectedSource}`);
        };
      }
    }
    startPolling() {
      this.pollingInterval = setInterval(async () => {
        if (!this.isPowered)
          return;
        if (window.omegaRPC) {
          try {
            const resp = await window.omegaRPC.send("getTelemetry", { indices: [this.selectedSource] });
            const key = this.selectedSource.toString();
            if (resp && resp[key] && Array.isArray(resp[key])) {
              const events = resp[key];
              events.slice().reverse().forEach((ev) => {
                if (ev.ts > this.lastSeenTs) {
                  this.addLogLine(ev);
                  this.lastSeenTs = ev.ts;
                }
              });
            }
          } catch (e) {
          }
        }
      }, 150);
    }
    formatStatus(type) {
      const status = type & 240;
      switch (status) {
        case 144:
          return "NOTE ON";
        case 128:
          return "NOTE OFF";
        case 176:
          return "CONTROL";
        case 224:
          return "PITCH";
        default:
          return "DATA";
      }
    }
    addLogLine(ev, customMsg) {
      const row = document.createElement("div");
      row.style.display = "grid";
      row.style.gridTemplateColumns = "60px 80px 40px 1fr 50px";
      row.style.gap = "4px";
      row.style.padding = "3px 10px";
      row.style.borderBottom = "1px solid rgba(255,255,255,0.02)";
      row.style.whiteSpace = "nowrap";
      row.style.fontSize = "10px";
      row.style.fontFamily = "'Courier New', monospace";
      if (customMsg) {
        row.innerHTML = `<span style="grid-column: span 5; color: #666; font-style: italic; letter-spacing: 1px;">> ${customMsg}</span>`;
      } else {
        const time = new Date(ev.ts * 1e3).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
        const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        const noteName = ev.type === 144 || ev.type === 128 ? `${noteNames[ev.d1 % 12]}${Math.floor(ev.d1 / 12) - 2}` : ev.d1;
        row.innerHTML = `
                <span style="color: #444;">${time}</span>
                <span style="color: ${ev.type === 144 ? "#fff" : "#00f2ff"}; font-weight: bold;">${this.formatStatus(ev.type)}</span>
                <span style="color: #00f2ff; text-align: center;">${ev.ch}</span>
                <span style="color: #fff; letter-spacing: 1px;">${noteName}</span>
                <span style="color: #ffaa00; font-weight: 800; text-align: right;">${ev.d2}</span>
            `;
      }
      if (this.logEl.firstChild) {
        this.logEl.insertBefore(row, this.logEl.firstChild);
      } else {
        this.logEl.appendChild(row);
      }
      while (this.logEl.children.length > this.maxLines) {
        this.logEl.removeChild(this.logEl.lastChild);
      }
    }
    onStateUpdate(state) {
    }
    destroy() {
      if (this.pollingInterval)
        clearInterval(this.pollingInterval);
    }
  };
  if (typeof window !== "undefined")
    window.ModuleMidiViewer = ModuleMidiViewer;

  // components/ModulePatchbayMatrix.js
  var ModulePatchbayMatrix = class {
    constructor(options = {}) {
      __publicField(this, "el", null);
      __publicField(this, "content", null);
      __publicField(this, "options");
      __publicField(this, "state", null);
      __publicField(this, "sources", []);
      __publicField(this, "targets", []);
      __publicField(this, "viewMode", "compose");
      __publicField(this, "manualChangeTimer", null);
      __publicField(this, "selectedSlot", 0);
      __publicField(this, "maxSlots", 32);
      __publicField(this, "structureBuilt", false);
      this.options = options;
      this.loadMetadata();
      this.syncMaxSlots();
    }
    ensureElements() {
      if (this.el)
        return true;
      this.el = document.getElementById("modulation-modal");
      this.content = document.getElementById("modulation-workspace");
      return !!(this.el && this.content);
    }
    async syncMaxSlots() {
      const rpc2 = window.omegaRPC;
      if (rpc2) {
        try {
          const settings = await rpc2.getSystemSettings();
          if (!settings || !Array.isArray(settings))
            return;
          const maxSlotsSetting = settings.find((s) => s && s.id === "maxPatchbaySlots");
          if (maxSlotsSetting) {
            const newValue = Math.floor(maxSlotsSetting.currentValue || 32);
            if (this.maxSlots !== newValue) {
              OmegaLog.info("MATRIX", `Capacity updated: ${newValue}`);
              this.maxSlots = newValue;
              this.structureBuilt = false;
              if (this.isWorkspaceOpen())
                this.renderWorkspace();
            }
          }
        } catch (e) {
          OmegaLog.warn("MATRIX", "Max slots sync failed", e);
        }
      }
    }
    async loadMetadata() {
      const rpc2 = window.omegaRPC;
      if (rpc2) {
        try {
          const resp = await rpc2.send("getMetadata", {});
          const params = resp?.parameters || resp;
          if (params && Array.isArray(params)) {
            this.sources = params.map((p) => ({ id: p.id || p.target, name: p.name || p.label, instance: p.groupId || p.instance }));
            this.targets = params.map((p) => ({ id: p.id || p.target, name: p.name || p.label, instance: p.groupId || p.instance }));
            if (this.isWorkspaceOpen())
              this.renderWorkspace();
          } else {
            OmegaLog.warn("MATRIX", "Received malformed metadata", resp);
          }
        } catch (e) {
          OmegaLog.error("MATRIX", "Metadata load failed", e);
        }
      }
    }
    toggleWorkspace(open) {
      if (!this.ensureElements())
        return;
      const modal = this.el;
      modal.style.display = open ? "flex" : "none";
      if (open) {
        this.loadMetadata();
        this.syncMaxSlots();
        this.renderWorkspace();
      }
    }
    isWorkspaceOpen() {
      if (!this.ensureElements())
        return false;
      return this.el.style.display === "flex";
    }
    onStateUpdate(state) {
      this.state = state;
      const matrixData = state?.preset?.patchbayMatrix || [];
      const matrix = Array.isArray(matrixData) ? matrixData : Object.values(matrixData);
      const activeCount = matrix.filter((s) => s.active).length;
      const countEl = document.getElementById("matrix-active-count");
      if (countEl)
        countEl.innerText = activeCount.toString().padStart(2, "0");
      this.triggerActivity("general");
      if (this.isWorkspaceOpen()) {
        this.syncSlotsFromState(matrix);
      }
    }
    triggerActivity(type) {
      const led = document.getElementById("matrix-activity-led");
      if (!led)
        return;
      if (type === "manual") {
        led.classList.remove("activity-general");
        led.classList.add("activity-manual");
        if (this.manualChangeTimer)
          clearTimeout(this.manualChangeTimer);
        this.manualChangeTimer = setTimeout(() => {
          led.classList.remove("activity-manual");
          this.manualChangeTimer = null;
        }, 1e3);
      } else if (!this.manualChangeTimer) {
        led.classList.add("activity-general");
        setTimeout(() => led.classList.remove("activity-general"), 100);
      }
    }
    renderWorkspace() {
      if (!this.ensureElements())
        return;
      const grid = document.getElementById("matrix-grid-container");
      if (!grid)
        return;
      this.setupHeaderToggles();
      if (!this.structureBuilt || this.viewMode === "compose") {
        this.renderStructure(grid);
        this.structureBuilt = this.viewMode === "overview";
      }
      const matrixData = this.state?.preset?.patchbayMatrix || [];
      const matrix = Array.isArray(matrixData) ? matrixData : Object.values(matrixData);
      this.syncSlotsFromState(matrix);
      this.renderInspector();
    }
    setupHeaderToggles() {
      const modalHeader = document.querySelector(".modulation-modal-content .modal-title");
      if (modalHeader && !document.getElementById("matrix-view-toggles")) {
        const toggles = document.createElement("div");
        toggles.id = "matrix-view-toggles";
        toggles.style.cssText = "display:flex; gap:10px; margin-left:20px; font-size:10px;";
        toggles.innerHTML = `
                <button class="juno-btn ${this.viewMode === "compose" ? "active juno-orange" : ""}" id="btn-view-compose">COMPOSE</button>
                <button class="juno-btn ${this.viewMode === "overview" ? "active juno-orange" : ""}" id="btn-view-overview">OVERVIEW</button>
            `;
        modalHeader.parentElement?.insertBefore(toggles, modalHeader.nextSibling);
        document.getElementById("btn-view-compose")?.addEventListener("click", () => {
          this.viewMode = "compose";
          this.structureBuilt = false;
          this.renderWorkspace();
        });
        document.getElementById("btn-view-overview")?.addEventListener("click", () => {
          this.viewMode = "overview";
          this.structureBuilt = false;
          this.renderWorkspace();
        });
      }
    }
    renderStructure(grid) {
      let html = "";
      const matrix = this.state?.preset?.patchbayMatrix || [];
      if (this.viewMode === "compose") {
        const activeSlots = matrix.map((s, i) => ({ ...s, i })).filter((s) => s.active || s.source !== "" && s.source !== void 0);
        activeSlots.forEach((slot) => {
          html += this.getSlotSkeleton(slot.i);
        });
        if (activeSlots.length < this.maxSlots) {
          html += `
                    <div class="matrix-card add-card" id="btn-add-modulation">
                        <div class="add-icon">\uFF0B</div>
                        <div class="card-label" style="text-align:center">ADD MODULATION</div>
                    </div>
                `;
        }
      } else {
        for (let i = 0; i < this.maxSlots; i++) {
          html += this.getSlotSkeleton(i);
        }
      }
      grid.innerHTML = html;
      this.attachGridListeners(grid);
      document.getElementById("btn-add-modulation")?.addEventListener("click", () => this.addModulation());
    }
    getSlotSkeleton(i) {
      return `
            <div class="matrix-card aseptic-card" id="matrix-slot-${i}" data-index="${i}">
                <div class="card-header">
                    <span class="card-index">${(i + 1).toString().padStart(2, "0")}</span>
                    <div class="card-status"></div>
                </div>
                <div class="card-routing">
                    <div class="card-source-label card-label">...</div>
                    <div class="card-arrow">\u2193</div>
                    <div class="card-target-label card-label">...</div>
                </div>
                <div class="bipolar-container">
                    <div class="bipolar-slider-bg">
                        <div class="bipolar-slider-fill gain-mode"></div>
                    </div>
                    <div class="bipolar-value">0.00x</div>
                </div>
                <div class="card-via-label card-label-tiny"></div>
            </div>
        `;
    }
    syncSlotsFromState(matrix) {
      matrix.forEach((slot, i) => {
        const el = document.getElementById(`matrix-slot-${i}`);
        if (!el)
          return;
        const isSelected = this.selectedSlot === i;
        el.classList.toggle("active", slot.active);
        el.classList.toggle("selected", isSelected);
        const sourceLabel = el.querySelector(".card-source-label");
        const targetLabel = el.querySelector(".card-target-label");
        if (sourceLabel)
          sourceLabel.textContent = this.getNameForId(this.sources, slot.source) || "EMPTY";
        if (targetLabel)
          targetLabel.textContent = this.getNameForId(this.targets, slot.target) || "---";
        const fill = el.querySelector(".bipolar-slider-fill");
        const valueDisp = el.querySelector(".bipolar-value");
        if (fill && valueDisp) {
          const amount = slot.amount || 0;
          const color = this.getAmountColor(amount);
          fill.style.width = `${Math.min(amount, 2) * 50}%`;
          fill.style.backgroundColor = color;
          valueDisp.textContent = `${amount.toFixed(2)}x`;
          valueDisp.style.color = color;
        }
        const viaLabel = el.querySelector(".card-via-label");
        if (viaLabel) {
          viaLabel.textContent = slot.via ? `VIA: ${this.getNameForId(this.sources, slot.via)}` : "";
        }
      });
    }
    getAmountColor(val) {
      if (val <= 0.01)
        return "#ffffff";
      if (val <= 1) {
        const f = val;
        return `rgb(${Math.round(255 - f * 255)},${Math.round(255 - f * 13)},255)`;
      } else {
        const f = Math.min(val - 1, 1);
        return `rgb(${Math.round(f * 255)},${Math.round(242 - f * 85)},${Math.round(255 - f * 255)})`;
      }
    }
    addModulation() {
      const matrix = this.state?.preset?.patchbayMatrix || [];
      let targetSlot = matrix.findIndex((s, idx) => idx < this.maxSlots && !s.active && !s.source);
      if (targetSlot === -1 && matrix.length < this.maxSlots)
        targetSlot = matrix.length;
      if (targetSlot !== -1 && targetSlot < this.maxSlots) {
        this.selectedSlot = targetSlot;
        this.structureBuilt = false;
        this.renderWorkspace();
        setTimeout(() => {
          const sel = document.querySelector('select[data-key="source"]');
          if (sel)
            sel.focus();
        }, 100);
      }
    }
    renderInspector() {
      const container = document.getElementById("matrix-inspector-container");
      if (!container)
        return;
      const matrix = this.state?.preset?.patchbayMatrix || [];
      const slotIdx = this.selectedSlot;
      const slot = matrix[slotIdx] || { active: false, source: "", target: "", amount: 0, via: "", viaAmount: 0 };
      const targetInstance = slot.target?.split(".")[0] || "";
      const sourceInstance = slot.source?.split(".")[0] || "";
      container.innerHTML = `
            <div class="inspector-title">SLOT ${(slotIdx + 1).toString().padStart(2, "0")} DETAILS</div>
            
            <div class="control-group">
                <label>SOURCE</label>
                <select class="inspector-select" data-key="source">
                    ${this.generateOptions(this.sources, slot.source, targetInstance)}
                </select>
            </div>

            <div class="control-group">
                <label>TARGET</label>
                <select class="inspector-select" data-key="target">
                    ${this.generateOptions(this.targets, slot.target, sourceInstance)}
                </select>
            </div>

            <div class="control-group">
                <label>GAIN MULTIPLIER (0 to 2.0x)</label>
                <input type="range" class="inspector-range" data-key="amount" min="0" max="2" step="0.01" value="${slot.amount}">
                <div class="bipolar-value" style="color: ${this.getAmountColor(slot.amount)}">${slot.amount.toFixed(2)}x</div>
            </div>

            <div class="control-group">
                <label>VIA Modulator</label>
                <select class="inspector-select" data-key="via">
                    ${this.generateOptions(this.sources, slot.via, targetInstance)}
                </select>
            </div>

            <div class="control-group">
                <label>VIA AMOUNT</label>
                <input type="range" class="inspector-range" data-key="viaAmount" min="0" max="1" step="0.05" value="${slot.viaAmount}">
            </div>

            <div class="inspector-actions" style="margin-top: auto; display: flex; gap: 10px;">
                <button class="juno-btn" id="btn-clear-slot" style="flex:1">CLEAR</button>
                <button class="juno-btn" id="btn-init-matrix" style="flex:1">INIT ALL</button>
            </div>
        `;
      this.attachInspectorListeners(container);
    }
    getNameForId(list, id) {
      const item = list.find((s) => s.id === id);
      return item ? item.name : "";
    }
    generateOptions(list, current, exclude) {
      let html = '<option value="">- NONE -</option>';
      const groups = {};
      for (const opt of list) {
        const groupName = opt.instance || "Global";
        if (exclude && groupName === exclude)
          continue;
        if (!groups[groupName])
          groups[groupName] = [];
        groups[groupName].push(opt);
      }
      for (const [group, items] of Object.entries(groups)) {
        html += `<optgroup label="${group.toUpperCase()}">`;
        items.forEach((item) => {
          const disp = item.name.replace(group, "").trim() || item.name;
          html += `<option value="${item.id}" ${item.id === current ? "selected" : ""}>${disp}</option>`;
        });
        html += `</optgroup>`;
      }
      return html;
    }
    attachGridListeners(grid) {
      grid.querySelectorAll(".matrix-card").forEach((card) => {
        card.addEventListener("click", () => {
          this.selectedSlot = parseInt(card.dataset.index || "0");
          this.renderWorkspace();
        });
        const slider = card.querySelector(".bipolar-slider-bg");
        if (slider) {
          let isDragging = false;
          const update = (e) => {
            const rect = slider.getBoundingClientRect();
            const val = Math.max(0, Math.min(2, (e.clientX - rect.left) / rect.width * 2));
            this.sendUpdate(parseInt(card.dataset.index || "0"), "amount", val);
          };
          slider.addEventListener("pointerdown", (e) => {
            isDragging = true;
            e.target.setPointerCapture(e.pointerId);
            update(e);
          });
          slider.addEventListener("pointermove", (e) => {
            if (isDragging)
              update(e);
          });
          slider.addEventListener("pointerup", () => isDragging = false);
        }
      });
    }
    attachInspectorListeners(container) {
      container.querySelectorAll(".inspector-select, .inspector-range").forEach((ctrl) => {
        ctrl.addEventListener(ctrl.tagName === "SELECT" ? "change" : "input", (e) => {
          const val = e.target.type === "range" ? parseFloat(e.target.value) : e.target.value;
          this.sendUpdate(this.selectedSlot, e.target.dataset.key, val);
        });
      });
      document.getElementById("btn-clear-slot")?.addEventListener("click", () => {
        this.sendUpdate(this.selectedSlot, "source", "");
        this.sendUpdate(this.selectedSlot, "target", "");
        this.sendUpdate(this.selectedSlot, "amount", 0);
      });
    }
    sendUpdate(slot, key, value) {
      this.triggerActivity("manual");
      const dispatcher = window.rpcCommandDispatcher;
      if (dispatcher) {
        dispatcher.dispatch({
          type: "patchbayMatrixAction",
          value: { slot, key, value }
        });
      }
    }
  };
  window.ModulePatchbayMatrix = ModulePatchbayMatrix;

  // components/ModulePatchModal.js
  var ModulePatchModal = class {
    constructor() {
      __publicField(this, "el", null);
      __publicField(this, "tabsContainer", null);
      __publicField(this, "viewport", null);
      __publicField(this, "currentInstanceId", "");
      __publicField(this, "activeTab", "");
      __publicField(this, "currentSchema", null);
      __publicField(this, "patchbayMatrix", []);
      __publicField(this, "maxSlots", 32);
      console.log("[ModulePatchModal] Initializing Unified Era 6 UI...");
      this.init();
    }
    init() {
      this.el = document.getElementById("module-patch-modal");
      this.tabsContainer = document.getElementById("patch-tabs-container");
      this.viewport = document.getElementById("patch-tab-viewport");
      this.el?.addEventListener("click", (e) => {
        if (e.target === this.el)
          this.close();
      });
      this.tabsContainer?.addEventListener("click", (e) => {
        const btn = e.target.closest(".aseptic-tab-btn");
        if (btn) {
          const tabId = btn.getAttribute("data-tab");
          if (tabId)
            this.switchTab(tabId);
        }
      });
      if (window.runtimeStateStore) {
        window.runtimeStateStore.subscribe(() => {
          this.updateRealtimeUI();
        });
      }
    }
    async open(instanceId, schema) {
      if (!this.el)
        return;
      this.currentInstanceId = instanceId;
      this.currentSchema = schema;
      this.el.style.display = "flex";
      if (!schema || !schema.items) {
        this.renderError("INVALID_CONTRACT");
        return;
      }
      this.renderTabs(schema);
      const tabs = this.getTabsFromSchema(schema);
      const defaultTab = tabs[0] || "";
      if (defaultTab)
        this.switchTab(defaultTab);
    }
    close() {
      if (this.el)
        this.el.style.display = "none";
    }
    renderTabs(schema) {
      if (!this.tabsContainer)
        return;
      this.tabsContainer.innerHTML = "";
      const tabs = this.getTabsFromSchema(schema);
      tabs.forEach((tabTitle) => {
        const btn = document.createElement("button");
        btn.className = "aseptic-tab-btn";
        btn.innerText = tabTitle.toUpperCase();
        btn.setAttribute("data-tab", tabTitle);
        this.tabsContainer.appendChild(btn);
      });
    }
    getTabsFromSchema(schema) {
      if (!schema || !schema.items)
        return [];
      const tabs = /* @__PURE__ */ new Set();
      schema.items.forEach((item) => {
        if (item.tab)
          tabs.add(item.tab);
      });
      return Array.from(tabs);
    }
    switchTab(tabId) {
      this.activeTab = tabId;
      this.tabsContainer?.querySelectorAll(".aseptic-tab-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
      });
      this.renderTabContent(tabId);
    }
    renderTabContent(tabId) {
      if (!this.viewport || !this.currentSchema)
        return;
      this.viewport.innerHTML = "";
      const items = this.currentSchema.items.filter((i) => i.tab === tabId);
      const form = document.createElement("div");
      form.id = "patch-params-form";
      form.className = "aseptic-params-container";
      this.viewport.appendChild(form);
      const groups = /* @__PURE__ */ new Map();
      items.forEach((item) => {
        const g = item.group || "PARAMETERS";
        if (!groups.has(g))
          groups.set(g, []);
        groups.get(g).push(item);
      });
      groups.forEach((groupItems, groupName) => {
        const groupHeader = document.createElement("div");
        groupHeader.className = "aseptic-group-title";
        groupHeader.innerText = groupName.toUpperCase();
        form.appendChild(groupHeader);
        groupItems.forEach((item) => {
          this.renderParameterRow(form, [item]);
        });
      });
      this.setupListeners();
    }
    setupListeners() {
      if (!this.viewport)
        return;
      this.viewport.querySelectorAll("select.selector-control").forEach((select) => {
        select.addEventListener("change", (e) => {
          const id = select.getAttribute("data-param");
          const val = parseFloat(e.target.value);
          const paramId = `${this.currentInstanceId}.${id}`;
          window.rpcCommandDispatcher.dispatch({ type: "setParameter", target: paramId, value: val });
        });
      });
      this.viewport.querySelectorAll(".knob-ring").forEach((ring) => {
        const id = ring.getAttribute("data-param");
        const move = (e) => {
          const rect = ring.getBoundingClientRect();
          let val = 1 - (e.clientY - rect.top) / rect.height;
          val = Math.max(0, Math.min(1, val));
          const paramId = `${this.currentInstanceId}.${id}`;
          window.rpcCommandDispatcher.dispatch({ type: "setParameter", target: paramId, value: val });
          const knob = ring.querySelector(".knob");
          if (knob)
            knob.style.transform = `translateX(-50%) rotate(${val * 270 - 135}deg)`;
        };
        ring.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          ring.setPointerCapture(e.pointerId);
          move(e);
          const onMove = (ev) => move(ev);
          const onUp = () => {
            ring.removeEventListener("pointermove", onMove);
            ring.removeEventListener("pointerup", onUp);
          };
          ring.addEventListener("pointermove", onMove);
          ring.addEventListener("pointerup", onUp);
        });
      });
    }
    renderParameterRow(container, items) {
      const row = document.createElement("div");
      row.className = "aseptic-params-row";
      items.forEach((item) => {
        const cell = this.buildControlCell(item);
        row.appendChild(cell);
      });
      container.appendChild(row);
    }
    /**
     * ERA 6 STANDARD: Unified Control Cell Generator
     */
    buildControlCell(item) {
      const cell = document.createElement("div");
      const id = item.paramId || item.id;
      cell.className = "control-cell";
      cell.id = `cell-${this.currentInstanceId}-${id}`;
      cell.setAttribute("data-bind", id);
      const top = document.createElement("div");
      top.className = "cell-attachment-top";
      if (item.roles?.includes("stream")) {
        const led = document.createElement("div");
        led.className = "led led-orange";
        led.setAttribute("data-source", id);
        top.appendChild(led);
      }
      cell.appendChild(top);
      const main = document.createElement("div");
      main.className = "cell-main";
      if (item.look === "list" && item.options) {
        const select = document.createElement("select");
        select.className = "selector-control";
        select.setAttribute("data-param", id);
        item.options.forEach((opt) => {
          const o = document.createElement("option");
          o.value = opt.value.toString();
          o.innerText = opt.label;
          select.appendChild(o);
        });
        main.appendChild(select);
      } else {
        main.innerHTML = `
                <div class="knob-ring" data-param="${id}">
                    <div class="knob"><div class="knob-marker white"></div></div>
                </div>
            `;
      }
      cell.appendChild(main);
      const info = document.createElement("div");
      info.className = "cell-info";
      const label = document.createElement("label");
      label.className = "cell-label";
      label.innerText = (item.label || id).toUpperCase();
      info.appendChild(label);
      const display = document.createElement("div");
      display.className = "cell-display";
      display.setAttribute("data-precision", (item.ui_precision ?? 2).toString());
      const currentVal = window.runtimeStateStore?.getValue(`${this.currentInstanceId}.${id}`, item.default || 0);
      display.innerText = currentVal.toString();
      info.appendChild(display);
      cell.appendChild(info);
      return cell;
    }
    /**
     * ERA 6: Real-time UI refresh from Aseptic Store
     */
    updateRealtimeUI() {
      if (!this.el || this.el.style.display !== "flex" || !this.viewport)
        return;
      this.viewport.querySelectorAll(".control-cell").forEach((cell) => {
        const id = cell.getAttribute("data-bind");
        if (!id)
          return;
        const val = window.runtimeStateStore.getValue(`${this.currentInstanceId}.${id}`);
        const knob = cell.querySelector(".knob");
        if (knob)
          knob.style.transform = `translateX(-50%) rotate(${val * 270 - 135}deg)`;
        const display = cell.querySelector(".cell-display");
        if (display) {
          const precision = parseInt(display.getAttribute("data-precision") || "2");
          display.innerText = val.toFixed(precision);
        }
        const select = cell.querySelector("select");
        if (select)
          select.value = val.toString();
        const led = cell.querySelector(".led");
        if (led) {
          const tVal = window.runtimeStateStore.getTelemetry(`${this.currentInstanceId}.${id}`);
          led.classList.toggle("active", tVal > 0.05);
        }
      });
    }
    renderError(reason) {
      if (!this.viewport)
        return;
      this.viewport.innerHTML = `
            <div class="contract-error-full">
                <div class="error-msg">CONTRACT VIOLATION</div>
                <div class="error-detail">${reason}</div>
            </div>
        `;
    }
  };

  // components/ModuleMidiToCv.js
  var ModuleMidiToCv = class {
    constructor(container, content, options) {
      __publicField(this, "container");
      __publicField(this, "content");
      __publicField(this, "options");
      __publicField(this, "activityPulse", false);
      this.container = container;
      this.content = content;
      this.options = options;
      this.addStyles();
      this.render();
    }
    async init() {
      console.log(`[MCV] Initialized instance: ${this.options.instanceId || "mcv.1"}`);
    }
    render() {
      if (!this.options.manifest) {
        this.content.innerHTML = `<div style="color:red; font-size:10px;">MISSING MANIFEST</div>`;
        return;
      }
      const hp = this.options.manifest.layout?.hp || 8;
      const width = hp * 18.25;
      this.container.style.width = `${width}px`;
      this.content.innerHTML = `
            <div class="aseptic-module-container" style="width: 100%; height: 100%; display: flex; flex-direction: column; background: #050505;">
                <div class="module-header-narrow" style="font-size: 7px; color: #555; padding: 6px 2px; text-align: center; font-family: 'Outfit', sans-serif; letter-spacing: 1px; border-bottom: 1px solid #111;">
                    ${this.options.manifest.name || "OMEGA MODULE"}
                </div>
                <div class="control-cells-stack" style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 15px; padding: 12px 0; overflow: hidden;">
                    <!-- Dynamic Cells -->
                </div>
            </div>
        `;
      const stack = this.content.querySelector(".control-cells-stack");
      if (!stack)
        return;
      const entities = this.options.manifest.registry || [];
      entities.filter((e) => e.presentation?.tab === "MAIN" || e.presentation?.ui && e.presentation?.tab !== "PATCHING").forEach((entity) => {
        stack.appendChild(this.buildControlCell(entity));
      });
    }
    buildControlCell(entity) {
      const cell = document.createElement("div");
      cell.className = "control-cell aseptic-cell";
      cell.style.cssText = "display: flex; flex-direction: column; align-items: center; gap: 4px; width: 100%;";
      const hasLed = entity.presentation?.ui?.attachments?.some((a) => a.type === "led");
      if (hasLed) {
        const led = document.createElement("div");
        led.className = "mcv-led";
        led.id = `led-${this.options.instanceId}-${entity.id}`;
        led.style.cssText = "width: 7px; height: 7px; background: #212; border-radius: 50%; border: 1px solid #313; transition: all 0.05s;";
        cell.appendChild(led);
      }
      const compType = entity.presentation?.ui?.component || "knob";
      const comp = document.createElement("div");
      comp.className = `entity-control-mini control-${compType}`;
      comp.innerHTML = `<div class="knob-mini-placeholder" style="width: 22px; height: 22px; border: 1.5px solid var(--neon-cyan); border-radius: 50%; background: #111; position: relative;">
            <div style="position: absolute; top: 2px; left: 50%; width: 1.5px; height: 6px; background: var(--neon-cyan); transform-origin: bottom center;"></div>
        </div>`;
      cell.appendChild(comp);
      const label = document.createElement("div");
      label.className = "label-tiny";
      label.innerText = entity.label || entity.id.toUpperCase();
      label.style.cssText = "font-size: 6px; color: #777; font-family: 'Inter', sans-serif; text-transform: uppercase;";
      cell.appendChild(label);
      const disp = document.createElement("div");
      disp.className = "value-display-tiny";
      disp.id = `disp-${this.options.instanceId}-${entity.id}`;
      disp.innerText = entity.range?.default?.toString() || "0";
      disp.style.cssText = "font-family: 'JetBrains Mono', monospace; font-size: 8px; color: var(--neon-cyan); opacity: 0.8;";
      cell.appendChild(disp);
      return cell;
    }
    onStateUpdate(state) {
      if (!state || !this.options.manifest)
        return;
      const entities = this.options.manifest.registry || [];
      entities.forEach((entity) => {
        const paramId = `${this.options.instanceId}.${entity.id}`;
        const val = state.params?.[paramId];
        if (val !== void 0) {
          const disp = this.content.querySelector(`#disp-${this.options.instanceId}-${entity.id}`);
          if (disp) {
            const precision = entity.presentation?.ui?.ui_precision ?? 2;
            disp.innerHTML = typeof val === "number" ? val.toFixed(precision) : val.toString();
          }
        }
        const led = this.content.querySelector(`#led-${this.options.instanceId}-${entity.id}`);
        if (led) {
          const telemetryKey = `telemetry.${this.options.instanceId}.${entity.id}`;
          const tVal = state.telemetry?.[telemetryKey];
          if (tVal > 0.1) {
            led.style.background = "var(--neon-purple, #f0f)";
            led.style.boxShadow = "0 0 4px var(--neon-purple, #f0f)";
            setTimeout(() => {
              if (led) {
                led.style.background = "#212";
                led.style.boxShadow = "none";
              }
            }, 80);
          }
        }
      });
    }
    addStyles() {
      if (document.getElementById("aseptic-module-styles"))
        return;
      const style = document.createElement("style");
      style.id = "aseptic-module-styles";
      style.innerHTML = `
            .aseptic-module-container {
                background: linear-gradient(180deg, #111 0%, #050505 100%);
                border-left: 1px solid #222;
                border-right: 1px solid #000;
                box-shadow: inset 0 0 15px rgba(0,0,0,0.5);
            }
            .control-cell.aseptic-cell {
                transition: transform 0.2s ease;
                cursor: pointer;
            }
            .control-cell.aseptic-cell:hover {
                transform: scale(1.05);
            }
            .knob-mini-placeholder {
                box-shadow: 0 4px 8px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.1);
            }
            .mcv-led {
                box-shadow: 0 0 2px rgba(0,0,0,0.8);
            }
            .label-tiny {
                letter-spacing: 0.5px;
                font-weight: 500;
            }
            .value-display-tiny {
                background: rgba(0,255,255,0.05);
                padding: 1px 4px;
                border-radius: 2px;
                border: 0.5px solid rgba(0,255,255,0.1);
            }
        `;
      document.head.appendChild(style);
    }
  };
  if (typeof window !== "undefined") {
    window.ModuleMidiToCv = ModuleMidiToCv;
  }

  // components/ModuleBrowser.js
  var ModuleBrowser = class {
    constructor() {
      __publicField(this, "el", null);
      __publicField(this, "grid", null);
      __publicField(this, "categories", null);
      __publicField(this, "detail", null);
      __publicField(this, "searchInput", null);
      __publicField(this, "catalog", []);
      __publicField(this, "currentFilter", "ALL");
      __publicField(this, "currentSearch", "");
      __publicField(this, "selectedModule", null);
      this.setupListeners();
    }
    ensureElements() {
      if (this.el)
        return true;
      this.el = document.getElementById("module-browser-modal");
      this.grid = document.getElementById("module-registry-grid");
      this.categories = document.getElementById("module-category-list");
      this.detail = document.getElementById("module-detail-panel");
      this.searchInput = document.getElementById("module-search");
      return !!(this.el && this.grid && this.categories && this.detail && this.searchInput);
    }
    async open() {
      if (!this.ensureElements())
        return;
      this.el.style.display = "flex";
      await this.fetchCatalog();
      this.render();
    }
    async fetchCatalog() {
      const invStore = window.inventoryStore;
      if (invStore) {
        await invStore.ensureLoaded();
        this.catalog = invStore.getAllItems();
        window.omegaCatalog = Object.fromEntries(this.catalog.map((c) => [c.id, c]));
      }
    }
    render() {
      this.renderCategories();
      this.renderGrid();
      this.renderDetail();
    }
    renderCategories() {
      if (!this.categories)
        return;
      const families = ["ALL", ...new Set(this.catalog.map((c) => c.family))];
      this.categories.innerHTML = families.map((f) => `
            <div class="cat-item ${this.currentFilter === f ? "active" : ""}" data-family="${f}">
                ${f.toUpperCase()}
            </div>
        `).join("");
      this.categories.querySelectorAll(".cat-item").forEach((item) => {
        item.addEventListener("click", (e) => {
          this.currentFilter = e.target.dataset.family;
          this.render();
        });
      });
    }
    renderGrid() {
      if (!this.grid)
        return;
      const filtered = this.catalog.filter((c) => {
        const isVisible = c.visible !== false;
        const matchesFam = this.currentFilter === "ALL" || c.family === this.currentFilter;
        const matchesSearch = c.name.toLowerCase().includes(this.currentSearch.toLowerCase()) || (c.description || "").toLowerCase().includes(this.currentSearch.toLowerCase());
        return isVisible && matchesFam && matchesSearch;
      });
      this.grid.innerHTML = filtered.map((c) => `
            <div class="reg-card ${this.selectedModule?.id === c.id ? "selected" : ""}" data-id="${c.id}">
                <div class="card-icon">${this.getIconForModule(c)}</div>
                <div class="card-name">${c.name}</div>
                <div class="card-family">${c.family}</div>
            </div>
        `).join("");
      this.grid.querySelectorAll(".reg-card").forEach((card) => {
        card.addEventListener("click", (e) => {
          const id = e.currentTarget.dataset.id;
          this.selectedModule = this.catalog.find((c) => c.id === id);
          this.render();
        });
      });
    }
    renderDetail() {
      if (!this.detail)
        return;
      if (!this.selectedModule) {
        this.detail.innerHTML = '<div class="preview-placeholder">SELECT A MODULE</div>';
        return;
      }
      const m = this.selectedModule;
      this.detail.innerHTML = `
            <div class="detail-header">
                <h3>${m.name}</h3>
                <div class="detail-meta">
                    <span>${m.family}</span>
                    <span>v${m.version || "1.0"}</span>
                </div>
            </div>
            <div class="detail-description">
                ${m.description || "No description provided for this module."}
            </div>
            <div class="add-action-container">
                <button class="btn-add-to-rack" id="btn-add-module-exec">ADD TO RACK</button>
            </div>
        `;
      document.getElementById("btn-add-module-exec")?.addEventListener("click", () => this.addModule(m.id));
    }
    getIconForModule(m) {
      const id = m.id || m.componentId;
      const autoPath = `assets/modules/${id}/illustration.svg`;
      const icons = {
        "osc-analog": "\u{1F50A}",
        "midi-util": "\u{1F3B9}",
        "filter-standard": "\u{1F30A}",
        "env-standard": "\u{1F4D0}"
      };
      const emoji = icons[m.icon] || "\u{1F4E6}";
      return `<img src="${autoPath}" class="card-illustration" alt="${m.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <div class="card-icon-fallback" style="display:none; font-size: 2rem;">${emoji}</div>`;
    }
    setupListeners() {
      setTimeout(() => {
        if (!this.ensureElements())
          return;
        this.searchInput?.addEventListener("input", (e) => {
          this.currentSearch = e.target.value;
          this.renderGrid();
        });
      }, 500);
    }
    async addModule(componentId) {
      if (window.rpcCommandDispatcher) {
        try {
          const resp = await window.rpcCommandDispatcher.dispatch({
            type: "systemAction",
            target: "addModule",
            value: { componentId }
          });
          if (resp && !resp.error) {
            this.el.style.display = "none";
            console.log("[ModuleBrowser] Aseptic Instantiation Success:", componentId);
          } else {
            alert("Failed to add module: " + (resp?.error || "Unknown error"));
          }
        } catch (e) {
          console.error("[ModuleBrowser] Dispatch Error:", e);
        }
      }
    }
  };
  window.ModuleBrowser = ModuleBrowser;

  // RpcCommandDispatcher.js
  var RpcCommandDispatcher = class {
    constructor() {
      __publicField(this, "rpc");
      this.rpc = window.omegaRPC;
      OmegaLog.info("DISPATCH", "RpcCommandDispatcher Initialized");
    }
    async dispatch(cmd) {
      OmegaLog.debug("DISPATCH", `${cmd.type}`, cmd.payload || "");
      if (!this.rpc) {
        OmegaLog.error("DISPATCH", "RPC Bridge missing! Command aborted.");
        return;
      }
      try {
        switch (cmd.type) {
          case "setParameter":
            if (!cmd.payload || !("target" in cmd.payload))
              throw new Error("setParameter missing target");
            return await this.rpc.send("setParameter", cmd.payload);
          case "loadPreset":
          case "loadLibraryPreset":
            return await this.rpc.send("loadPreset", cmd.payload);
          case "updatePatchbayMatrixSlot":
          case "patchbayMatrixAction":
            return await this.rpc.send("updatePatchbayMatrixSlot", cmd.payload || cmd.value);
          case "getMetadata":
            return await this.rpc.send("getMetadata", cmd.payload || {});
          case "uiReady":
            return await this.rpc.send("uiReady", cmd.payload || {});
          case "subscribeTelemetry":
            return await this.rpc.send("subscribeTelemetry", cmd.payload);
          case "serviceAction":
            return await this.rpc.send("serviceAction", cmd.payload);
          case "setSystemSetting":
            return await this.rpc.send("setSystemSetting", cmd.payload);
          case "exit":
            return await this.rpc.send("exit", {});
          case "newPreset":
            return await this.rpc.send("newPreset", cmd.payload);
          default:
            const target = cmd.target || cmd.payload && cmd.payload.target;
            if (target) {
              return await this.rpc.send(target, cmd.payload || {});
            }
            OmegaLog.warn("DISPATCH", `Unknown command type: ${cmd.type}`);
        }
      } catch (e) {
        OmegaLog.error("DISPATCH", `Failed to execute ${cmd.type}`, e);
      }
    }
  };
  window.rpcCommandDispatcher = new RpcCommandDispatcher();

  // index.ts
  var runtimeStore = new RuntimeStore();
  var schemaStore = new SchemaStore2();
  var graphStore = new GraphStore();
  var sessionStore = new SessionStore();
  var inventoryStore = new InventoryStore();
  var rpcCommandDispatcher = new RpcCommandDispatcher();
  var manager = new ModuleManager();
  var win = window;
  win.runtimeStore = runtimeStore;
  win.schemaStore = schemaStore;
  win.graphStore = graphStore;
  win.sessionStore = sessionStore;
  win.inventoryStore = inventoryStore;
  win.rpcCommandDispatcher = rpcCommandDispatcher;
  win.moduleManager = manager;
  win.omegaRPC = rpc;
  win.Preferences = Preferences;
  win.ServiceMode = ServiceMode;
  win.ModuleRenderer = ModuleRenderer;
  win.ModuleOscilloscope = ModuleOscilloscope;
  win.ModuleMidiTrigger = ModuleMidiTrigger;
  win.ModuleMidiViewer = ModuleMidiViewer;
  win.ModulePatchbayMatrix = ModulePatchbayMatrix;
  win.ModuleMidiToCv = ModuleMidiToCv;
  win.ModuleBrowser = ModuleBrowser;
  document.addEventListener("DOMContentLoaded", async () => {
    console.log("[OMEGA] Booting Era 6.1 Aseptic UI...");
    await new Promise((r) => setTimeout(r, 1500));
    try {
      await Promise.all([
        schemaStore.ensureLoaded(),
        inventoryStore.ensureLoaded()
      ]);
    } catch (e) {
      console.error("[OMEGA] Store initialization failed:", e);
    }
    try {
      await Preferences.init();
      await PresetBrowser.init();
      const matrixHub = new ModulePatchbayMatrix();
      win.patchbayHub = matrixHub;
      const configModal = new ModulePatchModal();
      win.modulePatchModal = configModal;
      const bind = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.onclick = fn;
      };
      bind("btn-global-matrix", () => matrixHub.toggleWorkspace(true));
      bind("menu-matrix", () => matrixHub.toggleWorkspace(true));
      const showModal = (id) => {
        const m = document.getElementById(id);
        if (m) m.style.display = "flex";
      };
      bind("menu-about", () => showModal("about-modal"));
      bind("menu-preferences", async () => {
        await Preferences.init();
        showModal("preferences-modal");
      });
      if (win.moduleBrowser) {
        bind("menu-add-module", () => win.moduleBrowser.open());
      }
      document.addEventListener("patch-request", (e) => {
        const detail = e.detail;
        const { instanceId, componentId } = detail;
        const schema = schemaStore.getSchemaForComponent(componentId);
        configModal.open(instanceId, schema);
      });
    } catch (e) {
      console.error("[OMEGA] Boot failure during component init:", e);
    }
    app.init();
    const handleAsepticEvent = (e) => {
      const type = e.type.replace("omega:", "");
      runtimeStore.reduceEvent({ type, ...e.detail });
      if (win.patchbayHub?.updateSync) win.patchbayHub.updateSync();
      if (win.modulePatchModal?.updateSync) win.modulePatchModal.updateSync();
    };
    window.addEventListener("omega:onStateUpdate", handleAsepticEvent);
    window.addEventListener("omega:PARAMCHANGE", handleAsepticEvent);
    window.addEventListener("omega:telemetryUpdate", handleAsepticEvent);
  });
})();
