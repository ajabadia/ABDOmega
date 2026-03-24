/**
 * Advanced Modules for OMEGA (JP & Korg Styles)
 */

class ModuleJP extends ModuleJunoBase {
    constructor(el, content) {
        super("JP Filter", el, content, [
            "LAYERAMAINJPDETUNE", "LAYERAMAINJPFILTERMODE"
        ]);
        this.render();
    }

    render() {
        this.content.innerHTML = `
            <div class="panel jp-panel">
                <div class="control-group">
                    <label>JP DETUNE</label>
                    <div class="knob-placeholder" data-param="LAYERAMAINJPDETUNE"></div>
                </div>
                <div class="control-group">
                    <label>MODE</label>
                    <select class="jp-select" data-param="LAYERAMAINJPFILTERMODE">
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
            "LAYERAKORGHPFDCUTOFF", "LAYERAKORGHPFRESONANCE", "LAYERAKORGGRIT"
        ]);
        this.render();
    }

    render() {
        this.content.innerHTML = `
            <div class="panel korg-panel">
                <div class="control-group">
                    <label>HP CUTOFF</label>
                    <input type="range" class="v-slider" data-param="LAYERAKORGHPFDCUTOFF">
                </div>
                <div class="control-group">
                    <label>HP RES</label>
                    <input type="range" class="v-slider" data-param="LAYERAKORGHPFRESONANCE">
                </div>
                <div class="control-group">
                    <label>GRIT</label>
                    <input type="range" class="v-slider" data-param="LAYERAKORGGRIT" min="1" max="10" step="0.1">
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
