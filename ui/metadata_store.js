/**
 * OMEGA Metadata Store
 * Caches and provides parameter definitions from the C++ backend.
 */
class MetadataStore {
    constructor() {
        this.cache = null;
        this.groups = new Map();
        this.parameters = new Map();
    }

    async ensureLoaded() {
        if (this.cache) return this.cache;

        try {
            console.log("[MetadataStore] Fetching metadata from backend...");
            const data = await window.omegaRPC.getMetadata();
            
            // The new RpcMetadataController returns: { version, engine, parameters: [], groups: [] }
            this.cache = data;
            
            if (data.parameters && Array.isArray(data.parameters)) {
                data.parameters.forEach(p => {
                    this.parameters.set(p.id, p);
                });
            }

            if (data.groups && Array.isArray(data.groups)) {
                data.groups.forEach(g => {
                    this.groups.set(g.id, g);
                });
            }

            console.log(`[MetadataStore] Loaded ${this.parameters.size} parameters and ${this.groups.size} groups.`);
            return this.cache;
        } catch (e) {
            console.error("[MetadataStore] Failed to load metadata:", e);
            return null;
        }
    }

    getParam(id) {
        return this.parameters.get(id);
    }

    getGroup(id) {
        return this.groups.get(id);
    }

    getAllParams() {
        return Array.from(this.parameters.values());
    }
}

window.metadataStore = new MetadataStore();
