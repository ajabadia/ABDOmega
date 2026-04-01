/**
 * ModuleMidiViewer (TypeScript)
 * Premium Event logger for OMEGA.
 * Restoration: Fixed timestamp synchronization and enhanced aesthetics.
 */

export class ModuleMidiViewer {
    private el: HTMLElement;
    private content: HTMLElement;
    private logEl: HTMLElement;
    private descriptor: any;
    private maxLines: number = 32;
    private isPowered: boolean = true;
    private pollingInterval: any;
    private lastSeenTs: number = 0;

    constructor(el: HTMLElement, content: HTMLElement, descriptor: any) {
        this.el = el;
        this.content = content;
        this.descriptor = descriptor;
        
        this.logEl = document.createElement('div');
        this.render();
    }

    async init(): Promise<void> {
        this.addLogLine({ ts: Date.now()/1000, type: 0, ch: 0, d1: 0, d2: 0 }, "SYSTEM READY");
        this.bindEvents();
        this.startPolling();
    }

    private render(): void {
        this.content.innerHTML = `
            <div class="midi-viewer-container" style="display: flex; flex-direction: column; height: 100%; font-family: 'Inter', sans-serif; font-size: 10px; color: #00f2ff; background: #050505; border: 1px solid rgba(0,242,255,0.2); border-radius: 4px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                <div class="header-toolbar" style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%); border-bottom: 1px solid rgba(0,242,255,0.3);">
                    <div style="font-weight: 800; font-size: 10px; letter-spacing: 2px; color: #fff; text-shadow: 0 0 5px rgba(0,242,255,0.5);">MIDI MONITOR</div>
                    <button id="midi-power-btn" class="sq active power-btn" style="width: 28px; height: 22px; font-size: 12px; color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 3px; background: linear-gradient(180deg, #333 0%, #111 100%); cursor: pointer;">⏻</button>
                </div>
                <div class="midi-header" style="display: grid; grid-template-columns: 60px 80px 40px 1fr 50px; gap: 4px; padding: 5px 10px; background: rgba(0,242,255,0.05); font-weight: 900; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 9px; text-transform: uppercase; color: rgba(0,242,255,0.5);">
                    <span>TIME</span>
                    <span>STATUS</span>
                    <span style="text-align: center;">CH</span>
                    <span>NOTE</span>
                    <span style="text-align: right;">VEL</span>
                </div>
                <div id="midi-log-body" style="flex: 1; overflow-y: auto; padding: 2px 0; background: #020202; scrollbar-width: thin;"></div>
            </div>
        `;
        this.logEl = this.content.querySelector('#midi-log-body') as HTMLElement;
    }

    private bindEvents(): void {
        const pwrBtn = this.content.querySelector('#midi-power-btn') as HTMLButtonElement;
        if (pwrBtn) {
            pwrBtn.onclick = () => {
                this.isPowered = !this.isPowered;
                pwrBtn.classList.toggle('active', this.isPowered);
                pwrBtn.style.boxShadow = this.isPowered ? "0 0 10px rgba(0,242,255,0.5)" : "none";
                this.logEl.style.opacity = this.isPowered ? "1" : "0.2";
                if (!this.isPowered) this.addLogLine({ ts: Date.now()/1000, type: 0, ch: 0, d1: 0, d2: 0 }, "MONITOR PAUSED");
            };
        }
    }

    private startPolling(): void {
        this.pollingInterval = setInterval(async () => {
            if (!this.isPowered) return;
            // @ts-ignore
            if (window.omegaRPC) {
                try {
                    // @ts-ignore
                    const resp = await window.omegaRPC.send("getTelemetry", { indices: [64] });
                    if (resp && resp["64"] && Array.isArray(resp["64"])) {
                        const events = resp["64"];
                        // Newest to oldest from C++, so reverse for processing
                        events.reverse().forEach((ev: any) => {
                            if (ev.ts > this.lastSeenTs) {
                                this.addLogLine(ev);
                                this.lastSeenTs = ev.ts;
                            }
                        });
                    }
                } catch(e) {}
            }
        }, 150);
    }

    private formatStatus(type: number): string {
        const status = type & 0xF0;
        switch(status) {
            case 0x90: return "NOTE ON";
            case 0x80: return "NOTE OFF";
            case 0xB0: return "CONTROL";
            case 0xE0: return "PITCH";
            default: return "DATA";
        }
    }

    private addLogLine(ev: any, customMsg?: string): void {
        const row = document.createElement('div');
        row.style.display = "grid";
        row.style.gridTemplateColumns = "60px 80px 40px 1fr 50px";
        row.style.gap = "4px";
        row.style.padding = "3px 10px";
        row.style.borderBottom = "1px solid rgba(255,255,255,0.02)";
        row.style.whiteSpace = "nowrap";
        row.style.fontSize = "10px";
        row.style.fontFamily = "'Courier New', monospace";

        if (customMsg) {
            row.innerHTML = `<span style="grid-column: span 5; color: #666; font-style: italic; letter-spacing: 1px;">> ${customMsg}</span>`;
        } else {
            const time = new Date(ev.ts * 1000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
            const noteName = (ev.type === 0x90 || ev.type === 0x80) ? `${noteNames[ev.d1 % 12]}${Math.floor(ev.d1 / 12) - 2}` : ev.d1;

            row.innerHTML = `
                <span style="color: #444;">${time}</span>
                <span style="color: ${ev.type === 0x90 ? '#fff' : '#00f2ff'}; font-weight: bold;">${this.formatStatus(ev.type)}</span>
                <span style="color: #00f2ff; text-align: center;">${ev.ch}</span>
                <span style="color: #fff; letter-spacing: 1px;">${noteName}</span>
                <span style="color: #ffaa00; font-weight: 800; text-align: right;">${ev.d2}</span>
            `;
        }

        if (this.logEl.firstChild) {
            this.logEl.insertBefore(row, this.logEl.firstChild);
        } else {
            this.logEl.appendChild(row);
        }
        
        while (this.logEl.children.length > this.maxLines) {
            this.logEl.removeChild(this.logEl.lastChild!);
        }
    }

    onStateUpdate(state: any): void {}

    destroy(): void {
        if (this.pollingInterval) clearInterval(this.pollingInterval);
    }
}

// @ts-ignore
if (typeof window !== 'undefined') window.ModuleMidiViewer = ModuleMidiViewer;
export default ModuleMidiViewer;
