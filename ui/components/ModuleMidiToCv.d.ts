/**
 * OMEGA MIDI-to-CV Utility Module (TypeScript)
 * Build #181 - Hardware Design & Multi-Channel Support
 */
import { type ModuleOptions, type IModuleInstance } from '../contracts/ModuleContract.js';
export declare class ModuleMidiToCv implements IModuleInstance {
    private container;
    private content;
    private options;
    private activityPulse;
    constructor(container: HTMLElement, content: HTMLElement, options: ModuleOptions);
    init(): Promise<void>;
    render(): void;
    private buildControlCell;
    onStateUpdate(state: any): void;
    private sendParamUpdate;
    addStyles(): void;
}
//# sourceMappingURL=ModuleMidiToCv.d.ts.map