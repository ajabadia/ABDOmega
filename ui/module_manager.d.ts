/**
 * OMEGA Module Manager (TypeScript)
 * Handles dynamic instantiation of Eurorack modules.
 */
export declare class ModuleManager {
    private activeModules;
    private oscilloscopes;
    private midiViewer;
    private lastState;
    constructor();
    updateRack(state: any): Promise<void>;
    private addPlaceholder;
    private injectEmergencyModule;
    private addModule;
}
export default ModuleManager;
//# sourceMappingURL=module_manager.d.ts.map