/**
 * OMEGA Module Renderer (TypeScript)
 * Generic engine for declarative UI modules.
 */

import { MetadataStore, type ParamDescriptor } from './metadata_store.js';

export interface LayoutItem {
    id?: string;
    paramId?: string;
    paramIdY?: string;     // Added for vector controls
    paramGroup?: string;   // Added for graph/group controls
    source?: string;
    portId?: string;
    control?: string; // Legacy
    semantic?: 'scalar' | 'vector' | 'list' | 'toggle' | 'trigger' | 'port' | 'telemetry' | 'monitor' | 'label' | 'graph' | 'state' | 'keyboard';
    look?: 'knob' | 'slider-v' | 'slider-h' | 'display' | 'select' | 'led' | 'jack' | 'switch' | 'meter' | 'button' | 'joystick' | 'scope' | 'graph' | 'adsr';
    label?: string;
    row: number;
    col: number;
    colSpan?: number;
    variant?: string;
    color?: string;
}


export interface PortDescriptor {
    id: string;
    label: string;
    type: 'voltage' | 'midi' | 'list' | 'float' | 'text' | 'bool';
    direction: 'input' | 'output';
}

export interface ModuleDescriptor {
    id: string;
    title?: string;
    panelClass?: string;
    toolbarFocusIndex?: number;
    uiLayout?: {
        columns: number;
        rows?: number;
        gap?: number;
    };
    ports?: PortDescriptor[];
    items: LayoutItem[];
    footer?: {
        paramId?: string;
        label?: string;
    };
}

export class ModuleRenderer {
    private el: HTMLElement;
    private content: HTMLElement;
    private descriptor: ModuleDescriptor;
    private values: Record<string, number> = {};
    private isInitialized: boolean = false;

    constructor(el: HTMLElement, content: HTMLElement, descriptor: ModuleDescriptor) {
        this.el = el;
        this.content = content;
        this.descriptor = this.normalizeDescriptor(descriptor);
    }

    private normalizeDescriptor(desc: any): ModuleDescriptor {
        // If the descriptor comes from the C++ backend, uiLayout might be a JSON string.
        if (typeof desc.uiLayout === 'string') {
            try {
                const parsed = JSON.parse(desc.uiLayout);
                // The C++ backend now sends {"uiLayout": {...}, "items": [...]}
                return {
                    ...desc,
                    uiLayout: parsed.uiLayout || { columns: parsed.columns || 2, rows: parsed.rows || 1, gap: parsed.gap || 12 },
                    items: parsed.items || desc.items || []
                };
            } catch (e) {
                console.error("[ModuleRenderer] Failed to parse uiLayout JSON:", e);
            }
        }
        return desc as ModuleDescriptor;
    }

    async init(): Promise<void> {
        // @ts-ignore
        const store: MetadataStore = window.metadataStore;
        const meta = await store.ensureLoaded();
        if (!meta) return;

        this.render();
        this.bind();
        this.isInitialized = true;
    }

    render(): void {
        const desc = this.descriptor;
        this.content.innerHTML = `
            <div class="panel ${desc.panelClass || ''}">
                <div class="module-grid" style="display:grid; grid-template-columns: repeat(${desc.uiLayout?.columns || 2}, 1fr); gap: ${desc.uiLayout?.gap || 12}px; padding: 30px 10px 10px 10px;">
                    ${desc.items.map(item => this.renderItem(item)).join('')}
                </div>
            </div>
        `;
    }

    private renderItem(item: LayoutItem): string {
        const id = item.paramId || item.source || item.portId;
        // @ts-ignore
        const param = item.paramId ? window.metadataStore.getParam(item.paramId) : null;
        
        const style = `grid-row: ${item.row + 1}; grid-column: ${item.col + 1}${item.colSpan ? ` / span ${item.colSpan}` : ''};`;
        const label = item.label || (param ? param.name : (item.source || item.portId || ""));

        // Support Legacy 'control' property mapping
        let semantic = item.semantic;
        let look = item.look;
        
        if (!semantic && item.control) {
            switch(item.control) {
                case 'knob':     semantic = 'scalar'; look = 'knob'; break;
                case 'slider-v': semantic = 'scalar'; look = 'slider-v'; break;
                case 'toggle':   semantic = 'toggle'; look = 'button'; break;
                case 'select':   semantic = 'list';   look = 'select'; break;
                case 'stepper':  semantic = 'list';   look = 'display'; break;
                case 'telemetry': semantic = 'telemetry'; look = 'meter'; break;
                case 'led':      semantic = 'telemetry'; look = 'led'; break;
                case 'port':     semantic = 'port';   look = 'jack'; break;
            }
        }

        if (!semantic) return `<!-- Item missing semantic/control -->`;

        // SEMANTIC DISPATCHER
        switch (semantic) {
            case 'scalar':
                if (look === 'knob') {
                    return `
                        <div class="control-group variant-${item.variant || 'default'}" style="${style}">
                            <label>${label}</label>
                            <div class="knob-ring" data-param="${param?.id || ''}">
                                <div class="knob"><div class="knob-marker white"></div></div>
                            </div>
                        </div>
                    `;
                }
                return `
                    <div class="control-group variant-${item.variant || 'default'}" style="${style}">
                        <label>${label}</label>
                        <input type="range" class="${look === 'slider-h' ? 'h-slider' : 'v-slider'}" data-param="${param?.id || ''}" min="${param?.min || 0}" max="${param?.max || 1}" step="${param?.step || 'any'}" value="${param?.default || 0}" />
                    </div>
                `;

            case 'list':
                if (look === 'display') {
                    return `
                        <div class="control-group variant-${item.variant || 'default'}" style="${style}">
                            <label>${label}</label>
                            <div class="display-unit" data-param="${param?.id || ''}">
                                <button class="stepper-btn minus" data-dir="-1">－</button>
                                <div class="display-screen">
                                    <span class="display-value">${param ? this._getParamValueLabel(param, this.values[param.id] || param.default || 0) : '---'}</span>
                                </div>
                                <button class="stepper-btn plus" data-dir="1">＋</button>
                            </div>
                        </div>
                    `;
                }
                return `
                    <div class="control-group variant-${item.variant || 'default'}" style="${style}">
                        <label>${label}</label>
                        <select class="selector-control" data-param="${param?.id || ''}">
                            ${param?.options ? param.options.map((o: any) => `<option value="${o.value}">${o.label}</option>`).join('') : '<option value="0">DEFAULT</option>'}
                        </select>
                    </div>
                `;

            case 'vector':
                if (look === 'joystick') {
                    return `
                        <div class="control-group variant-${item.variant || 'default'}" style="${style}">
                            <label>${label}</label>
                            <div class="joystick-pad" data-param-x="${item.paramId || ''}" data-param-y="${item.paramIdY || ''}">
                                <div class="joystick-handle"></div>
                            </div>
                        </div>
                    `;
                }
                return `<!-- Unknown vector look: ${look} -->`;

            case 'toggle':
            case 'state':
                if (look === 'switch') {
                    return `
                        <div class="control-group variant-${item.variant || 'default'}" style="${style}">
                            <label>${label}</label>
                            <div class="sw-unit" data-param="${param?.id || ''}">
                                <div class="sw-path"><div class="sw-peg"></div></div>
                            </div>
                        </div>
                    `;
                }
                return `
                    <div class="control-group variant-${item.variant || 'default'}" style="${style}">
                        <label>${label}</label>
                        <button class="sq ${item.variant || item.color || 'red'}" data-param="${param?.id || ''}"></button>
                    </div>
                `;

            case 'port':
                // Era 4.1 UI Cleanup: Jacks/Ports are no longer rendered visually as per user request.
                return `<!-- ${label} port hidden -->`;

            case 'telemetry':
                if (look === 'led') {
                    const ledColor = item.color || "orange";
                    // For the Theme Validator / Debugging, we force active class
                    const activeClass = (this.descriptor.id === "debug_test" || this.descriptor.id === "debug") ? "active" : "";
                    return `
                        <div class="control-group led-container variant-${item.variant || 'default'}" style="${style}" data-source="${item.source || item.paramId || ''}">
                            <div class="led led-${ledColor} ${activeClass}"></div>
                            <label>${label}</label>
                        </div>
                    `;
                }
                return `
                        <div class="control-group telemetry-container variant-${item.variant || 'default'}" style="${style}" data-source="${item.source || item.paramId || ''}">
                        <label>${label}</label>
                        <div class="telemetry-display">
                            <div class="telemetry-bar"></div>
                        </div>
                    </div>
                `;

            case 'monitor':
                return `
                    <div class="control-group variant-${item.variant || 'default'}" style="${style}">
                        <label>${label}</label>
                        <div class="monitor-scope" data-source="${item.source || ''}">
                            <canvas width="100" height="60"></canvas>
                        </div>
                    </div>
                `;

            case 'graph':
                return `
                    <div class="control-group variant-${item.variant || 'default'}" style="${style}">
                        <label>${label}</label>
                        <div class="graph-adsr" data-param-group="${item.paramGroup || ''}">
                            <svg viewBox="0 0 100 60"><path d="M0,60 L20,10 L40,30 L80,30 L100,60" fill="none" stroke="cyan" stroke-width="2"/></svg>
                        </div>
                    </div>
                `;

            case 'keyboard':
                return `
                    <div class="control-group variant-${item.variant || 'default'}" style="${style}">
                        <div class="virtual-keyboard">
                            <!-- Keyboard generated dynamically -->
                        </div>
                    </div>
                `;

            case 'label':
                return `<div class="panel-label variant-${item.variant || 'default'}" style="${style}">${label}</div>`;

            default:
                return `<!-- Unknown semantic: ${semantic} -->`;
        }
    }

    private renderFooter(): string {
        return '';
    }

    private bind(): void {
        this.descriptor.items.forEach(item => {
            // Support Legacy mapping for binding
            let semantic = item.semantic;
            let look = item.look;
            if (!semantic && item.control) {
                switch(item.control) {
                    case 'knob':     semantic = 'scalar'; look = 'knob'; break;
                    case 'slider-v': semantic = 'scalar'; look = 'slider-v'; break;
                    case 'toggle':   semantic = 'toggle'; look = 'button'; break;
                    case 'select':   semantic = 'list';   look = 'select'; break;
                    case 'stepper':  semantic = 'list';   look = 'display'; break;
                    case 'port':     semantic = 'port';   look = 'jack'; break;
                }
            }

            // @ts-ignore
            const param = item.paramId ? window.metadataStore.getParam(item.paramId) : null;
            if (!param && !item.portId) return;

            if (semantic === 'scalar') {
                if (look === 'knob') {
                    const ctrl = this.content.querySelector(`[data-param="${param.id}"].knob-ring`) as HTMLElement;
                    if (ctrl) this._bindKnob(ctrl, param);
                } else {
                    const input = this.content.querySelector(`input[data-param="${param.id}"]`) as HTMLInputElement;
                    if (input) input.addEventListener('input', (e) => this.setParam(param.id, parseFloat((e.target as HTMLInputElement).value)));
                }
            } else if (semantic === 'list') {
                if (look === 'display') {
                    const ctrl = this.content.querySelector(`.display-unit[data-param="${param.id}"]`) as HTMLElement;
                    if (ctrl) this._bindDisplay(ctrl, param);
                } else {
                    const sel = this.content.querySelector(`select[data-param="${param.id}"]`) as HTMLSelectElement;
                    if (sel) sel.addEventListener('change', (e) => this.setParam(param.id, parseFloat((e.target as HTMLSelectElement).value)));
                }
            } else if (semantic === 'toggle' || semantic === 'state') {
                const trigger = this.content.querySelector(`[data-param="${param.id}"]`) as HTMLElement;
                if (trigger) {
                    trigger.addEventListener('click', () => {
                        const current = this.values[param.id] || param.default || 0;
                        this.setParam(param.id, current > 0.5 ? 0 : 1);
                    });
                }
            } else if (semantic === 'port') {
                const jack = this.content.querySelector(`.port-container[data-port="${item.portId}"]`) as HTMLElement;
                if (jack) {
                    jack.addEventListener('click', () => {
                        // @ts-ignore
                        window.omegaRPC.openPatchModal(this.descriptor.id, item.portId);
                    });
                }
            }
        });

        const footerBtn = this.content.querySelector('button[data-role="status"]') as HTMLButtonElement;
        if (footerBtn) {
            const paramId = footerBtn.dataset.param!;
            footerBtn.addEventListener('click', () => {
                // @ts-ignore
                const param = window.metadataStore.getParam(paramId);
                const current = this.values[paramId] || (param ? param.default : 0);
                this.setParam(paramId, current > 0.5 ? 0 : 1);
            });
        }
    }

    private _bindKnob(ctrl: HTMLElement, param: ParamDescriptor): void {
        const knob = ctrl.querySelector('.knob') as HTMLElement;
        if (!knob) return;

        let isDragging = false;
        let startY = 0;
        let startVal = 0;

        knob.addEventListener('mousedown', e => {
            isDragging = true;
            startY = e.clientY;
            startVal = this.values[param.id] || param.default || 0;
            e.preventDefault();
        });

        const onMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const delta = (startY - e.clientY) / 150;
            let next = startVal + delta * (param.max - param.min);
            next = Math.max(param.min, Math.min(param.max, next));
            this.setParam(param.id, next);
        };

        const onUp = () => { isDragging = false; };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }

    setParam(id: string, value: number): void {
        this.values[id] = value;
        // @ts-ignore
        window.omegaRPC.setParam(id, value);
        this.updateControlUI(id, value);
    }

    updateControlUI(id: string, value: number): void {
        // @ts-ignore
        const param = window.metadataStore.getParam(id);
        if (!param) return;

        // 1. Inputs / Sliders
        const input = this.content.querySelector(`input[data-param="${id}"]`) as HTMLInputElement;
        if (input) input.value = value.toString();

        // 2. Buttons / Toggles
        const btn = this.content.querySelector(`button[data-param="${id}"], .sw-unit[data-param="${id}"]`) as HTMLElement;
        if (btn) btn.classList.toggle('active', value > 0.5);
        if (btn && btn.classList.contains('sw-unit')) btn.setAttribute('data-state', value > 0.5 ? "1" : "0");

        // 3. Selects
        const sel = this.content.querySelector(`select[data-param="${id}"]`) as HTMLSelectElement;
        if (sel) sel.value = value.toString();

        // 4. Knobs
        const knob = this.content.querySelector(`[data-param="${id}"].knob-ring`) as HTMLElement;
        if (knob) this._updateKnobVisual(knob, param, value);
        
        // 5. Displays
        const display = this.content.querySelector(`.display-unit[data-param="${id}"] .display-value`) as HTMLElement;
        if (display) display.innerText = this._getParamValueLabel(param, value);

        const fBtn = this.content.querySelector(`button[data-param="${id}"][data-role="status"]`) as HTMLButtonElement;
        if (fBtn) fBtn.innerText = value > 0.5 ? "ON" : "BYPASS";
    }

    private _getParamValueLabel(param: ParamDescriptor | null, value: number): string {
        if (!param) return value.toString();
        if (param.options) {
            const opt = param.options.find((o: any) => o.value === value);
            if (opt) return opt.label;
        }
        
        // Special case for MIDI Channel if options are missing but range is 0-16
        if (param.id === "midi_channel" && value >= 0 && value <= 16) {
            return value === 0 ? "OMNI" : `CH ${Math.round(value)}`;
        }

        return value.toString();
    }

    private _bindDisplay(ctrl: HTMLElement, param: ParamDescriptor): void {
        const btns = ctrl.querySelectorAll('.stepper-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const dir = parseInt((e.target as HTMLElement).dataset.dir || "0");
                const current = (this.values[param.id] ?? param.default) ?? 0;
                const opts = param.options;
                
                if (opts && opts.length > 0) {
                    const currentIndex = opts.findIndex((o: any) => o.value === current);
                    const nextIndex = Math.max(0, Math.min(opts.length - 1, currentIndex + dir));
                    const selected = opts[nextIndex];
                    if (selected) this.setParam(param.id, selected.value);
                } else {
                    let next = current + dir;
                    next = Math.max(param.min, Math.min(param.max, next));
                    this.setParam(param.id, next);
                }
            });
        });
    }

    private _updateKnobVisual(ctrl: HTMLElement, param: ParamDescriptor, value: number): void {
        const marker = ctrl.querySelector('.knob-marker') as HTMLElement;
        if (!marker) return;
        const norm = (value - param.min) / ((param.max - param.min) || 1);
        const angle = -135 + (norm * 270);
        marker.style.transform = `translateX(-50%) rotate(${angle}deg)`;
    }

    public onStateUpdate(state: any): void {
        if (!this.isInitialized) return;
        
        // 1. Update Parameter Values
        const params = state.parameters || {};
        this.descriptor.items.forEach(item => {
            if (item.paramId && params[item.paramId] !== undefined) {
                this.values[item.paramId] = params[item.paramId];
                this.updateControlUI(item.paramId, params[item.paramId]);
            }
        });

        // 2. Update Telemetry / Virtual Signals
        const telemetry = state.telemetry || {};
        this.descriptor.items.forEach(item => {
            const source = item.source || item.paramId;
            if (!source) return;

            let val: number | undefined = telemetry[source];
            
            if (val === undefined && source.startsWith("telemetry.")) {
                const subKey = source.split(".")[1];
                if (subKey) val = telemetry[subKey];
            }

            if (val !== undefined) {
                this.updateTelemetryUI(source, val);
            }
        });

        // 3. Update Port Connections (Frontal Pairs)
        this.updatePortsUI(state);
    }

    private updateTelemetryUI(source: string, value: number): void {
        const el = this.content.querySelector(`[data-source="${source}"] .led, [data-source="${source}"] .led-indicator`) as HTMLElement;
        if (el) {
            const isActive = value > 0;
            el.classList.toggle('active', isActive);
            
            // Temporary blink effect for active triggers
            if (isActive) {
                setTimeout(() => el.classList.remove('active'), 50);
            }
        }

        const bar = this.content.querySelector(`[data-source="${source}"] .telemetry-bar`) as HTMLElement;
        if (bar) {
            bar.style.height = `${value * 100}%`;
        }
    }

    private updatePortsUI(state: any): void {
        const portsContainer = this.content.querySelector('.module-ports');
        
        const legacyMatrix = state.preset?.modMatrix || state.modMatrix || [];
        const voiceChain = state.preset?.voiceChain || state.voiceChain || {};
        const modularConnections = (voiceChain.CONNECTIONS || []).map((c: any) => ({ ...c, active: true }));
        
        const unifiedMatrix = [...legacyMatrix, ...modularConnections];
        const instanceId = this.descriptor.id;
        
        const activeConnections = unifiedMatrix.filter((s: any) => 
            s.active && (s.source?.startsWith(instanceId) || s.target?.startsWith(instanceId))
        );

        // Update front panel jacks
        const jacks = this.content.querySelectorAll('.port-container');
        jacks.forEach(jackEl => {
            const portId = (jackEl as HTMLElement).dataset.port;
            const fullPortId = `${instanceId}.${portId}`;
            const isConnected = activeConnections.some(c => c.source === fullPortId || c.target === fullPortId);
            jackEl.classList.toggle('active', isConnected);
        });

        if (!portsContainer) return;

        if (activeConnections.length === 0) {
            portsContainer.innerHTML = `<span style="font-size: 8px; color: #333; letter-spacing: 1px;">NO PATCHES</span>`;
            return;
        }

        portsContainer.innerHTML = activeConnections.map((s: any) => {
            const isSource = s.source?.startsWith(instanceId);
            const localPort = isSource ? s.source.split('.').pop() : s.target.split('.').pop();
            const remote = isSource ? s.target : s.source;
            const direction = isSource ? '→' : '←';
            
            return `
                <div class="port-pair" style="display: flex; align-items: center; gap: 4px; font-size: 8px; background: rgba(0,0,0,0.4); padding: 3px 6px; border-radius: 12px; border: 1px solid rgba(0,242,255,0.2); color: #00f2ff; box-shadow: 0 0 5px rgba(0,242,255,0.1);">
                    <div class="port-led" style="width: 4px; height: 4px; border-radius: 50%; background: #00f2ff; box-shadow: 0 0 4px #00f2ff;"></div>
                    <span style="font-weight: 900; letter-spacing: 0.5px;">${localPort?.toUpperCase()}</span>
                    <span style="opacity: 0.5; font-size: 7px;">${direction}</span>
                    <span style="color: #fff; opacity: 0.8;">${remote?.toUpperCase()}</span>
                </div>
            `;
        }).join('');
    }
}

export default ModuleRenderer;
