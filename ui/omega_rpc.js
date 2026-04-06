/**
 * OMEGA JSON-RPC v2 Bridge (TypeScript Implementation)
 * Phase 15.1 - Structural Maturity
 */
export class OmegaRPC {
    requestId = 1000;
    pendingRequests = new Map();
    constructor() {
        console.log("[OMEGA TS] RPC Controller Initialized");
        // Listener for messages from C++
        window.handleOmegaMessage = (json) => {
            try {
                const msg = typeof json === 'string' ? JSON.parse(json) : json;
                if (msg.requestId && this.pendingRequests.has(msg.requestId)) {
                    const req = this.pendingRequests.get(msg.requestId);
                    this.pendingRequests.delete(msg.requestId);
                    if (msg.type === "error")
                        req.reject(msg.payload);
                    else
                        req.resolve(msg.payload);
                }
                else {
                    // Dispatch as browser event
                    window.dispatchEvent(new CustomEvent(`omega:${msg.type}`, { detail: msg.payload }));
                }
            }
            catch (e) {
                console.error("[RPC TS] Error handling message:", e, json);
            }
        };
    }
    async _waitForBackend(timeout = 5000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const win = window;
            const bridge = win.omegaNativeCall || win.__JUCE__?.backend?.omegaNativeCall;
            if (typeof bridge === 'function')
                return { omegaNativeCall: bridge };
            if (win.__JUCE__?.backend?.emitEvent)
                return win.__JUCE__.backend;
            await new Promise(r => setTimeout(r, 100));
        }
        return null;
    }
    async send(type, payload = {}) {
        const id = this.requestId++;
        const message = { type, requestId: id, payload };
        const backend = await this._waitForBackend();
        if (!backend) {
            console.warn(`[RPC TS] No backend for ${type}, mocking.`);
            return this._getMock(type);
        }
        try {
            let rawResponse;
            if (typeof backend.omegaNativeCall === 'function') {
                rawResponse = await backend.omegaNativeCall(type, id, payload);
            }
            else if (backend.emitEvent) {
                rawResponse = await backend.emitEvent("omegaMessage", message);
            }
            const msg = typeof rawResponse === 'string' ? JSON.parse(rawResponse) : rawResponse;
            return msg?.payload !== undefined ? msg.payload : msg;
        }
        catch (e) {
            console.error(`[RPC TS] Call ${type} failed:`, e);
            return this._getMock(type);
        }
    }
    async call(type, payload = {}) {
        return this.send(type, payload);
    }
    _getMock(type) {
        // Reduced mock for TS baseline
        if (type === "getState")
            return { preset: { name: "TS MOCK PATCH" }, params: {} };
        return null;
    }
    // API methods
    getState() { return this.send("getState"); }
    async getMetadata() { return this.send("getMetadata"); }
    async getSystemSettings() { return this.send("getSystemSettings"); }
    async setSystemSetting(id, value) { return this.send("setSystemSetting", { id, value }); }
    async getBrowserData() { return this.send("getBrowserData"); }
    async selectLibrary(libIdx) { return this.send("selectLibrary", { libIdx }); }
    async loadLibraryPreset(libIdx, prstIdx) { return this.send("loadLibraryPreset", { libIdx, prstIdx }); }
    async setFavorite(libIdx, prstIdx, fav) { return this.send("setFavorite", { libIdx, prstIdx, fav }); }
    async savePresetDetailed(libIdx, prstIdx) { return this.send("savePreset", { libIdx, prstIdx }); }
    async saveAsNewPresetDetailed(name, category, author, tags, notes) {
        return this.send("saveAsNewPreset", { name, category, author, tags, notes });
    }
    setParam(id, value) { return this.send("setParam", { id, value }); }
    uiReady() { return this.send("uiReady"); }
    sendMidi(status, data1, data2) {
        return this.send("sendMidi", { status, data1, data2 });
    }
}
export const rpc = new OmegaRPC();
/**
 * Compatibility Shim: maps legacy window.juce calls to RPC sends.
 */
export function setupJuceShim() {
    if (!window.juce) {
        window.juce = {
            getMetadata: () => rpc.getMetadata(),
            getSystemSettings: () => rpc.getSystemSettings(),
            setSystemSetting: (id, val) => rpc.setSystemSetting(id, val),
            getBrowserData: () => rpc.getBrowserData(),
            selectLibrary: (idx) => rpc.selectLibrary(idx),
            loadLibraryPreset: (lIdx, pIdx) => rpc.loadLibraryPreset(lIdx, pIdx),
            setFavorite: (lIdx, pIdx, fav) => rpc.setFavorite(lIdx, pIdx, fav),
            savePresetDetailed: (lIdx, pIdx) => rpc.savePresetDetailed(lIdx, pIdx),
            saveAsNewPresetDetailed: (n, c, a, t, ns) => rpc.saveAsNewPresetDetailed(n, c, a, t, ns),
            menuAction: (action, ...args) => {
                console.log("[BRIDGE SHIM] juce.menuAction -> RPC send:", action);
                rpc.send("menuAction", { action, args });
            },
            setParameter: (id, value) => {
                rpc.setParam(id, value);
            },
            uiReady: () => {
                rpc.uiReady();
            },
            sendMidi: (status, data1, data2) => {
                rpc.sendMidi(status, data1, data2);
            }
        };
        console.log("[BRIDGE SHIM] window.juce initialized via RPC");
    }
}
window.omegaRPC = rpc;
//# sourceMappingURL=omega_rpc.js.map