declare class OmegaApp {
    private lastPresetName;
    private lcdTimer;
    private initialized;
    constructor();
    init(): Promise<void>;
    private setupEventListeners;
    private hideSplash;
    private updateVersion;
    private updateLCD;
    handleMenuAction(action: string): void;
    private showModal;
    private setupModals;
    private setupInteractions;
    private setupSliders;
    private setupButtons;
    private setupBender;
    private setupMenus;
    private setupKeyboard;
}
export declare const app: OmegaApp;
export {};
//# sourceMappingURL=script.d.ts.map