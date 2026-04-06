/**
 * OMEGA MIDI-to-CV Utility Module (TypeScript)
 * Build #181 - Hardware Design & Multi-Channel Support
 */
export declare class ModuleMidiToCv {
    private container;
    private content;
    private options;
    private activityPulse;
    constructor(container: HTMLElement, content: HTMLElement, options: any);
    init(): Promise<void>;
    render(): void;
    onStateUpdate(state: any): void;
    addStyles(): void;
}
//# sourceMappingURL=ModuleMidiToCv.d.ts.map