/* =================================================================
   DO NOT EDIT - Synced from ABDSynthsWeb/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/
   ================================================================= */

/**
 * OMEGA UI CORE — Stateless Knob Renderer (Era 7.2.3)
 * Single Source of Truth for Knob HTML Structure.
 */

export interface KnobProps {
  size: string;          // A, B, C, D
  colorId: string;       // cyan, orange, etc.
  value: number;         // 0.0 to 1.0
  isSelected?: boolean;
  isMain?: boolean;
  id?: string;           // Canonical ID
  rotationOffset?: number; // Standard: -135
  rotationRange?: number;  // Standard: 270
}

export const renderKnobHTML = (props: KnobProps): string => {
  const { 
    size, 
    colorId, 
    value, 
    isSelected, 
    isMain, 
    id, 
    rotationOffset = -135, 
    rotationRange = 270 
  } = props;
  
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
