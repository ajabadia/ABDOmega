/**
 * OMEGA MIDI-to-CV Utility Module (TypeScript)
 * Build #181 - Hardware Design & Multi-Channel Support
 */

export class ModuleMidiToCv {
    private container: HTMLElement;
    private content: HTMLElement;
    private options: any;
    private activityPulse: boolean = false;

    constructor(container: HTMLElement, content: HTMLElement, options: any) {
        this.container = container;
        this.content = content;
        this.options = options;
        
        this.addStyles();
        this.render();
    }

    async init() {
        console.log(`[MCV] Initialized instance: ${this.options.instanceId || 'mcv.1'}`);
    }

    render() {
        this.content.innerHTML = `
            <div class="mcv-container">
                <div class="mcv-led-section">
                    <div id="mcv-activity-led" class="mcv-led"></div>
                    <label class="label-tiny">MIDI ACTIVITY</label>
                </div>

                <div class="mcv-io-row">
                    <div class="mcv-port-box">
                        <div class="port-dot port-midi-in"></div>
                        <label class="label-tiny">IN</label>
                    </div>
                </div>

                <div class="mcv-control-section">
                    <div class="mcv-channel-row">
                        <label class="label-tiny">CH SELECT</label>
                        <select id="mcv-channel-select" class="mcv-select">
                            <option value="0">OMNI</option>
                            ${Array.from({length: 16}, (_, i) => `<option value="${i+1}">${i+1}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="mcv-strip">
                    <div class="mcv-port-box">
                        <div class="port-dot port-cv-out"></div>
                        <label class="label-tiny">P</label>
                    </div>
                    <div class="mcv-port-box">
                        <div class="port-dot port-cv-out"></div>
                        <label class="label-tiny">G</label>
                    </div>
                    <div class="mcv-port-box">
                        <div class="port-dot port-cv-out"></div>
                        <label class="label-tiny">V</label>
                    </div>
                </div>
            </div>
        `;

        const select = this.content.querySelector('#mcv-channel-select') as HTMLSelectElement;
        if (select) {
            select.addEventListener('change', () => {
                const val = parseInt(select.value);
                const paramId = `${this.options.instanceId || 'mcv.1'}.midiChannel`;
                
                // @ts-ignore
                if (window.omegaRPC) {
                    // @ts-ignore
                    window.omegaRPC.send('setParam', { id: paramId, value: val });
                }
            });
        }
    }

    onStateUpdate(state: any) {
        if (!state) return;

        // Activity LED logic
        const led = this.content.querySelector('#mcv-activity-led');
        if (led) {
            const activityValue = state.telemetry?.[`mcv.${this.options.instanceId || 'mcv.1'}.activity`];
            if (activityValue > 0.1) {
                led.classList.add('pulse');
                setTimeout(() => led.classList.remove('pulse'), 80);
            }
        }

        // Sync Select Value
        const paramId = `${this.options.instanceId || 'mcv.1'}.midiChannel`;
        const paramValue = state.params?.[paramId];
        if (paramValue !== undefined) {
            const select = this.content.querySelector('#mcv-channel-select') as HTMLSelectElement;
            if (select && select.value !== paramValue.toString()) {
                select.value = paramValue.toString();
            }
        }
    }

    addStyles() {
        if (document.getElementById('mcv-module-styles')) return;
        const style = document.createElement('style');
        style.id = 'mcv-module-styles';
        style.innerHTML = `
            .mcv-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                height: 100%;
                padding: 10px;
                background: linear-gradient(180deg, #151515 0%, #0a0a0a 100%);
            }
            .mcv-led-section {
                text-align: center;
                margin-bottom: 5px;
            }
            .mcv-led {
                width: 14px;
                height: 14px;
                background: #202;
                border: 2px solid #404;
                border-radius: 50%;
                margin: 0 auto 3px;
                transition: all 0.1s;
            }
            .mcv-led.pulse {
                background: #f0f;
                box-shadow: 0 0 10px #f0f;
            }
            .mcv-io-row {
                margin: 5px 0;
            }
            .mcv-strip {
                display: flex;
                justify-content: space-around;
                width: 100%;
                background: #111;
                border-radius: 4px;
                padding: 4px 0;
                border: 1px solid #222;
            }
            .port-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                margin-bottom: 2px;
            }
            .port-midi-in { background: #808; border: 2px solid #a0a; }
            .port-cv-out { background: #088; border: 2px solid #0aa; }
            
            .mcv-select {
                background: #000;
                color: #0ff;
                border: 1px solid #088;
                font-family: 'Inter', sans-serif;
                font-size: 10px;
                padding: 2px;
                border-radius: 3px;
                width: 60px;
                outline: none;
            }
            .mcv-port-box {
                display: flex;
                flex-direction: column;
                align-items: center;
                min-width: 25px;
            }
        `;
        document.head.appendChild(style);
    }
}

// @ts-ignore
if (typeof window !== 'undefined') {
    // @ts-ignore
    window.ModuleMidiToCv = ModuleMidiToCv;
}
