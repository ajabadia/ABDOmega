/**
 * PresetBrowser.ts - OMEGA Advanced Preset Management
 * Handles the 3-column browser (Category > Library > Patch)
 */
export class OMEGA_PresetBrowser {
    data = { libraries: [] };
    selectedLibIdx = 0;
    selectedPresetIdx = -1;
    currentCategory = 'All';
    searchQuery = '';
    constructor() {
        console.log("[PresetBrowser] Initialized");
    }
    async init() {
        this.setupListeners();
        await this.refresh();
    }
    setupListeners() {
        const search = document.getElementById('browser-search');
        if (search) {
            search.oninput = (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.renderPresets();
            };
        }
        // Action buttons
        const attach = (id, fn) => {
            const el = document.getElementById(id);
            if (el)
                el.onclick = fn;
        };
        attach('preset-saveas-btn', () => this.showSaveAsModal());
    }
    async refresh() {
        try {
            // @ts-ignore
            if (window.juce && window.juce.getBrowserData) {
                // @ts-ignore
                const response = await window.juce.getBrowserData();
                if (response) {
                    this.data = response;
                    this.render();
                }
            }
        }
        catch (e) {
            console.error("[PresetBrowser] Failed to refresh data:", e);
        }
    }
    render() {
        this.renderCategories();
        this.renderLibraries();
        this.renderPresets();
    }
    renderCategories() {
        const list = document.getElementById('cat-list');
        if (!list)
            return;
        const system = ["All", "Factory", "User", "Favorites"];
        const custom = this.data.categories || [];
        const seen = new Set();
        list.innerHTML = '';
        [...system, ...custom].forEach(cat => {
            if (seen.has(cat))
                return;
            seen.add(cat);
            const li = document.createElement('li');
            li.innerText = cat;
            if (this.currentCategory === cat)
                li.classList.add('active');
            li.onclick = () => this.selectCategory(cat);
            list.appendChild(li);
        });
    }
    selectCategory(cat) {
        this.currentCategory = cat;
        this.selectedLibIdx = 0;
        this.selectedPresetIdx = -1;
        this.render();
    }
    renderLibraries() {
        const list = document.getElementById('lib-list');
        if (!list)
            return;
        list.innerHTML = '';
        this.data.libraries.forEach((lib, idx) => {
            let shouldShow = true;
            if (this.currentCategory === 'Factory')
                shouldShow = lib.name.toUpperCase() === 'FACTORY';
            else if (this.currentCategory === 'User')
                shouldShow = lib.name.toUpperCase() === 'USER' || lib.category === 'User';
            else if (this.currentCategory === 'Favorites')
                shouldShow = lib.patches.some(p => p.favorite);
            else if (this.currentCategory !== 'All')
                shouldShow = lib.category === this.currentCategory;
            if (!shouldShow)
                return;
            const li = document.createElement('li');
            li.innerHTML = `<span>${lib.name}</span>`;
            if (this.selectedLibIdx === idx)
                li.classList.add('active');
            li.onclick = () => this.selectLib(idx);
            list.appendChild(li);
        });
    }
    async selectLib(idx) {
        this.selectedLibIdx = idx;
        this.selectedPresetIdx = -1;
        // @ts-ignore
        if (window.juce && window.juce.selectLibrary)
            await window.juce.selectLibrary(idx);
        this.render();
    }
    renderPresets() {
        const list = document.getElementById('preset-list');
        if (!list)
            return;
        list.innerHTML = '';
        const lib = this.data.libraries[this.selectedLibIdx];
        if (!lib)
            return;
        lib.patches.forEach((p, idx) => {
            const matchesSearch = !this.searchQuery || p.name.toLowerCase().includes(this.searchQuery);
            if (!matchesSearch)
                return;
            const li = document.createElement('li');
            li.className = 'preset-item';
            if (this.selectedPresetIdx === idx)
                li.classList.add('active');
            li.innerHTML = `<span class="preset-name">${p.name}</span>`;
            if (p.favorite)
                li.innerHTML += `<span class="preset-fav active">★</span>`;
            li.onclick = () => this.selectPreset(idx);
            list.appendChild(li);
        });
    }
    async selectPreset(idx) {
        this.selectedPresetIdx = idx;
        // @ts-ignore
        if (window.juce && window.juce.loadLibraryPreset) {
            // @ts-ignore
            await window.juce.loadLibraryPreset(this.selectedLibIdx, idx);
        }
        this.renderPresets();
        this.updateInfoPane();
    }
    updateInfoPane() {
        const lib = this.data.libraries[this.selectedLibIdx];
        const p = lib?.patches[this.selectedPresetIdx];
        if (!p)
            return;
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el)
                el.value = val;
        };
        setVal('meta-name', p.name);
        setVal('meta-author', p.author || '');
        setVal('meta-tags', p.tags || '');
        setVal('meta-notes', p.notes || '');
    }
    showSaveAsModal() {
        const modal = document.getElementById('modal-saveas');
        if (modal)
            modal.style.display = 'flex';
    }
}
export const PresetBrowser = new OMEGA_PresetBrowser();
// @ts-ignore
window.PresetBrowser = PresetBrowser;
//# sourceMappingURL=PresetBrowser.js.map