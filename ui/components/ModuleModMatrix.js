/**
 * OMEGA Modulation Matrix 2.0 / Modulation Hub
 * Features a compact Launcher in the rack and a high-density 8x4 Workspace.
 */
export class ModuleModMatrix {
    el;
    content;
    options;
    state = null;
    sources = [];
    targets = [];
    viewMode = 'compose';
    manualChangeTimer = null;
    selectedSlot = 0;
    constructor(el, content, options) {
        this.el = el;
        this.content = content;
        this.options = options;
        this.renderLauncher();
        this.loadMetadata();
        this.setupSelectionListeners();
    }
    async loadMetadata() {
        // @ts-ignore
        if (window.omegaRPC) {
            try {
                // @ts-ignore
                const resp = await window.omegaRPC.send("getModulationMetadata", {});
                if (resp && (resp.sources || resp.targets)) {
                    this.sources = resp.sources || [];
                    this.targets = resp.targets || [];
                    console.log("[ModMatrix] Metadata loaded:", this.sources.length, "sources,", this.targets.length, "targets");
                    if (this.isWorkspaceOpen()) {
                        this.renderWorkspace();
                    }
                }
            }
            catch (e) {
                console.error("[ModMatrix] Failed to load modulation metadata:", e);
            }
        }
    }
    renderLauncher() {
        this.content.innerHTML = `
            <div class="matrix-launcher">
                <div class="launcher-display">
                    <div class="active-count" id="matrix-active-count">00</div>
                    <div class="label-tiny">ACTIVE ROUTES</div>
                </div>
                <div class="launcher-controls">
                    <div class="launcher-led" id="matrix-activity-led"></div>
                    <button class="juno-btn matrix-open-btn" id="matrix-workspace-trigger">
                        MATRIX
                    </button>
                </div>
            </div>
        `;
        const trigger = this.content.querySelector('#matrix-workspace-trigger');
        if (trigger) {
            trigger.addEventListener('click', () => this.toggleWorkspace(true));
        }
        // Add Launcher specific styles if not present
        if (!document.getElementById('matrix-launcher-style')) {
            const style = document.createElement('style');
            style.id = 'matrix-launcher-style';
            style.innerHTML = `
                .matrix-launcher {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 15px;
                    padding: 15px;
                    width: 140px;
                    background: linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%);
                    height: 100%;
                }
                .launcher-display {
                    background: #000;
                    border: 1px solid #333;
                    padding: 10px;
                    border-radius: 4px;
                    text-align: center;
                    width: 80%;
                }
                .active-count {
                    font-family: 'Outfit', sans-serif;
                    font-size: 24px;
                    color: var(--neon-cyan);
                    text-shadow: 0 0 10px rgba(0, 242, 255, 0.5);
                    font-weight: 900;
                }
                .launcher-controls {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 10px;
                }
                .matrix-open-btn {
                    padding: 8px 15px;
                    font-size: 10px;
                    letter-spacing: 2px;
                    background: #222;
                    border: 1px solid #444;
                    color: #fff;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .matrix-open-btn:hover {
                    border-color: var(--neon-cyan);
                    box-shadow: 0 0 10px rgba(0, 242, 255, 0.3);
                }
            `;
            document.head.appendChild(style);
        }
    }
    toggleWorkspace(open) {
        const modal = document.getElementById('modulation-modal');
        if (modal) {
            modal.style.display = open ? 'flex' : 'none';
            if (open)
                this.renderWorkspace();
        }
    }
    isWorkspaceOpen() {
        const modal = document.getElementById('modulation-modal');
        return modal ? modal.style.display === 'flex' : false;
    }
    onStateUpdate(state) {
        this.state = state;
        const matrix = state?.preset?.modMatrix || [];
        const activeCount = matrix.filter((s) => s.active).length;
        const countEl = document.getElementById('matrix-active-count');
        if (countEl)
            countEl.innerText = activeCount.toString().padStart(2, '0');
        // General Activity Pulse (Simulated for now, would be driven by telemetry)
        this.triggerActivity('general');
        if (this.isWorkspaceOpen()) {
            this.renderWorkspace();
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
            // Quick pulse pulse
            setTimeout(() => led.classList.remove('activity-general'), 100);
        }
    }
    renderWorkspace() {
        const grid = document.getElementById('matrix-grid-container');
        const inspector = document.getElementById('matrix-inspector-container');
        if (!grid || !inspector)
            return;
        // Header Update (Add Toggles)
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
            document.getElementById('btn-view-compose')?.addEventListener('click', () => { this.viewMode = 'compose'; this.renderWorkspace(); });
            document.getElementById('btn-view-overview')?.addEventListener('click', () => { this.viewMode = 'overview'; this.renderWorkspace(); });
        }
        const matrixData = this.state?.preset?.modMatrix || [];
        const matrix = Array.isArray(matrixData) ? matrixData :
            (typeof matrixData === 'object' ? Object.values(matrixData) : []);
        if (matrix.length === 0) {
            grid.innerHTML = '<div class="placeholder-msg">WAITING FOR CORE STATE...</div>';
            return;
        }
        // 1. Detect Duplicates
        const seenRoutings = new Set();
        const duplicates = new Set();
        matrix.forEach((s, i) => {
            if (s.active && s.source && s.target) {
                const key = `${s.source}->${s.target}`;
                if (seenRoutings.has(key))
                    duplicates.add(i);
                else
                    seenRoutings.add(key);
            }
        });
        let gridHtml = '';
        if (this.viewMode === 'compose') {
            const activeSlots = matrix.map((s, i) => ({ ...s, i }))
                .filter((s) => s.active || (s.source !== '' && s.source !== undefined));
            for (const slot of activeSlots) {
                gridHtml += this.renderCard(slot, slot.i, duplicates.has(slot.i));
            }
            // Add "ADD MODULATION" Card
            gridHtml += `
                <div class="matrix-card add-card" id="btn-add-modulation">
                    <div class="add-icon">＋</div>
                    <div class="card-label" style="text-align:center">ADD MODULATION</div>
                </div>
            `;
        }
        else {
            // Full 64-slot Overview
            for (let i = 0; i < 64; i++) {
                const slot = matrix[i] || { active: false, source: '', target: '', amount: 0, via: '', viaAmount: 0 };
                gridHtml += this.renderCard(slot, i, duplicates.has(i));
            }
        }
        grid.innerHTML = gridHtml;
        this.renderInspector();
        this.attachWorkspaceListeners();
        document.getElementById('btn-add-modulation')?.addEventListener('click', () => this.addModulation());
    }
    renderCard(slot, i, isDuplicate) {
        const isSelected = this.selectedSlot === i;
        const amountColor = this.getAmountColor(slot.amount);
        return `
            <div class="matrix-card ${slot.active ? 'active' : ''} ${isSelected ? 'selected' : ''} ${isDuplicate ? 'duplicate-error' : ''}" data-index="${i}">
                <div class="card-header">
                    <span class="card-index">${(i + 1).toString().padStart(2, '0')}</span>
                    <div class="card-status ${slot.active ? 'active' : ''}"></div>
                    ${isDuplicate ? '<div class="error-badge">DUP</div>' : ''}
                </div>
                <div class="card-routing">
                    <div class="card-label">${this.getNameForId(this.sources, slot.source) || 'EMPTY'}</div>
                    <div class="card-arrow">↓</div>
                    <div class="card-label">${this.getNameForId(this.targets, slot.target) || '---'}</div>
                </div>
                <div class="bipolar-container">
                    <div class="bipolar-slider-bg">
                        <div class="bipolar-slider-fill gain-mode" style="width: ${Math.min(slot.amount, 2.0) * 50}%; background-color: ${amountColor}"></div>
                    </div>
                    <div class="bipolar-value" style="color: ${amountColor}">${slot.amount.toFixed(2)}x</div>
                </div>
                ${slot.via ? `<div class="card-label-tiny" style="font-size:7px; color:#555; margin-top:2px;">VIA: ${this.getNameForId(this.sources, slot.via)}</div>` : ''}
            </div>
        `;
    }
    getAmountColor(val) {
        if (val <= 0.01)
            return '#ffffff'; // White
        if (val <= 1.0) {
            // White to Cyan (0 to 1)
            const factor = val;
            const r = Math.round(255 - factor * 255);
            const g = Math.round(255 - factor * 13); // 242 is G of Cyan
            const b = 255;
            return `rgb(${r},${g},${b})`;
        }
        else {
            // Cyan to Orange (1 to 2)
            const factor = Math.min(val - 1.0, 1.0);
            const r = Math.round(0 + factor * 255);
            const g = Math.round(242 - factor * 85); // 157 is G of Orange
            const b = Math.round(255 - factor * 255);
            return `rgb(${r},${g},${b})`;
        }
    }
    addModulation() {
        const matrix = (this.state?.preset?.modMatrix || []);
        const firstFree = matrix.findIndex((s) => !s.active && (s.source === '' || s.source === undefined));
        if (firstFree !== -1 && firstFree < 64) {
            this.selectedSlot = firstFree;
            this.renderWorkspace();
            // Optional: show some visual indicator in the inspector
        }
    }
    renderInspector() {
        const container = document.getElementById('matrix-inspector-container');
        if (!container)
            return;
        const matrix = this.state?.preset?.modMatrix || [];
        const slot = matrix[this.selectedSlot] || { active: false, source: '', target: '', amount: 0, via: '', viaAmount: 0 };
        container.innerHTML = `
            <div class="inspector-title">SLOT ${this.selectedSlot + 1} DETAILS</div>
            
            <div class="control-group">
                <label>SOURCE</label>
                <select class="inspector-select" data-key="source">
                    ${this.generateOptions(this.sources, slot.source)}
                </select>
            </div>

            <div class="control-group">
                <label>TARGET</label>
                <select class="inspector-select" data-key="target">
                    ${this.generateOptions(this.targets, slot.target)}
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
                    ${this.generateOptions(this.sources, slot.via)}
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
        // Add inspector specific styles
        if (!document.getElementById('matrix-inspector-style')) {
            const style = document.createElement('style');
            style.id = 'matrix-inspector-style';
            style.innerHTML = `
                .inspector-select {
                    width: 100%;
                    background: #111;
                    color: var(--neon-cyan);
                    border: 1px solid #333;
                    padding: 8px;
                    font-size: 11px;
                    border-radius: 4px;
                }
                .inspector-range {
                    width: 100%;
                    accent-color: var(--neon-cyan);
                }
            `;
            document.head.appendChild(style);
        }
        this.attachInspectorListeners();
    }
    getBipolarStyle(val) {
        const width = Math.abs(val) * 50; // Max 50%
        const left = val >= 0 ? 50 : 50 - width;
        return `left: ${left}%; width: ${width}%;`;
    }
    getNameForId(list, id) {
        const item = list.find(s => s.id === id);
        return item ? item.name : '';
    }
    generateOptions(list, current) {
        let html = '<option value="">- NONE -</option>';
        // Group by instance
        const groups = {};
        for (const opt of list) {
            const groupName = opt.instance || 'Global';
            if (!groups[groupName])
                groups[groupName] = [];
            groups[groupName].push(opt);
        }
        for (const [group, items] of Object.entries(groups)) {
            html += `<optgroup label="${group.toUpperCase()}">`;
            for (const item of items) {
                // Strip instance from name for cleaner display within group
                const displayName = item.name.replace(group, '').trim() || item.name;
                html += `<option value="${item.id}" ${item.id === current ? 'selected' : ''}>${displayName}</option>`;
            }
            html += `</optgroup>`;
        }
        return html;
    }
    setupSelectionListeners() {
        // Handle slot selection by clicking cards
        document.addEventListener('click', (e) => {
            const card = e.target.closest('.matrix-card');
            if (card) {
                this.selectedSlot = parseInt(card.dataset.index);
                this.renderWorkspace();
            }
        });
    }
    attachWorkspaceListeners() {
        const cards = document.querySelectorAll('.matrix-card');
        cards.forEach(card => {
            // Horizontal drag logic for bipolar slider
            const sliderArea = card.querySelector('.bipolar-slider-bg');
            if (sliderArea) {
                let isDragging = false;
                sliderArea.addEventListener('mousedown', (e) => {
                    isDragging = true;
                    this.updateFromMouse(e, sliderArea, card);
                });
                window.addEventListener('mousemove', (e) => {
                    if (isDragging)
                        this.updateFromMouse(e, sliderArea, card);
                });
                window.addEventListener('mouseup', () => isDragging = false);
            }
        });
    }
    updateFromMouse(e, area, card) {
        const rect = area.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        const val = percent * 2.0; // Map 0..1 to 0..2 Gain
        const slotIdx = parseInt(card.dataset.index || "0");
        this.triggerActivity('manual');
        this.sendUpdate(slotIdx, 'amount', val);
    }
    attachInspectorListeners() {
        const container = document.getElementById('matrix-inspector-container');
        if (!container)
            return;
        container.querySelectorAll('select, input').forEach(ctrl => {
            const eventType = ctrl.tagName === 'SELECT' ? 'change' : 'input';
            ctrl.addEventListener(eventType, (e) => {
                const key = e.target.dataset.key;
                const value = e.target.type === 'range' ? parseFloat(e.target.value) : e.target.value;
                this.triggerActivity('manual');
                this.sendUpdate(this.selectedSlot, key, value);
            });
        });
        const clearBtn = document.getElementById('btn-clear-slot');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.sendUpdate(this.selectedSlot, 'source', '');
                this.sendUpdate(this.selectedSlot, 'target', '');
                this.sendUpdate(this.selectedSlot, 'amount', 0);
                this.triggerActivity('manual');
            });
        }
    }
    sendUpdate(slot, key, value) {
        // @ts-ignore
        if (window.omegaRPC) {
            // @ts-ignore
            window.omegaRPC.call("updateModMatrixSlot", { slot, key, value });
        }
    }
}
// @ts-ignore
window.ModuleModMatrix = ModuleModMatrix;
//# sourceMappingURL=ModuleModMatrix.js.map