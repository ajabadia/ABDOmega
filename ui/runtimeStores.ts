import type {
  ModMetadataPayloadV1,
  ParamChangeEvent,
  StatePayloadV1,
  TelemetryFramePayloadV1,
  TelemetrySample,
  UiCommand,
} from './omega_types.js';

export interface RuntimeStoreState {
  preset: StatePayloadV1['preset'] | null;
  params: Record<string, number>;
  telemetry: Record<string, TelemetrySample>;
  modulation: ModMetadataPayloadV1 | null;
  schemaVersion: string | null;
}

export abstract class BaseStore {
  protected listeners: Set<() => void> = new Set();
  
  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  protected notify(): void {
    this.listeners.forEach(cb => cb());
  }
}

export class RuntimeStore extends BaseStore {
  private state: RuntimeStoreState = {
    preset: null,
    params: {},
    telemetry: {},
    modulation: null,
    schemaVersion: null,
  };

  getSnapshot(): RuntimeStoreState {
    return this.state;
  }

  applyState(payload: StatePayloadV1): void {
    if (!payload) return;
    this.state = {
      ...this.state,
      schemaVersion: payload.schemaVersion || this.state.schemaVersion,
      preset: payload.preset || this.state.preset,
      params: payload.params ? { ...payload.params } : this.state.params,
    };
    this.notify();
  }

  applyParamChange(event: ParamChangeEvent): void {
    this.state = {
      ...this.state,
      params: {
        ...this.state.params,
        [event.id]: event.value,
      },
    };
    this.notify();
  }

  applyTelemetryFrame(payload: TelemetryFramePayloadV1): void {
    if (!payload) return;
    const nextTelemetry = { ...this.state.telemetry };

    for (const [key, value] of Object.entries(payload)) {
      if (key === 'schemaVersion') continue;
      if (value && typeof value === 'object') {
        nextTelemetry[key] = value as TelemetrySample;
      }
    }

    this.state = {
      ...this.state,
      schemaVersion: payload.schemaVersion || this.state.schemaVersion,
      telemetry: nextTelemetry,
    };
    this.notify();
  }

  applyModulation(payload: ModMetadataPayloadV1): void {
    this.state = {
      ...this.state,
      modulation: payload,
    };
    this.notify();
  }

  reduceEvent(event: any): void {
    switch (event.type) {
      case 'PARAMCHANGE':
        this.applyParamChange(event as ParamChangeEvent);
        return;
      case 'onStateUpdate':
        this.applyState(event.payload as StatePayloadV1);
        return;
      case 'telemetryUpdate':
        this.applyTelemetryFrame(event.payload as TelemetryFramePayloadV1);
        return;
    }
  }
}

export interface SchemaStoreState {
  schemaVersion: string | null;
  uiSchema: any | null;
}

export class SchemaStore extends BaseStore {
  private state: SchemaStoreState = {
    schemaVersion: null,
    uiSchema: null,
  };

  private loadPromise: Promise<boolean> | null = null;

  getSnapshot(): SchemaStoreState {
    return this.state;
  }

  async ensureLoaded(): Promise<boolean> {
    if (this.state.uiSchema) return true;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      try {
        const rpc = (window as any).omegaRPC;
        if (!rpc) return false;

        const response = await rpc.getUiSchemas();
        if (response) {
          this.setSchema(response.schemas || response, response.schemaVersion || '1.0');
          return true;
        }
      } catch (e) {
        console.error("[SchemaStore] Load error:", e);
      } finally {
        this.loadPromise = null;
      }
      return false;
    })();

    return this.loadPromise;
  }

  setSchema(uiSchema: any, schemaVersion?: string): void {
    this.state = {
      schemaVersion: schemaVersion ?? this.state.schemaVersion,
      uiSchema,
    };
    this.notify();
  }

  getSchemaForComponent(componentId: string): any {
     if (!this.state.uiSchema) return null;
     // Búsqueda flexible en el mapa de esquemas
     return this.state.uiSchema[componentId] || null;
  }
}

export interface GraphStoreState {
  schemaVersion: string | null;
  graph: any | null;
}

export class GraphStore extends BaseStore {
  private state: GraphStoreState = {
    schemaVersion: null,
    graph: null,
  };

  getSnapshot(): GraphStoreState {
    return this.state;
  }

  setGraph(graph: any, schemaVersion?: string): void {
    this.state = {
      schemaVersion: schemaVersion ?? this.state.schemaVersion,
      graph,
    };
    this.notify();
  }
}

export interface SessionStoreState {
  selectedModuleId: string | null;
  focusedBinding: string | null;
  activeWorkspace: string | null;
  openPanels: string[];
}

export class SessionStore extends BaseStore {
  private state: SessionStoreState = {
    selectedModuleId: null,
    focusedBinding: null,
    activeWorkspace: null,
    openPanels: [],
  };

  constructor() {
    super();
    this.loadFromStorage();
  }

  private loadFromStorage() {
     const saved = localStorage.getItem('omega_session');
     if (saved) {
        try {
           this.state = { ...this.state, ...JSON.parse(saved) };
        } catch(e) {}
     }
  }

  private persist() {
     localStorage.setItem('omega_session', JSON.stringify(this.state));
     this.notify();
  }

  getSnapshot(): SessionStoreState {
    return this.state;
  }

  setSelectedModule(moduleId: string | null): void {
    this.state = { ...this.state, selectedModuleId: moduleId };
    this.persist();
  }

  setFocusedBinding(binding: string | null): void {
    this.state = { ...this.state, focusedBinding: binding };
    this.persist();
  }

  setActiveWorkspace(workspace: string | null): void {
    this.state = { ...this.state, activeWorkspace: workspace };
    this.persist();
  }

  openPanel(panelId: string): void {
    if (this.state.openPanels.includes(panelId)) return;
    this.state = { ...this.state, openPanels: [...this.state.openPanels, panelId] };
    this.persist();
  }

  closePanel(panelId: string): void {
    this.state = { ...this.state, openPanels: this.state.openPanels.filter(id => id !== panelId) };
    this.persist();
  }
}

export interface CommandBus {
  dispatch(command: UiCommand): void | Promise<void>;
}
