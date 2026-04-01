/**
 * OMEGA JSON-RPC v2 Bridge (TypeScript Implementation)
 * Phase 15.1 - Structural Maturity
 */
export interface RPCMessage {
    type: string;
    requestId?: number;
    payload?: any;
}
export declare class OmegaRPC {
    private requestId;
    private pendingRequests;
    constructor();
    private _waitForBackend;
    send(type: string, payload?: any): Promise<any>;
    private _getMock;
    getState(): Promise<any>;
    getMetadata(): Promise<any>;
    getSystemSettings(): Promise<any>;
    setSystemSetting(id: string, value: number): Promise<any>;
    getBrowserData(): Promise<any>;
    selectLibrary(libIdx: number): Promise<any>;
    loadLibraryPreset(libIdx: number, prstIdx: number): Promise<any>;
    setFavorite(libIdx: number, prstIdx: number, fav: boolean): Promise<any>;
    savePresetDetailed(libIdx: number, prstIdx: number): Promise<any>;
    saveAsNewPresetDetailed(name: string, category: string, author: string, tags: string, notes: string): Promise<any>;
    setParam(id: string, value: number): Promise<any>;
    uiReady(): Promise<any>;
    sendMidi(status: number, data1: number, data2: number): Promise<any>;
}
export declare const rpc: OmegaRPC;
/**
 * Compatibility Shim: maps legacy window.juce calls to RPC sends.
 */
export declare function setupJuceShim(): void;
//# sourceMappingURL=omega_rpc.d.ts.map