export declare class ModulePatchbayMatrix {
    private el;
    private content;
    private options;
    private state;
    private sources;
    private targets;
    private viewMode;
    private manualChangeTimer;
    private selectedSlot;
    private maxSlots;
    constructor(options?: any);
    private ensureElements;
    private syncMaxSlots;
    private loadMetadata;
    toggleWorkspace(open: boolean): void;
    private isWorkspaceOpen;
    onStateUpdate(state: any): void;
    private triggerActivity;
    private renderWorkspace;
    private renderCard;
    private getAmountColor;
    private addModulation;
    private renderInspector;
    private getBipolarStyle;
    private getNameForId;
    private generateOptions;
    private setupSelectionListeners;
    private attachWorkspaceListeners;
    private updateFromMouse;
    private attachInspectorListeners;
    private sendUpdate;
}
//# sourceMappingURL=ModulePatchbayMatrix.d.ts.map