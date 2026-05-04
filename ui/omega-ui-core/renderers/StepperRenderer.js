/* =================================================================
   DO NOT EDIT - Synced from ABDSynthsWeb/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/
   ================================================================= */
export const renderStepperHTML = (props) => {
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
//# sourceMappingURL=StepperRenderer.js.map