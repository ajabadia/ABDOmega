/**
 * OMEGA Module Patch Modal (TypeScript)
 * The 'Pocket Patchbay' for focused module routing.
 */
export declare class ModulePatchModal {
    private el;
    private titleEl;
    private subtitleEl;
    private inputsList;
    private outputsList;
    private usageFill;
    private usageText;
    private currentInstanceId;
    private inventory;
    private modMatrix;
    constructor();
    private init;
    private ensureElements;
    open(instanceId: string): Promise<void>;
    refresh(): Promise<void>;
    private render;
    private renderSection;
    private renderSlotRow;
    private showNewSlotRow;
    private getCompatibleOptions;
    private updateUsage;
    /**
     * Reactive State Synchronization
     * Called by the main app loop when the preset state changes.
     */
    onStateUpdate(state: any): void;
    private applyPatch;
    private updateSlotParam;
    private removePatch;
}
//# sourceMappingURL=ModulePatchModal.d.ts.map