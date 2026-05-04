/* =================================================================
   DO NOT EDIT - Synced from ABDSynthsWeb/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/
   ================================================================= */

/**
 * OMEGA UI CORE — Stateless Slider Renderer (Era 7.2.3)
 * Single Source of Truth for Slider HTML Structure.
 */

export interface SliderProps {
  type: 'slider-v' | 'slider-h';
  size: string;      // A, B, C, D
  colorId: string;   // cyan, orange, etc.
  value: number;     // 0.0 to 1.0
  id?: string;       // Canonical ID
}

export const renderSliderHTML = (props: SliderProps): string => {
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
