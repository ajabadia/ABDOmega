import type { ModMetadataPayloadV1, ParamChangeEvent, StatePayloadV1, StatePayloadV7, PatchDocumentV7, TelemetryFramePayloadV1, TelemetrySample, UiCommand } from './omega_types.js';
export interface RuntimeStoreState {
    patch: PatchDocumentV7 | null;
    preset: StatePayloadV1['preset'] | null;
    params: Record<string, number>;
    telemetry: Record<string, TelemetrySample>;
    modulation: ModMetadataPayloadV1 | null;
    schemaVersion: string | null;
    systemInfo: {
        version: string;
        build: string;
        lcdText: string;
    };
}
export declare enum ChangeType {
    Structure = 1,
    Parameters = 2,
    Telemetry = 4,
    System = 8,
    All = 15
}
export type StoreListener = (changeType: ChangeType) => void;
export declare abstract class BaseStore {
    protected listeners: Set<StoreListener>;
    subscribe(callback: StoreListener): () => void;
    protected notify(type?: ChangeType): void;
}
export declare class RuntimeStore extends BaseStore {
    private state;
    getSnapshot(): RuntimeStoreState;
    getValue(paramKey: string, defaultValue?: number): number;
    getTelemetry(paramKey: string): number;
    applyState(payload: StatePayloadV7 | StatePayloadV1): void;
    private syncLegacyParams;
    applyParamChange(event: ParamChangeEvent): void;
    applyTelemetryFrame(payload: TelemetryFramePayloadV1): void;
    applyModulation(payload: ModMetadataPayloadV1): void;
    reduceEvent(event: any): void;
}
export interface SchemaStoreState {
    schemaVersion: string | null;
    uiSchema: any | null;
}
export interface GraphStoreState {
    schemaVersion: string | null;
    graph: any | null;
}
export declare class GraphStore extends BaseStore {
    private state;
    getSnapshot(): GraphStoreState;
    setGraph(graph: any, schemaVersion?: string): void;
}
export interface SessionStoreState {
    selectedModuleId: string | null;
    focusedBinding: string | null;
    activeWorkspace: string | null;
    openPanels: string[];
}
export declare class SessionStore extends BaseStore {
    private state;
    constructor();
    private loadFromStorage;
    private persist;
    getSnapshot(): SessionStoreState;
    setSelectedModule(moduleId: string | null): void;
    setFocusedBinding(binding: string | null): void;
    setActiveWorkspace(workspace: string | null): void;
    openPanel(panelId: string): void;
    closePanel(panelId: string): void;
}
export interface CommandBus {
    dispatch(command: UiCommand): void | Promise<void>;
}
//# sourceMappingURL=runtimeStores.d.ts.map