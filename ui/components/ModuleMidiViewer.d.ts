/**
 * ModuleMidiViewer (TypeScript)
 * Premium Event logger for OMEGA.
 * Restoration: Fixed timestamp synchronization and enhanced aesthetics.
 */
export declare class ModuleMidiViewer {
    private el;
    private content;
    private logEl;
    private descriptor;
    private maxLines;
    private isPowered;
    private pollingInterval;
    private lastSeenTs;
    constructor(el: HTMLElement, content: HTMLElement, descriptor: any);
    init(): Promise<void>;
    private fetchMidiSources;
    private updateSourceSelector;
    private sources;
    private selectedSource;
    private render;
    private bindEvents;
    private startPolling;
    private formatStatus;
    private addLogLine;
    onStateUpdate(state: any): void;
    destroy(): void;
}
export default ModuleMidiViewer;
//# sourceMappingURL=ModuleMidiViewer.d.ts.map