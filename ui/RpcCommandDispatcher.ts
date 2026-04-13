/**
 * OMEGA RpcCommandDispatcher
 * Central authority for all UI-triggered mutations.
 * Era 6 - Absolute Aseptic Encapsulation
 */

import { OmegaLog } from './omega_log.js';
import { type UiCommand } from './omega_types.js';

export class RpcCommandDispatcher {
    private rpc: any;

    constructor() {
        // @ts-ignore
        this.rpc = window.omegaRPC;
        OmegaLog.info("DISPATCH", "RpcCommandDispatcher Initialized");
    }

    public async dispatch(cmd: UiCommand): Promise<any> {
        OmegaLog.debug("DISPATCH", `${cmd.type}`, cmd.payload || '');

        if (!this.rpc) {
            OmegaLog.error("DISPATCH", "RPC Bridge missing! Command aborted.");
            return;
        }

        try {
            switch (cmd.type) {
                case 'setParameter':
                    if (!cmd.payload || !('target' in cmd.payload)) throw new Error("setParameter missing target");
                    return await this.rpc.send("setParameter", cmd.payload);

                case 'loadPreset':
                case 'loadLibraryPreset':
                    return await this.rpc.send("loadPreset", cmd.payload);

                case 'updatePatchbayMatrixSlot':
                case 'patchbayMatrixAction': // Map legacy/direct names to canonical method
                    return await this.rpc.send("updatePatchbayMatrixSlot", (cmd as any).payload || (cmd as any).value);

                case 'getMetadata':
                    return await this.rpc.send("getMetadata", (cmd as any).payload || {});

                case 'uiReady':
                    return await this.rpc.send("uiReady", (cmd as any).payload || {});

                case 'subscribeTelemetry':
                    return await this.rpc.send("subscribeTelemetry", cmd.payload);

                case 'serviceAction':
                    return await this.rpc.send("serviceAction", cmd.payload);

                case 'setSystemSetting':
                    return await this.rpc.send("setSystemSetting", cmd.payload);

                case 'exit':
                    return await this.rpc.send("exit", {});
                case 'newPreset':
                    return await this.rpc.send("newPreset", cmd.payload);

                default:
                    // Si el payload tiene un target, intentamos llamar a ese target como comando directo (Flattening)
                    const target = (cmd as any).target || (cmd.payload && (cmd.payload as any).target);
                    if (target) {
                        return await this.rpc.send(target, cmd.payload || {});
                    }
                    OmegaLog.warn("DISPATCH", `Unknown command type: ${cmd.type}`);
            }
        } catch (e) {
            OmegaLog.error("DISPATCH", `Failed to execute ${cmd.type}`, e);
        }
    }
}

// Global instance
// @ts-ignore
window.rpcCommandDispatcher = new RpcCommandDispatcher();
