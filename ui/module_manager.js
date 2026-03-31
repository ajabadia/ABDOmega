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
        
        // Ensure Metadata is loaded once before building the rack
        await window.metadataStore.ensureLoaded();
        
        const upper = document.getElementById('upper-rack');
        const lower = document.getElementById('lower-rack');
        if (upper) upper.innerHTML = '';
        if (lower) lower.innerHTML = '';
        
        this.activeModules.clear();
        this.oscilloscopes = [];
        this.midiViewer = null;
        
        // 1. Auxiliary (Direct from Preset)
        let aux = state.preset?.auxiliary || [];
        
        for (const item of aux) {
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
                await this.addModule(id, "ModuleMidiTrigger", rackType, targetRack, { label });
            } else if (rawType.includes("mon")) {
                await this.addModule(id, "ModuleMidiViewer", rackType, targetRack, { label });
            } else if (rawType.includes("osc") || rawType.includes("scope") || rawType.includes("osci")) {
                const theme = (label.toLowerCase().includes("mod") || label.toLowerCase().includes("ctrl")) ? "MOD" : "AUDIO";
                await this.addModule(id, "ModuleOscilloscope", rackType, targetRack, { 
                    label, 
                    theme,
                    signalIndex: item.signalIndex !== undefined ? item.signalIndex : (item.params?.signalIndex || 32)
                });
            }
        }

        // 2. Core (Lower) - Dynamic from Preset Architecture
        const layerData = state.preset && state.preset.layers && state.preset.layers[0];
        if (layerData) {
            const arch = layerData.voiceArch || layerData.architecture;
            const layer = "A";
            
            console.log("[ModuleManager] Rack Update - Arch:", arch);

            if (arch) {
                // Process Categories
                const categories = [
                    { list: arch.oscillators, type: "osc" },
                    { list: arch.filters,     type: "filter" },
                    { list: arch.envelopes || arch.envelopeList || [], type: "env" },
                    { list: arch.amplifiers || [], type: "amp" },
                    { list: arch.lfos || [],        type: "lfo" },
                    { list: arch.fxSlots || [],     type: "fx" }
                ];

                for (const cat of categories) {
                    if (!cat.list) continue;
                    for (const item of cat.list) {
                        const componentId = item.componentId || item.id || item.type;
                        const descriptor = window.ModuleDescriptors[componentId];
                        
                        if (descriptor) {
                            await this.addModule(item.slotName || componentId, "ModuleRenderer", cat.type, lower, { 
                                descriptor, componentId, layer, group: "MAIN" 
                            });
                        } else {
                            console.warn(`[ModuleManager] Missing descriptor for ${componentId}. Rendering placeholder.`);
                            await this.addPlaceholder(item.slotName || componentId, cat.type, lower, componentId);
                        }
                    }
                }
            } else {
                console.warn("[ModuleManager] No architecture found in preset layer!");
            }
        }
        
        // Final Sync
        for (const mod of this.activeModules.values()) {
            if (mod.onStateUpdate) mod.onStateUpdate(state);
        }
    }

    async addPlaceholder(id, type, container, componentId) {
        const el = document.createElement('div');
        el.className = `module module-${type} placeholder`;
        el.innerHTML = `
            <div class="module-header">${id}</div>
            <div class="module-content">
                <div class="placeholder-msg">MISSING DESCRIPTOR</div>
                <div class="label-tiny">${componentId}</div>
            </div>
        `;
        container.appendChild(el);
    }

    async addModule(id, className, type, container, options = {}) {
        if (!container) return;
        
        const el = document.createElement('div');
        el.id = `mod-${id}`;
        el.className = `module module-${type} ${className} ${options.descriptor?.panelClass || ''}`;
        
        el.dataset.layer = options.layer || "A";
        el.dataset.group = options.group || "MAIN";
        if (options.signalIndex !== undefined) el.dataset.signalIndex = options.signalIndex;
        if (options.componentId) el.dataset.componentId = options.componentId;
        
        const header = document.createElement('div');
        header.className = 'module-header';
        header.innerText = options.label || options.descriptor?.title || id;
        el.appendChild(header);
        
        const content = document.createElement('div');
        content.className = 'module-content';
        el.appendChild(content);
        
        container.appendChild(el);
        
        if (window[className]) {
            let instance;
            if (className === "ModuleRenderer") {
                instance = new window[className](el, content, options.descriptor);
            } else {
                instance = new window[className](el, content);
            }
            
            this.activeModules.set(id, instance);
            
            // Initialization
            if (instance.init) await instance.init();
            if (instance.onStateUpdate && this.lastState) instance.onStateUpdate(this.lastState);

            // Special tracking
            if (className === "ModuleOscilloscope") this.oscilloscopes.push(instance);
            if (className === "ModuleMidiViewer") this.midiViewer = instance;
        }
    }
}

window.moduleManager = new ModuleManager();
