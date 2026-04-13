import {} from '../omega_types.js';
import { OmegaLog } from '../omega_log.js';
export class ModulePatchbayMatrix {
    el = null;
    content = null;
    options;
    state = null;
    sources = [];
    targets = [];
    viewMode = 'compose';
    manualChangeTimer = null;
    selectedSlot = 0;
    maxSlots = 32;
    structureBuilt = false;
    constructor(options = {}) {
        this.options = options;
        this.loadMetadata();
        this.syncMaxSlots();
    }
    ensureElements() {
        if (this.el)
            return true;
        this.el = document.getElementById('modulation-modal');
        this.content = document.getElementById('modulation-workspace');
        return !!(this.el && this.content);
    }
    async syncMaxSlots() {
        // [Era 6 Aseptic] Use RpcCommandDispatcher for system queries if possible, 
        // but for read-only we use the established bridge pattern.
        const rpc = window.omegaRPC;
        if (rpc) {
            try {
                const settings = await rpc.getSystemSettings();
                if (!settings || !Array.isArray(settings))
                    return;
                const maxSlotsSetting = settings.find((s) => s && s.id === "maxPatchbaySlots");
                if (maxSlotsSetting) {
                    const newValue = Math.floor(maxSlotsSetting.currentValue || 32);
                    if (this.maxSlots !== newValue) {
                        OmegaLog.info("MATRIX", `Capacity updated: ${newValue}`);
                        this.maxSlots = newValue;
                        this.structureBuilt = false; // Trigger rebuild
                        if (this.isWorkspaceOpen())
                            this.renderWorkspace();
                    }
                }
            }
            catch (e) {
                OmegaLog.warn("MATRIX", "Max slots sync failed", e);
            }
        }
    }
    async loadMetadata() {
        const rpc = window.omegaRPC;
        if (rpc) {
            try {
                // [Era 6.1] Canonical Metadata Handshake
                const resp = await rpc.send("getMetadata", {});
                const params = resp?.parameters || resp;
                if (params && Array.isArray(params)) {
                    // Map parameters to source/target if they have appropriate roles (Legacy Shims)
                    this.sources = params.map((p) => ({ id: p.id || p.target, name: p.name || p.label, instance: p.groupId || p.instance }));
                    this.targets = params.map((p) => ({ id: p.id || p.target, name: p.name || p.label, instance: p.groupId || p.instance }));
                    if (this.isWorkspaceOpen())
                        this.renderWorkspace();
                }
                else {
                    OmegaLog.warn("MATRIX", "Received malformed metadata", resp);
                }
            }
            catch (e) {
                OmegaLog.error("MATRIX", "Metadata load failed", e);
            }
        }
    }
    toggleWorkspace(open) {
        if (!this.ensureElements())
            return;
        const modal = this.el;
        modal.style.display = open ? 'flex' : 'none';
        if (open) {
            this.loadMetadata();
            this.syncMaxSlots();
            this.renderWorkspace();
        }
    }
    isWorkspaceOpen() {
        if (!this.ensureElements())
            return false;
        return this.el.style.display === 'flex';
    }
    onStateUpdate(state) {
        this.state = state;
        const matrixData = state?.preset?.patchbayMatrix || [];
        const matrix = Array.isArray(matrixData) ? matrixData : Object.values(matrixData);
        // Update global counter
        const activeCount = matrix.filter((s) => s.active).length;
        const countEl = document.getElementById('matrix-active-count');
        if (countEl)
            countEl.innerText = activeCount.toString().padStart(2, '0');
        this.triggerActivity('general');
        if (this.isWorkspaceOpen()) {
            this.syncSlotsFromState(matrix);
        }
    }
    triggerActivity(type) {
        const led = document.getElementById('matrix-activity-led');
        if (!led)
            return;
        if (type === 'manual') {
            led.classList.remove('activity-general');
            led.classList.add('activity-manual');
            if (this.manualChangeTimer)
                clearTimeout(this.manualChangeTimer);
            this.manualChangeTimer = setTimeout(() => {
                led.classList.remove('activity-manual');
                this.manualChangeTimer = null;
            }, 1000);
        }
        else if (!this.manualChangeTimer) {
            led.classList.add('activity-general');
            setTimeout(() => led.classList.remove('activity-general'), 100);
        }
    }
    renderWorkspace() {
        if (!this.ensureElements())
            return;
        const grid = document.getElementById('matrix-grid-container');
        if (!grid)
            return;
        // One-time header setup
        this.setupHeaderToggles();
        // 1. Structural Rendering (Base cards)
        if (!this.structureBuilt || this.viewMode === 'compose') {
            this.renderStructure(grid);
            this.structureBuilt = (this.viewMode === 'overview');
        }
        // 2. Data Sync
        const matrixData = this.state?.preset?.patchbayMatrix || [];
        const matrix = Array.isArray(matrixData) ? matrixData : Object.values(matrixData);
        this.syncSlotsFromState(matrix);
        // 3. Inspector
        this.renderInspector();
    }
    setupHeaderToggles() {
        const modalHeader = document.querySelector('.modulation-modal-content .modal-title');
        if (modalHeader && !document.getElementById('matrix-view-toggles')) {
            const toggles = document.createElement('div');
            toggles.id = 'matrix-view-toggles';
            toggles.style.cssText = "display:flex; gap:10px; margin-left:20px; font-size:10px;";
            toggles.innerHTML = `
                <button class="juno-btn ${this.viewMode === 'compose' ? 'active juno-orange' : ''}" id="btn-view-compose">COMPOSE</button>
                <button class="juno-btn ${this.viewMode === 'overview' ? 'active juno-orange' : ''}" id="btn-view-overview">OVERVIEW</button>
            `;
            modalHeader.parentElement?.insertBefore(toggles, modalHeader.nextSibling);
            document.getElementById('btn-view-compose')?.addEventListener('click', () => {
                this.viewMode = 'compose';
                this.structureBuilt = false;
                this.renderWorkspace();
            });
            document.getElementById('btn-view-overview')?.addEventListener('click', () => {
                this.viewMode = 'overview';
                this.structureBuilt = false;
                this.renderWorkspace();
            });
        }
    }
    renderStructure(grid) {
        let html = '';
        const matrix = this.state?.preset?.patchbayMatrix || [];
        if (this.viewMode === 'compose') {
            const activeSlots = matrix.map((s, i) => ({ ...s, i }))
                .filter((s) => s.active || (s.source !== '' && s.source !== undefined));
            activeSlots.forEach((slot) => {
                html += this.getSlotSkeleton(slot.i);
            });
            if (activeSlots.length < this.maxSlots) {
                html += `
                    <div class="matrix-card add-card" id="btn-add-modulation">
                        <div class="add-icon">＋</div>
                        <div class="card-label" style="text-align:center">ADD MODULATION</div>
                    </div>
                `;
            }
        }
        else {
            for (let i = 0; i < this.maxSlots; i++) {
                html += this.getSlotSkeleton(i);
            }
        }
        grid.innerHTML = html;
        this.attachGridListeners(grid);
        document.getElementById('btn-add-modulation')?.addEventListener('click', () => this.addModulation());
    }
    getSlotSkeleton(i) {
        return `
            <div class="matrix-card aseptic-card" id="matrix-slot-${i}" data-index="${i}">
                <div class="card-header">
                    <span class="card-index">${(i + 1).toString().padStart(2, '0')}</span>
                    <div class="card-status"></div>
                </div>
                <div class="card-routing">
                    <div class="card-source-label card-label">...</div>
                    <div class="card-arrow">↓</div>
                    <div class="card-target-label card-label">...</div>
                </div>
                <div class="bipolar-container">
                    <div class="bipolar-slider-bg">
                        <div class="bipolar-slider-fill gain-mode"></div>
                    </div>
                    <div class="bipolar-value">0.00x</div>
                </div>
                <div class="card-via-label card-label-tiny"></div>
            </div>
        `;
    }
    syncSlotsFromState(matrix) {
        // Delta Update Engine
        matrix.forEach((slot, i) => {
            const el = document.getElementById(`matrix-slot-${i}`);
            if (!el)
                return;
            const isSelected = this.selectedSlot === i;
            el.classList.toggle('active', slot.active);
            el.classList.toggle('selected', isSelected);
            const sourceLabel = el.querySelector('.card-source-label');
            const targetLabel = el.querySelector('.card-target-label');
            if (sourceLabel)
                sourceLabel.textContent = this.getNameForId(this.sources, slot.source) || 'EMPTY';
            if (targetLabel)
                targetLabel.textContent = this.getNameForId(this.targets, slot.target) || '---';
            const fill = el.querySelector('.bipolar-slider-fill');
            const valueDisp = el.querySelector('.bipolar-value');
            if (fill && valueDisp) {
                const amount = slot.amount || 0;
                const color = this.getAmountColor(amount);
                fill.style.width = `${Math.min(amount, 2.0) * 50}%`;
                fill.style.backgroundColor = color;
                valueDisp.textContent = `${amount.toFixed(2)}x`;
                valueDisp.style.color = color;
            }
            const viaLabel = el.querySelector('.card-via-label');
            if (viaLabel) {
                viaLabel.textContent = slot.via ? `VIA: ${this.getNameForId(this.sources, slot.via)}` : '';
            }
        });
    }
    getAmountColor(val) {
        if (val <= 0.01)
            return '#ffffff';
        if (val <= 1.0) {
            const f = val;
            return `rgb(${Math.round(255 - f * 255)},${Math.round(255 - f * 13)},255)`;
        }
        else {
            const f = Math.min(val - 1.0, 1.0);
            return `rgb(${Math.round(f * 255)},${Math.round(242 - f * 85)},${Math.round(255 - f * 255)})`;
        }
    }
    addModulation() {
        const matrix = this.state?.preset?.patchbayMatrix || [];
        let targetSlot = matrix.findIndex((s, idx) => idx < this.maxSlots && !s.active && !s.source);
        if (targetSlot === -1 && matrix.length < this.maxSlots)
            targetSlot = matrix.length;
        if (targetSlot !== -1 && targetSlot < this.maxSlots) {
            this.selectedSlot = targetSlot;
            this.structureBuilt = false; // Force rebuild to show new card if in compose mode
            this.renderWorkspace();
            setTimeout(() => {
                const sel = document.querySelector('select[data-key="source"]');
                if (sel)
                    sel.focus();
            }, 100);
        }
    }
    renderInspector() {
        const container = document.getElementById('matrix-inspector-container');
        if (!container)
            return;
        const matrix = this.state?.preset?.patchbayMatrix || [];
        const slotIdx = this.selectedSlot;
        const slot = matrix[slotIdx] || { active: false, source: '', target: '', amount: 0, via: '', viaAmount: 0 };
        const targetInstance = slot.target?.split('.')[0] || "";
        const sourceInstance = slot.source?.split('.')[0] || "";
        container.innerHTML = `
            <div class="inspector-title">SLOT ${(slotIdx + 1).toString().padStart(2, '0')} DETAILS</div>
            
            <div class="control-group">
                <label>SOURCE</label>
                <select class="inspector-select" data-key="source">
                    ${this.generateOptions(this.sources, slot.source, targetInstance)}
                </select>
            </div>

            <div class="control-group">
                <label>TARGET</label>
                <select class="inspector-select" data-key="target">
                    ${this.generateOptions(this.targets, slot.target, sourceInstance)}
                </select>
            </div>

            <div class="control-group">
                <label>GAIN MULTIPLIER (0 to 2.0x)</label>
                <input type="range" class="inspector-range" data-key="amount" min="0" max="2" step="0.01" value="${slot.amount}">
                <div class="bipolar-value" style="color: ${this.getAmountColor(slot.amount)}">${slot.amount.toFixed(2)}x</div>
            </div>

            <div class="control-group">
                <label>VIA Modulator</label>
                <select class="inspector-select" data-key="via">
                    ${this.generateOptions(this.sources, slot.via, targetInstance)}
                </select>
            </div>

            <div class="control-group">
                <label>VIA AMOUNT</label>
                <input type="range" class="inspector-range" data-key="viaAmount" min="0" max="1" step="0.05" value="${slot.viaAmount}">
            </div>

            <div class="inspector-actions" style="margin-top: auto; display: flex; gap: 10px;">
                <button class="juno-btn" id="btn-clear-slot" style="flex:1">CLEAR</button>
                <button class="juno-btn" id="btn-init-matrix" style="flex:1">INIT ALL</button>
            </div>
        `;
        this.attachInspectorListeners(container);
    }
    getNameForId(list, id) {
        const item = list.find(s => s.id === id);
        return item ? item.name : '';
    }
    generateOptions(list, current, exclude) {
        let html = '<option value="">- NONE -</option>';
        const groups = {};
        for (const opt of list) {
            const groupName = opt.instance || 'Global';
            if (exclude && groupName === exclude)
                continue;
            if (!groups[groupName])
                groups[groupName] = [];
            groups[groupName].push(opt);
        }
        for (const [group, items] of Object.entries(groups)) {
            html += `<optgroup label="${group.toUpperCase()}">`;
            items.forEach(item => {
                const disp = item.name.replace(group, '').trim() || item.name;
                html += `<option value="${item.id}" ${item.id === current ? 'selected' : ''}>${disp}</option>`;
            });
            html += `</optgroup>`;
        }
        return html;
    }
    attachGridListeners(grid) {
        grid.querySelectorAll('.matrix-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectedSlot = parseInt(card.dataset.index || "0");
                this.renderWorkspace();
            });
            const slider = card.querySelector('.bipolar-slider-bg');
            if (slider) {
                let isDragging = false;
                const update = (e) => {
                    const rect = slider.getBoundingClientRect();
                    const val = Math.max(0, Math.min(2, ((e.clientX - rect.left) / rect.width) * 2));
                    this.sendUpdate(parseInt(card.dataset.index || "0"), 'amount', val);
                };
                slider.addEventListener('pointerdown', (e) => {
                    isDragging = true;
                    e.target.setPointerCapture(e.pointerId);
                    update(e);
                });
                slider.addEventListener('pointermove', (e) => { if (isDragging)
                    update(e); });
                slider.addEventListener('pointerup', () => isDragging = false);
            }
        });
    }
    attachInspectorListeners(container) {
        container.querySelectorAll('.inspector-select, .inspector-range').forEach(ctrl => {
            ctrl.addEventListener(ctrl.tagName === 'SELECT' ? 'change' : 'input', (e) => {
                const val = e.target.type === 'range' ? parseFloat(e.target.value) : e.target.value;
                this.sendUpdate(this.selectedSlot, e.target.dataset.key, val);
            });
        });
        document.getElementById('btn-clear-slot')?.addEventListener('click', () => {
            this.sendUpdate(this.selectedSlot, 'source', '');
            this.sendUpdate(this.selectedSlot, 'target', '');
            this.sendUpdate(this.selectedSlot, 'amount', 0);
        });
    }
    sendUpdate(slot, key, value) {
        this.triggerActivity('manual');
        // [Era 6] Unified Dispatch via RpcCommandDispatcher
        const dispatcher = window.rpcCommandDispatcher;
        if (dispatcher) {
            dispatcher.dispatch({
                type: 'patchbayMatrixAction',
                value: { slot, key, value }
            });
        }
    }
}
// @ts-ignore
window.ModulePatchbayMatrix = ModulePatchbayMatrix;
//# sourceMappingURL=ModulePatchbayMatrix.js.map