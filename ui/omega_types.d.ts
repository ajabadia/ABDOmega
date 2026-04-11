/**
 * OMEGA Era 5.2 - Global Type Definitions
 * Inspired by typescript-pro standards.
 */
export type Brand<T, B extends string> = T & {
    readonly __brand: B;
};
/** Canonical Module Identifier (e.g., 'midi_2_cv') */
export type ModuleId = Brand<string, "ModuleId">;
/** Unique instance identifier in the rack (e.g., 'midi_2_cv_1') */
export type InstanceId = Brand<string, "InstanceId">;
/** RPC Bridge Interface */
export interface OmegaRPC {
    getMetadata(): Promise<any>;
    getSystemSettings(): Promise<any>;
    send(type: string, payload?: any): Promise<any>;
    call(type: string, payload?: any): Promise<any>;
}
declare global {
    interface Window {
        omegaRPC: OmegaRPC;
        metadataStore: any;
        moduleManager: any;
        patchbayHub: any;
        moduleBrowser: any;
        modulePatchModal: any;
        Preferences: any;
        ServiceMode: any;
        ModuleRenderer: any;
        ModuleOscilloscope: any;
        ModuleMidiTrigger: any;
        ModuleMidiViewer: any;
        ModulePatchbayMatrix: any;
        ModuleMidiToCv: any;
        ModuleBrowser: any;
    }
    interface WindowEventMap {
        'omega:stateUpdate': CustomEvent;
        'patch-request': CustomEvent;
        'omega:moduleAdded': CustomEvent;
    }
    interface DocumentEventMap {
        'patch-request': CustomEvent;
        'omega:moduleAdded': CustomEvent;
    }
}
//# sourceMappingURL=omega_types.d.ts.map