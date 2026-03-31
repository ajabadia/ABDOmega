/**
 * ModuleOscilloscope.js - OMEGA Oscilloscope 2.0 (The Musical Magnifying Glass)
 * Advanced diagnostic visualizer with dual-trace, XY mode, and skeuomorphic CRT aesthetics.
 */
class ModuleOscilloscope {
    constructor(el, content) {
        this.el = el;
        this.content = content;
        
        // Internal State (Defaults)
        this.state = {
            active: true,
            mode: 'DUAL', // SINGLE, DUAL, XY
            context: 'AUDIO', // AUDIO (High-Speed), MOD (Block-Rate)
            sourceA: 47, // Default: Master Out
            sourceB: 35, // Default: VCF Out
            timebase: 1.0,
            scaleA: 1.0,
            scaleB: 1.0,
            trigger: 0.1,
            frozen: false,
            trail: true,
        };

        this.samplerate = 44100;
        this.tempo = 120.0;

        this.sources = { audio: [], modulation: [] };
        this.historyA = new Array(128).fill(0);
        this.historyB = new Array(128).fill(0);
        
        this.init();
    }

    resolveColor(color) {
        if (color.startsWith('var(')) {
            const varName = color.match(/var\(([^)]+)\)/)[1];
            return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#00f2ff';
        }
        return color;
    }

    async init() {
        this.content.className += ' oscilloscope-container';
        
        // 1. Fetch Sources & State
        try {
            const catalog = await window.omegaRPC.getTelemetrySources();
            if (catalog) {
                // New Format: { audio: [{index, name}, ...], modulation: [...], mapping: {...} }
                this.sources.audio = (catalog.audio || []).map(s => {
                    return { label: s.name || s.NAME || "Unknown", index: s.index !== undefined ? s.index : s.INDEX };
                });
                this.sources.modulation = (catalog.modulation || []).map(s => {
                    return { label: s.name || s.NAME || "Unknown", index: s.index !== undefined ? s.index : s.INDEX };
                });
            }
            
            const savedState = await window.omegaRPC.getScopeState();
            if (savedState) {
                this.state = { ...this.state, ...savedState };
            }

            const sr = await window.omegaRPC.getSampleRate();
            if (sr) this.samplerate = sr;

            const tempo = await window.omegaRPC.getTempo();
            if (tempo) this.tempo = tempo;

            // [Modular Choice]: Apply thematic defaults if dataset says so
            if (this.el.dataset.theme === 'MOD') {
                this.state.context = 'MOD';
                this.state.sourceA = this.sources.modulation[0]?.index || 0;
                this.state.sourceB = this.sources.modulation[1]?.index || 1;
            } else if (this.el.dataset.theme === 'AUDIO') {
                this.state.context = 'AUDIO';
                this.state.sourceA = 32; // DCO Sum
                this.state.sourceB = 47; // Master Out
            }
        } catch (e) {
            console.warn("[Scope] Failed to fetch initial data:", e);
        }

        this.renderUI();
        this.setupListeners();
        this.drawEmpty();
    }

    renderUI() {
        const { state } = this;
        this.content.innerHTML = `
            <div class="osc-viewport">
                <canvas width="200" height="120"></canvas>
                <div class="osc-grid-overlay"></div>
                <button class="osc-expand-btn" title="Expand View">↗</button>
                <div class="osc-label-overlay">
                    <span class="label-a" style="color:var(--neon-cyan)">[${state.context}] CH A: ${this.getSourceLabel(state.sourceA)}</span>
                    <span class="label-b" style="color:var(--neon-amber)">CH B: ${this.getSourceLabel(state.sourceB)}</span>
                </div>
            </div>
            
            <div class="osc-controls">
                <div class="osc-row">
                    <div class="osc-group">
                        <label>CONTEXT</label>
                        <select class="osc-context-select small-select">
                            <option value="AUDIO" ${state.context === 'AUDIO' ? 'selected' : ''}>AUDIO</option>
                            <option value="MOD" ${state.context === 'MOD' ? 'selected' : ''}>MOD</option>
                        </select>
                    </div>
                    <div class="osc-group">
                        <label>MODE</label>
                        <select class="osc-mode-select small-select">
                            <option value="SINGLE" ${state.mode === 'SINGLE' ? 'selected' : ''}>SINGLE</option>
                            <option value="DUAL" ${state.mode === 'DUAL' ? 'selected' : ''}>DUAL</option>
                            <option value="XY" ${state.mode === 'XY' ? 'selected' : ''}>X-Y</option>
                        </select>
                    </div>
                </div>

                <div class="osc-row">
                    <div class="osc-group">
                        <label>SRC A</label>
                        <select class="osc-src-a small-select">${this.renderSourceOptions('sourceA')}</select>
                    </div>
                    <div class="osc-group">
                        <label>SRC B</label>
                        <select class="osc-src-b small-select">${this.renderSourceOptions('sourceB')}</select>
                    </div>
                </div>

                <div class="osc-row">
                    <div class="osc-group" style="flex:1">
                        <label>TIME ${state.sync ? '(CYCLES)' : '(MS)'}</label>
                        <input type="range" class="osc-timebase-slider" min="0.25" max="8.0" step="0.25" value="${state.timebase}" style="width:100%">
                    </div>
                </div>

                <div class="osc-row footer">
                    <button class="osc-reset-btn" title="Reset Scope">⟲</button>
                    <button class="osc-sync-btn ${state.sync ? 'active' : ''}" title="${state.context === 'AUDIO' ? 'Pitch Sync' : 'Tempo Sync'}">SYNC</button>
                    <button class="osc-freeze-btn ${state.frozen ? 'active' : ''}" title="Freeze">HOLD</button>
                    <div class="osc-power-led ${state.active ? 'on' : ''}"></div>
                    <button class="osc-power-btn" title="Toggle Power">POWER</button>
                </div>
            </div>
        `;

        this.canvas = this.content.querySelector('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    renderSourceOptions(key) {
        const currentId = this.state[key];
        let html = '';
        
        if (this.sources.audio.length > 0) {
            html += '<optgroup label="Audio / High-Res">';
            html += this.sources.audio.map(s => `
                <option value="${s.index}" ${s.index == currentId ? 'selected' : ''}>${s.label}</option>
            `).join('');
            html += '</optgroup>';
        }
        
        if (this.sources.modulation.length > 0) {
            html += '<optgroup label="Control / Modulation">';
            html += this.sources.modulation.map(s => `
                <option value="${s.index}" ${s.index == currentId ? 'selected' : ''}>${s.label}</option>
            `).join('');
            html += '</optgroup>';
        }
        
        return html;
    }

    getSourceLabel(index) {
        const all = [...this.sources.audio, ...this.sources.modulation];
        const found = all.find(s => s.index == index);
        return found ? found.label : `IDX ${index}`;
    }

    setupListeners() {
        const updateState = (key, val) => {
            this.state[key] = val;
            window.omegaRPC.setScopeState(this.state);
            if (key === 'context') this.renderUI(); // Re-render selectors
        };

        this.content.querySelector('.osc-context-select').onchange = (e) => updateState('context', e.target.value);
        this.content.querySelector('.osc-mode-select').onchange = (e) => updateState('mode', e.target.value);
        this.content.querySelector('.osc-src-a').onchange = (e) => updateState('sourceA', parseInt(e.target.value));
        this.content.querySelector('.osc-src-b').onchange = (e) => updateState('sourceB', parseInt(e.target.value));
        
        this.content.querySelector('.osc-power-btn').onclick = () => {
            this.state.active = !this.state.active;
            this.content.querySelector('.osc-power-led').classList.toggle('on', this.state.active);
            updateState('active', this.state.active);
        };

        this.content.querySelector('.osc-timebase-slider').oninput = (e) => {
            let val = parseFloat(e.target.value);
            if (this.state.sync) {
                // Snap to sweet points: 0.25, 0.5, 1, 2, 4, 8
                const points = [0.25, 0.5, 1, 2, 4, 8];
                val = points.reduce((prev, curr) => Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev);
                e.target.value = val;
            }
            updateState('timebase', val);
        };

        this.content.querySelector('.osc-freeze-btn').onclick = (e) => {
            this.state.frozen = !this.state.frozen;
            e.target.classList.toggle('active', this.state.frozen);
        };

        this.content.querySelector('.osc-sync-btn').onclick = (e) => {
            this.state.sync = !this.state.sync;
            e.target.classList.toggle('active', this.state.sync);
            updateState('sync', this.state.sync);
            this.renderUI(); // Update tooltip/labels
            this.setupListeners();
        };

        this.content.querySelector('.osc-reset-btn').onclick = () => {
            this.state = {
                ...this.state,
                mode: 'DUAL',
                context: 'AUDIO',
                sourceA: 47,
                sourceB: 35,
                timebase: 1.0,
                sync: true,
                frozen: false
            };
            window.omegaRPC.setScopeState(this.state);
            this.renderUI();
            this.setupListeners();
        };

        this.content.querySelector('.osc-expand-btn').onclick = () => {
            this.toggleExpand();
        };

        // Keyboard Shortcut: O
        this._boundKeydown = (e) => {
            if (e.key.toLowerCase() === 'o' && !e.repeat) {
                // Only if not typing in an input
                if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                    this.toggleExpand();
                }
            }
        };
        window.addEventListener('keydown', this._boundKeydown);

        this.labCanvas = null;
        this.labOverlay = null;

        // --- Oscilloscope 2.0 Focus API ---
        window.addEventListener('omega:scopeFocus', (e) => {
            const { index } = e.detail;
            console.log(`[Scope] Focus requested on index: ${index}`);
            
            // Auto-detect context based on index ranges (0-31: MOD, 32-63: AUDIO)
            const newContext = index < 32 ? 'MOD' : 'AUDIO';
            
            this.state.context = newContext;
            this.state.sourceA = index;
            
            // Persist and re-render the whole UI to reflect source labels
            window.omegaRPC.setScopeState(this.state);
            this.renderUI();
            this.setupListeners();

            // Visual feedback: Flash the viewport
            const viewport = this.content.querySelector('.osc-viewport');
            if (viewport) {
                viewport.classList.add('focus-flash');
                setTimeout(() => viewport.classList.remove('focus-flash'), 1000);
            }
        });
    }

    update(data) {
        if (!this.state.active || this.state.frozen || !data) return;
        
        // In OMEGA Telemetry, we might receive one or both channels
        if (data[this.state.sourceA]) this.historyA = data[this.state.sourceA].history || data[this.state.sourceA].HISTORY;
        if (data[this.state.sourceB]) this.historyB = data[this.state.sourceB].history || data[this.state.sourceB].HISTORY;
        
        this.draw();
    }

    drawEmpty() {
        const { ctx, canvas } = this;
        ctx.fillStyle = '#050a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw centered flatline
        ctx.strokeStyle = '#1a3333';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height/2); ctx.lineTo(canvas.width, canvas.height/2);
        ctx.stroke();
    }

    draw() {
        const state = this.state;
        const historyA = this.historyA;
        const historyB = this.historyB;

        // Draw Rack Canvas
        const canvas = this.content.querySelector('canvas');
        if (canvas) this.renderToCanvas(canvas, state, historyA, historyB);
        
        // Draw Lab Canvas if open
        if (this.labCanvas) {
            this.renderToCanvas(this.labCanvas, state, historyA, historyB);
        }
    }

    renderToCanvas(canvas, state, historyA, historyB) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const midY = h / 2;

        if (state.trail) {
            ctx.fillStyle = 'rgba(5, 10, 10, 0.4)'; // Trail effect
            ctx.fillRect(0, 0, w, h);
        } else {
            ctx.fillStyle = '#050a0a';
            ctx.fillRect(0, 0, w, h);
        }

        if (state.mode === 'XY') {
            this.drawXY(ctx, w, h, historyA, historyB);
        } else {
            if (state.mode === 'SINGLE' || state.mode === 'DUAL') {
                const colorA = this.resolveColor('var(--neon-cyan)');
                const colorB = this.resolveColor('var(--neon-amber)');
                
                this.drawTrace(ctx, w, h, historyA, colorA, 0);
                if (state.mode === 'DUAL') {
                    this.drawTrace(ctx, w, h, historyB, colorB, 1);
                }
            }
        }
    }

    toggleExpand() {
        if (this.labOverlay) return;

        this.labOverlay = document.createElement('div');
        this.labOverlay.className = 'osc-modal-overlay';
        this.labOverlay.innerHTML = `
            <div class="osc-modal-container skeuo-panel">
                <div class="osc-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <h3 style="margin:0; font-family:'Inter', sans-serif; letter-spacing:2px; color:var(--neon-cyan)">OMEGA LABORATORY SCOPE</h3>
                    <button class="close-modal" style="background:none; border:none; color:#666; cursor:pointer; font-size:20px;">✕</button>
                </div>
                <div class="osc-viewport expanded" style="background:#050a0a; position:relative; overflow:hidden; border:2px solid #222; border-radius:4px; height:450px;">
                    <canvas id="lab-canvas" style="width:100%; height:100%"></canvas>
                    <div class="osc-grid-overlay"></div>
                    <div class="osc-label-overlay" style="position:absolute; bottom:10px; left:10px; pointer-events:none; font-family:monospace; font-size:12px; display:flex; gap:20px;">
                        <span style="color:var(--neon-cyan)">[${this.state.context}] A: ${this.getSourceLabel(this.state.sourceA)}</span>
                        <span style="color:var(--neon-amber)">B: ${this.getSourceLabel(this.state.sourceB)}</span>
                    </div>
                </div>
                <div class="osc-modal-footer" style="margin-top:10px; color:#555; font-size:11px; text-align:center;">
                    Skeuomorphic Diagnostic Engine v2.0 · OMEGA Integration
                </div>
            </div>
        `;

        document.body.appendChild(this.labOverlay);
        
        const canvas = this.labOverlay.querySelector('#lab-canvas');
        
        // Wait for next frame to ensure layout is ready
        requestAnimationFrame(() => {
            const w = canvas.offsetWidth || 800;
            const h = canvas.offsetHeight || 400;
            canvas.width = w;
            canvas.height = h;
            this.labCanvas = canvas;
            this.draw(); // Immediate first draw
        });

        this.labOverlay.querySelector('.close-modal').onclick = () => {
            document.body.removeChild(this.labOverlay);
            this.labOverlay = null;
            this.labCanvas = null;
        };
    }

    drawTrace(ctx, w, h, history, color, offsetIdx) {
        if (!history || history.length === 0) return;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 4;
        ctx.shadowColor = color;
        ctx.beginPath();
        
        // --- Oscilloscope 2.0: Rising Edge Trigger ---
        let startIdx = 0;
        const threshold = 0.01;
        for (let i = 0; i < history.length - 1; i++) {
            if (history[i] < threshold && history[i+1] >= threshold) {
                startIdx = i;
                break;
            }
        }

        const currentFreq = (window.omegaTelemetryCache && window.omegaTelemetryCache[20]) ? (window.omegaTelemetryCache[20].latest || 440) : 440;
        
        let visibleSamples = 64; // Default half-buffer zoom
        if (this.state.sync && this.state.context === 'AUDIO') {
            const periodSamples = this.samplerate / (currentFreq || 440);
            // Snapping to sweet points: 0.25, 0.5, 1, 2, 4, 8 cycles
            const cycles = this.state.timebase; 
            visibleSamples = periodSamples * cycles;
        } else if (this.state.sync && this.state.context === 'MOD') {
            // Tempo Sync: timebase 1.0 = 1/4 note (Beat)
            // samples_per_beat = (64.0 / BPM) * SampleRate
            const samplesPerBeat = (60.0 / (this.tempo || 120.0)) * this.samplerate;
            visibleSamples = samplesPerBeat * this.state.timebase;
        }

        const step = w / (Math.min(visibleSamples, history.length - 1) || 128);
        const limit = Math.min(visibleSamples, history.length);
        
        for (let i = 0; i < limit; i++) {
            const dataIdx = (startIdx + i) % history.length;
            const val = history[dataIdx] || 0;
            const x = i * step;
            const y = (h / 2) - (val * (h / 2.5));
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // --- Oscilloscope 2.0: Numerical Measurements ---
        if (this.state.active && offsetIdx === 0) {
            ctx.fillStyle = 'rgba(0, 242, 255, 0.7)';
            ctx.font = 'bold 9px monospace';
            
            if (this.state.context === 'AUDIO') {
                const fText = currentFreq > 1000 ? `≈ ${(currentFreq/1000).toFixed(2)} kHz` : `≈ ${Math.round(currentFreq)} Hz`;
                const sText = this.state.sync ? ` · ${this.state.timebase} Cycles` : '';
                ctx.fillText(`${fText}${sText}`, 5, 12);
            } else if (this.state.context === 'MOD' && this.state.sync) {
                const divisions = {
                    0.25: '1/16', 0.5: '1/8', 1.0: '1/4', 2.0: '1/2', 4.0: '1 Bar', 8.0: '2 Bars'
                };
                const divText = divisions[this.state.timebase] || `${this.state.timebase} Beats`;
                ctx.fillText(`SYNC: ${divText} (${Math.round(this.tempo)} BPM)`, 5, 12);
            }
        }

        ctx.shadowBlur = 0;
    }

    drawXY(ctx, w, h, historyA, historyB) {
        if (!historyA || !historyB) return;
        
        ctx.strokeStyle = '#00f2ff';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#00f2ff';
        ctx.beginPath();
        
        for (let i = 0; i < 128; i++) {
            const x = (w / 2) + (historyA[i] * (w / 2.5));
            const y = (h / 2) - (historyB[i] * (h / 2.5));
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

window.ModuleOscilloscope = ModuleOscilloscope;
