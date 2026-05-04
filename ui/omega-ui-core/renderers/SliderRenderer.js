/* =================================================================
   DO NOT EDIT - Synced from ABDSynthsWeb/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/
   ================================================================= */
export const renderSliderHTML = (props) => {
    const { type, size, colorId, value, id } = props;
    const isHoriz = type === 'slider-h';
    // Logic synced with VPC v1.1
    const railStyle = isHoriz
        ? `width: calc(${value * 100}% - 4px)`
        : `height: calc(${value * 100}% - 4px)`;
    const capStyle = isHoriz
        ? `left: calc(${value * 90}%)`
        : `bottom: calc(${value * 90}%)`;
    return `
    <div class="slider-wrapper ${type} size-${size} color-${colorId}" ${id ? `data-source="${id}"` : ''}>
      <div class="slider-rail-active" style="${railStyle}"></div>
      <div class="slider-cap" style="${capStyle}"></div>
    </div>
  `.trim();
};
//# sourceMappingURL=SliderRenderer.js.map