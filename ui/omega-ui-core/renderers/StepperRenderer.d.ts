/**
 * OMEGA UI CORE — Stateless Stepper/Button Renderer (Era 7.2.3)
 * Single Source of Truth for Industrial Buttons and Incremental Selectors.
 */
export interface StepperProps {
    type: 'stepper' | 'button' | 'push';
    size: string;
    colorId: string;
    value: number;
    text?: string;
    id?: string;
}
export declare const renderStepperHTML: (props: StepperProps) => string;
//# sourceMappingURL=StepperRenderer.d.ts.map