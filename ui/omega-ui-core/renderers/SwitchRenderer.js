/* =================================================================
   DO NOT EDIT - Synced from ABDSynthsWeb/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/
   ================================================================= */
export const renderSwitchHTML = (props) => {
    const { size, colorId, value, id } = props;
    const isActive = value >= 0.5;
    return `
    <div class="switch-container size-${size} color-${colorId}" ${id ? `data-source="${id}"` : ''}>
      <div class="sw-led ${!isActive ? 'active' : ''}"></div>
      <div class="sw-led ${isActive ? 'active' : ''}"></div>
    </div>
  `.trim();
};
//# sourceMappingURL=SwitchRenderer.js.map