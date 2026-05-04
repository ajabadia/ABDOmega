export declare class ModuleRenderer {
    private el;
    private content;
    private descriptor;
    private values;
    private isInitialized;
    private activeTab;
    private readonly RENDER_SCALE;
    constructor(el: HTMLElement, content: HTMLElement, options: any);
    init(): Promise<void>;
    private subscribeToTelemetry;
    render(): void;
    private renderItem;
    private shouldRenderInTab;
    private renderContainers;
    private resolveContainerWidth;
    private getRegistryEntity;
    private bind;
    private _bindKnob;
    private _bindSlider;
    private _handleSliderMove;
    setParam(id: string, value: number): void;
    updateControlUI(id: string, value: number): void;
    private triggerContainerActivity;
    private _getFormattedValue;
    private _getEntityValueLabel;
    private syncAllFromStore;
    private updateTelemetryUI;
    private _inferPortColor;
    onStateUpdate(state: any): void;
}
export default ModuleRenderer;
//# sourceMappingURL=module_renderer.d.ts.map