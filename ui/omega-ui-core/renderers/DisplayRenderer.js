/* =================================================================
   DO NOT EDIT - Synced from ABDSynthsWeb/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/
   ================================================================= */
export const renderDisplayHTML = (props) => {
    const { size, colorId, mode, value, steps, id } = props;
    const displayValue = Math.round(value * (steps || 100));
    return `
    <div class="mini-display variant-${mode} size-${size} color-${colorId}" ${id ? `data-source="${id}"` : ''}>
      <button class="display-btn minus" data-action="step-down">−</button>
      <div class="display-value">${displayValue}</div>
      <button class="display-btn plus" data-action="step-up">+</button>
    </div>
  `.trim();
};
//# sourceMappingURL=DisplayRenderer.js.map