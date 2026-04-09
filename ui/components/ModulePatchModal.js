/**
 * OMEGA Module Patch Modal (TypeScript)
 * The 'Pocket Patchbay' for focused module routing.
 */
import { MetadataStore } from '../metadata_store.js';
import { OmegaRPC } from '../omega_rpc.js';
export class ModulePatchModal {
    el = null;
    titleEl = null;
    subtitleEl = null;
    inputsList = null;
    outputsList = null;
    usageFill = null;
    usageText = null;
    currentInstanceId = "";
    inventory = [];
    patchbayMatrix = [];
    maxSlots = 32; // [Hyper-ACE] Dynamic limit
    constructor() {
        console.log("[ModulePatchModal] Initializing [REV 2]...");
        this.init();
        this.syncMaxSlots();
    }
    init() {
        document.addEventListener('patch-request', (e) => {
            this.open(e.detail.instanceId, e.detail.componentId);
        });
    }
    async syncMaxSlots() {
        // @ts-ignore
        if (window.omegaRPC) {
            try {
                // @ts-ignore
                const settings = await window.omegaRPC.getSystemSettings();
                const maxSlotsSetting = settings.find((s) => s.id === "maxPatchbaySlots");
                if (maxSlotsSetting) {
                    this.maxSlots = Math.floor(maxSlotsSetting.currentValue || 32);
                    console.log(`[ModulePatchModal] Max Slots synced: ${this.maxSlots}`);
                }
            }
            catch (e) {
                console.warn("[ModulePatchModal] Failed to sync maxPatchbaySlots:", e);
            }
        }
    }
    ensureElements() {
        if (this.el)
            return true;
        this.el = document.getElementById('module-patch-modal');
        this.titleEl = document.getElementById('patch-modal-title');
        this.subtitleEl = document.getElementById('patch-modal-subtitle');
        this.inputsList = document.getElementById('patch-inputs-list');
        this.outputsList = document.getElementById('patch-outputs-list');
        this.usageFill = document.getElementById('matrix-usage-fill');
        this.usageText = document.getElementById('matrix-usage-text');
        if (!this.el)
            console.error("[ModulePatchModal] Root element #module-patch-modal not found!");
        return !!this.el;
    }
    async open(instanceId, componentId = "") {
        console.log(`[ModulePatchModal] Opening for instance: ${instanceId} (${componentId})`);
        if (!this.ensureElements())
            return;
        this.currentInstanceId = instanceId;
        this.el.style.display = 'flex';
        if (this.titleEl) {
            this.titleEl.innerText = instanceId.toUpperCase();
        }
        if (this.subtitleEl) {
            this.subtitleEl.innerText = `HYPER-ACE ROUTING HUB`;
        }
        await this.refresh(componentId);
    }
    async refresh(componentId = "") {
        console.log("[ModulePatchModal] Refreshing manifest and matrix...");
        //@ts-ignore
        const store = window.metadataStore;
        //@ts-ignore
        const rpc = window.omegaRPC;
        if (!store || !rpc) {
            console.error("[ModulePatchModal] Critical services (Metadata/RPC) missing!");
            return;
        }
        // 1. Get Inventory and PatchbayMatrix
        const metadata = await store.getModulationMetadata();
        this.inventory = metadata.inventory || [];
        console.log(`[ModulePatchModal] Inventory loaded: ${this.inventory.length} modules`);
        const state = await rpc.getState();
        const legacyMatrix = state.preset?.patchbayMatrix || [];
        const voiceChain = state.preset?.voiceChain || {};
        const modularConnections = voiceChain.CONNECTIONS || [];
        // Unify both worlds for the UI
        this.patchbayMatrix = [
            ...legacyMatrix,
            ...modularConnections.map((c) => ({ ...c, active: true }))
        ];
        console.log(`[ModulePatchModal] Unified Matrix loaded: ${this.patchbayMatrix.length} total slots`);
        this.render(componentId);
        this.updateUsage();
    }
    getCanonicalId(id) {
        if (!id)
            return "";
        const parts = id.split('_');
        if (parts.length > 1 && !isNaN(parseInt(parts[parts.length - 1]))) {
            return parts.slice(0, -1).join('_');
        }
        return id;
    }
    render(componentId = "") {
        console.log(`[ModulePatchModal] Rendering [REV 2] UI stage...`);
        const canonicalId = this.getCanonicalId(this.currentInstanceId);
        // Smarter lookup: Check instanceId first, then technical componentId, then generic id
        const manifest = this.inventory.find(m => (m.instanceId && m.instanceId === this.currentInstanceId) ||
            (m.instanceId && m.instanceId === canonicalId) ||
            (m.id && m.id === this.currentInstanceId) ||
            (m.id && m.id === canonicalId) ||
            (m.id && m.id === componentId));
        if (!manifest) {
            console.error(`[ModulePatchModal] Manifest NOT FOUND for instance: ${this.currentInstanceId}`);
            if (this.inputsList)
                this.inputsList.innerHTML = `<div class="placeholder-msg">MANIFEST NOT FOUND [${this.currentInstanceId}]</div>`;
            if (this.outputsList)
                this.outputsList.innerHTML = `<div class="placeholder-msg">MANIFEST NOT FOUND [${this.currentInstanceId}]</div>`;
            return;
        }
        console.log(`[ModulePatchModal] Rendering ${manifest.ports.length} ports...`);
        if (this.inputsList)
            this.renderSection(this.inputsList, manifest.ports.filter((p) => p.isInput), true);
        if (this.outputsList)
            this.renderSection(this.outputsList, manifest.ports.filter((p) => !p.isInput), false);
    }
    renderSection(container, ports, isTarget) {
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
            const addBtn = header.querySelector('.patch-add-btn');
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
    renderSlotRow(container, port, slot, isTarget) {
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
        const select = row.querySelector('.patch-selector');
        const slider = row.querySelector('.patch-amount-slider');
        const valDisp = row.querySelector('.patch-amount-value');
        const removeBtn = row.querySelector('.patch-remove-btn');
        select.onchange = (e) => {
            const newRemote = e.target.value;
            this.applyPatch(port.id, newRemote, isTarget, slot.idx);
        };
        slider.oninput = (e) => {
            const val = parseFloat(e.target.value);
            valDisp.innerText = `${Math.round(val * 100)}%`;
            this.updateSlotParam(slot.idx, 'amount', val);
        };
        removeBtn.onclick = () => this.removePatch(slot.idx);
        container.appendChild(row);
    }
    showNewSlotRow(container, port, isTarget) {
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
        const select = row.querySelector('.patch-selector');
        select.onchange = (e) => {
            const remoteId = e.target.value;
            if (remoteId)
                this.applyPatch(port.id, remoteId, isTarget);
        };
        const removeBtn = row.querySelector('.patch-remove-btn');
        removeBtn.onclick = () => row.remove();
        container.appendChild(row);
        select.focus();
    }
    getCompatibleOptions(port, isTarget, selectedId = "") {
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
            m.ports.forEach((p) => {
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
    updateUsage() {
        if (!this.usageFill || !this.usageText)
            return;
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
    onStateUpdate(state) {
        const legacyMatrix = (state.preset?.patchbayMatrix || state.patchbayMatrix || []);
        const voiceChain = (state.preset?.voiceChain || state.voiceChain || {});
        const modularConnections = (voiceChain.CONNECTIONS || []).map((c) => ({ ...c, active: true }));
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
    async applyPatch(localPortId, remoteId, isTarget, existingSlotIdx = -1) {
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
        const rpc = window.omegaRPC;
        await Promise.all([
            rpc.send('updatePatchbayMatrixSlot', { slot: slotIdx, key: 'source', value: source }),
            rpc.send('updatePatchbayMatrixSlot', { slot: slotIdx, key: 'target', value: target }),
            rpc.send('updatePatchbayMatrixSlot', { slot: slotIdx, key: 'amount', value: 1.0 }),
            rpc.send('updatePatchbayMatrixSlot', { slot: slotIdx, key: 'active', value: true })
        ]);
        // No manual refresh needed - onStateUpdate will handle it via broadcast!
    }
    async updateSlotParam(slotIdx, key, value) {
        //@ts-ignore
        const rpc = window.omegaRPC;
        await rpc.send('updatePatchbayMatrixSlot', { slot: slotIdx, key, value });
    }
    async removePatch(slotIdx) {
        console.log(`[ModulePatchModal] Removing patch from slot ${slotIdx}...`);
        //@ts-ignore
        const rpc = window.omegaRPC;
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
//# sourceMappingURL=ModulePatchModal.js.map