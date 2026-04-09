/**
 * OMEGA Metadata Store (TypeScript)
 * Formalizes the "Single Source of Truth" for parameters.
 */
export class MetadataStore {
    parameters = new Map();
    groups = new Map();
    inventory = [];
    isLoaded = false;
    version = "1.0.0";
    build = "0";
    timestamp = "";
    constructor() { }
    async ensureLoaded() {
        if (this.isLoaded)
            return true;
        try {
            console.log("[MetadataStore] Attempting to load metadata via omegaRPC...");
            // @ts-ignore - window.omegaRPC defined globally
            if (!window.omegaRPC) {
                console.warn("[MetadataStore] window.omegaRPC is missing!");
                return false;
            }
            const response = await window.omegaRPC.getMetadata();
            console.log("[MetadataStore] RPC Response received:", response ? "SUCCESS" : "EMPTY");
            if (response && response.parameters) {
                response.parameters.forEach((p) => {
                    this.parameters.set(p.id, p);
                });
                if (response.groups) {
                    response.groups.forEach((g) => {
                        this.groups.set(g.id, g);
                    });
                }
                if (response.version)
                    this.version = response.version;
                if (response.build !== undefined)
                    this.build = response.build.toString();
                if (response.timestamp)
                    this.timestamp = response.timestamp;
                this.isLoaded = true;
                return true;
            }
        }
        catch (e) {
            console.error("[MetadataStore] Failed to load metadata:", e);
        }
        return false;
    }
    getParam(id) {
        return this.parameters.get(id);
    }
    getAllParams() {
        return Array.from(this.parameters.values());
    }
    getGroup(id) {
        return this.groups.get(id);
    }
    async getModulationMetadata() {
        // @ts-ignore
        if (!window.omegaRPC)
            return { inventory: [], sources: [], targets: [] };
        // @ts-ignore
        const res = await window.omegaRPC.send("getModulationMetadata", {});
        if (res && res.inventory) {
            this.inventory = res.inventory.map((m) => ({
                ...m,
                visible: m.visible !== undefined ? m.visible : true,
                illustration: m.illustration || ""
            }));
            // Register dynamic parameters from ports with options
            this.inventory.forEach((m) => {
                if (m.ports) {
                    m.ports.forEach((p) => {
                        if (p.options && p.options.length > 0) {
                            this.parameters.set(p.id, {
                                id: p.id,
                                name: p.label || p.id,
                                min: 0,
                                max: p.options.length - 1,
                                default: p.defaultValue || 0,
                                options: p.options
                            });
                        }
                    });
                }
            });
        }
        return res;
    }
    getInventoryItem(id) {
        return this.inventory.find(m => m.instanceId === id || m.id === id);
    }
    getVersion() { return this.version; }
    getBuild() { return this.build; }
    getTimestamp() { return this.timestamp; }
}
// Global instance for runtime
// @ts-ignore
window.metadataStore = new MetadataStore();
//# sourceMappingURL=metadata_store.js.map