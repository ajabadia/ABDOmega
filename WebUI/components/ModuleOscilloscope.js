/**
 * ModuleOscilloscope.js
 * Módulo de telemetría genérico y eficiente para el rack superior.
 */
class ModuleOscilloscope {
    constructor(el, content) {
        this.el = el;
        this.content = content;
        this.signalIndex = parseInt(el.dataset.signalIndex) || 0;
        this.active = true;
        this.history = new Array(128).fill(0);
        
        this.init();
    }

    init() {
        this.content.className += ' osc-canvas-wrapper';
        this.content.innerHTML = `
            <canvas width="180" height="100"></canvas>
            <div class="osc-power-controls">
                <button class="osc-power-btn active" title="Toggle Power">⏻</button>
            </div>
            <div class="osc-footer">
                <span class="osc-index">SIGNAL TAP: ${this.signalIndex}</span>
            </div>
        `;
        
        this.canvas = this.content.querySelector('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.powerBtn = this.content.querySelector('.osc-power-btn');
        
        this.powerBtn.onclick = () => this.togglePower();
        this.drawEmpty();
    }

    togglePower() {
        this.active = !this.active;
        this.powerBtn.classList.toggle('active', this.active);
        if (!this.active) {
            this.drawEmpty();
        }
    }

    update(data) {
        if (!this.active || !data) return;
        const history = data.history || data.HISTORY;
        if (!history) return;

        this.history = history;
        this.draw();
    }

    drawEmpty() {
        const { ctx, canvas } = this;
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#222';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height/2); ctx.lineTo(canvas.width, canvas.height/2);
        ctx.stroke();
    }

    draw() {
        const { ctx, canvas, history } = this;
        const w = canvas.width;
        const h = canvas.height;
        
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#080808';
        ctx.fillRect(0, 0, w, h);
        
        // Grid
        ctx.strokeStyle = '#222';
        ctx.beginPath();
        ctx.moveTo(0, h/2); ctx.lineTo(w, h/2);
        ctx.stroke();

        // Signal
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00f0ff';
        ctx.beginPath();
        
        const step = w / 128;
        for (let i = 0; i < 128; i++) {
            const val = history[i];
            const y = (h / 2) - (val * (h / 2.2));
            if (i === 0) ctx.moveTo(0, y);
            else ctx.lineTo(i * step, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

window.ModuleOscilloscope = ModuleOscilloscope;
