/**
 * OMEGA Metadata Store (TypeScript)
 * Formalizes the "Single Source of Truth" for parameters.
 */
export class MetadataStore {
    parameters = new Map();
    groups = new Map();
    inventory = [];
    isLoaded = false;
    version = "5.2.0-ALPHA";
    build = "397";
    timestamp = new Date().toISOString();
    constructor() { }
    async ensureLoaded() {
        if (this.isLoaded)
            return true;
        try {
            const rpc = window.omegaRPC;
            if (!rpc)
                return false;
            const response = await rpc.getMetadata();
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
                if (response.version)
                    this.version = response.version;
                if (response.build)
                    this.build = response.build;
                if (response.timestamp)
                    this.timestamp = response.timestamp;
                this.isLoaded = true;
                return true;
            }
        }
        catch (e) {
            console.error("[MetadataStore] Load error:", e);
        }
        return false;
    }
    async getModulationMetadata() {
        const rpc = window.omegaRPC;
        try {
            const res = rpc ? await rpc.send("getModulationMetadata", {}) : null;
            if (res && res.inventory && res.inventory.length > 0) {
                this.inventory = res.inventory;
            }
            return { inventory: this.inventory, sources: res?.sources || [], targets: res?.targets || [] };
        }
        catch (e) {
            return { inventory: this.inventory, sources: [], targets: [] };
        }
    }
    getInventoryItem(id) {
        return this.inventory.find(m => m.instanceId === id || m.id === id);
    }
    getParam(id) {
        const p = this.parameters.get(id);
        if (!p) {
            // High verbosity for Era 5.2 diagnostic
            // console.warn(`[MetadataStore] Param NOT found: ${id}`);
        }
        return p;
    }
    getInventory() { return this.inventory; }
    isInitialized() { return this.isLoaded; }
    getVersion() { return this.version; }
    getBuild() { return this.build; }
    getTimestamp() { return this.timestamp; }
}
// Global instance
window.metadataStore = new MetadataStore();
//# sourceMappingURL=metadata_store.js.map