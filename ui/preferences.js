/**
 * preferences.ts - OMEGA Premium Preferences Logic (TypeScript Implementation)
 * Phase 15.1 - Structural Maturity
 */
export class OMEGA_Preferences {
    settings = [];
    currentCategory = 'GENERAL';
    constructor() {
        console.log("[Preferences TS] Initialized");
    }
    async init() {
        await this.refresh();
        this.setupTabs();
        this.render();
    }
    setupTabs() {
        const tabs = document.querySelectorAll('.pref-tab');
        tabs.forEach(tab => {
            tab.onclick = () => {
                const htmlTab = tab;
                tabs.forEach(t => t.classList.remove('active'));
                htmlTab.classList.add('active');
                this.currentCategory = htmlTab.innerText.toUpperCase();
                this.render();
            };
        });
    }
    async refresh() {
        try {
            // @ts-ignore
            if (window.juce && window.juce.getSystemSettings) {
                // @ts-ignore
                const data = await window.juce.getSystemSettings();
                this.settings = Array.isArray(data) ? data : [];
            }
        }
        catch (e) {
            console.error("[Preferences TS] Refresh failed:", e);
        }
    }
    render() {
        const container = document.getElementById('preferences-body');
        if (!container)
            return;
        container.innerHTML = '';
        const catSettings = this.settings.filter(s => s.category === this.currentCategory);
        if (catSettings.length === 0) {
            container.innerHTML = `<div class="pref-empty">No settings found for ${this.currentCategory}.</div>`;
            return;
        }
        catSettings.forEach(s => {
            const row = document.createElement('div');
            row.className = 'pref-row';
            // Build control HTML (Typed)
            let controlHtml = '';
            if (s.options) {
                const sortedKeys = Object.keys(s.options).sort((a, b) => parseFloat(a) - parseFloat(b));
                controlHtml = `<select class="pref-select" data-pref-id="${s.id}">
                    ${sortedKeys.map(val => `<option value="${val}" ${Math.round(s.currentValue) == parseFloat(val) ? 'selected' : ''}>${s.options[val]}</option>`).join('')}
                </select>`;
            }
            else {
                controlHtml = `<input type="number" class="pref-input" data-pref-id="${s.id}" value="${s.currentValue}" 
                                min="${s.minValue}" max="${s.maxValue}">`;
            }
            row.innerHTML = `
                <div class="pref-info">
                    <span class="pref-label">${s.label}</span>
                    <span class="pref-tooltip">${s.tooltip}</span>
                </div>
                <div class="pref-control">
                    ${controlHtml}
                    <button class="pref-reset-btn" data-reset-id="${s.id}">RESET</button>
                </div>
            `;
            container.appendChild(row);
            // Bind events
            const ctrl = row.querySelector(`[data-pref-id="${s.id}"]`);
            ctrl.onchange = (e) => this.update(s.id, e.target.value);
            const resetBtn = row.querySelector(`[data-reset-id="${s.id}"]`);
            resetBtn.onclick = () => this.reset(s.id);
        });
    }
    async setSetting(id, value) {
        try {
            // @ts-ignore
            if (window.juce && window.juce.setSystemSetting) {
                // @ts-ignore
                await window.juce.setSystemSetting(id, value);
            }
        }
        catch (e) {
            console.error("[Preferences TS] Save failed:", e);
        }
    }
    async update(id, value) {
        const val = parseFloat(value);
        await this.setSetting(id, val);
        const s = this.settings.find(x => x.id === id);
        if (s)
            s.currentValue = val;
    }
    async reset(id) {
        const s = this.settings.find(x => x.id === id);
        if (s) {
            await this.update(id, s.defaultValue);
            this.render();
        }
    }
}
export const Preferences = new OMEGA_Preferences();
window.Preferences = Preferences;
//# sourceMappingURL=preferences.js.map