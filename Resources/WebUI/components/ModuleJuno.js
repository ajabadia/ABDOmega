/**
 * Juno-themed Eurorack Modules for OMEGA
 */

class ModuleJunoBase {
    constructor(id, el, content, paramMap) {
        this.id = id;
        this.el = el;
        this.content = content;
        this.paramMap = paramMap;
        this.controls = new Map();
        
        this.init();
    }

    init() {
        // Shared init logic for sliders/buttons
    }

    onStateUpdate(state) {
        if (!state.params) return;
        for (const [paramId, value] of Object.entries(state.params)) {
            if (this.paramMap.includes(paramId)) {
                this.updateControl(paramId, value);
            }
        }
    }

    updateControl(paramId, value) {
        const ctrl = this.controls.get(paramId);
        if (ctrl) ctrl.setValue(value, false);
    }
}

class ModuleJunoDCO extends ModuleJunoBase {
    constructor(el, content) {
        super("Juno DCO", el, content, [
            "layer.a.osc.saw.on", "layer.a.osc.pulse.on", "layer.a.osc.sub.level", 
            "layer.a.osc.noise.level", "layer.a.osc.pwm.mode", "layer.a.osc.pwm.amount"
        ]);
        this.render();
    }

    render() {
        this.content.innerHTML = `
            <div class="panel juno-panel">
                <div class="param-row">
                    <div class="control-group">
                        <label>SAW</label>
                        <button class="sq juno-red" data-param="layer.a.osc.saw.on"></button>
                    </div>
                    <div class="control-group">
                        <label>PULSE</label>
                        <button class="sq juno-red" data-param="layer.a.osc.pulse.on"></button>
                    </div>
                </div>
                <div class="param-row">
                    <div class="control-group">
                        <label>SUB</label>
                        <input type="range" class="v-slider" data-param="layer.a.osc.sub.level">
                    </div>
                    <div class="control-group">
                        <label>NOISE</label>
                        <input type="range" class="v-slider" data-param="layer.a.osc.noise.level">
                    </div>
                </div>
                <div class="param-row">
                    <div class="control-group">
                        <label>PWM MODE</label>
                        <button class="sq juno-orange" data-param="layer.a.osc.pwm.mode"></button>
                    </div>
                    <div class="control-group">
                        <label>PWM AMT</label>
                        <input type="range" class="v-slider" data-param="layer.a.osc.pwm.amount">
                    </div>
                </div>
            </div>
        `;
        this.bindControls();
    }

    bindControls() {
        this.content.querySelectorAll('[data-param]').forEach(el => {
            el.addEventListener('input', (e) => {
                window.omegaRPC.setParam(el.dataset.param, parseFloat(e.target.value));
            });
            el.addEventListener('click', (e) => {
                if (el.tagName === 'BUTTON') {
                    const active = el.classList.contains('active');
                    const next = active ? 0 : 1;
                    el.classList.toggle('active', !active);
                    window.omegaRPC.setParam(el.dataset.param, next);
                }
            });
        });
    }

    updateControl(paramId, value) {
        const el = this.content.querySelector(`[data-param="${paramId}"]`);
        if (el) {
            if (el.tagName === 'INPUT') el.value = value;
            else if (el.tagName === 'BUTTON') el.classList.toggle('active', value > 0.5);
        }
    }
}

class ModuleJunoVCF extends ModuleJunoBase {
    constructor(el, content) {
        super("Juno VCF", el, content, [
            "layer.a.cutoff", "layer.a.resonance", "layer.a.hpf.pos",
            "layer.a.vcf.env.depth", "layer.a.vcf.lfo.depth", "layer.a.vcf.keytrack"
        ]);
        this.render();
    }

    render() {
        this.content.innerHTML = `
            <div class="panel juno-panel">
                <div class="param-row">
                    <div class="control-group">
                        <label>CUTOFF</label>
                        <input type="range" class="v-slider large" data-param="layer.a.cutoff" min="0" max="1" step="0.001">
                    </div>
                    <div class="control-group">
                        <label>RES</label>
                        <input type="range" class="v-slider large" data-param="layer.a.resonance">
                    </div>
                </div>
                <div class="param-row">
                    <div class="control-group">
                        <label>ENV</label>
                        <input type="range" class="v-slider" data-param="layer.a.vcf.env.depth">
                    </div>
                    <div class="control-group">
                        <label>LFO</label>
                        <input type="range" class="v-slider" data-param="layer.a.vcf.lfo.depth">
                    </div>
                </div>
                <div class="param-row">
                    <div class="control-group">
                        <label>HPF</label>
                        <input type="range" class="v-slider" data-param="layer.a.hpf.pos" min="0" max="1" step="0.333">
                    </div>
                </div>
            </div>
        `;
        this.bindControls();
    }

    bindControls() {
        this.content.querySelectorAll('[data-param]').forEach(el => {
            el.addEventListener('input', (e) => {
                window.omegaRPC.setParam(el.dataset.param, parseFloat(e.target.value));
            });
        });
    }

    updateControl(paramId, value) {
        const el = this.content.querySelector(`[data-param="${paramId}"]`);
        if (el && el.tagName === 'INPUT') el.value = value;
    }
}

window.ModuleJunoDCO = ModuleJunoDCO;
window.ModuleJunoVCF = ModuleJunoVCF;
