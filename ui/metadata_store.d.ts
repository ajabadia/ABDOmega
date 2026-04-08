/**
 * OMEGA Metadata Store (TypeScript)
 * Formalizes the "Single Source of Truth" for parameters.
 */
export interface ParamDescriptor {
    id: string;
    name: string;
    min: number;
    max: number;
    default: number;
    unit?: string;
    groupId?: string;
    category?: string;
    uiControl?: string;
    cc?: number;
    options?: {
        value: number;
        label: string;
    }[];
}
export interface GroupDescriptor {
    id: string;
    name: string;
}
export declare class MetadataStore {
    private parameters;
    private groups;
    private inventory;
    private isLoaded;
    private version;
    private build;
    private timestamp;
    constructor();
    ensureLoaded(): Promise<boolean>;
    getParam(id: string): ParamDescriptor | undefined;
    getAllParams(): ParamDescriptor[];
    getGroup(id: string): GroupDescriptor | undefined;
    getModulationMetadata(): Promise<any>;
    getInventoryItem(id: string): any;
    getVersion(): string;
    getBuild(): string;
    getTimestamp(): string;
}
//# sourceMappingURL=metadata_store.d.ts.map