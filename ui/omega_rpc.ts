/**
 * OMEGA JSON-RPC v2 Bridge (TypeScript Implementation)
 * Phase 15.1 - Structural Maturity
 */

import { OmegaLog } from './omega_log.js';

export interface RPCMessage {
    type: string;
    requestId?: number;
    payload?: any;
}

export class OmegaRPC {
    private requestId: number = 1000;
    private pendingRequests: Map<number, { resolve: Function, reject: Function }> = new Map();

    constructor() {
        OmegaLog.info("OMEGA TS", "RPC Controller Initialized");
        
        // Listener for messages from C++
        (window as any).handleOmegaMessage = (json: any) => {
            try {
                const msg: RPCMessage = typeof json === 'string' ? JSON.parse(json) : json;
                
                if (msg.requestId && this.pendingRequests.has(msg.requestId)) {
                    const req = this.pendingRequests.get(msg.requestId)!;
                    this.pendingRequests.delete(msg.requestId);
                    if (msg.type === "error") req.reject(msg.payload);
                    else req.resolve(msg.payload);
                } else {
                    // Dispatch as browser event
                    window.dispatchEvent(new CustomEvent(`omega:${msg.type}`, { detail: msg.payload }));
                }
            } catch (e) {
                OmegaLog.error("RPC TS", "Error handling message", e, json);
            }
        };
    }

    private async _waitForBackend(timeout: number = 5000): Promise<any> {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const win = window as any;
            const bridge = win.omegaNativeCall || win.__JUCE__?.backend?.omegaNativeCall;
            if (typeof bridge === 'function') return { omegaNativeCall: bridge };
            
            if (win.__JUCE__?.backend?.emitEvent) return win.__JUCE__.backend;
            
            await new Promise(r => setTimeout(r, 100));
        }
        return null;
    }

    public async send(type: string, payload: any = {}): Promise<any> {
        const id = this.requestId++;
        const message: RPCMessage = { type, requestId: id, payload };

        const backend = await this._waitForBackend();
        if (!backend) {
            OmegaLog.warn("RPC TS", `No backend for ${type}, mocking.`);
            return this._getMock(type);
        }

        try {
            let rawResponse: any;
            if (typeof backend.omegaNativeCall === 'function') {
                rawResponse = await backend.omegaNativeCall(type, id, payload);
            } else if (backend.emitEvent) {
                rawResponse = await backend.emitEvent("omegaMessage", message);
            }

            const msg = typeof rawResponse === 'string' ? JSON.parse(rawResponse) : rawResponse;
            return msg?.payload !== undefined ? msg.payload : msg;
        } catch (e) {
            OmegaLog.error("RPC TS", `Call ${type} failed`, e);
            return this._getMock(type);
        }
    }

    public async call(type: string, payload: any = {}): Promise<any> {
        return this.send(type, payload);
    }

    private _getMock(type: string): any {
        // Reduced mock for TS baseline
        if (type === "getState") return { preset: { name: "TS MOCK PATCH" }, params: {} };
        return null;
    }

    // API methods
    public getState() { return this.send("getState"); }
    async getMetadata() { return this.send("getMetadata"); }
    async getSystemSettings() { return this.send("getSystemSettings"); }
    async setSystemSetting(id: string, value: number) { return this.send("setSystemSetting", { id, value }); }
    async getBrowserData() { return this.send("getBrowserData"); }
    async selectLibrary(libIdx: number) { return this.send("selectLibrary", { libIdx }); }
    async loadLibraryPreset(libIdx: number, prstIdx: number) { return this.send("loadLibraryPreset", { libIdx, prstIdx }); }
    async setFavorite(libIdx: number, prstIdx: number, fav: boolean) { return this.send("setFavorite", { libIdx, prstIdx, fav }); }
    async savePresetDetailed(libIdx: number, prstIdx: number) { return this.send("savePreset", { libIdx, prstIdx }); }
    async saveAsNewPresetDetailed(name: string, category: string, author: string, tags: string, notes: string) { 
        return this.send("saveAsNewPreset", { name, category, author, tags, notes }); 
    }
    public setParam(id: string, value: number) { return this.send("setParam", { id, value }); }
    public uiReady() { return this.send("uiReady"); }
    public sendMidi(status: number, data1: number, data2: number) { 
        return this.send("sendMidi", { status, data1, data2 }); 
    }
}

export const rpc = new OmegaRPC();

/**
 * Compatibility Shim: maps legacy window.juce calls to RPC sends.
 */
export function setupJuceShim() {
    if (!(window as any).juce) {
        (window as any).juce = {
            getMetadata: () => rpc.getMetadata(),
            getSystemSettings: () => rpc.getSystemSettings(),
            setSystemSetting: (id: string, val: number) => rpc.setSystemSetting(id, val),
            getBrowserData: () => rpc.getBrowserData(),
            selectLibrary: (idx: number) => rpc.selectLibrary(idx),
            loadLibraryPreset: (lIdx: number, pIdx: number) => rpc.loadLibraryPreset(lIdx, pIdx),
            setFavorite: (lIdx: number, pIdx: number, fav: boolean) => rpc.setFavorite(lIdx, pIdx, fav),
            savePresetDetailed: (lIdx: number, pIdx: number) => rpc.savePresetDetailed(lIdx, pIdx),
            saveAsNewPresetDetailed: (n: string, c: string, a: string, t: string, ns: string) => rpc.saveAsNewPresetDetailed(n, c, a, t, ns),
            menuAction: (action: string, ...args: any[]) => {
                OmegaLog.info("BRIDGE SHIM", "juce.menuAction -> RPC send", action);
                rpc.send("menuAction", { action, args });
            },
            setParameter: (id: string, value: number) => {
                rpc.setParam(id, value);
            },
            uiReady: () => {
                rpc.uiReady();
            },
            sendMidi: (status: number, data1: number, data2: number) => {
                rpc.sendMidi(status, data1, data2);
            }
        };
        OmegaLog.info("BRIDGE SHIM", "window.juce initialized via RPC");
    }
}

(window as any).omegaRPC = rpc;
