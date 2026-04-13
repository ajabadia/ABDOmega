/**
 * OMEGA Era 6.1 - Fake Host Bridge
 * Simulates C++ OmegaUiBridge behavior for contract validation.
 */
export declare class FakeHostBridge {
    private lastReceivedType;
    private lastReceivedPayload;
    private messageCallback;
    constructor();
    setCallback(callback: (json: string) => void): void;
    private handleNativeCall;
    private sendToUi;
    /**
     * Inject a push event from "C++"
     */
    injectEvent(type: string, payload: any): void;
    getLastCall(): {
        type: string | null;
        payload: any;
    };
}
//# sourceMappingURL=FakeHostBridge.d.ts.map