/**
 * OMEGA UI CORE — Stateless Display Renderer (Era 7.2.3)
 * Single Source of Truth for Display HTML Structure.
 */
export interface DisplayProps {
    size: string;
    colorId: string;
    mode: string;
    value: number;
    steps: number;
    id?: string;
}
export declare const renderDisplayHTML: (props: DisplayProps) => string;
//# sourceMappingURL=DisplayRenderer.d.ts.map