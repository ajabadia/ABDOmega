/**
 * OMEGA Module Renderer (TypeScript)
 * Generic engine for declarative UI modules.
 * ERA 6: Pure Aseptic Contract Rendering
 */
export interface LayoutItem {
    id?: string;
    paramId?: string;
    paramIdY?: string;
    paramGroup?: string;
    source?: string;
    portId?: string;
    look?: 'knob' | 'slider-v' | 'slider-h' | 'display' | 'select' | 'led' | 'switch' | 'meter' | 'button' | 'toggle' | 'telemetry';
    label?: string;
    row: number;
    col: number;
    colSpan?: number;
    variant?: string;
    color?: string;
    order?: number;
}
export interface ModuleDescriptor {
    id: string;
    version?: string;
    hp?: number;
    title?: string;
    panelClass?: string;
    uiLayout?: {
        columns: number;
        rows?: number;
        gap?: number;
    };
    registry?: any[];
    items: LayoutItem[];
    theme?: string;
}
export declare class ModuleRenderer {
    private el;
    private content;
    private descriptor;
    private values;
    private isInitialized;
    constructor(el: HTMLElement, content: HTMLElement, descriptor: ModuleDescriptor);
    private normalizeDescriptor;
    private getRegistryEntity;
    init(): Promise<void>;
    render(): void;
    private renderItem;
    private buildControlCell;
    private renderAttachment;
    private renderComponent;
    private bind;
    private _bindKnob;
    private _bindDisplay;
    setParam(id: string, value: number): void;
    updateControlUI(id: string, value: number): void;
    private _getEntityValueLabel;
    private _updateKnobVisual;
    private syncAllFromStore;
    private updateTelemetryUI;
    onStateUpdate(state: any): void;
}
export default ModuleRenderer;
//# sourceMappingURL=module_renderer.d.ts.map