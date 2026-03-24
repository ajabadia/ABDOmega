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
        // Properties initialized
    }

    applyMetadata() {
        if (!window.omegaMetadata) return;
        
        this.paramMap.forEach(paramId => {
            const meta = window.omegaMetadata[paramId];
            if (!meta) return;

            const els = this.el.querySelectorAll(`[data-param="${paramId}"]`);
            els.forEach(el => {
                if (el.tagName === 'INPUT') {
                    // Force normalized 0..1 range for UI if it's a float, 
                    // or use discrete steps if it's a choice/bool.
                    if (meta.unit === "Choice" || meta.unit === "Bool" || meta.unit === "Mode") {
                        el.min = meta.min;
                        el.max = meta.max;
                        el.step = 1;
                    } else {
                        el.min = 0;
                        el.max = 1;
                        el.step = 0.001;
                    }
                    
                    // Update label/tooltip if they exist
                    const container = el.closest('.control-group');
                    if (container) {
                        const label = container.querySelector('label');
                        if (label) label.title = `${meta.name}: ${meta.min}-${meta.max} ${meta.unit}`;
                    }
                }
            });
        });
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
            "LAYERAMAINSAWON", "LAYERAMAINPULSEON", "LAYERASUBOSELEVEL", 
            "LAYERANOISELEVEL", "LAYERAPWMMODE", "LAYERAPWMAMOUNT"
        ]);
        this.render();
    }

    render() {
        this.content.innerHTML = `
            <div class="panel juno-panel">
                <div class="param-row">
                    <div class="control-group">
                        <label>SAW</label>
                        <button class="sq juno-red" data-param="LAYERAMAINSAWON"></button>
                    </div>
                    <div class="control-group">
                        <label>PULSE</label>
                        <button class="sq juno-red" data-param="LAYERAMAINPULSEON"></button>
                    </div>
                </div>
                <div class="param-row">
                    <div class="control-group">
                        <label>SUB</label>
                        <input type="range" class="v-slider" data-param="LAYERASUBOSELEVEL">
                    </div>
                    <div class="control-group">
                        <label>NOISE</label>
                        <input type="range" class="v-slider" data-param="LAYERANOISELEVEL">
                    </div>
                </div>
                <div class="param-row">
                    <div class="control-group">
                        <label>PWM MODE</label>
                        <button class="sq juno-orange" data-param="LAYERAPWMMODE"></button>
                    </div>
                    <div class="control-group">
                        <label>PWM AMT</label>
                        <input type="range" class="v-slider" data-param="LAYERAPWMAMOUNT">
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
            "LAYERAMAINCUTOFF", "LAYERAMAINRESONANCE", "LAYERAMAINHPF",
            "LAYERAVCFENVDEPTH", "LAYERAVCFMODDEPTH", "LAYERAVCFKYBD"
        ]);
        this.render();
    }

    render() {
        this.content.innerHTML = `
            <div class="panel juno-panel">
                <div class="param-row">
                    <div class="control-group">
                        <label>CUTOFF</label>
                        <input type="range" class="v-slider large" data-param="LAYERAMAINCUTOFF" min="0" max="1" step="0.001">
                    </div>
                    <div class="control-group">
                        <label>RES</label>
                        <input type="range" class="v-slider large" data-param="LAYERAMAINRESONANCE">
                    </div>
                </div>
                <div class="param-row">
                    <div class="control-group">
                        <label>ENV</label>
                        <input type="range" class="v-slider" data-param="LAYERAVCFENVDEPTH">
                    </div>
                    <div class="control-group">
                        <label>LFO</label>
                        <input type="range" class="v-slider" data-param="LAYERAVCFMODDEPTH">
                    </div>
                </div>
                <div class="param-row">
                    <div class="control-group">
                        <label>HPF</label>
                        <input type="range" class="v-slider" data-param="LAYERAMAINHPF" min="0" max="1" step="0.333">
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
