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
        // @ts-ignore
        if (window.omegaRPC) {
            try {
                // @ts-ignore
                const resp = await window.omegaRPC.send("listCatalog", {});
                if (resp && resp.components) {
                    this.catalog = resp.components;
                }
            }
            catch (e) {
                console.error("[ModuleBrowser] Failed to fetch catalog:", e);
            }
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
        const filtered = this.catalog.filter(c => {
            const matchesFam = this.currentFilter === 'ALL' || c.family === this.currentFilter;
            const matchesSearch = c.name.toLowerCase().includes(this.currentSearch.toLowerCase()) ||
                (c.description || '').toLowerCase().includes(this.currentSearch.toLowerCase());
            return matchesFam && matchesSearch;
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
        // Map icon ID to emoji or SVG
        const icons = {
            'osc-analog': '🔊',
            'midi-util': '🎹',
            'filter-standard': '🌊',
            'env-standard': '📐'
        };
        return icons[m.icon] || '📦';
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
        if (window.omegaRPC) {
            try {
                // @ts-ignore
                const resp = await window.omegaRPC.send("addModule", { componentId });
                if (resp && !resp.error) {
                    // Close browser on success
                    this.el.style.display = 'none';
                    console.log("[ModuleBrowser] Module added successfully:", componentId);
                    // The backend will notify onStateUpdate, which will refresh the rack automatically.
                }
                else {
                    alert("Failed to add module: " + (resp.error || "Unknown error"));
                }
            }
            catch (e) {
                console.error("[ModuleBrowser] RPC Error adding module:", e);
            }
        }
    }
}
// @ts-ignore
window.ModuleBrowser = ModuleBrowser;
//# sourceMappingURL=ModuleBrowser.js.map