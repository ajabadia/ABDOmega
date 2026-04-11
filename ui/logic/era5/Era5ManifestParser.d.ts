/**
 * OMEGA Era 5.2 Manifest Parser
 * Translates the role-based registry and aseptic layout into a structured UI Model.
 */
export interface Era5Entity {
    id: string;
    label: string;
    roles: string[];
    direction: 'input' | 'output' | 'internal';
    precision?: number;
    range?: {
        min: number;
        max: number;
        default: number;
        unit?: string;
    };
    options?: {
        label: string;
        value: any;
    }[];
    presentation: {
        tab: string;
        group: string;
        order: number;
        control: 'knob' | 'led' | 'list' | 'display' | 'button';
    };
    attachments?: {
        id: string;
        type: string;
        bind: 'telemetry' | 'state';
    }[];
}
export interface Era5Tab {
    id: string;
    groups: Map<string, Era5Entity[]>;
}
export declare class Era5ManifestParser {
    /**
     * Parses the raw YAML-derived JSON manifest into a Tab-based hierarchy.
     */
    static parse(manifest: any): Era5Tab[];
    private static normalizeEntity;
}
//# sourceMappingURL=Era5ManifestParser.d.ts.map