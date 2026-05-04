/**
 * OMEGA UI CORE — Stateless Knob Renderer (Era 7.2.3)
 * Single Source of Truth for Knob HTML Structure.
 */
export interface KnobProps {
    size: string;
    colorId: string;
    value: number;
    isSelected?: boolean;
    isMain?: boolean;
    id?: string;
    rotationOffset?: number;
    rotationRange?: number;
}
export declare const renderKnobHTML: (props: KnobProps) => string;
//# sourceMappingURL=KnobRenderer.d.ts.map