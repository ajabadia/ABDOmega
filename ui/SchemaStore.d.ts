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
export declare class SchemaStore {
    private schemas;
    private isLoaded;
    ensureLoaded(): Promise<boolean>;
    getSchema(id: string): ModuleSchema | undefined;
    getAllSchemas(): ModuleSchema[];
}
//# sourceMappingURL=SchemaStore.d.ts.map