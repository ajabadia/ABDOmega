export class BaseStore {
    listeners = new Set();
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }
    notify() {
        this.listeners.forEach(cb => cb());
    }
}
export class RuntimeStore extends BaseStore {
    state = {
        preset: null,
        params: {},
        telemetry: {},
        modulation: null,
        schemaVersion: null,
    };
    getSnapshot() {
        return this.state;
    }
    applyState(payload) {
        if (!payload)
            return;
        this.state = {
            ...this.state,
            schemaVersion: payload.schemaVersion || this.state.schemaVersion,
            preset: payload.preset || this.state.preset,
            params: payload.params ? { ...payload.params } : this.state.params,
        };
        this.notify();
    }
    applyParamChange(event) {
        this.state = {
            ...this.state,
            params: {
                ...this.state.params,
                [event.id]: event.value,
            },
        };
        this.notify();
    }
    applyTelemetryFrame(payload) {
        if (!payload)
            return;
        const nextTelemetry = { ...this.state.telemetry };
        for (const [key, value] of Object.entries(payload)) {
            if (key === 'schemaVersion')
                continue;
            if (value && typeof value === 'object') {
                nextTelemetry[key] = value;
            }
        }
        this.state = {
            ...this.state,
            schemaVersion: payload.schemaVersion || this.state.schemaVersion,
            telemetry: nextTelemetry,
        };
        this.notify();
    }
    applyModulation(payload) {
        this.state = {
            ...this.state,
            modulation: payload,
        };
        this.notify();
    }
    reduceEvent(event) {
        switch (event.type) {
            case 'PARAMCHANGE':
                this.applyParamChange(event);
                return;
            case 'onStateUpdate':
                this.applyState(event.payload);
                return;
            case 'telemetryUpdate':
                this.applyTelemetryFrame(event.payload);
                return;
        }
    }
}
export class SchemaStore extends BaseStore {
    state = {
        schemaVersion: null,
        uiSchema: null,
    };
    loadPromise = null;
    getSnapshot() {
        return this.state;
    }
    async ensureLoaded() {
        if (this.state.uiSchema)
            return true;
        if (this.loadPromise)
            return this.loadPromise;
        this.loadPromise = (async () => {
            try {
                const rpc = window.omegaRPC;
                if (!rpc)
                    return false;
                const response = await rpc.getUiSchemas();
                if (response) {
                    this.setSchema(response.schemas || response, response.schemaVersion || '1.0');
                    return true;
                }
            }
            catch (e) {
                console.error("[SchemaStore] Load error:", e);
            }
            finally {
                this.loadPromise = null;
            }
            return false;
        })();
        return this.loadPromise;
    }
    setSchema(uiSchema, schemaVersion) {
        this.state = {
            schemaVersion: schemaVersion ?? this.state.schemaVersion,
            uiSchema,
        };
        this.notify();
    }
    getSchemaForComponent(componentId) {
        if (!this.state.uiSchema)
            return null;
        // Búsqueda flexible en el mapa de esquemas
        return this.state.uiSchema[componentId] || null;
    }
}
export class GraphStore extends BaseStore {
    state = {
        schemaVersion: null,
        graph: null,
    };
    getSnapshot() {
        return this.state;
    }
    setGraph(graph, schemaVersion) {
        this.state = {
            schemaVersion: schemaVersion ?? this.state.schemaVersion,
            graph,
        };
        this.notify();
    }
}
export class SessionStore extends BaseStore {
    state = {
        selectedModuleId: null,
        focusedBinding: null,
        activeWorkspace: null,
        openPanels: [],
    };
    constructor() {
        super();
        this.loadFromStorage();
    }
    loadFromStorage() {
        const saved = localStorage.getItem('omega_session');
        if (saved) {
            try {
                this.state = { ...this.state, ...JSON.parse(saved) };
            }
            catch (e) { }
        }
    }
    persist() {
        localStorage.setItem('omega_session', JSON.stringify(this.state));
        this.notify();
    }
    getSnapshot() {
        return this.state;
    }
    setSelectedModule(moduleId) {
        this.state = { ...this.state, selectedModuleId: moduleId };
        this.persist();
    }
    setFocusedBinding(binding) {
        this.state = { ...this.state, focusedBinding: binding };
        this.persist();
    }
    setActiveWorkspace(workspace) {
        this.state = { ...this.state, activeWorkspace: workspace };
        this.persist();
    }
    openPanel(panelId) {
        if (this.state.openPanels.includes(panelId))
            return;
        this.state = { ...this.state, openPanels: [...this.state.openPanels, panelId] };
        this.persist();
    }
    closePanel(panelId) {
        this.state = { ...this.state, openPanels: this.state.openPanels.filter(id => id !== panelId) };
        this.persist();
    }
}
//# sourceMappingURL=runtimeStores.js.map