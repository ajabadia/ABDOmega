/* =================================================================
   DO NOT EDIT - Synced from ABDSynthsWeb/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/
   ================================================================= */
export class AttachmentRenderer {
    static renderAttachmentHTML(props) {
        const { type, variant, text = '' } = props;
        if (type === 'label') {
            const parts = (variant || 'B_cyan').split('_');
            const sizeClass = parts[0] || 'B';
            const colorVariant = variant || 'B_cyan';
            const sizes = { A: 12, B: 9, C: 7, D: 6 };
            const fontSize = sizes[sizeClass] || 9;
            return `
        <div class="attachment-label variant-${colorVariant}" style="font-size: ${fontSize}px;">
          ${text.toUpperCase()}
        </div>
      `;
        }
        return `<!-- Unknown Attachment Type: ${type} -->`;
    }
}
//# sourceMappingURL=AttachmentRenderer.js.map