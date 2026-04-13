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

    private generateGroupedOptions(list: any[]): string {
        const groups: {[key: string]: any[]} = {};
        for (const opt of list) {
            const groupName = opt.instance || 'Global';
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(opt);
        }

        let html = '';
        for (const [group, items] of Object.entries(groups)) {
            html += `<optgroup label="${group.toUpperCase()}">`;
            for (const item of items) {
                const displayName = item.name.replace(group, '').trim() || item.name;
                html += `<option value="${item.telemetryIndex}">${displayName}</option>`;
            }
            html += `</optgroup>`;
        }
        return html;
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
        // Era 6: Unified dispatch through Command Dispatcher
        // @ts-ignore
        if (window.rpcCommandDispatcher) {
            try {
                // @ts-ignore
                const resp = await window.rpcCommandDispatcher.dispatch({ 
                    type: 'systemQuery', 
                    target: 'getModulationMetadata' 
                });
                if (resp && resp.sources) {
                    // Filter for ports that have a telemetryIndex (visualizable)
                    this.allSources = resp.sources.filter((s: any) => s.telemetryIndex !== -1);
                    this.filteredSources = this.allSources;
                    this.updateSelectors();
                    return;
                }
            } catch (e) { /* engine busy */ }
        }
        setTimeout(() => this.fetchSourcesWithRetry(), 2000);
    }


    private render(): void {
        const isMaster = this.el.closest('#upper-rack') !== null;
        if (isMaster) this.el.classList.add('master-view');

        this.content.innerHTML = `
            <div class="ModuleOscilloscope-inner ${isMaster ? 'master-layout' : ''}" style="display: flex; flex-direction: column; height: 100%;">
                <div class="module-controls" style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 4px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button id="osc-power" class="juno-btn power-btn active" style="width:24px; height:24px; font-size:10px;" title="POWER">⏻</button>
                        <span class="module-title" style="font-size: 9px; opacity: 0.6; letter-spacing: 1px;">SCOPE ${this.descriptor.label || "MASTER"}</span>
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button id="osc-modal-trigger" class="btn-scope-focus" style="width:24px; height:24px;" title="Advanced Analyzer">⛶</button>
                        <button id="osc-freeze" class="sq" style="width:24px; height:24px; font-size:10px;" title="FREEZE">❄️</button>
                    </div>
                </div>

                <div class="visualizer-container" style="flex: 1; min-height: 60px; position: relative; border: 1px solid #222; background: #000;">
                    <canvas id="osc-canvas-mini"></canvas>
                    <div id="osc-standby" style="position: absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:rgba(0,242,255,0.1); font-size: 8px; letter-spacing: 4px; display: none;">STANDBY</div>
                </div>

                <div class="scope-footer-row" style="display: flex; gap: 4px; margin-top: 4px;">
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 2px;">
                        <label style="font-size: 7px; text-transform: uppercase; opacity: 0.5;">Src A</label>
                        <select id="sel-src-a" class="scope-select" style="width: 100%; font-size: 9px; height: 18px; padding: 0 2px;"></select>
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 2px;">
                        <label style="font-size: 7px; text-transform: uppercase; opacity: 0.5;">Src B</label>
                        <select id="sel-src-b" class="scope-select" style="width: 100%; font-size: 9px; height: 18px; padding: 0 2px;"></select>
                    </div>
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

        const options = this.generateGroupedOptions(this.filteredSources);
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
            // Era 6: Unified dispatch through Command Dispatcher
            // @ts-ignore
            if (window.rpcCommandDispatcher) {
                const indices = [this.sourceA];
                if (this.isDual) indices.push(this.sourceB);
                try {
                    // @ts-ignore
                    const data = await window.rpcCommandDispatcher.dispatch({ 
                        type: 'getTelemetry', 
                        value: { indices } 
                    });
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
        // Redraw filtering when preset changes (re-trigger discovery)
        this.fetchSourcesWithRetry();
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
