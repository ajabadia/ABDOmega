/**
 * OMEGA Module Renderer (TypeScript)
 * Generic engine for declarative UI modules.
 */
export interface LayoutItem {
    paramId: string;
    control: 'knob' | 'slider-v' | 'toggle' | 'select' | 'telemetry';
    label?: string;
    row: number;
    col: number;
    colSpan?: number;
    variant?: string;
}
export interface ModuleDescriptor {
    id: string;
    title?: string;
    panelClass?: string;
    toolbarFocusIndex?: number;
    grid?: {
        columns: number;
        gap: number;
    };
    items: LayoutItem[];
    footer?: {
        paramId?: string;
        label?: string;
    };
}
export declare class ModuleRenderer {
    private el;
    private content;
    private descriptor;
    private values;
    private isInitialized;
    constructor(el: HTMLElement, content: HTMLElement, descriptor: ModuleDescriptor);
    init(): Promise<void>;
    render(): void;
    private renderItem;
    private renderFooter;
    private bind;
    private _bindKnob;
    setParam(id: string, value: number): void;
    updateControlUI(id: string, value: number): void;
    private _updateKnobVisual;
    onStateUpdate(state: any): void;
    private updatePortsUI;
}
export default ModuleRenderer;
//# sourceMappingURL=module_renderer.d.ts.map