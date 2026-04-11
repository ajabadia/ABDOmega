/**
 * OMEGA Module Renderer (TypeScript)
 * Generic engine for declarative UI modules.
 */
export interface LayoutItem {
    id?: string;
    paramId?: string;
    paramIdY?: string;
    paramGroup?: string;
    source?: string;
    portId?: string;
    control?: string;
    semantic?: 'scalar' | 'vector' | 'list' | 'toggle' | 'trigger' | 'port' | 'telemetry' | 'monitor' | 'label' | 'graph' | 'state' | 'keyboard';
    look?: 'knob' | 'slider-v' | 'slider-h' | 'display' | 'select' | 'led' | 'jack' | 'switch' | 'meter' | 'button' | 'joystick' | 'scope' | 'graph' | 'adsr';
    label?: string;
    row: number;
    col: number;
    colSpan?: number;
    variant?: string;
    color?: string;
}
export interface PortDescriptor {
    id: string;
    label: string;
    type: 'voltage' | 'midi' | 'list' | 'float' | 'text' | 'bool';
    direction: 'input' | 'output';
}
export interface ModuleDescriptor {
    id: string;
    version?: string;
    hp?: number;
    title?: string;
    panelClass?: string;
    toolbarFocusIndex?: number;
    uiLayout?: {
        columns: number;
        rows?: number;
        gap?: number;
    };
    ports?: PortDescriptor[];
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
    private normalizeDescriptor;
    init(): Promise<void>;
    render(): void;
    private renderItem;
    private renderFooter;
    private bind;
    private _bindKnob;
    setParam(id: string, value: number): void;
    updateControlUI(id: string, value: number): void;
    private _getParamValueLabel;
    private _bindDisplay;
    private _updateKnobVisual;
    onStateUpdate(state: any): void;
    private updateTelemetryUI;
    private updatePortsUI;
}
export default ModuleRenderer;
//# sourceMappingURL=module_renderer.d.ts.map