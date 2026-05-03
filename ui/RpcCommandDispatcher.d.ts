/**
 * OMEGA RpcCommandDispatcher
 * Central authority for all UI-triggered mutations.
 * Era 6 - Absolute Aseptic Encapsulation
 */
import { type UiCommand } from './omega_types.js';
export declare class RpcCommandDispatcher {
    private rpc;
    constructor();
    private static readonly CORE_COMMANDS;
    dispatch(cmd: UiCommand): Promise<any>;
    private handleCoreCommand;
    private handleDynamicCommand;
}
//# sourceMappingURL=RpcCommandDispatcher.d.ts.map