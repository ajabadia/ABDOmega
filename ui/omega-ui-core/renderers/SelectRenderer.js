/* =================================================================
   DO NOT EDIT - Synced from ABDSynthsWeb/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/
   ================================================================= */
export const renderSelectHTML = (props) => {
    const { size, colorId, value, options = [], id } = props;
    // Resolve current label based on normalized value
    const labels = options.length > 0 ? options : ['NO OPTIONS'];
    const currentIndex = Math.min(labels.length - 1, Math.floor(value * labels.length));
    const currentLabel = labels[currentIndex];
    return `
    <div class="mini-select size-${size} color-${colorId}" ${id ? `data-source="${id}"` : ''}>
      <div class="select-value">${(currentLabel || '').toUpperCase()}</div>

      <div class="select-arrow">▼</div>
    </div>
  `.trim();
};
//# sourceMappingURL=SelectRenderer.js.map