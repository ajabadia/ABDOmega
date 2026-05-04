/* =================================================================
   DO NOT EDIT - Synced from ABDSynthsWeb/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/
   ================================================================= */
export const renderKnobHTML = (props) => {
    const { size, colorId, value, isSelected, isMain, id, rotationOffset = -135, rotationRange = 270 } = props;
    // Canonical rotation formula
    const rotation = rotationOffset + (value * rotationRange);
    const selectedClass = isMain && isSelected ? 'selected' : '';
    const classes = [
        'knob-container',
        `size-${size}`,
        `color-${colorId}`,
        selectedClass
    ].filter(Boolean).join(' ');
    return `
    <div class="${classes}" ${id ? `data-source="${id}"` : ''}>
      <div class="knob-cap"></div>
      <div class="knob-marker" style="transform: rotate(${rotation}deg)"></div>
    </div>
  `.trim();
};
//# sourceMappingURL=KnobRenderer.js.map