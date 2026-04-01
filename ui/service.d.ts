/**
 * service.ts - OMEGA Service Mode (TypeScript Implementation)
 * Phase 15.1 - Structural Maturity
 */
export declare class OMEGA_ServiceMode {
    private params;
    private activeVoice;
    constructor();
    init(): Promise<void>;
    refreshParams(): Promise<void>;
    private renderParams;
    updateParam(id: string, value: string): void;
    private renderVoices;
    toggleVoiceTest(index: number): void;
    serviceAction(action: string): void;
}
export declare const ServiceMode: OMEGA_ServiceMode;
//# sourceMappingURL=service.d.ts.map