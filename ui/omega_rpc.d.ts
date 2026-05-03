export interface RPCMessage {
    type: string;
    requestId?: number;
    payload?: any;
}
export declare class OmegaRPC {
    private requestId;
    private pendingRequests;
    isConnected: boolean;
    lastActivity: number;
    private healthTimer;
    constructor();
    private handleNativeResponse;
    private startHealthMonitor;
    private updateHealthUI;
    private _waitForBackend;
    /**
     * Centralized Send Method: Uses Event-Based Bridge for Maximum Reliability
     */
    send(type: string, payload?: any): Promise<any>;
    /**
     * Era 7 Handshake
     */
    ensureReady(timeout?: number): Promise<boolean>;
    call(type: string, payload?: any): Promise<any>;
    getState(): Promise<any>;
    getUiSchemas(): Promise<any>;
    getSystemSettings(): Promise<any>;
    uiReady(): Promise<any>;
}
export declare const rpc: OmegaRPC;
//# sourceMappingURL=omega_rpc.d.ts.map