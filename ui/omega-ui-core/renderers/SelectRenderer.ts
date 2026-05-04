/* =================================================================
   DO NOT EDIT - Synced from ABDSynthsWeb/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/
   ================================================================= */

/**
 * OMEGA UI CORE — Stateless Select Renderer (Era 7.2.3)
 * Single Source of Truth for Industrial Dropdown Menus.
 */

export interface SelectProps {
  size: string;      // A, B, C, D
  colorId: string;   // cyan, orange, etc.
  value: number;     // Normalized index (0.0 to 1.0)
  options?: string[]; // List of available labels
  id?: string;       // Canonical ID
}

export const renderSelectHTML = (props: SelectProps): string => {
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
