/**
 * OMEGA Module Renderer (TypeScript)
 * Generic engine for declarative UI modules.
 */

import { MetadataStore, type ParamDescriptor } from './metadata_store.js';

export interface LayoutItem {
    paramId: string;
    control: 'knob' | 'slider-v' | 'toggle' | 'select' | 'telemetry';
    label?: string;
    row: number;
    col: number;
    colSpan?: number;
    variant?: string;
}

export interface ModuleDescriptor {
    id: string;
    title?: string;
    panelClass?: string;
    toolbarFocusIndex?: number;
    grid?: {
        columns: number;
        gap: number;
    };
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
        this.descriptor = descriptor;
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
                <div class="module-grid" style="display:grid; grid-template-columns: repeat(${desc.grid?.columns || 2}, 1fr); gap: ${desc.grid?.gap || 12}px;">
                    ${desc.items.map(item => this.renderItem(item)).join('')}
                </div>
                ${this.renderFooter()}
            </div>
        `;
    }

    private renderItem(item: LayoutItem): string {
        // @ts-ignore
        const param = window.metadataStore.getParam(item.paramId);
        if (!param) return `<!-- Param ${item.paramId} not found -->`;

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

    private renderFooter(): string {
        const footer = this.descriptor.footer;
        if (!footer) return '';
        return `
            <div class="module-footer" style="padding: 4px 10px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                ${footer.paramId ? `<button class="sq juno-red" data-param="${footer.paramId}" data-role="status" style="width:24px; height:24px;"></button>` : ''}
                <span class="label-tiny" style="font-size: 9px; color: #555; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; flex: 1; text-align: right;">${footer.label || ''}</span>
            </div>
        `;
    }

    private bind(): void {
        this.descriptor.items.forEach(item => {
            // @ts-ignore
            const param = window.metadataStore.getParam(item.paramId);
            if (!param) return;

            if (item.control === 'knob') {
                const ctrl = this.content.querySelector(`[data-param="${param.id}"].knob-control`) as HTMLElement;
                if (ctrl) this._bindKnob(ctrl, param);
            } else if (item.control === 'slider-v') {
                const input = this.content.querySelector(`input[data-param="${param.id}"]`) as HTMLInputElement;
                if (input) {
                    input.addEventListener('input', (e) => this.setParam(param.id, parseFloat((e.target as HTMLInputElement).value)));
                }
            } else if (item.control === 'toggle') {
                const btn = this.content.querySelector(`button[data-param="${param.id}"]`) as HTMLButtonElement;
                if (btn) {
                    btn.addEventListener('click', () => {
                        const current = this.values[param.id] || param.default || 0;
                        this.setParam(param.id, current > 0.5 ? 0 : 1);
                    });
                }
            } else if (item.control === 'select') {
                const sel = this.content.querySelector(`select[data-param="${param.id}"]`) as HTMLSelectElement;
                if (sel) {
                    sel.addEventListener('change', (e) => this.setParam(param.id, parseFloat((e.target as HTMLSelectElement).value)));
                }
            } else if (item.control === 'telemetry') {
                // Telemetry is read-only, no binding needed for input
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

        const input = this.content.querySelector(`input[data-param="${id}"]`) as HTMLInputElement;
        if (input && input.type === 'range') input.value = value.toString();

        const btn = this.content.querySelector(`button[data-param="${id}"]`) as HTMLButtonElement;
        if (btn) btn.classList.toggle('active', value > 0.5);

        const sel = this.content.querySelector(`select[data-param="${id}"]`) as HTMLSelectElement;
        if (sel) sel.value = value.toString();

        const knob = this.content.querySelector(`[data-param="${id}"].knob-control`) as HTMLElement;
        if (knob) this._updateKnobVisual(knob, param, value);
        
        const fBtn = this.content.querySelector(`button[data-param="${id}"][data-role="status"]`) as HTMLButtonElement;
        if (fBtn) fBtn.innerText = value > 0.5 ? "ON" : "BYPASS";
    }

    private _updateKnobVisual(ctrl: HTMLElement, param: ParamDescriptor, value: number): void {
        const marker = ctrl.querySelector('.knob-marker') as HTMLElement;
        if (!marker) return;
        const norm = (value - param.min) / ((param.max - param.min) || 1);
        const angle = -135 + (norm * 270);
        marker.style.transform = `translateX(-50%) rotate(${angle}deg)`;
    }
}

export default ModuleRenderer;
