"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // omega_rpc.ts
  var OmegaRPC = class {
    constructor() {
      __publicField(this, "requestId", 1e3);
      __publicField(this, "pendingRequests", /* @__PURE__ */ new Map());
      console.log("[OMEGA TS] RPC Controller Initialized");
      window.handleOmegaMessage = (json) => {
        try {
          const msg = typeof json === "string" ? JSON.parse(json) : json;
          if (msg.requestId && this.pendingRequests.has(msg.requestId)) {
            const req = this.pendingRequests.get(msg.requestId);
            this.pendingRequests.delete(msg.requestId);
            if (msg.type === "error") req.reject(msg.payload);
            else req.resolve(msg.payload);
          } else {
            window.dispatchEvent(new CustomEvent(`omega:${msg.type}`, { detail: msg.payload }));
          }
        } catch (e) {
          console.error("[RPC TS] Error handling message:", e, json);
        }
      };
    }
    async _waitForBackend(timeout = 5e3) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const win = window;
        const bridge = win.omegaNativeCall || win.__JUCE__?.backend?.omegaNativeCall;
        if (typeof bridge === "function") return { omegaNativeCall: bridge };
        if (win.__JUCE__?.backend?.emitEvent) return win.__JUCE__.backend;
        await new Promise((r) => setTimeout(r, 100));
      }
      return null;
    }
    async send(type, payload = {}) {
      const id = this.requestId++;
      const message = { type, requestId: id, payload };
      const backend = await this._waitForBackend();
      if (!backend) {
        console.warn(`[RPC TS] No backend for ${type}, mocking.`);
        return this._getMock(type);
      }
      try {
        let rawResponse;
        if (typeof backend.omegaNativeCall === "function") {
          rawResponse = await backend.omegaNativeCall(type, id, payload);
        } else if (backend.emitEvent) {
          rawResponse = await backend.emitEvent("omegaMessage", message);
        }
        const msg = typeof rawResponse === "string" ? JSON.parse(rawResponse) : rawResponse;
        return msg?.payload !== void 0 ? msg.payload : msg;
      } catch (e) {
        console.error(`[RPC TS] Call ${type} failed:`, e);
        return this._getMock(type);
      }
    }
    async call(type, payload = {}) {
      return this.send(type, payload);
    }
    _getMock(type) {
      if (type === "getState") return { preset: { name: "TS MOCK PATCH" }, params: {} };
      return null;
    }
    // API methods
    getState() {
      return this.send("getState");
    }
    async getMetadata() {
      return this.send("getMetadata");
    }
    async getSystemSettings() {
      return this.send("getSystemSettings");
    }
    async setSystemSetting(id, value) {
      return this.send("setSystemSetting", { id, value });
    }
    async getBrowserData() {
      return this.send("getBrowserData");
    }
    async selectLibrary(libIdx) {
      return this.send("selectLibrary", { libIdx });
    }
    async loadLibraryPreset(libIdx, prstIdx) {
      return this.send("loadLibraryPreset", { libIdx, prstIdx });
    }
    async setFavorite(libIdx, prstIdx, fav) {
      return this.send("setFavorite", { libIdx, prstIdx, fav });
    }
    async savePresetDetailed(libIdx, prstIdx) {
      return this.send("savePreset", { libIdx, prstIdx });
    }
    async saveAsNewPresetDetailed(name, category, author, tags, notes) {
      return this.send("saveAsNewPreset", { name, category, author, tags, notes });
    }
    setParam(id, value) {
      return this.send("setParam", { id, value });
    }
    uiReady() {
      return this.send("uiReady");
    }
    sendMidi(status, data1, data2) {
      return this.send("sendMidi", { status, data1, data2 });
    }
  };
  var rpc = new OmegaRPC();
  function setupJuceShim() {
    if (!window.juce) {
      window.juce = {
        getMetadata: () => rpc.getMetadata(),
        getSystemSettings: () => rpc.getSystemSettings(),
        setSystemSetting: (id, val) => rpc.setSystemSetting(id, val),
        getBrowserData: () => rpc.getBrowserData(),
        selectLibrary: (idx) => rpc.selectLibrary(idx),
        loadLibraryPreset: (lIdx, pIdx) => rpc.loadLibraryPreset(lIdx, pIdx),
        setFavorite: (lIdx, pIdx, fav) => rpc.setFavorite(lIdx, pIdx, fav),
        savePresetDetailed: (lIdx, pIdx) => rpc.savePresetDetailed(lIdx, pIdx),
        saveAsNewPresetDetailed: (n, c, a, t, ns) => rpc.saveAsNewPresetDetailed(n, c, a, t, ns),
        menuAction: (action, ...args) => {
          console.log("[BRIDGE SHIM] juce.menuAction -> RPC send:", action);
          rpc.send("menuAction", { action, args });
        },
        setParameter: (id, value) => {
          rpc.setParam(id, value);
        },
        uiReady: () => {
          rpc.uiReady();
        },
        sendMidi: (status, data1, data2) => {
          rpc.sendMidi(status, data1, data2);
        }
      };
      console.log("[BRIDGE SHIM] window.juce initialized via RPC");
    }
  }
  window.omegaRPC = rpc;

  // metadata_store.ts
  var MetadataStore = class {
    constructor() {
      __publicField(this, "parameters", /* @__PURE__ */ new Map());
      __publicField(this, "groups", /* @__PURE__ */ new Map());
      __publicField(this, "inventory", []);
      __publicField(this, "isLoaded", false);
      __publicField(this, "version", "5.2.0-ALPHA");
      __publicField(this, "build", "397");
      __publicField(this, "timestamp", (/* @__PURE__ */ new Date()).toISOString());
    }
    async ensureLoaded() {
      if (this.isLoaded) return true;
      try {
        const rpc2 = window.omegaRPC;
        if (!rpc2) return false;
        const response = await rpc2.getMetadata();
        if (response && response.parameters) {
          this.parameters.clear();
          response.parameters.forEach((p) => {
            this.parameters.set(p.id, p);
          });
          if (response.groups) {
            this.groups.clear();
            response.groups.forEach((g) => {
              this.groups.set(g.id, g);
            });
          }
          if (response.version) this.version = response.version;
          if (response.build) this.build = response.build;
          if (response.timestamp) this.timestamp = response.timestamp;
          this.isLoaded = true;
          return true;
        }
      } catch (e) {
        console.error("[MetadataStore] Load error:", e);
      }
      return false;
    }
    async getModulationMetadata() {
      const rpc2 = window.omegaRPC;
      try {
        const res = rpc2 ? await rpc2.send("getModulationMetadata", {}) : null;
        if (res && res.inventory && res.inventory.length > 0) {
          this.inventory = res.inventory;
        } else if (this.inventory.length === 0) {
          this.inventory = [{
            id: "midi_2_cv",
            instanceId: "midi_2_cv_1",
            metadata: { id: "midi_2_cv", name: "MIDI TO CV", hp: 8, roles: ["UTILITY", "CONTROL"] },
            ui: {
              tabs: [{
                id: "GENERAL",
                label: "Main",
                groups: {
                  "VOICES": [
                    { id: "v_poly", label: "Polyphony", presentation: { control: "knob" }, range: { min: 1, max: 16, default: 8 } }
                  ],
                  "CV OUT": [
                    { id: "gate_out", label: "Gate", presentation: { control: "led" } }
                  ]
                }
              }]
            }
          }];
        }
        return { inventory: this.inventory, sources: res?.sources || [], targets: res?.targets || [] };
      } catch (e) {
        return { inventory: this.inventory, sources: [], targets: [] };
      }
    }
    getInventoryItem(id) {
      return this.inventory.find((m) => m.instanceId === id || m.id === id);
    }
    getInventory() {
      return this.inventory;
    }
    isInitialized() {
      return this.isLoaded;
    }
    getVersion() {
      return this.version;
    }
    getBuild() {
      return this.build;
    }
    getTimestamp() {
      return this.timestamp;
    }
  };
  window.metadataStore = new MetadataStore();

  // module_descriptors.ts
  var ModuleDescriptors = {
    // Juno DCO (OSC-VA-001)
    "OSC-VA-001": {
      id: "juno-dco",
      title: "JUNO DCO",
      panelClass: "juno-panel",
      uiLayout: { columns: 2, gap: 12 },
      items: [
        { paramId: "layer.a.osc.saw.on", control: "toggle", label: "SAW", row: 0, col: 0, variant: "juno-red" },
        { paramId: "layer.a.osc.pulse.on", control: "toggle", label: "PULSE", row: 0, col: 1, variant: "juno-red" },
        { paramId: "layer.a.osc.sub.level", control: "slider-v", label: "SUB", row: 1, col: 0 },
        { paramId: "layer.a.osc.noise.level", control: "slider-v", label: "NOISE", row: 1, col: 1 },
        { paramId: "layer.a.osc.lfo.depth", control: "knob", label: "LFO", row: 2, col: 0 },
        { paramId: "layer.a.osc.pwm.amount", control: "slider-v", label: "PWM", row: 2, col: 1 }
      ],
      footer: { label: "DIGITALLY CONTROLLED OSC" }
    },
    // Juno VCF (FLT-VA-001)
    "FLT-VA-001": {
      id: "juno-vcf",
      title: "IR3109 VCF",
      panelClass: "juno-panel",
      uiLayout: { columns: 3, gap: 12 },
      items: [
        { paramId: "layer.a.cutoff", control: "knob", label: "FREQ", row: 0, col: 0 },
        { paramId: "layer.a.resonance", control: "knob", label: "RES", row: 0, col: 1 },
        { paramId: "layer.a.vcf.keytrack", control: "knob", label: "KEY", row: 0, col: 2 },
        { paramId: "layer.a.vcf.env.depth", control: "knob", label: "ENV", row: 1, col: 0 },
        { paramId: "layer.a.vcf.lfo.depth", control: "knob", label: "LFO", row: 1, col: 1 },
        { paramId: "layer.a.vcf.env.inv", control: "toggle", label: "POL", row: 1, col: 2, variant: "juno-orange" },
        { paramId: "layer.a.hpf.pos", control: "select", label: "HPF", row: 2, col: 0, colSpan: 3 }
      ],
      footer: { label: "ANALOG LOW PASS FILTER" }
    },
    // Space Echo (FX-DL-002)
    "FX-DL-002": {
      id: "space-echo",
      title: "SPACE ECHO",
      panelClass: "space-panel",
      uiLayout: { columns: 2, gap: 12 },
      items: [
        { paramId: "layer.a.fx.space.speed", control: "knob", label: "RATE", row: 0, col: 0 },
        { paramId: "layer.a.fx.space.intensity", control: "knob", label: "INTEN", row: 0, col: 1 },
        { paramId: "layer.a.fx.space.echo.vol", control: "knob", label: "ECHO", row: 1, col: 0 },
        { paramId: "layer.a.fx.space.rev.vol", control: "knob", label: "REV", row: 1, col: 1 },
        { paramId: "layer.a.fx.space.mode", control: "select", label: "MODE", row: 2, col: 0, colSpan: 2 },
        { paramId: "layer.a.fx.space.wow", control: "knob", label: "WOW", row: 3, col: 0 },
        { paramId: "layer.a.fx.space.drive", control: "knob", label: "DRIVE", row: 3, col: 1 }
      ],
      footer: {
        paramId: "layer.a.fx.space.enable",
        label: "RE-201 TAPE ECHO"
      }
    },
    // Master Delay
    "FX-DL-001": {
      id: "master-delay",
      title: "MASTER DELAY",
      panelClass: "universal-panel",
      uiLayout: { columns: 2, gap: 12 },
      items: [
        { paramId: "global.delay.time", control: "knob", label: "TIME", row: 0, col: 0 },
        { paramId: "global.delay.feedback", control: "knob", label: "FDBK", row: 0, col: 1 },
        { paramId: "global.delay.mix", control: "slider-v", label: "MIX", row: 1, col: 0, colSpan: 2 }
      ],
      footer: {
        paramId: "global.delay.enable",
        label: "DIGITAL FX CORE"
      }
    },
    // Universal ADSR (EG-STANDARD-001 / ENV-ADSR-GEN)
    "EG-STANDARD-001": {
      id: "adsr",
      title: "EG-ADSR",
      panelClass: "universal-panel",
      uiLayout: { columns: 2, gap: 12 },
      items: [
        { paramId: "layer.a.env.attack", control: "knob", label: "A", row: 0, col: 0 },
        { paramId: "layer.a.env.decay", control: "knob", label: "D", row: 0, col: 1 },
        { paramId: "layer.a.env.sustain", control: "knob", label: "S", row: 1, col: 0 },
        { paramId: "layer.a.env.release", control: "knob", label: "R", row: 1, col: 1 }
      ],
      footer: { label: "ENV GENERATOR" }
    },
    "ENV-ADSR-GEN": {
      id: "adsr",
      title: "EG-ADSR",
      panelClass: "universal-panel",
      uiLayout: { columns: 2, gap: 12 },
      items: [
        { paramId: "layer.a.env.attack", control: "knob", label: "A", row: 0, col: 0 },
        { paramId: "layer.a.env.decay", control: "knob", label: "D", row: 0, col: 1 },
        { paramId: "layer.a.env.sustain", control: "knob", label: "S", row: 1, col: 0 },
        { paramId: "layer.a.env.release", control: "knob", label: "R", row: 1, col: 1 }
      ],
      footer: { label: "ENV GENERATOR" }
    },
    // Universal VCA (VCA-STANDARD-001)
    "VCA-STANDARD-001": {
      id: "vca",
      title: "AMP-VCA",
      panelClass: "universal-panel",
      uiLayout: { columns: 1, gap: 12 },
      items: [
        { paramId: "layer.a.vca.gain", control: "slider-v", label: "GAIN", row: 0, col: 0 },
        { paramId: "layer.a.vca.mode", control: "toggle", label: "GATE", row: 1, col: 0 }
      ],
      footer: { label: "AMPLIFIER" }
    },
    // Universal LFO (LFO-STANDARD-001)
    "LFO-STANDARD-001": {
      id: "lfo",
      title: "LFO-MOD",
      panelClass: "universal-panel",
      uiLayout: { columns: 1, gap: 12 },
      items: [
        { paramId: "layer.a.lfo.rate", control: "knob", label: "RATE", row: 0, col: 0 },
        { paramId: "layer.a.lfo.wave", control: "select", label: "WAVE", row: 1, col: 0 }
      ],
      footer: { label: "MODULATOR" }
    },
    // Korg/Prophecy Oscillator (OSC-KORG-P)
    "OSC-KORG-P": {
      id: "korg-osc",
      title: "KORG DCO",
      panelClass: "korg-prophecy-panel",
      uiLayout: { columns: 2, gap: 12 },
      items: [
        { paramId: "layer.a.osc.saw.on", control: "toggle", label: "SAW", row: 0, col: 0 },
        { paramId: "layer.a.osc.pulse.on", control: "toggle", label: "PULSE", row: 0, col: 1 }
      ],
      footer: { label: "MOSS ENGINE" }
    },
    // Korg MS-20 Filter (FLT-VA-003)
    "FLT-VA-003": {
      id: "korg-vcf",
      title: "KORG-35 VCF",
      panelClass: "korg-ms20-panel",
      uiLayout: { columns: 3, gap: 12 },
      items: [
        { paramId: "layer.a.cutoff", control: "knob", label: "LPF", row: 0, col: 0 },
        { paramId: "layer.a.korg.hpf.cutoff", control: "knob", label: "HPF", row: 0, col: 1 },
        { paramId: "layer.a.korg.grit", control: "knob", label: "DRIVE", row: 0, col: 2 }
      ],
      footer: { label: "VCF (ANALOG)" }
    },
    // JP Supersaw (OSC-VA-004)
    "OSC-VA-004": {
      id: "jp-supersaw",
      title: "JP SUPERSAW",
      panelClass: "jp-panel",
      uiLayout: { columns: 3, gap: 12 },
      items: [
        { paramId: "layer.a.jp.detune", control: "knob", label: "DETUNE", row: 0, col: 0 },
        { paramId: "layer.a.jp.spread", control: "knob", label: "SPREAD", row: 0, col: 1 },
        { paramId: "layer.a.drift", control: "knob", label: "DRIFT", row: 0, col: 2 }
      ],
      footer: { label: "ROLAND SUPERSAW" }
    },
    // Juno Chorus (FX-CH-001)
    "FX-CH-001": {
      id: "juno-chorus",
      title: "JUNO CHORUS",
      panelClass: "juno-panel",
      uiLayout: { columns: 2, gap: 12 },
      items: [
        { paramId: "global.chorus.mode", control: "select", label: "MODE", row: 0, col: 0 },
        { paramId: "global.chorus.mix", control: "knob", label: "MIX", row: 0, col: 1 }
      ],
      footer: { label: "BBD EFFECT" }
    },
    // --- Semantic Generics for Build #158 (Aseptic Upgrade) ---
    "lfo": {
      id: "lfo",
      title: "LFO-MOD",
      panelClass: "universal-panel",
      uiLayout: { columns: 2, gap: 12 },
      items: [
        { paramId: "layer.a.lfo.rate", control: "knob", label: "RATE", row: 0, col: 0 },
        { paramId: "layer.a.lfo.wave", control: "select", label: "WAVE", row: 0, col: 1 }
      ],
      footer: { label: "MODULATOR" }
    },
    "eg": {
      id: "adsr",
      title: "EG-ADSR",
      panelClass: "universal-panel",
      uiLayout: { columns: 2, gap: 12 },
      items: [
        { paramId: "layer.a.env.attack", control: "knob", label: "A", row: 0, col: 0 },
        { paramId: "layer.a.env.decay", control: "knob", label: "D", row: 0, col: 1 },
        { paramId: "layer.a.env.sustain", control: "knob", label: "S", row: 1, col: 0 },
        { paramId: "layer.a.env.release", control: "knob", label: "R", row: 1, col: 1 }
      ],
      footer: { label: "ENV GENERATOR" }
    },
    "filter": {
      id: "vcf",
      title: "VCF-CORE",
      panelClass: "universal-panel",
      uiLayout: { columns: 2, gap: 12 },
      items: [
        { paramId: "layer.a.cutoff", control: "knob", label: "FREQ", row: 0, col: 0 },
        { paramId: "layer.a.resonance", control: "knob", label: "RES", row: 0, col: 1 }
      ],
      footer: { label: "FILTER" }
    },
    "osc": {
      id: "osc",
      title: "OSC-CORE",
      panelClass: "universal-panel",
      uiLayout: { columns: 2, gap: 12 },
      items: [
        { paramId: "layer.a.osc.saw.on", control: "toggle", label: "SAW", row: 0, col: 0 },
        { paramId: "layer.a.osc.pulse.on", control: "toggle", label: "PULSE", row: 0, col: 1 }
      ],
      footer: { label: "OSCILLATOR" }
    },
    "amp": {
      id: "vca",
      title: "AMP-VCA",
      panelClass: "universal-panel",
      uiLayout: { columns: 1, gap: 12 },
      items: [
        { paramId: "layer.a.vca.gain", control: "slider-v", label: "GAIN", row: 0, col: 0 }
      ],
      footer: { label: "AMPLIFIER" }
    },
    "matrix": {
      id: "patchbay-matrix",
      title: "PATCHBAY MATRIX",
      panelClass: "matrix-panel",
      uiLayout: { columns: 1, gap: 0 },
      items: [
        { paramId: "global.patchbay.active", control: "knob", label: "ROUTES", row: 0, col: 0 }
      ],
      footer: { label: "MODULATION HUB" }
    },
    "patchbay": {
      id: "patchbay-matrix",
      title: "PATCHBAY MATRIX",
      panelClass: "matrix-panel",
      uiLayout: { columns: 1, gap: 0 },
      items: [
        { paramId: "global.patchbay.active", control: "knob", label: "ROUTES", row: 0, col: 0 }
      ],
      footer: { label: "MODULATION HUB" }
    },
    "trig": {
      id: "trig",
      title: "MIDI TRIGGER",
      panelClass: "utility-panel",
      uiLayout: { columns: 1, gap: 0 },
      items: [
        { paramId: "global.midi.trig", control: "knob", label: "GATE", row: 0, col: 0 }
      ],
      footer: { label: "MIDI INPUT" }
    },
    // Aseptic Technical IDs (Build 286+)
    "MIDI-IN-001": {
      id: "midi-in",
      title: "MIDI INPUT",
      panelClass: "utility-panel",
      uiLayout: { columns: 1, gap: 10 },
      items: [
        { paramId: "global.midi.activity", control: "telemetry", label: "ACTIVITY", row: 0, col: 0 }
      ],
      footer: { label: "WASM MIDI CORE" }
    },
    "MIDI-MON-001": {
      id: "midi-mon",
      title: "MIDI MONITOR",
      panelClass: "utility-panel",
      uiLayout: { columns: 1, gap: 0 },
      items: [
        { paramId: "global.midi.mon", control: "telemetry", label: "TRAFFIC", row: 0, col: 0 }
      ],
      footer: { label: "RE-TIME ANALYZER" }
    },
    "mon": {
      id: "mon",
      title: "MIDI MONITOR",
      panelClass: "utility-panel",
      uiLayout: { columns: 1, gap: 0 },
      items: [
        { paramId: "global.midi.mon", control: "telemetry", label: "TRAFFIC", row: 0, col: 0 }
      ],
      footer: { label: "RE-TIME ANALYZER" }
    },
    "osci": {
      id: "osci",
      title: "OSCILLOSCOPE",
      panelClass: "utility-panel",
      uiLayout: { columns: 1, gap: 0 },
      items: [
        { paramId: "global.scope", control: "telemetry", label: "WAVE", row: 0, col: 0 }
      ],
      footer: { label: "GLOBAL WAVE" }
    }
  };
  window.ModuleDescriptors = ModuleDescriptors;

  // module_manager.ts
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
      if (!data) return [];
      let list = [];
      if (Array.isArray(data)) list = data;
      else if (typeof data === "object") list = Object.values(data);
      return list.map((item) => Array.isArray(item) ? item[0] : item);
    }
    async updateRack(state) {
      if (this.isRendering) return;
      this.isRendering = true;
      try {
        console.log("[ModuleManager] updateRack checking stability...");
        const safeState = state || {};
        this.lastState = safeState;
        await window.metadataStore.ensureLoaded();
        await window.metadataStore.getModulationMetadata();
        const upper = document.getElementById("upper-rack");
        const lower = document.getElementById("lower-rack");
        const layerList = this.normalizeList(state.preset && state.preset.layers);
        const auxList = this.normalizeList(safeState.preset?.auxiliary || safeState.auxiliary || []);
        const mainChain = this.normalizeList(safeState.mainChain || []);
        const totalModules = layerList.length + auxList.length + mainChain.length;
        if (totalModules === this.lastModuleCount && totalModules > 0) {
          console.log("[ModuleManager] Structure stable. Skipping full re-render, notifying active instances.");
          this.activeModules.forEach((mod) => {
            if (mod.onStateUpdate) mod.onStateUpdate(state);
          });
          return;
        }
        this.lastModuleCount = totalModules;
        console.log(`[ModuleManager] Structural change detected (${totalModules} modules). Rebuilding racks...`);
        if (upper) upper.innerHTML = "";
        if (lower) lower.innerHTML = "";
        this.activeModules.clear();
        this.oscilloscopes = [];
        this.midiViewer = null;
        const layerData = layerList.length > 0 ? layerList[0] : null;
        const aux = auxList;
        if (aux.length === 0 && (!layerList || layerList.length === 0) && mainChain.length === 0) {
          console.log("[ModuleManager] No modules found. Injecting emergency module.");
          await this.injectEmergencyModule();
          return;
        }
        for (const item of aux) {
          const id = item.instanceId || item.nodeId || item.id || item.slotName || "AUX";
          const label = item.label || item.name || item.slotName || id;
          const componentId = item.componentId || item.id || "";
          const descriptor = this.resolveDescriptor(item);
          const stateRack = item.rack !== void 0 ? item.rack : item.params && item.params.rack;
          const manifestRack = descriptor?.rack;
          let rackValue = stateRack !== void 0 ? stateRack : manifestRack;
          const source = stateRack !== void 0 ? "State" : manifestRack !== void 0 ? "Manifest" : "Default";
          if (rackValue === void 0) {
            rackValue = "upper";
          }
          console.log(`[ModuleManager] Routing ${id} [${componentId}]: value=${rackValue} (Source: ${source}), panelClass=${descriptor?.panelClass}`);
          let targetRack = upper;
          let rackType = "aux";
          const isLower = typeof rackValue === "string" && rackValue.toLowerCase() === "lower" || typeof rackValue === "string" && rackValue.toLowerCase() === "main" || rackValue === 1 || rackValue === 1;
          if (isLower) {
            targetRack = lower;
            rackType = "main";
          }
          if (componentId === "patchbay_matrix") {
            console.log(`[ModuleManager] Skipping system component in rack: ${componentId}`);
            continue;
          }
          if (descriptor) {
            let className = "ModuleRenderer";
            await this.addModule(id, className, rackType, targetRack, {
              label,
              descriptor,
              componentId
            });
          } else {
            await this.addPlaceholder(id, rackType, targetRack, componentId);
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
              const descriptor = ModuleDescriptors[componentId];
              let type = "core";
              const role = (node.role || "").toLowerCase();
              if (role === "source" || role === "oscillator") type = "osc";
              else if (role === "filter") type = "filter";
              else if (role === "amplifier") type = "amp";
              else if (role === "envelope" || role === "controller") type = "env";
              else if (role === "lfo") type = "lfo";
              else if (role === "fx") type = "fx";
              else if (role === "auxiliary" || role === "utility") type = "aux";
              if (descriptor && lower) {
                await this.addModule(node.nodeId || node.id || componentId, "ModuleRenderer", type, lower, {
                  descriptor,
                  componentId,
                  layer,
                  group: "MAIN"
                });
              } else if (lower) {
                await this.addPlaceholder(node.nodeId || node.id || componentId, type, lower, componentId);
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
              if (!cat.list || cat.list.length === 0) continue;
              for (const item of cat.list) {
                const componentId = item.componentId || item.id || item.type;
                const descriptor = this.resolveDescriptor(item);
                const layer2 = "A";
                if (descriptor && lower) {
                  await this.addModule(item.slotName || componentId, "ModuleRenderer", cat.type, lower, {
                    descriptor,
                    componentId,
                    layer: layer2,
                    group: "MAIN"
                  });
                } else if (lower) {
                  await this.addPlaceholder(item.slotName || componentId, cat.type, lower, componentId);
                }
              }
            }
          }
        }
        this.activeModules.forEach((mod) => {
          if (mod.onStateUpdate) mod.onStateUpdate(state);
        });
      } catch (e) {
        console.error("[ModuleManager] Error during rack update:", e);
        if (e && e.stack) console.error("[ModuleManager] Stack trace:", e.stack);
      } finally {
        this.isRendering = false;
      }
    }
    async addPlaceholder(id, type, container, componentId) {
      if (!container) return;
      const el = document.createElement("div");
      el.className = `module module-${type} placeholder`;
      el.innerHTML = `
            <div class="module-header">${id} <div class="led amber-pulsing" style="display:inline-block; margin-left:8px;" title="Module Power: ON"></div></div>
            <div class="module-content">
                <div class="placeholder-msg">GENERIC PANEL</div>
                <div class="label-tiny">${componentId}</div>
            </div>
        `;
      container.appendChild(el);
    }
    async injectEmergencyModule() {
      console.log("[ModuleManager] Injecting Emergency Mirror Alert...");
      const upper = document.getElementById("upper-rack");
      const lower = document.getElementById("lower-rack");
      if (upper) upper.innerHTML = "";
      if (lower) lower.innerHTML = "";
      const descriptor = ModuleDescriptors["ERR-EMPTY-001"];
      await this.addModule("EMERGENCY_SYSTEM_UPPER", "ModuleEmergency", "aux", upper, {
        label: "SYSTEM MONITOR",
        descriptor
      });
      await this.addModule("EMERGENCY_SYSTEM_LOWER", "ModuleEmergency", "main", lower, {
        label: "ENGINE GUARD",
        descriptor
      });
    }
    async addModule(id, className, type, container, options = {}) {
      if (!container) return;
      const el = document.createElement("div");
      el.id = `mod-${id}`;
      el.className = `module module-${type} ${className} ${options.descriptor?.panelClass || ""}`;
      const header = document.createElement("div");
      header.className = "module-header";
      header.innerText = options.label || options.descriptor?.title || id;
      const patchIcon = document.createElement("div");
      patchIcon.className = "module-patch-icon";
      patchIcon.innerHTML = "\u2699\uFE0F";
      patchIcon.title = "Patch Module";
      patchIcon.onclick = (e) => {
        e.stopPropagation();
        document.dispatchEvent(new CustomEvent("patch-request", {
          detail: {
            instanceId: id,
            componentId: options.componentId
          }
        }));
      };
      header.appendChild(patchIcon);
      const led = document.createElement("div");
      led.className = "led status-indicator";
      led.title = "Module Active";
      header.appendChild(led);
      el.appendChild(header);
      const content = document.createElement("div");
      content.className = "module-content";
      el.appendChild(content);
      container.appendChild(el);
      if (window[className]) {
        const instance = new window[className](el, content, options.descriptor || options);
        this.activeModules.set(id, instance);
        if (instance.init) await instance.init();
        if (instance.onStateUpdate && this.lastState) instance.onStateUpdate(this.lastState);
        if (className === "ModuleOscilloscope") this.oscilloscopes.push(instance);
        if (className === "ModuleMidiViewer") this.midiViewer = instance;
      }
    }
    getCanonicalId(id) {
      if (!id) return "";
      const parts = id.split("_");
      if (parts.length > 1 && !isNaN(parseInt(parts[parts.length - 1]))) {
        return parts.slice(0, -1).join("_");
      }
      return id;
    }
    resolveDescriptor(item) {
      if (!item) return null;
      const id = item.componentId || item.id;
      if (!id) return null;
      const canonicalId = this.getCanonicalId(id);
      const catalog = window.omegaCatalog || {};
      const catItem = catalog[id] || catalog[canonicalId];
      if (catItem) {
        if (catItem.uiLayout) {
          let layoutObj = catItem.uiLayout;
          if (typeof layoutObj === "string") {
            try {
              layoutObj = JSON.parse(layoutObj);
            } catch (e) {
              console.error("Parse err: ", e);
            }
          }
          const desc = JSON.parse(JSON.stringify(layoutObj));
          desc.id = id;
          desc.title = catItem.name || id;
          desc.panelClass = catItem.panelClass || desc.panelClass || "utility-panel";
          desc.rack = catItem.rack || desc.rack;
          return desc;
        }
        return {
          id,
          title: catItem.name || id,
          panelClass: catItem.panelClass || "utility-panel",
          rack: catItem.rack,
          items: [],
          grid: { columns: 2, gap: 12 }
        };
      }
      const store2 = window.metadataStore;
      if (store2 && store2.inventory) {
        const invItem = store2.inventory.find((m) => m.id === id || m.id === canonicalId || m.instanceId === id);
        if (invItem && invItem.uiLayout) {
          let layoutObj = invItem.uiLayout;
          if (typeof layoutObj === "string") {
            try {
              layoutObj = JSON.parse(layoutObj);
            } catch (e) {
              console.error("Parse err: ", e);
            }
          }
          const desc = JSON.parse(JSON.stringify(layoutObj));
          desc.id = id;
          desc.title = invItem.name || id;
          desc.panelClass = invItem.style || desc.panelClass || "universal-panel";
          return desc;
        }
      }
      return ModuleDescriptors[id] || ModuleDescriptors[canonicalId] || {
        id,
        title: id.toUpperCase(),
        items: [],
        grid: { columns: 1, gap: 10 },
        panelClass: "universal-panel"
      };
    }
  };
  if (typeof window !== "undefined") {
    window.moduleManager = new ModuleManager();
  }

  // script.ts
  var OmegaApp = class {
    constructor() {
      __publicField(this, "lastPresetName", "INITIAL PATCH");
      __publicField(this, "lcdTimer", null);
      __publicField(this, "promiseId", 0);
      __publicField(this, "octaveShift", 0);
      __publicField(this, "lastSysExHex", "");
      __publicField(this, "currentBankGlobal", 1);
      __publicField(this, "currentPatchGlobal", 1);
      __publicField(this, "sysexMirror", new Array(23).fill(0));
      __publicField(this, "store", null);
      __publicField(this, "initialized", false);
      __publicField(this, "keyboard");
      this.sysexMirror[0] = 240;
      this.sysexMirror[1] = 65;
      this.sysexMirror[2] = 48;
      this.sysexMirror[22] = 247;
    }
    init() {
      console.log("[OMEGA TS] Initializing App...");
      setupJuceShim();
      this.store = window.metadataStore;
      console.log("[OMEGA TS] Store assigned:", this.store ? "YES" : "NO");
      this.setupEventListeners();
      console.log("[OMEGA TS] Event Listeners Ready");
      this.setupInteractions();
      console.log("[OMEGA TS] Interactions Ready");
      this.setupMenus();
      console.log("[OMEGA TS] Menus Ready");
      this.setupModals();
      console.log("[OMEGA TS] Modals Ready");
      this.setupKeyboard();
      console.log("[OMEGA TS] Keyboard Ready");
      this.hideSplash();
      console.log("[OMEGA TS] hideSplash called");
      setTimeout(() => {
        if (!this.initialized) {
          console.error("[OMEGA] Init timed out. Showing console.");
          const consoleEl = document.getElementById("debug-console");
          if (consoleEl) consoleEl.style.display = "block";
        }
      }, 6e3);
      if (window.juce && window.juce.uiReady) {
        window.juce.uiReady();
      }
      if (this.store && this.store.isLoaded) {
        const build = this.store.getBuild();
        const ts = this.store.getTimestamp();
        const version = this.store.getVersion();
        const logPanel = document.getElementById("debug-console-content");
        if (logPanel) {
          const banner = document.createElement("div");
          banner.style.cssText = "color:#00e5ff;font-weight:bold;font-size:1.05em;padding:2px 0 4px;border-bottom:1px solid #1a3a3a;margin-bottom:4px;";
          banner.textContent = `OMEGA v${version} \xB7 Build ${build} \xB7 ${ts}`;
          logPanel.prepend(banner);
        }
        console.log(`[OMEGA] v${version} \xB7 Build ${build} \xB7 ${ts}`);
        this.updateVersion(version, build);
      } else {
        console.warn("[OMEGA TS] Store NOT loaded yet at end of init");
      }
      if (window.omegaRPC) {
        window.omegaRPC.send("listCatalog", {}).then((resp) => {
          if (resp && resp.components) {
            window.omegaCatalog = Object.fromEntries(
              resp.components.map((c) => [c.id, c])
            );
            console.log(`[OMEGA] ACE Catalog preloaded: ${resp.components.length} components`);
          }
        }).catch(() => {
        });
      }
      this.initialized = true;
      console.log("[OMEGA TS] App Initialized.");
    }
    setupEventListeners() {
      console.log("[OMEGA TS] Setting up Event Listeners...");
      if (window.__JUCE__ && window.__JUCE__.backend) {
        console.log("[OMEGA TS] JUCE Backend found. Registering...");
        const backend = window.__JUCE__.backend;
        backend.addEventListener("onParameterChanged", (data) => this.syncUI(data.id, data.value));
        backend.addEventListener("onLCDUpdate", (text) => this.updateLCD(text, false));
        backend.addEventListener("onVersionUpdate", (version, build) => this.updateVersion(version, build));
        backend.addEventListener("onBankPatchUpdate", (data) => {
          this.currentBankGlobal = data.bank || 1;
          this.currentPatchGlobal = data.patch || 1;
          this.updateSevenSegment();
        });
      }
    }
    hideSplash() {
      console.log("[OMEGA TS] hideSplash execution starting. Setting 3.5s timeout...");
      const doHide = () => {
        console.log("[OMEGA TS] doHide timeout EXECUTING NOW");
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
        } else if (rack) {
          rack.style.display = "flex";
          rack.classList.add("visible");
        }
      };
      setTimeout(doHide, 3500);
    }
    updateVersion(version, build) {
      const topEl = document.getElementById("top-bar-version");
      if (topEl) {
        const buildStr = build ? ` (Build ${build})` : " (Online)";
        topEl.innerText = `OMEGA ${version}${buildStr}`;
      }
      document.querySelectorAll(".splash-version, #app-title-mini, #about-version, .about-version").forEach((el) => {
        const htmlEl = el;
        if (htmlEl.id === "app-title-mini") htmlEl.innerText = "OMEGA Synthesizer v" + version;
        else htmlEl.innerText = version.startsWith("Version") ? version : "Version " + version;
      });
      const buildEl = document.getElementById("about-build");
      if (buildEl && build) buildEl.innerText = build;
      const tsEl = document.getElementById("about-timestamp");
      if (tsEl && this.store) tsEl.innerText = this.store.getTimestamp();
    }
    updateLCD(text, isTemporary) {
      const lcd = document.getElementById("lcd-text");
      if (!lcd) return;
      if (this.lcdTimer) {
        clearTimeout(this.lcdTimer);
        this.lcdTimer = null;
      }
      if (isTemporary) {
        lcd.innerText = text;
        lcd.style.color = "#ff8888";
        this.lcdTimer = window.setTimeout(() => {
          lcd.innerText = this.lastPresetName;
          lcd.style.color = "#ff3c3c";
        }, 1500);
      } else {
        this.lastPresetName = text;
        lcd.innerText = text;
        lcd.style.color = "#ff3c3c";
      }
    }
    updateSevenSegment() {
      const b = document.getElementById("bank-digit");
      const p = document.getElementById("patch-digit");
      if (b) b.innerText = this.currentBankGlobal.toString();
      if (p) p.innerText = this.currentPatchGlobal.toString();
    }
    handleMenuAction(action) {
      console.log("[OMEGA] Handling Menu Action:", action);
      switch (action) {
        case "clear_rack":
          if (window.confirm("WARNING: This will clear the entire modular rack. Are you sure?")) {
            if (window.juce) window.juce.menuAction("new_preset", "Empty Slate Preset");
          }
          break;
        case "new_preset":
          const presetName = window.prompt("\xBFDeseas vaciar el rack y crear un nuevo preset? Introduce el nombre:", "Init Preset");
          if (presetName !== null) {
            if (window.juce) window.juce.menuAction("new_preset", presetName);
          }
          break;
        case "about":
          this.showModal("about-modal");
          break;
        case "toggle_preferences_modal":
          this.showModal("preferences-modal");
          break;
        case "toggle_presets_modal":
          this.showModal("presets-modal");
          break;
        case "toggle_console":
          const c = document.getElementById("debug-console");
          if (c) c.style.display = c.style.display === "none" ? "block" : "none";
          break;
        default:
          if (window.juce) window.juce.menuAction(action);
          else console.warn("[OMEGA] Bridge disconnected - Remote action ignored:", action);
          break;
      }
    }
    showModal(id) {
      const modal = document.getElementById(id);
      if (modal) {
        modal.style.display = "flex";
        modal.style.zIndex = "30000";
      }
    }
    setupModals() {
      document.querySelectorAll(".modal .close-btn, .modal .modal-ok-btn, .modal .pref-done-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const modal = btn.closest(".modal");
          if (modal) modal.style.display = "none";
        });
      });
      window.addEventListener("click", (e) => {
        if (e.target.classList.contains("modal")) {
          e.target.style.display = "none";
        }
      });
    }
    setupInteractions() {
      console.log("[OMEGA TS] Setting up button interaction listeners...");
      const closeBtn = document.getElementById("close-console");
      if (closeBtn) closeBtn.onclick = () => {
        console.log("[OMEGA] Console Close requested");
        const consoleEl = document.getElementById("debug-console");
        if (consoleEl) consoleEl.style.display = "none";
      };
      const clearBtn = document.getElementById("clear-console");
      if (clearBtn) clearBtn.onclick = () => {
        console.log("[OMEGA] Console Clear requested");
        const logPanel = document.getElementById("debug-console-content");
        if (logPanel) logPanel.innerHTML = "";
      };
      const copyBtn = document.getElementById("copy-console");
      if (copyBtn) copyBtn.onclick = async () => {
        console.log("[OMEGA] Console Copy requested");
        const logPanel = document.getElementById("debug-console-content");
        if (logPanel) {
          try {
            await navigator.clipboard.writeText(logPanel.innerText);
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = "&#x2714;";
            setTimeout(() => copyBtn.innerHTML = originalText, 1e3);
          } catch (e) {
            console.error("[OMEGA] Clipboard failure:", e);
          }
        }
      };
      this.setupSliders();
      this.setupButtons();
      this.setupBender();
      this.updateLCD(this.lastPresetName, false);
    }
    setupSliders() {
      document.querySelectorAll(".v-slider, .v-slider-mini, .b-track").forEach((container) => {
        const pod = container.closest("[data-param]");
        if (!pod) return;
        const paramID = pod.getAttribute("data-param");
        const move = (e) => {
          const rect = container.getBoundingClientRect();
          let val = 1 - (e.clientY - rect.top) / rect.height;
          val = Math.max(0, Math.min(1, val));
          this.syncUI(paramID, val);
          if (window.juce) window.juce.setParameter(paramID, val);
          this.updateLCD(paramID.toUpperCase() + ": " + val.toFixed(2), true);
        };
        container.addEventListener("pointerdown", (e) => {
          const pointerEvent = e;
          pointerEvent.preventDefault();
          container.setPointerCapture(pointerEvent.pointerId);
          move(pointerEvent);
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
          btn.classList.add("pushed");
          const isActive = btn.getAttribute("data-active") === "true";
          const nextVal = isActive ? 0 : 1;
          this.syncUI(paramID, nextVal);
          if (window.juce) window.juce.setParameter(paramID, nextVal);
        });
        const release = () => btn.classList.remove("pushed");
        btn.addEventListener("pointerup", release);
        btn.addEventListener("pointerleave", release);
      });
      document.querySelectorAll("[data-action]").forEach((btn) => {
        btn.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          const actionID = btn.getAttribute("data-action");
          if (window.juce) window.juce.menuAction(actionID);
        });
      });
    }
    setupBender() {
      const stick = document.getElementById("bender-stick");
      const housing = document.getElementById("stick-housing");
      if (!stick || !housing) return;
      housing.addEventListener("pointerdown", (e) => {
        const pointerEvent = e;
        pointerEvent.preventDefault();
        housing.setPointerCapture(pointerEvent.pointerId);
        const move = (ev) => {
          const rect = housing.getBoundingClientRect();
          let x = (ev.clientX - rect.left) / rect.width;
          x = Math.max(0, Math.min(1, x));
          stick.style.left = x * 100 + "%";
          if (window.juce) window.juce.setParameter("bender", x);
        };
        move(pointerEvent);
        const onMove = (ev) => move(ev);
        const onUp = () => {
          housing.removeEventListener("pointermove", onMove);
          housing.removeEventListener("pointerup", onUp);
          stick.style.left = "50%";
          if (window.juce) window.juce.setParameter("bender", 0.5);
        };
        housing.addEventListener("pointermove", onMove);
        housing.addEventListener("pointerup", onUp);
      });
    }
    syncUI(id, val) {
      document.querySelectorAll(`[data-param="${id}"]`).forEach((pod) => {
        const htmlPod = pod;
        const knob = htmlPod.querySelector(".knob");
        if (knob) knob.style.transform = `translateX(-50%) rotate(${val * 270 - 135}deg)`;
        const btn = htmlPod.tagName === "BUTTON" ? htmlPod : htmlPod.querySelector("button");
        if (btn) {
          const isActive = val > 0.5;
          btn.setAttribute("data-active", isActive.toString());
          btn.classList.toggle("active-mode", isActive);
        }
        if (htmlPod.tagName === "SELECT") {
          htmlPod.value = val.toString();
        }
      });
      const led = document.getElementById(`led-${id}`);
      if (led) led.classList.toggle("active", val > 0.5);
    }
    setupMenus() {
      document.querySelectorAll(".menu-item").forEach((item) => {
        const htmlItem = item;
        htmlItem.addEventListener("click", (e) => {
          const target = e.target;
          const dropdown = htmlItem.querySelector(".dropdown");
          if (target.tagName === "A" && target.hasAttribute("data-action")) {
            const action = target.getAttribute("data-action");
            if (action) {
              this.handleMenuAction(action);
            }
            if (dropdown) dropdown.style.display = "none";
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          if (!dropdown) return;
          const isVisible = dropdown.style.display === "block";
          document.querySelectorAll(".dropdown").forEach((d) => d.style.display = "none");
          dropdown.style.display = isVisible ? "none" : "block";
        });
      });
      window.addEventListener("click", () => {
        document.querySelectorAll(".dropdown").forEach((d) => d.style.display = "none");
      });
    }
    setupKeyboard() {
      const bed = document.getElementById("ivory-keys-bed");
      if (!bed) return;
    }
  };
  var app = new OmegaApp();
  window.handleOmegaMessage = (msg) => {
    try {
      const payload = typeof msg === "string" ? JSON.parse(msg) : msg;
      const type = payload.type || "";
      const state = payload.payload || payload;
      console.log("[OMEGA TS] Message Received:", type);
      if (type === "onStateUpdate") {
        const manager = window.moduleManager;
        if (manager) manager.updateRack(state);
        if (window.patchbayHub) window.patchbayHub.onStateUpdate(state);
        if (window.modulePatchModal) window.modulePatchModal.onStateUpdate(state);
      } else if (type === "onPatchbayMatrixUpdate") {
        if (window.patchbayHub) {
          console.log("[OMEGA TS] Syncing Patchbay Hub...");
          window.patchbayHub.onStateUpdate(state);
        }
        if (window.modulePatchModal) {
          console.log("[OMEGA TS] Syncing Patch Modal...");
          window.modulePatchModal.onStateUpdate(state);
        }
        const manager = window.moduleManager;
        if (manager && manager.activeModules) {
          manager.activeModules.forEach((mod) => {
            if (mod.onStateUpdate) mod.onStateUpdate(state);
          });
        }
      } else if (type === "menuAction") {
        app.handleMenuAction(payload.action || payload.payload?.action);
      }
    } catch (e) {
      console.error("[OMEGA TS] Error handling message:", e);
    }
  };

  // preferences.ts
  var OMEGA_Preferences = class {
    constructor() {
      __publicField(this, "settings", []);
      __publicField(this, "currentCategory", "GENERAL");
      console.log("[Preferences TS] Initialized");
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
          this.currentCategory = htmlTab.innerText.toUpperCase();
          this.render();
        };
      });
    }
    async refresh() {
      try {
        if (window.juce && window.juce.getSystemSettings) {
          const data = await window.juce.getSystemSettings();
          this.settings = Array.isArray(data) ? data : [];
        }
      } catch (e) {
        console.error("[Preferences TS] Refresh failed:", e);
      }
    }
    render() {
      const container = document.getElementById("preferences-body");
      if (!container) return;
      container.innerHTML = "";
      const catSettings = this.settings.filter((s) => s.category === this.currentCategory);
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
                    ${sortedKeys.map(
            (val) => `<option value="${val}" ${Math.round(s.currentValue) == parseFloat(val) ? "selected" : ""}>${s.options[val]}</option>`
          ).join("")}
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
    async setSetting(id, value) {
      try {
        if (window.juce && window.juce.setSystemSetting) {
          await window.juce.setSystemSetting(id, value);
        }
      } catch (e) {
        console.error("[Preferences TS] Save failed:", e);
      }
    }
    async update(id, value) {
      const val = parseFloat(value);
      await this.setSetting(id, val);
      const s = this.settings.find((x) => x.id === id);
      if (s) s.currentValue = val;
    }
    async reset(id) {
      const s = this.settings.find((x) => x.id === id);
      if (s) {
        await this.update(id, s.defaultValue);
        this.render();
      }
    }
  };
  var Preferences = new OMEGA_Preferences();
  window.Preferences = Preferences;

  // service.ts
  var OMEGA_ServiceMode = class {
    constructor() {
      __publicField(this, "params", []);
      __publicField(this, "activeVoice", -1);
      console.log("[Service TS] Initialized");
    }
    async init() {
      try {
        await this.refreshParams();
      } catch (e) {
        console.error("[Service TS] Init failed:", e);
      }
      this.renderVoices();
    }
    async refreshParams() {
      const win = window;
      if (win.juce && win.juce.getCalibrationParams) {
        try {
          this.params = await win.juce.getCalibrationParams();
          this.renderParams();
        } catch (e) {
          console.error("[Service TS] getCalibrationParams failed:", e);
        }
      }
    }
    renderParams() {
      const container = document.getElementById("service-params-list");
      if (!container) return;
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
    updateParam(id, value) {
      const val = parseFloat(value);
      const p = this.params.find((x) => x.id === id);
      const display = document.getElementById(`val-${id}`);
      if (display && p) display.innerText = val.toFixed(2) + p.unit;
      const win = window;
      if (win.juce && win.juce.setCalibrationParam) {
        win.juce.setCalibrationParam(id, val);
      }
    }
    renderVoices() {
      const container = document.getElementById("voice-test-grid");
      if (!container) return;
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
    toggleVoiceTest(index) {
      const win = window;
      if (!win.juce) return;
      if (this.activeVoice === index) {
        this.activeVoice = -1;
        win.juce.serviceAction({ action: "stopVoiceTest" });
        document.querySelectorAll(".voice-test-btn").forEach((b) => b.classList.remove("active"));
      } else {
        this.activeVoice = index;
        win.juce.serviceAction({ action: "testVoice", voice: index });
        document.querySelectorAll(".voice-test-btn").forEach((b) => b.classList.remove("active"));
        const btn = document.getElementById(`btn-voice-${index}`);
        if (btn) btn.classList.add("active");
      }
    }
    serviceAction(action) {
      const win = window;
      if (win.juce) win.juce.serviceAction({ action });
    }
  };
  var ServiceMode = new OMEGA_ServiceMode();
  window.ServiceMode = ServiceMode;

  // components/PresetBrowser.ts
  var OMEGA_PresetBrowser = class {
    constructor() {
      __publicField(this, "data", { libraries: [] });
      __publicField(this, "selectedLibIdx", 0);
      __publicField(this, "selectedPresetIdx", -1);
      __publicField(this, "currentCategory", "All");
      __publicField(this, "searchQuery", "");
      console.log("[PresetBrowser] Initialized");
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
        if (el) el.onclick = fn;
      };
      attach("preset-saveas-btn", () => this.showSaveAsModal());
    }
    async refresh() {
      try {
        if (window.juce && window.juce.getBrowserData) {
          const response = await window.juce.getBrowserData();
          if (response) {
            this.data = response;
            this.render();
          }
        }
      } catch (e) {
        console.error("[PresetBrowser] Failed to refresh data:", e);
      }
    }
    render() {
      this.renderCategories();
      this.renderLibraries();
      this.renderPresets();
    }
    renderCategories() {
      const list = document.getElementById("cat-list");
      if (!list) return;
      const system = ["All", "Factory", "User", "Favorites"];
      const custom = this.data.categories || [];
      const seen = /* @__PURE__ */ new Set();
      list.innerHTML = "";
      [...system, ...custom].forEach((cat) => {
        if (seen.has(cat)) return;
        seen.add(cat);
        const li = document.createElement("li");
        li.innerText = cat;
        if (this.currentCategory === cat) li.classList.add("active");
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
      if (!list) return;
      list.innerHTML = "";
      this.data.libraries.forEach((lib, idx) => {
        let shouldShow = true;
        if (this.currentCategory === "Factory") shouldShow = lib.name.toUpperCase() === "FACTORY";
        else if (this.currentCategory === "User") shouldShow = lib.name.toUpperCase() === "USER" || lib.category === "User";
        else if (this.currentCategory === "Favorites") shouldShow = lib.patches.some((p) => p.favorite);
        else if (this.currentCategory !== "All") shouldShow = lib.category === this.currentCategory;
        if (!shouldShow) return;
        const li = document.createElement("li");
        li.innerHTML = `<span>${lib.name}</span>`;
        if (this.selectedLibIdx === idx) li.classList.add("active");
        li.onclick = () => this.selectLib(idx);
        list.appendChild(li);
      });
    }
    async selectLib(idx) {
      this.selectedLibIdx = idx;
      this.selectedPresetIdx = -1;
      if (window.juce && window.juce.selectLibrary) await window.juce.selectLibrary(idx);
      this.render();
    }
    renderPresets() {
      const list = document.getElementById("preset-list");
      if (!list) return;
      list.innerHTML = "";
      const lib = this.data.libraries[this.selectedLibIdx];
      if (!lib) return;
      lib.patches.forEach((p, idx) => {
        const matchesSearch = !this.searchQuery || p.name.toLowerCase().includes(this.searchQuery);
        if (!matchesSearch) return;
        const li = document.createElement("li");
        li.className = "preset-item";
        if (this.selectedPresetIdx === idx) li.classList.add("active");
        li.innerHTML = `<span class="preset-name">${p.name}</span>`;
        if (p.favorite) li.innerHTML += `<span class="preset-fav active">\u2605</span>`;
        li.onclick = () => this.selectPreset(idx);
        list.appendChild(li);
      });
    }
    async selectPreset(idx) {
      this.selectedPresetIdx = idx;
      if (window.juce && window.juce.loadLibraryPreset) {
        await window.juce.loadLibraryPreset(this.selectedLibIdx, idx);
      }
      this.renderPresets();
      this.updateInfoPane();
    }
    updateInfoPane() {
      const lib = this.data.libraries[this.selectedLibIdx];
      const p = lib?.patches[this.selectedPresetIdx];
      if (!p) return;
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
      };
      setVal("meta-name", p.name);
      setVal("meta-author", p.author || "");
      setVal("meta-tags", p.tags || "");
      setVal("meta-notes", p.notes || "");
    }
    showSaveAsModal() {
      const modal = document.getElementById("modal-saveas");
      if (modal) modal.style.display = "flex";
    }
  };
  var PresetBrowser = new OMEGA_PresetBrowser();
  window.PresetBrowser = PresetBrowser;

  // module_renderer.ts
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
    normalizeDescriptor(desc) {
      if (typeof desc.uiLayout === "string") {
        try {
          const parsed = JSON.parse(desc.uiLayout);
          return {
            ...desc,
            version: desc.version || parsed.version || "4.1.0",
            hp: desc.hp || parsed.hp || 0,
            uiLayout: parsed.uiLayout || { columns: parsed.columns || 2, rows: parsed.rows || 1, gap: parsed.gap || 12 },
            items: parsed.items || desc.items || []
          };
        } catch (e) {
          console.error("[ModuleRenderer] Failed to parse uiLayout JSON:", e);
        }
      }
      return desc;
    }
    async init() {
      const store2 = window.metadataStore;
      const meta = await store2.ensureLoaded();
      if (!meta) return;
      this.render();
      this.bind();
      this.isInitialized = true;
    }
    render() {
      const desc = this.descriptor;
      const classes = ["panel", desc.panelClass || "", "aseptic-panel"];
      const hpWidth = desc.hp ? desc.hp * 5.08 * 2.95 : 100;
      const widthStyle = `min-width: ${hpWidth}px; width: fit-content;`;
      this.content.innerHTML = `
            <div class="${classes.join(" ")}" style="${widthStyle}">
                <div class="module-grid" style="display:grid; grid-template-columns: repeat(${desc.uiLayout?.columns || 2}, 1fr); gap: ${desc.uiLayout?.gap || 12}px; padding: 30px 10px 10px 10px;">
                    ${desc.items.map((item) => this.renderItem(item)).join("")}
                </div>
            </div>
        `;
    }
    renderItem(item) {
      const id = item.paramId || item.source || item.portId;
      const param = item.paramId ? window.metadataStore.getParam(item.paramId) : null;
      const style = `grid-row: ${item.row + 1}; grid-column: ${item.col + 1}${item.colSpan ? ` / span ${item.colSpan}` : ""};`;
      const label = item.label || (param ? param.name : item.source || item.portId || "");
      let semantic = item.semantic;
      let look = item.look;
      if (!semantic && item.control) {
        switch (item.control) {
          case "knob":
            semantic = "scalar";
            look = "knob";
            break;
          case "slider-v":
            semantic = "scalar";
            look = "slider-v";
            break;
          case "toggle":
            semantic = "toggle";
            look = "button";
            break;
          case "select":
            semantic = "list";
            look = "select";
            break;
          case "stepper":
            semantic = "list";
            look = "display";
            break;
          case "telemetry":
            semantic = "telemetry";
            look = "meter";
            break;
          case "led":
            semantic = "telemetry";
            look = "led";
            break;
          case "port":
            semantic = "port";
            look = "jack";
            break;
        }
      }
      if (!semantic) return `<!-- Item missing semantic/control -->`;
      switch (semantic) {
        case "scalar":
          if (look === "knob") {
            return `
                        <div class="control-group variant-${item.variant || "default"}" style="${style}">
                            <label>${label}</label>
                            <div class="knob-ring" data-param="${param?.id || ""}">
                                <div class="knob"><div class="knob-marker white"></div></div>
                            </div>
                        </div>
                    `;
          }
          return `
                    <div class="control-group variant-${item.variant || "default"}" style="${style}">
                        <label>${label}</label>
                        <input type="range" class="${look === "slider-h" ? "h-slider" : "v-slider"}" data-param="${param?.id || ""}" min="${param?.min || 0}" max="${param?.max || 1}" step="${param?.step || "any"}" value="${param?.default || 0}" />
                    </div>
                `;
        case "list":
          if (look === "display") {
            return `
                        <div class="control-group variant-${item.variant || "default"}" style="${style}">
                            <label>${label}</label>
                            <div class="display-unit" data-param="${param?.id || ""}">
                                <button class="stepper-btn minus" data-dir="-1">\uFF0D</button>
                                <div class="display-screen">
                                    <span class="display-value">${param ? this._getParamValueLabel(param, this.values[param.id] || param.default || 0) : "---"}</span>
                                </div>
                                <button class="stepper-btn plus" data-dir="1">\uFF0B</button>
                            </div>
                        </div>
                    `;
          }
          return `
                    <div class="control-group variant-${item.variant || "default"}" style="${style}">
                        <label>${label}</label>
                        <select class="selector-control" data-param="${param?.id || ""}">
                            ${param?.options ? param.options.map((o) => `<option value="${o.value}">${o.label}</option>`).join("") : '<option value="0">DEFAULT</option>'}
                        </select>
                    </div>
                `;
        case "vector":
          if (look === "joystick") {
            return `
                        <div class="control-group variant-${item.variant || "default"}" style="${style}">
                            <label>${label}</label>
                            <div class="joystick-pad" data-param-x="${item.paramId || ""}" data-param-y="${item.paramIdY || ""}">
                                <div class="joystick-handle"></div>
                            </div>
                        </div>
                    `;
          }
          return `<!-- Unknown vector look: ${look} -->`;
        case "toggle":
        case "state":
          if (look === "switch") {
            return `
                        <div class="control-group variant-${item.variant || "default"}" style="${style}">
                            <label>${label}</label>
                            <div class="sw-unit" data-param="${param?.id || ""}">
                                <div class="sw-path"><div class="sw-peg"></div></div>
                            </div>
                        </div>
                    `;
          }
          return `
                    <div class="control-group variant-${item.variant || "default"}" style="${style}">
                        <label>${label}</label>
                        <button class="sq ${item.variant || item.color || "red"}" data-param="${param?.id || ""}"></button>
                    </div>
                `;
        case "port":
          return `<!-- Port ${label} hidden (Aseptic Standard) -->`;
        case "telemetry":
          if (look === "led") {
            const ledColor = item.color || "orange";
            const activeClass = this.descriptor.id === "debug_test" || this.descriptor.id === "debug" ? "active" : "";
            return `
                        <div class="control-group led-container variant-${item.variant || "default"}" style="${style}" data-source="${item.source || item.paramId || ""}">
                            <div class="led led-${ledColor} ${activeClass}"></div>
                            <label>${label}</label>
                        </div>
                    `;
          }
          return `
                        <div class="control-group telemetry-container variant-${item.variant || "default"}" style="${style}" data-source="${item.source || item.paramId || ""}">
                        <label>${label}</label>
                        <div class="telemetry-display">
                            <div class="telemetry-bar"></div>
                        </div>
                    </div>
                `;
        case "monitor":
          return `
                    <div class="control-group variant-${item.variant || "default"}" style="${style}">
                        <label>${label}</label>
                        <div class="monitor-scope" data-source="${item.source || ""}">
                            <canvas width="100" height="60"></canvas>
                        </div>
                    </div>
                `;
        case "graph":
          return `
                    <div class="control-group variant-${item.variant || "default"}" style="${style}">
                        <label>${label}</label>
                        <div class="graph-adsr" data-param-group="${item.paramGroup || ""}">
                            <svg viewBox="0 0 100 60"><path d="M0,60 L20,10 L40,30 L80,30 L100,60" fill="none" stroke="cyan" stroke-width="2"/></svg>
                        </div>
                    </div>
                `;
        case "keyboard":
          return `
                    <div class="control-group variant-${item.variant || "default"}" style="${style}">
                        <div class="virtual-keyboard">
                            <!-- Keyboard generated dynamically -->
                        </div>
                    </div>
                `;
        case "label":
          return `<div class="panel-label variant-${item.variant || "default"}" style="${style}">${label}</div>`;
        default:
          return `<!-- Unknown semantic: ${semantic} -->`;
      }
    }
    renderFooter() {
      return "";
    }
    bind() {
      this.descriptor.items.forEach((item) => {
        let semantic = item.semantic;
        let look = item.look;
        if (!semantic && item.control) {
          switch (item.control) {
            case "knob":
              semantic = "scalar";
              look = "knob";
              break;
            case "slider-v":
              semantic = "scalar";
              look = "slider-v";
              break;
            case "toggle":
              semantic = "toggle";
              look = "button";
              break;
            case "select":
              semantic = "list";
              look = "select";
              break;
            case "stepper":
              semantic = "list";
              look = "display";
              break;
            case "port":
              semantic = "port";
              look = "jack";
              break;
          }
        }
        const param = item.paramId ? window.metadataStore.getParam(item.paramId) : null;
        if (!param && !item.portId) return;
        if (semantic === "scalar") {
          if (look === "knob") {
            const ctrl = this.content.querySelector(`[data-param="${param.id}"].knob-ring`);
            if (ctrl) this._bindKnob(ctrl, param);
          } else {
            const input = this.content.querySelector(`input[data-param="${param.id}"]`);
            if (input) input.addEventListener("input", (e) => this.setParam(param.id, parseFloat(e.target.value)));
          }
        } else if (semantic === "list") {
          if (look === "display") {
            const ctrl = this.content.querySelector(`.display-unit[data-param="${param.id}"]`);
            if (ctrl) this._bindDisplay(ctrl, param);
          } else {
            const sel = this.content.querySelector(`select[data-param="${param.id}"]`);
            if (sel) sel.addEventListener("change", (e) => this.setParam(param.id, parseFloat(e.target.value)));
          }
        } else if (semantic === "toggle" || semantic === "state") {
          const trigger = this.content.querySelector(`[data-param="${param.id}"]`);
          if (trigger) {
            trigger.addEventListener("click", () => {
              const current = this.values[param.id] || param.default || 0;
              this.setParam(param.id, current > 0.5 ? 0 : 1);
            });
          }
        } else if (semantic === "port") {
          const jack = this.content.querySelector(`.port-container[data-port="${item.portId}"]`);
          if (jack) {
            jack.addEventListener("click", () => {
              window.omegaRPC.openPatchModal(this.descriptor.id, item.portId);
            });
          }
        }
      });
      const footerBtn = this.content.querySelector('button[data-role="status"]');
      if (footerBtn) {
        const paramId = footerBtn.dataset.param;
        footerBtn.addEventListener("click", () => {
          const param = window.metadataStore.getParam(paramId);
          const current = this.values[paramId] || (param ? param.default : 0);
          this.setParam(paramId, current > 0.5 ? 0 : 1);
        });
      }
    }
    _bindKnob(ctrl, param) {
      const knob = ctrl.querySelector(".knob");
      if (!knob) return;
      let isDragging = false;
      let startY = 0;
      let startVal = 0;
      knob.addEventListener("mousedown", (e) => {
        isDragging = true;
        startY = e.clientY;
        startVal = this.values[param.id] || param.default || 0;
        e.preventDefault();
      });
      const onMove = (e) => {
        if (!isDragging) return;
        const delta = (startY - e.clientY) / 150;
        let next = startVal + delta * (param.max - param.min);
        next = Math.max(param.min, Math.min(param.max, next));
        this.setParam(param.id, next);
      };
      const onUp = () => {
        isDragging = false;
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }
    setParam(id, value) {
      this.values[id] = value;
      window.omegaRPC.setParam(id, value);
      this.updateControlUI(id, value);
    }
    updateControlUI(id, value) {
      const param = window.metadataStore.getParam(id);
      if (!param) return;
      const input = this.content.querySelector(`input[data-param="${id}"]`);
      if (input) input.value = value.toString();
      const btn = this.content.querySelector(`button[data-param="${id}"], .sw-unit[data-param="${id}"]`);
      if (btn) btn.classList.toggle("active", value > 0.5);
      if (btn && btn.classList.contains("sw-unit")) btn.setAttribute("data-state", value > 0.5 ? "1" : "0");
      const sel = this.content.querySelector(`select[data-param="${id}"]`);
      if (sel) sel.value = value.toString();
      const knob = this.content.querySelector(`[data-param="${id}"].knob-ring`);
      if (knob) this._updateKnobVisual(knob, param, value);
      const display = this.content.querySelector(`.display-unit[data-param="${id}"] .display-value`);
      if (display) display.innerText = this._getParamValueLabel(param, value);
      const fBtn = this.content.querySelector(`button[data-param="${id}"][data-role="status"]`);
      if (fBtn) fBtn.innerText = value > 0.5 ? "ON" : "BYPASS";
    }
    _getParamValueLabel(param, value) {
      if (!param) return value.toString();
      if (param.options) {
        const opt = param.options.find((o) => o.value === value);
        if (opt) return opt.label;
      }
      if (param.id === "midi_channel" && value >= 0 && value <= 16) {
        return value === 0 ? "OMNI" : `CH ${Math.round(value)}`;
      }
      return value.toString();
    }
    _bindDisplay(ctrl, param) {
      const btns = ctrl.querySelectorAll(".stepper-btn");
      btns.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const dir = parseInt(e.target.dataset.dir || "0");
          const current = this.values[param.id] ?? param.default ?? 0;
          const opts = param.options;
          if (opts && opts.length > 0) {
            const currentIndex = opts.findIndex((o) => o.value === current);
            const nextIndex = Math.max(0, Math.min(opts.length - 1, currentIndex + dir));
            const selected = opts[nextIndex];
            if (selected) this.setParam(param.id, selected.value);
          } else {
            let next = current + dir;
            next = Math.max(param.min, Math.min(param.max, next));
            this.setParam(param.id, next);
          }
        });
      });
    }
    _updateKnobVisual(ctrl, param, value) {
      const marker = ctrl.querySelector(".knob-marker");
      if (!marker) return;
      const norm = (value - param.min) / (param.max - param.min || 1);
      const angle = -135 + norm * 270;
      marker.style.transform = `translateX(-50%) rotate(${angle}deg)`;
    }
    onStateUpdate(state) {
      if (!this.isInitialized) return;
      const params = state.parameters || {};
      this.descriptor.items.forEach((item) => {
        if (item.paramId && params[item.paramId] !== void 0) {
          this.values[item.paramId] = params[item.paramId];
          this.updateControlUI(item.paramId, params[item.paramId]);
        }
      });
      const telemetry = state.telemetry || {};
      this.descriptor.items.forEach((item) => {
        const source = item.source || item.paramId;
        if (!source) return;
        let val = telemetry[source];
        if (val === void 0 && source.startsWith("telemetry.")) {
          const subKey = source.split(".")[1];
          if (subKey) val = telemetry[subKey];
        }
        if (val !== void 0) {
          this.updateTelemetryUI(source, val);
        }
      });
      this.updatePortsUI(state);
    }
    updateTelemetryUI(source, value) {
      const el = this.content.querySelector(`[data-source="${source}"] .led, [data-source="${source}"] .led-indicator`);
      if (el) {
        const isActive = value > 0;
        el.classList.toggle("active", isActive);
        if (isActive) {
          setTimeout(() => el.classList.remove("active"), 50);
        }
      }
      const bar = this.content.querySelector(`[data-source="${source}"] .telemetry-bar`);
      if (bar) {
        bar.style.height = `${value * 100}%`;
      }
    }
    updatePortsUI(state) {
    }
  };

  // components/ModuleOscilloscope.ts
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
        if (!groups[groupName]) groups[groupName] = [];
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
      if (window.omegaRPC) {
        try {
          const resp = await window.omegaRPC.send("getModulationMetadata", {});
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
      if (isMaster) this.el.classList.add("master-view");
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
      if (!selA || !selB) return;
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
        if (standby) standby.style.display = this.isPowered ? "none" : "block";
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
      if (!modal) return;
      const selA = document.getElementById("scope-modal-src-a");
      const selB = document.getElementById("scope-modal-src-b");
      const timebaseRange = document.getElementById("scope-modal-timebase");
      const freezeBtn = document.getElementById("scope-modal-freeze");
      const okBtn = modal.querySelector(".modal-ok-btn");
      const closeBtn = modal.querySelector(".close-btn");
      if (selA) selA.onchange = () => {
        this.sourceA = parseInt(selA.value);
        this.updateSelectors();
      };
      if (selB) selB.onchange = () => {
        this.sourceB = parseInt(selB.value);
        this.isDual = this.sourceB !== -1;
        this.updateSelectors();
      };
      if (timebaseRange) timebaseRange.oninput = () => {
        this.modalTimebase = parseInt(timebaseRange.value) / 50;
        const valLabel = document.getElementById("scope-val-timebase");
        if (valLabel) valLabel.innerText = `${timebaseRange.value}ms`;
      };
      if (freezeBtn) freezeBtn.onclick = () => {
        this.isFrozen = !this.isFrozen;
        freezeBtn.classList.toggle("active", this.isFrozen);
        const miniFreeze = this.content.querySelector("#osc-freeze");
        if (miniFreeze) miniFreeze.classList.toggle("active", this.isFrozen);
      };
      const close = () => {
        modal.style.display = "none";
        this.modalActive = false;
      };
      if (okBtn) okBtn.onclick = close;
      if (closeBtn) closeBtn.onclick = close;
    }
    openModal() {
      const modal = document.getElementById("oscilloscope-modal");
      if (!modal) return;
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
      if (modSelA) modSelA.value = this.sourceA.toString();
      if (modSelB) modSelB.value = this.sourceB.toString();
      if (modFreeze) modFreeze.classList.toggle("active", this.isFrozen);
    }
    startPolling() {
      this.pollingInterval = setInterval(async () => {
        if (!this.isPowered || this.isFrozen) return;
        if (window.omegaRPC) {
          const indices = [this.sourceA];
          if (this.isDual) indices.push(this.sourceB);
          try {
            const data = await window.omegaRPC.send("getTelemetry", { indices });
            if (data) {
              if (data[this.sourceA.toString()]) this.dataA = data[this.sourceA.toString()].history || [];
              if (this.isDual && data[this.sourceB.toString()]) this.dataB = data[this.sourceB.toString()].history || [];
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
      if (width === 0 || height === 0) return;
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
      if (!data || data.length < 2) return;
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
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
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
      if (this.resizeObserver) this.resizeObserver.disconnect();
      if (this.pollingInterval) clearInterval(this.pollingInterval);
      if (this.animationId) cancelAnimationFrame(this.animationId);
    }
  };
  if (typeof window !== "undefined") window.ModuleOscilloscope = ModuleOscilloscope;

  // components/ModuleMidiTrigger.ts
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
        if (window.omegaRPC) {
          window.omegaRPC.sendMidi(status, midiNote, velocity);
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
  if (typeof window !== "undefined") window.ModuleMidiTrigger = ModuleMidiTrigger;

  // components/ModuleMidiViewer.ts
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
      if (!sel) return;
      let html = '<option value="64">GLOBAL TRAFFIC</option>';
      const groups = {};
      for (const s of this.sources) {
        if (s.telemetryIndex === 64) continue;
        const g = s.instance || "Modules";
        if (!groups[g]) groups[g] = [];
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
          if (!this.isPowered) this.addLogLine({ ts: Date.now() / 1e3, type: 0, ch: 0, d1: 0, d2: 0 }, "MONITOR PAUSED");
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
        if (!this.isPowered) return;
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
      if (this.pollingInterval) clearInterval(this.pollingInterval);
    }
  };
  if (typeof window !== "undefined") window.ModuleMidiViewer = ModuleMidiViewer;

  // components/ModulePatchbayMatrix.ts
  var ModulePatchbayMatrix = class {
    // [Hyper-ACE] Dynamic limit
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
      this.options = options;
      this.loadMetadata();
      this.syncMaxSlots();
      this.setupSelectionListeners();
    }
    ensureElements() {
      if (this.el) return true;
      this.el = document.getElementById("modulation-modal");
      this.content = document.getElementById("modulation-workspace");
      return !!(this.el && this.content);
    }
    async syncMaxSlots() {
      if (window.omegaRPC) {
        try {
          const settings = await window.omegaRPC.getSystemSettings();
          if (!Array.isArray(settings)) return;
          const maxSlotsSetting = settings.find((s) => s.id === "maxPatchbaySlots");
          if (maxSlotsSetting) {
            const newValue = Math.floor(maxSlotsSetting.currentValue || 32);
            if (this.maxSlots !== newValue) {
              console.log(`[PatchbayMatrix] Max Slots updated: ${this.maxSlots} -> ${newValue}`);
              this.maxSlots = newValue;
              if (this.isWorkspaceOpen()) {
                this.renderWorkspace();
              }
            } else {
              console.log(`[PatchbayMatrix] Max Slots verified: ${this.maxSlots}`);
            }
          }
        } catch (e) {
          console.warn("[PatchbayMatrix] Failed to sync maxPatchbaySlots:", e);
        }
      }
    }
    async loadMetadata() {
      if (window.omegaRPC) {
        try {
          const resp = await window.omegaRPC.send("getModulationMetadata", {});
          if (resp && (resp.sources || resp.targets)) {
            this.sources = resp.sources || [];
            this.targets = resp.targets || [];
            console.log("[PatchbayMatrix] Metadata loaded:", this.sources.length, "sources,", this.targets.length, "targets");
            if (this.isWorkspaceOpen()) {
              this.renderWorkspace();
            }
          }
        } catch (e) {
          console.error("[ModMatrix] Failed to load modulation metadata:", e);
        }
      }
    }
    toggleWorkspace(open) {
      if (!this.ensureElements()) return;
      const modal = this.el;
      modal.style.display = open ? "flex" : "none";
      if (open) {
        this.syncMaxSlots();
        this.renderWorkspace();
      }
    }
    isWorkspaceOpen() {
      if (!this.ensureElements()) return false;
      return this.el.style.display === "flex";
    }
    onStateUpdate(state) {
      this.state = state;
      const matrix = state?.preset?.patchbayMatrix || [];
      const activeCount = matrix.filter((s) => s.active).length;
      const countEl = document.getElementById("matrix-active-count");
      if (countEl) countEl.innerText = activeCount.toString().padStart(2, "0");
      this.triggerActivity("general");
      if (this.isWorkspaceOpen()) {
        this.renderWorkspace();
      }
    }
    triggerActivity(type) {
      const led = document.getElementById("matrix-activity-led");
      if (!led) return;
      if (type === "manual") {
        led.classList.remove("activity-general");
        led.classList.add("activity-manual");
        if (this.manualChangeTimer) clearTimeout(this.manualChangeTimer);
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
      if (!this.ensureElements()) return;
      const grid = document.getElementById("matrix-grid-container");
      const inspector = document.getElementById("matrix-inspector-container");
      if (!grid || !inspector) return;
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
          this.renderWorkspace();
        });
        document.getElementById("btn-view-overview")?.addEventListener("click", () => {
          this.viewMode = "overview";
          this.renderWorkspace();
        });
      }
      const matrixData = this.state?.preset?.patchbayMatrix || [];
      const matrix = Array.isArray(matrixData) ? matrixData : typeof matrixData === "object" ? Object.values(matrixData) : [];
      const seenRoutings = /* @__PURE__ */ new Set();
      const duplicates = /* @__PURE__ */ new Set();
      matrix.forEach((s, i) => {
        if (s.active && s.source && s.target) {
          const key = `${s.source}->${s.target}`;
          if (seenRoutings.has(key)) duplicates.add(i);
          else seenRoutings.add(key);
        }
      });
      let gridHtml = "";
      if (this.viewMode === "compose") {
        const activeSlots = matrix.map((s, i) => ({ ...s, i })).filter((s) => s.active || s.source !== "" && s.source !== void 0);
        for (const slot of activeSlots) {
          gridHtml += this.renderCard(slot, slot.i, duplicates.has(slot.i));
        }
        if (activeSlots.length < this.maxSlots) {
          gridHtml += `
                    <div class="matrix-card add-card" id="btn-add-modulation">
                        <div class="add-icon">\uFF0B</div>
                        <div class="card-label" style="text-align:center">ADD MODULATION</div>
                    </div>
                `;
        }
        if (activeSlots.length === 0 && this.sources.length === 0 && !this.state?.preset?.auxiliary) {
          gridHtml = `
                    <div class="empty-state-info">
                        <div class="info-title">MODULAR RACK EMPTY</div>
                        <p>The synthesizer rack is currently empty. Use the <b>Edit > Add Module</b> menu to begin building your signal path.</p>
                        <div class="matrix-card add-card" id="btn-add-module-shortcut" style="width:200px; margin: 20px auto;">
                            <div class="add-icon">\uFF0B</div>
                            <div class="card-label">ADD MODULE</div>
                        </div>
                    </div>
                `;
        }
      } else {
        for (let i = 0; i < this.maxSlots; i++) {
          const slot = matrix[i] || { active: false, source: "", target: "", amount: 0, via: "", viaAmount: 0 };
          gridHtml += this.renderCard(slot, i, duplicates.has(i));
        }
      }
      grid.innerHTML = gridHtml;
      this.renderInspector();
      this.attachWorkspaceListeners();
      document.getElementById("btn-add-modulation")?.addEventListener("click", () => this.addModulation());
    }
    renderCard(slot, i, isDuplicate) {
      const isSelected = this.selectedSlot === i;
      const amountColor = this.getAmountColor(slot.amount);
      return `
            <div class="matrix-card ${slot.active ? "active" : ""} ${isSelected ? "selected" : ""} ${isDuplicate ? "duplicate-error" : ""}" data-index="${i}">
                <div class="card-header">
                    <span class="card-index">${(i + 1).toString().padStart(2, "0")}</span>
                    <div class="card-status ${slot.active ? "active" : ""}"></div>
                    ${isDuplicate ? '<div class="error-badge">DUP</div>' : ""}
                </div>
                <div class="card-routing">
                    <div class="card-label">${this.getNameForId(this.sources, slot.source) || "EMPTY"}</div>
                    <div class="card-arrow">\u2193</div>
                    <div class="card-label">${this.getNameForId(this.targets, slot.target) || "---"}</div>
                </div>
                <div class="bipolar-container">
                    <div class="bipolar-slider-bg">
                        <div class="bipolar-slider-fill gain-mode" style="width: ${Math.min(slot.amount, 2) * 50}%; background-color: ${amountColor}"></div>
                    </div>
                    <div class="bipolar-value" style="color: ${amountColor}">${slot.amount.toFixed(2)}x</div>
                </div>
                ${slot.via ? `<div class="card-label-tiny" style="font-size:7px; color:#555; margin-top:2px;">VIA: ${this.getNameForId(this.sources, slot.via)}</div>` : ""}
            </div>
        `;
    }
    getAmountColor(val) {
      if (val <= 0.01) return "#ffffff";
      if (val <= 1) {
        const factor = val;
        const r = Math.round(255 - factor * 255);
        const g = Math.round(255 - factor * 13);
        const b = 255;
        return `rgb(${r},${g},${b})`;
      } else {
        const factor = Math.min(val - 1, 1);
        const r = Math.round(0 + factor * 255);
        const g = Math.round(242 - factor * 85);
        const b = Math.round(255 - factor * 255);
        return `rgb(${r},${g},${b})`;
      }
    }
    addModulation() {
      const matrix = this.state?.preset?.patchbayMatrix || [];
      let targetSlot = matrix.findIndex(
        (s, idx) => idx < this.maxSlots && !s.active && (s.source === "" || s.source === void 0)
      );
      if (targetSlot === -1 && matrix.length < this.maxSlots) {
        targetSlot = matrix.length;
      }
      if (targetSlot !== -1 && targetSlot < this.maxSlots) {
        this.selectedSlot = targetSlot;
        this.renderWorkspace();
        setTimeout(() => {
          const sourceSelect = document.querySelector('select[data-key="source"]');
          if (sourceSelect) sourceSelect.focus();
        }, 100);
      } else {
        alert(`Patchbay Matrix is FULL (${matrix.length}/${this.maxSlots}). Please remove a slot first.`);
      }
    }
    renderInspector() {
      const container = document.getElementById("matrix-inspector-container");
      if (!container) return;
      const matrixData = this.state?.preset?.patchbayMatrix || [];
      const matrix = Array.isArray(matrixData) ? matrixData : typeof matrixData === "object" ? Object.values(matrixData) : [];
      const slotIndex = isNaN(this.selectedSlot) ? 0 : this.selectedSlot;
      const slot = matrix[slotIndex] || { active: false, source: "", target: "", amount: 0, via: "", viaAmount: 0 };
      let sourceInstance = "";
      let targetInstance = "";
      if (slot.source) sourceInstance = slot.source.split(".")[0];
      if (slot.target) targetInstance = slot.target.split(".")[0];
      container.innerHTML = `
            <div class="inspector-title">SLOT ${(slotIndex + 1).toString().padStart(2, "0")} DETAILS</div>
            
            ${this.sources.length === 0 ? `
                <div class="metadata-warning">
                    \u26A0\uFE0F NO ROUTING NODES FOUND<br>
                    <span style="font-size:9px; opacity:0.6; text-transform:none;">Add oscillators, filters or envelopes to populate sources and targets.</span>
                </div>
            ` : ""}
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
      if (!document.getElementById("matrix-inspector-style")) {
        const style = document.createElement("style");
        style.id = "matrix-inspector-style";
        style.innerHTML = `
                .inspector-select {
                    width: 100%;
                    background: #111;
                    color: var(--neon-cyan);
                    border: 1px solid #333;
                    padding: 8px;
                    font-size: 11px;
                    border-radius: 4px;
                }
                .inspector-range {
                    width: 100%;
                    accent-color: var(--neon-cyan);
                }
            `;
        document.head.appendChild(style);
      }
      this.attachInspectorListeners();
    }
    getBipolarStyle(val) {
      const width = Math.abs(val) * 50;
      const left = val >= 0 ? 50 : 50 - width;
      return `left: ${left}%; width: ${width}%;`;
    }
    getNameForId(list, id) {
      const item = list.find((s) => s.id === id);
      return item ? item.name : "";
    }
    generateOptions(list, current, excludeInstance) {
      let html = '<option value="">- NONE -</option>';
      const groups = {};
      for (const opt of list) {
        const groupName = opt.instance || "Global";
        if (excludeInstance && groupName === excludeInstance) continue;
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(opt);
      }
      for (const [group, items] of Object.entries(groups)) {
        html += `<optgroup label="${group.toUpperCase()}">`;
        for (const item of items) {
          const displayName = item.name.replace(group, "").trim() || item.name;
          html += `<option value="${item.id}" ${item.id === current ? "selected" : ""}>${displayName}</option>`;
        }
        html += `</optgroup>`;
      }
      return html;
    }
    setupSelectionListeners() {
      document.addEventListener("click", (e) => {
        const card = e.target.closest(".matrix-card");
        if (card) {
          this.selectedSlot = parseInt(card.dataset.index);
          this.renderWorkspace();
        }
      });
    }
    attachWorkspaceListeners() {
      const cards = document.querySelectorAll(".matrix-card");
      cards.forEach((card) => {
        const sliderArea = card.querySelector(".bipolar-slider-bg");
        if (sliderArea) {
          let isDragging = false;
          sliderArea.addEventListener("mousedown", (e) => {
            isDragging = true;
            this.updateFromMouse(e, sliderArea, card);
          });
          window.addEventListener("mousemove", (e) => {
            if (isDragging) this.updateFromMouse(e, sliderArea, card);
          });
          window.addEventListener("mouseup", () => isDragging = false);
        }
      });
    }
    updateFromMouse(e, area, card) {
      const rect = area.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const val = percent * 2;
      const slotIdx = parseInt(card.dataset.index || "0");
      this.triggerActivity("manual");
      this.sendUpdate(slotIdx, "amount", val);
    }
    attachInspectorListeners() {
      const container = document.getElementById("matrix-inspector-container");
      if (!container) return;
      container.querySelectorAll("select, input").forEach((ctrl) => {
        const eventType = ctrl.tagName === "SELECT" ? "change" : "input";
        ctrl.addEventListener(eventType, (e) => {
          const key = e.target.dataset.key;
          const value = e.target.type === "range" ? parseFloat(e.target.value) : e.target.value;
          this.triggerActivity("manual");
          this.sendUpdate(this.selectedSlot, key, value);
        });
      });
      const clearBtn = document.getElementById("btn-clear-slot");
      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          this.sendUpdate(this.selectedSlot, "source", "");
          this.sendUpdate(this.selectedSlot, "target", "");
          this.sendUpdate(this.selectedSlot, "amount", 0);
          this.triggerActivity("manual");
        });
      }
    }
    sendUpdate(slot, key, value) {
      if (window.omegaRPC) {
        window.omegaRPC.call("updatePatchbayMatrixSlot", { slot, key, value });
      }
    }
  };
  window.ModulePatchbayMatrix = ModulePatchbayMatrix;

  // logic/era5/Era5ManifestParser.ts
  var Era5ManifestParser = class {
    /**
     * Parses the raw YAML-derived JSON manifest into a Tab-based hierarchy.
     */
    static parse(manifest) {
      const tabsMap = /* @__PURE__ */ new Map();
      const entities = manifest.registry || [];
      entities.forEach((entity) => {
        const pres = entity.presentation || {};
        const tabName = (pres.tab || "GENERAL").toUpperCase();
        const groupName = (pres.group || "UNGROUPED").toUpperCase();
        if (!tabsMap.has(tabName)) {
          tabsMap.set(tabName, /* @__PURE__ */ new Map());
        }
        const tabGroups = tabsMap.get(tabName);
        if (!tabGroups.has(groupName)) {
          tabGroups.set(groupName, []);
        }
        tabGroups.get(groupName).push(this.normalizeEntity(entity));
      });
      return Array.from(tabsMap.entries()).map(([tabId, groupsMap]) => {
        groupsMap.forEach((list) => {
          list.sort((a, b) => a.presentation.order - b.presentation.order);
        });
        return {
          id: tabId,
          groups: groupsMap
        };
      }).sort((a, b) => {
        if (a.id === "GENERAL") return -1;
        if (b.id === "GENERAL") return 1;
        return a.id.localeCompare(b.id);
      });
    }
    static normalizeEntity(raw) {
      return {
        id: raw.id,
        label: raw.label || raw.id.toUpperCase(),
        roles: raw.roles || ["control"],
        direction: raw.direction || "input",
        precision: raw.precision ?? 2,
        range: raw.range,
        options: raw.options,
        presentation: {
          tab: (raw.presentation?.tab || "GENERAL").toUpperCase(),
          group: (raw.presentation?.group || "UNGROUPED").toUpperCase(),
          order: raw.presentation?.order || 99,
          control: raw.presentation?.control || "knob"
        },
        attachments: raw.attachments || []
      };
    }
  };

  // components/ModulePatchModal.ts
  var ModulePatchModal = class {
    constructor() {
      __publicField(this, "el", null);
      __publicField(this, "tabsContainer", null);
      __publicField(this, "viewport", null);
      __publicField(this, "currentInstanceId", "");
      __publicField(this, "activeTab", "GENERAL");
      console.log("[ModulePatchModal] Initializing Unified Era 5.2 UI...");
      this.init();
    }
    init() {
      this.el = document.getElementById("module-patch-modal");
      this.tabsContainer = document.getElementById("patch-tabs-container");
      this.viewport = document.getElementById("patch-tab-viewport");
      this.el?.addEventListener("click", (e) => {
        if (e.target === this.el) this.close();
      });
      this.tabsContainer?.addEventListener("click", (e) => {
        const btn = e.target.closest(".era5-tab-btn");
        if (btn) {
          const tabId = btn.getAttribute("data-tab");
          if (tabId) this.switchTab(tabId);
        }
      });
    }
    async open(instanceId, manifest) {
      if (!this.el) return;
      this.currentInstanceId = instanceId;
      this.el.style.display = "flex";
      const parsedTabs = Era5ManifestParser.parse(manifest);
      this.renderTabs(parsedTabs);
      const defaultTab = parsedTabs.find((t) => t.id === "GENERAL") ? "GENERAL" : parsedTabs[0]?.id || "GENERAL";
      this.switchTab(defaultTab, parsedTabs);
    }
    close() {
      if (this.el) this.el.style.display = "none";
    }
    renderTabs(tabs) {
      if (!this.tabsContainer) return;
      this.tabsContainer.innerHTML = "";
      tabs.forEach((tab) => {
        const btn = document.createElement("button");
        btn.className = "era5-tab-btn";
        btn.innerText = tab.id.toUpperCase();
        btn.setAttribute("data-tab", tab.id);
        this.tabsContainer.appendChild(btn);
      });
      const patchBtn = document.createElement("button");
      patchBtn.className = "era5-tab-btn sanctuary";
      patchBtn.innerText = "PATCHING";
      patchBtn.setAttribute("data-tab", "PATCHING");
      this.tabsContainer.appendChild(patchBtn);
    }
    switchTab(tabId, predefinedTabs) {
      this.activeTab = tabId;
      this.tabsContainer?.querySelectorAll(".era5-tab-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
      });
      if (tabId === "PATCHING") {
        this.renderPatchingSanctuary();
      } else {
        if (predefinedTabs) {
          const tabData = predefinedTabs.find((t) => t.id === tabId);
          if (tabData) this.renderGroups(tabData);
        }
      }
    }
    renderGroups(tab) {
      if (!this.viewport) return;
      this.viewport.innerHTML = "";
      tab.groups.forEach((entities, groupName) => {
        const groupEl = document.createElement("div");
        groupEl.className = "era5-group-container";
        const title = document.createElement("div");
        title.className = "era5-group-title";
        title.innerText = groupName.toUpperCase();
        groupEl.appendChild(title);
        const grid = document.createElement("div");
        grid.className = "era5-entities-grid";
        entities.forEach((entity) => {
          grid.appendChild(this.buildControlCell(entity));
        });
        groupEl.appendChild(grid);
        this.viewport.appendChild(groupEl);
      });
    }
    /**
     * ERA 5.2 STANDARD: Control Cell Generator
     */
    buildControlCell(entity) {
      const cell = document.createElement("div");
      cell.className = "control-cell";
      cell.id = `cell-${this.currentInstanceId}-${entity.id}`;
      entity.attachments?.forEach((att) => {
        const attEl = document.createElement("div");
        attEl.className = `control-cell-attachment attachment-${att.type}`;
        attEl.innerText = "\u25CF";
        cell.appendChild(attEl);
      });
      const comp = document.createElement("div");
      comp.className = `entity-control control-${entity.presentation.control}`;
      comp.innerHTML = `<div class="knob-placeholder"></div>`;
      cell.appendChild(comp);
      const label = document.createElement("div");
      label.className = "control-cell-label";
      label.innerText = entity.label;
      cell.appendChild(label);
      const disp = document.createElement("div");
      disp.className = "control-cell-display";
      disp.innerText = entity.range?.default?.toString() || "0";
      cell.appendChild(disp);
      return cell;
    }
    renderPatchingSanctuary() {
      const viewport = this.viewport;
      if (!viewport) return;
      viewport.innerHTML = `
            <div class="era5-group-container aseptic-panel">
                <div class="era5-group-title">PATCHING SANCTUARY</div>
                <div class="patch-bay-layout" style="display: flex; gap: 40px;">
                    <div class="patch-column" style="flex: 1;">
                        <h3 class="patch-section-title" style="font-size: 10px; color: var(--neon-cyan); letter-spacing: 2px;">INPUTS / TARGETS</h3>
                        <div id="era5-patch-inputs" class="patch-list">
                            <div class="patch-empty-msg" style="font-size: 9px; color: #444; margin-top: 10px;">SCANNING PORTS...</div>
                        </div>
                    </div>
                    <div class="patch-column" style="flex: 1;">
                        <h3 class="patch-section-title" style="font-size: 10px; color: var(--signal-audio); letter-spacing: 2px;">OUTPUTS / SOURCES</h3>
                        <div id="era5-patch-outputs" class="patch-list">
                            <div class="patch-empty-msg" style="font-size: 9px; color: #444; margin-top: 10px;">SCANNING PORTS...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    onStateUpdate(state) {
    }
  };

  // components/ModuleMidiToCv.ts
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
      this.content.innerHTML = `
            <div class="mcv-container">
                <div class="mcv-led-section">
                    <div id="mcv-activity-led" class="mcv-led"></div>
                    <label class="label-tiny">MIDI ACTIVITY</label>
                </div>

                <div class="mcv-io-row">
                    <div class="mcv-port-box">
                        <div class="port-dot port-midi-in"></div>
                        <label class="label-tiny">IN</label>
                    </div>
                </div>

                <div class="mcv-control-section">
                    <div class="mcv-channel-row">
                        <label class="label-tiny">CH SELECT</label>
                        <select id="mcv-channel-select" class="mcv-select">
                            <option value="0">OMNI</option>
                            ${Array.from({ length: 16 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("")}
                        </select>
                    </div>
                </div>

                <div class="mcv-strip">
                    <div class="mcv-port-box">
                        <div class="port-dot port-cv-out"></div>
                        <label class="label-tiny">P</label>
                    </div>
                    <div class="mcv-port-box">
                        <div class="port-dot port-cv-out"></div>
                        <label class="label-tiny">G</label>
                    </div>
                    <div class="mcv-port-box">
                        <div class="port-dot port-cv-out"></div>
                        <label class="label-tiny">V</label>
                    </div>
                </div>
            </div>
        `;
      const select = this.content.querySelector("#mcv-channel-select");
      if (select) {
        select.addEventListener("change", () => {
          const val = parseInt(select.value);
          const paramId = `${this.options.instanceId || "mcv.1"}.midiChannel`;
          if (window.omegaRPC) {
            window.omegaRPC.send("setParam", { id: paramId, value: val });
          }
        });
      }
    }
    onStateUpdate(state) {
      if (!state) return;
      const led = this.content.querySelector("#mcv-activity-led");
      if (led) {
        const activityValue = state.telemetry?.[`mcv.${this.options.instanceId || "mcv.1"}.activity`];
        if (activityValue > 0.1) {
          led.classList.add("pulse");
          setTimeout(() => led.classList.remove("pulse"), 80);
        }
      }
      const paramId = `${this.options.instanceId || "mcv.1"}.midiChannel`;
      const paramValue = state.params?.[paramId];
      if (paramValue !== void 0) {
        const select = this.content.querySelector("#mcv-channel-select");
        if (select && select.value !== paramValue.toString()) {
          select.value = paramValue.toString();
        }
      }
    }
    addStyles() {
      if (document.getElementById("mcv-module-styles")) return;
      const style = document.createElement("style");
      style.id = "mcv-module-styles";
      style.innerHTML = `
            .mcv-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                height: 100%;
                padding: 10px;
                background: linear-gradient(180deg, #151515 0%, #0a0a0a 100%);
            }
            .mcv-led-section {
                text-align: center;
                margin-bottom: 5px;
            }
            .mcv-led {
                width: 14px;
                height: 14px;
                background: #202;
                border: 2px solid #404;
                border-radius: 50%;
                margin: 0 auto 3px;
                transition: all 0.1s;
            }
            .mcv-led.pulse {
                background: #f0f;
                box-shadow: 0 0 10px #f0f;
            }
            .mcv-io-row {
                margin: 5px 0;
            }
            .mcv-strip {
                display: flex;
                justify-content: space-around;
                width: 100%;
                background: #111;
                border-radius: 4px;
                padding: 4px 0;
                border: 1px solid #222;
            }
            .port-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                margin-bottom: 2px;
            }
            .port-midi-in { background: #808; border: 2px solid #a0a; }
            .port-cv-out { background: #088; border: 2px solid #0aa; }
            
            .mcv-select {
                background: #000;
                color: #0ff;
                border: 1px solid #088;
                font-family: 'Inter', sans-serif;
                font-size: 10px;
                padding: 2px;
                border-radius: 3px;
                width: 60px;
                outline: none;
            }
            .mcv-port-box {
                display: flex;
                flex-direction: column;
                align-items: center;
                min-width: 25px;
            }
        `;
      document.head.appendChild(style);
    }
  };
  if (typeof window !== "undefined") {
    window.ModuleMidiToCv = ModuleMidiToCv;
  }

  // components/ModuleBrowser.ts
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
      if (this.el) return true;
      this.el = document.getElementById("module-browser-modal");
      this.grid = document.getElementById("module-registry-grid");
      this.categories = document.getElementById("module-category-list");
      this.detail = document.getElementById("module-detail-panel");
      this.searchInput = document.getElementById("module-search");
      return !!(this.el && this.grid && this.categories && this.detail && this.searchInput);
    }
    async open() {
      if (!this.ensureElements()) return;
      this.el.style.display = "flex";
      await this.fetchCatalog();
      this.render();
    }
    async fetchCatalog() {
      if (window.omegaRPC) {
        try {
          const resp = await window.omegaRPC.send("listCatalog", {});
          if (resp && resp.components) {
            this.catalog = resp.components;
            window.omegaCatalog = Object.fromEntries(
              resp.components.map((c) => [c.id, c])
            );
          }
        } catch (e) {
          console.error("[ModuleBrowser] Failed to fetch catalog:", e);
        }
      }
    }
    render() {
      this.renderCategories();
      this.renderGrid();
      this.renderDetail();
    }
    renderCategories() {
      if (!this.categories) return;
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
      if (!this.grid) return;
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
      if (!this.detail) return;
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
        if (!this.ensureElements()) return;
        this.searchInput?.addEventListener("input", (e) => {
          this.currentSearch = e.target.value;
          this.renderGrid();
        });
      }, 500);
    }
    async addModule(componentId) {
      if (window.omegaRPC) {
        try {
          const resp = await window.omegaRPC.send("addModule", { componentId });
          if (resp && !resp.error) {
            this.el.style.display = "none";
            console.log("[ModuleBrowser] Module added successfully:", componentId);
          } else {
            alert("Failed to add module: " + (resp.error || "Unknown error"));
          }
        } catch (e) {
          console.error("[ModuleBrowser] RPC Error adding module:", e);
        }
      }
    }
  };
  window.ModuleBrowser = ModuleBrowser;

  // index.ts
  var store = new MetadataStore();
  window.omegaRPC = rpc;
  window.metadataStore = store;
  window.moduleManager = new ModuleManager();
  window.Preferences = Preferences;
  window.ServiceMode = ServiceMode;
  window.ModuleRenderer = ModuleRenderer;
  window.ModuleOscilloscope = ModuleOscilloscope;
  window.ModuleMidiTrigger = ModuleMidiTrigger;
  window.ModuleMidiViewer = ModuleMidiViewer;
  window.ModulePatchbayMatrix = ModulePatchbayMatrix;
  window.ModuleMidiToCv = ModuleMidiToCv;
  window.ModuleBrowser = ModuleBrowser;
  document.addEventListener("DOMContentLoaded", async () => {
    console.log("[OMEGA] Booting Synth UI...");
    setupJuceShim();
    try {
      console.log("[OMEGA] Loading Metadata...");
      await Promise.race([
        store.ensureLoaded(),
        new Promise((resolve) => setTimeout(resolve, 3e3))
      ]);
      await store.getModulationMetadata();
    } catch (e) {
      console.error("[OMEGA] Metadata load failed, continuing:", e);
    }
    console.log("[OMEGA] Initializing Components...");
    try {
      await Preferences.init();
      await PresetBrowser.init();
      const matrixHub = new ModulePatchbayMatrix();
      window.patchbayHub = matrixHub;
      const matrixBtn = document.getElementById("btn-global-matrix");
      if (matrixBtn) matrixBtn.onclick = () => matrixHub.toggleWorkspace(true);
      const matrixMenuLink = document.getElementById("menu-matrix");
      if (matrixMenuLink) matrixMenuLink.onclick = () => matrixHub.toggleWorkspace(true);
      const moduleBrowser = new ModuleBrowser();
      window.moduleBrowser = moduleBrowser;
      const addModuleMenuLink = document.getElementById("menu-add-module");
      if (addModuleMenuLink) addModuleMenuLink.onclick = () => window.moduleBrowser.open();
      const configModal = new ModulePatchModal();
      window.modulePatchModal = configModal;
      document.addEventListener("patch-request", async (e) => {
        const { instanceId } = e.detail;
        const manifest = store.getInventoryItem(instanceId);
        console.log(`[Dispatcher] Opening Alpha Config for: ${instanceId}`);
        await configModal.open(instanceId, manifest);
      });
      const inventory = store.getInventory();
      if (inventory.length > 0 && inventory[0].id === "midi_2_cv") {
        console.log("[OMEGA] Certified Mock Found, triggering render...");
        setTimeout(() => {
          document.dispatchEvent(new CustomEvent("omega:moduleAdded", {
            detail: { instanceId: inventory[0].instanceId }
          }));
        }, 100);
      }
    } catch (e) {
      console.error("[OMEGA] Component init failed:", e);
    }
    console.log("[OMEGA] Calling app.init()...");
    app.init();
    window.addEventListener("omega:stateUpdate", (e) => {
      if (window.patchbayHub) window.patchbayHub.onStateUpdate(e.detail);
      if (window.modulePatchModal) window.modulePatchModal.onStateUpdate(e.detail);
    });
  });
})();
