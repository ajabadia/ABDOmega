/**
 * Korg-themed Modules for OMEGA (Prophecy/MS20 style)
 */
class ModuleKorgOsc extends ModuleJunoBase {
    constructor(el, content) {
        super("Korg Prophecy", el, content, [
            "LAYERAKORGGRIT", "LAYERAKORGHPFCUTOFF", "LAYERAKORGHPFRESONANCE"
        ]);
        this.componentId = el.dataset.componentId || "";
        this.render();
    }

    render() {
        const isMs20 = this.componentId.includes("003");
        const panelClass = isMs20 ? "panel korg-panel vertical ms20-panel" : "panel korg-panel vertical silver-metallic";
        const knobVariant = isMs20 ? "ms20" : "silver";
        const labelClass = isMs20 ? "light-text" : "dark-text";

        this.content.innerHTML = `
            <div class="${panelClass}">
                <div class="param-column">
                    ${this.createKnob("GRIT", "LAYERAKORGGRIT", knobVariant)}
                    ${this.createKnob("HPF CUT", "LAYERAKORGHPFCUTOFF", knobVariant)}
                    ${this.createKnob("HPF RES", "LAYERAKORGHPFRESONANCE", knobVariant)}
                </div>
                <div class="osc-footer ${labelClass}">
                    <span>DSP: PROPHECY-V1</span>
                </div>
            </div>
        `;
        this.bindControls();
    }

    createKnob(label, paramId, variant = "") {
        const markerClass = variant === "ms20" ? "knob-marker white" : "knob-marker";
        return `
            <div class="knob-control ${variant}" data-param="${paramId}">
                <label class="${variant}">${label}</label>
                <div class="knob ${variant}">
                    <div class="${markerClass}"></div>
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
                const delta = (startY - e.clientY) / 200;
                
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

class ModuleKorgFilter extends ModuleKorgOsc {
    render() {
        const isMs20 = this.componentId.includes("003");
        const panelClass = isMs20 ? "panel korg-panel vertical ms20-panel" : "panel korg-panel vertical silver-metallic";
        const knobVariant = isMs20 ? "ms20" : "silver";
        const labelClass = isMs20 ? "light-text" : "dark-text";

        this.content.innerHTML = `
            <div class="${panelClass}">
                <div class="param-column">
                    ${this.createKnob("CUTOFF", "LAYERAMAINCUTOFF", knobVariant)}
                    ${this.createKnob("RESONANCE", "LAYERAMAINRESONANCE", knobVariant)}
                </div>
                <div class="osc-footer ${labelClass}">
                    <span>DSP: KORG35</span>
                </div>
            </div>
        `;
        this.bindControls();
    }
}

window.ModuleKorgOsc = ModuleKorgOsc;
window.ModuleKorgFilter = ModuleKorgFilter;
