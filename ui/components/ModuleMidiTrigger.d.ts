/**
 * ModuleMidiTrigger (TypeScript)
 * Interface for triggering notes directly from the WebUI.
 */
export declare class ModuleMidiTrigger {
    private el;
    private content;
    private descriptor;
    private currentNote;
    private currentOctave;
    constructor(el: HTMLElement, content: HTMLElement, descriptor: any);
    init(): Promise<void>;
    private render;
    private bind;
    onStateUpdate(state: any): void;
    destroy(): void;
}
export default ModuleMidiTrigger;
//# sourceMappingURL=ModuleMidiTrigger.d.ts.map