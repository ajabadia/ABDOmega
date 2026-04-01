/**
 * PresetBrowser.ts - OMEGA Advanced Preset Management
 * Handles the 3-column browser (Category > Library > Patch)
 */

export interface Patch {
    name: string;
    author?: string;
    category?: string;
    tags?: string;
    notes?: string;
    favorite?: boolean;
    date?: string;
    originGroup?: number;
    originBank?: number;
    originPatch?: number;
}

export interface Library {
    name: string;
    category: string;
    patches: Patch[];
}

export interface BrowserData {
    libraries: Library[];
    categories?: string[];
}

export class OMEGA_PresetBrowser {
    private data: BrowserData = { libraries: [] };
    private selectedLibIdx: number = 0;
    private selectedPresetIdx: number = -1;
    private currentCategory: string = 'All';
    private searchQuery: string = '';

    constructor() {
        console.log("[PresetBrowser] Initialized");
    }

    public async init() {
        this.setupListeners();
        await this.refresh();
    }

    private setupListeners() {
        const search = document.getElementById('browser-search') as HTMLInputElement;
        if (search) {
            search.oninput = (e) => {
                this.searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
                this.renderPresets();
            };
        }

        // Action buttons
        const attach = (id: string, fn: () => void) => {
            const el = document.getElementById(id);
            if (el) el.onclick = fn;
        };

        attach('preset-saveas-btn', () => this.showSaveAsModal());
    }

    public async refresh() {
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
        } catch (e) {
            console.error("[PresetBrowser] Failed to refresh data:", e);
        }
    }

    public render() {
        this.renderCategories();
        this.renderLibraries();
        this.renderPresets();
    }

    private renderCategories() {
        const list = document.getElementById('cat-list');
        if (!list) return;

        const system = ["All", "Factory", "User", "Favorites"];
        const custom = this.data.categories || [];
        const seen = new Set();

        list.innerHTML = '';
        [...system, ...custom].forEach(cat => {
            if (seen.has(cat)) return;
            seen.add(cat);
            const li = document.createElement('li');
            li.innerText = cat;
            if (this.currentCategory === cat) li.classList.add('active');
            li.onclick = () => this.selectCategory(cat);
            list.appendChild(li);
        });
    }

    private selectCategory(cat: string) {
        this.currentCategory = cat;
        this.selectedLibIdx = 0;
        this.selectedPresetIdx = -1;
        this.render();
    }

    private renderLibraries() {
        const list = document.getElementById('lib-list');
        if (!list) return;
        list.innerHTML = '';

        this.data.libraries.forEach((lib, idx) => {
            let shouldShow = true;
            if (this.currentCategory === 'Factory') shouldShow = lib.name.toUpperCase() === 'FACTORY';
            else if (this.currentCategory === 'User') shouldShow = lib.name.toUpperCase() === 'USER' || lib.category === 'User';
            else if (this.currentCategory === 'Favorites') shouldShow = lib.patches.some(p => p.favorite);
            else if (this.currentCategory !== 'All') shouldShow = lib.category === this.currentCategory;

            if (!shouldShow) return;

            const li = document.createElement('li');
            li.innerHTML = `<span>${lib.name}</span>`;
            if (this.selectedLibIdx === idx) li.classList.add('active');
            li.onclick = () => this.selectLib(idx);
            list.appendChild(li);
        });
    }

    private async selectLib(idx: number) {
        this.selectedLibIdx = idx;
        this.selectedPresetIdx = -1;
        // @ts-ignore
        if (window.juce && window.juce.selectLibrary) await window.juce.selectLibrary(idx);
        this.render();
    }

    private renderPresets() {
        const list = document.getElementById('preset-list');
        if (!list) return;
        list.innerHTML = '';

        const lib = this.data.libraries[this.selectedLibIdx];
        if (!lib) return;

        lib.patches.forEach((p, idx) => {
            const matchesSearch = !this.searchQuery || p.name.toLowerCase().includes(this.searchQuery);
            if (!matchesSearch) return;

            const li = document.createElement('li');
            li.className = 'preset-item';
            if (this.selectedPresetIdx === idx) li.classList.add('active');
            
            li.innerHTML = `<span class="preset-name">${p.name}</span>`;
            if (p.favorite) li.innerHTML += `<span class="preset-fav active">★</span>`;

            li.onclick = () => this.selectPreset(idx);
            list.appendChild(li);
        });
    }

    private async selectPreset(idx: number) {
        this.selectedPresetIdx = idx;
        // @ts-ignore
        if (window.juce && window.juce.loadLibraryPreset) {
            // @ts-ignore
            await window.juce.loadLibraryPreset(this.selectedLibIdx, idx);
        }
        this.renderPresets();
        this.updateInfoPane();
    }

    private updateInfoPane() {
        const lib = this.data.libraries[this.selectedLibIdx];
        const p = lib?.patches[this.selectedPresetIdx];
        if (!p) return;

        const setVal = (id: string, val: string) => {
            const el = document.getElementById(id) as HTMLInputElement;
            if (el) el.value = val;
        };

        setVal('meta-name', p.name);
        setVal('meta-author', p.author || '');
        setVal('meta-tags', p.tags || '');
        setVal('meta-notes', p.notes || '');
    }

    private showSaveAsModal() {
        const modal = document.getElementById('modal-saveas');
        if (modal) modal.style.display = 'flex';
    }
}

export const PresetBrowser = new OMEGA_PresetBrowser();
// @ts-ignore
window.PresetBrowser = PresetBrowser;
