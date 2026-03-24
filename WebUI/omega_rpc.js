/**
 * OMEGA JSON-RPC v1 Bridge
 */
class OmegaRPC {
    constructor() {
        this.requestId = 1;
        this.pendingRequests = new Map();
        
        // Listener for messages from C++
        window.handleOmegaMessage = (json) => {
            const msg = typeof json === 'string' ? JSON.parse(json) : json;
            console.log("[RPC] Received:", msg);
            
            if (msg.requestId && this.pendingRequests.has(msg.requestId)) {
                // Handle Response
                const { resolve, reject } = this.pendingRequests.get(msg.requestId);
                this.pendingRequests.delete(msg.requestId);
                if (msg.type === "error") reject(msg.payload);
                else resolve(msg.payload);
            } else if (msg.type === "paramChanged") {
                // Handle Notification
                window.dispatchEvent(new CustomEvent('omega:paramChanged', { detail: msg.payload }));
            } else if (msg.type === "state") {
                // Implicit state update notification
                window.dispatchEvent(new CustomEvent('omega:stateUpdate', { detail: msg.payload }));
            }
        };
    }

    async send(type, payload = {}) {
        const id = this.requestId++;
        const message = {
            type,
            requestId: id,
            payload
        };
        
        console.log(`[RPC] Sending ${type} (ID: ${id})...`);

        // Priority: JUCE 8 Native Promise
        const backend = window.__JUCE__?.backend || window.juce;
        if (backend) {
            try {
                // If the specific method exists (e.g. getState), call it directly
                // otherwise use the generic emitEvent/omegaMessage bridge
                let response;
                if (typeof backend[type] === 'function') {
                    // For direct calls like getState(id), we pass the id as arg[0]
                    response = await backend[type](id);
                } else {
                    response = await backend.emitEvent("omegaMessage", message);
                }

                console.log(`[RPC] Native Response for ${type} (ID: ${id}):`, response);
                
                // If it's a string, parse it (C++ might return JSON string or juce::var object)
                const msg = typeof response === 'string' ? JSON.parse(response) : response;
                
                // Resolve with the payload part of the response if it follows our protocol
                // Our C++ handleMessageFromUiAsVar returns the direct result or {payload: ...}
                return (msg && msg.payload !== undefined) ? msg.payload : msg;
            } catch (e) {
                console.warn(`[RPC] Native call for ${type} failed, falling back to legacy...`, e);
            }
        }

        // Fallback: Legacy async callback loop
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
            
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject({ message: "Request timeout" });
                }
            }, 5000);

            if (backend && backend.emitEvent) {
                backend.emitEvent("omegaMessage", message);
            } else {
                reject({ message: "No bridge" });
            }
        });
    }

    setParam(paramId, value) {
        return this.send("setParam", { paramId, value });
    }

    getState() {
        return this.send("getState");
    }

    // [Git-for-Sounds]
    listPresets() {
        return this.send("listPresets");
    }

    getHistory(presetId) {
        return this.send("getHistory", { presetId });
    }

    saveSnapshot(author, message) {
        return this.send("saveSnapshot", { author, message });
    }

    checkout(presetId, hash) {
        return this.send("checkout", { presetId, hash });
    }

    createBranch(presetId, branchName, fromHash = "") {
        return this.send("createBranch", { presetId, branchName, fromHash });
    }
}

window.omegaRPC = new OmegaRPC();
