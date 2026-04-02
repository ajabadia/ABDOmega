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
        console.log("[ModuleManager] updateRack called with state:", state ? "READY" : "NULL/EMPTY");
        const safeState = state || {};
        this.lastState = safeState;
        // @ts-ignore
        await window.metadataStore.ensureLoaded();
        const upper = document.getElementById('upper-rack');
        const lower = document.getElementById('lower-rack');
        if (upper)
            upper.innerHTML = '';
        if (lower)
            lower.innerHTML = '';
        this.activeModules.clear();
        this.oscilloscopes = [];
        this.midiViewer = null;
        // --- FORENSIC LOGGING for Build #155 ---
        if (safeState.preset) {
            console.log("[ModuleManager] --- FORENSIC PRESET DUMP ---");
            console.log(JSON.stringify(safeState.preset, null, 2));
            console.log("[ModuleManager] ---------------------------");
        }
        // 2. Core (Lower) - Dynamic from Preset Architecture
        const layerList = this.normalizeList(state.preset && state.preset.layers);
        const layerData = layerList.length > 0 ? layerList[0] : null;
        // 1. Auxiliary (Direct from Preset)
        const auxData = safeState.preset?.auxiliary || safeState.auxiliary || [];
        const aux = this.normalizeList(auxData);
        if (aux.length === 0 && (!layerList || layerList.length === 0) && (!safeState.mainChain || safeState.mainChain.length === 0)) {
            console.log("[ModuleManager] No modules found. Injecting emergency module.");
            await this.injectEmergencyModule();
            return;
        }
        for (const item of aux) {
            const rawType = (item.type || item.componentId || item.COMPONENTID || "").toLowerCase();
            const id = item.id || item.slotName || item.SLOTNAME || "AUX";
            const label = item.label || item.name || item.slotName || id;
            // Rack Selection
            let targetRack = upper;
            let rackType = "aux";
            const rackValue = item.rack !== undefined ? item.rack : (item.params && item.params.rack);
            if (rackValue === "lower" || rackValue === 1 || rackValue === 1.0 || rackValue === "main") {
                targetRack = lower;
                rackType = "main";
            }
            if (rawType.includes("trig")) {
                await this.addModule(id, "ModuleMidiTrigger", rackType, targetRack, { label });
            }
            else if (rawType.includes("mon")) {
                await this.addModule(id, "ModuleMidiViewer", rackType, targetRack, { label });
            }
            else if (rawType.includes("osc") || rawType.includes("scope") || rawType.includes("osci")) {
                const theme = (label.toLowerCase().includes("mod") || label.toLowerCase().includes("ctrl")) ? "MOD" : "AUDIO";
                await this.addModule(id, "ModuleOscilloscope", rackType, targetRack, {
                    label,
                    theme,
                    signalIndex: item.signalIndex !== undefined ? item.signalIndex : (item.params?.signalIndex || 32)
                });
            }
            else if (rawType.includes("matrix") || rawType.includes("modmatrix")) {
                await this.addModule(id, "ModuleModMatrix", rackType, targetRack, { label });
            }
        }
        if (layerData) {
            const arch = layerData.voiceArch || layerData.architecture || {};
            const chain = layerData.voiceChain;
            const layer = "A";
            if (chain && chain.nodes && chain.nodes.length > 0) {
                // --- Voice Architecture 2.0 (Graph Nodes) ---
                console.log("[ModuleManager] Rendering VoiceChain 2.0 graph...");
                const nodes = this.normalizeList(chain.nodes);
                for (const node of nodes) {
                    const componentId = node.componentId || node.id;
                    const descriptor = ModuleDescriptors[componentId];
                    // Map Role to CSS type
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
                // --- Legacy Voice Architecture (Category Lists) ---
                const categories = [
                    { list: this.normalizeList(arch.oscillators || arch.oscillatorList).concat(this.normalizeList(state.preset?.oscillators)), type: "osc" },
                    { list: this.normalizeList(arch.filters || arch.filterList).concat(this.normalizeList(state.preset?.filters)), type: "filter" },
                    { list: this.normalizeList(arch.envelopes || arch.envelopeList).concat(this.normalizeList(state.preset?.envelopes)), type: "env" },
                    { list: this.normalizeList(arch.amplifiers || arch.amplifierList).concat(this.normalizeList(state.preset?.amplifiers)), type: "amp" },
                    { list: this.normalizeList(arch.lfos || arch.lfoList).concat(this.normalizeList(state.preset?.lfos)), type: "lfo" },
                    { list: this.normalizeList(arch.fxSlots || arch.fxList).concat(this.normalizeList(state.preset?.fxSlots)), type: "fx" }
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
        // Emergency Check: if no modules were rendered, show a trigger anyway
        if (lower && lower.children.length === 0) {
            console.warn("[ModuleManager] Rack empty. Injecting Emergency Trigger.");
            await this.injectEmergencyModule();
        }
        // Final Sync
        this.activeModules.forEach(mod => {
            if (mod.onStateUpdate)
                mod.onStateUpdate(state);
        });
    }
    async addPlaceholder(id, type, container, componentId) {
        if (!container)
            return;
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
    async injectEmergencyModule() {
        console.log("[ModuleManager] Injecting Emergency Trigger Module...");
        const lower = document.getElementById('lower-rack');
        await this.addModule("EMERGENCY_TRIG", "ModuleMidiTrigger", "main", lower, { label: "Emergency Trigger" });
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
    resolveDescriptor(item) {
        if (!item)
            return null;
        const id = item.componentId || item.id;
        const type = item.slotType || item.type;
        // 1. Try specific model ID
        if (id && ModuleDescriptors[id])
            return ModuleDescriptors[id];
        // 2. Try semantic slot type
        if (type && ModuleDescriptors[type])
            return ModuleDescriptors[type];
        // 3. Try lowercase variant
        if (type && ModuleDescriptors[type.toLowerCase()])
            return ModuleDescriptors[type.toLowerCase()];
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
//# sourceMappingURL=module_manager.js.map