/* =================================================================
   DO NOT EDIT - Synced from ABDSynthsWeb/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/
   ================================================================= */

/**
 * OMEGA UI CORE — Stateless Port (Jack) Renderer (Era 7.2.3)
 * Single Source of Truth for Port HTML Structure.
 */

export interface PortProps {
  size: string;          // A, B, C, D
  colorId: string;       // Default color from variant (cyan, accent, etc.)
  value: number;         // Signal value 0.0 to 1.0
  isSelected?: boolean;
  isMain?: boolean;
  id?: string;           // Canonical ID for data attributes
  label?: string;        // For color inference
  explicitColor?: string; // Explicit color from manifest (B_cyan, neon_amber)
}

/**
 * Infers the technical signal color based on ID/Label/Variant
 * Syced with VPC v1.1 standards.
 */
export const inferPortSignalColor = (id: string = '', label: string = '', explicitColor?: string): string => {
  if (explicitColor) return `var(--signal-${explicitColor.toLowerCase().replace('b_', '')}, var(--wb-primary))`;
  
  const searchStr = `${id} ${label}`.toLowerCase();

  if (searchStr.includes('midi')) return 'var(--signal-midi)';
  if (searchStr.includes('gate') || searchStr.includes('trig')) return 'var(--signal-gate)';
  if (searchStr.includes('cv') || searchStr.includes('mod')) return 'var(--signal-cv)';
  if (searchStr.includes('pitch') || searchStr.includes('freq') || searchStr.includes('out') || searchStr.includes('in')) return 'var(--signal-audio)';
  
  return 'var(--wb-primary)';
};

export const renderPortHTML = (props: PortProps): string => {
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
