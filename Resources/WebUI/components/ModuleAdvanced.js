/**
 * Advanced Modules for OMEGA (JP & Korg Styles)
 */

class ModuleJP extends ModuleJunoBase {
    constructor(el, content) {
        super("JP Filter", el, content, [
            "layer.a.jp.detune", "layer.a.jp.filter.mode"
        ]);
        this.render();
    }

    render() {
        this.content.innerHTML = `
            <div class="panel jp-panel">
                <div class="control-group">
                    <label>JP DETUNE</label>
                    <div class="knob-placeholder" data-param="layer.a.jp.detune"></div>
                </div>
                <div class="control-group">
                    <label>MODE</label>
                    <select class="jp-select" data-param="layer.a.jp.filter.mode">
                        <option value="0">LP</option>
                        <option value="1">BP</option>
                        <option value="2">HP</option>
                    </select>
                </div>
            </div>
        `;
        this.bindControls();
    }

    bindControls() {
        this.content.querySelectorAll('[data-param]').forEach(el => {
            if (el.tagName === 'SELECT') {
                el.addEventListener('change', (e) => {
                    window.omegaRPC.setParam(el.dataset.param, parseInt(e.target.value));
                });
            } else if (el.classList.contains('knob-placeholder')) {
                // Basic click-to-cycle for demo, or we could implement a real knob
                el.addEventListener('click', () => {
                   const cur = parseFloat(el.getAttribute('data-val') || "0");
                   const next = (cur + 0.1) % 1.1;
                   el.setAttribute('data-val', next);
                   window.omegaRPC.setParam(el.dataset.param, next);
                });
            }
        });
    }

    updateControl(paramId, value) {
        const el = this.content.querySelector(`[data-param="${paramId}"]`);
        if (el) {
            if (el.tagName === 'SELECT') el.value = Math.round(value);
            else el.setAttribute('data-val', value);
        }
    }
}

class ModuleKorg extends ModuleJunoBase {
    constructor(el, content) {
        super("Korg VCF", el, content, [
            "layer.a.korg.hpf.cutoff", "layer.a.korg.hpf.res", "layer.a.korg.grit"
        ]);
        this.render();
    }

    render() {
        this.content.innerHTML = `
            <div class="panel korg-panel">
                <div class="control-group">
                    <label>HP CUTOFF</label>
                    <input type="range" class="v-slider" data-param="layer.a.korg.hpf.cutoff">
                </div>
                <div class="control-group">
                    <label>HP RES</label>
                    <input type="range" class="v-slider" data-param="layer.a.korg.hpf.res">
                </div>
                <div class="control-group">
                    <label>GRIT</label>
                    <input type="range" class="v-slider" data-param="layer.a.korg.grit" min="1" max="10" step="0.1">
                </div>
            </div>
        `;
        this.bindControls();
    }

    bindControls() {
        this.content.querySelectorAll('input').forEach(el => {
            el.addEventListener('input', (e) => {
                window.omegaRPC.setParam(el.dataset.param, parseFloat(e.target.value));
            });
        });
    }

    updateControl(paramId, value) {
        const el = this.content.querySelector(`[data-param="${paramId}"]`);
        if (el) el.value = value;
    }
}

window.ModuleJP = ModuleJP;
window.ModuleKorg = ModuleKorg;
