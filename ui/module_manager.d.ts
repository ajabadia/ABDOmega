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
    /**
     * Increments or decrements a parameter value by a single step.
     * Used by shared stateless components like the Display primitive.
     */
    stepParameter(id: string, step: number): void;
    private cleanupModules;
    private getCanonicalId;
}
export default ModuleManager;
//# sourceMappingURL=module_manager.d.ts.map