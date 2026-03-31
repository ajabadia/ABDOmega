/**
 * preferences.js - OMEGA Premium Preferences Logic
 */
const Preferences = {
    settings: [],
    currentCategory: 'GENERAL',
    
    async init() {
        console.log("[Preferences] Initializing...");
        await this.refresh();
        this.setupTabs();
        this.render();
    },

    setupTabs() {
        const tabs = document.querySelectorAll('.pref-tab');
        tabs.forEach(tab => {
            tab.onclick = () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentCategory = tab.innerText.toUpperCase();
                this.render();
            };
        });
    },

    async refresh() {
        try {
            const data = await window.omegaRPC.getSystemSettings();
            this.settings = Array.isArray(data) ? data : [];
            console.log("[Preferences] Loaded settings:", this.settings);
        } catch (e) {
            console.error("[Preferences] Load failed:", e);
        }
    },

    render() {
        const container = document.getElementById('preferences-body');
        if (!container) return;
        
        container.innerHTML = '';
        
        const catSettings = this.settings.filter(s => s.category === this.currentCategory);
        
        if (catSettings.length === 0) {
            container.innerHTML = `<div style="color: #666; text-align: center; padding: 40px; font-size: 13px;">
                No settings found for ${this.currentCategory} category.
            </div>`;
            return;
        }

        const header = document.createElement('div');
        header.className = 'pref-section-header';
        header.innerText = this.currentCategory;
        container.appendChild(header);
        
        catSettings.forEach(s => {
            const row = document.createElement('div');
            row.className = 'pref-row';
            
            let controlHtml = '';
            if (s.options) {
                const sortedKeys = Object.keys(s.options).sort((a,b) => parseFloat(a) - parseFloat(b));
                controlHtml = `<select class="pref-select" onchange="Preferences.update('${s.id}', this.value)">
                    ${sortedKeys.map(val => 
                        `<option value="${val}" ${Math.round(s.currentValue) == val ? 'selected' : ''}>${s.options[val]}</option>`
                    ).join('')}
                </select>`;
            } else {
                controlHtml = `<input type="number" class="pref-select" value="${s.currentValue}" 
                                min="${s.minValue}" max="${s.maxValue}" 
                                onchange="Preferences.update('${s.id}', this.value)" style="width: 60px;">`;
            }

            row.innerHTML = `
                <div class="pref-info">
                    <span class="pref-label">${s.label}</span>
                    <span class="pref-tooltip">${s.tooltip}</span>
                </div>
                <div class="pref-control">
                    ${controlHtml}
                    <button class="pref-reset-btn" onclick="Preferences.reset('${s.id}')">RESET</button>
                </div>
            `;
            container.appendChild(row);
        });
    },

    async update(id, value) {
        console.log(`[Preferences] Updating ${id} to ${value}`);
        try {
            await window.omegaRPC.setSystemSetting(id, parseFloat(value));
            const s = this.settings.find(x => x.id === id);
            if (s) s.currentValue = parseFloat(value);
        } catch (e) {
            console.error(`[Preferences] Failed to update ${id}:`, e);
        }
    },

    async reset(id) {
        const s = this.settings.find(x => x.id === id);
        if (s) {
            await this.update(id, s.defaultValue);
            this.render(); 
        }
    }
};

window.Preferences = Preferences;
