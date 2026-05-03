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
export declare class SchemaStore {
    private schemas;
    private isLoaded;
    ensureLoaded(): Promise<boolean>;
    reload(): Promise<boolean>;
    private normalizeSchema;
    getSchema(id: string): ModuleSchema | undefined;
    getSchemaForComponent(id: string): ModuleSchema | undefined;
    getAllSchemas(): ModuleSchema[];
}
//# sourceMappingURL=SchemaStore.d.ts.map