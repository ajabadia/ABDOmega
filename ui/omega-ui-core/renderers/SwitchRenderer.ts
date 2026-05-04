/* =================================================================
   DO NOT EDIT - Synced from ABDSynthsWeb/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/
   ================================================================= */

/**
 * OMEGA UI CORE — Stateless Switch Renderer (Era 7.2.3)
 * Single Source of Truth for Industrial Toggle Switches.
 */

export interface SwitchProps {
  size: string;      // A, B, C, D
  colorId: string;   // cyan, red, orange, etc.
  value: number;     // 0 (off) or 1 (on)
  id?: string;       // Canonical ID
}

export const renderSwitchHTML = (props: SwitchProps): string => {
  const { size, colorId, value, id } = props;
  const isActive = value >= 0.5;

  return `
    <div class="switch-container size-${size} color-${colorId}" ${id ? `data-source="${id}"` : ''}>
      <div class="sw-led ${!isActive ? 'active' : ''}"></div>
      <div class="sw-led ${isActive ? 'active' : ''}"></div>
    </div>
  `.trim();
};
