"use strict";
(() => {
  // omega_log.js
  var OmegaLog = class {
    static excludedTags = /* @__PURE__ */ new Set(["TELEMETRY"]);
    static filtersActive = true;
    static getTimestamp() {
      const now = /* @__PURE__ */ new Date();
      const h = now.getHours().toString().padStart(2, "0");
      const m = now.getMinutes().toString().padStart(2, "0");
      const s = now.getSeconds().toString().padStart(2, "0");
      const ms = now.getMilliseconds().toString().padStart(3, "0");
      return `[${h}:${m}:${s}.${ms}]`;
    }
    static setFilter(tag, active) {
      if (active)
        this.excludedTags.delete(tag.toUpperCase());
      else
        this.excludedTags.add(tag.toUpperCase());
      this.syncUI();
    }
    static toggleTelemetry() {
      const active = this.excludedTags.has("TELEMETRY");
      this.setFilter("TELEMETRY", active);
    }
    static syncUI() {
      const btn = document.getElementById("toggle-telemetry");
      if (btn) {
        const active = !this.excludedTags.has("TELEMETRY");
        btn.style.background = active ? "var(--neon-cyan)" : "#331111";
        btn.style.color = active ? "#000" : "#555";
        btn.style.boxShadow = active ? "0 0 10px var(--neon-cyan)" : "none";
      }
    }
    static shouldLog(tag) {
      if (!this.filtersActive)
        return true;
      return !this.excludedTags.has(tag.toUpperCase());
    }
    static info(tag, message, ...args) {
      if (!this.shouldLog(tag))
        return;
      console.log(`${this.getTimestamp()} [LOG] [${tag}] ${message}`, ...args);
    }
    static warn(tag, message, ...args) {
      if (!this.shouldLog(tag))
        return;
      console.warn(`${this.getTimestamp()} [WARN] [${tag}] ${message}`, ...args);
    }
    static error(tag, message, ...args) {
      console.error(`${this.getTimestamp()} [ERROR] [${tag}] ${message}`, ...args);
    }
    static debug(tag, message, ...args) {
      if (!this.shouldLog(tag))
        return;
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
    requestId = 1e3;
    pendingRequests = /* @__PURE__ */ new Map();
    isConnected = false;
    lastActivity = Date.now();
    healthTimer = null;
    constructor() {
      OmegaLog.info("RPC", "Aseptic Bridge Initialized");
      window.handleOmegaMessage = (json) => {
        this.lastActivity = Date.now();
        this.isConnected = true;
        this.updateHealthUI();
        try {
          const msg = typeof json === "string" ? JSON.parse(json) : json;
          const tag = msg.type === "telemetryUpdate" || msg.type === "TELEMETRY" ? "TELEMETRY" : "RPC";
          OmegaLog.debug(tag, `RECV [Type: ${msg.type}]`, msg);
          if (msg.requestId && this.pendingRequests.has(msg.requestId)) {
            const req = this.pendingRequests.get(msg.requestId);
            clearTimeout(req.timer);
            this.pendingRequests.delete(msg.requestId);
            if (msg.type === "rpcError" || msg.type === "error") {
              req.reject(msg.payload || msg);
            } else {
              const data = msg.payload !== void 0 && msg.payload !== null ? msg.payload : msg;
              if (msg.type === "state" || msg.type === "onStateUpdate") {
                const norm = normalizeIncomingEvent(msg);
                if (norm) {
                  window.dispatchEvent(new CustomEvent(`omega:${norm.type}`, { detail: norm }));
                }
              }
              req.resolve(data);
            }
          } else {
            const norm = normalizeIncomingEvent(msg);
            if (norm) {
              window.dispatchEvent(new CustomEvent(`omega:${norm.type}`, { detail: norm }));
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
        if (win2.__JUCE__?.backend)
          return win2.__JUCE__.backend;
        await new Promise((r) => setTimeout(r, 100));
      }
      return null;
    }
    /**
     * Centralized Send Method: Uses Event-Based Bridge for Maximum Reliability
     */
    async send(type, payload = {}) {
      const id = this.requestId++;
      const message = { type, requestId: id, payload };
      const backend = await this._waitForBackend();
      if (!backend || !backend.emitEvent) {
        OmegaLog.error("RPC", `Backend EVENT CHANNEL UNREACHABLE for ${type}`);
        this.isConnected = false;
        this.updateHealthUI();
        return null;
      }
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
          const tag = type === "subscribeTelemetry" || type === "unsubscribeTelemetry" ? "TELEMETRY" : "RPC";
          OmegaLog.debug(tag, `EMIT [ID: ${id}] ${type}`, payload);
          backend.emitEvent("omega_rpc_query", message);
        } catch (e) {
          clearTimeout(timer);
          if (this.pendingRequests.has(id))
            this.pendingRequests.delete(id);
          OmegaLog.error("RPC", `Event emission CRASHED for ${type}`, e);
          reject(e);
        }
      });
    }
    /**
     * Era 7 Handshake
     */
    async ensureReady(timeout = 5e3) {
      OmegaLog.info("RPC", "Starting Era 7 Handshake...");
      const backend = await this._waitForBackend(timeout);
      if (!backend) {
        OmegaLog.error("RPC", "Handshake FAILED: Native backend unreachable");
        return false;
      }
      try {
        const state = await this.getState();
        if (state) {
          this.isConnected = true;
          this.updateHealthUI();
          OmegaLog.info("RPC", "Handshake SUCCESS: Backend is alive and state received");
          return true;
        }
      } catch (e) {
        OmegaLog.error("RPC", "Handshake FAILED: Could not retrieve initial state", e);
      }
      return false;
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
    schemas = /* @__PURE__ */ new Map();
    isLoaded = false;
    async ensureLoaded() {
      if (this.isLoaded)
        return true;
      return this.reload();
    }
    async reload() {
      try {
        const rpc2 = window.omegaRPC;
        if (!rpc2)
          return false;
        const response = await rpc2.send("getUiSchemas", {});
        console.log("[SchemaStore] RAW RESPONSE:", response);
        const rawData = response.payload || response;
        const schemas = rawData.schemas || (Array.isArray(rawData) ? rawData : null);
        if (schemas && Array.isArray(schemas)) {
          schemas.forEach((s) => {
            this.schemas.set(s.id, this.normalizeSchema(s));
          });
          this.isLoaded = true;
          console.log(`[SchemaStore] Success. Loaded ${schemas.length} schemas.`);
          return true;
        }
      } catch (e) {
        console.error("[SchemaStore] Load error:", e);
      }
      return false;
    }
    normalizeSchema(schema) {
      if (!schema)
        return schema;
      const isEra7 = schema.version >= 7 || schema.ui !== void 0;
      if (isEra7) {
        console.log(`[SchemaStore] Detected Era 7 Module: ${schema.id}. Preserving industrial integrity.`);
        this.validateIntegrity(schema);
        if (schema.metadata) {
          schema.name = schema.name || schema.metadata.name;
          schema.hp = schema.hp || schema.metadata.rack?.hp;
          schema.rack = schema.rack || schema.metadata.rack?.slot;
        }
        return schema;
      }
      return schema;
    }
    validateIntegrity(schema) {
      if (!schema.compliance) {
        schema.compliance = { status: "ok", issues: [], firmwareHash: "" };
      }
      const ids = /* @__PURE__ */ new Set();
      const duplicates = /* @__PURE__ */ new Set();
      if (schema.registry && Array.isArray(schema.registry)) {
        schema.registry.forEach((item) => {
          if (ids.has(item.id)) {
            duplicates.add(item.id);
          }
          ids.add(item.id);
        });
      }
      if (schema.ui && schema.ui.controls) {
        schema.ui.controls.forEach((ctrl) => {
        });
      }
      if (duplicates.size > 0) {
        schema.compliance.status = "invalid";
        duplicates.forEach((id) => {
          const issue = {
            severity: "invalid",
            code: "DoubleIdentity",
            scope: "registry",
            message: `ID collision detected: '${id}' is defined multiple times in the registry. Each entity must have a unique canonical ID.`
          };
          schema.compliance.issues.push(issue);
          console.error(`[GOVERNANCE] [${schema.id}] ${issue.message}`);
        });
      }
    }
    getSchema(id) {
      return this.schemas.get(id);
    }
    getSchemaForComponent(id) {
      return this.getSchema(id);
    }
    getAllSchemas() {
      return Array.from(this.schemas.values());
    }
  };
  window.schemaStore = new SchemaStore();

  // runtimeStores.js
  var ChangeType;
  (function(ChangeType2) {
    ChangeType2[ChangeType2["Structure"] = 1] = "Structure";
    ChangeType2[ChangeType2["Parameters"] = 2] = "Parameters";
    ChangeType2[ChangeType2["Telemetry"] = 4] = "Telemetry";
    ChangeType2[ChangeType2["System"] = 8] = "System";
    ChangeType2[ChangeType2["All"] = 15] = "All";
  })(ChangeType || (ChangeType = {}));
  var BaseStore = class {
    listeners = /* @__PURE__ */ new Set();
    subscribe(callback) {
      this.listeners.add(callback);
      return () => this.listeners.delete(callback);
    }
    notify(type = ChangeType.All) {
      this.listeners.forEach((cb) => cb(type));
    }
  };
  var RuntimeStore = class extends BaseStore {
    state = {
      patch: null,
      preset: null,
      params: {},
      telemetry: {},
      modulation: null,
      schemaVersion: null,
      systemInfo: {
        version: "0.0.0",
        build: "0",
        lcdText: "INITIALIZING..."
      }
    };
    getSnapshot() {
      return this.state;
    }
    getValue(paramKey, defaultValue = 0) {
      return this.state.params[paramKey] ?? defaultValue;
    }
    getTelemetry(paramKey) {
      const sample = this.state.telemetry[paramKey];
      return sample ? sample.v ?? 0 : 0;
    }
    applyState(payload) {
      if (!payload)
        return;
      const isV7 = payload.schemaVersion === "7.0";
      if (isV7) {
        const v7 = payload;
        OmegaLog.info("STORE", `Applying Era 7 Patch: ${v7.patch.name || "Untitled"}`);
        this.state = {
          ...this.state,
          schemaVersion: "7.0",
          patch: v7.patch,
          params: this.syncLegacyParams(v7.patch)
        };
        this.notify(ChangeType.Structure | ChangeType.Parameters);
      } else {
        OmegaLog.warn("STORE", `REJECTED: Non-Era 7 payload received (Version: ${payload.schemaVersion}). Pure Era 7 environment enforced.`);
      }
    }
    syncLegacyParams(patch) {
      const legacy = {};
      const modules = patch.modules || [];
      for (const mod of modules) {
        const params = mod.parameters || mod.params || {};
        for (const [id, val] of Object.entries(params)) {
          legacy[`${mod.instanceId}.${id}`] = val;
        }
      }
      return legacy;
    }
    applyParamChange(event) {
      this.state = {
        ...this.state,
        params: {
          ...this.state.params,
          [event.id]: event.value
        }
      };
      this.notify(ChangeType.Parameters);
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
      this.notify(ChangeType.Telemetry);
    }
    applyModulation(payload) {
      this.state = {
        ...this.state,
        modulation: payload
      };
      this.notify(ChangeType.Structure);
    }
    reduceEvent(event) {
      if (!event)
        return;
      switch (event.type) {
        case "PARAMCHANGE":
          this.applyParamChange(event);
          return;
        case "onStateUpdate":
        case "state":
          this.applyState(event.payload || event);
          return;
        case "telemetryUpdate":
          this.applyTelemetryFrame(event.payload || event);
          return;
        case "onLCDUpdate":
          this.state = {
            ...this.state,
            systemInfo: { ...this.state.systemInfo, lcdText: event.detail || event.payload || event }
          };
          this.notify(ChangeType.System);
          return;
        case "onVersionUpdate":
          const vData = event.detail || event.payload || event;
          this.state = {
            ...this.state,
            systemInfo: {
              ...this.state.systemInfo,
              version: vData.version || this.state.systemInfo.version,
              build: vData.build || this.state.systemInfo.build
            }
          };
          this.notify(ChangeType.System);
          return;
      }
    }
  };
  var GraphStore = class extends BaseStore {
    state = {
      schemaVersion: null,
      graph: null
    };
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
    state = {
      selectedModuleId: null,
      focusedBinding: null,
      activeWorkspace: null,
      openPanels: []
    };
    constructor() {
      super();
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
    items = /* @__PURE__ */ new Map();
    isLoaded = false;
    loadPromise = null;
    async ensureLoaded() {
      console.log("[InventoryStore] ensureLoaded called. isLoaded:", this.isLoaded);
      if (this.isLoaded)
        return true;
      if (this.loadPromise)
        return this.loadPromise;
      this.loadPromise = (async () => {
        console.log("[InventoryStore] Starting fetch via RPC...");
        try {
          const rpc2 = window.omegaRPC;
          if (!rpc2) {
            console.error("[InventoryStore] RPC Bridge NOT FOUND!");
            return false;
          }
          console.log("[InventoryStore] Sending 'getInventory' command...");
          const response = await rpc2.send("getInventory", {});
          console.log("[InventoryStore] RAW RESPONSE:", response);
          const rawData = response.payload || response;
          const components = rawData.components || rawData.items || (Array.isArray(rawData) ? rawData : null);
          if (components && Array.isArray(components)) {
            console.log(`[InventoryStore] Success. Loaded ${components.length} components.`);
            this.items.clear();
            components.forEach((item) => {
              this.items.set(item.id, item);
            });
            this.isLoaded = true;
            this.notify();
            return true;
          } else {
            console.warn("[InventoryStore] Response is not a valid array:", components);
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

  // ModuleRegistry.js
  var ModuleRegistry = class {
    static catalog = /* @__PURE__ */ new Map();
    static constructors = /* @__PURE__ */ new Map();
    static register(id, constructor) {
      this.constructors.set(id, constructor);
      OmegaLog.info("REGISTRY", `Registered Constructor: ${id}`);
    }
    static getConstructor(id) {
      return this.constructors.get(id);
    }
    static async bootstrap() {
      OmegaLog.info("REGISTRY", "Building Unified Era 7 Catalog...");
      const win2 = window;
      const inventoryStore2 = win2.inventoryStore;
      const schemaStore2 = win2.schemaStore;
      if (!inventoryStore2) {
        OmegaLog.error("REGISTRY", "InventoryStore NOT FOUND during bootstrap");
        return;
      }
      const inventory = inventoryStore2.getAllItems?.() || [];
      OmegaLog.info("REGISTRY", `Probing ${inventory.length} inventory items...`);
      this.catalog.clear();
      inventory.forEach((item) => {
        if (!item || !item.id)
          return;
        this.catalog.set(item.id, {
          id: item.id,
          name: item.name || item.id,
          family: item.family || "utility",
          hasInventory: true,
          hasSchema: false,
          isInstantiable: false
        });
      });
      if (schemaStore2) {
        this.catalog.forEach((entry, id) => {
          const schema = schemaStore2.getSchema?.(id);
          if (schema) {
            entry.hasSchema = true;
            entry.schema = schema;
            entry.isInstantiable = entry.hasInventory && entry.hasSchema;
          }
        });
      }
      OmegaLog.info("REGISTRY", `Catalog Ready. ${this.catalog.size} modules found, ${Array.from(this.catalog.values()).filter((m) => m.isInstantiable).length} instantiable.`);
    }
    static getModuleDescriptor(id) {
      return this.catalog.get(id);
    }
    static getInstantiableModules() {
      return Array.from(this.catalog.values()).filter((m) => m.isInstantiable);
    }
  };

  // module_manager.js
  var ModuleManager = class {
    activeModules = /* @__PURE__ */ new Map();
    lastState = null;
    isRendering = false;
    lastFingerprint = "";
    pendingState = null;
    renderGeneration = 0;
    constructor() {
      this.activeModules = /* @__PURE__ */ new Map();
      console.log("%c[!!!] MODULE_MANAGER_V7_ACTIVE [Build 2026.05.03]", "background: #00f2ff; color: #000; font-weight: bold; padding: 2px 5px;");
      OmegaLog.info("MANAGER", "ModuleManager Constructor Initialized.");
      if (window.runtimeStore) {
        OmegaLog.info("MANAGER", "Subscribing to RuntimeStore...");
        window.runtimeStore.subscribe((type) => {
          OmegaLog.debug("MANAGER", `Store Event Received. Type: ${type}`);
          if (type & 1) {
            OmegaLog.info("MANAGER", "Structural Change Detected -> updateRack()");
            this.updateRack(window.runtimeStore.getSnapshot());
          } else if (type & 2) {
            this.activeModules.forEach((mod) => {
              if (mod.onStateUpdate)
                mod.onStateUpdate(window.runtimeStore.getSnapshot());
            });
          }
        });
      } else {
        OmegaLog.error("MANAGER", "CRITICAL: RuntimeStore not found in window during initialization!");
      }
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
      OmegaLog.info("MANAGER", "updateRack entry point");
      if (this.isRendering) {
        OmegaLog.info("MANAGER", "Render in progress. Queuing next update...");
        this.pendingState = state;
        return;
      }
      this.isRendering = true;
      const currentGeneration = ++this.renderGeneration;
      this.pendingState = null;
      try {
        OmegaLog.debug("MANAGER", "updateRack checking stability...");
        const safeState = state || {};
        this.lastState = safeState;
        const patch = safeState.patch;
        if (!patch) {
          OmegaLog.info("MANAGER", "No Era 7 patch found in state. Skipping structural update.");
          this.isRendering = false;
          return;
        }
        const patchModules = patch.modules || [];
        const fingerprint = patchModules.map((m) => `${m.instanceId}:${m.componentId}:${m.theme || ""}`).join("|");
        const isRackEmpty = patchModules.length === 0;
        if (fingerprint === this.lastFingerprint && !isRackEmpty) {
          OmegaLog.info("MANAGER", "Structure stable (Fingerprint match). Skipping full re-render.");
          this.activeModules.forEach((mod) => {
            if (mod.onStateUpdate)
              mod.onStateUpdate(state);
          });
          this.isRendering = false;
          return;
        }
        this.lastFingerprint = fingerprint;
        OmegaLog.info("MANAGER", `Structural change detected. Rebuilding racks... (Empty: ${isRackEmpty})`);
        const upper = document.getElementById("upper-rack");
        const lower = document.getElementById("lower-rack");
        if (upper)
          upper.innerHTML = "";
        if (lower)
          lower.innerHTML = "";
        this.activeModules.clear();
        if (isRackEmpty) {
          OmegaLog.info("MANAGER", "Rack is now officially empty.");
          this.isRendering = false;
          return;
        }
        if (patch && patch.modules) {
          const newActiveIds = /* @__PURE__ */ new Set();
          const lowerRack = document.getElementById("lower-rack");
          OmegaLog.info("MANAGER", `Executing Era 7 Rendering Pipeline (${patch.modules.length} modules)`);
          for (const mod of patch.modules) {
            const componentId = mod.componentId || "unknown";
            const instId = `v7_${mod.instanceId}`;
            newActiveIds.add(instId);
            if (!this.activeModules.has(instId)) {
              const manifest = window.schemaStore?.getSchema(componentId);
              const manifestRack = manifest?.rack?.slot || manifest?.rack || "";
              let rackValue = (manifestRack || mod.rack || "lower").toString().toLowerCase();
              const isCompact = manifest?.height_mode === "compact" || manifest?.metadata?.rack?.height_mode === "compact" || manifest?.rack?.height_mode === "compact";
              const isUpper = rackValue === "upper" || rackValue === "top" || isCompact;
              const targetRack = isUpper ? document.getElementById("upper-rack") : document.getElementById("lower-rack");
              const rackType = isUpper ? "aux" : "main";
              console.log(`%c[!!!] ROUTING DEBUG: mod=${instId} (${componentId}) | manifestRack=${manifestRack} | isCompact=${isCompact} | isUpper=${isUpper} | targetFound=${!!targetRack}`, "color: #00f2ff; font-weight: bold;");
              if (isUpper && !document.getElementById("upper-rack")) {
                console.error(`%c[!!!] CRITICAL: upper-rack element not found in DOM!`, "color: #ff0000; font-weight: bold;");
              }
              const className = manifest?.ui_class || "ModuleRenderer";
              if (currentGeneration !== this.renderGeneration)
                return;
              await this.addModule(instId, className, rackType, targetRack, {
                label: mod.label || componentId.toUpperCase(),
                componentId,
                instanceId: mod.instanceId,
                typeId: mod.typeId,
                params: mod.parameters || mod.params || {},
                manifest: manifest || {
                  id: componentId,
                  name: componentId,
                  ui: { dimensions: { width: 60, height: 420 }, controls: [], jacks: [], skin: "industrial" },
                  registry: []
                }
              });
            } else {
              const module = this.activeModules.get(instId);
              if (module && module.onStateUpdate) {
                module.onStateUpdate(window.runtimeStore.getSnapshot());
              }
            }
          }
          this.cleanupModules(newActiveIds);
          this.isRendering = false;
          return;
        }
        this.activeModules.forEach((mod) => {
          if (mod.onStateUpdate)
            mod.onStateUpdate(state);
        });
      } catch (e) {
        OmegaLog.error("MANAGER", "Error during rack update:", e);
        if (e && e.stack)
          OmegaLog.error("MANAGER", "Stack trace:", e.stack);
      } finally {
        this.isRendering = false;
        if (this.pendingState) {
          const next = this.pendingState;
          this.pendingState = null;
          this.updateRack(next);
        }
      }
    }
    async renderModuleItem(item, upper, lower) {
      const id = item.instanceId || item.nodeId || item.id || item.slotName || "AUX";
      const label = item.label || item.name || item.slotName || id;
      const componentId = item.componentId || item.id || "";
      if (!componentId)
        return;
      const schema = window.schemaStore.getSchema(componentId);
      let rackValue = item.rack?.toString().toLowerCase();
      if (!rackValue && schema?.rack) {
        rackValue = schema.rack.toLowerCase();
      }
      const targetRack = rackValue === "upper" ? upper : lower;
      const rackType = rackValue === "upper" ? "aux" : "main";
      if (componentId === "patchbay_matrix" || componentId === "system.matrix") {
        return;
      }
      if (schema) {
        const manifest = { ...schema, id };
        let className = schema.ui_class || "ModuleRenderer";
        if (item.theme) {
          manifest.theme = item.theme;
        }
        if (!schema.ui_class) {
          className = "ModuleRenderer";
        }
        await this.addModule(id, className, rackType, targetRack, {
          label,
          componentId,
          instanceId: id,
          manifest
        });
      } else {
        await this.renderContractError(id, rackType, targetRack, componentId, "MISSING_CONTRACT");
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
    async addModule(id, className, type, container, options) {
      if (!container)
        return;
      const el = document.createElement("div");
      el.id = `mod-${id}`;
      el.className = `module module-${type} ${className} ${options.manifest.panelClass || ""}`;
      const header = document.createElement("div");
      header.className = "module-header";
      header.style.display = "flex";
      header.style.flexDirection = "row";
      header.style.alignItems = "center";
      header.style.gap = "6px";
      const configBtn = document.createElement("div");
      configBtn.className = "module-header-action config-btn";
      configBtn.innerHTML = "\u2699";
      configBtn.title = `Configure ${id}`;
      configBtn.onclick = (e) => {
        e.stopPropagation();
        if (window.modulePatchModal) {
          window.modulePatchModal.open(id, options.manifest);
        }
      };
      header.appendChild(configBtn);
      const moveLeft = document.createElement("div");
      moveLeft.className = "module-header-action move-btn";
      moveLeft.innerHTML = "\u25C0";
      moveLeft.title = `Move ${id} left`;
      moveLeft.onclick = (e) => {
        e.stopPropagation();
        window.rpcCommandDispatcher.dispatch({ type: "moveModule", payload: { instanceId: id, direction: -1 } });
      };
      header.appendChild(moveLeft);
      const moveRight = document.createElement("div");
      moveRight.className = "module-header-action move-btn";
      moveRight.innerHTML = "\u25B6";
      moveRight.title = `Move ${id} right`;
      moveRight.onclick = (e) => {
        e.stopPropagation();
        window.rpcCommandDispatcher.dispatch({ type: "moveModule", payload: { instanceId: id, direction: 1 } });
      };
      header.appendChild(moveRight);
      const spacer = document.createElement("div");
      spacer.style.flex = "1";
      header.appendChild(spacer);
      const closeBtn = document.createElement("div");
      closeBtn.className = "module-header-action module-header-action-close";
      closeBtn.innerHTML = "\xD7";
      closeBtn.title = `Remove ${id}`;
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to remove ${id}?`)) {
          window.rpcCommandDispatcher.dispatch({
            type: "removeModule",
            payload: { instanceId: id }
          });
        }
      };
      header.appendChild(closeBtn);
      el.appendChild(header);
      const content = document.createElement("div");
      content.className = "module-content";
      el.appendChild(content);
      container.appendChild(el);
      const Factory = ModuleRegistry.getConstructor(className);
      if (Factory) {
        const instance = className === "ModuleRenderer" ? new Factory(el, content, options.manifest) : new Factory(el, content, options);
        this.activeModules.set(id, instance);
        if (instance.init)
          await instance.init();
        if (instance.onStateUpdate && this.lastState)
          instance.onStateUpdate(this.lastState);
      } else {
        console.error(`[ModuleManager] Module class not found in registry: ${className}`);
      }
    }
    /**
     * Increments or decrements a parameter value by a single step.
     * Used by shared stateless components like the Display primitive.
     */
    stepParameter(id, step) {
      const win2 = window;
      if (!win2.runtimeStore || !win2.rpcCommandDispatcher)
        return;
      const snapshot = win2.runtimeStore.getSnapshot();
      const currentValue = snapshot.parameters?.[id] || 0;
      const delta = step * 0.01;
      const nextValue = Math.max(0, Math.min(1, currentValue + delta));
      OmegaLog.debug("MANAGER", `Stepping parameter ${id}: ${currentValue} -> ${nextValue}`);
      win2.rpcCommandDispatcher.dispatch({
        type: "setParameter",
        payload: {
          id,
          value: nextValue
        }
      });
    }
    cleanupModules(activeIds) {
      this.activeModules.forEach((mod, id) => {
        if (!activeIds.has(id)) {
          const el = document.getElementById(`mod-${id}`);
          if (el)
            el.remove();
          if (mod.dispose)
            mod.dispose();
          this.activeModules.delete(id);
        }
      });
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
    lastPresetName = "INITIAL PATCH";
    lcdTimer = null;
    initialized = false;
    constructor() {
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
      if (window.runtimeStore) {
        window.runtimeStore.subscribe((type) => {
          const snapshot = window.runtimeStore.getSnapshot();
          if (type & 8) {
            this.updateLCD(snapshot.systemInfo.lcdText, false);
            this.updateVersion(snapshot.systemInfo.version, snapshot.systemInfo.build);
          }
          if (type & 4) {
            const payload = snapshot.telemetry;
            if (payload["activity"]) {
              const active = payload["activity"].v > 0.01;
              document.querySelectorAll('.led[data-source="activity"]').forEach((led) => {
                led.classList.toggle("active", active);
              });
            }
          }
        });
      }
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
              rack.style.opacity = "1";
              rack.style.pointerEvents = "auto";
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
        topEl.textContent = `OMEGA Era 7.2.3 [Build ${build || "SYS_READY"}]`;
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
          if (window.patchbayHub) {
            window.patchbayHub.toggleWorkspace(true);
          } else {
            this.showModal("modulation-modal");
          }
          break;
        case "toggle_module_browser":
          if (window.moduleBrowser) {
            window.moduleBrowser.open();
          } else {
            this.showModal("module-browser-modal");
          }
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
        case "save_preset":
          window.rpcCommandDispatcher.dispatch({ type: "savePreset", payload: {} });
          break;
        case "undo":
        case "redo":
          window.rpcCommandDispatcher.dispatch({ type: "systemAction", payload: { action } });
          break;
        default:
          window.rpcCommandDispatcher.dispatch({ type: "systemAction", payload: { target: action } });
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
      bind("toggle-telemetry", () => {
        if (window.OmegaLog)
          window.OmegaLog.toggleTelemetry();
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
          window.rpcCommandDispatcher.dispatch({
            type: "setParameter",
            payload: { target: paramID, value: isActive ? 0 : 1 }
          });
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
          window.rpcCommandDispatcher.dispatch({
            type: "setParameter",
            payload: { target: "bender", value: x }
          });
        };
        const onUp = () => {
          housing.removeEventListener("pointermove", move);
          housing.removeEventListener("pointerup", onUp);
          stick.style.left = "50%";
          window.rpcCommandDispatcher.dispatch({
            type: "setParameter",
            payload: { target: "bender", value: 0.5 }
          });
        };
        housing.addEventListener("pointermove", move);
        housing.addEventListener("pointerup", onUp);
      });
    }
    setupMenus() {
      document.querySelectorAll(".menu-item").forEach((item) => {
        const htmlItem = item;
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
    settings = [];
    currentCategory = "GENERAL";
    constructor() {
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
    params = [];
    activeVoice = -1;
    constructor() {
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
    data = { libraries: [] };
    selectedLibIdx = 0;
    selectedPresetIdx = -1;
    currentCategory = "All";
    searchQuery = "";
    constructor() {
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

  // omega-ui-core/renderers/KnobRenderer.js
  var renderKnobHTML = (props) => {
    const { size, colorId, value, isSelected, isMain, id, rotationOffset = -135, rotationRange = 270 } = props;
    const rotation = rotationOffset + value * rotationRange;
    const selectedClass = isMain && isSelected ? "selected" : "";
    const classes = [
      "knob-container",
      `size-${size}`,
      `color-${colorId}`,
      selectedClass
    ].filter(Boolean).join(" ");
    return `
    <div class="${classes}" ${id ? `data-source="${id}"` : ""}>
      <div class="knob-cap"></div>
      <div class="knob-marker" style="transform: rotate(${rotation}deg)"></div>
    </div>
  `.trim();
  };

  // omega-ui-core/renderers/PortRenderer.js
  var inferPortSignalColor = (id = "", label = "", explicitColor) => {
    if (explicitColor)
      return `var(--signal-${explicitColor.toLowerCase().replace("b_", "")}, var(--wb-primary))`;
    const searchStr = `${id} ${label}`.toLowerCase();
    if (searchStr.includes("midi"))
      return "var(--signal-midi)";
    if (searchStr.includes("gate") || searchStr.includes("trig"))
      return "var(--signal-gate)";
    if (searchStr.includes("cv") || searchStr.includes("mod"))
      return "var(--signal-cv)";
    if (searchStr.includes("pitch") || searchStr.includes("freq") || searchStr.includes("out") || searchStr.includes("in"))
      return "var(--signal-audio)";
    return "var(--wb-primary)";
  };
  var renderPortHTML = (props) => {
    const { size, colorId, value, isSelected, isMain, id, label, explicitColor } = props;
    const signalColor = inferPortSignalColor(id, label, explicitColor);
    const opacity = 0.3 + value * 0.7;
    const selectedClass = isMain && isSelected ? "selected" : "";
    const classes = [
      "port-socket",
      `size-${size}`,
      `color-${colorId}`,
      selectedClass
    ].filter(Boolean).join(" ");
    const ledStyle = `background-color: ${signalColor}; opacity: ${opacity};`;
    return `<div class="${classes}" ${id ? `data-source="${id}"` : ""}><div class="port-inner"><div class="port-led" style="${ledStyle}"></div></div></div>`;
  };

  // omega-ui-core/renderers/LedRenderer.js
  var renderLedHTML = (props) => {
    const { size, colorId, value, id, transform } = props;
    const isActive = value > 0.05;
    const opacity = 0.3 + value * 0.7;
    const classes = [
      "led",
      `size-${size}`,
      `color-${colorId}`,
      isActive ? "active" : ""
    ].filter(Boolean).join(" ");
    const style = [
      `opacity: ${opacity}`,
      transform || ""
    ].filter(Boolean).join("; ");
    return `<div class="${classes}" ${id ? `data-source="${id}"` : ""} style="${style}"></div>`;
  };

  // omega-ui-core/renderers/SliderRenderer.js
  var renderSliderHTML = (props) => {
    const { type, size, colorId, value, id } = props;
    const isHoriz = type === "slider-h";
    const railStyle = isHoriz ? `width: calc(${value * 100}% - 4px)` : `height: calc(${value * 100}% - 4px)`;
    const capStyle = isHoriz ? `left: calc(${value * 90}%)` : `bottom: calc(${value * 90}%)`;
    return `
    <div class="slider-wrapper ${type} size-${size} color-${colorId}" ${id ? `data-source="${id}"` : ""}>
      <div class="slider-rail-active" style="${railStyle}"></div>
      <div class="slider-cap" style="${capStyle}"></div>
    </div>
  `.trim();
  };

  // omega-ui-core/renderers/DisplayRenderer.js
  var renderDisplayHTML = (props) => {
    const { size, colorId, mode, value, steps, id } = props;
    const displayValue = Math.round(value * (steps || 100));
    return `
    <div class="mini-display variant-${mode} size-${size} color-${colorId}" ${id ? `data-source="${id}"` : ""}>
      <button class="display-btn minus" data-action="step-down">\u2212</button>
      <div class="display-value">${displayValue}</div>
      <button class="display-btn plus" data-action="step-up">+</button>
    </div>
  `.trim();
  };

  // omega-ui-core/renderers/SwitchRenderer.js
  var renderSwitchHTML = (props) => {
    const { size, colorId, value, id } = props;
    const isActive = value >= 0.5;
    return `
    <div class="switch-container size-${size} color-${colorId}" ${id ? `data-source="${id}"` : ""}>
      <div class="sw-led ${!isActive ? "active" : ""}"></div>
      <div class="sw-led ${isActive ? "active" : ""}"></div>
    </div>
  `.trim();
  };

  // omega-ui-core/renderers/StepperRenderer.js
  var renderStepperHTML = (props) => {
    const { type, size, colorId, value, text, id } = props;
    const isPressed = value >= 0.5;
    const content = text ? `<span class="stepper-text">${text.toUpperCase()}</span>` : `<div class="stepper-dot"></div>`;
    return `
    <div class="stepper-container type-${type} size-${size} color-${colorId} ${isPressed ? "pressed" : ""}" 
         ${id ? `data-source="${id}"` : ""} 
         data-type="${type}">
      ${content}
    </div>
  `.trim();
  };

  // omega-ui-core/renderers/SelectRenderer.js
  var renderSelectHTML = (props) => {
    const { size, colorId, value, options = [], id } = props;
    const labels = options.length > 0 ? options : ["NO OPTIONS"];
    const currentIndex = Math.min(labels.length - 1, Math.floor(value * labels.length));
    const currentLabel = labels[currentIndex];
    return `
    <div class="mini-select size-${size} color-${colorId}" ${id ? `data-source="${id}"` : ""}>
      <div class="select-value">${(currentLabel || "").toUpperCase()}</div>

      <div class="select-arrow">\u25BC</div>
    </div>
  `.trim();
  };

  // omega-ui-core/renderers/AttachmentRenderer.js
  var AttachmentRenderer = class {
    static renderAttachmentHTML(props) {
      const { type, variant, text = "" } = props;
      if (type === "label") {
        const parts = (variant || "B_cyan").split("_");
        const sizeClass = parts[0] || "B";
        const colorVariant = variant || "B_cyan";
        const sizes = { A: 12, B: 9, C: 7, D: 6 };
        const fontSize = sizes[sizeClass] || 9;
        return `
        <div class="attachment-label variant-${colorVariant}" style="font-size: ${fontSize}px;">
          ${text.toUpperCase()}
        </div>
      `;
      }
      return `<!-- Unknown Attachment Type: ${type} -->`;
    }
  };

  // omega-ui-core/renderers/CellRenderer.js
  var RADIUS_MAP = {
    knob: { A: 24, B: 18, C: 12, D: 9 },
    port: { A: 21, B: 18, C: 15, D: 12 },
    display: { A: 16.5, B: 13, C: 10, D: 7 },
    led: { A: 6, B: 4, C: 2.5, D: 1.5 },
    slider: { A: 6, B: 6, C: 6, D: 6 },
    switch: { A: 16, B: 12, C: 10, D: 8 },
    stepper: { A: 12, B: 9, C: 7, D: 6 },
    select: { A: 12, B: 12, C: 12, D: 12 }
  };
  var CellRenderer = class {
    /**
     * Calculates the physical radius of a component based on its metadata.
     */
    static getComponentRadius(item) {
      const variant = item.presentation?.variant || "B_cyan";
      const parts = variant.split("_");
      let size = parts[0] || "B";
      if (variant.includes("_3mm"))
        size = "D";
      if (variant.includes("_5mm"))
        size = "C";
      const comp = item.presentation?.component || "knob";
      const typeKey = comp.includes("slider") ? "slider" : comp;
      const sizeMap = RADIUS_MAP[typeKey] || RADIUS_MAP.knob;
      const radius = sizeMap ? sizeMap[size] : 12;
      return radius || 12;
    }
    /**
     * Renders the complete HTML for a cell, including its main component and all orbitant attachments.
     */
    static renderCellHTML(item, options) {
      const { skin, runtimeValue, steps, isSelected, isLiveMode } = options;
      const compType = item.presentation?.component || "knob";
      const variant = item.presentation?.variant || "B_cyan";
      const parts = variant.split("_");
      let size = parts[0] || "B";
      if (variant.includes("_3mm"))
        size = "D";
      if (variant.includes("_5mm"))
        size = "C";
      const colorId = parts.length > 1 ? parts.filter((p) => p !== size && p !== "3mm" && p !== "5mm").join("_") : "cyan";
      const compRadius = this.getComponentRadius(item);
      let mainHTML = "";
      const commonProps = {
        size,
        colorId,
        value: runtimeValue,
        id: item.id,
        isSelected: !!isSelected,
        isMain: true
      };
      switch (compType) {
        case "knob":
          mainHTML = renderKnobHTML({ ...commonProps });
          break;
        case "port":
          mainHTML = renderPortHTML({
            ...commonProps,
            label: item.label || "",
            explicitColor: variant
          });
          break;
        case "led":
          mainHTML = renderLedHTML({ ...commonProps });
          break;
        case "display":
          const mode = parts.includes("lcd") ? "lcd" : parts.includes("led") ? "led" : "oled";
          mainHTML = renderDisplayHTML({ ...commonProps, mode, steps });
          break;
        case "slider-v":
        case "slider-h":
          mainHTML = renderSliderHTML({ ...commonProps, type: compType });
          break;
        case "switch":
          mainHTML = renderSwitchHTML({ ...commonProps });
          break;
        case "stepper":
        case "button":
        case "push":
          mainHTML = renderStepperHTML({
            ...commonProps,
            type: compType,
            text: item.label || ""
          });
          break;
        case "select":
          mainHTML = renderSelectHTML({
            ...commonProps,
            options: item.presentation?.options || [item.presentation?.lookup || ""]
          });
          break;
        default:
          mainHTML = `<!-- Unsupported Component: ${compType} -->`;
      }
      const attachments = item.presentation?.attachments || [];
      const renderStack = (pos) => {
        const stackItems = attachments.filter((a) => a.position === pos);
        if (stackItems.length === 0)
          return "";
        const itemsHTML = stackItems.map((a) => {
          const html = AttachmentRenderer.renderAttachmentHTML({
            type: a.type,
            variant: a.variant,
            text: a.text || ""
          });
          const offX = (a.offsetX || 0) * 1.5;
          const offY = (a.offsetY || 0) * 1.5;
          return `<div style="transform: translate(${offX}px, ${offY}px)">${html}</div>`;
        }).join("");
        return `<div class="attachment-stack stack-${pos}">${itemsHTML}</div>`;
      };
      const cellOffsetX = (item.presentation?.offsetX || 0) * 1.5;
      const cellOffsetY = (item.presentation?.offsetY || 0) * 1.5;
      return `
      <div class="control-cell variant-${variant}" style="--comp-radius: ${compRadius}px;">
        ${renderStack("top")}
        ${renderStack("bottom")}
        ${renderStack("left")}
        ${renderStack("right")}
        <div class="cell-main" style="width: ${compRadius * 2 * 1.5}px; height: ${compRadius * 2 * 1.5}px; transform: translate(calc(-50% + ${cellOffsetX}px), calc(-50% + ${cellOffsetY}px))">
          ${mainHTML}
        </div>
      </div>
    `.trim();
    }
  };

  // module_renderer.js
  var ModuleRenderer = class {
    el;
    content;
    descriptor;
    values = {};
    isInitialized = false;
    activeTab = "MAIN";
    RENDER_SCALE = 1.5;
    constructor(el, content, options) {
      this.el = el;
      this.content = content;
      this.descriptor = options.manifest || options;
      const allItems = [...this.descriptor.ui?.controls || [], ...this.descriptor.ui?.jacks || []];
      const firstWithTab = allItems.find((i) => i.presentation?.tab);
      if (firstWithTab && firstWithTab.presentation?.tab) {
        this.activeTab = firstWithTab.presentation.tab;
      }
      OmegaLog.info("RENDERER", `ModuleRenderer initialized for: ${this.descriptor.id}`);
    }
    async init() {
      this.render();
      this.bind();
      this.isInitialized = true;
      this.subscribeToTelemetry();
      this.syncAllFromStore();
    }
    subscribeToTelemetry() {
      const pins = [];
      const allItems = [...this.descriptor.ui?.controls || [], ...this.descriptor.ui?.jacks || []];
      allItems.forEach((item) => {
        if (item.presentation?.component === "led" || item.look === "led" || item.presentation?.component === "port") {
          const id = item.source || item.bind || item.id;
          if (id)
            pins.push(`${this.descriptor.id}.${id}`);
        }
        item.presentation?.attachments?.forEach((att) => {
          if (att.type === "led" || att.type === "display") {
            const id = att.bind || item.bind || item.id;
            if (id)
              pins.push(`${this.descriptor.id}.${id}`);
          }
        });
      });
      if (pins.length > 0) {
        window.rpcCommandDispatcher.dispatch({
          type: "subscribeTelemetry",
          payload: { pins: [...new Set(pins)] }
        });
      }
    }
    render() {
      const desc = this.descriptor;
      const skin = desc.ui?.skin || "industrial";
      const w = (desc.ui?.dimensions?.width || 120) * this.RENDER_SCALE;
      const h = (desc.ui?.dimensions?.height || 420) * this.RENDER_SCALE;
      const allItems = [...desc.ui?.controls || [], ...desc.ui?.jacks || []];
      const tabs = [...new Set(allItems.map((i) => i.presentation?.tab || "MAIN"))].sort();
      this.content.innerHTML = `
            <div class="module-panel skin-${skin}" style="width: ${w}px; height: ${h}px; box-sizing: content-box; border-left: 4px solid #333; border-right: 4px solid #333; border-top: 1px solid #444; border-bottom: 1px solid #111; box-shadow: 0 10px 30px rgba(0,0,0,0.8); position: relative;">
                <!-- Industrial Screws -->
                <div class="module-screw top-left"></div>
                <div class="module-screw top-right"></div>
                <div class="module-screw bottom-left"></div>
                <div class="module-screw bottom-right"></div>
                
                ${tabs.length > 1 ? `
                <div class="module-tabs">
                    ${tabs.map((t) => {
        const isActive = this.activeTab === t;
        return `<button class="tab-btn ${isActive ? "active" : ""}" data-tab="${t}">${t}</button>`;
      }).join("")}
                </div>
                ` : ""}

                <div class="module-canvas" style="position: absolute; inset: 0; overflow: hidden;">
                    <div class="layer layer-background">${this.renderContainers()}</div>
                    <div class="layer layer-controls">
                        ${allItems.filter((item) => this.shouldRenderInTab(item, this.activeTab)).map((item) => this.renderItem(item)).join("")}
                    </div>
                </div>
            </div>
        `;
      this.bind();
      this.syncAllFromStore();
    }
    renderItem(item) {
      const id = item.bind || item.paramId || item.source || item.portId;
      const val = this.values[id] ?? 0;
      const x = (item.pos?.x || 0) * this.RENDER_SCALE;
      const y = (item.pos?.y || 0) * this.RENDER_SCALE;
      const html = CellRenderer.renderCellHTML(item, {
        skin: this.descriptor.ui?.skin || "industrial",
        zoom: this.RENDER_SCALE,
        runtimeValue: val,
        steps: item.steps || 100,
        isSelected: false,
        isLiveMode: true
      });
      return `
            <div class="cell-anchor" style="position: absolute; left: ${x}px; top: ${y}px;">
                ${html}
            </div>
        `;
    }
    shouldRenderInTab(item, activeTab) {
      const currentTab = activeTab || "MAIN";
      const containerId = item.presentation?.container || item.presentation?.group;
      if (containerId) {
        const container = this.descriptor.ui?.layout?.containers?.find((c) => c.id === containerId);
        if (container && container.tab)
          return container.tab === currentTab;
      }
      return (item.presentation?.tab || "MAIN") === currentTab;
    }
    renderContainers() {
      const layout = this.descriptor.ui?.layout;
      if (!layout || !layout.containers)
        return "";
      const rackWidth = this.descriptor.ui?.dimensions?.width || 120;
      const currentTab = this.activeTab || "MAIN";
      const skin = this.descriptor.ui?.skin || "industrial";
      const activeContainers = layout.containers.filter((c) => !c.tab || c.tab === currentTab);
      const sorted = [...activeContainers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
      return sorted.map((c) => {
        const x = c.pos.x * this.RENDER_SCALE;
        const y = c.pos.y * this.RENDER_SCALE;
        const w = this.resolveContainerWidth(c.size.w, rackWidth) * this.RENDER_SCALE;
        const h = c.size.h * this.RENDER_SCALE;
        const variant = c.variant || "default";
        const style = `position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; z-index: ${c.zIndex || 0}; pointer-events: none;`;
        return `
                <div class="layout-container container-${skin} variant-${variant}" style="${style}" data-container-id="${c.id}">
                    ${c.label ? `<div class="container-label-pill">${c.label}</div>` : ""}
                </div>
            `;
      }).join("");
    }
    resolveContainerWidth(w, rackWidth) {
      if (typeof w === "number")
        return w;
      switch (w) {
        case "full":
          return rackWidth;
        case "1/2":
          return rackWidth * 0.5;
        default:
          return parseFloat(w) || rackWidth;
      }
    }
    getRegistryEntity(id) {
      return window.omegaCatalog?.[id];
    }
    bind() {
      this.content.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          this.activeTab = e.target.dataset.tab || "MAIN";
          this.render();
        });
      });
      const allItems = [...this.descriptor.ui?.controls || [], ...this.descriptor.ui?.jacks || []];
      allItems.forEach((item) => {
        const id = item.bind || item.paramId || item.source || item.portId;
        const entity = id ? this.getRegistryEntity(id) : null;
        if (!entity)
          return;
        const cell = this.content.querySelector(`[data-id="${id}"]`);
        if (!cell)
          return;
        const knob = cell.querySelector(".knob-container");
        if (knob)
          this._bindKnob(knob, entity);
        const slider = cell.querySelector(".slider-wrapper");
        if (slider)
          this._bindSlider(slider, entity);
        const steppers = cell.querySelectorAll(".stepper-btn, .display-btn");
        steppers.forEach((btn) => {
          btn.addEventListener("click", (e) => {
            const targetId = e.target.dataset.bind || id;
            const dir = parseInt(e.target.dataset.dir || "0");
            const targetEntity = this.getRegistryEntity(targetId);
            if (targetEntity) {
              const range = targetEntity.range || { min: 0, max: 1, step: 1 };
              const current = this.values[targetId] ?? range.default ?? 0;
              const stepVal = range.step || 0.01;
              let next = current + dir * stepVal;
              next = Math.max(range.min, Math.min(range.max, next));
              this.setParam(targetId, next);
            }
          });
        });
        const sel = cell.querySelector(".industrial-select-wrapper");
        if (sel) {
          sel.addEventListener("click", () => {
            const options = entity.options || [];
            if (options.length === 0)
              return;
            const currentVal = this.values[id] || 0;
            const currentIndex = Math.floor(currentVal * options.length);
            const nextIndex = (currentIndex + 1) % options.length;
            this.setParam(id, nextIndex / options.length);
          });
        }
      });
    }
    _bindKnob(knob, entity) {
      let isDragging = false;
      let startY = 0;
      let startVal = 0;
      const range = entity.range || { min: 0, max: 1 };
      knob.addEventListener("pointerdown", (e) => {
        isDragging = true;
        startY = e.clientY;
        startVal = this.values[entity.id] ?? range.default ?? 0;
        knob.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      knob.addEventListener("pointermove", (e) => {
        if (!isDragging)
          return;
        const delta = (startY - e.clientY) / 150;
        let next = startVal + delta * (range.max - range.min);
        next = Math.max(range.min, Math.min(range.max, next));
        this.setParam(entity.id, next);
      });
      const onUp = (e) => {
        if (isDragging) {
          isDragging = false;
          knob.releasePointerCapture(e.pointerId);
        }
      };
      knob.addEventListener("pointerup", onUp);
      knob.addEventListener("pointercancel", onUp);
    }
    _bindSlider(slider, entity) {
      let isDragging = false;
      const isHoriz = slider.classList.contains("slider-h");
      const range = entity.range || { min: 0, max: 1 };
      slider.addEventListener("pointerdown", (e) => {
        isDragging = true;
        slider.setPointerCapture(e.pointerId);
        this._handleSliderMove(e, slider, entity);
        e.preventDefault();
      });
      slider.addEventListener("pointermove", (e) => {
        if (!isDragging)
          return;
        this._handleSliderMove(e, slider, entity);
      });
      const onUp = (e) => {
        if (isDragging) {
          isDragging = false;
          slider.releasePointerCapture(e.pointerId);
        }
      };
      slider.addEventListener("pointerup", onUp);
      slider.addEventListener("pointercancel", onUp);
    }
    _handleSliderMove(e, slider, entity) {
      const rect = slider.getBoundingClientRect();
      const isHoriz = slider.classList.contains("slider-h");
      const range = entity.range || { min: 0, max: 1 };
      let norm = 0;
      if (isHoriz) {
        norm = (e.clientX - rect.left) / rect.width;
      } else {
        norm = 1 - (e.clientY - rect.top) / rect.height;
      }
      norm = Math.max(0, Math.min(1, norm));
      const next = range.min + norm * (range.max - range.min);
      this.setParam(entity.id, next);
    }
    setParam(id, value) {
      this.values[id] = value;
      const paramId = `${this.descriptor.id}.${id}`;
      window.rpcCommandDispatcher.dispatch({
        type: "setParameter",
        payload: { target: paramId, value }
      });
      this.updateControlUI(id, value);
    }
    updateControlUI(id, value) {
      const cell = this.content.querySelector(`[data-id="${id}"]`);
      if (!cell)
        return;
      const knobMarker = cell.querySelector(".knob-marker");
      if (knobMarker) {
        const angle = -135 + value * 270;
        knobMarker.style.transform = `translate(-50%, -100%) rotate(${angle}deg)`;
      }
      const slider = cell.querySelector(".slider-wrapper");
      if (slider) {
        const isHoriz = slider.classList.contains("slider-h");
        const rail = slider.querySelector(".slider-rail-active");
        const cap = slider.querySelector(".slider-cap");
        if (rail) {
          if (isHoriz)
            rail.style.width = `calc(${value * 100}% - 4px)`;
          else
            rail.style.height = `calc(${value * 100}% - 4px)`;
        }
        if (cap) {
          if (isHoriz)
            cap.style.left = `calc(${value * 90}%)`;
          else
            cap.style.bottom = `calc(${value * 90}%)`;
        }
      }
      const display = cell.querySelector(".display-value");
      if (display) {
        const entity = this.getRegistryEntity(id);
        display.innerText = this._getFormattedValue(null, entity, value);
      }
      const selValue = cell.querySelector(".select-value");
      if (selValue) {
        const entity = this.getRegistryEntity(id);
        selValue.textContent = this._getEntityValueLabel(entity, value);
      }
      this.triggerContainerActivity(id);
    }
    triggerContainerActivity(id) {
      const item = [...this.descriptor.ui?.controls || [], ...this.descriptor.ui?.jacks || []].find((i) => (i.bind || i.id) === id);
      const containerId = item?.presentation?.container || item?.presentation?.group;
      if (!containerId)
        return;
      const containerEl = this.content.querySelector(`[data-container-id="${containerId}"]`);
      if (!containerEl)
        return;
      containerEl.classList.remove("active-pulse");
      void containerEl.offsetWidth;
      containerEl.classList.add("active-pulse");
    }
    _getFormattedValue(att, entity, val) {
      const precision = att?.ui_precision ?? 2;
      if (!entity)
        return val.toFixed(precision);
      if (entity.options) {
        const opt = entity.options.find((o) => o.value === val);
        if (opt)
          return opt.label;
      }
      return val.toFixed(precision);
    }
    _getEntityValueLabel(entity, value) {
      if (!entity || !entity.options)
        return value.toFixed(2);
      const currentIndex = Math.floor(value * entity.options.length);
      return entity.options[currentIndex]?.label || value.toFixed(2);
    }
    syncAllFromStore() {
      if (!this.isInitialized)
        return;
      const allItems = [...this.descriptor.ui?.controls || [], ...this.descriptor.ui?.jacks || []];
      allItems.forEach((item) => {
        const id = item.bind || item.id || item.source;
        if (id) {
          const globalId = `${this.descriptor.id}.${id}`;
          const store = window.runtimeStore?.getSnapshot();
          if (!store || !store.parameters)
            return;
          const val = store.parameters[globalId];
          const tVal = store.telemetry ? store.telemetry[globalId] : void 0;
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
      const targets = this.content.querySelectorAll(`[data-source="${source}"]`);
      targets.forEach((el) => {
        const t = el;
        if (t.classList.contains("led") || t.classList.contains("port-led")) {
          const d = parseInt(t.style.width) || 8;
          const baseColor = t.style.backgroundColor;
          t.style.opacity = (0.3 + value * 0.7).toString();
          if (value > 0.05) {
            t.style.boxShadow = `0 0 ${d}px ${baseColor}99`;
          } else {
            t.style.boxShadow = "none";
          }
        }
        if (t.classList.contains("display-value")) {
          t.innerText = value.toFixed(2);
        }
      });
    }
    _inferPortColor(id, entity) {
      const idLower = (id || "").toLowerCase();
      const label = (entity?.label || "").toLowerCase();
      if (idLower.includes("midi") || label.includes("midi"))
        return "var(--signal-midi)";
      if (idLower.includes("gate") || label.includes("gate") || idLower.includes("trig"))
        return "var(--signal-gate)";
      if (idLower.includes("cv") || label.includes("cv") || idLower.includes("mod"))
        return "var(--signal-cv)";
      if (idLower.includes("pitch") || idLower.includes("freq") || idLower.includes("out") || idLower.includes("in"))
        return "var(--signal-audio)";
      return "var(--wb-primary)";
    }
    onStateUpdate(state) {
      this.syncAllFromStore();
    }
  };

  // components/ModulePatchbayMatrix.js
  var ModulePatchbayMatrix = class {
    el = null;
    root = null;
    options;
    state = null;
    sources = [];
    targets = [];
    viewMode = "compose";
    manualChangeTimer = null;
    selectedSlot = 0;
    maxSlots = 32;
    structureBuilt = false;
    constructor(options = {}) {
      this.options = options;
      this.loadMetadata();
      this.syncMaxSlots();
      if (window.runtimeStore) {
        window.runtimeStore.subscribe((type) => {
          if (type & 1) {
            this.onStateUpdate(window.runtimeStore.getSnapshot());
          }
        });
      }
    }
    ensureElements() {
      if (this.el && this.root)
        return true;
      this.el = document.getElementById("modulation-modal");
      this.root = document.getElementById("modulation-workspace");
      if (!this.root && this.el) {
        const content = this.el.querySelector(".modulation-modal-content");
        if (content) {
          this.root = document.createElement("div");
          this.root.id = "modulation-workspace";
          this.root.className = "modulation-workspace";
          this.root.innerHTML = `
                    <div id="matrix-grid-container" class="matrix-grid-container"></div>
                    <div id="matrix-inspector-container" class="matrix-inspector-container"></div>
                `;
          const footer = content.querySelector(".modal-footer");
          content.insertBefore(this.root, footer);
        }
      }
      return !!(this.el && this.root);
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
            const val = Math.floor(maxSlotsSetting.currentValue || 32);
            const newValue = val > 0 ? val : 32;
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
      const inv = window.inventoryStore;
      if (inv && inv.getAllItems().length > 0) {
        this.buildMetadataFromInventory(inv.getAllItems());
        if (this.isWorkspaceOpen())
          this.renderWorkspace();
      }
      if (!rpc2)
        return;
      setTimeout(async () => {
        try {
          const resp = await rpc2.send("getModulationMetadata", {});
          if (resp && resp.sources && resp.targets && resp.sources.length > 0) {
            this.sources = this.normalizeList(resp.sources);
            this.targets = this.normalizeList(resp.targets);
            OmegaLog.info("MATRIX", `Metadata synced from backend. Sources: ${this.sources.length}`);
            if (this.isWorkspaceOpen())
              this.renderWorkspace();
          } else {
            OmegaLog.debug("MATRIX", "Backend returned empty metadata, keeping InventoryStore data.");
          }
        } catch (e) {
          OmegaLog.warn("MATRIX", "Backend metadata sync failed, relying on InventoryStore", e);
        }
      }, 500);
    }
    buildMetadataFromInventory(components) {
      const newSources = [];
      const newTargets = [];
      const activeTypes = /* @__PURE__ */ new Set();
      const activeModules = this.state?.patch?.modules || this.state?.preset?.modules || [];
      activeModules.forEach((m) => {
        const type = m.componentId || m.typeId || m.id || m.modelId;
        if (type)
          activeTypes.add(type);
      });
      OmegaLog.debug("MATRIX", `Active Types for metadata: ${Array.from(activeTypes).join(", ")}`);
      if (activeTypes.size === 0) {
        OmegaLog.warn("MATRIX", "Metadata rebuild triggered but no active modules found in state.");
      }
      components.forEach((comp) => {
        if (!activeTypes.has(comp.id))
          return;
        if (!comp.registry)
          return;
        comp.registry.forEach((reg) => {
          const portId = `${comp.id}.${reg.id}`;
          const portName = `${comp.name || comp.id} ${reg.label || reg.id}`;
          const item = {
            id: portId,
            name: portName,
            instance: comp.id,
            label: reg.label || reg.id,
            type: reg.type || "CV"
          };
          if (reg.roles?.includes("output"))
            newSources.push(item);
          if (reg.roles?.includes("input"))
            newTargets.push(item);
        });
      });
      this.sources = newSources;
      this.targets = newTargets;
      OmegaLog.info("MATRIX", `Industrial Metadata Rebuilt: ${this.sources.length} sources, ${this.targets.length} targets`);
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
      const oldModules = this.state?.patch?.modules || this.state?.preset?.modules || [];
      const newModules = state?.patch?.modules || state?.preset?.modules || [];
      const structuralChange = oldModules.length !== newModules.length || JSON.stringify(oldModules.map((m) => m.id)) !== JSON.stringify(newModules.map((m) => m.id));
      this.state = state;
      const matrixData = state?.patch?.patchbayMatrix || state?.preset?.patchbayMatrix || [];
      const matrix = Array.isArray(matrixData) ? matrixData : Object.values(matrixData);
      const activeCount = matrix.filter((s) => s.active === true || s.active === "true").length;
      const countEl = document.getElementById("matrix-active-count");
      if (countEl)
        countEl.innerText = activeCount.toString().padStart(2, "0");
      this.triggerActivity("general");
      if (this.isWorkspaceOpen()) {
        if (structuralChange) {
          OmegaLog.debug("MATRIX", "Structural change detected, rebuilding metadata...");
          this.loadMetadata();
        }
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
      if (!this.state && window.runtimeStore) {
        this.state = window.runtimeStore.getSnapshot();
      }
      const grid = document.getElementById("matrix-grid-container");
      const inspector = document.getElementById("matrix-inspector-container");
      if (!grid) {
        OmegaLog.error("MATRIX", "Grid container missing from DOM");
        return;
      }
      this.setupHeaderToggles();
      if (!this.structureBuilt || this.viewMode === "compose") {
        this.renderStructure(grid);
        this.structureBuilt = this.viewMode === "overview";
      }
      const matrixData = this.state?.patch?.patchbayMatrix || this.state?.preset?.patchbayMatrix || [];
      const matrix = this.normalizeList(matrixData);
      this.syncSlotsFromState(matrix);
      if (inspector)
        this.renderInspector();
    }
    setupHeaderToggles() {
      const modalHeader = document.querySelector(".modulation-modal-content .modal-title");
      if (modalHeader && !document.getElementById("matrix-view-toggles")) {
        const toggles = document.createElement("div");
        toggles.id = "matrix-view-toggles";
        toggles.style.cssText = "display:flex; gap:8px; margin-left:20px;";
        toggles.innerHTML = `
                <button class="aseptic-btn ${this.viewMode === "compose" ? "active" : ""}" id="btn-view-compose">COMPOSE</button>
                <button class="aseptic-btn ${this.viewMode === "overview" ? "active" : ""}" id="btn-view-overview">OVERVIEW</button>
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
      const matrixData = this.state?.preset?.patchbayMatrix || [];
      const matrix = this.normalizeList(matrixData);
      if (this.viewMode === "compose") {
        const activeSlots = matrix.map((s, i) => ({ ...s, i })).filter((s) => s.active === true || s.active === "true" || s.source !== "" && s.source !== void 0);
        if (activeSlots.length === 0 && this.sources.length === 0) {
          html = `
                    <div class="empty-state-info">
                        <div class="info-title">NO SIGNAL ASSETS DETECTED</div>
                        <p>The system catalog is currently empty or no active modules with I/O ports were found in the rack.</p>
                        <div class="metadata-warning">HANDSHAKE PENDING: Verify Era 7 Bridge Status</div>
                    </div>
                `;
        } else {
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
          const amount = parseFloat(slot.amount || 0);
          const color = this.getAmountColor(amount);
          fill.style.width = `${Math.min(Math.abs(amount), 2) * 50}%`;
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
      const matrixData = this.state?.preset?.patchbayMatrix || [];
      const matrix = this.normalizeList(matrixData);
      const slotIdx = this.selectedSlot;
      const slot = matrix[slotIdx] || { active: false, source: "", target: "", amount: 0, via: "", viaAmount: 0 };
      const amount = parseFloat(slot.amount || 0);
      const viaAmount = parseFloat(slot.viaAmount || 0);
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
                <input type="range" class="inspector-range" data-key="amount" min="0" max="2" step="0.01" value="${amount}">
                <div class="bipolar-value" style="color: ${this.getAmountColor(amount)}">${amount.toFixed(2)}x</div>
            </div>

            <div class="control-group">
                <label>VIA Modulator</label>
                <select class="inspector-select" data-key="via">
                    ${this.generateOptions(this.sources, slot.via, targetInstance)}
                </select>
            </div>

            <div class="control-group">
                <label>VIA AMOUNT</label>
                <input type="range" class="inspector-range" data-key="viaAmount" min="0" max="1" step="0.05" value="${viaAmount}">
            </div>

            <div class="inspector-actions" style="margin-top: auto; display: flex; gap: 10px;">
                <button class="aseptic-btn" id="btn-clear-slot" style="flex:1">CLEAR</button>
                <button class="aseptic-btn" id="btn-init-matrix" style="flex:1">INIT ALL</button>
            </div>
        `;
      this.attachInspectorListeners(container);
    }
    getNameForId(list, id) {
      if (!id)
        return "";
      const item = list.find((s) => s && s.id === id);
      return item ? item.name || item.label || id : "---";
    }
    normalizeList(data) {
      if (!data)
        return [];
      if (Array.isArray(data))
        return data;
      if (typeof data === "object")
        return Object.values(data);
      return [];
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
    el = null;
    tabsContainer = null;
    viewport = null;
    currentInstanceId = "";
    activeTab = "";
    currentSchema = null;
    patchbayMatrix = [];
    maxSlots = 32;
    constructor() {
      console.log("[ModulePatchModal] Initializing Unified Era 7 UI...");
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
      if (window.runtimeStore) {
        window.runtimeStore.subscribe((type) => {
          if (type & 2 || type & 4) {
            this.updateRealtimeUI();
          }
        });
      }
    }
    async open(instanceId, schema) {
      if (!this.el)
        return;
      this.currentInstanceId = instanceId;
      const normalized = this.normalizeSchema(schema);
      this.currentSchema = normalized;
      this.el.style.display = "flex";
      if (!normalized || !normalized.items || normalized.items.length === 0) {
        this.renderTabs(normalized || { items: [] });
        this.switchTab("RACK");
        return;
      }
      this.renderTabs(normalized);
      const tabs = this.getTabsFromSchema(normalized);
      const defaultTab = tabs.includes("MAIN") ? "MAIN" : tabs[0] || "RACK";
      this.switchTab(defaultTab);
    }
    normalizeSchema(schema) {
      if (!schema)
        return null;
      if (schema.items)
        return schema;
      const items = [];
      if (schema.ui && schema.ui.controls) {
        schema.ui.controls.forEach((ctrl) => {
          const param = schema.parameters?.find((p) => p.id === ctrl.bind);
          items.push({
            id: ctrl.bind,
            paramId: ctrl.bind,
            label: ctrl.label || param?.label || ctrl.bind,
            tab: ctrl.presentation?.tab || "MAIN",
            group: ctrl.presentation?.container || ctrl.presentation?.group || "PARAMETERS",
            look: ctrl.type === "selector" ? "list" : "knob",
            options: param?.options || null,
            default: param?.default || 0,
            roles: param?.modulable ? ["stream"] : []
          });
        });
      }
      return { ...schema, items };
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
      tabs.add("RACK");
      return Array.from(tabs);
    }
    switchTab(tabId) {
      this.activeTab = tabId;
      this.tabsContainer?.querySelectorAll(".aseptic-tab-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
      });
      if (tabId === "RACK") {
        this.renderRackTab();
      } else {
        this.renderTabContent(tabId);
      }
    }
    renderRackTab() {
      if (!this.viewport)
        return;
      this.viewport.innerHTML = `
            <div class="aseptic-params-container">
                <div class="aseptic-group-title">RACK REORDERING</div>
                <div class="rack-reorder-actions">
                    <button class="btn-rack-action" id="btn-move-left">\u25C0 MOVE LEFT</button>
                    <button class="btn-rack-action" id="btn-move-right">MOVE RIGHT \u25B6</button>
                </div>
                <div class="aseptic-group-title">VISUAL THEME</div>
                <div class="theme-selector-container">
                    <select class="selector-control" id="theme-selector">
                        <option value="industrial">INDUSTRIAL (DEFAULT)</option>
                        <option value="carbon">CARBON (TECH)</option>
                        <option value="glass">GLASS (FUTURISTIC)</option>
                        <option value="minimal">MINIMAL (CLEAN)</option>
                    </select>
                </div>
                <div class="rack-reorder-info">
                    Instance: <span>${this.currentInstanceId}</span>
                </div>
            </div>
        `;
      const themeSel = document.getElementById("theme-selector");
      if (themeSel) {
        const currentTheme = window.runtimeStore.getSnapshot().preset?.auxiliary?.find((m) => m.instanceId === this.currentInstanceId)?.theme || "";
        themeSel.value = currentTheme;
        themeSel.addEventListener("change", (e) => {
          this.setModuleTheme(e.target.value);
        });
      }
      document.getElementById("btn-move-left")?.addEventListener("click", () => {
        this.moveModule(-1);
      });
      document.getElementById("btn-move-right")?.addEventListener("click", () => {
        this.moveModule(1);
      });
    }
    async setModuleTheme(theme) {
      console.log(`[ModulePatchModal] Setting theme for ${this.currentInstanceId} to ${theme}`);
      await window.rpcCommandDispatcher.dispatch({
        type: "setModuleTheme",
        payload: {
          instanceId: this.currentInstanceId,
          theme
        }
      });
    }
    async moveModule(direction) {
      console.log(`[ModulePatchModal] Moving module ${this.currentInstanceId} in direction ${direction}`);
      await window.rpcCommandDispatcher.dispatch({
        type: "moveModule",
        payload: {
          instanceId: this.currentInstanceId,
          direction
        }
      });
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
      const currentVal = window.runtimeStore?.getValue(`${this.currentInstanceId}.${id}`, item.default || 0);
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
        const val = window.runtimeStore.getValue(`${this.currentInstanceId}.${id}`);
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
          const tVal = window.runtimeStore.getTelemetry(`${this.currentInstanceId}.${id}`);
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

  // components/ModuleBrowser.js
  var ModuleBrowser = class {
    el = null;
    grid = null;
    categories = null;
    detail = null;
    searchInput = null;
    catalog = [];
    currentFilter = "ALL";
    currentSearch = "";
    selectedModule = null;
    constructor() {
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
      console.log("[ModuleBrowser] fetchCatalog starting...");
      const invStore = window.inventoryStore;
      if (invStore) {
        await invStore.ensureLoaded();
        this.catalog = invStore.getAllItems();
        console.log("[ModuleBrowser] Catalog items in store:", this.catalog.length);
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
      console.log(`[ModuleBrowser] renderGrid. Total items: ${this.catalog.length}, Filter: ${this.currentFilter}`);
      const filtered = this.catalog.filter((c) => {
        if (!c.id)
          return false;
        const isVisible = c.visible !== false;
        const matchesFam = this.currentFilter === "ALL" || c.family.toUpperCase() === this.currentFilter.toUpperCase();
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
            type: "addModule",
            payload: { componentId }
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
  var RpcCommandDispatcher = class _RpcCommandDispatcher {
    rpc;
    constructor() {
      this.rpc = window.omegaRPC;
      OmegaLog.info("DISPATCH", "RpcCommandDispatcher Initialized");
    }
    static CORE_COMMANDS = /* @__PURE__ */ new Set([
      "setParameter",
      "loadPreset",
      "savePreset",
      "newPreset",
      "updatePatchbayMatrixSlot",
      "subscribeTelemetry",
      "getUiSchemas",
      "getSystemSettings",
      "serviceAction",
      "setSystemSetting",
      "uiReady",
      "exit"
    ]);
    async dispatch(cmd) {
      OmegaLog.debug("DISPATCH", `${cmd.type}`, cmd.payload || "");
      if (!this.rpc) {
        OmegaLog.error("DISPATCH", "RPC Bridge missing! Command aborted.");
        return;
      }
      try {
        if (_RpcCommandDispatcher.CORE_COMMANDS.has(cmd.type)) {
          return await this.handleCoreCommand(cmd);
        }
        return await this.handleDynamicCommand(cmd);
      } catch (e) {
        OmegaLog.error("DISPATCH", `Failed to execute ${cmd.type}`, e);
      }
    }
    async handleCoreCommand(cmd) {
      switch (cmd.type) {
        case "setParameter":
          const p = cmd.payload;
          if (!p.target && (p.instanceId === void 0 || p.paramId === void 0)) {
            throw new Error("setParameter missing target or numeric IDs");
          }
          break;
      }
      return await this.rpc.send(cmd.type, cmd.payload);
    }
    async handleDynamicCommand(cmd) {
      const method = cmd.target || cmd.method || cmd.type;
      const params = cmd.payload || cmd.value || cmd.data || {};
      if (method && method !== "systemAction") {
        OmegaLog.warn("DISPATCH", `DYNAMIC ROUTE: Using unverified RPC method: ${method}. This is deprecated in Era 7.`, params);
        return await this.rpc.send(method, params);
      }
      const errorMsg = `CONTRACT VIOLATION: Unknown command structure for type '${cmd.type}'`;
      OmegaLog.error("DISPATCH", errorMsg);
      throw new Error(errorMsg);
    }
  };
  window.rpcCommandDispatcher = new RpcCommandDispatcher();

  // logic/RuntimeEventHub.js
  var RuntimeEventHub = class {
    static initialized = false;
    static init() {
      if (this.initialized)
        return;
      this.initialized = true;
      OmegaLog.info("HUB", "Initializing Unified Event Pipeline...");
      const handle = (e) => {
        const ce = e;
        if (window.runtimeStore) {
          window.runtimeStore.reduceEvent(ce.detail);
        }
      };
      window.addEventListener("omega:onStateUpdate", handle);
      window.addEventListener("omega:PARAMCHANGE", handle);
      window.addEventListener("omega:telemetryUpdate", handle);
      window.addEventListener("omega:onLCDUpdate", handle);
      window.addEventListener("omega:onVersionUpdate", handle);
      window.addEventListener("omega:state", handle);
      OmegaLog.info("HUB", "Pipeline Active. All native events are now routed through RuntimeStore.");
    }
  };

  // index.ts
  var win = window;
  var runtimeStore = win.runtimeStore || new RuntimeStore();
  var schemaStore = win.schemaStore || new SchemaStore();
  var graphStore = win.graphStore || new GraphStore();
  var sessionStore = win.sessionStore || new SessionStore();
  var inventoryStore = win.inventoryStore || new InventoryStore();
  var rpcCommandDispatcher = win.rpcCommandDispatcher || new RpcCommandDispatcher();
  win.runtimeStore = runtimeStore;
  win.schemaStore = schemaStore;
  win.graphStore = graphStore;
  win.sessionStore = sessionStore;
  win.inventoryStore = inventoryStore;
  win.rpcCommandDispatcher = rpcCommandDispatcher;
  win.omegaRPC = rpc;
  win.OmegaLog = OmegaLog;
  var manager = new ModuleManager();
  win.moduleManager = manager;
  ModuleRegistry.register("ModuleRenderer", ModuleRenderer);
  ModuleRegistry.register("ModulePatchbayMatrix", ModulePatchbayMatrix);
  ModuleRegistry.register("ModuleBrowser", ModuleBrowser);
  win.Preferences = Preferences;
  win.ServiceMode = ServiceMode;
  win.ModuleRenderer = ModuleRenderer;
  document.addEventListener("DOMContentLoaded", () => {
    if (window.__omegaBooted) {
      OmegaLog.warn("BOOT", "Bootstrap ABORTED: System already booted.");
      return;
    }
    window.__omegaBooted = true;
    RuntimeEventHub.init();
    const juceKeys = Object.keys(window).filter((k) => k.toLowerCase().includes("juce") || k.toLowerCase().includes("omega"));
    OmegaLog.debug("DIAG", "Window Bridge Keys:", juceKeys);
    if (window.__JUCE__) {
      const j = window.__JUCE__;
      OmegaLog.debug("DIAG", "__JUCE__ keys:", Object.keys(j));
      if (j.backend) OmegaLog.debug("DIAG", "__JUCE__.backend keys:", Object.keys(j.backend));
    }
    if (window.juce) OmegaLog.debug("DIAG", "juce found:", Object.keys(window.juce));
    const buildId = window.OMEGA_BUILD_ID || "DEV";
    OmegaLog.info("BOOT", `Booting Era 7 Aseptic UI [BUILD #${buildId}]`);
    try {
      Preferences.init();
      PresetBrowser.init();
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
      const moduleBrowser = new ModuleBrowser();
      win.moduleBrowser = moduleBrowser;
      document.addEventListener("patch-request", (e) => {
        const detail = e.detail;
        const { type, instanceId, componentId } = detail;
        if (type === "add_module") {
          rpcCommandDispatcher.dispatch({
            type: "addModule",
            payload: { componentId }
          });
          return;
        }
        const schema = schemaStore.getSchema(componentId);
        configModal.open(instanceId, schema);
      });
    } catch (e) {
      OmegaLog.error("BOOT", "Component shell init failed:", e);
    }
    app.init();
    document.addEventListener("click", (e) => {
      const target = e.target;
      const action = target.getAttribute("data-action");
      const id = target.getAttribute("data-id") || target.closest("[data-source]")?.getAttribute("data-source");
      if (action && id && win.moduleManager) {
        OmegaLog.debug("UI", `Global Action: ${action} on ${id}`);
        const step = action === "step-up" ? 1 : -1;
        win.moduleManager.stepParameter(id, step);
      }
    });
    const backgroundLoad = async () => {
      try {
        OmegaLog.info("BOOT", "Background data load started...");
        const ready = await rpc.ensureReady(3e3);
        if (!ready) {
          OmegaLog.warn("BOOT", "Handshake delayed. Continuing background load...");
        }
        await Promise.all([
          schemaStore.ensureLoaded(),
          inventoryStore.ensureLoaded()
        ]);
        OmegaLog.info("BOOT", "Stores loaded. Bootstrapping Registry...");
        await ModuleRegistry.bootstrap();
        OmegaLog.info("BOOT", "Background initialization COMPLETED.");
        const rack = document.getElementById("omega-rack");
        if (rack) {
          rack.style.opacity = "1";
          rack.style.pointerEvents = "auto";
          rack.style.display = "flex";
          rack.classList.add("visible");
          OmegaLog.info("BOOT", "Rack visibility forced.");
        }
      } catch (e) {
        OmegaLog.error("BOOT", "Background boot failure:", e);
      }
    };
    backgroundLoad();
  });
})();
