/**
 * OMEGA Module Manager (TypeScript)
 * Handles dynamic instantiation of Eurorack modules.
 */

import { ModuleRenderer, ModuleDescriptor } from './module_renderer';
import { ModuleDescriptors } from './module_descriptors';

export class ModuleManager {
    private activeModules: Map<string, any> = new Map();
    private currentRackState: any = null;

    constructor() {}

    async updateRack(state: any): Promise<void> {
        this.currentRackState = state;
        
        // @ts-ignore
        await window.metadataStore.ensureLoaded();
        
        const upper = document.getElementById('upper-rack');
        const lower = document.getElementById('lower-rack');
        if (upper) upper.innerHTML = '';
        if (lower) lower.innerHTML = '';
        
        this.activeModules.clear();
        
        // 1. Auxiliary (MIDI, Scopes)
        const aux = state.preset?.auxiliary || [];
        for (const item of aux) {
            const rawType = (item.type || item.componentId || "").toLowerCase();
            const id = item.id || item.slotName || "AUX";
            const targetRack = (item.rack === "lower" || item.rack === 1) ? lower : upper;

            if (rawType.includes("trig")) {
                await this.addModule(id, "ModuleMidiTrigger", "aux", targetRack, { label: item.label });
            } else if (rawType.includes("mon")) {
                await this.addModule(id, "ModuleMidiViewer", "aux", targetRack, { label: item.label });
            } else if (rawType.includes("osc") || rawType.includes("scope")) {
                await this.addModule(id, "ModuleOscilloscope", "aux", targetRack, { 
                    label: item.label,
                    signalIndex: item.signalIndex
                });
            }
        }

        // 2. Core (Generative)
        const layerData = state.preset?.layers?.[0];
        if (layerData) {
            const arch = layerData.voiceArch || layerData.architecture;
            if (arch) {
                const categories = [
                    { list: arch.oscillators || arch.oscillatorList || [], type: "osc" },
                    { list: arch.filters     || arch.filterList     || [], type: "filter" },
                    { list: arch.envelopes   || arch.envelopeList   || [], type: "env" },
                    { list: arch.amplifiers  || arch.amplifierList  || [], type: "amp" },
                    { list: arch.lfos        || arch.lfoList        || [], type: "lfo" },
                    { list: arch.fxSlots     || arch.fxList         || [], type: "fx" }
                ];

                for (const cat of categories) {
                    if (!cat.list) continue;
                    for (const item of cat.list) {
                        const componentId = item.componentId || item.id || item.type;
                        const descriptor = ModuleDescriptors[componentId];
                        if (descriptor && lower) {
                            await this.addModule(item.slotName || componentId, "ModuleRenderer", cat.type, lower, { 
                                descriptor, componentId, layer: "A"
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
        }
    }
}

// @ts-ignore
if (typeof window !== 'undefined') {
    // @ts-ignore
    window.moduleManager = new ModuleManager();
}
export default ModuleManager;
