/**
 * OMEGA UI CORE — Stateless Slider Renderer (Era 7.2.3)
 * Single Source of Truth for Slider HTML Structure.
 */
export interface SliderProps {
    type: 'slider-v' | 'slider-h';
    size: string;
    colorId: string;
    value: number;
    id?: string;
}
export declare const renderSliderHTML: (props: SliderProps) => string;
//# sourceMappingURL=SliderRenderer.d.ts.map