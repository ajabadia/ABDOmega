/**
 * OMEGA Synthesizer - WebUI Bridge (TypeScript SOT Implementation)
 * Refactored from script.js to satisfy Phase 15.1 Architectural Maturity.
 */
interface JuceBridge {
    setParameter: (id: string, value: number) => void;
    menuAction: (action: string, ...args: any[]) => void;
    loadPreset: (index: number) => void;
    copySysExData: (hex: string) => void;
    uiReady: () => void;
}
declare global {
    interface Window {
        juce: JuceBridge;
        __JUCE__: {
            backend: {
                addEventListener: (name: string, cb: Function) => string;
                removeEventListener: (token: string) => void;
                emitEvent: (name: string, payload: any) => void;
            };
        };
        handleOmegaMessage: (msg: any) => void;
    }
}
declare class OmegaApp {
    private lastPresetName;
    private lcdTimer;
    private promiseId;
    private octaveShift;
    private lastSysExHex;
    private currentBankGlobal;
    private currentPatchGlobal;
    private sysexMirror;
    private store;
    private initialized;
    private keyboard;
    constructor();
    init(): void;
    private setupEventListeners;
    private hideSplash;
    private updateVersion;
    private updateLCD;
    private updateSevenSegment;
    handleMenuAction(action: string): void;
    private showModal;
    private setupModals;
    private setupInteractions;
    private setupSliders;
    private setupButtons;
    private setupBender;
    private syncUI;
    private setupMenus;
    private setupKeyboard;
}
declare const app: OmegaApp;
export { app };
//# sourceMappingURL=script.d.ts.map