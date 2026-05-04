/* =================================================================
   DO NOT EDIT - Synced from ABDSynthsWeb/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/
   ================================================================= */
/**
 * Infers the technical signal color based on ID/Label/Variant
 * Syced with VPC v1.1 standards.
 */
export const inferPortSignalColor = (id = '', label = '', explicitColor) => {
    if (explicitColor)
        return `var(--signal-${explicitColor.toLowerCase().replace('b_', '')}, var(--wb-primary))`;
    const searchStr = `${id} ${label}`.toLowerCase();
    if (searchStr.includes('midi'))
        return 'var(--signal-midi)';
    if (searchStr.includes('gate') || searchStr.includes('trig'))
        return 'var(--signal-gate)';
    if (searchStr.includes('cv') || searchStr.includes('mod'))
        return 'var(--signal-cv)';
    if (searchStr.includes('pitch') || searchStr.includes('freq') || searchStr.includes('out') || searchStr.includes('in'))
        return 'var(--signal-audio)';
    return 'var(--wb-primary)';
};
export const renderPortHTML = (props) => {
    const { size, colorId, value, isSelected, isMain, id, label, explicitColor } = props;
    const signalColor = inferPortSignalColor(id, label, explicitColor);
    const opacity = 0.3 + (value * 0.7);
    const selectedClass = isMain && isSelected ? 'selected' : '';
    const classes = [
        'port-socket',
        `size-${size}`,
        `color-${colorId}`,
        selectedClass
    ].filter(Boolean).join(' ');
    const ledStyle = `background-color: ${signalColor}; opacity: ${opacity};`;
    return `<div class="${classes}" ${id ? `data-source="${id}"` : ''}><div class="port-inner"><div class="port-led" style="${ledStyle}"></div></div></div>`;
};
//# sourceMappingURL=PortRenderer.js.map