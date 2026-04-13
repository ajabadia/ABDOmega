/**
 * service.ts - OMEGA Service Mode (TypeScript Implementation)
 * Era 6 - Managed Dispatch Edition
 */
export class OMEGA_ServiceMode {
    params = [];
    activeVoice = -1;
    constructor() {
        console.log("[Service] Initialized (Aseptic)");
    }
    async init() {
        try {
            await this.refreshParams();
        }
        catch (e) {
            console.error("[Service] Init failed:", e);
        }
        this.renderVoices();
    }
    async refreshParams() {
        // [Era 6] Request data via hardened RPC
        const rpc = window.omegaRPC;
        if (rpc) {
            try {
                this.params = await rpc.send("getCalibrationParams");
                this.renderParams();
            }
            catch (e) {
                console.error("[Service] getCalibrationParams failed:", e);
            }
        }
    }
    renderParams() {
        const container = document.getElementById('service-params-list');
        if (!container)
            return;
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
            const slider = row.querySelector('input');
            slider.oninput = (e) => this.updateParam(p.id, e.target.value);
        });
    }
    async updateParam(id, value) {
        const val = parseFloat(value);
        const p = this.params.find(x => x.id === id);
        const display = document.getElementById(`val-${id}`);
        if (display && p)
            display.innerText = val.toFixed(2) + p.unit;
        // [Era 6] Unified Dispatch
        const dispatcher = window.rpcCommandDispatcher;
        if (dispatcher) {
            await dispatcher.dispatch({
                type: 'serviceAction',
                value: { action: 'setCalibrationParam', id, value: val }
            });
        }
    }
    renderVoices() {
        const container = document.getElementById('voice-test-grid');
        if (!container)
            return;
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
    async toggleVoiceTest(index) {
        const dispatcher = window.rpcCommandDispatcher;
        if (!dispatcher)
            return;
        if (this.activeVoice === index) {
            this.activeVoice = -1;
            await dispatcher.dispatch({ type: 'serviceAction', value: { action: 'stopVoiceTest' } });
            document.querySelectorAll('.voice-test-btn').forEach(b => b.classList.remove('active'));
        }
        else {
            this.activeVoice = index;
            await dispatcher.dispatch({ type: 'serviceAction', value: { action: 'testVoice', voice: index } });
            document.querySelectorAll('.voice-test-btn').forEach(b => b.classList.remove('active'));
            const btn = document.getElementById(`btn-voice-${index}`);
            if (btn)
                btn.classList.add('active');
        }
    }
    async serviceAction(action) {
        const dispatcher = window.rpcCommandDispatcher;
        if (dispatcher) {
            await dispatcher.dispatch({ type: 'serviceAction', value: { action } });
        }
    }
}
export const ServiceMode = new OMEGA_ServiceMode();
window.ServiceMode = ServiceMode;
//# sourceMappingURL=service.js.map