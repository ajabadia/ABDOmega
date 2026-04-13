/**
 * OMEGA Module Renderer (TypeScript)
 * Generic engine for declarative UI modules.
 * ERA 6: Pure Aseptic Contract Rendering
 */
export class ModuleRenderer {
    el;
    content;
    descriptor;
    values = {};
    isInitialized = false;
    constructor(el, content, descriptor) {
        this.el = el;
        this.content = content;
        this.descriptor = this.normalizeDescriptor(descriptor);
    }
    normalizeDescriptor(schema) {
        console.log(`[ModuleRenderer] Validating OMEGA Manifest for ${schema?.id || 'unknown'}`);
        if (!schema || !schema.items || !schema.layout) {
            console.error("[ModuleRenderer] CONTRACT VIOLATION: Missing layout/items in manifest.", schema);
            throw new Error(`Critical Contract Violation: Module ${schema?.id} manifest is incomplete.`);
        }
        return {
            id: schema.id,
            version: schema.version || "6.0.0-ASEPTIC",
            hp: schema.layout.hp,
            theme: schema.theme,
            uiLayout: schema.layout,
            items: schema.items,
            registry: schema.registry
        };
    }
    getRegistryEntity(id) {
        if (!this.descriptor.registry)
            return null;
        return this.descriptor.registry.find((e) => e.id === id);
    }
    async init() {
        this.render();
        this.bind();
        this.isInitialized = true;
        // Era 6.1 Aseptic: Real-time state subscription
        if (window.runtimeStore) {
            // Note: In refined store arch, we react to store updates
            // (A unified subscribe/notify system would be ideal here)
        }
    }
    render() {
        const desc = this.descriptor;
        const themeClass = `theme-${desc.theme || 'default'}`;
        const classes = ["panel", desc.panelClass || "", "aseptic-panel", themeClass];
        const hpWidth = desc.hp ? (desc.hp * 5.08 * 2.95) : 100;
        const widthStyle = `min-width: ${hpWidth}px; width: fit-content;`;
        this.content.innerHTML = `
            <div class="${classes.join(' ')}" style="${widthStyle}">
                <div class="module-grid" style="display:grid; grid-template-columns: repeat(${desc.uiLayout?.columns || 2}, 1fr); gap: ${desc.uiLayout?.gap || 12}px; padding: 30px 10px 10px 10px;">
                    ${desc.items ? desc.items.map(item => this.renderItem(item)).join('') : ''}
                </div>
            </div>
        `;
    }
    renderItem(item) {
        const id = item.paramId || item.source || item.portId;
        const entity = id ? this.getRegistryEntity(id) : null;
        const style = `grid-row: ${item.row + 1}; grid-column: ${item.col + 1}${item.colSpan ? ` / span ${item.colSpan}` : ''};`;
        const label = item.label || (entity ? entity.label : (id || ""));
        return this.buildControlCell(item, entity, style, label);
    }
    buildControlCell(item, entity, style, label) {
        const id = item.paramId || item.source || item.portId || "";
        const cellClass = `control-cell variant-${item.variant || 'default'}`;
        const bindAttr = id ? `data-bind="${id}"` : '';
        return `
            <div class="${cellClass}" style="${style}" ${bindAttr} data-id="${id}">
                <div class="cell-attachment-top">
                    ${item.look === 'led' ? '' : this.renderAttachment(item, 'top')}
                </div>

                <div class="cell-main">
                    ${this.renderComponent(item, entity, label)}
                </div>

                ${item.variant === 'A' ? '' : `
                <div class="cell-info">
                    <label class="cell-label">${label.toUpperCase()}</label>
                    <div class="cell-display" data-precision="${item.look === 'display' ? 0 : 2}">
                        ${entity ? this._getEntityValueLabel(entity, this.values[id] || entity.range?.default || 0) : '---'}
                    </div>
                </div>
                `}

                <div class="cell-attachment-bottom">
                    ${this.renderAttachment(item, 'bottom')}
                </div>
            </div>
        `;
    }
    renderAttachment(item, position) {
        if (item.look === 'led' && position === 'top') {
            return `<div class="led variant-${item.variant || 'default'}" data-source="${item.source || item.paramId || ''}"></div>`;
        }
        if (item.look === 'meter' && position === 'top') {
            return `<div class="mini-meter"><div class="meter-bar"></div></div>`;
        }
        return '';
    }
    renderComponent(item, entity, label) {
        const look = item.look || 'knob';
        const id = item.paramId || item.source || item.portId || '';
        switch (look) {
            case 'knob':
                return `
                    <div class="knob-ring" data-param="${id}">
                        <div class="knob"><div class="knob-marker white"></div></div>
                    </div>
                `;
            case 'slider-v':
            case 'slider-h':
                const range = entity?.range || { min: 0, max: 1, step: 'any', default: 0 };
                return `<input type="range" class="${look === 'slider-h' ? 'h-slider' : 'v-slider'}" data-param="${id}" min="${range.min}" max="${range.max}" step="${range.step}" value="${range.default}" />`;
            case 'select':
                return `
                    <select class="selector-control" data-param="${id}">
                        ${entity?.options ? entity.options.map((o) => `<option value="${o.value}">${o.label}</option>`).join('') : '<option value="0">DEFAULT</option>'}
                    </select>
                `;
            case 'switch':
            case 'toggle':
            case 'button':
                return `<div class="sw-unit" data-param="${id}"><div class="sw-path"><div class="sw-peg"></div></div></div>`;
            case 'display':
                return `
                    <div class="display-unit" data-param="${id}">
                        <button class="stepper-btn minus" data-dir="-1">－</button>
                        <div class="display-screen">
                            <span class="display-value">${entity ? this._getEntityValueLabel(entity, this.values[id] || entity.range?.default || 0) : '---'}</span>
                        </div>
                        <button class="stepper-btn plus" data-dir="1">＋</button>
                    </div>
                `;
            case 'led':
                return `<div class="led variant-${item.variant || 'default'}" id="led-${id}" data-source="${id}"></div>`;
            default:
                return `<!-- Component ${look} -->`;
        }
    }
    bind() {
        if (!this.descriptor.items)
            return;
        this.descriptor.items.forEach(item => {
            const look = item.look || 'knob';
            const id = item.paramId || item.source || item.portId;
            const entity = id ? this.getRegistryEntity(id) : null;
            if (!entity)
                return;
            if (look === 'knob') {
                const ctrl = this.content.querySelector(`[data-param="${id}"].knob-ring`);
                if (ctrl)
                    this._bindKnob(ctrl, entity);
            }
            else if (look === 'slider-v' || look === 'slider-h') {
                const input = this.content.querySelector(`input[data-param="${id}"]`);
                if (input)
                    input.addEventListener('input', (e) => this.setParam(id, parseFloat(e.target.value)));
            }
            else if (look === 'display') {
                const ctrl = this.content.querySelector(`.display-unit[data-param="${id}"]`);
                if (ctrl)
                    this._bindDisplay(ctrl, entity);
            }
            else if (look === 'select') {
                const sel = this.content.querySelector(`select[data-param="${id}"]`);
                if (sel)
                    sel.addEventListener('change', (e) => this.setParam(id, parseFloat(e.target.value)));
            }
            else if (look === 'button' || look === 'switch' || look === 'toggle') {
                const trigger = this.content.querySelector(`[data-param="${id}"]`);
                if (trigger) {
                    trigger.addEventListener('click', () => {
                        const current = this.values[id] || entity.range?.default || 0;
                        this.setParam(id, current > 0.5 ? 0 : 1);
                    });
                }
            }
        });
    }
    _bindKnob(ctrl, entity) {
        const knob = ctrl.querySelector('.knob');
        if (!knob)
            return;
        let isDragging = false;
        let startY = 0;
        let startVal = 0;
        const range = entity.range || { min: 0, max: 1 };
        knob.addEventListener('mousedown', e => {
            isDragging = true;
            startY = e.clientY;
            startVal = this.values[entity.id] || range.default || 0;
            e.preventDefault();
        });
        const onMove = (e) => {
            if (!isDragging)
                return;
            const delta = (startY - e.clientY) / 150;
            let next = startVal + delta * (range.max - range.min);
            next = Math.max(range.min, Math.min(range.max, next));
            this.setParam(entity.id, next);
        };
        const onUp = () => { isDragging = false; };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }
    _bindDisplay(ctrl, entity) {
        const btns = ctrl.querySelectorAll('.stepper-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const dir = parseInt(e.target.dataset.dir || "0");
                const range = entity.range || { min: 0, max: 1, step: 1 };
                const current = this.values[entity.id] ?? range.default ?? 0;
                const opts = entity.options;
                if (opts && opts.length > 0) {
                    const currentIndex = opts.findIndex((o) => o.value === current);
                    const nextIndex = Math.max(0, Math.min(opts.length - 1, currentIndex + dir));
                    const selected = opts[nextIndex];
                    if (selected)
                        this.setParam(entity.id, selected.value);
                }
                else {
                    let next = current + dir;
                    next = Math.max(range.min, Math.min(range.max, next));
                    this.setParam(entity.id, next);
                }
            });
        });
    }
    setParam(id, value) {
        this.values[id] = value;
        const paramId = `${this.descriptor.id}.${id}`;
        // @ts-ignore
        window.rpcCommandDispatcher.dispatch({ type: 'setParameter', target: paramId, value: value });
        this.updateControlUI(id, value);
    }
    updateControlUI(id, value) {
        const entity = this.getRegistryEntity(id);
        if (!entity)
            return;
        const cell = this.content.querySelector(`[data-id="${id}"]`);
        if (!cell)
            return;
        const input = cell.querySelector(`input[data-param="${id}"]`);
        if (input)
            input.value = value.toString();
        const sw = cell.querySelector(`.sw-unit[data-param="${id}"]`);
        if (sw)
            sw.setAttribute('data-state', value > 0.5 ? "1" : "0");
        const sel = cell.querySelector(`select[data-param="${id}"]`);
        if (sel)
            sel.value = value.toString();
        const knob = cell.querySelector(`.knob-ring[data-param="${id}"]`);
        if (knob)
            this._updateKnobVisual(knob, entity, value);
        const display = cell.querySelector('.cell-display');
        if (display) {
            display.innerText = this._getEntityValueLabel(entity, value);
        }
    }
    _getEntityValueLabel(entity, value) {
        if (!entity)
            return value.toString();
        if (entity.options) {
            const opt = entity.options.find((o) => o.value === value);
            if (opt)
                return opt.label;
        }
        if (entity.id === "midi_channel" && value >= 0 && value <= 16) {
            return value === 0 ? "OMNI" : `CH ${Math.round(value)}`;
        }
        return typeof value === 'number' ? value.toFixed(2) : value.toString();
    }
    _updateKnobVisual(ctrl, entity, value) {
        const marker = ctrl.querySelector('.knob-marker');
        if (!marker)
            return;
        const range = entity.range || { min: 0, max: 1 };
        const norm = (value - range.min) / ((range.max - range.min) || 1);
        const angle = -135 + (norm * 270);
        marker.style.transform = `translateX(-50%) rotate(${angle}deg)`;
    }
    syncAllFromStore() {
        if (!this.isInitialized || !this.descriptor.items)
            return;
        this.descriptor.items.forEach(item => {
            const id = item.paramId || item.id || item.source;
            if (id) {
                const globalId = `${this.descriptor.id}.${id}`;
                const store = window.runtimeStore.getSnapshot();
                const val = store.params[globalId];
                const tVal = store.telemetry[globalId];
                if (val !== undefined) {
                    this.values[id] = val;
                    this.updateControlUI(id, val);
                }
                if (tVal !== undefined) {
                    this.updateTelemetryUI(id, tVal.v || 0);
                }
            }
        });
    }
    updateTelemetryUI(source, value) {
        const leds = this.content.querySelectorAll(`.led[data-source="${source}"]`);
        leds.forEach(led => {
            led.classList.toggle('active', value > 0.05);
        });
        const meters = this.content.querySelectorAll(`[data-source="${source}"] .meter-bar, [data-source="${source}"] .mini-meter .meter-bar`);
        meters.forEach(bar => {
            bar.style.height = `${Math.min(100, value * 100)}%`;
        });
    }
    onStateUpdate(state) {
        // Era 6: Legacy bridge for manual triggers, mostly handled by store subscription now
        this.syncAllFromStore();
    }
}
export default ModuleRenderer;
//# sourceMappingURL=module_renderer.js.map