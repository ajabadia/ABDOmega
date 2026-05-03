export declare class ModuleManager {
    private activeModules;
    private lastState;
    private isRendering;
    private lastFingerprint;
    private pendingState;
    private renderGeneration;
    constructor();
    private normalizeList;
    updateRack(state: any): Promise<void>;
    private renderModuleItem;
    private renderContractError;
    private addModule;
    private cleanupModules;
    private getCanonicalId;
}
export default ModuleManager;
//# sourceMappingURL=module_manager.d.ts.map