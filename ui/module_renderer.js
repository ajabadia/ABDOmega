import { OmegaLog } from './omega_log.js';
import {} from './contracts/ModuleContract.js';
import { CellRenderer } from './omega-ui-core/renderers/CellRenderer.js';
export class ModuleRenderer {
    el;
    content;
    descriptor;
    values = {};
    isInitialized = false;
    activeTab = 'MAIN';
    RENDER_SCALE = 1.5;
    constructor(el, content, options) {
        this.el = el;
        this.content = content;
        this.descriptor = options.manifest || options;
        const allItems = [...(this.descriptor.ui?.controls || []), ...(this.descriptor.ui?.jacks || [])];
        const firstWithTab = allItems.find(i => i.presentation?.tab);
        if (firstWithTab && firstWithTab.presentation?.tab) {
            this.activeTab = firstWithTab.presentation.tab;
        }
        OmegaLog.info('RENDERER', `ModuleRenderer initialized for: ${this.descriptor.id}`);
    }
    async init() {
        this.render();
        this.bind();
        this.isInitialized = true;
        this.subscribeToTelemetry();
        this.syncAllFromStore();
    }
    subscribeToTelemetry() {
        const pins = [];
        const allItems = [...(this.descriptor.ui?.controls || []), ...(this.descriptor.ui?.jacks || [])];
        allItems.forEach(item => {
            if (item.presentation?.component === 'led' || item.look === 'led' || item.presentation?.component === 'port') {
                const id = item.source || item.bind || item.id;
                if (id)
                    pins.push(`${this.descriptor.id}.${id}`);
            }
            item.presentation?.attachments?.forEach((att) => {
                if (att.type === 'led' || att.type === 'display') {
                    const id = att.bind || item.bind || item.id;
                    if (id)
                        pins.push(`${this.descriptor.id}.${id}`);
                }
            });
        });
        if (pins.length > 0) {
            window.rpcCommandDispatcher.dispatch({
                type: 'subscribeTelemetry',
                payload: { pins: [...new Set(pins)] }
            });
        }
    }
    render() {
        const desc = this.descriptor;
        const skin = desc.ui?.skin || 'industrial';
        const w = (desc.ui?.dimensions?.width || 120) * this.RENDER_SCALE;
        const h = (desc.ui?.dimensions?.height || 420) * this.RENDER_SCALE;
        const allItems = [...(desc.ui?.controls || []), ...(desc.ui?.jacks || [])];
        const tabs = [...new Set(allItems.map(i => i.presentation?.tab || 'MAIN'))].sort();
        this.content.innerHTML = `
            <div class="module-panel skin-${skin}" style="width: ${w}px; height: ${h}px; box-sizing: content-box; border-left: 4px solid #333; border-right: 4px solid #333; border-top: 1px solid #444; border-bottom: 1px solid #111; box-shadow: 0 10px 30px rgba(0,0,0,0.8); position: relative;">
                <!-- Industrial Screws -->
                <div class="module-screw top-left"></div>
                <div class="module-screw top-right"></div>
                <div class="module-screw bottom-left"></div>
                <div class="module-screw bottom-right"></div>
                
                ${tabs.length > 1 ? `
                <div class="module-tabs">
                    ${tabs.map(t => {
            const isActive = this.activeTab === t;
            return `<button class="tab-btn ${isActive ? 'active' : ''}" data-tab="${t}">${t}</button>`;
        }).join('')}
                </div>
                ` : ''}

                <div class="module-canvas" style="position: absolute; inset: 0; overflow: hidden;">
                    <div class="layer layer-background">${this.renderContainers()}</div>
                    <div class="layer layer-controls">
                        ${allItems
            .filter(item => this.shouldRenderInTab(item, this.activeTab))
            .map(item => this.renderItem(item))
            .join('')}
                    </div>
                </div>
            </div>
        `;
        this.bind();
        this.syncAllFromStore();
    }
    renderItem(item) {
        const id = item.bind || item.paramId || item.source || item.portId;
        const val = this.values[id] ?? 0;
        const x = (item.pos?.x || 0) * this.RENDER_SCALE;
        const y = (item.pos?.y || 0) * this.RENDER_SCALE;
        const html = CellRenderer.renderCellHTML(item, {
            skin: this.descriptor.ui?.skin || 'industrial',
            zoom: this.RENDER_SCALE,
            runtimeValue: val,
            steps: item.steps || 100,
            isSelected: false,
            isLiveMode: true
        });
        return `
            <div class="cell-anchor" style="position: absolute; left: ${x}px; top: ${y}px;">
                ${html}
            </div>
        `;
    }
    shouldRenderInTab(item, activeTab) {
        const currentTab = activeTab || 'MAIN';
        const containerId = item.presentation?.container || item.presentation?.group;
        if (containerId) {
            const container = this.descriptor.ui?.layout?.containers?.find((c) => c.id === containerId);
            if (container && container.tab)
                return container.tab === currentTab;
        }
        return (item.presentation?.tab || 'MAIN') === currentTab;
    }
    renderContainers() {
        const layout = this.descriptor.ui?.layout;
        if (!layout || !layout.containers)
            return '';
        const rackWidth = (this.descriptor.ui?.dimensions?.width || 120);
        const currentTab = this.activeTab || 'MAIN';
        const skin = this.descriptor.ui?.skin || 'industrial';
        const activeContainers = layout.containers.filter((c) => !c.tab || c.tab === currentTab);
        const sorted = [...activeContainers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
        return sorted.map((c) => {
            const x = c.pos.x * this.RENDER_SCALE;
            const y = c.pos.y * this.RENDER_SCALE;
            const w = this.resolveContainerWidth(c.size.w, rackWidth) * this.RENDER_SCALE;
            const h = c.size.h * this.RENDER_SCALE;
            const variant = c.variant || 'default';
            const style = `position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; z-index: ${c.zIndex || 0}; pointer-events: none;`;
            return `
                <div class="layout-container container-${skin} variant-${variant}" style="${style}" data-container-id="${c.id}">
                    ${c.label ? `<div class="container-label-pill">${c.label}</div>` : ''}
                </div>
            `;
        }).join('');
    }
    resolveContainerWidth(w, rackWidth) {
        if (typeof w === 'number')
            return w;
        switch (w) {
            case 'full': return rackWidth;
            case '1/2': return rackWidth * 0.5;
            default: return parseFloat(w) || rackWidth;
        }
    }
    getRegistryEntity(id) {
        return window.omegaCatalog?.[id];
    }
    bind() {
        // Tab Navigation
        this.content.querySelectorAll('.tab-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                this.activeTab = e.target.dataset.tab || 'MAIN';
                this.render();
            });
        });
        const allItems = [...(this.descriptor.ui?.controls || []), ...(this.descriptor.ui?.jacks || [])];
        allItems.forEach((item) => {
            const id = item.bind || item.paramId || item.source || item.portId;
            const entity = id ? this.getRegistryEntity(id) : null;
            if (!entity)
                return;
            const cell = this.content.querySelector(`[data-id="${id}"]`);
            if (!cell)
                return;
            const knob = cell.querySelector('.knob-container');
            if (knob)
                this._bindKnob(knob, entity);
            const slider = cell.querySelector('.slider-wrapper');
            if (slider)
                this._bindSlider(slider, entity);
            const steppers = cell.querySelectorAll('.stepper-btn, .display-btn');
            steppers.forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    const targetId = e.target.dataset.bind || id;
                    const dir = parseInt(e.target.dataset.dir || "0");
                    const targetEntity = this.getRegistryEntity(targetId);
                    if (targetEntity) {
                        const range = targetEntity.range || { min: 0, max: 1, step: 1 };
                        const current = this.values[targetId] ?? range.default ?? 0;
                        const stepVal = range.step || 0.01;
                        let next = current + (dir * stepVal);
                        next = Math.max(range.min, Math.min(range.max, next));
                        this.setParam(targetId, next);
                    }
                });
            });
            const sel = cell.querySelector('.industrial-select-wrapper');
            if (sel) {
                sel.addEventListener('click', () => {
                    const options = entity.options || [];
                    if (options.length === 0)
                        return;
                    const currentVal = this.values[id] || 0;
                    const currentIndex = Math.floor(currentVal * options.length);
                    const nextIndex = (currentIndex + 1) % options.length;
                    this.setParam(id, nextIndex / options.length);
                });
            }
        });
    }
    _bindKnob(knob, entity) {
        let isDragging = false;
        let startY = 0;
        let startVal = 0;
        const range = entity.range || { min: 0, max: 1 };
        knob.addEventListener('pointerdown', (e) => {
            isDragging = true;
            startY = e.clientY;
            startVal = this.values[entity.id] ?? range.default ?? 0;
            knob.setPointerCapture(e.pointerId);
            e.preventDefault();
        });
        knob.addEventListener('pointermove', (e) => {
            if (!isDragging)
                return;
            const delta = (startY - e.clientY) / 150;
            let next = startVal + delta * (range.max - range.min);
            next = Math.max(range.min, Math.min(range.max, next));
            this.setParam(entity.id, next);
        });
        const onUp = (e) => {
            if (isDragging) {
                isDragging = false;
                knob.releasePointerCapture(e.pointerId);
            }
        };
        knob.addEventListener('pointerup', onUp);
        knob.addEventListener('pointercancel', onUp);
    }
    _bindSlider(slider, entity) {
        let isDragging = false;
        const isHoriz = slider.classList.contains('slider-h');
        const range = entity.range || { min: 0, max: 1 };
        slider.addEventListener('pointerdown', (e) => {
            isDragging = true;
            slider.setPointerCapture(e.pointerId);
            this._handleSliderMove(e, slider, entity);
            e.preventDefault();
        });
        slider.addEventListener('pointermove', (e) => {
            if (!isDragging)
                return;
            this._handleSliderMove(e, slider, entity);
        });
        const onUp = (e) => {
            if (isDragging) {
                isDragging = false;
                slider.releasePointerCapture(e.pointerId);
            }
        };
        slider.addEventListener('pointerup', onUp);
        slider.addEventListener('pointercancel', onUp);
    }
    _handleSliderMove(e, slider, entity) {
        const rect = slider.getBoundingClientRect();
        const isHoriz = slider.classList.contains('slider-h');
        const range = entity.range || { min: 0, max: 1 };
        let norm = 0;
        if (isHoriz) {
            norm = (e.clientX - rect.left) / rect.width;
        }
        else {
            norm = 1 - (e.clientY - rect.top) / rect.height;
        }
        norm = Math.max(0, Math.min(1, norm));
        const next = range.min + norm * (range.max - range.min);
        this.setParam(entity.id, next);
    }
    setParam(id, value) {
        this.values[id] = value;
        const paramId = `${this.descriptor.id}.${id}`;
        window.rpcCommandDispatcher.dispatch({
            type: 'setParameter',
            payload: { target: paramId, value: value }
        });
        this.updateControlUI(id, value);
    }
    updateControlUI(id, value) {
        const cell = this.content.querySelector(`[data-id="${id}"]`);
        if (!cell)
            return;
        const knobMarker = cell.querySelector('.knob-marker');
        if (knobMarker) {
            const angle = -135 + (value * 270);
            knobMarker.style.transform = `translate(-50%, -100%) rotate(${angle}deg)`;
        }
        const slider = cell.querySelector('.slider-wrapper');
        if (slider) {
            const isHoriz = slider.classList.contains('slider-h');
            const rail = slider.querySelector('.slider-rail-active');
            const cap = slider.querySelector('.slider-cap');
            if (rail) {
                if (isHoriz)
                    rail.style.width = `calc(${value * 100}% - 4px)`;
                else
                    rail.style.height = `calc(${value * 100}% - 4px)`;
            }
            if (cap) {
                if (isHoriz)
                    cap.style.left = `calc(${value * 90}%)`;
                else
                    cap.style.bottom = `calc(${value * 90}%)`;
            }
        }
        const display = cell.querySelector('.display-value');
        if (display) {
            const entity = this.getRegistryEntity(id);
            display.innerText = this._getFormattedValue(null, entity, value);
        }
        const selValue = cell.querySelector('.select-value');
        if (selValue) {
            const entity = this.getRegistryEntity(id);
            selValue.textContent = this._getEntityValueLabel(entity, value);
        }
        this.triggerContainerActivity(id);
    }
    triggerContainerActivity(id) {
        const item = [...(this.descriptor.ui?.controls || []), ...(this.descriptor.ui?.jacks || [])]
            .find(i => (i.bind || i.id) === id);
        const containerId = item?.presentation?.container || item?.presentation?.group;
        if (!containerId)
            return;
        const containerEl = this.content.querySelector(`[data-container-id="${containerId}"]`);
        if (!containerEl)
            return;
        containerEl.classList.remove('active-pulse');
        void containerEl.offsetWidth;
        containerEl.classList.add('active-pulse');
    }
    _getFormattedValue(att, entity, val) {
        const precision = att?.ui_precision ?? 2;
        if (!entity)
            return val.toFixed(precision);
        if (entity.options) {
            const opt = entity.options.find((o) => o.value === val);
            if (opt)
                return opt.label;
        }
        return val.toFixed(precision);
    }
    _getEntityValueLabel(entity, value) {
        if (!entity || !entity.options)
            return value.toFixed(2);
        const currentIndex = Math.floor(value * entity.options.length);
        return entity.options[currentIndex]?.label || value.toFixed(2);
    }
    syncAllFromStore() {
        if (!this.isInitialized)
            return;
        const allItems = [...(this.descriptor.ui?.controls || []), ...(this.descriptor.ui?.jacks || [])];
        allItems.forEach((item) => {
            const id = item.bind || item.id || item.source;
            if (id) {
                const globalId = `${this.descriptor.id}.${id}`;
                const store = window.runtimeStore?.getSnapshot();
                if (!store || !store.parameters)
                    return;
                const val = store.parameters[globalId];
                const tVal = store.telemetry ? store.telemetry[globalId] : undefined;
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
        const targets = this.content.querySelectorAll(`[data-source="${source}"]`);
        targets.forEach((el) => {
            const t = el;
            if (t.classList.contains('led') || t.classList.contains('port-led')) {
                const d = parseInt(t.style.width) || 8;
                const baseColor = t.style.backgroundColor;
                t.style.opacity = (0.3 + (value * 0.7)).toString();
                if (value > 0.05) {
                    t.style.boxShadow = `0 0 ${d}px ${baseColor}99`;
                }
                else {
                    t.style.boxShadow = 'none';
                }
            }
            if (t.classList.contains('display-value')) {
                t.innerText = value.toFixed(2);
            }
        });
    }
    _inferPortColor(id, entity) {
        const idLower = (id || '').toLowerCase();
        const label = (entity?.label || '').toLowerCase();
        if (idLower.includes('midi') || label.includes('midi'))
            return 'var(--signal-midi)';
        if (idLower.includes('gate') || label.includes('gate') || idLower.includes('trig'))
            return 'var(--signal-gate)';
        if (idLower.includes('cv') || label.includes('cv') || idLower.includes('mod'))
            return 'var(--signal-cv)';
        if (idLower.includes('pitch') || idLower.includes('freq') || idLower.includes('out') || idLower.includes('in'))
            return 'var(--signal-audio)';
        return 'var(--wb-primary)';
    }
    onStateUpdate(state) {
        this.syncAllFromStore();
    }
}
export default ModuleRenderer;
//# sourceMappingURL=module_renderer.js.map