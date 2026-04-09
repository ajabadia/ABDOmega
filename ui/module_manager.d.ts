/**
 * OMEGA Module Manager (TypeScript)
 * Handles dynamic instantiation of Eurorack modules.
 */
export declare class ModuleManager {
    private activeModules;
    private oscilloscopes;
    private midiViewer;
    private lastState;
    private isRendering;
    private lastModuleCount;
    constructor();
    private normalizeList;
    updateRack(state: any): Promise<void>;
    private addPlaceholder;
    private injectEmergencyModule;
    private addModule;
    private getCanonicalId;
    private resolveDescriptor;
}
export default ModuleManager;
//# sourceMappingURL=module_manager.d.ts.map