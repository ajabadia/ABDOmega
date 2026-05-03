/**
 * OMEGA Module Renderer (TypeScript)
 * Generic engine for declarative UI modules.
 * ERA 7: High-Fidelity Absolute Positioning & Multi-Tab Interface
 */
export declare class ModuleRenderer {
    private el;
    private content;
    private descriptor;
    private values;
    private isInitialized;
    private activeTab;
    private readonly RENDER_SCALE;
    private activityTimeouts;
    constructor(el: HTMLElement, content: HTMLElement, options: any);
    init(): Promise<void>;
    private subscribeToTelemetry;
    private getRegistryEntity;
    render(): void;
    private renderItem;
    private shouldRenderInTab;
    private renderContainers;
    private resolveContainerWidth;
    private renderAttachmentGroup;
    private _getFormattedValue;
    private renderComponent;
    private bind;
    private _bindKnob;
    private _bindDisplay;
    setParam(id: string, value: number): void;
    updateControlUI(id: string, value: number): void;
    private triggerContainerActivity;
    private _getEntityValueLabel;
    private _updateKnobVisual;
    private syncAllFromStore;
    private updateTelemetryUI;
    private _inferPortColor;
    onStateUpdate(state: any): void;
}
export default ModuleRenderer;
//# sourceMappingURL=module_renderer.d.ts.map