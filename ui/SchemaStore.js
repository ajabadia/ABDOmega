/**
 * OMEGA Schema Store (Era 6)
 * Authoritative registry of module contracts.
 */
export class SchemaStore {
    schemas = new Map();
    isLoaded = false;
    async ensureLoaded() {
        if (this.isLoaded)
            return true;
        try {
            const rpc = window.omegaRPC;
            if (!rpc)
                return false;
            // In Era 6, we query the formal UI Schema registry
            const response = await rpc.send("getUiSchemas", {});
            if (response && response.schemas) {
                response.schemas.forEach((s) => {
                    this.schemas.set(s.id, s);
                });
                this.isLoaded = true;
                return true;
            }
        }
        catch (e) {
            console.error("[SchemaStore] Load error:", e);
        }
        return false;
    }
    getSchema(id) {
        return this.schemas.get(id);
    }
    getAllSchemas() {
        return Array.from(this.schemas.values());
    }
}
// Global instance
window.schemaStore = new SchemaStore();
//# sourceMappingURL=SchemaStore.js.map