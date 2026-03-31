/**
 * OMEGA Module Manager (TypeScript)
 * Handles dynamic instantiation of Eurorack modules.
 */

import { ModuleDescriptors } from './module_descriptors';

export class ModuleManager {
    private activeModules: Map<string, any> = new Map();
    private oscilloscopes: any[] = [];
    private midiViewer: any = null;
    private lastState: any = null;

    constructor() {
        this.activeModules = new Map();
        this.oscilloscopes = [];
        this.midiViewer = null;
    }

    async updateRack(state: any): Promise<void> {
        this.lastState = state;
        
        // @ts-ignore
        await window.metadataStore.ensureLoaded();
        
        const upper = document.getElementById('upper-rack');
        const lower = document.getElementById('lower-rack');
        if (upper) upper.innerHTML = '';
        if (lower) lower.innerHTML = '';
        
        this.activeModules.clear();
        this.oscilloscopes = [];
        this.midiViewer = null;
        
        // 1. Auxiliary (Direct from Preset)
        const aux = state.preset?.auxiliary || [];
        
        for (const item of aux) {
            const rawType = (item.type || item.componentId || item.COMPONENTID || "").toLowerCase();
            const id = item.id || item.slotName || item.SLOTNAME || "AUX";
            const label = item.label || item.name || item.slotName || id;
            
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
            
            if (arch) {
                // Process Categories - Unify Root and Layer components
                const categories = [
                    { list: (arch.oscillators || arch.oscillatorList || []).concat(state.preset?.oscillators || []), type: "osc" },
                    { list: (arch.filters     || arch.filterList     || []).concat(state.preset?.filters || []), type: "filter" },
                    { list: (arch.envelopes   || arch.envelopeList   || []).concat(state.preset?.envelopes || []), type: "env" },
                    { list: (arch.amplifiers  || arch.amplifierList  || []).concat(state.preset?.amplifiers || []), type: "amp" },
                    { list: (arch.lfos        || arch.lfoList        || []).concat(state.preset?.lfos || []), type: "lfo" },
                    { list: (arch.fxSlots     || arch.fxList         || []).concat(state.preset?.fxSlots || []), type: "fx" }
                ];

                for (const cat of categories) {
                    if (!cat.list || cat.list.length === 0) continue;

                    for (const item of cat.list) {
                        const componentId = item.componentId || item.id || item.type;
                        const descriptor = (ModuleDescriptors as any)[componentId];

                        if (descriptor && lower) {
                            await this.addModule(item.slotName || componentId, "ModuleRenderer", cat.type, lower, { 
                                descriptor, componentId, layer, group: "MAIN" 
                            });
                        } else if (lower) {
                            await this.addPlaceholder(item.slotName || componentId, cat.type, lower, componentId);
                        }
                    }
                }
            }
        }
        
        // Final Sync
        this.activeModules.forEach(mod => {
            if (mod.onStateUpdate) mod.onStateUpdate(state);
        });
    }

    private async addPlaceholder(id: string, type: string, container: HTMLElement | null, componentId: string): Promise<void> {
        if (!container) return;
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

    private async addModule(id: string, className: string, type: string, container: HTMLElement | null, options: any = {}): Promise<void> {
        if (!container) return;
        
        const el = document.createElement('div');
        el.id = `mod-${id}`;
        el.className = `module module-${type} ${className} ${options.descriptor?.panelClass || ''}`;
        
        const header = document.createElement('div');
        header.className = 'module-header';
        header.innerText = options.label || options.descriptor?.title || id;
        el.appendChild(header);
        
        const content = document.createElement('div');
        content.className = 'module-content';
        el.appendChild(content);
        
        container.appendChild(el);
        
        // @ts-ignore
        if (window[className]) {
            // @ts-ignore
            const instance = new window[className](el, content, options.descriptor || options);
            this.activeModules.set(id, instance);
            
            if (instance.init) await instance.init();
            if (instance.onStateUpdate && this.lastState) instance.onStateUpdate(this.lastState);

            if (className === "ModuleOscilloscope") this.oscilloscopes.push(instance);
            if (className === "ModuleMidiViewer") this.midiViewer = instance;
        }
    }
}

// @ts-ignore
if (typeof window !== 'undefined') {
    // @ts-ignore
    window.moduleManager = new ModuleManager();
}
export default ModuleManager;
