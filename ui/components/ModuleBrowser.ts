/**
 * OMEGA Module Browser (Integrated Registry)
 * Handles module discovery, categorization, and instantiation.
 */

export class ModuleBrowser {
    private el: HTMLElement | null = null;
    private grid: HTMLElement | null = null;
    private categories: HTMLElement | null = null;
    private detail: HTMLElement | null = null;
    private searchInput: HTMLInputElement | null = null;

    private catalog: any[] = [];
    private currentFilter: string = 'ALL';
    private currentSearch: string = '';
    private selectedModule: any = null;

    constructor() {
        this.setupListeners();
    }

    private ensureElements(): boolean {
        if (this.el) return true;
        this.el = document.getElementById('module-browser-modal');
        this.grid = document.getElementById('module-registry-grid');
        this.categories = document.getElementById('module-category-list');
        this.detail = document.getElementById('module-detail-panel');
        this.searchInput = document.getElementById('module-search') as HTMLInputElement;
        return !!(this.el && this.grid && this.categories && this.detail && this.searchInput);
    }

    public async open() {
        if (!this.ensureElements()) return;
        this.el!.style.display = 'flex';
        await this.fetchCatalog();
        this.render();
    }

    private async fetchCatalog() {
        // @ts-ignore
        if (window.omegaRPC) {
            try {
                // @ts-ignore
                const resp = await window.omegaRPC.send("listCatalog", {});
                if (resp && resp.components) {
                    this.catalog = resp.components;
                    // Cache globally so ModuleManager can resolve descriptors
                    // without re-fetching or depending on metadataStore.inventory.
                    (window as any).omegaCatalog = Object.fromEntries(
                        resp.components.map((c: any) => [c.id, c])
                    );
                }
            } catch (e) {
                console.error("[ModuleBrowser] Failed to fetch catalog:", e);
            }
        }
    }

    private render() {
        this.renderCategories();
        this.renderGrid();
        this.renderDetail();
    }

    private renderCategories() {
        if (!this.categories) return;
        
        const families = ['ALL', ...new Set(this.catalog.map(c => c.family))];
        this.categories.innerHTML = families.map(f => `
            <div class="cat-item ${this.currentFilter === f ? 'active' : ''}" data-family="${f}">
                ${f.toUpperCase()}
            </div>
        `).join('');

        this.categories.querySelectorAll('.cat-item').forEach(item => {
            item.addEventListener('click', (e: any) => {
                this.currentFilter = e.target.dataset.family;
                this.render();
            });
        });
    }

    private renderGrid() {
        if (!this.grid) return;

        const filtered = this.catalog.filter(c => {
            const isVisible = c.visible !== false;
            const matchesFam = this.currentFilter === 'ALL' || c.family === this.currentFilter;
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
            card.addEventListener('click', (e: any) => {
                const id = e.currentTarget.dataset.id;
                this.selectedModule = this.catalog.find(c => c.id === id);
                this.render();
            });
        });
    }

    private renderDetail() {
        if (!this.detail) return;

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

    private getIconForModule(m: any): string {
        // [VISION 2.2.0] - Path Autonomy: We try to load illustration based on ID by default
        const id = m.id || m.componentId;
        const autoPath = `assets/modules/${id}/illustration.svg`;
        
        // Fallback to emoji if needed
        const icons: any = {
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

    private setupListeners() {
        // Using a slight delay to ensure elements exist if constructor called early
        setTimeout(() => {
            if (!this.ensureElements()) return;
            
            this.searchInput?.addEventListener('input', (e: any) => {
                this.currentSearch = e.target.value;
                this.renderGrid();
            });
        }, 500);
    }

    private async addModule(componentId: string) {
        // @ts-ignore
        if (window.omegaRPC) {
            try {
                // @ts-ignore
                const resp = await window.omegaRPC.send("addModule", { componentId });
                if (resp && !resp.error) {
                    // Close browser on success
                    this.el!.style.display = 'none';
                    console.log("[ModuleBrowser] Module added successfully:", componentId);
                    
                    // The backend will notify onStateUpdate, which will refresh the rack automatically.
                } else {
                    alert("Failed to add module: " + (resp.error || "Unknown error"));
                }
            } catch (e) {
                console.error("[ModuleBrowser] RPC Error adding module:", e);
            }
        }
    }
}

// @ts-ignore
window.ModuleBrowser = ModuleBrowser;
