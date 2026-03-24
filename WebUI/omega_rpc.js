/**
 * OMEGA JSON-RPC v2 Bridge (Built for JUCE 8)
 * Ensures robust communication via native functions and event emitters.
 */
class OmegaRPC {
    constructor() {
        this.requestId = 1000;
        this.pendingRequests = new Map();
        
        // Listener for messages from C++ (notifications or legacy responses)
        window.handleOmegaMessage = (json) => {
            try {
                const msg = typeof json === 'string' ? JSON.parse(json) : json;
                console.log("[RPC] Received Event:", msg);
                
                if (msg.requestId && this.pendingRequests.has(msg.requestId)) {
                    const { resolve, reject } = this.pendingRequests.get(msg.requestId);
                    this.pendingRequests.delete(msg.requestId);
                    if (msg.type === "error") reject(msg.payload);
                    else resolve(msg.payload);
                } else if (msg.type === "paramChanged") {
                    window.dispatchEvent(new CustomEvent('omega:paramChanged', { detail: msg.payload }));
                } else if (msg.type === "state") {
                    window.dispatchEvent(new CustomEvent('omega:stateUpdate', { detail: msg.payload }));
                }
            } catch (e) {
                console.error("[RPC] Error handling message:", e, json);
            }
        };
    }

    async send(type, payload = {}) {
        const id = this.requestId++;
        const message = { type, requestId: id, payload };
        
        console.log(`[RPC] Executing ${type} (ID: ${id})...`);

        // JUCE 8 could expose functions on window.juce or window.__JUCE__.backend
        const backend = window.juce || window.__JUCE__?.backend;
        
        if (!backend) {
            console.warn("[RPC] No Native Bridge. Using MOCKS.");
            return this._getMock(type);
        }

        try {
            let rawResponse;
            if (typeof backend[type] === 'function') {
                rawResponse = await backend[type](id, payload);
            } else if (backend.emitEvent) {
                rawResponse = await backend.emitEvent("omegaMessage", message);
            } else {
                console.warn(`[RPC] Bridge exists but ${type} is not a function. MOCKING.`);
                return this._getMock(type);
            }

            if (window.appendToConsole) {
                window.appendToConsole(`[RPC] RAW Response for ${type}: ${JSON.stringify(rawResponse)}`, 'log');
            }
            
            if (rawResponse === undefined || rawResponse === null) {
                console.warn(`[RPC] RAW Response is empty. MOCKING.`);
                return this._getMock(type);
            }

            let msg = (typeof rawResponse === 'string' && rawResponse.startsWith('{')) 
                        ? JSON.parse(rawResponse) 
                        : rawResponse;

            if (msg && typeof msg === 'object' && msg.payload !== undefined) {
                return msg.payload;
            }
            
            return msg;
        } catch (e) {
            console.error(`[RPC] Bridge CRASHED. MOCKING.`, e);
            return this._getMock(type);
        }
    }

    _getMock(type) {
        if (type === "getState") return {
            preset: { id: "MOCK-1", name: "Mock Preset", engine: "Juno" },
            params: { "LAYERAMAINCUTOFF": 0.5, "LAYERAMAINRESONANCE": 0.2 }
        };
        if (type === "listPresets") return ["MOCK_PRESET_A.yaml", "MOCK_PRESET_B.yaml"];
        if (type === "getMetadata") return {
            "LAYERAMAINCUTOFF": { id: "LAYERAMAINCUTOFF", name: "Cutoff", min: 20, max: 20000, default: 2000, unit: "Hz", skew: 0.3 },
            "LAYERAMAINRESONANCE": { id: "LAYERAMAINRESONANCE", name: "Resonance", min: 0, max: 1, default: 0.1, unit: "%", skew: 1.0 },
            "LAYERAMAINHPF": { id: "LAYERAMAINHPF", name: "HPF", min: 0, max: 3, default: 1, unit: "Choice", skew: 1.0 }
        };
        return null;
    }

    // Core methods
    getState() { return this.send("getState"); }
    getMetadata() { return this.send("getMetadata"); }
    setParam(paramId, value) { return this.send("setParam", { paramId, value }); }
    
    // Preset management
    listPresets() { return this.send("listPresets"); }
    getHistory(presetId) { return this.send("getHistory", { presetId }); }
    saveSnapshot(author, message) { return this.send("saveSnapshot", { author, message }); }
    checkout(presetId, hash) { return this.send("checkout", { presetId, hash }); }
    createBranch(presetId, branchName, fromHash = "") { 
        return this.send("createBranch", { presetId, branchName, fromHash }); 
    }
    
    uiReady() { return this.send("uiReady"); }
}

window.omegaRPC = new OmegaRPC();
