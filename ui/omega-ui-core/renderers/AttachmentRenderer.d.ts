/**
 * OMEGA Attachment Renderer (Era 7.2.3)
 * Stateless HTML generator for orbitant labels and technical markers.
 */
export interface AttachmentProps {
    type: string;
    variant: string;
    text?: string;
    offsetX?: number;
    offsetY?: number;
}
export declare class AttachmentRenderer {
    static renderAttachmentHTML(props: AttachmentProps): string;
}
//# sourceMappingURL=AttachmentRenderer.d.ts.map