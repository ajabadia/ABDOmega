/**
 * OMEGA Module Renderer (TypeScript)
 * Generic engine for declarative UI modules.
 */
import { MetadataStore } from './metadata_store.js';
export class ModuleRenderer {
    el;
    content;
    descriptor;
    values = {};
    isInitialized = false;
    constructor(el, content, descriptor) {
        this.el = el;
        this.content = content;
        this.descriptor = descriptor;
    }
    async init() {
        // @ts-ignore
        const store = window.metadataStore;
        const meta = await store.ensureLoaded();
        if (!meta)
            return;
        this.render();
        this.bind();
        this.isInitialized = true;
    }
    render() {
        const desc = this.descriptor;
        this.content.innerHTML = `
            <div class="panel ${desc.panelClass || ''}">
                <div class="module-grid" style="display:grid; grid-template-columns: repeat(${desc.grid?.columns || 2}, 1fr); gap: ${desc.grid?.gap || 12}px;">
                    ${desc.items.map(item => this.renderItem(item)).join('')}
                </div>
                <div class="module-ports" style="padding: 4px 10px; display: flex; flex-wrap: wrap; gap: 6px; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.05); min-height: 20px;">
                    <!-- Active connections will be injected here -->
                </div>
                ${this.renderFooter()}
            </div>
        `;
    }
    renderItem(item) {
        const id = item.paramId || item.source;
        // @ts-ignore
        const param = item.paramId ? window.metadataStore.getParam(item.paramId) : null;
        const style = `grid-row: ${item.row + 1}; grid-column: ${item.col + 1}${item.colSpan ? ` / span ${item.colSpan}` : ''};`;
        const label = item.label || (param ? param.name : (item.source || ""));
        if (!param && !item.source)
            return `<!-- Item missing paramId or source -->`;
        switch (item.control) {
            case 'knob':
                return `
                    <div class="control-group" style="${style}">
                        <label>${label}</label>
                        <div class="knob-control" data-param="${param.id}">
                            <div class="knob"><div class="knob-marker white"></div></div>
                        </div>
                    </div>
                `;
            case 'slider-v':
                return `
                    <div class="control-group" style="${style}">
                        <label>${label}</label>
                        <input type="range" class="v-slider" data-param="${param.id}" min="${param.min}" max="${param.max}" step="${param.step || 'any'}" value="${param.default || 0}" />
                    </div>
                `;
            case 'toggle':
                return `
                    <div class="control-group" style="${style}">
                        <label>${label}</label>
                        <button class="sq ${item.variant || 'juno-red'}" data-param="${param.id}"></button>
                    </div>
                `;
            case 'select':
                return `
                    <div class="control-group" style="${style}">
                        <label>${label}</label>
                        <select class="selector-control" data-param="${param.id}">
                            ${param.options ? param.options.map((o) => `<option value="${o.value}">${o.label}</option>`).join('') : '<option value="0">DEFAULT</option>'}
                        </select>
                    </div>
                `;
            case 'telemetry':
                return `
                    <div class="control-group telemetry-container" style="${style}" data-source="${item.source || item.paramId}">
                        <label>${label}</label>
                        <div class="telemetry-display" style="height:40px; background:#000; border: 1px solid rgba(255,255,255,0.1); position:relative; overflow:hidden;">
                            <div class="telemetry-bar" style="position:absolute; bottom:0; left:0; width:100%; height:2px; background:var(--juno-cyan); opacity:0.8; transition: height 0.05s ease-out;"></div>
                        </div>
                    </div>
                `;
            case 'led':
                const ledColor = item.color || "orange";
                return `
                    <div class="control-group led-container" style="${style} display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;" data-source="${item.source || item.paramId}">
                        <div class="led-indicator led-${ledColor}" style="width: 12px; height: 12px; border-radius: 50%; background: #333; box-shadow: inset 0 1px 3px rgba(0,0,0,0.5); transition: background 0.1s, box-shadow 0.1s;"></div>
                        <label style="font-size: 8px; color: #666;">${label}</label>
                    </div>
                `;
            default:
                return '';
        }
    }
    renderFooter() {
        const footer = this.descriptor.footer;
        if (!footer)
            return '';
        return `
            <div class="module-footer" style="padding: 4px 10px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                ${footer.paramId ? `<button class="sq juno-red" data-param="${footer.paramId}" data-role="status" style="width:24px; height:24px;"></button>` : ''}
                <span class="label-tiny" style="font-size: 9px; color: #555; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; flex: 1; text-align: right;">${footer.label || ''}</span>
            </div>
        `;
    }
    bind() {
        this.descriptor.items.forEach(item => {
            // @ts-ignore
            const param = window.metadataStore.getParam(item.paramId);
            if (!param)
                return;
            if (item.control === 'knob') {
                const ctrl = this.content.querySelector(`[data-param="${param.id}"].knob-control`);
                if (ctrl)
                    this._bindKnob(ctrl, param);
            }
            else if (item.control === 'slider-v') {
                const input = this.content.querySelector(`input[data-param="${param.id}"]`);
                if (input) {
                    input.addEventListener('input', (e) => this.setParam(param.id, parseFloat(e.target.value)));
                }
            }
            else if (item.control === 'toggle') {
                const btn = this.content.querySelector(`button[data-param="${param.id}"]`);
                if (btn) {
                    btn.addEventListener('click', () => {
                        const current = this.values[param.id] || param.default || 0;
                        this.setParam(param.id, current > 0.5 ? 0 : 1);
                    });
                }
            }
            else if (item.control === 'select') {
                const sel = this.content.querySelector(`select[data-param="${param.id}"]`);
                if (sel) {
                    sel.addEventListener('change', (e) => this.setParam(param.id, parseFloat(e.target.value)));
                }
            }
            else if (item.control === 'telemetry') {
                // Telemetry is read-only, no binding needed for input
            }
        });
        const footerBtn = this.content.querySelector('button[data-role="status"]');
        if (footerBtn) {
            const paramId = footerBtn.dataset.param;
            footerBtn.addEventListener('click', () => {
                // @ts-ignore
                const param = window.metadataStore.getParam(paramId);
                const current = this.values[paramId] || (param ? param.default : 0);
                this.setParam(paramId, current > 0.5 ? 0 : 1);
            });
        }
    }
    _bindKnob(ctrl, param) {
        const knob = ctrl.querySelector('.knob');
        if (!knob)
            return;
        let isDragging = false;
        let startY = 0;
        let startVal = 0;
        knob.addEventListener('mousedown', e => {
            isDragging = true;
            startY = e.clientY;
            startVal = this.values[param.id] || param.default || 0;
            e.preventDefault();
        });
        const onMove = (e) => {
            if (!isDragging)
                return;
            const delta = (startY - e.clientY) / 150;
            let next = startVal + delta * (param.max - param.min);
            next = Math.max(param.min, Math.min(param.max, next));
            this.setParam(param.id, next);
        };
        const onUp = () => { isDragging = false; };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }
    setParam(id, value) {
        this.values[id] = value;
        // @ts-ignore
        window.omegaRPC.setParam(id, value);
        this.updateControlUI(id, value);
    }
    updateControlUI(id, value) {
        // @ts-ignore
        const param = window.metadataStore.getParam(id);
        if (!param)
            return;
        const input = this.content.querySelector(`input[data-param="${id}"]`);
        if (input && input.type === 'range')
            input.value = value.toString();
        const btn = this.content.querySelector(`button[data-param="${id}"]`);
        if (btn)
            btn.classList.toggle('active', value > 0.5);
        const sel = this.content.querySelector(`select[data-param="${id}"]`);
        if (sel)
            sel.value = value.toString();
        const knob = this.content.querySelector(`[data-param="${id}"].knob-control`);
        if (knob)
            this._updateKnobVisual(knob, param, value);
        const fBtn = this.content.querySelector(`button[data-param="${id}"][data-role="status"]`);
        if (fBtn)
            fBtn.innerText = value > 0.5 ? "ON" : "BYPASS";
    }
    _updateKnobVisual(ctrl, param, value) {
        const marker = ctrl.querySelector('.knob-marker');
        if (!marker)
            return;
        const norm = (value - param.min) / ((param.max - param.min) || 1);
        const angle = -135 + (norm * 270);
        marker.style.transform = `translateX(-50%) rotate(${angle}deg)`;
    }
    onStateUpdate(state) {
        if (!this.isInitialized)
            return;
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
            if (!source)
                return;
            let val = telemetry[source];
            // Handle "telemetry.xxx" formatted sources
            if (val === undefined && source.startsWith("telemetry.")) {
                const subKey = source.split(".")[1];
                if (subKey)
                    val = telemetry[subKey];
            }
            if (val !== undefined) {
                this.updateTelemetryUI(source, val);
            }
        });
        // 3. Update Port Connections (Frontal Pairs)
        this.updatePortsUI(state);
    }
    updateTelemetryUI(source, value) {
        if (this.descriptor.items.some(i => (i.source === source || i.paramId === source) && i.control === 'led')) {
            const el = this.content.querySelector(`[data-source="${source}"] .led-indicator`);
            if (el) {
                const isActive = value > 0;
                const color = el.classList.contains('led-orange') ? '#ff9100' : '#00f2ff';
                el.style.background = isActive ? color : '#333';
                el.style.boxShadow = isActive ? `0 0 10px ${color}` : 'inset 0 1px 3px rgba(0,0,0,0.5)';
                if (isActive) {
                    setTimeout(() => {
                        el.style.background = '#333';
                        el.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.5)';
                    }, 50);
                }
            }
        }
    }
    updatePortsUI(state) {
        const portsContainer = this.content.querySelector('.module-ports');
        if (!portsContainer)
            return;
        const legacyMatrix = state.preset?.modMatrix || state.modMatrix || [];
        const voiceChain = state.preset?.voiceChain || state.voiceChain || {};
        const modularConnections = (voiceChain.CONNECTIONS || []).map((c) => ({ ...c, active: true }));
        const unifiedMatrix = [...legacyMatrix, ...modularConnections];
        const instanceId = this.descriptor.id;
        // Find connections where this module is a source or target
        const activeConnections = unifiedMatrix.filter((s) => s.active && (s.source?.startsWith(instanceId) || s.target?.startsWith(instanceId)));
        if (activeConnections.length === 0) {
            portsContainer.innerHTML = `<span style="font-size: 8px; color: #333; letter-spacing: 1px;">NO PATCHES</span>`;
            return;
        }
        portsContainer.innerHTML = activeConnections.map((s) => {
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
//# sourceMappingURL=module_renderer.js.map