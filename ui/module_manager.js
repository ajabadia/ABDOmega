import { OmegaLog } from './omega_log.js';
import {} from './SchemaStore.js';
import {} from './InventoryStore.js';
import { ModuleRegistry } from './ModuleRegistry.js';
import {} from './contracts/ModuleContract.js';
import {} from './omega_types.js';
export class ModuleManager {
    activeModules = new Map();
    lastState = null;
    isRendering = false;
    lastFingerprint = "";
    pendingState = null;
    renderGeneration = 0;
    constructor() {
        this.activeModules = new Map();
        console.log("%c[!!!] MODULE_MANAGER_V7_ACTIVE [Build 2026.05.03]", "background: #00f2ff; color: #000; font-weight: bold; padding: 2px 5px;");
        OmegaLog.info('MANAGER', "ModuleManager Constructor Initialized.");
        // Era 7: Reactive Subscription
        if (window.runtimeStore) {
            OmegaLog.info('MANAGER', "Subscribing to RuntimeStore...");
            window.runtimeStore.subscribe((type) => {
                OmegaLog.debug('MANAGER', `Store Event Received. Type: ${type}`);
                // Only trigger expensive rack rebuilds on structural changes
                if (type & 1 /* Structure */) {
                    OmegaLog.info('MANAGER', "Structural Change Detected -> updateRack()");
                    this.updateRack(window.runtimeStore.getSnapshot());
                }
                else if (type & 2 /* Parameters */) {
                    // Just propagate param updates to active modules
                    this.activeModules.forEach(mod => {
                        if (mod.onStateUpdate)
                            mod.onStateUpdate(window.runtimeStore.getSnapshot());
                    });
                }
            });
        }
        else {
            OmegaLog.error('MANAGER', "CRITICAL: RuntimeStore not found in window during initialization!");
        }
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
        OmegaLog.info('MANAGER', "updateRack entry point");
        if (this.isRendering) {
            OmegaLog.info('MANAGER', "Render in progress. Queuing next update...");
            this.pendingState = state;
            return;
        }
        this.isRendering = true;
        const currentGeneration = ++this.renderGeneration;
        this.pendingState = null;
        try {
            OmegaLog.debug('MANAGER', "updateRack checking stability...");
            const safeState = state || {};
            this.lastState = safeState;
            // --- [Era 7] Pure Structural Pipeline ---
            const patch = safeState.patch;
            if (!patch) {
                OmegaLog.info('MANAGER', "No Era 7 patch found in state. Skipping structural update.");
                this.isRendering = false;
                return;
            }
            const patchModules = patch.modules || [];
            const fingerprint = patchModules.map((m) => `${m.instanceId}:${m.componentId}:${m.theme || ''}`).join('|');
            const isRackEmpty = patchModules.length === 0;
            if (fingerprint === this.lastFingerprint && !isRackEmpty) {
                OmegaLog.info('MANAGER', "Structure stable (Fingerprint match). Skipping full re-render.");
                this.activeModules.forEach(mod => {
                    if (mod.onStateUpdate)
                        mod.onStateUpdate(state);
                });
                this.isRendering = false;
                return;
            }
            this.lastFingerprint = fingerprint;
            OmegaLog.info('MANAGER', `Structural change detected. Rebuilding racks... (Empty: ${isRackEmpty})`);
            const upper = document.getElementById('upper-rack');
            const lower = document.getElementById('lower-rack');
            if (upper)
                upper.innerHTML = '';
            if (lower)
                lower.innerHTML = '';
            this.activeModules.clear();
            if (isRackEmpty) {
                OmegaLog.info('MANAGER', "Rack is now officially empty.");
                this.isRendering = false;
                return;
            }
            // [Era 7] Pure Rendering Path
            if (patch && patch.modules) {
                const newActiveIds = new Set();
                const lowerRack = document.getElementById('lower-rack');
                OmegaLog.info('MANAGER', `Executing Era 7 Rendering Pipeline (${patch.modules.length} modules)`);
                for (const mod of patch.modules) {
                    const componentId = mod.componentId || "unknown";
                    const instId = `v7_${mod.instanceId}`;
                    newActiveIds.add(instId);
                    if (!this.activeModules.has(instId)) {
                        const manifest = window.schemaStore?.getSchema(componentId);
                        // Era 7 Industrial Routing (1U vs 3U)
                        // Priority: Manifest (slot/height) > Patch Metadata
                        const manifestRack = manifest?.rack?.slot || manifest?.rack || '';
                        let rackValue = (manifestRack || mod.rack || 'lower').toString().toLowerCase();
                        const isCompact = manifest?.height_mode === 'compact' || manifest?.metadata?.rack?.height_mode === 'compact' || manifest?.rack?.height_mode === 'compact';
                        // [Era 7] Route to upper-rack if 'upper', 'top' or 'compact'
                        const isUpper = rackValue === 'upper' || rackValue === 'top' || isCompact;
                        const targetRack = isUpper ? document.getElementById('upper-rack') : document.getElementById('lower-rack');
                        const rackType = isUpper ? 'aux' : 'main';
                        console.log(`%c[!!!] ROUTING DEBUG: mod=${instId} (${componentId}) | manifestRack=${manifestRack} | isCompact=${isCompact} | isUpper=${isUpper} | targetFound=${!!targetRack}`, "color: #00f2ff; font-weight: bold;");
                        if (isUpper && !document.getElementById('upper-rack')) {
                            console.error(`%c[!!!] CRITICAL: upper-rack element not found in DOM!`, "color: #ff0000; font-weight: bold;");
                        }
                        const className = manifest?.ui_class || "ModuleRenderer";
                        if (currentGeneration !== this.renderGeneration)
                            return;
                        await this.addModule(instId, className, rackType, targetRack, {
                            label: mod.label || componentId.toUpperCase(),
                            componentId: componentId,
                            instanceId: mod.instanceId,
                            typeId: mod.typeId,
                            params: mod.parameters || mod.params || {},
                            manifest: manifest || {
                                id: componentId,
                                name: componentId,
                                ui: { dimensions: { width: 60, height: 420 }, controls: [], jacks: [], skin: 'industrial' },
                                registry: []
                            }
                        });
                    }
                    else {
                        // Update existing module parameters
                        const module = this.activeModules.get(instId);
                        if (module && module.onStateUpdate) {
                            module.onStateUpdate(window.runtimeStore.getSnapshot());
                        }
                    }
                }
                // Cleanup removed modules
                this.cleanupModules(newActiveIds);
                this.isRendering = false;
                return;
            }
            // [VISION 2.1.8 - Aseptic Architecture] We no longer assume an empty lower rack is an emergency. 
            // The Minimal Preset purposely leaves the lower rack empty. The top-level aux/layer checks handle true empty states.
            this.activeModules.forEach(mod => {
                if (mod.onStateUpdate)
                    mod.onStateUpdate(state);
            });
        }
        catch (e) {
            OmegaLog.error('MANAGER', "Error during rack update:", e);
            if (e && e.stack)
                OmegaLog.error('MANAGER', "Stack trace:", e.stack);
        }
        finally {
            this.isRendering = false;
            // If an update arrived while we were rendering, process it now
            if (this.pendingState) {
                const next = this.pendingState;
                this.pendingState = null;
                this.updateRack(next);
            }
        }
    }
    async renderModuleItem(item, upper, lower) {
        // Primary identity is instanceId (ensures uniqueness for multiple copies)
        const id = item.instanceId || item.nodeId || item.id || item.slotName || "AUX";
        const label = item.label || item.name || item.slotName || id;
        const componentId = item.componentId || item.id || "";
        // --- Ghost Filtering ---
        if (!componentId)
            return;
        // Era 6: Resolve schema from SchemaStore
        // @ts-ignore
        const schema = window.schemaStore.getSchema(componentId);
        // --- Era 6 Absolute Aseptic Routing ---
        // [Era 6.3] Pure Data-Driven Routing
        let rackValue = item.rack?.toString().toLowerCase();
        // If the preset item doesn't specify a rack, use the schema default
        if (!rackValue && schema?.rack) {
            rackValue = schema.rack.toLowerCase();
        }
        const targetRack = rackValue === 'upper' ? upper : lower;
        const rackType = rackValue === 'upper' ? 'aux' : 'main';
        // System Guard: Matrix is managed as a singleton system overlay
        if (componentId === "patchbay_matrix" || componentId === "system.matrix") {
            return;
        }
        if (schema) {
            // Era 6.3: Clone schema and override ID with instance ID for correct RPC routing
            const manifest = { ...schema, id };
            // [Era 6.3] Industrial Data-Driven Class Resolution
            let className = schema.ui_class || "ModuleRenderer";
            // [Era 6.3] Instance Theme Override
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
                manifest: manifest
            });
        }
        else {
            await this.renderContractError(id, rackType, targetRack, componentId, "MISSING_CONTRACT");
        }
    }
    async renderContractError(id, type, container, componentId, reason) {
        if (!container)
            return;
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
    async addModule(id, className, type, container, options) {
        if (!container)
            return;
        const el = document.createElement('div');
        el.id = `mod-${id}`;
        el.className = `module module-${type} ${className} ${options.manifest.panelClass || ''}`;
        const header = document.createElement('div');
        header.className = 'module-header';
        // 1. Reordering Controls (Era 6.3 - Unified Patch Hub)
        const moveLeft = document.createElement('div');
        moveLeft.className = 'module-header-action move-btn';
        moveLeft.innerHTML = '◀';
        moveLeft.title = `Move ${id} left`;
        moveLeft.onclick = (e) => {
            e.stopPropagation();
            // @ts-ignore
            window.rpcCommandDispatcher.dispatch({ type: 'moveModule', payload: { instanceId: id, direction: -1 } });
        };
        header.appendChild(moveLeft);
        const moveRight = document.createElement('div');
        moveRight.className = 'module-header-action move-btn';
        moveRight.innerHTML = '▶';
        moveRight.title = `Move ${id} right`;
        moveRight.onclick = (e) => {
            e.stopPropagation();
            // @ts-ignore
            window.rpcCommandDispatcher.dispatch({ type: 'moveModule', payload: { instanceId: id, direction: 1 } });
        };
        header.appendChild(moveRight);
        const spacer = document.createElement('div');
        spacer.style.flex = '1';
        header.appendChild(spacer);
        // 2. Config & Close
        const configBtn = document.createElement('div');
        configBtn.className = 'module-header-action config-btn';
        configBtn.innerHTML = '⚙';
        configBtn.title = `Configure ${id}`;
        configBtn.onclick = (e) => {
            e.stopPropagation();
            // @ts-ignore
            if (window.modulePatchModal) {
                // @ts-ignore
                window.modulePatchModal.open(id, options.manifest);
            }
        };
        header.appendChild(configBtn);
        const closeBtn = document.createElement('div');
        closeBtn.className = 'module-header-action close-btn';
        closeBtn.innerHTML = '×';
        closeBtn.title = `Remove ${id}`;
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            if (window.confirm(`Are you sure you want to remove ${id}?`)) {
                // @ts-ignore
                window.rpcCommandDispatcher.dispatch({
                    type: 'removeModule',
                    payload: { instanceId: id }
                });
            }
        };
        header.appendChild(closeBtn);
        el.appendChild(header);
        const content = document.createElement('div');
        content.className = 'module-content';
        el.appendChild(content);
        container.appendChild(el);
        const Factory = ModuleRegistry.getConstructor(className);
        if (Factory) {
            // Era 6.3: ModuleRenderer expects descriptor directly, others expect full options object
            const instance = (className === "ModuleRenderer")
                ? new Factory(el, content, options.manifest)
                : new Factory(el, content, options);
            this.activeModules.set(id, instance);
            if (instance.init)
                await instance.init();
            if (instance.onStateUpdate && this.lastState)
                instance.onStateUpdate(this.lastState);
        }
        else {
            console.error(`[ModuleManager] Module class not found in registry: ${className}`);
        }
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
        const parts = id.split('_');
        // Check if the last part is a number (id_1, id_2...)
        if (parts.length > 1 && !isNaN(parseInt(parts[parts.length - 1]))) {
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
//# sourceMappingURL=module_manager.js.map