/**
 * OMEGA Schema Store (Era 6)
 * Authoritative registry of module contracts.
 */

export interface ModuleSchema {
    id: string;
    name: string;
    version: any;
    metadata?: any;
    ui?: any;
    layout?: {
        hp: number;
        columns: number;
        gap?: number;
    };
    items?: any[];
    registry?: any[];
    theme?: string;
    rack?: string;
    tags?: string[];
    ui_class?: string;
}

export class SchemaStore {
    private schemas: Map<string, ModuleSchema> = new Map();
    private isLoaded: boolean = false;

    async ensureLoaded(): Promise<boolean> {
        if (this.isLoaded) return true;
        return this.reload();
    }

    async reload(): Promise<boolean> {
        try {
            const rpc = window.omegaRPC;
            if (!rpc) return false;
            
            const response = await rpc.send("getUiSchemas", {});
            console.log("[SchemaStore] RAW RESPONSE:", response);

            const rawData = response.payload || response;
            const schemas = rawData.schemas || (Array.isArray(rawData) ? rawData : null);

            if (schemas && Array.isArray(schemas)) {
                schemas.forEach((s: any) => {
                    this.schemas.set(s.id, this.normalizeSchema(s));
                });
                this.isLoaded = true;
                console.log(`[SchemaStore] Success. Loaded ${schemas.length} schemas.`);
                return true;
            }
        } catch (e) {
            console.error("[SchemaStore] Load error:", e);
        }
        return false;
    }

    private normalizeSchema(schema: any): ModuleSchema {
        if (!schema) return schema;

        // --- ERA 7 INDUSTRIAL DETECTION ---
        const isEra7 = schema.version >= 7 || schema.ui !== undefined;

        if (isEra7) {
            console.log(`[SchemaStore] Detected Era 7 Module: ${schema.id}. Preserving industrial integrity.`);
            // Sync legacy fields for components that still expect them
            if (schema.metadata) {
                schema.name = schema.name || schema.metadata.name;
                schema.hp = schema.hp || schema.metadata.rack?.hp;
                schema.rack = schema.rack || schema.metadata.rack?.slot;
            }
            return schema as ModuleSchema;
        }

        // --- ERA 6.3 RESILIENCY (LEGACY ONLY) ---
        if (!schema.items || !schema.layout) {
            console.warn(`[SchemaStore] Manifest for legacy module ${schema.id} is incomplete. Synthesizing...`);
            
            if (!schema.layout) {
                schema.layout = {
                    hp: schema.hp || 12,
                    columns: 2,
                    gap: 12
                };
            }

            schema.hp = schema.hp || schema.layout.hp;
            schema.name = schema.name || schema.id;

            if (!schema.items && schema.controls) {
                schema.items = schema.controls.map((ctrl: any, idx: number) => ({
                    paramId: ctrl.id,
                    label: ctrl.label || ctrl.id,
                    look: ctrl.type || 'knob',
                    row: Math.floor(idx / 2),
                    col: idx % 2
                }));
            }

            if (!schema.items && schema.registry) {
                const controls = schema.registry.filter((r: any) => r.front === true);
                schema.items = controls.map((r: any, idx: number) => ({
                    paramId: r.id,
                    label: r.label || r.id,
                    look: 'knob',
                    row: Math.floor(idx / 2),
                    col: idx % 2
                }));
            }
        }

        return schema as ModuleSchema;
    }

    getSchema(id: string): ModuleSchema | undefined {
        return this.schemas.get(id);
    }

    getSchemaForComponent(id: string): ModuleSchema | undefined {
        return this.getSchema(id);
    }

    getAllSchemas(): ModuleSchema[] {
        return Array.from(this.schemas.values());
    }
}

// Global instance
window.schemaStore = new SchemaStore();
