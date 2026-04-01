export class ModuleOscilloscope {
    private el: HTMLElement;
    private content: HTMLElement;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private descriptor: any;

    private isPowered: boolean = true;
    private sourceA: number = 10; // Default DCO Main
    private sourceB: number = 13; // Default VCF Out
    private isDual: boolean = true;
    private isFrozen: boolean = false;
    private syncEnabled: boolean = true;
    private timebase: number = 1.0;
    
    private dataA: number[] = [];
    private dataB: number[] = [];
    private allSources: any[] = [];
    private filteredSources: any[] = [];
    
    private pollingInterval: any;
    private animationId: number = 0;
    private resizeObserver: ResizeObserver | null = null;

    // Modal state
    private modalActive: boolean = false;
    private modalCanvas: HTMLCanvasElement | null = null;
    private modalCtx: CanvasRenderingContext2D | null = null;
    private modalTimebase: number = 1.0;

    constructor(el: HTMLElement, content: HTMLElement, descriptor: any) {
        this.el = el;
        this.content = content;
        this.descriptor = descriptor;
        
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d')!;
        this.render();
    }

    async init(): Promise<void> {
        this.setupResizeObserver();
        
        await this.fetchSourcesWithRetry();
        this.startPolling();
        this.startDrawLoop();
        this.bindEvents();
        this.bindModalEvents();
        
        // Critical: force resize after UI stabilizes
        setTimeout(() => this.resize(), 100);
        setTimeout(() => this.resize(), 500);
    }

    private setupResizeObserver(): void {
        const area = this.content.querySelector('.visualizer-container') as HTMLElement;
        if (area && typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                requestAnimationFrame(() => this.resize());
            });
            this.resizeObserver.observe(area);
        }
        window.addEventListener('resize', () => {
            requestAnimationFrame(() => this.resize());
        });
    }

    private async fetchSourcesWithRetry(): Promise<void> {
        // @ts-ignore
        if (window.omegaRPC) {
            try {
                // @ts-ignore
                const resp = await window.omegaRPC.send("getTelemetrySources", {});
                if (resp && resp.audio) {
                    this.allSources = [...resp.audio, ...resp.modulation];
                    this.applyDynamicFiltering();
                    return;
                }
            } catch (e) { /* engine busy */ }
        }
        setTimeout(() => this.fetchSourcesWithRetry(), 2000);
    }

    private applyDynamicFiltering(): void {
        const activeModules = (window as any).moduleManager?.activeModules;
        if (!activeModules) {
            console.warn("[Scope] ModuleManager activeModules not found, waiting...");
            this.filteredSources = this.allSources; // Fallback
            this.updateSelectors();
            return;
        }

        const activeTypes = Array.from(activeModules.values()).map((m: any) => m.descriptor?.title?.toUpperCase() || "");

        console.log("[Scope] Applying dynamic filtering for active modules:", activeTypes);

        this.filteredSources = this.allSources.filter(s => {
            const name = s.name.toUpperCase();
            
            // Global Taps (Always show)
            if (name.includes("FINAL") || name.includes("BUS") || name.includes("MASTER")) return true;

            // Contextual Taps (Strict filtering)
            if (name.includes("DCO") || name.includes("OSC")) {
                return activeTypes.some(t => t.includes("DCO") || t.includes("OSC") || t.includes("SUPERSAW"));
            }
            if (name.includes("VCF") || name.includes("FILTER") || name.includes("KORG") || name.includes("HPF")) {
                return activeTypes.some(t => t.includes("VCF") || t.includes("FILTER") || t.includes("KORG") || t.includes("PROPHECY"));
            }
            if (name.includes("LFO") || name.includes("MOD")) {
                return activeTypes.some(t => t.includes("LFO") || t.includes("MODULATOR"));
            }
            if (name.includes("ENV") || name.includes("ADSR")) {
                return activeTypes.some(t => t.includes("ENV") || t.includes("ADSR") || t.includes("GENERATOR"));
            }
            if (name.includes("FX") || name.includes("DELAY") || name.includes("CHORUS") || name.includes("ECHO") || name.includes("SPACE")) {
                return activeTypes.some(t => t.includes("FX") || t.includes("DELAY") || t.includes("CHORUS") || t.includes("ECHO") || t.includes("SPACE") || t.includes("REVERB"));
            }

            return false; // Strict filtering based on loaded modules
        });

        this.updateSelectors();
    }

    private render(): void {
        this.content.innerHTML = `
            <div class="ModuleOscilloscope-inner" style="display: flex; flex-direction: column; height: 100%;">
                <div class="module-controls" style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px;">
                    <button id="osc-power" class="juno-btn power-btn active" title="POWER">⏻</button>
                    <div style="display: flex; gap: 5px;">
                        <button id="osc-modal-trigger" class="btn-scope-focus" title="Advanced Analyzer">⛶</button>
                        <button id="osc-freeze" class="sq" title="FREEZE">❄️</button>
                    </div>
                </div>

                <div class="visualizer-container">
                    <canvas id="osc-canvas-mini"></canvas>
                    <div id="osc-standby" style="position: absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:rgba(0,242,255,0.1); font-size: 10px; letter-spacing: 4px; display: none;">STANDBY</div>
                </div>

                <div class="scope-footer-row" style="display: flex; gap: 8px; margin-top: 8px;">
                    <select id="sel-src-a" class="scope-select" style="flex: 1; font-size: 10px; height: 24px;"></select>
                    <select id="sel-src-b" class="scope-select" style="flex: 1; font-size: 10px; height: 24px;"></select>
                </div>
            </div>
        `;
        this.canvas = this.content.querySelector('#osc-canvas-mini') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
    }

    private updateSelectors(): void {
        const selA = this.content.querySelector('#sel-src-a') as HTMLSelectElement;
        const selB = this.content.querySelector('#sel-src-b') as HTMLSelectElement;
        const modSelA = document.getElementById('scope-modal-src-a') as HTMLSelectElement;
        const modSelB = document.getElementById('scope-modal-src-b') as HTMLSelectElement;

        if (!selA || !selB) return;

        const options = this.filteredSources.map(s => `<option value="${s.index}">${s.name}</option>`).join('');
        selA.innerHTML = options;
        selB.innerHTML = `<option value="-1">OFF</option>` + options;
        
        if (modSelA && modSelB) {
            modSelA.innerHTML = options;
            modSelB.innerHTML = `<option value="-1">OFF</option>` + options;
        }

        selA.value = this.sourceA.toString();
        selB.value = this.sourceB.toString();
    }

    private bindEvents(): void {
        const btnPower = this.content.querySelector('#osc-power') as HTMLElement;
        const btnFreeze = this.content.querySelector('#osc-freeze') as HTMLElement;
        const btnModal = this.content.querySelector('#osc-modal-trigger') as HTMLElement;
        const selA = this.content.querySelector('#sel-src-a') as HTMLSelectElement;
        const selB = this.content.querySelector('#sel-src-b') as HTMLSelectElement;
        const standby = this.content.querySelector('#osc-standby') as HTMLElement;

        btnPower.onclick = () => {
            this.isPowered = !this.isPowered;
            btnPower.classList.toggle('active', this.isPowered);
            if (standby) standby.style.display = this.isPowered ? 'none' : 'block';
        };

        btnFreeze.onclick = () => {
            this.isFrozen = !this.isFrozen;
            btnFreeze.classList.toggle('active', this.isFrozen);
        };

        btnModal.onclick = () => this.openModal();

        selA.onchange = () => {
            this.sourceA = parseInt(selA.value);
            this.syncModalInputs();
        };
        selB.onchange = () => {
            this.sourceB = parseInt(selB.value);
            this.isDual = (this.sourceB !== -1);
            this.syncModalInputs();
        };
    }

    private bindModalEvents(): void {
        const modal = document.getElementById('oscilloscope-modal');
        if (!modal) return;

        const selA = document.getElementById('scope-modal-src-a') as HTMLSelectElement;
        const selB = document.getElementById('scope-modal-src-b') as HTMLSelectElement;
        const timebaseRange = document.getElementById('scope-modal-timebase') as HTMLInputElement;
        const freezeBtn = document.getElementById('scope-modal-freeze') as HTMLButtonElement;
        const okBtn = modal.querySelector('.modal-ok-btn') as HTMLElement;
        const closeBtn = modal.querySelector('.close-btn') as HTMLElement;

        if (selA) selA.onchange = () => {
            this.sourceA = parseInt(selA.value);
            this.updateSelectors();
        };
        if (selB) selB.onchange = () => {
            this.sourceB = parseInt(selB.value);
            this.isDual = (this.sourceB !== -1);
            this.updateSelectors();
        };
        if (timebaseRange) timebaseRange.oninput = () => {
            this.modalTimebase = parseInt(timebaseRange.value) / 50.0;
            const valLabel = document.getElementById('scope-val-timebase');
            if (valLabel) valLabel.innerText = `${timebaseRange.value}ms`;
        };
        if (freezeBtn) freezeBtn.onclick = () => {
            this.isFrozen = !this.isFrozen;
            freezeBtn.classList.toggle('active', this.isFrozen);
            const miniFreeze = this.content.querySelector('#osc-freeze');
            if (miniFreeze) miniFreeze.classList.toggle('active', this.isFrozen);
        };

        const close = () => {
            modal.style.display = 'none';
            this.modalActive = false;
        };
        if (okBtn) okBtn.onclick = close;
        if (closeBtn) closeBtn.onclick = close;
    }

    private openModal(): void {
        const modal = document.getElementById('oscilloscope-modal');
        if (!modal) return;
        
        modal.style.display = 'flex';
        this.modalActive = true;
        this.modalCanvas = document.getElementById('scope-large-canvas') as HTMLCanvasElement;
        if (this.modalCanvas) {
            this.modalCtx = this.modalCanvas.getContext('2d');
            const rect = this.modalCanvas.parentElement!.getBoundingClientRect();
            this.modalCanvas.width = rect.width;
            this.modalCanvas.height = rect.height;
        }
        this.syncModalInputs();
    }

    private syncModalInputs(): void {
        const modSelA = document.getElementById('scope-modal-src-a') as HTMLSelectElement;
        const modSelB = document.getElementById('scope-modal-src-b') as HTMLSelectElement;
        const modFreeze = document.getElementById('scope-modal-freeze');
        
        if (modSelA) modSelA.value = this.sourceA.toString();
        if (modSelB) modSelB.value = this.sourceB.toString();
        if (modFreeze) modFreeze.classList.toggle('active', this.isFrozen);
    }

    private startPolling(): void {
        this.pollingInterval = setInterval(async () => {
            if (!this.isPowered || this.isFrozen) return;
            // @ts-ignore
            if (window.omegaRPC) {
                const indices = [this.sourceA];
                if (this.isDual) indices.push(this.sourceB);
                try {
                    // @ts-ignore
                    const data = await window.omegaRPC.send("getTelemetry", { indices });
                    if (data) {
                        if (data[this.sourceA.toString()]) this.dataA = data[this.sourceA.toString()].history || [];
                        if (this.isDual && data[this.sourceB.toString()]) this.dataB = data[this.sourceB.toString()].history || [];
                    }
                } catch(e) {}
            }
        }, 33);
    }

    private startDrawLoop(): void {
        const loop = () => {
            if (this.isPowered) {
                this.draw(this.ctx, this.canvas, this.timebase);
                if (this.modalActive && this.modalCtx && this.modalCanvas) {
                    this.draw(this.modalCtx, this.modalCanvas, this.modalTimebase);
                }
            }
            this.animationId = requestAnimationFrame(loop);
        };
        loop();
    }

    private resize(): void {
        const area = this.content.querySelector('.visualizer-container') as HTMLElement;
        if (area) {
            const rect = area.getBoundingClientRect();
            const w = Math.floor(rect.width);
            const h = Math.floor(rect.height);
            
            // Avoid unnecessary updates and potential ResizeObserver recursion
            if (w > 2 && h > 2 && (this.canvas.width !== w || this.canvas.height !== h)) {
                this.canvas.width = w;
                this.canvas.height = h;
            }
        }
    }

    private draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, tb: number): void {
        const { width, height } = canvas;
        if (width === 0 || height === 0) return;

        ctx.clearRect(0, 0, width, height);

        // Baseline 
        ctx.strokeStyle = 'rgba(0,242,255,0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, height/2); ctx.lineTo(width, height/2); ctx.stroke();
        
        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.02)';
        const gridX = 10;
        const gridY = 8;
        for(let i=0; i<=gridX; i++) {
            const x = (width/gridX) * i;
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
        }
        for(let i=0; i<=gridY; i++) {
            const y = (height/gridY) * i;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
        }

        this.renderTrace(ctx, canvas, this.dataA, '#00f2ff', tb);
        if (this.isDual) {
            this.renderTrace(ctx, canvas, this.dataB, '#ffaa00', tb);
        }
    }

    private renderTrace(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, data: number[], color: string, tb: number): void {
        if (!data || data.length < 2) return;
        
        const { width, height } = canvas;
        const visibleCount = Math.floor(data.length * tb);
        let startIndex = 0;

        if (this.syncEnabled) {
            const limit = Math.floor(data.length / 2);
            for (let i = 0; i < limit; ++i) {
                if ((data[i] || 0) < 0 && (data[i+1] || 0) >= 0) {
                    startIndex = i;
                    break;
                }
            }
        }

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = canvas.width > 400 ? 2.5 : 1.8;
        ctx.lineJoin = 'round';
        
        const step = width / (visibleCount - 1);
        for (let i = 0; i < visibleCount; i++) {
            const idx = (startIndex + i) % data.length;
            const x = i * step;
            const val = data[idx] ?? 0;
            const y = (height / 2) - (val * (height / 2.2));
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Glow
        ctx.shadowBlur = canvas.width > 400 ? 10 : 6;
        ctx.shadowColor = color;
        ctx.globalAlpha = 0.4;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
    }

    onStateUpdate(state: any): void {
        // Redraw filtering when preset changes
        this.applyDynamicFiltering();
    }

    destroy(): void {
        if (this.resizeObserver) this.resizeObserver.disconnect();
        if (this.pollingInterval) clearInterval(this.pollingInterval);
        if (this.animationId) cancelAnimationFrame(this.animationId);
    }
}

// @ts-ignore
if (typeof window !== 'undefined') window.ModuleOscilloscope = ModuleOscilloscope;
export default ModuleOscilloscope;
