import { OmegaLog } from './omega_log.js';
export var ChangeType;
(function (ChangeType) {
    ChangeType[ChangeType["Structure"] = 1] = "Structure";
    ChangeType[ChangeType["Parameters"] = 2] = "Parameters";
    ChangeType[ChangeType["Telemetry"] = 4] = "Telemetry";
    ChangeType[ChangeType["System"] = 8] = "System";
    ChangeType[ChangeType["All"] = 15] = "All";
})(ChangeType || (ChangeType = {}));
export class BaseStore {
    listeners = new Set();
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }
    notify(type = ChangeType.All) {
        this.listeners.forEach(cb => cb(type));
    }
}
export class RuntimeStore extends BaseStore {
    state = {
        patch: null,
        preset: null,
        params: {},
        telemetry: {},
        modulation: null,
        schemaVersion: null,
        systemInfo: {
            version: "0.0.0",
            build: "0",
            lcdText: "INITIALIZING..."
        }
    };
    getSnapshot() {
        return this.state;
    }
    getValue(paramKey, defaultValue = 0) {
        return this.state.params[paramKey] ?? defaultValue;
    }
    getTelemetry(paramKey) {
        const sample = this.state.telemetry[paramKey];
        return sample ? (sample.v ?? 0) : 0;
    }
    applyState(payload) {
        if (!payload)
            return;
        const isV7 = payload.schemaVersion === '7.0';
        if (isV7) {
            const v7 = payload;
            OmegaLog.info('STORE', `Applying Era 7 Patch: ${v7.patch.name || 'Untitled'}`);
            this.state = {
                ...this.state,
                schemaVersion: '7.0',
                patch: v7.patch,
                params: this.syncLegacyParams(v7.patch)
            };
            this.notify(ChangeType.Structure | ChangeType.Parameters);
        }
        else {
            OmegaLog.warn('STORE', `REJECTED: Non-Era 7 payload received (Version: ${payload.schemaVersion}). Pure Era 7 environment enforced.`);
        }
    }
    syncLegacyParams(patch) {
        const legacy = {};
        const modules = patch.modules || [];
        for (const mod of modules) {
            const params = mod.parameters || mod.params || {};
            for (const [id, val] of Object.entries(params)) {
                legacy[`${mod.instanceId}.${id}`] = val;
            }
        }
        return legacy;
    }
    applyParamChange(event) {
        this.state = {
            ...this.state,
            params: {
                ...this.state.params,
                [event.id]: event.value,
            },
        };
        this.notify(ChangeType.Parameters);
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
        this.notify(ChangeType.Telemetry);
    }
    applyModulation(payload) {
        this.state = {
            ...this.state,
            modulation: payload,
        };
        this.notify(ChangeType.Structure);
    }
    reduceEvent(event) {
        if (!event)
            return;
        switch (event.type) {
            case 'PARAMCHANGE':
                this.applyParamChange(event);
                return;
            case 'onStateUpdate':
            case 'state':
                this.applyState(event.payload || event);
                return;
            case 'telemetryUpdate':
                this.applyTelemetryFrame(event.payload || event);
                return;
            case 'onLCDUpdate':
                this.state = {
                    ...this.state,
                    systemInfo: { ...this.state.systemInfo, lcdText: event.detail || event.payload || event }
                };
                this.notify(ChangeType.System);
                return;
            case 'onVersionUpdate':
                const vData = event.detail || event.payload || event;
                this.state = {
                    ...this.state,
                    systemInfo: {
                        ...this.state.systemInfo,
                        version: vData.version || this.state.systemInfo.version,
                        build: vData.build || this.state.systemInfo.build
                    }
                };
                this.notify(ChangeType.System);
                return;
        }
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