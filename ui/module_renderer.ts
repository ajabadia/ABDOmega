/**
 * OMEGA Module Renderer (TypeScript)
 * Generic engine for declarative UI modules.
 * ERA 7: High-Fidelity Absolute Positioning & Multi-Tab Interface
 */

import { OmegaLog } from './omega_log.js';
import { type ModuleDescriptor, type LayoutItem, type RegistryEntity, type LayoutContainer } from './contracts/ModuleContract.js';

export class ModuleRenderer {
    private el: HTMLElement;
    private content: HTMLElement;
    private descriptor: ModuleDescriptor;
    private values: Record<string, number> = {};
    private isInitialized: boolean = false;
    private activeTab: string = 'MAIN';
    private readonly RENDER_SCALE: number = 1.5; // Aligned with abd-ia_synths VirtualRack
    private activityTimeouts: Map<string, any> = new Map();

    constructor(el: HTMLElement, content: HTMLElement, options: any) {
        this.el = el;
        this.content = content;
        
        // Era 7: The ModuleManager passes the actual manifest inside the 'manifest' property
        this.descriptor = options.manifest || options;
        
        // Auto-detect initial tab if available from any item
        const allItems = [...(this.descriptor.ui?.controls || []), ...(this.descriptor.ui?.jacks || [])];
        const firstWithTab = allItems.find(i => i.presentation?.tab);
        if (firstWithTab && firstWithTab.presentation?.tab) {
            this.activeTab = firstWithTab.presentation.tab;
        }
        
        OmegaLog.info('RENDERER', `ModuleRenderer initialized for: ${this.descriptor.id} (Items: ${allItems.length})`);
    }

    async init(): Promise<void> {
        this.render();
        this.bind();
        this.isInitialized = true;
        this.subscribeToTelemetry();
        this.syncAllFromStore();
    }

    private subscribeToTelemetry(): void {
        const pins: string[] = [];
        const allItems = [...(this.descriptor.ui?.controls || []), ...(this.descriptor.ui?.jacks || [])];
        
        allItems.forEach(item => {
            // Check main component
            if (item.presentation?.component === 'led' || item.look === 'led') {
                const id = item.source || item.bind || item.id;
                if (id) pins.push(`${this.descriptor.id}.${id}`);
            }
            // Check attachments
            item.presentation?.attachments?.forEach((att: any) => {
                if (att.type === 'led' || att.type === 'display' || att.type === 'stepper') {
                    const id = att.bind || item.bind || item.id;
                    if (id) pins.push(`${this.descriptor.id}.${id}`);
                }
            });
        });

        if (pins.length > 0) {
            window.rpcCommandDispatcher.dispatch({
                type: 'subscribeTelemetry',
                payload: { pins: [...new Set(pins)] } // Unique pins
            } as any);
        }
    }

    private getRegistryEntity(id: string): RegistryEntity | null {
        if (!this.descriptor.registry) return null;
        return this.descriptor.registry.find((e: RegistryEntity) => e.id === id) || null;
    }

    render(): void {
        const desc = this.descriptor;
        const skinClass = `skin-${desc.ui?.skin || 'default'}`;
        const themeClass = `theme-${desc.theme || 'default'}`;
        const classes = ["aseptic-module", skinClass, themeClass];

        // Apply scale to dimensions
        const width = (desc.ui?.dimensions?.width || 120) * this.RENDER_SCALE;
        const height = (desc.ui?.dimensions?.height || 420) * this.RENDER_SCALE;
        
        // Extract all tabs
        const allItems = [...(desc.ui?.controls || []), ...(desc.ui?.jacks || [])];
        const tabs = [...new Set(allItems.map(i => i.presentation?.tab || 'MAIN'))].sort();

        this.content.innerHTML = `
            <div class="${classes.join(' ')}" style="width: ${width}px; height: ${height}px; position: relative; overflow: hidden;">
                
                <!-- TAB NAVIGATION (Aligned with Editor) -->
                ${tabs.length > 1 ? `
                <div class="module-tabs" style="display: flex; gap: 4px; padding: 10px; background: rgba(0,0,0,0.4); border-bottom: 1px solid rgba(255,255,255,0.05);">
                    ${tabs.map(t => `
                        <button class="tab-btn ${this.activeTab === t ? 'active' : ''}" data-tab="${t}" style="font-size: 9px; font-weight: 900; letter-spacing: 1px; background: ${this.activeTab === t ? 'var(--omega-cyan)' : 'transparent'}; color: ${this.activeTab === t ? '#000' : 'rgba(255,255,255,0.4)'}; border: none; border-radius: 20px; padding: 4px 12px; cursor: pointer;">
                            ${t}
                        </button>
                    `).join('')}
                </div>
                ` : ''}

                <!-- ABSOLUTE CANVAS -->
                <div class="module-canvas" style="position: absolute; inset: 0; padding-top: ${tabs.length > 1 ? '40px' : '0'}">
                    ${allItems
                        .filter(item => this.shouldRenderInTab(item, this.activeTab))
                        .map(item => this.renderItem(item))
                        .join('')}
                    
                    <!-- LAYOUT CONTAINERS (Era 7.2) -->
                    ${this.renderContainers()}
                </div>
            </div>
        `;

        // Bind Tab Switchers
        this.content.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.activeTab = (e.target as HTMLElement).dataset.tab || 'MAIN';
                this.render();
                this.bind();
                this.syncAllFromStore();
            });
        });
    }

    private renderItem(item: any): string {
        const id = item.bind || item.paramId || item.source || item.portId;
        const entity = id ? this.getRegistryEntity(id) : null;
        const label = item.label || (entity ? entity.label : (id || ""));
        
        // Era 7.2.2: Hierarchical Tab Check (Container Authority)
        if (!this.shouldRenderInTab(item, this.activeTab)) return '';

        // [RULE OF 5px] - Force alignment to industrial grid before scaling
        const rawX = item.pos?.x || 0;
        const rawY = item.pos?.y || 0;
        const gridX = Math.round(rawX / 5) * 5;
        const gridY = Math.round(rawY / 5) * 5;

        // Absolute position from Era 7 manifest (with Industrial Scaling)
        const x = gridX * this.RENDER_SCALE;
        const y = gridY * this.RENDER_SCALE;
        const style = `position: absolute; left: ${x}px; top: ${y}px; transform: translate(-50%, -50%);`;

        const cellClass = `control-cell variant-${item.presentation?.variant || item.variant || 'default'} ${!entity?.role ? 'role-orphan' : ''}`;
        
        // Aligned Validation: Check if bind exists in registry (Governance ERA 4)
        if (id && !entity) {
            console.warn(`[GOVERNANCE] Binding error: '${id}' not found in registry. Module: ${this.descriptor.id}`);
        }

        const attachments = item.presentation?.attachments || [];

        return `
            <div class="${cellClass}" style="${style}" data-id="${id}" data-bind="${id}">
                ${this.renderAttachmentGroup(attachments, 'top', label, entity, id)}
                
                <div class="cell-row-middle" style="display: flex; align-items: center; justify-content: center;">
                    ${this.renderAttachmentGroup(attachments, 'left', label, entity, id)}
                    <div class="cell-main">
                        ${this.renderComponent(item, entity, label)}
                    </div>
                    ${this.renderAttachmentGroup(attachments, 'right', label, entity, id)}
                </div>

                ${this.renderAttachmentGroup(attachments, 'bottom', label, entity, id)}
            </div>
        `;
    }

    private shouldRenderInTab(item: any, activeTab: string): boolean {
        const currentTab = activeTab || 'MAIN';
        const containerId = item.presentation?.container || item.presentation?.group;
        
        if (containerId) {
            const layout = this.descriptor.ui?.layout;
            const container = layout?.containers?.find(c => c.id === containerId);
            
            // If container has a tab, it rules (Container Authority)
            if (container && container.tab) {
                return container.tab === currentTab;
            }
        }
        
        // Fallback or Orphan: Use local item tab
        const itemTab = item.presentation?.tab || 'MAIN';
        return itemTab === currentTab;
    }
    
    private renderContainers(): string {
        const layout = this.descriptor.ui?.layout;
        if (!layout || !layout.containers) return '';
        
        const rackWidth = (this.descriptor.ui?.dimensions?.width || 120);
        const currentTab = this.activeTab || 'MAIN';
        
        // Filter by tab (Architectural Planes)
        const activeContainers = layout.containers.filter(c => {
            if (!c.tab) return true; // Global container
            return c.tab === currentTab;
        });

        // Render in z-index order
        const sorted = [...activeContainers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
        
        return sorted.map(c => {
            const x = c.pos.x * this.RENDER_SCALE;
            const y = c.pos.y * this.RENDER_SCALE;
            const w = this.resolveContainerWidth(c.size.w, rackWidth) * this.RENDER_SCALE;
            const h = c.size.h * this.RENDER_SCALE;
            
            const variantClass = `container-variant-${c.variant || 'default'}`;
            const labelPosClass = `label-pos-${c.labelPosition || 'top'}`;
            
            const style = `
                position: absolute; 
                left: ${x}px; 
                top: ${y}px; 
                width: ${w}px; 
                height: ${h}px; 
                z-index: ${c.zIndex || 0};
                pointer-events: none;
                overflow: hidden;
            `;
            
            return `
                <div class="layout-container ${variantClass} ${labelPosClass}" style="${style}" data-container-id="${c.id}">
                    <div class="container-label">${c.label}</div>
                </div>
            `;
        }).join('');
    }

    private resolveContainerWidth(w: string | number, rackWidth: number): number {
        if (typeof w === 'number') return w;
        
        switch (w) {
            case 'full': return rackWidth;
            case '3/4': return rackWidth * 0.75;
            case '2/3': return rackWidth * 0.667;
            case '1/2': return rackWidth * 0.5;
            case '1/3': return rackWidth * 0.333;
            case '1/4': return rackWidth * 0.25;
            default: 
                const val = parseFloat(w);
                return isNaN(val) ? rackWidth : val;
        }
    }

    private renderAttachmentGroup(all: any[], pos: string, fallbackLabel: string, entity: any, parentId: string): string {
        const filtered = all.filter(a => a.position === pos);
        if (filtered.length === 0) return '';

        return `
            <div class="attachment-stack stack-${pos}" style="display: flex; flex-direction: ${pos === 'top' || pos === 'bottom' ? 'column' : 'row'}; align-items: center; justify-content: center;">
                ${filtered.map(att => {
                    // Era 7.1: Dual Precision Offsets (Sub-pixel + Aligned Scale)
                    const offX = (att.offsetX || (pos === 'left' || pos === 'right' ? att.offset : 0) || 0) * this.RENDER_SCALE;
                    const offY = (att.offsetY || (pos === 'top' || pos === 'bottom' ? att.offset : 0) || 0) * this.RENDER_SCALE;
                    
                    const transform = `transform: translate(${offX}px, ${offY}px);`;
                    const margin = pos === 'top' ? `margin-bottom: 6px` : 
                                   pos === 'bottom' ? `margin-top: 6px` :
                                   pos === 'left' ? `margin-right: 6px` :
                                   `margin-left: 6px`;
                    
                    const bindId = att.bind || parentId;
                    const val = this.values[bindId] ?? entity?.range?.default ?? 0;

                    if (att.type === 'label') {
                        return `<label class="cell-label" style="${margin}; ${transform}">${att.text || fallbackLabel}</label>`;
                    }
                    if (att.type === 'led') {
                        return `<div class="led variant-${att.variant || 'A'} led-suffix-${att.variant || 'red'}" data-source="${bindId}" style="${margin}; ${transform}"></div>`;
                    }
                    if (att.type === 'display') {
                        const formatted = this._getFormattedValue(att, entity, val);
                        return `<div class="mini-display" data-source="${bindId}" style="${margin}; ${transform}">${formatted}</div>`;
                    }
                    if (att.type === 'stepper') {
                        return `
                            <div class="stepper-attachment" style="${margin}; ${transform}">
                                <button class="stepper-btn" data-dir="-1" data-bind="${bindId}">-</button>
                                <button class="stepper-btn" data-dir="1" data-bind="${bindId}">+</button>
                            </div>
                        `;
                    }
                    return '';
                }).join('')}
            </div>
        `;
    }

    private _getFormattedValue(att: any, entity: any, val: number): string {
        const fmt = att.format || {};
        // Aligned with Editor: prioritize precision/ui_precision fields
        const decimals = att.ui_precision ?? fmt.decimals ?? 2;
        const prefix = fmt.prefix || '';
        const suffix = fmt.suffix || '';
        
        let label = this._getEntityValueLabel(entity, val, decimals);
        return `${prefix}${label}${suffix}`;
    }

    private renderComponent(item: any, entity: RegistryEntity | null, label: string): string {
        const look = item.presentation?.component || item.look || 'knob';
        const id = item.bind || item.paramId || item.source || item.portId || '';
        const val = this.values[id] ?? 0;

        switch(look) {
            case 'knob':
                return `
                    <div class="knob-ring" data-param="${id}">
                        <div class="knob"><div class="knob-marker white"></div></div>
                    </div>
                `;
            case 'slider-v':
            case 'slider-h':
                const range = entity?.range || { min: 0, max: 1, step: 'any', default: 0 };
                return `<input type="range" class="${look === 'slider-h' ? 'h-slider' : 'v-slider'}" data-param="${id}" min="${range.min}" max="${range.max}" step="${range.step}" value="${this.values[id] ?? range.default}" />`;
            case 'port':
            case 'jack':
                const portColor = item.presentation?.color || this._inferPortColor(id, entity);
                return `
                    <div class="port-socket" data-port="${id}" style="--port-color: ${portColor}">
                        <div class="port-inner">
                            <div class="port-led" data-source="${id}"></div>
                        </div>
                    </div>
                `;
            case 'display':
                const formatted = this._getFormattedValue(item.presentation, entity, val);
                return `
                    <div class="mini-display" data-id="${id}" style="position: relative;">
                        <button class="display-btn minus" data-dir="-1" data-bind="${id}">-</button>
                        <div class="display-value" data-source="${id}">${formatted}</div>
                        <button class="display-btn plus" data-dir="1" data-bind="${id}">+</button>
                    </div>
                `;
            case 'led':
                return `<div class="led variant-${item.presentation?.variant || 'A'}" id="led-${id}" data-source="${id}"></div>`;
            case 'select':
                const options = entity?.options || [];
                const currentIndex = Math.floor(val * options.length);
                const currentLabel = options[currentIndex]?.label || "SELECT";
                return `
                    <div class="industrial-select-wrapper" data-param="${id}">
                        <div class="industrial-select-label">${currentLabel}</div>
                        <div class="industrial-select-icon">▼</div>
                    </div>
                `;
            default:
                return `<div class="placeholder-comp">${look}</div>`;
        }
    }

    private bind(): void {
        const allItems = [...(this.descriptor.ui?.controls || []), ...(this.descriptor.ui?.jacks || [])];
        
        allItems.forEach(item => {
            const look = item.presentation?.component || item.look || 'knob';
            const id = item.bind || item.paramId || item.source || item.portId;
            const entity = id ? this.getRegistryEntity(id) : null;
            if (!entity) return;

            const selector = `[data-id="${id}"]`;
            const cell = this.content.querySelector(selector);
            if (!cell) return;

            if (look === 'knob') {
                const ctrl = cell.querySelector(`.knob-ring`) as HTMLElement;
                if (ctrl) this._bindKnob(ctrl, entity);
            } else if (look === 'slider-v' || look === 'slider-h') {
                const input = cell.querySelector(`input`) as HTMLInputElement;
                if (input) input.addEventListener('input', (e) => this.setParam(id as string, parseFloat((e.target as HTMLInputElement).value)));
            } else if (look === 'display') {
                const ctrl = cell.querySelector(`.display-unit`) as HTMLElement;
                if (ctrl) this._bindDisplay(ctrl, entity);
            } else if (look === 'select') {
                const sel = cell.querySelector(`select`) as HTMLSelectElement;
                if (sel) sel.addEventListener('change', (e) => this.setParam(id as string, parseFloat((e.target as HTMLSelectElement).value)));
            } else if (look === 'button' || look === 'switch' || look === 'toggle') {
                const trigger = cell.querySelector(`[data-param]`) as HTMLElement;
                if (trigger) {
                    trigger.addEventListener('click', () => {
                        const current = this.values[id as string] || entity.range?.default || 0;
                        this.setParam(id as string, current > 0.5 ? 0 : 1);
                    });
                }
            } else if (look === 'select' || item.presentation?.component === 'select') {
                const trigger = cell.querySelector(`.industrial-select-wrapper`) as HTMLElement;
                if (trigger) {
                    trigger.addEventListener('click', () => {
                        const options = entity.options || [];
                        if (options.length === 0) return;
                        const currentVal = this.values[id as string] || 0;
                        const currentIndex = Math.floor(currentVal * options.length);
                        const nextIndex = (currentIndex + 1) % options.length;
                        this.setParam(id as string, nextIndex / options.length);
                        
                        // Local update for immediate feedback
                        const labelEl = trigger.querySelector('.industrial-select-label');
                        if (labelEl && options[nextIndex]) labelEl.textContent = options[nextIndex].label;
                    });
                }
            }
            
            // Era 7.1: Bind Stepper Buttons (Both Attachment and Integrated)
            const steppers = cell.querySelectorAll('.stepper-btn, .display-btn');
            steppers.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const targetId = (e.target as HTMLElement).dataset.bind || id;
                    const dir = parseInt((e.target as HTMLElement).dataset.dir || "0");
                    const targetEntity = this.getRegistryEntity(targetId as string);
                    if (targetEntity) {
                        const range = targetEntity.range || { min: 0, max: 1, step: 1 };
                        const current = this.values[targetId as string] ?? (range as any).default ?? 0;
                        
                        // Normalización: Si el paso es 1 y el rango es > 1, calculamos el incremento float
                        const stepVal = range.step || (1 / (range.max - range.min || 100));
                        let next = current + (dir * stepVal);
                        next = Math.max(range.min, Math.min(range.max, next));
                        this.setParam(targetId as string, next);
                    }
                });
            });
        });
    }

    private _bindKnob(ctrl: HTMLElement, entity: any): void {
        const knob = ctrl.querySelector('.knob') as HTMLElement;
        if (!knob) return;

        let isDragging = false;
        let startY = 0;
        let startVal = 0;
        const range = entity.range || { min: 0, max: 1 };

        knob.addEventListener('pointerdown', (e: PointerEvent) => {
            isDragging = true;
            startY = e.clientY;
            startVal = this.values[entity.id] ?? range.default ?? 0;
            knob.setPointerCapture(e.pointerId);
            e.preventDefault();
        });

        const onMove = (e: PointerEvent) => {
            if (!isDragging) return;
            const delta = (startY - e.clientY) / 150;
            let next = startVal + delta * (range.max - range.min);
            next = Math.max(range.min, Math.min(range.max, next));
            this.setParam(entity.id, next);
        };

        const onUp = (e: PointerEvent) => { 
            if (isDragging) {
                isDragging = false;
                knob.releasePointerCapture(e.pointerId);
            }
        };
        
        knob.addEventListener('pointermove', onMove as EventListener);
        knob.addEventListener('pointerup', onUp as EventListener);
        knob.addEventListener('pointercancel', onUp as EventListener);
    }

    private _bindDisplay(ctrl: HTMLElement, entity: any): void {
        // Deprecated in favor of unified binder in bind()
    }

    setParam(id: string, value: number): void {
        this.values[id] = value;
        const paramId = `${this.descriptor.id}.${id}`;
        window.rpcCommandDispatcher.dispatch({ 
            type: 'setParameter', 
            payload: { target: paramId, value: value } 
        });
        this.updateControlUI(id, value);
    }

    updateControlUI(id: string, value: number): void {
        const entity = this.getRegistryEntity(id);
        const cell = this.content.querySelector(`[data-id="${id}"]`) as HTMLElement;
        if (!cell) return;

        // Update main component
        const input = cell.querySelector(`input`) as HTMLInputElement;
        if (input) input.value = value.toString();

        const sw = cell.querySelector(`.sw-unit`) as HTMLElement;
        if (sw) sw.setAttribute('data-state', value > 0.5 ? "1" : "0");

        const knob = cell.querySelector(`.knob-ring`) as HTMLElement;
        if (knob && entity) this._updateKnobVisual(knob, entity, value);
        
        const display = cell.querySelector('.display-value') as HTMLElement;
        if (display) display.innerText = this._getEntityValueLabel(entity, value);

        // Update attachments (mini-displays, etc.)
        const miniDisplays = cell.querySelectorAll('.mini-display');
        miniDisplays.forEach(md => {
            (md as HTMLElement).innerText = value.toFixed(2);
        });

        // Era 7.2.3: Activity Heatmap
        this.triggerContainerActivity(id);
    }

    private triggerContainerActivity(id: string): void {
        const item = [...(this.descriptor.ui?.controls || []), ...(this.descriptor.ui?.jacks || [])]
            .find(i => (i.bind || i.paramId || i.source || i.portId) === id);
        
        const containerId = item?.presentation?.container || item?.presentation?.group;
        if (!containerId) return;

        const containerEl = this.content.querySelector(`[data-container-id="${containerId}"]`) as HTMLElement;
        if (!containerEl) return;

        // Reset pulse
        containerEl.classList.remove('active-pulse');
        void containerEl.offsetWidth; // Force reflow
        containerEl.classList.add('active-pulse');

        // Clear existing timeout
        if (this.activityTimeouts.has(containerId)) {
            clearTimeout(this.activityTimeouts.get(containerId));
        }

        // Set timeout to remove pulse after 2s of inactivity
        const timeout = setTimeout(() => {
            containerEl.classList.remove('active-pulse');
            this.activityTimeouts.delete(containerId);
        }, 2000);

        this.activityTimeouts.set(containerId, timeout);
    }

    private _getEntityValueLabel(entity: RegistryEntity | null, value: number, decimals: number = 2): string {
        if (!entity) return value.toFixed(decimals);
        if (entity.options) {
            const opt = entity.options.find((o: any) => o.value === value);
            if (opt) return opt.label;
        }
        
        // Governance ERA 4: Use 6 decimals for internal calculations if precision is high
        return value.toFixed(decimals);
    }

    private _updateKnobVisual(ctrl: HTMLElement, entity: RegistryEntity, value: number): void {
        const marker = ctrl.querySelector('.knob-marker') as HTMLElement;
        if (!marker) return;
        const range = entity.range || { min: 0, max: 1 };
        const norm = (value - range.min) / ((range.max - range.min) || 1);
        const angle = -135 + (norm * 270);
        marker.style.transform = `translateX(-50%) rotate(${angle}deg)`;
    }

    private syncAllFromStore(): void {
        if (!this.isInitialized) return;
        const allItems = [...(this.descriptor.ui?.controls || []), ...(this.descriptor.ui?.jacks || [])];
        
        allItems.forEach(item => {
            const id = item.bind || item.id || item.source;
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

    private updateTelemetryUI(source: string, value: number): void {
        const targets = this.content.querySelectorAll(`[data-source="${source}"]`);
        targets.forEach(t => {
            if (t.classList.contains('led') || t.classList.contains('port-led')) {
                t.classList.toggle('active', value > 0.05);
            }
            if (t.classList.contains('mini-display')) {
                (t as HTMLElement).innerText = value.toFixed(2);
            }
        });
    }

    private _inferPortColor(id: string, entity: any): string {
        if (!id) return 'var(--neon-cyan)';
        
        // Aligned with Era 7.2.3 Briefing
        const role = entity?.role?.toLowerCase() || "";
        const idLower = id.toLowerCase();
        
        if (role.includes('audio') || role.includes('pitch') || idLower.includes('out') || idLower.includes('audio')) {
            return 'var(--signal-audio)';
        }
        if (role.includes('cv') || role.includes('mod') || idLower.includes('cv') || idLower.includes('mod')) {
            return 'var(--signal-cv)';
        }
        if (role.includes('gate') || role.includes('trig') || idLower.includes('gate') || idLower.includes('trig')) {
            return 'var(--signal-gate)';
        }
        if (role.includes('midi') || idLower.includes('midi')) {
            return 'var(--signal-midi)';
        }
        
        return 'var(--neon-cyan)'; // Default
    }

    public onStateUpdate(state: any): void {
        OmegaLog.debug('RENDERER', `State update received for module: ${this.descriptor.id}`);
        this.syncAllFromStore();
    }
}

export default ModuleRenderer;
