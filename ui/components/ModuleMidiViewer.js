/**
 * ModuleMidiViewer.js
 * Visualizador de eventos MIDI en tiempo real.
 * Diseño coherente con ModuleOscilloscope.
 */
class ModuleMidiViewer {
    constructor(el, content) {
        this.el = el;
        this.content = content;
        this.active = true;
        this.events = [];
        this.maxEvents = 8;
        
        this.init();
    }

    init() {
        this.content.className += ' midi-log-wrapper';
        this.content.innerHTML = `
            <canvas width="180" height="100"></canvas>
            <div class="osc-power-controls">
                <button class="osc-power-btn active" title="Toggle Power">⏻</button>
            </div>
            <div class="osc-footer">
                <span class="osc-index">V-INPUT #01</span>
            </div>
        `;
        
        this.canvas = this.content.querySelector('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.powerBtn = this.content.querySelector('.osc-power-btn');
        
        this.powerBtn.onclick = () => this.togglePower();
        this.draw();
    }

    togglePower() {
        this.active = !this.active;
        this.powerBtn.classList.toggle('active', this.active);
        if (!this.active) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.draw();
        }
    }

    update(telemetryData) {
        if (!this.active || !telemetryData) return;
        
        // [Modular Evolution]: MIDI is now signal 64 in the batch
        const midi = telemetryData[64] || telemetryData["64"];
        if (!midi) return;
 
        this.events = midi.slice(0, this.maxEvents);
        this.draw();
    }

    draw() {
        const { ctx, canvas, events } = this;
        const w = canvas.width;
        const h = canvas.height;
        
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#101010';
        ctx.fillRect(0, 0, w, h);
        
        if (!this.active) {
             ctx.fillStyle = '#333';
             ctx.font = '10px Arial';
             ctx.textAlign = 'center';
             ctx.fillText('POWER OFF', w/2, h/2);
             return;
        }

        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        const lineHeight = 12;
        events.forEach((ev, i) => {
            const y = i * lineHeight + 5;
            if (y > h - 10) return;

            const ch = ev.ch !== undefined ? ev.ch : ev.CH;
            const d1 = ev.d1 !== undefined ? ev.d1 : ev.D1;
            const d2 = ev.d2 !== undefined ? ev.d2 : ev.D2;
            const typeVal = ev.type !== undefined ? ev.type : ev.TYPE;

            let typeStr = "UNK";
            const type = typeVal & 0xF0;
            if (type === 0x90) typeStr = "NOTE ON ";
            else if (type === 0x80) typeStr = "NOTE OFF";
            else if (type === 0xB0) typeStr = "CC      ";
            
            // Color según tipo de evento
            if (type === 0x90) ctx.fillStyle = '#00f0ff'; // Cyan
            else if (type === 0x80) ctx.fillStyle = '#ff8800'; // Orange
            else ctx.fillStyle = '#888';
            
            ctx.fillText(`${typeStr} CH:${ch} D1:${d1} D2:${d2}`, 5, y);
        });
        
        if (events.length === 0) {
            ctx.fillStyle = '#444';
            ctx.fillText('WAITING MIDI...', 5, 5);
        }
    }
}

window.ModuleMidiViewer = ModuleMidiViewer;
