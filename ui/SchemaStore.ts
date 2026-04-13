/**
 * OMEGA Schema Store (Era 6)
 * Authoritative registry of module contracts.
 */

export interface ModuleSchema {
    id: string;
    name: string;
    version: string;
    layout: {
        hp: number;
        columns: number;
        gap?: number;
    };
    items: any[];
    registry?: any[];
    theme?: string;
}

export class SchemaStore {
    private schemas: Map<string, ModuleSchema> = new Map();
    private isLoaded: boolean = false;

    async ensureLoaded(): Promise<boolean> {
        if (this.isLoaded) return true;
        
        try {
            const rpc = window.omegaRPC;
            if (!rpc) return false;
            
            // In Era 6, we query the formal UI Schema registry
            const response = await rpc.send("getUiSchemas", {});
            if (response && response.schemas) {
                response.schemas.forEach((s: ModuleSchema) => {
                    this.schemas.set(s.id, s);
                });
                this.isLoaded = true;
                return true;
            }
        } catch (e) {
            console.error("[SchemaStore] Load error:", e);
        }
        return false;
    }

    getSchema(id: string): ModuleSchema | undefined {
        return this.schemas.get(id);
    }

    getAllSchemas(): ModuleSchema[] {
        return Array.from(this.schemas.values());
    }
}

// Global instance
window.schemaStore = new SchemaStore();
