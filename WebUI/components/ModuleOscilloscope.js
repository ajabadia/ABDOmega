/**
 * ModuleOscilloscope.js
 * Módulo de telemetría genérico y eficiente para el rack superior.
 */
class ModuleOscilloscope {
    constructor(id, container, signalIndex, label = "Monitor") {
        this.id = id;
        this.container = container;
        this.signalIndex = signalIndex;
        this.label = label;
        this.active = true; // Power state
        this.history = new Array(128).fill(0);
        
        this.init();
    }

    init() {
        this.el = document.createElement('div');
        this.el.className = 'module oscilloscope-module';
        this.el.innerHTML = `
            <div class="module-header">
                <span>${this.label}</span>
                <button class="osc-power-btn active" title="Toggle Power">⏻</button>
            </div>
            <div class="module-content osc-canvas-wrapper">
                <canvas width="180" height="100"></canvas>
            </div>
            <div class="osc-footer">
                <span class="osc-index">SIGNAL TAP: ${this.signalIndex}</span>
            </div>
        `;
        
        this.canvas = this.el.querySelector('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.powerBtn = this.el.querySelector('.osc-power-btn');
        
        this.powerBtn.onclick = () => this.togglePower();
        
        this.container.appendChild(this.el);
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
        if (!this.active || !data || !data.history) return;
        this.history = data.history;
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
