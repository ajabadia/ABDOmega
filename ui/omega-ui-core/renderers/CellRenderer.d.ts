export interface Attachment {
    type: string;
    variant: string;
    text?: string;
    position: 'top' | 'bottom' | 'left' | 'right';
    offsetX?: number;
    offsetY?: number;
}
export interface ManifestEntity {
    id: string;
    label?: string;
    type?: string;
    presentation?: {
        component?: string;
        variant?: string;
        offsetX?: number;
        offsetY?: number;
        attachments?: Attachment[];
        options?: string[];
        lookup?: string;
    };
}
export interface CellOptions {
    skin: string;
    zoom: number;
    runtimeValue: number;
    steps: number;
    isSelected?: boolean;
    isLiveMode?: boolean;
}
export declare class CellRenderer {
    /**
     * Calculates the physical radius of a component based on its metadata.
     */
    static getComponentRadius(item: ManifestEntity): number;
    /**
     * Renders the complete HTML for a cell, including its main component and all orbitant attachments.
     */
    static renderCellHTML(item: ManifestEntity, options: CellOptions): string;
}
//# sourceMappingURL=CellRenderer.d.ts.map