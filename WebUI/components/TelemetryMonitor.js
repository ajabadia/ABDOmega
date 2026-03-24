/**
 * TelemetryMonitor.js
 * Visualizador de señales de modulación en tiempo real usando Canvas.
 */
class TelemetryMonitor {
    constructor(containerId, signalIndex, label = "LFO 1") {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.signalIndex = signalIndex;
        this.label = label;
        this.canvas = document.createElement('canvas');
        this.canvas.width = 200;
        this.canvas.height = 80;
        this.canvas.className = 'telemetry-canvas';
        
        this.ctx = this.canvas.getContext('2d');
        
        const wrapper = document.createElement('div');
        wrapper.className = 'telemetry-wrapper';
        wrapper.innerHTML = `<div class="telemetry-label">${label}</div>`;
        wrapper.appendChild(this.canvas);
        
        this.container.appendChild(wrapper);
        this.history = new Array(128).fill(0);
    }

    update(data) {
        if (!data || !data.history) return;
        this.history = data.history;
        this.draw();
    }

    draw() {
        const { ctx, canvas, history } = this;
        const w = canvas.width;
        const h = canvas.height;
        
        ctx.clearRect(0, 0, w, h);
        
        // Fondo
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, w, h);
        
        // Rejilla
        ctx.strokeStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(0, h/2); ctx.lineTo(w, h/2);
        ctx.stroke();

        // Señal
        ctx.strokeStyle = '#00f0ff'; // Cyan premium
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const step = w / 128;
        for (let i = 0; i < 128; i++) {
            // Normalizar señal (-1 a 1 -> h a 0)
            const val = history[i];
            const y = (h / 2) - (val * (h / 2.2));
            if (i === 0) ctx.moveTo(0, y);
            else ctx.lineTo(i * step, y);
        }
        ctx.stroke();
        
        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00f0ff';
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

window.TelemetryMonitor = TelemetryMonitor;
