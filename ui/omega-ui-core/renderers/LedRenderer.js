/* =================================================================
   DO NOT EDIT - Synced from ABDSynthsWeb/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/
   ================================================================= */
export const renderLedHTML = (props) => {
    const { size, colorId, value, id, transform } = props;
    // Calculate visibility/glow based on value
    const isActive = value > 0.05;
    const opacity = 0.3 + (value * 0.7);
    // Industrial Pattern: .led.size-X.color-Y[.active]
    const classes = [
        'led',
        `size-${size}`,
        `color-${colorId}`,
        isActive ? 'active' : ''
    ].filter(Boolean).join(' ');
    const style = [
        `opacity: ${opacity}`,
        transform || ''
    ].filter(Boolean).join('; ');
    return `<div class="${classes}" ${id ? `data-source="${id}"` : ''} style="${style}"></div>`;
};
//# sourceMappingURL=LedRenderer.js.map