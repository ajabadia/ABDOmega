/**
 * OMEGA UI CORE — Stateless LED Renderer (Era 7.2.3)
 * Single Source of Truth for LED HTML Structure.
 */
export interface LedProps {
    size: string;
    colorId: string;
    value: number;
    id?: string;
    transform?: string;
}
export declare const renderLedHTML: (props: LedProps) => string;
//# sourceMappingURL=LedRenderer.d.ts.map