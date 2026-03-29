/**
 * OMEGA Module Manager
 * Handles dynamic instantiation of Eurorack modules.
 */
class ModuleManager {
    constructor() {
        this.activeModules = new Map();
        this.oscilloscopes = []; // Special list for telemetry
        this.midiViewer = null;
    }

    async updateRack(state) {
        this.lastState = state;
        
        const upper = document.getElementById('upper-rack');
        const lower = document.getElementById('lower-rack');
        if (upper) upper.innerHTML = '';
        if (lower) lower.innerHTML = '';
        
        this.activeModules.clear();
        this.oscilloscopes = [];
        this.midiViewer = null;
        
        // 1. Auxiliary (Direct from Preset)
        let aux = state.preset?.auxiliary || [];
        
        aux.forEach(item => {
            const rawType = (item.type || item.componentId || item.COMPONENTID || item.TYPE || item.componentid || "").toLowerCase();
            const id = item.id || item.slotName || item.SLOTNAME || item.ID || "AUX";
            const label = item.label || item.name || item.NAME || item.slotName || item.SLOTNAME || id;
            
            // Rack Selection
            let targetRack = upper;
            let rackType = "aux";
            const rackValue = item.rack || (item.params && item.params.rack);
            
            if (rackValue === "lower" || rackValue === 1 || rackValue === "main") {
                targetRack = lower;
                rackType = "main";
            }

            if (rawType.includes("trig")) {
                this.addModule(id, "ModuleMidiTrigger", rackType, targetRack, { label });
            } else if (rawType.includes("mon")) {
                this.addModule(id, "ModuleMidiViewer", rackType, targetRack, { label });
            } else if (rawType.includes("osc") || rawType.includes("scope") || rawType.includes("osci")) {
                this.addModule(id, "ModuleOscilloscope", rackType, targetRack, { 
                    label, 
                    signalIndex: item.signalIndex !== undefined ? item.signalIndex : (item.params?.signalIndex || 63)
                });
            }
        });

        // 2. Core (Lower) - Dynamic from Preset Architecture
        if (state.preset && state.preset.layers && state.preset.layers[0]) {
            const arch = state.preset.layers[0].voiceArch;
            
            // Oscillators
            const oscillators = [...(arch.oscillators || [])];
            
            oscillators.forEach(osc => {
                const mapping = { 
                    "OSC-VA-001": "ModuleJunoDCO", 
                    "OSC-VA-004": "ModuleJunoDCO",
                    "OSC-KORG-P": "ModuleKorgOsc"
                };
                const id = osc.slotName || "OSC";
                this.addModule(id, mapping[osc.componentId] || "ModuleJunoDCO", "osc", lower, { componentId: osc.componentId });
            });

            // Filters
            arch.filters.forEach(flt => {
                const mapping = { 
                    "FLT-VA-001": "ModuleJunoVCF", 
                    "FLT-VA-003": "ModuleKorgFilter", 
                    "FLT-VA-008": "ModuleJP" 
                };
                this.addModule(flt.slotName, mapping[flt.componentId] || "ModuleJunoVCF", "filter", lower, { componentId: flt.componentId });
            });

            // Envelopes (Global or per layer)
            const allEnvs = [...(arch.envelopes || []), ...(state.preset.envelopes || [])];
            allEnvs.forEach(env => {
                this.addModule(env.slotName || "ADSR", "ModuleADSR", "env", lower);
            });

            // Amplifiers
            const allAmps = [...(state.preset.amplifiers || [])];
            allAmps.forEach(vca => {
                this.addModule(vca.slotName || "VCA", "ModuleVCA", "amp", lower);
            });

            // FX
            arch.fxSlots.forEach(fx => {
                if (fx.componentId === "FX-DL-002") this.addModule("Echo", "ModuleSpaceEcho", "fx", lower);
            });
        }
        
        // Final Sync
        for (const mod of this.activeModules.values()) {
            if (mod.onStateUpdate) mod.onStateUpdate(state);
        }
    }

    addModule(id, className, type, container, options = {}) {
        if (!container) return;
        
        const el = document.createElement('div');
        el.id = `mod-${id}`;
        el.className = `module module-${type} ${className}`;
        
        // Store options in dataset for constructors
        if (options.signalIndex !== undefined) el.dataset.signalIndex = options.signalIndex;
        if (options.componentId) el.dataset.componentId = options.componentId;
        
        const header = document.createElement('div');
        header.className = 'module-header';
        header.innerText = options.label || id;
        el.appendChild(header);
        
        const content = document.createElement('div');
        content.className = 'module-content';
        el.appendChild(content);
        
        container.appendChild(el);
        
        if (window[className]) {
            const instance = new window[className](el, content);
            this.activeModules.set(id, instance);
            
            // Initialization: Apply metadata and sync initial state if available
            if (instance.applyMetadata) instance.applyMetadata();
            if (instance.onStateUpdate && this.lastState) instance.onStateUpdate(this.lastState);

            // Special tracking
            if (className === "ModuleOscilloscope") this.oscilloscopes.push(instance);
            if (className === "ModuleMidiViewer") this.midiViewer = instance;
        }
    }
}

window.moduleManager = new ModuleManager();
