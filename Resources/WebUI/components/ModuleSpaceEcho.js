/**
 * Space Echo (RE-201) Style Module for OMEGA
 */

class ModuleSpaceEcho extends ModuleJunoBase {
    constructor(el, content) {
        super("Space Echo", el, content, [
            "layer.a.fx.space.enable", "layer.a.fx.space.speed", "layer.a.fx.space.intensity",
            "layer.a.fx.space.echo.vol", "layer.a.fx.space.rev.vol", "layer.a.fx.space.mode",
            "layer.a.fx.space.wow", "layer.a.fx.space.drive"
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
                        <input type="range" class="v-slider" data-param="layer.a.fx.space.speed">
                    </div>
                     <div class="control-group">
                        <label>INTENS</label>
                        <input type="range" class="v-slider" data-param="layer.a.fx.space.intensity">
                    </div>
                </div>
                <div class="param-row">
                    <div class="control-group">
                        <label>ECHO VOL</label>
                        <input type="range" class="v-slider" data-param="layer.a.fx.space.echo.vol">
                    </div>
                    <div class="control-group">
                        <label>REVERB</label>
                        <input type="range" class="v-slider" data-param="layer.a.fx.space.rev.vol">
                    </div>
                </div>
                <div class="param-row">
                    <div class="control-group">
                        <label>MODE</label>
                        <input type="range" class="v-slider" data-param="layer.a.fx.space.mode" min="1" max="12" step="1">
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
        if (paramId === 'layer.a.fx.space.speed') {
            const reels = this.content.querySelectorAll('.reel');
            reels.forEach(r => r.style.animationDuration = (2.0 - value) + 's');
        }
    }
}

window.ModuleSpaceEcho = ModuleSpaceEcho;
