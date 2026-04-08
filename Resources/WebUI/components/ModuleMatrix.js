/**
 * OMEGA Patchbay Matrix Module
 * Canonical ID: omega.matrix (Slot #0)
 */

class ModuleMatrix extends ModuleJunoBase {
    constructor(el, content) {
        super("Patchbay", el, content, []);
        this.render();
    }

    render() {
        this.el.classList.add('module-matrix');
        this.content.innerHTML = `
            <div class="panel matrix-panel">
                <div class="matrix-grid" id="matrix-patch-grid">
                    <!-- Dynamic slots will be here -->
                    <div class="matrix-placeholder">PATCHBAY 2.0</div>
                </div>
                <div class="matrix-footer">
                    <button class="sq tiny-btn" id="add-route-btn">+</button>
                    <span>ROUTING HUB</span>
                </div>
            </div>
        `;
        this.bindControls();
    }

    bindControls() {
        const btn = this.content.querySelector('#add-route-btn');
        if (btn) {
            btn.onclick = () => {
                console.log("[Matrix] Add route requested");
                // Future: show route picker
            };
        }
    }

    onStateUpdate(state) {
        const matrixData = state.preset.patchbayMatrix || [];
        const grid = this.content.querySelector('#matrix-patch-grid');
        if (!grid) return;

        if (matrixData.length === 0) {
            grid.innerHTML = '<div class="matrix-empty">EMPTY MATRIX</div>';
            return;
        }

        let html = '<div class="matrix-list">';
        matrixData.forEach((slot, idx) => {
            if (!slot.active) return;
            html += `
                <div class="matrix-slot">
                    <span class="slot-src">${slot.source || '?'}</span>
                    <span class="slot-arrow">→</span>
                    <span class="slot-dst">${slot.target || '?'}</span>
                    <span class="slot-amt">${(slot.amount || 0).toFixed(2)}</span>
                </div>
            `;
        });
        html += '</div>';
        grid.innerHTML = html;
    }
}

window.ModuleMatrix = ModuleMatrix;
