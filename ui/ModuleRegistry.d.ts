export interface ModuleDescriptor {
    id: string;
    name: string;
    family: string;
    isInstantiable: boolean;
    hasInventory: boolean;
    hasSchema: boolean;
    manifest?: any;
    schema?: any;
}
export declare class ModuleRegistry {
    private static catalog;
    private static constructors;
    static register(id: string, constructor: any): void;
    static getConstructor(id: string): any;
    static bootstrap(): Promise<void>;
    static getModuleDescriptor(id: string): ModuleDescriptor | undefined;
    static getInstantiableModules(): ModuleDescriptor[];
}
//# sourceMappingURL=ModuleRegistry.d.ts.map