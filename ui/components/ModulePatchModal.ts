/**
 * OMEGA Unified Module Patch Modal
 * Standardized for Era 6 Aseptic Contract Runtime.
 */
export class ModulePatchModal {
    private el: HTMLElement | null = null;
    private tabsContainer: HTMLElement | null = null;
    private viewport: HTMLElement | null = null;
    private currentInstanceId: string = "";
    private activeTab: string = "";
    private currentSchema: any = null;
    private patchbayMatrix: any[] = [];
    private maxSlots: number = 32;

    constructor() {
        console.log("[ModulePatchModal] Initializing Unified Era 6 UI...");
        this.init();
    }

    private init(): void {
        this.el = document.getElementById('module-patch-modal');
        this.tabsContainer = document.getElementById('patch-tabs-container');
        this.viewport = document.getElementById('patch-tab-viewport');

        // Close logic (delegated to background click)
        this.el?.addEventListener('click', (e: any) => {
            if (e.target === this.el) this.close();
        });

        // Tab Switching Listener (Delegated)
        this.tabsContainer?.addEventListener('click', (e: any) => {
            const btn = e.target.closest('.aseptic-tab-btn');
            if (btn) {
                const tabId = btn.getAttribute('data-tab');
                if (tabId) this.switchTab(tabId);
            }
        });

        // Era 6 Aseptic: Real-time subscription
        // @ts-ignore
        if (window.runtimeStateStore) {
            // @ts-ignore
            window.runtimeStateStore.subscribe(() => {
                this.updateRealtimeUI();
            });
        }
    }

    public async open(instanceId: string, schema: any): Promise<void> {
        if (!this.el) return;
        this.currentInstanceId = instanceId;
        this.currentSchema = schema;
        this.el.style.display = 'flex';

        if (!schema || !schema.items) {
            this.renderError("INVALID_CONTRACT");
            return;
        }

        this.renderTabs(schema);
        
        // Default to first tab
        const tabs = this.getTabsFromSchema(schema);
        const defaultTab = tabs[0] || "";
        if (defaultTab) this.switchTab(defaultTab);
    }

    public close(): void {
        if (this.el) this.el.style.display = 'none';
    }

    private renderTabs(schema: any): void {
        if (!this.tabsContainer) return;
        this.tabsContainer.innerHTML = '';

        const tabs = this.getTabsFromSchema(schema);

        tabs.forEach(tabTitle => {
            const btn = document.createElement('button');
            btn.className = 'aseptic-tab-btn';
            btn.innerText = tabTitle.toUpperCase();
            btn.setAttribute('data-tab', tabTitle);
            this.tabsContainer!.appendChild(btn);
        });
    }

    private getTabsFromSchema(schema: any): string[] {
        if (!schema || !schema.items) return [];
        const tabs = new Set<string>();
        schema.items.forEach((item: any) => {
            if (item.tab) tabs.add(item.tab);
        });
        return Array.from(tabs);
    }

    private switchTab(tabId: string): void {
        this.activeTab = tabId;
        
        // Update UI states
        this.tabsContainer?.querySelectorAll('.aseptic-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
        });

        this.renderTabContent(tabId);
    }

    private renderTabContent(tabId: string): void {
        if (!this.viewport || !this.currentSchema) return;
        this.viewport.innerHTML = '';

        const items = this.currentSchema.items.filter((i: any) => i.tab === tabId);
        
        const form = document.createElement('div');
        form.id = 'patch-params-form';
        form.className = 'aseptic-params-container';
        this.viewport.appendChild(form);

        // Group items by 'group' field
        const groups = new Map<string, any[]>();
        items.forEach((item: any) => {
            const g = item.group || "PARAMETERS";
            if (!groups.has(g)) groups.set(g, []);
            groups.get(g)!.push(item);
        });

        groups.forEach((groupItems, groupName) => {
            const groupHeader = document.createElement('div');
            groupHeader.className = 'aseptic-group-title';
            groupHeader.innerText = groupName.toUpperCase();
            form.appendChild(groupHeader);

            groupItems.forEach(item => {
                this.renderParameterRow(form, [item]);
            });
        });

        this.setupListeners();
    }

    private setupListeners(): void {
        if (!this.viewport) return;

        // 1. Selector listeners
        this.viewport.querySelectorAll('select.selector-control').forEach(select => {
            select.addEventListener('change', (e: any) => {
                const id = select.getAttribute('data-param')!;
                const val = parseFloat(e.target.value);
                const paramId = `${this.currentInstanceId}.${id}`;
                // @ts-ignore
                window.rpcCommandDispatcher.dispatch({ type: 'setParameter', target: paramId, value: val });
            });
        });

        // 2. Knob listeners (Aseptic drag)
        this.viewport.querySelectorAll('.knob-ring').forEach(ring => {
            const id = ring.getAttribute('data-param')!;
            
            const move = (e: PointerEvent) => {
                const rect = ring.getBoundingClientRect();
                let val = 1.0 - (e.clientY - rect.top) / rect.height;
                val = Math.max(0, Math.min(1, val));

                const paramId = `${this.currentInstanceId}.${id}`;
                // @ts-ignore
                window.rpcCommandDispatcher.dispatch({ type: 'setParameter', target: paramId, value: val });
                
                // Real-time UI update (Feedback)
                const knob = ring.querySelector('.knob') as HTMLElement;
                if (knob) knob.style.transform = `translateX(-50%) rotate(${(val * 270) - 135}deg)`;
            };

            ring.addEventListener('pointerdown', (e: any) => {
                e.preventDefault();
                ring.setPointerCapture(e.pointerId);
                move(e);
                
                const onMove = (ev: PointerEvent) => move(ev);
                const onUp = () => {
                    ring.removeEventListener('pointermove', onMove as EventListener);
                    ring.removeEventListener('pointerup', onUp as EventListener);
                };
                ring.addEventListener('pointermove', onMove as EventListener);
                ring.addEventListener('pointerup', onUp as EventListener);
            });
        });
    }


    private renderParameterRow(container: HTMLElement, items: any[]): void {
        const row = document.createElement('div');
        row.className = 'aseptic-params-row';
        
        items.forEach(item => {
            const cell = this.buildControlCell(item);
            row.appendChild(cell);
        });

        container.appendChild(row);
    }

    /**
     * ERA 6 STANDARD: Unified Control Cell Generator
     */
    private buildControlCell(item: any): HTMLElement {
        const cell = document.createElement('div');
        const id = item.paramId || item.id;
        cell.className = 'control-cell';
        cell.id = `cell-${this.currentInstanceId}-${id}`;
        cell.setAttribute('data-bind', id);

        // 1. Attachment Superior (LED/Telemetry)
        const top = document.createElement('div');
        top.className = 'cell-attachment-top';
        if (item.roles?.includes('stream')) {
            const led = document.createElement('div');
            led.className = 'led led-orange';
            led.setAttribute('data-source', id);
            top.appendChild(led);
        }
        cell.appendChild(top);

        // 2. Primary Component
        const main = document.createElement('div');
        main.className = 'cell-main';
        
        if (item.look === 'list' && item.options) {
            const select = document.createElement('select');
            select.className = 'selector-control';
            select.setAttribute('data-param', id);
            item.options.forEach((opt: any) => {
                const o = document.createElement('option');
                o.value = opt.value.toString();
                o.innerText = opt.label;
                select.appendChild(o);
            });
            main.appendChild(select);
        } else {
            // Default to Knob for aseptic look
            main.innerHTML = `
                <div class="knob-ring" data-param="${id}">
                    <div class="knob"><div class="knob-marker white"></div></div>
                </div>
            `;
        }
        cell.appendChild(main);

        // 3. Info Layer (Label & Display)
        const info = document.createElement('div');
        info.className = 'cell-info';
        
        const label = document.createElement('label');
        label.className = 'cell-label';
        label.innerText = (item.label || id).toUpperCase();
        info.appendChild(label);

        const display = document.createElement('div');
        display.className = 'cell-display';
        display.setAttribute('data-precision', (item.ui_precision ?? 2).toString());
        // @ts-ignore
        const currentVal = window.runtimeStateStore?.getValue(`${this.currentInstanceId}.${id}`, item.default || 0);
        display.innerText = currentVal.toString();
        info.appendChild(display);

        cell.appendChild(info);

        return cell;
    }

    /**
     * ERA 6: Real-time UI refresh from Aseptic Store
     */
    private updateRealtimeUI(): void {
        if (!this.el || this.el.style.display !== 'flex' || !this.viewport) return;

        // 1. Update Knobs and Displays
        this.viewport.querySelectorAll('.control-cell').forEach(cell => {
            const id = cell.getAttribute('data-bind');
            if (!id) return;

            // @ts-ignore
            const val = window.runtimeStateStore.getValue(`${this.currentInstanceId}.${id}`);
            
            // Knob
            const knob = cell.querySelector('.knob') as HTMLElement;
            if (knob) knob.style.transform = `translateX(-50%) rotate(${(val * 270) - 135}deg)`;

            // Display
            const display = cell.querySelector('.cell-display') as HTMLElement;
            if (display) {
                const precision = parseInt(display.getAttribute('data-precision') || '2');
                display.innerText = val.toFixed(precision);
            }

            // Selector
            const select = cell.querySelector('select') as HTMLSelectElement;
            if (select) select.value = val.toString();

            // LED (Telemetry)
            const led = cell.querySelector('.led') as HTMLElement;
            if (led) {
                // @ts-ignore
                const tVal = window.runtimeStateStore.getTelemetry(`${this.currentInstanceId}.${id}`);
                led.classList.toggle('active', tVal > 0.05);
            }
        });
    }

    private renderError(reason: string): void {
        if (!this.viewport) return;
        this.viewport.innerHTML = `
            <div class="contract-error-full">
                <div class="error-msg">CONTRACT VIOLATION</div>
                <div class="error-detail">${reason}</div>
            </div>
        `;
    }
}
