/**
 * OMEGA Module Manager (TypeScript)
 * Handles dynamic instantiation of Eurorack modules.
 */
import { ModuleDescriptors } from './module_descriptors.js';
export class ModuleManager {
    activeModules = new Map();
    oscilloscopes = [];
    midiViewer = null;
    lastState = null;
    isRendering = false;
    lastModuleCount = 0;
    constructor() {
        this.activeModules = new Map();
        this.oscilloscopes = [];
        this.midiViewer = null;
    }
    normalizeList(data) {
        if (!data)
            return [];
        let list = [];
        if (Array.isArray(data))
            list = data;
        else if (typeof data === 'object')
            list = Object.values(data);
        // Defensive Flattening for Build #156
        return list.map(item => Array.isArray(item) ? item[0] : item);
    }
    async updateRack(state) {
        if (this.isRendering)
            return;
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
                    if (mod.onStateUpdate)
                        mod.onStateUpdate(state);
                });
                return;
            }
            this.lastModuleCount = totalModules;
            console.log(`[ModuleManager] Structural change detected (${totalModules} modules). Rebuilding racks...`);
            if (upper)
                upper.innerHTML = '';
            if (lower)
                lower.innerHTML = '';
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
                // Primary identity is instanceId (ensures uniqueness for multiple copies)
                const id = item.instanceId || item.nodeId || item.id || item.slotName || "AUX";
                const label = item.label || item.name || item.slotName || id;
                const componentId = item.componentId || item.id || "";
                const descriptor = this.resolveDescriptor(item);
                // --- Era 4.1 Aseptic Routing ---
                const stateRack = item.rack !== undefined ? item.rack : (item.params && item.params.rack);
                const manifestRack = descriptor?.rack;
                let rackValue = stateRack !== undefined ? stateRack : manifestRack;
                const source = stateRack !== undefined ? "State" : (manifestRack !== undefined ? "Manifest" : "Default");
                // NEW ERA 4.1 DEFAULT: if undefined, go to UPPER
                if (rackValue === undefined) {
                    rackValue = "upper";
                }
                console.log(`[ModuleManager] Routing ${id} [${componentId}]: value=${rackValue} (Source: ${source}), panelClass=${descriptor?.panelClass}`);
                let targetRack = upper;
                let rackType = "aux";
                const isLower = (typeof rackValue === 'string' && rackValue.toLowerCase() === "lower") ||
                    (typeof rackValue === 'string' && rackValue.toLowerCase() === "main") ||
                    rackValue === 1 || rackValue === 1.0;
                if (isLower) {
                    targetRack = lower;
                    rackType = "main";
                }
                // --- Era 4 Purity Guard ---
                // System-level infrastructure (Patchbay Matrix) never renders in the user rack.
                // ID must be the canonical Era 4 snake_case: 'patchbay_matrix'
                if (componentId === "patchbay_matrix") {
                    console.log(`[ModuleManager] Skipping system component in rack: ${componentId}`);
                    continue;
                }
                if (descriptor) {
                    // Decide class based on descriptor or generic renderer
                    // Era 4.1: Unified Semantic Rendering
                    // Any specialized ModuleX class is now deprecated in favor of data-driven ModuleRenderer
                    // Era 5.2 Aseptic Selection
                    let className = (componentId === "ACE-MIDI-ADAPTER-ULTIMATE" || componentId === "midi_2_cv") ? "ModuleMidiToCv" : "ModuleRenderer";
                    // Fetch full manifest from Store for Zero-Hardcoding
                    // @ts-ignore
                    const manifest = window.metadataStore?.getInventoryItem(id) || window.metadataStore?.getInventoryItem(componentId);
                    await this.addModule(id, className, rackType, targetRack, {
                        label,
                        descriptor,
                        componentId,
                        manifest // Essential for Aseptic Dynamic Rendering
                    });
                }
                else {
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
                                descriptor, componentId, layer, group: "MAIN"
                            });
                        }
                        else if (lower) {
                            await this.addPlaceholder(node.nodeId || node.id || componentId, type, lower, componentId);
                        }
                    }
                }
                else if (arch) {
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
                            const descriptor = this.resolveDescriptor(item);
                            const layer = "A";
                            if (descriptor && lower) {
                                await this.addModule(item.slotName || componentId, "ModuleRenderer", cat.type, lower, {
                                    descriptor, componentId, layer, group: "MAIN"
                                });
                            }
                            else if (lower) {
                                await this.addPlaceholder(item.slotName || componentId, cat.type, lower, componentId);
                            }
                        }
                    }
                }
            }
            // [VISION 2.1.8 - Aseptic Architecture] We no longer assume an empty lower rack is an emergency. 
            // The Minimal Preset purposely leaves the lower rack empty. The top-level aux/layer checks handle true empty states.
            this.activeModules.forEach(mod => {
                if (mod.onStateUpdate)
                    mod.onStateUpdate(state);
            });
        }
        catch (e) {
            console.error("[ModuleManager] Error during rack update:", e);
            if (e && e.stack)
                console.error("[ModuleManager] Stack trace:", e.stack);
        }
        finally {
            this.isRendering = false;
        }
    }
    async addPlaceholder(id, type, container, componentId) {
        if (!container)
            return;
        const el = document.createElement('div');
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
        const upper = document.getElementById('upper-rack');
        const lower = document.getElementById('lower-rack');
        // --- Structural Purge (Aseptic 2.1.9) ---
        if (upper)
            upper.innerHTML = '';
        if (lower)
            lower.innerHTML = '';
        const descriptor = ModuleDescriptors["ERR-EMPTY-001"];
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
    async addModule(id, className, type, container, options = {}) {
        if (!container)
            return;
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
            document.dispatchEvent(new CustomEvent('patch-request', {
                detail: {
                    instanceId: id,
                    componentId: options.componentId
                }
            }));
        };
        header.appendChild(patchIcon);
        // Add Status LED (Absolute Centered)
        const led = document.createElement('div');
        led.className = 'led status-indicator';
        led.title = 'Module Active';
        header.appendChild(led);
        el.appendChild(header);
        const content = document.createElement('div');
        content.className = 'module-content';
        el.appendChild(content);
        container.appendChild(el);
        // @ts-ignore
        if (window[className]) {
            // @ts-ignore
            const instance = new window[className](el, content, options.manifest ? options : (options.descriptor || options));
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
        const parts = id.split('_');
        // Check if the last part is a number (id_1, id_2...)
        if (parts.length > 1 && !isNaN(parseInt(parts[parts.length - 1]))) {
            return parts.slice(0, -1).join('_');
        }
        return id;
    }
    resolveDescriptor(item) {
        if (!item)
            return null;
        const id = item.componentId || item.id;
        if (!id)
            return null;
        const canonicalId = this.getCanonicalId(id);
        // 1. Primary: window.omegaCatalog (preloaded static components)
        // @ts-ignore
        const catalog = window.omegaCatalog || {};
        const catItem = catalog[id] || catalog[canonicalId];
        if (catItem) {
            if (catItem.uiLayout) {
                let layoutObj = catItem.uiLayout;
                if (typeof layoutObj === 'string') {
                    try {
                        layoutObj = JSON.parse(layoutObj);
                    }
                    catch (e) {
                        console.error("Parse err: ", e);
                    }
                }
                const desc = JSON.parse(JSON.stringify(layoutObj)); // Deep copy
                desc.id = id;
                desc.title = catItem.name || id;
                desc.panelClass = catItem.panelClass || desc.panelClass || 'utility-panel';
                desc.rack = catItem.rack || desc.rack;
                return desc;
            }
            return {
                id,
                title: catItem.name || id,
                panelClass: catItem.panelClass || 'utility-panel',
                rack: catItem.rack,
                items: [],
                grid: { columns: 2, gap: 12 }
            };
        }
        // 2. Fallback: metadataStore inventory (dynamic/auxiliary components)
        // @ts-ignore
        const store = window.metadataStore;
        if (store && store.inventory) {
            const invItem = store.inventory.find((m) => m.id === id || m.id === canonicalId || m.instanceId === id);
            if (invItem && invItem.uiLayout) {
                let layoutObj = invItem.uiLayout;
                if (typeof layoutObj === 'string') {
                    try {
                        layoutObj = JSON.parse(layoutObj);
                    }
                    catch (e) {
                        console.error("Parse err: ", e);
                    }
                }
                const desc = JSON.parse(JSON.stringify(layoutObj));
                desc.id = id;
                desc.title = invItem.name || id;
                desc.panelClass = invItem.style || desc.panelClass || 'universal-panel';
                return desc;
            }
        }
        // 3. Static Descriptor Hardcoded Fallback
        return ModuleDescriptors[id] || ModuleDescriptors[canonicalId] || {
            id,
            title: id.toUpperCase(),
            items: [],
            grid: { columns: 1, gap: 10 },
            panelClass: "universal-panel"
        };
    }
}
// @ts-ignore
if (typeof window !== 'undefined') {
    // @ts-ignore
    window.moduleManager = new ModuleManager();
}
export default ModuleManager;
//# sourceMappingURL=module_manager.js.map