import { OmegaLog } from './omega_log.js';
import { normalizeIncomingEvent } from './omega_types.js';

export interface RPCMessage {
    type: string;
    requestId?: number;
    payload?: any;
}

export class OmegaRPC {
    private requestId: number = 1000;
    private pendingRequests: Map<number, { resolve: Function, reject: Function, timer: any }> = new Map();
    
    public isConnected: boolean = false;
    public lastActivity: number = Date.now();
    private healthTimer: any = null;

    constructor() {
        OmegaLog.info("RPC", "Aseptic Bridge Initialized");
        
        // Listener for messages from C++
        (window as any).handleOmegaMessage = (json: any) => {
            this.lastActivity = Date.now();
            this.isConnected = true;
            this.updateHealthUI();

            try {
                const msg: RPCMessage = typeof json === 'string' ? JSON.parse(json) : json;
                
                if (msg.requestId && this.pendingRequests.has(msg.requestId)) {
                    const req = this.pendingRequests.get(msg.requestId)!;
                    clearTimeout(req.timer);
                    this.pendingRequests.delete(msg.requestId);
                    
                    if (msg.type === "rpcError" || msg.type === "error") {
                        req.reject(msg.payload || msg);
                    } else {
                        // Era 6.1: Precision Unwrapping
                        // Only unwrap if payload exists and is the primary data carrier
                        const data = (msg.payload !== undefined && msg.payload !== null) ? msg.payload : msg;
                        req.resolve(data);
                    }
                } else {
                    // Era 6.1 Normalization Shunt
                    const norm = normalizeIncomingEvent(msg);
                    if (norm) {
                        const payload = (norm as any).payload || norm;
                        window.dispatchEvent(new CustomEvent(`omega:${norm.type}`, { detail: payload }));
                    }
                }
            } catch (e) {
                OmegaLog.error("RPC", "Message parsing failed", e, json);
            }
        };

        this.startHealthMonitor();
    }

    private handleNativeResponse(id: number, payload: any) {
        if (this.pendingRequests.has(id)) {
            const req = this.pendingRequests.get(id)!;
            clearTimeout(req.timer);
            this.pendingRequests.delete(id);
            
            // Era 6.1: Unwrapping for direct native returns
            if (payload && typeof payload === 'object' && 'payload' in payload && 'type' in payload) {
                req.resolve(payload.payload);
            } else {
                req.resolve(payload);
            }
        }
    }

    private startHealthMonitor() {
        if (this.healthTimer) clearInterval(this.healthTimer);
        this.healthTimer = setInterval(() => {
            const idleTime = Date.now() - this.lastActivity;
            if (idleTime > 5000) {
                if (this.isConnected) {
                    OmegaLog.warn("RPC", "Connection idle or lost (5s)");
                    this.isConnected = false;
                    this.updateHealthUI();
                }
            }
        }, 2000);
    }

    private updateHealthUI() {
        const led = document.getElementById('bridge-health-led');
        if (led) {
            led.classList.toggle('active', this.isConnected);
            led.style.backgroundColor = this.isConnected ? 'var(--neon-cyan)' : '#331111';
            led.style.boxShadow = this.isConnected ? '0 0 10px var(--neon-cyan)' : 'none';
        }
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

    /**
     * Centralized Send Method with Timeout Protection
     */
    public async send(type: string, payload: any = {}): Promise<any> {
        const id = this.requestId++;
        const message: RPCMessage = { type, requestId: id, payload };

        const backend = await this._waitForBackend();
        if (!backend) {
            OmegaLog.error("RPC", `Backend UNREACHABLE for ${type}`);
            this.isConnected = false;
            this.updateHealthUI();
            return null;
        }

        // [Era 6.1] Direct Native Function Lookups
        const nativeFn = (window as any).omegaNativeCall;
        
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    OmegaLog.error("RPC", `Request TIMEOUT [${id}] for ${type}`);
                    reject(new Error(`RPC Timeout: ${type}`));
                }
            }, 10000);

            this.pendingRequests.set(id, { resolve, reject, timer });

            try {
                if (typeof nativeFn === 'function') {
                    nativeFn(type, id, payload).then((res: any) => {
                       // Note: resolve is handled via handleOmegaMessage, but some bridges might return directly
                       if (res !== undefined && res !== null) {
                           // if result arrived here, we can resolve immediately
                           this.handleNativeResponse(id, res);
                       }
                    });
                } else if (backend.emitEvent) {
                    backend.emitEvent("omegaMessage", message);
                } else {
                    throw new Error("No valid native invoke found");
                }
            } catch (e) {
                clearTimeout(timer);
                this.pendingRequests.delete(id);
                OmegaLog.error("RPC", `Native call failed for ${type}`, e);
                reject(e);
            }
        });
    }

    public call(type: string, payload: any = {}) { return this.send(type, payload); }
    public getState() { return this.send("getState"); }
    public getUiSchemas() { return this.send("getUiSchemas"); }
    public getSystemSettings() { return this.send("getSystemSettings"); }
    public uiReady() { return this.send("uiReady"); }
}

export const rpc = new OmegaRPC();

// Era 6 Aseptic: Direct window.juce access is ILLEGAL. 
// Use window.rpcCommandDispatcher.dispatch instead.
(window as any).omegaRPC = rpc;
