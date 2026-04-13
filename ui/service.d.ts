/**
 * service.ts - OMEGA Service Mode (TypeScript Implementation)
 * Era 6 - Managed Dispatch Edition
 */
export declare class OMEGA_ServiceMode {
    private params;
    private activeVoice;
    constructor();
    init(): Promise<void>;
    refreshParams(): Promise<void>;
    private renderParams;
    updateParam(id: string, value: string): Promise<void>;
    private renderVoices;
    toggleVoiceTest(index: number): Promise<void>;
    serviceAction(action: string): Promise<void>;
}
export declare const ServiceMode: OMEGA_ServiceMode;
//# sourceMappingURL=service.d.ts.map