/**
 * OMEGA UI CORE — Stateless Port (Jack) Renderer (Era 7.2.3)
 * Single Source of Truth for Port HTML Structure.
 */
export interface PortProps {
    size: string;
    colorId: string;
    value: number;
    isSelected?: boolean;
    isMain?: boolean;
    id?: string;
    label?: string;
    explicitColor?: string;
}
/**
 * Infers the technical signal color based on ID/Label/Variant
 * Syced with VPC v1.1 standards.
 */
export declare const inferPortSignalColor: (id?: string, label?: string, explicitColor?: string) => string;
export declare const renderPortHTML: (props: PortProps) => string;
//# sourceMappingURL=PortRenderer.d.ts.map