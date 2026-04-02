/**
 * OMEGA Modulation Matrix 2.0 / Modulation Hub
 * Features a compact Launcher in the rack and a high-density 8x4 Workspace.
 */
export declare class ModuleModMatrix {
    private el;
    private content;
    private options;
    private state;
    private sources;
    private targets;
    private viewMode;
    private manualChangeTimer;
    private selectedSlot;
    constructor(el: HTMLElement, content: HTMLElement, options: any);
    private loadMetadata;
    private renderLauncher;
    private toggleWorkspace;
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
//# sourceMappingURL=ModuleModMatrix.d.ts.map