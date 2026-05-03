/**
 * OMEGA Module Browser (Integrated Registry)
 * Handles module discovery, categorization, and instantiation.
 */
export class ModuleBrowser {
    el = null;
    grid = null;
    categories = null;
    detail = null;
    searchInput = null;
    catalog = [];
    currentFilter = 'ALL';
    currentSearch = '';
    selectedModule = null;
    constructor() {
        this.setupListeners();
    }
    ensureElements() {
        if (this.el)
            return true;
        this.el = document.getElementById('module-browser-modal');
        this.grid = document.getElementById('module-registry-grid');
        this.categories = document.getElementById('module-category-list');
        this.detail = document.getElementById('module-detail-panel');
        this.searchInput = document.getElementById('module-search');
        return !!(this.el && this.grid && this.categories && this.detail && this.searchInput);
    }
    async open() {
        if (!this.ensureElements())
            return;
        this.el.style.display = 'flex';
        await this.fetchCatalog();
        this.render();
    }
    async fetchCatalog() {
        console.log("[ModuleBrowser] fetchCatalog starting...");
        // @ts-ignore
        const invStore = window.inventoryStore;
        if (invStore) {
            await invStore.ensureLoaded();
            this.catalog = invStore.getAllItems();
            console.log("[ModuleBrowser] Catalog items in store:", this.catalog.length);
            // Sync legacy global if still needed for transitional shims
            window.omegaCatalog = Object.fromEntries(this.catalog.map((c) => [c.id, c]));
        }
    }
    render() {
        this.renderCategories();
        this.renderGrid();
        this.renderDetail();
    }
    renderCategories() {
        if (!this.categories)
            return;
        const families = ['ALL', ...new Set(this.catalog.map(c => c.family))];
        this.categories.innerHTML = families.map(f => `
            <div class="cat-item ${this.currentFilter === f ? 'active' : ''}" data-family="${f}">
                ${f.toUpperCase()}
            </div>
        `).join('');
        this.categories.querySelectorAll('.cat-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.currentFilter = e.target.dataset.family;
                this.render();
            });
        });
    }
    renderGrid() {
        if (!this.grid)
            return;
        console.log(`[ModuleBrowser] renderGrid. Total items: ${this.catalog.length}, Filter: ${this.currentFilter}`);
        const filtered = this.catalog.filter(c => {
            if (!c.id)
                return false; // Ignore placeholders
            const isVisible = c.visible !== false;
            const matchesFam = this.currentFilter === 'ALL' ||
                c.family.toUpperCase() === this.currentFilter.toUpperCase();
            const matchesSearch = c.name.toLowerCase().includes(this.currentSearch.toLowerCase()) ||
                (c.description || '').toLowerCase().includes(this.currentSearch.toLowerCase());
            return isVisible && matchesFam && matchesSearch;
        });
        this.grid.innerHTML = filtered.map(c => `
            <div class="reg-card ${this.selectedModule?.id === c.id ? 'selected' : ''}" data-id="${c.id}">
                <div class="card-icon">${this.getIconForModule(c)}</div>
                <div class="card-name">${c.name}</div>
                <div class="card-family">${c.family}</div>
            </div>
        `).join('');
        this.grid.querySelectorAll('.reg-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                this.selectedModule = this.catalog.find(c => c.id === id);
                this.render();
            });
        });
    }
    renderDetail() {
        if (!this.detail)
            return;
        if (!this.selectedModule) {
            this.detail.innerHTML = '<div class="preview-placeholder">SELECT A MODULE</div>';
            return;
        }
        const m = this.selectedModule;
        this.detail.innerHTML = `
            <div class="detail-header">
                <h3>${m.name}</h3>
                <div class="detail-meta">
                    <span>${m.family}</span>
                    <span>v${m.version || '1.0'}</span>
                </div>
            </div>
            <div class="detail-description">
                ${m.description || 'No description provided for this module.'}
            </div>
            <div class="add-action-container">
                <button class="btn-add-to-rack" id="btn-add-module-exec">ADD TO RACK</button>
            </div>
        `;
        document.getElementById('btn-add-module-exec')?.addEventListener('click', () => this.addModule(m.id));
    }
    getIconForModule(m) {
        // [VISION 2.2.0] - Path Autonomy: We try to load illustration based on ID by default
        const id = m.id || m.componentId;
        const autoPath = `assets/modules/${id}/illustration.svg`;
        // Fallback to emoji if needed
        const icons = {
            'osc-analog': '🔊',
            'midi-util': '🎹',
            'filter-standard': '🌊',
            'env-standard': '📐'
        };
        const emoji = icons[m.icon] || '📦';
        // We use a helper wrapper to handle the onerror efficiently
        return `<img src="${autoPath}" class="card-illustration" alt="${m.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <div class="card-icon-fallback" style="display:none; font-size: 2rem;">${emoji}</div>`;
    }
    setupListeners() {
        // Using a slight delay to ensure elements exist if constructor called early
        setTimeout(() => {
            if (!this.ensureElements())
                return;
            this.searchInput?.addEventListener('input', (e) => {
                this.currentSearch = e.target.value;
                this.renderGrid();
            });
        }, 500);
    }
    async addModule(componentId) {
        // @ts-ignore
        if (window.rpcCommandDispatcher) {
            try {
                // @ts-ignore
                const resp = await window.rpcCommandDispatcher.dispatch({
                    type: 'addModule',
                    payload: { componentId }
                });
                if (resp && !resp.error) {
                    this.el.style.display = 'none';
                    console.log("[ModuleBrowser] Aseptic Instantiation Success:", componentId);
                }
                else {
                    alert("Failed to add module: " + (resp?.error || "Unknown error"));
                }
            }
            catch (e) {
                console.error("[ModuleBrowser] Dispatch Error:", e);
            }
        }
    }
}
// @ts-ignore
window.ModuleBrowser = ModuleBrowser;
//# sourceMappingURL=ModuleBrowser.js.map