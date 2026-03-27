/**
 * Standard OMEGA Modules (ADSR, VCA)
 */

class ModuleADSR extends ModuleJunoBase {
    constructor(el, content) {
        super("ADSR 1", el, content, [
            "LAYERAMAINATTACK", "LAYERAMAINDECAY", "LAYERAMAINSUSTAIN", "LAYERAMAINRELEASE"
        ]);
        this.render();
    }

    render() {
        this.content.innerHTML = `
            <div class="panel adsr-panel vertical">
                <div class="param-column">
                    ${this.createKnob("A", "LAYERAMAINATTACK")}
                    ${this.createKnob("D", "LAYERAMAINDECAY")}
                    ${this.createKnob("S", "LAYERAMAINSUSTAIN")}
                    ${this.createKnob("R", "LAYERAMAINRELEASE")}
                </div>
            </div>
        `;
        this.bindControls();
    }

    createKnob(label, paramId) {
        return `
            <div class="knob-control" data-param="${paramId}">
                <label>${label}</label>
                <div class="knob">
                    <div class="knob-marker white"></div>
                </div>
                <input type="hidden" data-param="${paramId}" value="0">
            </div>
        `;
    }

    bindControls() {
        this.content.querySelectorAll('.knob-control').forEach(ctrl => {
            const paramId = ctrl.dataset.param;
            const knob = ctrl.querySelector('.knob');
            const input = ctrl.querySelector('input');

            let isDragging = false;
            let startY = 0;
            let startVal = 0;

            knob.addEventListener('mousedown', (e) => {
                isDragging = true;
                startY = e.clientY;
                startVal = parseFloat(input.value);
                document.body.style.cursor = 'ns-resize';
            });

            window.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const delta = (startY - e.clientY) / 200; // Sensitivity
                
                const meta = window.omegaMetadata[paramId];
                if (!meta) return;

                let newVal = startVal + delta * (meta.max - meta.min);
                newVal = Math.max(meta.min, Math.min(meta.max, newVal));
                
                input.value = newVal;
                this.updateKnobVisual(ctrl, newVal);
                window.omegaRPC.setParam(paramId, newVal);
            });

            window.addEventListener('mouseup', () => {
                isDragging = false;
                document.body.style.cursor = 'default';
            });
        });
    }

    updateKnobVisual(ctrl, value) {
        const paramId = ctrl.dataset.param;
        const meta = window.omegaMetadata[paramId];
        if (!meta) return;

        // Normalized 0..1 for angle calculation
        const norm = (value - meta.min) / (meta.max - meta.min);
        const angle = -135 + (norm * 270);
        const marker = ctrl.querySelector('.knob-marker');
        if (marker) marker.style.transform = `translateX(-50%) rotate(${angle}deg)`;
    }

    updateControl(paramId, value) {
        const ctrl = this.content.querySelector(`.knob-control[data-param="${paramId}"]`);
        if (ctrl) {
            ctrl.querySelector('input').value = value;
            this.updateKnobVisual(ctrl, value);
        }
    }
}

class ModuleVCA extends ModuleJunoBase {
    constructor(el, content) {
        super("VCA 1", el, content, [
            "LAYERAMAINVCAGAIN", "LAYERAVCAMODE"
        ]);
        this.render();
    }

    render() {
        this.content.innerHTML = `
            <div class="panel vca-panel vertical">
                <div class="param-column">
                    <div class="control-group">
                        <label>GAIN</label>
                        <input type="range" class="v-slider large" data-param="LAYERAMAINVCAGAIN" style="height: 150px">
                    </div>
                    <div class="control-group">
                        <label>MODE</label>
                        <button class="sq juno-red" data-param="LAYERAVCAMODE">GATE</button>
                    </div>
                </div>
            </div>
        `;
        this.bindControls();
    }

    bindControls() {
        this.content.querySelectorAll('[data-param]').forEach(el => {
            if (el.tagName === 'INPUT') {
                el.addEventListener('input', (e) => {
                    window.omegaRPC.setParam(el.dataset.param, parseFloat(e.target.value));
                });
            } else if (el.tagName === 'BUTTON') {
                el.addEventListener('click', () => {
                    const active = el.classList.contains('active');
                    const next = active ? 0 : 1;
                    el.classList.toggle('active', !active);
                    window.omegaRPC.setParam(el.dataset.param, next);
                });
            }
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

window.ModuleADSR = ModuleADSR;
window.ModuleVCA = ModuleVCA;
