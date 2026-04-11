/**
 * OMEGA Unified Module Patch Modal
 * Standardized for Era 5.2 Aseptic Meta-Engine.
 */
export declare class ModulePatchModal {
    private el;
    private tabsContainer;
    private viewport;
    private currentInstanceId;
    private activeTab;
    private currentTabs;
    private currentManifest;
    private patchbayMatrix;
    private maxSlots;
    constructor();
    private init;
    open(instanceId: string, manifest: any): Promise<void>;
    close(): void;
    private renderTabs;
    private switchTab;
    private renderGroups;
    private isPair;
    private renderParameterRow;
    /**
     * ERA 5.2 STANDARD: Control Cell Generator
     */
    private buildControlCell;
    private renderPatchingSanctuary;
    onStateUpdate(state: any): void;
}
//# sourceMappingURL=ModulePatchModal.d.ts.map