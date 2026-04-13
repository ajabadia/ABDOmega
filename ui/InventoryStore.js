/**
 * OMEGA Inventory Store (Era 6)
 * Flat catalog of all available module types (components).
 */
import { BaseStore } from './runtimeStores.js';
export class InventoryStore extends BaseStore {
    items = new Map();
    isLoaded = false;
    loadPromise = null;
    async ensureLoaded() {
        if (this.isLoaded)
            return true;
        if (this.loadPromise)
            return this.loadPromise;
        this.loadPromise = (async () => {
            try {
                const rpc = window.omegaRPC;
                if (!rpc)
                    return false;
                const response = await rpc.send("getInventory", {});
                const components = response.components || response.items || response;
                if (components && Array.isArray(components)) {
                    this.items.clear();
                    components.forEach((item) => {
                        this.items.set(item.id, item);
                    });
                    this.isLoaded = true;
                    this.notify();
                    return true;
                }
            }
            catch (e) {
                console.error("[InventoryStore] Load error:", e);
            }
            finally {
                this.loadPromise = null;
            }
            return false;
        })();
        return this.loadPromise;
    }
    getItem(id) {
        return this.items.get(id);
    }
    getAllItems() {
        return Array.from(this.items.values());
    }
}
// Global instance
window.inventoryStore = new InventoryStore();
//# sourceMappingURL=InventoryStore.js.map