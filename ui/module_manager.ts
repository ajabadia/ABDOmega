/**
 * OMEGA Module Manager (TypeScript)
 * Handles dynamic instantiation of Eurorack modules.
 */

import { ModuleDescriptors } from './module_descriptors.js';

export class ModuleManager {
    private activeModules: Map<string, any> = new Map();
    private oscilloscopes: any[] = [];
    private midiViewer: any = null;
    private lastState: any = null;

    private isRendering: boolean = false;
    private lastModuleCount: number = 0;

    constructor() {
        this.activeModules = new Map();
        this.oscilloscopes = [];
        this.midiViewer = null;
    }

    private normalizeList(data: any): any[] {
        if (!data) return [];
        let list: any[] = [];
        if (Array.isArray(data)) list = data;
        else if (typeof data === 'object') list = Object.values(data);
        
        // Defensive Flattening for Build #156
        return list.map(item => Array.isArray(item) ? item[0] : item);
    }

    async updateRack(state: any): Promise<void> {
        if (this.isRendering) return;
        this.isRendering = true;

        try {
            console.log("[ModuleManager] updateRack checking stability...");
            const safeState = state || {};
            this.lastState = safeState;
            
            // @ts-ignore
            await window.metadataStore.ensureLoaded();
            // @ts-ignore
            await window.metadataStore.getModulationMetadata();
            
            const upper = document.getElementById('upper-rack');
            const lower = document.getElementById('lower-rack');
            
            // --- Structure Guard for Build #172 ---
            const layerList = this.normalizeList(state.preset && state.preset.layers);
            const auxList = this.normalizeList(safeState.preset?.auxiliary || safeState.auxiliary || []);
            const mainChain = this.normalizeList(safeState.mainChain || []);
            const totalModules = layerList.length + auxList.length + mainChain.length;

            if (totalModules === this.lastModuleCount && totalModules > 0) {
                console.log("[ModuleManager] Structure stable. Skipping full re-render, notifying active instances.");
                this.activeModules.forEach(mod => {
                    if (mod.onStateUpdate) mod.onStateUpdate(state);
                });
                return;
            }

            this.lastModuleCount = totalModules;
            console.log(`[ModuleManager] Structural change detected (${totalModules} modules). Rebuilding racks...`);
            
            if (upper) upper.innerHTML = '';
            if (lower) lower.innerHTML = '';
            
            this.activeModules.clear();
            this.oscilloscopes = [];
            this.midiViewer = null;

            // 1. Core (Lower) - Dynamic from Preset Architecture
            const layerData = layerList.length > 0 ? layerList[0] : null;

            // 2. Auxiliary (Direct from Preset)
            const aux = auxList;
            
            if (aux.length === 0 && (!layerList || layerList.length === 0) && mainChain.length === 0) {
                console.log("[ModuleManager] No modules found. Injecting emergency module.");
                await this.injectEmergencyModule();
                return;
            }
            
            for (const item of aux) {
                const id = item.id || item.nodeId || item.slotName || "AUX";
                const label = item.label || item.name || item.slotName || id;
                
                let targetRack = upper;
                let rackType = "aux";
                const rackValue = item.rack !== undefined ? item.rack : (item.params && item.params.rack);
                
                if (rackValue === "lower" || rackValue === 1 || rackValue === 1.0 || rackValue === "main") {
                    targetRack = lower;
                    rackType = "main";
                }

                const descriptor = this.resolveDescriptor(item);
                const componentId = item.componentId || item.id || "";
                
                // --- Era 4 Purity Guard ---
                // We skip system-level infrastructure components (Patchbay Hub) in the rack
                // these will be accessible via the global UI menus/modals.
                if (componentId.includes("PATCHBAY-MATRIX")) {
                    console.log(`[ModuleManager] Skipping system component in rack: ${componentId}`);
                    continue;
                }

                if (descriptor) {
                    // Decide class based on descriptor or generic renderer
                    let className = "ModuleRenderer";
                    if (descriptor.id?.includes("MONITOR")) className = "ModuleMidiViewer";
                    else if (descriptor.id?.includes("TRIG")) className = "ModuleMidiTrigger";
                    else if (descriptor.id?.includes("SCOPE")) className = "ModuleOscilloscope";
                    else if (descriptor.id?.includes("MCV")) className = "ModuleMidiToCv";

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
                        const descriptor = (ModuleDescriptors as any)[componentId];
                        
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
                                descriptor, componentId, layer, group: "MAIN" 
                            });
                        } else if (lower) {
                            await this.addPlaceholder(node.nodeId || node.id || componentId, type, lower, componentId);
                        }
                    }
                } else if (arch) {
                    const categories = [
                        { list: this.normalizeList(arch.oscillators || arch.oscillatorList), type: "osc" },
                        { list: this.normalizeList(arch.filters     || arch.filterList), type: "filter" },
                        { list: this.normalizeList(arch.envelopes   || arch.envelopeList), type: "env" },
                        { list: this.normalizeList(arch.amplifiers  || arch.amplifierList), type: "amp" },
                        { list: this.normalizeList(arch.lfos        || arch.lfoList), type: "lfo" },
                        { list: this.normalizeList(arch.fxSlots     || arch.fxList), type: "fx" }
                    ];

                    for (const cat of categories) {
                        if (!cat.list || cat.list.length === 0) continue;

                        for (const item of cat.list) {
                            const componentId = item.componentId || item.id || item.type;
                            const descriptor = this.resolveDescriptor(item);
                            const layer = "A";

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
            
            // [VISION 2.1.8 - Aseptic Architecture] We no longer assume an empty lower rack is an emergency. 
            // The Minimal Preset purposely leaves the lower rack empty. The top-level aux/layer checks handle true empty states.

            this.activeModules.forEach(mod => {
                if (mod.onStateUpdate) mod.onStateUpdate(state);
            });
        } catch (e) {
            console.error("[ModuleManager] Error during rack update:", e);
        } finally {
            this.isRendering = false;
        }
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

    private async injectEmergencyModule(): Promise<void> {
        console.log("[ModuleManager] Injecting Emergency Mirror Alert...");
        const upper = document.getElementById('upper-rack');
        const lower = document.getElementById('lower-rack');
        
        // --- Structural Purge (Aseptic 2.1.9) ---
        if (upper) upper.innerHTML = '';
        if (lower) lower.innerHTML = '';

        const descriptor = (ModuleDescriptors as any)["ERR-EMPTY-001"];
        
        // 1. Mirror - Upper Alert
        await this.addModule("EMERGENCY_SYSTEM_UPPER", "ModuleEmergency", "aux", upper, { 
            label: "SYSTEM MONITOR",
            descriptor: descriptor 
        });

        // 2. Main - Lower Guard
        await this.addModule("EMERGENCY_SYSTEM_LOWER", "ModuleEmergency", "main", lower, { 
            label: "ENGINE GUARD",
            descriptor: descriptor 
        });
    }

    private async addModule(id: string, className: string, type: string, container: HTMLElement | null, options: any = {}): Promise<void> {
        if (!container) return;
        
        const el = document.createElement('div');
        el.id = `mod-${id}`;
        el.className = `module module-${type} ${className} ${options.descriptor?.panelClass || ''}`;
        
        const header = document.createElement('div');
        header.className = 'module-header';
        header.innerText = options.label || options.descriptor?.title || id;
        
        // Add Patch Settings Icon
        const patchIcon = document.createElement('div');
        patchIcon.className = 'module-patch-icon';
        patchIcon.innerHTML = '⚙️';
        patchIcon.title = 'Patch Module';
        patchIcon.onclick = (e) => {
            e.stopPropagation();
            document.dispatchEvent(new CustomEvent('patch-request', { detail: { instanceId: id } }));
        };
        header.appendChild(patchIcon);
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
    private resolveDescriptor(item: any): any {
        if (!item) return null;
        const id = item.componentId || item.id;
        const type = item.slotType || item.type;
        const instanceId = item.slotName || (item.instance && item.instance.id) || id;
        
        // 1. Check for Virtual Descriptor from AceCatalog (Hyper-ACE)
        // @ts-ignore
        const invItem = window.metadataStore.getInventoryItem(instanceId);
        if (invItem && invItem.uiLayout) {
            console.log(`[ModuleManager] Resolved DYNAMIC DESCRIPTOR for ${instanceId}`);
            const desc = invItem.uiLayout;
            desc.id = instanceId;
            desc.title = invItem.name || instanceId;
            desc.panelClass = invItem.style || desc.panelClass || 'universal-panel';
            return desc;
        }

        // 2. Fallback: Try specific model ID in local registry
        if (id && (ModuleDescriptors as any)[id]) return (ModuleDescriptors as any)[id];
        
        // 3. Fallback: Try semantic slot type
        if (type && (ModuleDescriptors as any)[type]) return (ModuleDescriptors as any)[type];
        
        // 4. Fallback: Try lowercase variant
        if (type && (ModuleDescriptors as any)[type.toLowerCase()]) return (ModuleDescriptors as any)[type.toLowerCase()];

        console.warn(`[ModuleManager] Could not resolve descriptor for:`, item);
        return null;
    }
}

// @ts-ignore
if (typeof window !== 'undefined') {
    // @ts-ignore
    window.moduleManager = new ModuleManager();
}
export default ModuleManager;
