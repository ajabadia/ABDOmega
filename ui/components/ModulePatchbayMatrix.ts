/**
 * OMEGA Patchbay-Matrix (Hyper-ACE)
 * Features a compact Launcher in the rack and a high-density 8x4 Workspace.
 */

export class ModulePatchbayMatrix {
    private el: HTMLElement | null = null;
    private content: HTMLElement | null = null;
    private options: any;
    private state: any = null;
    private sources: {id: string, name: string}[] = [];
    private targets: {id: string, name: string}[] = [];
    
    private viewMode: 'compose' | 'overview' = 'compose';
    private manualChangeTimer: any = null;
    private selectedSlot: number = 0;
    private maxSlots: number = 32; // [Hyper-ACE] Dynamic limit

    constructor(options: any = {}) {
        this.options = options;
        this.loadMetadata();
        this.syncMaxSlots();
        this.setupSelectionListeners();
    }

    private ensureElements(): boolean {
        if (this.el) return true;
        this.el = document.getElementById('modulation-modal');
        this.content = document.getElementById('modulation-workspace');
        return !!(this.el && this.content);
    }

    private async syncMaxSlots() {
        // @ts-ignore
        if (window.omegaRPC) {
            try {
                // @ts-ignore
                const settings = await (window as any).omegaRPC.getSystemSettings();
                const maxSlotsSetting = settings.find((s: any) => s.id === "maxPatchbaySlots");
                if (maxSlotsSetting) {
                    const newValue = Math.floor(maxSlotsSetting.currentValue || 32);
                    if (this.maxSlots !== newValue) {
                        console.log(`[PatchbayMatrix] Max Slots updated: ${this.maxSlots} -> ${newValue}`);
                        this.maxSlots = newValue;
                        if (this.isWorkspaceOpen()) {
                            this.renderWorkspace();
                        }
                    } else {
                        console.log(`[PatchbayMatrix] Max Slots verified: ${this.maxSlots}`);
                    }
                }
            } catch (e) {
                console.warn("[PatchbayMatrix] Failed to sync maxPatchbaySlots:", e);
            }
        }
    }

    private async loadMetadata() {
        // @ts-ignore
        if (window.omegaRPC) {
            try {
                // @ts-ignore
                const resp = await (window as any).omegaRPC.send("getModulationMetadata", {});
                if (resp && (resp.sources || resp.targets)) {
                    this.sources = resp.sources || [];
                    this.targets = resp.targets || [];
                    console.log("[PatchbayMatrix] Metadata loaded:", this.sources.length, "sources,", this.targets.length, "targets");
                    if (this.isWorkspaceOpen()) {
                        this.renderWorkspace();
                    }
                }
            } catch (e) {
                console.error("[ModMatrix] Failed to load modulation metadata:", e);
            }
        }
    }

    public toggleWorkspace(open: boolean) {
        if (!this.ensureElements()) return;
        const modal = this.el!;
        modal.style.display = open ? 'flex' : 'none';
        if (open) {
            this.syncMaxSlots();
            this.renderWorkspace();
        }
    }

    private isWorkspaceOpen(): boolean {
        if (!this.ensureElements()) return false;
        return this.el!.style.display === 'flex';
    }

    public onStateUpdate(state: any) {
        this.state = state;
        const matrix = state?.preset?.patchbayMatrix || [];
        const activeCount = matrix.filter((s: any) => s.active).length;
        
        const countEl = document.getElementById('matrix-active-count');
        if (countEl) countEl.innerText = activeCount.toString().padStart(2, '0');

        // General Activity Pulse (Simulated for now, would be driven by telemetry)
        this.triggerActivity('general');

        if (this.isWorkspaceOpen()) {
            this.renderWorkspace();
        }
    }

    private triggerActivity(type: 'general' | 'manual') {
        const led = document.getElementById('matrix-activity-led');
        if (!led) return;

        if (type === 'manual') {
            led.classList.remove('activity-general');
            led.classList.add('activity-manual');
            
            if (this.manualChangeTimer) clearTimeout(this.manualChangeTimer);
            this.manualChangeTimer = setTimeout(() => {
                led.classList.remove('activity-manual');
                this.manualChangeTimer = null;
            }, 1000);
        } else if (!this.manualChangeTimer) {
            led.classList.add('activity-general');
            // Quick pulse pulse
            setTimeout(() => led.classList.remove('activity-general'), 100);
        }
    }

    private renderWorkspace() {
        if (!this.ensureElements()) return;
        const grid = document.getElementById('matrix-grid-container');
        const inspector = document.getElementById('matrix-inspector-container');
        if (!grid || !inspector) return;

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

        const matrixData = this.state?.preset?.patchbayMatrix || [];
        const matrix = Array.isArray(matrixData) ? matrixData : 
                     (typeof matrixData === 'object' ? Object.values(matrixData) : []);
        
        // --- Era 4 Robustness ---
        // We no longer bail if matrix.length === 0. Instead, we allow the board 
        // to render so the user can ADD the first slot dynamically.
        
        // 1. Detect Duplicates
        const seenRoutings = new Set<string>();
        const duplicates = new Set<number>();
        matrix.forEach((s: any, i: number) => {
            if (s.active && s.source && s.target) {
                const key = `${s.source}->${s.target}`;
                if (seenRoutings.has(key)) duplicates.add(i);
                else seenRoutings.add(key);
            }
        });

        let gridHtml = '';

        if (this.viewMode === 'compose') {
            const activeSlots = matrix.map((s: any, i: number) => ({...s, i}))
                .filter((s: any) => s.active || (s.source !== '' && s.source !== undefined));
            
            for (const slot of activeSlots) {
                gridHtml += this.renderCard(slot, slot.i, duplicates.has(slot.i));
            }

            // Always show ADD card if we have space, even if matrix is empty
            if (activeSlots.length < this.maxSlots) {
                gridHtml += `
                    <div class="matrix-card add-card" id="btn-add-modulation">
                        <div class="add-icon">＋</div>
                        <div class="card-label" style="text-align:center">ADD MODULATION</div>
                    </div>
                `;
            }

            if (activeSlots.length === 0 && this.sources.length === 0) {
                gridHtml = `
                    <div class="empty-state-info">
                        <div class="info-title">MODULAR RACK EMPTY</div>
                        <p>The synthesizer rack is currently empty. Use the <b>Edit > Add Module</b> menu to begin building your signal path.</p>
                        <div class="matrix-card add-card" id="btn-add-module-shortcut" style="width:200px; margin: 20px auto;">
                            <div class="add-icon">＋</div>
                            <div class="card-label">ADD MODULE</div>
                        </div>
                    </div>
                `;
            }
        } else {
            // Full dynamic Overview
            for (let i = 0; i < this.maxSlots; i++) {
                const slot = matrix[i] || { active: false, source: '', target: '', amount: 0, via: '', viaAmount: 0 };
                gridHtml += this.renderCard(slot, i, duplicates.has(i));
            }
        }
        
        grid.innerHTML = gridHtml;
        this.renderInspector();
        this.attachWorkspaceListeners();

        document.getElementById('btn-add-modulation')?.addEventListener('click', () => this.addModulation());
    }

    private renderCard(slot: any, i: number, isDuplicate: boolean): string {
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

    private getAmountColor(val: number): string {
        if (val <= 0.01) return '#ffffff'; // White
        if (val <= 1.0) {
            // White to Cyan (0 to 1)
            const factor = val;
            const r = Math.round(255 - factor * 255);
            const g = Math.round(255 - factor * 13); // 242 is G of Cyan
            const b = 255; 
            return `rgb(${r},${g},${b})`;
        } else {
            // Cyan to Orange (1 to 2)
            const factor = Math.min(val - 1.0, 1.0);
            const r = Math.round(0 + factor * 255);
            const g = Math.round(242 - factor * 85); // 157 is G of Orange
            const b = Math.round(255 - factor * 255);
            return `rgb(${r},${g},${b})`;
        }
    }

    private addModulation() {
        const matrix = (this.state?.preset?.patchbayMatrix || []);
        
        // First, check if there's an existing inactive/empty slot
        let targetSlot = matrix.findIndex((s: any, idx: number) => 
            idx < this.maxSlots && !s.active && (s.source === '' || s.source === undefined)
        );

        // If no slot found but we are below capacity, target the end of the array
        if (targetSlot === -1 && matrix.length < this.maxSlots) {
            targetSlot = matrix.length;
        }

        if (targetSlot !== -1 && targetSlot < this.maxSlots) {
            this.selectedSlot = targetSlot;
            this.renderWorkspace();
            
            // Auto-focus the source select in the inspector for immediate use
            setTimeout(() => {
                const sourceSelect = document.querySelector('select[data-key="source"]') as HTMLSelectElement;
                if (sourceSelect) sourceSelect.focus();
            }, 100);
        } else {
            alert(`Patchbay Matrix is FULL (${matrix.length}/${this.maxSlots}). Please remove a slot first.`);
        }
    }

    private renderInspector() {
        const container = document.getElementById('matrix-inspector-container');
        if (!container) return;

        const matrixData = this.state?.preset?.patchbayMatrix || [];
        const matrix = Array.isArray(matrixData) ? matrixData : 
                     (typeof matrixData === 'object' ? Object.values(matrixData) : []);
                     
        const slotIndex = isNaN(this.selectedSlot) ? 0 : this.selectedSlot;
        const slot = matrix[slotIndex] || { active: false, source: '', target: '', amount: 0, via: '', viaAmount: 0 };

        container.innerHTML = `
            <div class="inspector-title">SLOT ${(slotIndex + 1).toString().padStart(2, '0')} DETAILS</div>
            
            ${this.sources.length === 0 ? `
                <div class="metadata-warning">
                    ⚠️ NO ROUTING NODES FOUND<br>
                    <span style="font-size:9px; opacity:0.6; text-transform:none;">Add oscillators, filters or envelopes to populate sources and targets.</span>
                </div>
            ` : ''}
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

    private getBipolarStyle(val: number): string {
        const width = Math.abs(val) * 50; // Max 50%
        const left = val >= 0 ? 50 : 50 - width;
        return `left: ${left}%; width: ${width}%;`;
    }

    private getNameForId(list: any[], id: string): string {
        const item = list.find(s => s.id === id);
        return item ? item.name : '';
    }

    private generateOptions(list: {id: string, name: string, instance?: string}[], current: string) {
        let html = '<option value="">- NONE -</option>';
        
        // Group by instance
        const groups: {[key: string]: any[]} = {};
        for (const opt of list) {
            const groupName = opt.instance || 'Global';
            if (!groups[groupName]) groups[groupName] = [];
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

    private setupSelectionListeners() {
        // Handle slot selection by clicking cards
        document.addEventListener('click', (e: any) => {
            const card = e.target.closest('.matrix-card');
            if (card) {
                this.selectedSlot = parseInt(card.dataset.index);
                this.renderWorkspace();
            }
        });
    }

    private attachWorkspaceListeners() {
        const cards = document.querySelectorAll('.matrix-card');
        cards.forEach(card => {
            // Horizontal drag logic for bipolar slider
            const sliderArea = card.querySelector('.bipolar-slider-bg');
            if (sliderArea) {
                let isDragging = false;
                
                sliderArea.addEventListener('mousedown', (e: any) => {
                    isDragging = true;
                    this.updateFromMouse(e, sliderArea as HTMLElement, card as HTMLElement);
                });

                window.addEventListener('mousemove', (e: any) => {
                    if (isDragging) this.updateFromMouse(e, sliderArea as HTMLElement, card as HTMLElement);
                });

                window.addEventListener('mouseup', () => isDragging = false);
            }
        });
    }

    private updateFromMouse(e: MouseEvent, area: HTMLElement, card: HTMLElement) {
        const rect = area.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        const val = percent * 2.0; // Map 0..1 to 0..2 Gain
        
        const slotIdx = parseInt(card.dataset.index || "0");
        this.triggerActivity('manual');
        this.sendUpdate(slotIdx, 'amount', val);
    }

    private attachInspectorListeners() {
        const container = document.getElementById('matrix-inspector-container');
        if (!container) return;

        container.querySelectorAll('select, input').forEach(ctrl => {
            const eventType = ctrl.tagName === 'SELECT' ? 'change' : 'input';
            ctrl.addEventListener(eventType, (e: any) => {
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

    private sendUpdate(slot: number, key: string, value: any) {
        // @ts-ignore
        if (window.omegaRPC) {
            // @ts-ignore
            window.omegaRPC.call("updatePatchbayMatrixSlot", { slot, key, value });
        }
    }
}

// @ts-ignore
window.ModulePatchbayMatrix = ModulePatchbayMatrix;
