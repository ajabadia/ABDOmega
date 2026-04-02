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
                ${this.renderFooter()}
            </div>
        `;
    }
    renderItem(item) {
        // @ts-ignore
        const param = window.metadataStore.getParam(item.paramId);
        if (!param)
            return `<!-- Param ${item.paramId} not found -->`;
        const style = `grid-row: ${item.row + 1}; grid-column: ${item.col + 1}${item.colSpan ? ` / span ${item.colSpan}` : ''};`;
        const label = item.label || param.name;
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
            case 'telemetry':
                return `
                    <div class="control-group telemetry-container" style="${style}" data-param="${param.id}">
                        <label>${label}</label>
                        <div class="telemetry-display" style="height:40px; background:#000; border: 1px solid rgba(255,255,255,0.1); position:relative; overflow:hidden;">
                            <div class="telemetry-bar" style="position:absolute; bottom:0; left:0; width:100%; height:2px; background:var(--juno-cyan); opacity:0.8; transition: height 0.05s ease-out;"></div>
                        </div>
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
}
export default ModuleRenderer;
//# sourceMappingURL=module_renderer.js.map