import { Era5ManifestParser } from '../logic/era5/Era5ManifestParser.js';
import type { Era5Tab, Era5Entity } from '../logic/era5/Era5ManifestParser.js';

/**
 * OMEGA Unified Module Patch Modal
 * Standardized for Era 5.2 Aseptic Meta-Engine.
 */
export class ModulePatchModal {
    private el: HTMLElement | null = null;
    private tabsContainer: HTMLElement | null = null;
    private viewport: HTMLElement | null = null;
    private currentInstanceId: string = "";
    private activeTab: string = "GENERAL";
    private currentTabs: Era5Tab[] = [];
    private currentManifest: any = null;
    private patchbayMatrix: any[] = [];
    private maxSlots: number = 32;

    constructor() {
        console.log("[ModulePatchModal] Initializing Unified Era 5.2 UI...");
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
            const btn = e.target.closest('.era5-tab-btn');
            if (btn) {
                const tabId = btn.getAttribute('data-tab');
                if (tabId) this.switchTab(tabId);
            }
        });
    }

    public async open(instanceId: string, manifest: any): Promise<void> {
        if (!this.el) return;
        this.currentInstanceId = instanceId;
        this.currentManifest = manifest;
        this.el.style.display = 'flex';

        this.currentTabs = Era5ManifestParser.parse(manifest);
        this.renderTabs(this.currentTabs);
        
        // Default to GENERAL or first tab
        const defaultTab = this.currentTabs.find(t => t.id === 'GENERAL') ? 'GENERAL' : (this.currentTabs[0]?.id || 'GENERAL');
        this.switchTab(defaultTab);
    }

    public close(): void {
        if (this.el) this.el.style.display = 'none';
    }

    private renderTabs(tabs: Era5Tab[]): void {
        if (!this.tabsContainer) return;
        this.tabsContainer.innerHTML = '';

        tabs.filter(t => t.id !== 'PATCHING').forEach(tab => {
            const btn = document.createElement('button');
            btn.className = 'era5-tab-btn';
            btn.innerText = tab.id.toUpperCase();
            btn.setAttribute('data-tab', tab.id);
            this.tabsContainer!.appendChild(btn);
        });

        // Add Persistent PATCHING Sanctuary (if entities exist or always)
        const patchBtn = document.createElement('button');
        patchBtn.className = 'era5-tab-btn sanctuary';
        patchBtn.innerText = 'PATCHING';
        patchBtn.setAttribute('data-tab', 'PATCHING');
        this.tabsContainer!.appendChild(patchBtn);
    }

    private switchTab(tabId: string): void {
        this.activeTab = tabId;
        
        // Update UI states
        this.tabsContainer?.querySelectorAll('.era5-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
        });

        if (tabId === 'PATCHING') {
            this.renderPatchingSanctuary();
        } else {
            const tabData = this.currentTabs.find(t => t.id === tabId);
            if (tabData) this.renderGroups(tabData);
        }
    }

    private renderGroups(tab: Era5Tab): void {
        if (!this.viewport) return;
        this.viewport.innerHTML = '';

        const form = document.createElement('div');
        form.id = 'patch-params-form';
        form.className = 'era5-params-container';
        this.viewport.appendChild(form);

        tab.groups.forEach((entities, groupName) => {
            const groupHeader = document.createElement('div');
            groupHeader.className = 'era5-group-title';
            groupHeader.innerText = groupName.toUpperCase();
            form.appendChild(groupHeader);

            // ERA 5.1/5.2 Pair-Detection & Technical Rendering
            for (let i = 0; i < entities.length; i++) {
                const entity = entities[i];
                if (!entity) continue;

                const nextEntity = entities[i + 1];

                if (nextEntity && this.isPair(entity, nextEntity)) {
                    this.renderParameterRow(form, [entity, nextEntity]);
                    i++; // Skip next
                } else {
                    this.renderParameterRow(form, [entity]);
                }
            }
        });

        if (tab.groups.size === 0) {
            form.innerHTML = `<div class="patch-empty-msg">NO CONFIGURATION PARAMETERS AVAILABLE</div>`;
        }
    }

    private isPair(a: Era5Entity, b: Era5Entity): boolean {
        const nameA = a.id.toLowerCase();
        const nameB = b.id.toLowerCase();
        const suffixes: [string, string][] = [['min', 'max'], ['low', 'high'], ['lo', 'hi'], ['start', 'end']];
        return suffixes.some(([s1, s2]) => {
            if (nameA.endsWith(s1) && nameB.endsWith(s2)) {
                return nameA.substring(0, nameA.length - s1.length) === nameB.substring(0, nameB.length - s2.length);
            }
            return false;
        });
    }

    private renderParameterRow(container: HTMLElement, entities: Era5Entity[]): void {
        const row = document.createElement('div');
        row.className = 'patch-param-row' + (entities.length > 1 ? ' pair' : '');
        
        let labelStr = entities[0]?.label || 'UNKNOWN';
        if (entities.length > 1) {
            labelStr = labelStr.replace(/(_min|min|_low|low|_lo|lo|_start|start)$/i, ' RANGE');
        }

        const label = document.createElement('div');
        label.className = 'patch-param-label';
        label.innerText = labelStr.toUpperCase();
        row.appendChild(label);

        const controlsWrapper = document.createElement('div');
        controlsWrapper.className = 'patch-param-controls-wrapper';

        entities.forEach(entity => {
            const ctrl = document.createElement('div');
            ctrl.className = 'patch-param-control';
            
            if (entity.presentation.control === 'list' && entity.options) {
                const select = document.createElement('select');
                entity.options.forEach(opt => {
                    const o = document.createElement('option');
                    o.value = opt.value.toString();
                    o.innerText = opt.label;
                    select.appendChild(o);
                });
                ctrl.appendChild(select);
            } else {
                const input = document.createElement('input');
                input.type = 'number';
                input.value = entity.range?.default?.toString() || '0';
                ctrl.appendChild(input);
            }
            controlsWrapper.appendChild(ctrl);
        });

        row.appendChild(controlsWrapper);
        container.appendChild(row);
    }

    /**
     * ERA 5.2 STANDARD: Control Cell Generator
     */
    private buildControlCell(entity: Era5Entity): HTMLElement {
        const cell = document.createElement('div');
        cell.className = 'control-cell';
        cell.id = `cell-${this.currentInstanceId}-${entity.id}`;

        // 1. Attachments (TOP - LEDs etc)
        entity.attachments?.forEach(att => {
            const attEl = document.createElement('div');
            attEl.className = `control-cell-attachment attachment-${att.type}`;
            attEl.innerText = '●';
            cell.appendChild(attEl);
        });

        // 2. Primary Component
        const comp = document.createElement('div');
        comp.className = `entity-control control-${entity.presentation.control}`;
        comp.innerHTML = `<div class="knob-placeholder"></div>`;
        cell.appendChild(comp);

        // 3. Label
        const label = document.createElement('div');
        label.className = 'control-cell-label';
        label.innerText = entity.label;
        cell.appendChild(label);

        // 4. Display (BOTTOM)
        const disp = document.createElement('div');
        disp.className = 'control-cell-display';
        disp.innerText = entity.range?.default?.toString() || '0';
        cell.appendChild(disp);

        return cell;
    }

    private renderPatchingSanctuary(): void {
        const viewport = this.viewport;
        if (!viewport) return;
        
        viewport.innerHTML = `
            <div class="era5-group-container aseptic-panel">
                <div class="era5-group-title">PATCHING SANCTUARY</div>
                <div class="patch-bay-layout" style="display: flex; gap: 40px;">
                    <div class="patch-column" style="flex: 1;">
                        <h3 class="patch-section-title" style="font-size: 10px; color: var(--neon-cyan); letter-spacing: 2px;">INPUTS / TARGETS</h3>
                        <div id="era5-patch-inputs" class="patch-list"></div>
                    </div>
                    <div class="patch-column" style="flex: 1;">
                        <h3 class="patch-section-title" style="font-size: 10px; color: var(--signal-audio); letter-spacing: 2px;">OUTPUTS / SOURCES</h3>
                        <div id="era5-patch-outputs" class="patch-list"></div>
                    </div>
                </div>
            </div>
        `;

        const inputsEl = document.getElementById('era5-patch-inputs');
        const outputsEl = document.getElementById('era5-patch-outputs');
        
        const patchingTabData = this.currentTabs.find(t => t.id === 'PATCHING');
        if (!patchingTabData) {
            if (inputsEl) inputsEl.innerHTML = '<div class="patch-empty">NO INPUTS DEFINED</div>';
            if (outputsEl) outputsEl.innerHTML = '<div class="patch-empty">NO OUTPUTS DEFINED</div>';
            return;
        }

        // Collect all entities from patching tab groups
        const allPatchEntities: Era5Entity[] = [];
        patchingTabData.groups.forEach(entities => allPatchEntities.push(...entities));

        allPatchEntities.forEach(entity => {
            const portGroup = document.createElement('div');
            portGroup.className = 'patch-port-group';
            portGroup.style.marginBottom = '8px';
            
            const typeClass = `type-${entity.presentation.control.toLowerCase() || 'cv'}`;
            const isOutput = entity.direction === 'output';
            
            portGroup.innerHTML = `
                <div class="patch-port-header">
                    <div class="patch-port-id">${entity.label.toUpperCase()}</div>
                    <div class="patch-type-badge ${typeClass}">${entity.presentation.control.toUpperCase()}</div>
                    <button class="patch-add-btn" title="Add Slot">＋</button>
                </div>
            `;

            // Connection Discovery (Era 5 mapping)
            const fullId = `${this.currentInstanceId}.${entity.id}`;
            const activeSlots = this.patchbayMatrix.filter(s => 
                s.active && (isOutput ? s.source === fullId : s.target === fullId)
            );

            if (activeSlots.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'patch-empty-msg';
                empty.innerText = "NO CONNECTIONS";
                portGroup.appendChild(empty);
            } else {
                activeSlots.forEach(slot => {
                    const slotRow = document.createElement('div');
                    slotRow.className = 'patch-slot-row';
                    const remote = isOutput ? slot.target : slot.source;
                    slotRow.innerHTML = `
                        <div class="patch-selector-container">
                            <span class="patch-label" style="font-size:10px; color:var(--neon-cyan)">${remote || 'AUTO'}</span>
                        </div>
                        <div class="patch-amount-container">
                            <span class="patch-amount-value" style="font-family:monospace">${Math.round(slot.amount * 100)}%</span>
                        </div>
                    `;
                    portGroup.appendChild(slotRow);
                });
            }

            if (isOutput) outputsEl?.appendChild(portGroup);
            else inputsEl?.appendChild(portGroup);
        });
    }

    public onStateUpdate(state: any): void {
        const matrix = state?.preset?.patchbayMatrix || [];
        this.patchbayMatrix = Array.isArray(matrix) ? matrix : Object.values(matrix);
        
        if (this.el?.style.display === 'flex') {
            this.switchTab(this.activeTab); // Re-render current view
        }
    }
}
