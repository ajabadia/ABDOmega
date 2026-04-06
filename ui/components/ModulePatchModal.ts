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
    private modMatrix: any[] = [];
    
    constructor() {
        console.log("[ModulePatchModal] Initializing [REV 2]...");
        this.init();
    }
    
    private init(): void {
        document.addEventListener('patch-request', (e: any) => {
            this.open(e.detail.instanceId);
        });
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
    
    async open(instanceId: string): Promise<void> {
        console.log(`[ModulePatchModal] Opening for instance: ${instanceId}`);
        if (!this.ensureElements()) return;

        this.currentInstanceId = instanceId;
        this.el!.style.display = 'flex';
        
        if (this.titleEl) this.titleEl.innerText = `[REV 2] ${instanceId.toUpperCase()} PATCH BAY`;
        if (this.subtitleEl) this.subtitleEl.innerText = `Focused routing for ${instanceId}`;
        
        await this.refresh();
    }
    
    async refresh(): Promise<void> {
        console.log("[ModulePatchModal] Refreshing manifest and matrix...");
        //@ts-ignore
        const store: MetadataStore = window.metadataStore;
        //@ts-ignore
        const rpc: OmegaRPC = window.omegaRPC;
        
        if (!store || !rpc) {
            console.error("[ModulePatchModal] Critical services (Metadata/RPC) missing!");
            return;
        }

        // 1. Get Inventory and ModMatrix
        const metadata = await store.getModulationMetadata();
        this.inventory = metadata.inventory || [];
        console.log(`[ModulePatchModal] Inventory loaded: ${this.inventory.length} modules`);
        
        const state = await rpc.getState();
        const legacyMatrix = state.preset?.modMatrix || [];
        const voiceChain = state.preset?.voiceChain || {};
        const modularConnections = voiceChain.CONNECTIONS || [];
        
        // Unify both worlds for the UI
        this.modMatrix = [
            ...legacyMatrix,
            ...modularConnections.map((c: any) => ({ ...c, active: true }))
        ];
        console.log(`[ModulePatchModal] Unified Matrix loaded: ${this.modMatrix.length} total slots`);
        
        this.render();
        this.updateUsage();
    }
    
    private render(): void {
        console.log(`[ModulePatchModal] Rendering [REV 2] UI stage...`);
        const manifest = this.inventory.find(m => m.instanceId === this.currentInstanceId || m.id === this.currentInstanceId);
        
        if (!manifest) {
            console.error(`[ModulePatchModal] Manifest NOT FOUND for instance: ${this.currentInstanceId}`);
            if (this.inputsList) this.inputsList.innerHTML = `<div class="placeholder-msg">MANIFEST NOT FOUND [${this.currentInstanceId}]</div>`;
            if (this.outputsList) this.outputsList.innerHTML = `<div class="placeholder-msg">MANIFEST NOT FOUND [${this.currentInstanceId}]</div>`;
            return;
        }

        console.log(`[ModulePatchModal] Rendering ${manifest.ports.length} ports...`);
        if (this.inputsList) this.renderSection(this.inputsList, manifest.ports.filter((p: any) => p.isInput), true);
        if (this.outputsList) this.renderSection(this.outputsList, manifest.ports.filter((p: any) => !p.isInput), false);
    }

    private renderSection(container: HTMLElement, ports: any[], isTarget: boolean): void {
        container.innerHTML = '';
        
        ports.forEach(port => {
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
            
            // Find ALL current connections in ModMatrix for this port
            const activeSlots = this.modMatrix.map((s, idx) => ({ ...s, idx }))
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
            m.ports.forEach((p: any) => {
                const compatibleType = p.type === port.type;
                const compatibleDirection = isTarget ? !p.isInput : p.isInput;
                if (compatibleType && compatibleDirection) {
                    const fullId = `${m.instanceId}.${p.id}`;
                    const isSelected = fullId === selectedId;
                    options += `<option value="${fullId}" ${isSelected ? 'selected' : ''}>${m.instanceId} > ${p.label}</option>`;
                }
            });
        });
        return options;
    }

    private updateUsage(): void {
        if (!this.usageFill || !this.usageText) return;
        const activeCount = this.modMatrix.filter(s => s.active && s.source && s.target).length;
        const total = 64;
        const percent = (activeCount / total) * 100;
        this.usageFill.style.width = `${percent}%`;
        this.usageText.innerText = `${activeCount}/${total} Slots Used`;
        this.usageFill.style.background = percent > 90 ? '#ff5555' : 'var(--neon-cyan)';
    }

    /**
     * Reactive State Synchronization
     * Called by the main app loop when the preset state changes.
     */
    public onStateUpdate(state: any): void {
        const legacyMatrix = (state.preset?.modMatrix || state.modMatrix || []);
        const voiceChain = (state.preset?.voiceChain || state.voiceChain || {});
        const modularConnections = (voiceChain.CONNECTIONS || []).map((c: any) => ({ ...c, active: true }));

        this.modMatrix = [
            ...(Array.isArray(legacyMatrix) ? legacyMatrix : Object.values(legacyMatrix)),
            ...modularConnections
        ];
        
        // If modal is open, re-render to reflect changes from Matrix Hub or other sources
        if (this.el && this.el.style.display === 'flex') {
            console.log(`[ModulePatchModal] Reactive Sync: Updating view for ${this.currentInstanceId} (${this.modMatrix.length} connections)`);
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
            slotIdx = this.modMatrix.findIndex(s => !s.active || (!s.source && !s.target));
        }
        
        if (slotIdx < 0) {
            alert("Modulation Matrix is FULL (64/64). Please remove a patch first.");
            return;
        }

        console.log(`[ModulePatchModal] Applying patch to slot ${slotIdx}...`);
        //@ts-ignore
        const rpc: OmegaRPC = window.omegaRPC;
        await Promise.all([
            rpc.send('updateModMatrixSlot', { slot: slotIdx, key: 'source', value: source }),
            rpc.send('updateModMatrixSlot', { slot: slotIdx, key: 'target', value: target }),
            rpc.send('updateModMatrixSlot', { slot: slotIdx, key: 'amount', value: 1.0 }),
            rpc.send('updateModMatrixSlot', { slot: slotIdx, key: 'active', value: true })
        ]);
        
        // No manual refresh needed - onStateUpdate will handle it via broadcast!
    }

    private async updateSlotParam(slotIdx: number, key: string, value: any): Promise<void> {
        //@ts-ignore
        const rpc: OmegaRPC = window.omegaRPC;
        await rpc.send('updateModMatrixSlot', { slot: slotIdx, key, value });
    }

    private async removePatch(slotIdx: number): Promise<void> {
        console.log(`[ModulePatchModal] Removing patch from slot ${slotIdx}...`);
        //@ts-ignore
        const rpc: OmegaRPC = window.omegaRPC;
        await Promise.all([
            rpc.send('updateModMatrixSlot', { slot: slotIdx, key: 'active', value: false }),
            rpc.send('updateModMatrixSlot', { slot: slotIdx, key: 'source', value: "" }),
            rpc.send('updateModMatrixSlot', { slot: slotIdx, key: 'target', value: "" })
        ]);
    }
}

// @ts-ignore
if (typeof window !== 'undefined') {
    // @ts-ignore
    //@ts-ignore
    window.modulePatchModal = new ModulePatchModal();
}
