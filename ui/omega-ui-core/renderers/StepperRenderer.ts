/* =================================================================
   DO NOT EDIT - Synced from ABDSynthsWeb/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/
   ================================================================= */

/**
 * OMEGA UI CORE — Stateless Stepper/Button Renderer (Era 7.2.3)
 * Single Source of Truth for Industrial Buttons and Incremental Selectors.
 */

export interface StepperProps {
  type: 'stepper' | 'button' | 'push';
  size: string;      // A, B, C, D
  colorId: string;   // cyan, red, orange, etc.
  value: number;     // 0 (off) or 1 (pressed)
  text?: string;     // Label inside the button
  id?: string;       // Canonical ID
}

export const renderStepperHTML = (props: StepperProps): string => {
  const { type, size, colorId, value, text, id } = props;
  const isPressed = value >= 0.5;

  const content = text 
    ? `<span class="stepper-text">${text.toUpperCase()}</span>`
    : `<div class="stepper-dot"></div>`;

  return `
    <div class="stepper-container type-${type} size-${size} color-${colorId} ${isPressed ? 'pressed' : ''}" 
         ${id ? `data-source="${id}"` : ''} 
         data-type="${type}">
      ${content}
    </div>
  `.trim();
};
