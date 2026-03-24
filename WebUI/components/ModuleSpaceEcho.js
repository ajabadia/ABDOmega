/**
 * Space Echo (RE-201) Style Module for OMEGA
 */

class ModuleSpaceEcho extends ModuleJunoBase {
    constructor(el, content) {
        super("Space Echo", el, content, [
            "LAYERAFXSPACEENABLE", "LAYERAFXSPACESPEED", "LAYERAFXSPACEINTENSITY",
            "LAYERAFXSPACEECHOVOL", "LAYERAFXSPACEREVERBVOL", "LAYERAFXSPACEMODE",
            "LAYERAFXSPACEWOW", "LAYERAFXSPACEDRIVE"
        ]);
        this.render();
    }

    render() {
        this.content.innerHTML = `
            <div class="panel space-echo-panel">
                <div class="echo-tape-area">
                    <div class="reel left"></div>
                    <div class="reel right"></div>
                </div>
                <div class="param-row">
                    <div class="control-group">
                        <label>RATE</label>
                        <input type="range" class="v-slider" data-param="LAYERAFXSPACESPEED">
                    </div>
                     <div class="control-group">
                        <label>INTENS</label>
                        <input type="range" class="v-slider" data-param="LAYERAFXSPACEINTENSITY">
                    </div>
                </div>
                <div class="param-row">
                    <div class="control-group">
                        <label>ECHO VOL</label>
                        <input type="range" class="v-slider" data-param="LAYERAFXSPACEECHOVOL">
                    </div>
                    <div class="control-group">
                        <label>REVERB</label>
                        <input type="range" class="v-slider" data-param="LAYERAFXSPACEREVERBVOL">
                    </div>
                </div>
                <div class="param-row">
                    <div class="control-group">
                        <label>MODE</label>
                        <input type="range" class="v-slider" data-param="LAYERAFXSPACEMODE" min="1" max="12" step="1">
                    </div>
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
        
        // Visual animation for reels if speed changes
        if (paramId === 'LAYERAFXSPACESPEED') {
            const reels = this.content.querySelectorAll('.reel');
            reels.forEach(r => r.style.animationDuration = (2.0 - value) + 's');
        }
    }
}

window.ModuleSpaceEcho = ModuleSpaceEcho;
