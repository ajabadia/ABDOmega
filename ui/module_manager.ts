// --- ERA 6: Multi-Store Aseptic Architecture ---
import { type ModuleSchema } from './SchemaStore.js';
import { type InventoryItem } from './InventoryStore.js';

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
            await window.schemaStore.ensureLoaded();
            // @ts-ignore
            await window.inventoryStore.ensureLoaded();
            
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
                console.log("[ModuleManager] No modules found. Awaiting legitimate preset data.");
                return;
            }
            
            for (const item of aux) {
                // Primary identity is instanceId (ensures uniqueness for multiple copies)
                const id = item.instanceId || item.nodeId || item.id || item.slotName || "AUX";
                const label = item.label || item.name || item.slotName || id;
                
                const componentId = item.componentId || item.id || "";
                
                // Era 6: Resolve schema from SchemaStore
                // @ts-ignore
                const schema: ModuleSchema = window.schemaStore.getSchema(componentId);
                
                // --- Era 6 Absolute Aseptic Routing ---
                // Routing must be explicit or derived from system graph. No silent fallbacks.
                const rackValue = item.rack?.toString().toLowerCase();
                const targetRack = rackValue === 'upper' ? upper : lower;
                const rackType = rackValue === 'upper' ? 'aux' : 'main';

                // System Guard: Matrix is managed as a singleton system overlay
                if (componentId === "patchbay_matrix" || componentId === "system.matrix") {
                    continue;
                }

                if (schema) {
                    // Era 6: Class discovery should ideally be in schema, but we maintain minimal mapping for core adapters
                    const className = (componentId === "midi_2_cv" || componentId === "midi_adapter") ? "ModuleMidiToCv" : "ModuleRenderer";
                    
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
                        const descriptor = null; // Forced to null to trigger AceCatalog resolution
                        
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
                            await this.renderContractError(node.nodeId || node.id || componentId, type, lower, componentId, "UNRESOLVED_GRAPH_NODE");
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
                            // @ts-ignore
                            const schema = window.schemaStore.getSchema(componentId);
                            const layer = "A";

                            if (schema && lower) {
                                await this.addModule(item.slotName || componentId, "ModuleRenderer", cat.type, lower, { 
                                    componentId, layer, group: "MAIN", manifest: schema
                                });
                            } else if (lower) {
                                await this.renderContractError(item.slotName || componentId, cat.type, lower, componentId, "ASEPTIC_SCHEMA_MISSING");
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
        } catch (e: any) {
            console.error("[ModuleManager] Error during rack update:", e);
            if (e && e.stack) console.error("[ModuleManager] Stack trace:", e.stack);
        } finally {
            this.isRendering = false;
        }
    }

    private async renderContractError(id: string, type: string, container: HTMLElement | null, componentId: string, reason: string): Promise<void> {
        if (!container) return;
        const el = document.createElement('div');
        el.className = `module module-${type} contract-error`;
        el.innerHTML = `
            <div class="module-header error">${id}</div>
            <div class="module-content">
                <div class="contract-error-icon">⚠️</div>
                <div class="contract-error-msg">CONTRACT ERROR</div>
                <div class="contract-error-reason">${reason}</div>
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
        el.appendChild(header);
        
        const content = document.createElement('div');
        content.className = 'module-content';
        el.appendChild(content);
        
        container.appendChild(el);
        
        // @ts-ignore
        if (window[className]) {
            // @ts-ignore
            const instance = new window[className](el, content, options.manifest);
            this.activeModules.set(id, instance);
            
            if (instance.init) await instance.init();
            if (instance.onStateUpdate && this.lastState) instance.onStateUpdate(this.lastState);

            if (className === "ModuleOscilloscope") this.oscilloscopes.push(instance);
            if (className === "ModuleMidiViewer") this.midiViewer = instance;
        }
    }
    private getCanonicalId(id: string): string {
        if (!id) return "";
        const parts = id.split('_');
        // Check if the last part is a number (id_1, id_2...)
        if (parts.length > 1 && !isNaN(parseInt(parts[parts.length - 1] as string))) {
            return parts.slice(0, -1).join('_');
        }
        return id;
    }

}

// @ts-ignore
if (typeof window !== 'undefined') {
    // @ts-ignore
    window.moduleManager = new ModuleManager();
}
export default ModuleManager;
