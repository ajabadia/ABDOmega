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
    private renderContractError;
    private addModule;
    private getCanonicalId;
}
export default ModuleManager;
//# sourceMappingURL=module_manager.d.ts.map