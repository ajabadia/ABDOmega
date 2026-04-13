import type { ModMetadataPayloadV1, ParamChangeEvent, StatePayloadV1, TelemetryFramePayloadV1, TelemetrySample, UiCommand } from './omega_types.js';
export interface RuntimeStoreState {
    preset: StatePayloadV1['preset'] | null;
    params: Record<string, number>;
    telemetry: Record<string, TelemetrySample>;
    modulation: ModMetadataPayloadV1 | null;
    schemaVersion: string | null;
}
export declare abstract class BaseStore {
    protected listeners: Set<() => void>;
    subscribe(callback: () => void): () => void;
    protected notify(): void;
}
export declare class RuntimeStore extends BaseStore {
    private state;
    getSnapshot(): RuntimeStoreState;
    applyState(payload: StatePayloadV1): void;
    applyParamChange(event: ParamChangeEvent): void;
    applyTelemetryFrame(payload: TelemetryFramePayloadV1): void;
    applyModulation(payload: ModMetadataPayloadV1): void;
    reduceEvent(event: any): void;
}
export interface SchemaStoreState {
    schemaVersion: string | null;
    uiSchema: any | null;
}
export declare class SchemaStore extends BaseStore {
    private state;
    private loadPromise;
    getSnapshot(): SchemaStoreState;
    ensureLoaded(): Promise<boolean>;
    setSchema(uiSchema: any, schemaVersion?: string): void;
    getSchemaForComponent(componentId: string): any;
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