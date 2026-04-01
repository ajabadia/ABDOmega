/**
 * service.ts - OMEGA Service Mode (TypeScript Implementation)
 * Phase 15.1 - Structural Maturity
 */

interface CalibrationParam {
    id: string;
    label: string;
    currentValue: number;
    minValue: number;
    maxValue: number;
    stepSize: number;
    unit: string;
}

export class OMEGA_ServiceMode {
    private params: CalibrationParam[] = [];
    private activeVoice: number = -1;

    constructor() {
        console.log("[Service TS] Initialized");
    }

    public async init() {
        try {
            await this.refreshParams();
        } catch (e) {
            console.error("[Service TS] Init failed:", e);
        }
        this.renderVoices();
    }

    public async refreshParams() {
        const win = window as any;
        if (win.juce && win.juce.getCalibrationParams) {
            try {
                this.params = await win.juce.getCalibrationParams();
                this.renderParams();
            } catch (e) {
                console.error("[Service TS] getCalibrationParams failed:", e);
            }
        }
    }

    private renderParams() {
        const container = document.getElementById('service-params-list');
        if (!container) return;

        container.innerHTML = '';
        this.params.forEach(p => {
            const row = document.createElement('div');
            row.className = 'service-param-row';
            row.innerHTML = `
                <div class="service-param-info">
                    <span class="service-param-label">${p.label}</span>
                    <span class="service-param-value" id="val-${p.id}">${p.currentValue.toFixed(2)}${p.unit}</span>
                </div>
                <input type="range" class="service-slider" 
                    min="${p.minValue}" max="${p.maxValue}" step="${p.stepSize}" 
                    value="${p.currentValue}" data-param-id="${p.id}">
            `;
            container.appendChild(row);

            const slider = row.querySelector('input') as HTMLInputElement;
            slider.oninput = (e) => this.updateParam(p.id, (e.target as any).value);
        });
    }

    public updateParam(id: string, value: string) {
        const val = parseFloat(value);
        const p = this.params.find(x => x.id === id);
        const display = document.getElementById(`val-${id}`);
        if (display && p) display.innerText = val.toFixed(2) + p.unit;
        
        const win = window as any;
        if (win.juce && win.juce.setCalibrationParam) {
            win.juce.setCalibrationParam(id, val);
        }
    }

    private renderVoices() {
        const container = document.getElementById('voice-test-grid');
        if (!container) return;

        container.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            const btn = document.createElement('button');
            btn.className = 'voice-test-btn';
            btn.innerText = `VOICE ${i + 1}`;
            btn.id = `btn-voice-${i}`;
            btn.onclick = () => this.toggleVoiceTest(i);
            container.appendChild(btn);
        }
    }

    public toggleVoiceTest(index: number) {
        const win = window as any;
        if (!win.juce) return;

        if (this.activeVoice === index) {
            this.activeVoice = -1;
            win.juce.serviceAction({ action: 'stopVoiceTest' });
            document.querySelectorAll('.voice-test-btn').forEach(b => b.classList.remove('active'));
        } else {
            this.activeVoice = index;
            win.juce.serviceAction({ action: 'testVoice', voice: index });
            document.querySelectorAll('.voice-test-btn').forEach(b => b.classList.remove('active'));
            const btn = document.getElementById(`btn-voice-${index}`);
            if (btn) btn.classList.add('active');
        }
    }

    public serviceAction(action: string) {
        const win = window as any;
        if (win.juce) win.juce.serviceAction({ action });
    }
}

export const ServiceMode = new OMEGA_ServiceMode();
(window as any).ServiceMode = ServiceMode;
