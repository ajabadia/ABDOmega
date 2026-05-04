/* =================================================================
   DO NOT EDIT - Synced from ABDSynthsWeb/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/
   ================================================================= */
/**
 * OMEGA Cell Orchestrator (Era 7.2.3)
 * The Single Source of Truth for Component Layout and Attachment Stacking.
 */
import { renderKnobHTML } from './KnobRenderer.js';
import { renderPortHTML } from './PortRenderer.js';
import { renderLedHTML } from './LedRenderer.js';
import { renderSliderHTML } from './SliderRenderer.js';
import { renderDisplayHTML } from './DisplayRenderer.js';
import { renderSwitchHTML } from './SwitchRenderer.js';
import { renderStepperHTML } from './StepperRenderer.js';
import { renderSelectHTML } from './SelectRenderer.js';
import { AttachmentRenderer } from './AttachmentRenderer.js';
const RADIUS_MAP = {
    knob: { A: 24, B: 18, C: 12, D: 9 },
    port: { A: 21, B: 18, C: 15, D: 12 },
    display: { A: 16.5, B: 13, C: 10, D: 7 },
    led: { A: 6, B: 4, C: 2.5, D: 1.5 },
    slider: { A: 6, B: 6, C: 6, D: 6 },
    switch: { A: 16, B: 12, C: 10, D: 8 },
    stepper: { A: 12, B: 9, C: 7, D: 6 },
    select: { A: 12, B: 12, C: 12, D: 12 }
};
export class CellRenderer {
    /**
     * Calculates the physical radius of a component based on its metadata.
     */
    static getComponentRadius(item) {
        const variant = item.presentation?.variant || 'B_cyan';
        const parts = variant.split('_');
        let size = parts[0] || 'B';
        // Industrial Mapping for special sizes
        if (variant.includes('_3mm'))
            size = 'D';
        if (variant.includes('_5mm'))
            size = 'C';
        const comp = item.presentation?.component || 'knob';
        const typeKey = comp.includes('slider') ? 'slider' : comp;
        const sizeMap = RADIUS_MAP[typeKey] || RADIUS_MAP.knob;
        const radius = sizeMap ? sizeMap[size] : 12;
        return radius || 12;
    }
    /**
     * Renders the complete HTML for a cell, including its main component and all orbitant attachments.
     */
    static renderCellHTML(item, options) {
        const { skin, runtimeValue, steps, isSelected, isLiveMode } = options;
        const compType = item.presentation?.component || 'knob';
        const variant = item.presentation?.variant || 'B_cyan';
        // Precise variant parsing
        const parts = variant.split('_');
        let size = parts[0] || 'B';
        if (variant.includes('_3mm'))
            size = 'D';
        if (variant.includes('_5mm'))
            size = 'C';
        const colorId = parts.length > 1 ? parts.filter((p) => p !== size && p !== '3mm' && p !== '5mm').join('_') : 'cyan';
        const compRadius = this.getComponentRadius(item);
        // 1. Render Main Primitive
        let mainHTML = '';
        const commonProps = {
            size,
            colorId,
            value: runtimeValue,
            id: item.id,
            isSelected: !!isSelected,
            isMain: true
        };
        switch (compType) {
            case 'knob':
                mainHTML = renderKnobHTML({ ...commonProps });
                break;
            case 'port':
                mainHTML = renderPortHTML({
                    ...commonProps,
                    label: item.label || '',
                    explicitColor: variant
                });
                break;
            case 'led':
                mainHTML = renderLedHTML({ ...commonProps });
                break;
            case 'display':
                const mode = parts.includes('lcd') ? 'lcd' : (parts.includes('led') ? 'led' : 'oled');
                mainHTML = renderDisplayHTML({ ...commonProps, mode, steps });
                break;
            case 'slider-v':
            case 'slider-h':
                mainHTML = renderSliderHTML({ ...commonProps, type: compType });
                break;
            case 'switch':
                mainHTML = renderSwitchHTML({ ...commonProps });
                break;
            case 'stepper':
            case 'button':
            case 'push':
                mainHTML = renderStepperHTML({
                    ...commonProps,
                    type: compType,
                    text: item.label || ''
                });
                break;
            case 'select':
                mainHTML = renderSelectHTML({
                    ...commonProps,
                    options: item.presentation?.options || [item.presentation?.lookup || '']
                });
                break;
            default:
                mainHTML = `<!-- Unsupported Component: ${compType} -->`;
        }
        // 2. Render Attachment Stacks
        const attachments = item.presentation?.attachments || [];
        const renderStack = (pos) => {
            const stackItems = attachments.filter((a) => a.position === pos);
            if (stackItems.length === 0)
                return '';
            const itemsHTML = stackItems.map((a) => {
                const html = AttachmentRenderer.renderAttachmentHTML({
                    type: a.type,
                    variant: a.variant,
                    text: a.text || ''
                });
                // Apply manual offsets from manifest if present
                const offX = (a.offsetX || 0) * 1.5;
                const offY = (a.offsetY || 0) * 1.5;
                return `<div style="transform: translate(${offX}px, ${offY}px)">${html}</div>`;
            }).join('');
            return `<div class="attachment-stack stack-${pos}">${itemsHTML}</div>`;
        };
        // 3. Assemble Final Cell
        const cellOffsetX = (item.presentation?.offsetX || 0) * 1.5;
        const cellOffsetY = (item.presentation?.offsetY || 0) * 1.5;
        return `
      <div class="control-cell variant-${variant}" style="--comp-radius: ${compRadius}px;">
        ${renderStack('top')}
        ${renderStack('bottom')}
        ${renderStack('left')}
        ${renderStack('right')}
        <div class="cell-main" style="width: ${compRadius * 2 * 1.5}px; height: ${compRadius * 2 * 1.5}px; transform: translate(calc(-50% + ${cellOffsetX}px), calc(-50% + ${cellOffsetY}px))">
          ${mainHTML}
        </div>
      </div>
    `.trim();
    }
}
//# sourceMappingURL=CellRenderer.js.map