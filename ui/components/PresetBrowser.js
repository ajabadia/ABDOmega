/**
 * OMEGA Preset Browser Component
 */
class PresetBrowser {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.onPresetSelect = null;
    }

    async refresh() {
        const presets = await window.omegaRPC.listPresets();
        this.render(presets);
    }

    render(presets) {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="preset-browser-header">
                <h3>PRESETS</h3>
                <button class="refresh-btn" onclick="window.omegaPresetBrowser.refresh()">&#8635;</button>
            </div>
            <ul class="preset-list">
                ${Array.isArray(presets) ? presets.map(p => `
                    <li onclick="window.omegaPresetBrowser.select('${p.replace(/\\/g, '/')}')">
                        <span class="preset-icon">&#127808;</span>
                        <span class="preset-name">${p}</span>
                    </li>
                `).join('') : '<li class="no-presets">No presets found</li>'}
            </ul>
        `;
    }

    async select(presetId) {
        console.log("[Browser] Selecting preset:", presetId);
        await window.omegaRPC.send("loadPreset", { id: presetId });
        if (this.onPresetSelect) this.onPresetSelect(presetId);
    }
}

// Global instance will be created after DOM load in index.js
// but we define the class here.
window.PresetBrowser = PresetBrowser;
