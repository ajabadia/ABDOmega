/**
 * OMEGA Module Patch Modal (TypeScript)
 * The 'Pocket Patchbay' for focused module routing.
 */

import { MetadataStore } from '../metadata_store.js';
import { OmegaRPC } from '../omega_rpc.js';

export class ModulePatchModal {
    private el: HTMLElement | null = null;
    private titleEl: HTMLElement | null = null;
    private subtitleEl: HTMLElement | null = null;
    private inputsList: HTMLElement | null = null;
    private outputsList: HTMLElement | null = null;
    private usageFill: HTMLElement | null = null;
    private usageText: HTMLElement | null = null;
    
    private currentInstanceId: string = "";
    private inventory: any[] = [];
    private patchbayMatrix: any[] = [];
    private maxSlots: number = 32; 
    private currentTab: string = "general";
    
    constructor() {
        console.log("[ModulePatchModal] Initializing [SURVIVAL REV]...");
        this.init();
        this.syncMaxSlots();
    }
    
    private init(): void {
        // ERA 5.1 NOTE: Listener moved to central dispatcher in index.ts to support version routing.
        /*
        document.addEventListener('patch-request', (e: any) => {
            this.open(e.detail.instanceId, e.detail.componentId);
        });
        */

        // Tab Switching Listener (Delegated)
        document.addEventListener('click', (e: any) => {
            const tabBtn = e.target.closest('.patch-tab');
            if (tabBtn) {
                const tabId = tabBtn.getAttribute('data-tab');
                if (tabId) this.switchTab(tabId);
            }
        });
    }

    private async syncMaxSlots() {
        // @ts-ignore
        if (window.omegaRPC) {
            try {
                // @ts-ignore
                const settings = await (window as any).omegaRPC.getSystemSettings();
                const maxSlotsSetting = settings.find((s: any) => s.id === "maxPatchbaySlots");
                if (maxSlotsSetting) {
                    this.maxSlots = Math.floor(maxSlotsSetting.currentValue || 32);
                }
            } catch (e) {
                console.warn("[ModulePatchModal] Failed to sync maxPatchbaySlots:", e);
            }
        }
    }

    private ensureElements(): boolean {
        if (this.el) return true;
        this.el = document.getElementById('module-patch-modal');
        this.titleEl = document.getElementById('patch-modal-title');
        this.subtitleEl = document.getElementById('patch-modal-subtitle');
        this.inputsList = document.getElementById('patch-inputs-list');
        this.outputsList = document.getElementById('patch-outputs-list');
        this.usageFill = document.getElementById('matrix-usage-fill');
        this.usageText = document.getElementById('matrix-usage-text');
        
        if (!this.el) console.error("[ModulePatchModal] Root element #module-patch-modal not found!");
        return !!this.el;
    }

    private switchTab(tabId: string): void {
        this.currentTab = tabId;
        console.log(`[ModulePatchModal] Switching to tab: ${tabId}`);
        
        document.querySelectorAll('.patch-tab').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
        });

        const generalTab = document.getElementById('patch-tab-general');
        const patchingTab = document.getElementById('patch-tab-patching');
        
        if (generalTab) generalTab.style.display = (tabId === 'general') ? 'block' : 'none';
        if (patchingTab) patchingTab.style.display = (tabId === 'patching') ? 'block' : 'none';
    }
    
    async open(instanceId: string, componentId: string = ""): Promise<void> {
        console.log(`[ModulePatchModal] Opening for instance: ${instanceId} (${componentId})`);
        if (!this.ensureElements()) return;

        this.currentInstanceId = instanceId;
        this.el!.style.display = 'flex';
        this.switchTab('general');
        
        if (this.titleEl) {
            this.titleEl.innerText = instanceId.toUpperCase();
        }
        
        await this.refresh(componentId);
    }

    async refresh(componentId: string = ""): Promise<void> {
        //@ts-ignore
        const store: MetadataStore = window.metadataStore;
        //@ts-ignore
        const rpc: OmegaRPC = window.omegaRPC;
        
        if (!store || !rpc) return;

        const metadata = await store.getModulationMetadata();
        this.inventory = metadata.inventory || [];
        
        const state = await rpc.getState();
        const legacyMatrix = state.preset?.patchbayMatrix || [];
        const voiceChain = state.preset?.voiceChain || {};
        const modularConnections = voiceChain.CONNECTIONS || [];
        
        this.patchbayMatrix = [
            ...legacyMatrix,
            ...modularConnections.map((c: any) => ({ ...c, active: true }))
        ];
        
        this.render(componentId, state.preset);
        this.updateUsage();
    }

    private getCanonicalId(id: string): string {
        if (!id) return "";
        const parts = id.split('_');
        if (parts.length > 1 && !isNaN(parseInt(parts[parts.length - 1] as string))) {
            return parts.slice(0, -1).join('_');
        }
        return id;
    }

    private render(componentId: string = "", preset: any = null): void {
        const canonicalId = this.getCanonicalId(this.currentInstanceId);
        const manifest = this.inventory.find(m => 
            (m.instanceId === this.currentInstanceId) || 
            (m.id === canonicalId) ||
            (m.id === componentId)
        );
        
        if (!manifest) return;

        // 1. Authoritative discovery of General vs Patching items
        const generalItemIds = this.getGeneralItemIds(manifest);

        // 2. Render Tabs
        this.renderGeneral(manifest, preset, generalItemIds);
        
        if (this.inputsList) {
            const inputs = (manifest.ports || []).filter((p: any) => p.isInput || p.direction === 'input');
            this.renderSection(this.inputsList, inputs, true, generalItemIds);
        }
        if (this.outputsList) {
            const outputs = (manifest.ports || []).filter((p: any) => (!p.isInput && p.direction !== 'input'));
            this.renderSection(this.outputsList, outputs, false, generalItemIds);
        }
    }

    private getGeneralItemIds(manifest: any): Set<string> {
        const ids = new Set<string>();
        
        // 1. Authoritative Phase: Parameters in YAML are primarily configuration
        if (manifest.parameters) {
            manifest.parameters.forEach((param: any) => {
                const semantic = (param.semantic || 'number').toLowerCase();
                const visibility = param.visibility || [];
                
                const isExplicitBack = visibility.includes('back') || visibility.includes('both');
                const isExplicitFront = visibility.includes('front');
                
                const isConfigSemantic = ['list', 'number', 'text', 'string'].includes(semantic);
                const hasOptions = param.options && param.options.length > 0;
                
                // If it's a number/list/text and not explicitly forced to front deck, it goes to General
                if ((isConfigSemantic || hasOptions || isExplicitBack) && !isExplicitFront) {
                    ids.add(param.id);
                }
            });
        }

        // 2. Fallback Phase: Check ports for explicit "back" visibility or config-like traits
        if (manifest.ports) {
            manifest.ports.forEach((port: any) => {
                const visibility = port.visibility || [];
                if (visibility.includes('back') || visibility.includes('both')) {
                    ids.add(port.id);
                }
            });
        }

        console.log(`[ModulePatchModal] Authoritative General IDs for ${manifest.id}:`, Array.from(ids));
        return ids;
    }

    private renderGeneral(manifest: any, preset: any, generalItemIds: Set<string>): void {
        const form = document.getElementById('patch-params-form');
        if (!form) return;
        form.innerHTML = '';

        // General tab items from manifest: Filter unique by ID, prioritize parameters if both exist
        const allItems = [
            ...(manifest.parameters || []),
            ...(manifest.ports || [])
        ];
        
        const uniqueItemsMap = new Map();
        allItems.forEach(item => {
            if (!uniqueItemsMap.has(item.id) || manifest.parameters?.find((p: any) => p.id === item.id)) {
                uniqueItemsMap.set(item.id, item);
            }
        });

        const uniqueItems = Array.from(uniqueItemsMap.values())
            .filter(item => generalItemIds.has(item.id));

        // 3. Render items with Pair-Detection
        for (let i = 0; i < uniqueItems.length; i++) {
            const item = uniqueItems[i];
            const nextItem = uniqueItems[i + 1];

            if (nextItem && this.isPair(item, nextItem)) {
                this.renderParameterRow(form, [item, nextItem], preset);
                i++; // Skip next item
            } else {
                this.renderParameterRow(form, [item], preset);
            }
        }

        if (uniqueItems.length === 0) {
            form.innerHTML = `<div class="patch-empty-msg">NO CONFIGURATION PARAMETERS AVAILABLE</div>`;
        }
    }

    private isPair(a: any, b: any): boolean {
        // Detect pairs like bend_min/bend_max or start/end
        const nameA = a.id.toLowerCase();
        const nameB = b.id.toLowerCase();
        
        const suffixes = [
            ['min', 'max'],
            ['low', 'high'],
            ['lo', 'hi'],
            ['start', 'end']
        ];

        return suffixes.some(pair => {
            const s1 = pair[0];
            const s2 = pair[1];
            if (!s1 || !s2) return false;

            if (nameA.endsWith(s1) && nameB.endsWith(s2)) {
                const prefixA = nameA.substring(0, nameA.length - s1.length);
                const prefixB = nameB.substring(0, nameB.length - s2.length);
                return prefixA === prefixB;
            }
            return false;
        });
    }

    private renderParameterRow(container: HTMLElement, params: any[], preset: any): void {
        const row = document.createElement('div');
        row.className = 'patch-param-row' + (params.length > 1 ? ' pair' : '');
        
        // Common Label Logic
        let labelStr = params[0].label || params[0].name || params[0].id;
        if (params.length > 1) {
            // Remove suffix for pair label (e.g. BEND MIN -> BEND RANGE)
            labelStr = labelStr.replace(/(_min|min|_low|low|_lo|lo|_start|start)$/i, ' RANGE');
        }

        const label = document.createElement('div');
        label.className = 'patch-param-label';
        label.innerText = labelStr.toUpperCase();
        row.appendChild(label);

        const controlsWrapper = document.createElement('div');
        controlsWrapper.className = 'patch-param-controls-wrapper';

        params.forEach(param => {
            const controlContainer = document.createElement('div');
            controlContainer.className = 'patch-param-control';

            let currentValue = param.default !== undefined ? param.default : (param.defaultValue !== undefined ? param.defaultValue : 0);
            if (preset?.modules) {
                const modState = preset.modules[this.currentInstanceId];
                if (modState?.parameters?.[param.id] !== undefined) {
                    currentValue = modState.parameters[param.id];
                }
            }

            const semantic = (param.semantic || 'value').toLowerCase();

            if (semantic === 'list' && param.options) {
                const select = document.createElement('select');
                param.options.forEach((opt: any) => {
                    const o = document.createElement('option');
                    o.value = opt.value.toString();
                    o.innerText = opt.label;
                    o.selected = (opt.value == currentValue);
                    select.appendChild(o);
                });
                select.onchange = (e) => {
                    const val = parseFloat((e.target as HTMLSelectElement).value);
                    this.updateEngineParam(param.id, val);
                };
                controlContainer.appendChild(select);
            } else if (['text', 'string'].includes(semantic)) {
                const input = document.createElement('input');
                input.type = 'text';
                input.value = (currentValue || "").toString();
                input.onchange = (e) => {
                    const val = (e.target as HTMLInputElement).value;
                    //@ts-ignore - Assuming engine handles string updates via same RPC for now or add specific method
                    this.updateEngineParam(param.id, val as any);
                };
                controlContainer.appendChild(input);
            } else {
                const input = document.createElement('input');
                input.type = 'number';
                input.min = param.min || 0;
                input.max = param.max || 1;
                input.step = (param.max - param.min > 10) ? "1" : "0.01";
                input.value = currentValue.toString();
                input.onchange = (e) => {
                    const val = parseFloat((e.target as HTMLInputElement).value);
                    this.updateEngineParam(param.id, val);
                };
                controlContainer.appendChild(input);
                if (param.unit) {
                    const unit = document.createElement('span');
                    unit.className = 'label-tiny';
                    unit.innerText = param.unit;
                    controlContainer.appendChild(unit);
                }
            }
            controlsWrapper.appendChild(controlContainer);
        });

        row.appendChild(controlsWrapper);
        container.appendChild(row);
    }

    private async updateEngineParam(paramId: string, value: number): Promise<void> {
        //@ts-ignore
        const rpc: OmegaRPC = window.omegaRPC;
        if (rpc) {
            await rpc.send('updateModuleParameter', { 
                instanceId: this.currentInstanceId, 
                paramId: paramId, 
                value: value 
            });
        }
    }

    private renderSection(container: HTMLElement, ports: any[], isTarget: boolean, generalItemIds: Set<string>): void {
        container.innerHTML = '';
        const filteredPorts = ports.filter(p => !generalItemIds.has(p.id));

        filteredPorts.forEach(port => {
            const portGroup = document.createElement('div');
            portGroup.className = 'patch-port-group';
            
            const fullId = `${this.currentInstanceId}.${port.id}`;
            const typeClass = `type-${port.type.toLowerCase() || 'cv'}`;
            
            // Port Header
            const header = document.createElement('div');
            header.className = 'patch-port-header';
            header.innerHTML = `
                <div class="patch-port-id">${port.label}</div>
                <div class="patch-type-badge ${typeClass}">${port.type}</div>
                <button class="patch-add-btn" title="Add Slot">＋</button>
            `;
            const addBtn = header.querySelector('.patch-add-btn') as HTMLElement;
            addBtn.onclick = () => this.showNewSlotRow(portGroup, port, isTarget);

            portGroup.appendChild(header);
            
            // Find ALL current connections in PatchbayMatrix for this port
            const activeSlots = this.patchbayMatrix.map((s, idx) => ({ ...s, idx }))
                .filter(s => s.active && (isTarget ? (s.target === fullId) : (s.source === fullId)));
            
            console.log(`[ModulePatchModal] Port ${port.id}: ${activeSlots.length} active routes found`);
            
            activeSlots.forEach(slot => {
                this.renderSlotRow(portGroup, port, slot, isTarget);
            });

            if (activeSlots.length === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.className = 'patch-empty-msg';
                emptyMsg.innerText = "NO CONNECTIONS";
                portGroup.appendChild(emptyMsg);
            }
            
            container.appendChild(portGroup);
        });
    }

    private renderSlotRow(container: HTMLElement, port: any, slot: any, isTarget: boolean): void {
        const row = document.createElement('div');
        row.className = 'patch-slot-row';
        
        const remoteId = isTarget ? slot.source : slot.target;
        
        row.innerHTML = `
            <div class="patch-selector-container">
                <select class="patch-selector">
                    ${this.getCompatibleOptions(port, isTarget, remoteId)}
                </select>
            </div>
            <div class="patch-amount-container">
                <input type="range" class="patch-amount-slider" min="-1" max="1" step="0.01" value="${slot.amount || 1.0}">
                <span class="patch-amount-value">${Math.round((slot.amount || 0) * 100)}%</span>
            </div>
            <button class="patch-remove-btn">×</button>
        `;
        
        const select = row.querySelector('.patch-selector') as HTMLSelectElement;
        const slider = row.querySelector('.patch-amount-slider') as HTMLInputElement;
        const valDisp = row.querySelector('.patch-amount-value') as HTMLElement;
        const removeBtn = row.querySelector('.patch-remove-btn') as HTMLElement;
        
        select.onchange = (e) => {
            const newRemote = (e.target as HTMLSelectElement).value;
            this.applyPatch(port.id, newRemote, isTarget, slot.idx);
        };
        
        slider.oninput = (e) => {
            const val = parseFloat((e.target as HTMLInputElement).value);
            valDisp.innerText = `${Math.round(val * 100)}%`;
            this.updateSlotParam(slot.idx, 'amount', val);
        };
        
        removeBtn.onclick = () => this.removePatch(slot.idx);
        
        container.appendChild(row);
    }

    private showNewSlotRow(container: HTMLElement, port: any, isTarget: boolean): void {
        const row = document.createElement('div');
        row.className = 'patch-slot-row pending';
        row.innerHTML = `
            <div class="patch-selector-container">
                <select class="patch-selector">
                    <option value="">- SELECT REMOTE -</option>
                    ${this.getCompatibleOptions(port, isTarget)}
                </select>
            </div>
            <button class="patch-remove-btn">×</button>
        `;
        
        const select = row.querySelector('.patch-selector') as HTMLSelectElement;
        select.onchange = (e) => {
            const remoteId = (e.target as HTMLSelectElement).value;
            if (remoteId) this.applyPatch(port.id, remoteId, isTarget);
        };
        
        const removeBtn = row.querySelector('.patch-remove-btn') as HTMLElement;
        removeBtn.onclick = () => row.remove();
        
        container.appendChild(row);
        select.focus();
    }

    private getCompatibleOptions(port: any, isTarget: boolean, selectedId: string = ""): string {
        let options = '';
        this.inventory.forEach(m => {
            console.log(`[ModulePatchModal] Checking module ${m.instanceId}, status: ${m.status}, ports: ${m.ports?.length}`);
            if (m.status !== "active") {
                console.log(`[ModulePatchModal] SKIPPING ${m.instanceId} because status !== active`);
                return; // Ignorar módulos base del catálogo
            }
            if (m.instanceId === this.currentInstanceId) {
                return; // Evitar el auto-ruteo (conectar salidas a entradas del mismo módulo)
            }
            m.ports.forEach((p: any) => {
                const compatibleType = p.type === port.type;
                const compatibleDirection = isTarget ? !p.isInput : p.isInput;
                if (compatibleType && compatibleDirection) {
                    const fullId = `${m.instanceId}.${p.id}`;
                    console.log(`[ModulePatchModal] MATCHED option: ${fullId}`);
                    const isSelected = fullId === selectedId;
                    options += `<option value="${fullId}" ${isSelected ? 'selected' : ''}>${m.instanceId} > ${p.label}</option>`;
                }
            });
        });
        return options;
    }

    private updateUsage(): void {
        if (!this.usageFill || !this.usageText) return;
        const activeCount = this.patchbayMatrix.filter(s => s.active && s.source && s.target).length;
        const percent = (activeCount / this.maxSlots) * 100;
        this.usageFill.style.width = `${percent}%`;
        this.usageText.innerText = `${activeCount}/${this.maxSlots} Slots Used`;
        this.usageFill.style.background = percent > 90 ? '#ff5555' : 'var(--neon-cyan)';
    }

    /**
     * Reactive State Synchronization
     * Called by the main app loop when the preset state changes.
     */
    public onStateUpdate(state: any): void {
        const legacyMatrix = (state.preset?.patchbayMatrix || state.patchbayMatrix || []);
        const voiceChain = (state.preset?.voiceChain || state.voiceChain || {});
        const modularConnections = (voiceChain.CONNECTIONS || []).map((c: any) => ({ ...c, active: true }));

        this.patchbayMatrix = [
            ...(Array.isArray(legacyMatrix) ? legacyMatrix : Object.values(legacyMatrix)),
            ...modularConnections
        ];
        
        // If modal is open, re-render to reflect changes from Patchbay Hub or other sources
        if (this.el && this.el.style.display === 'flex') {
            console.log(`[ModulePatchModal] Reactive Sync: Updating view for ${this.currentInstanceId} (${this.patchbayMatrix.length} connections)`);
            this.render();
            this.updateUsage();
        }
    }

    private async applyPatch(localPortId: string, remoteId: string, isTarget: boolean, existingSlotIdx: number = -1): Promise<void> {
        const localId = `${this.currentInstanceId}.${localPortId}`;
        const source = isTarget ? remoteId : localId;
        const target = isTarget ? localId : remoteId;
        
        let slotIdx = existingSlotIdx;
        if (slotIdx < 0) {
            slotIdx = this.patchbayMatrix.findIndex(s => !s.active || (!s.source && !s.target));
        }
        
        if (slotIdx < 0 || slotIdx >= this.maxSlots) {
            alert(`Patchbay Matrix is FULL (${this.maxSlots}/${this.maxSlots}). Please remove a patch first.`);
            return;
        }

        console.log(`[ModulePatchModal] Applying patch to slot ${slotIdx}...`);
        //@ts-ignore
        const rpc: OmegaRPC = window.omegaRPC;
        await Promise.all([
            rpc.send('updatePatchbayMatrixSlot', { slot: slotIdx, key: 'source', value: source }),
            rpc.send('updatePatchbayMatrixSlot', { slot: slotIdx, key: 'target', value: target }),
            rpc.send('updatePatchbayMatrixSlot', { slot: slotIdx, key: 'amount', value: 1.0 }),
            rpc.send('updatePatchbayMatrixSlot', { slot: slotIdx, key: 'active', value: true })
        ]);
        
        // No manual refresh needed - onStateUpdate will handle it via broadcast!
    }

    private async updateSlotParam(slotIdx: number, key: string, value: any): Promise<void> {
        //@ts-ignore
        const rpc: OmegaRPC = window.omegaRPC;
        await rpc.send('updatePatchbayMatrixSlot', { slot: slotIdx, key, value });
    }

    private async removePatch(slotIdx: number): Promise<void> {
        console.log(`[ModulePatchModal] Removing patch from slot ${slotIdx}...`);
        //@ts-ignore
        const rpc: OmegaRPC = window.omegaRPC;
        await Promise.all([
            rpc.send('updatePatchbayMatrixSlot', { slot: slotIdx, key: 'active', value: false }),
            rpc.send('updatePatchbayMatrixSlot', { slot: slotIdx, key: 'source', value: "" }),
            rpc.send('updatePatchbayMatrixSlot', { slot: slotIdx, key: 'target', value: "" })
        ]);
    }
}

// @ts-ignore
if (typeof window !== 'undefined') {
    // @ts-ignore
    //@ts-ignore
    window.modulePatchModal = new ModulePatchModal();
}
