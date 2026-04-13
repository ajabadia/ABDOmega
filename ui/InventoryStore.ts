/**
 * OMEGA Inventory Store (Era 6)
 * Flat catalog of all available module types (components).
 */

import { BaseStore } from './runtimeStores.js';

export interface InventoryItem {
    id: string;
    name: string;
    description?: string;
    category: string;
    hp: number;
}

export class InventoryStore extends BaseStore {
    private items: Map<string, InventoryItem> = new Map();
    private isLoaded: boolean = false;
    private loadPromise: Promise<boolean> | null = null;

    async ensureLoaded(): Promise<boolean> {
        if (this.isLoaded) return true;
        if (this.loadPromise) return this.loadPromise;

        this.loadPromise = (async () => {
            try {
                const rpc = (window as any).omegaRPC;
                if (!rpc) return false;

                const response = await rpc.send("getInventory", {});
                const components = response.components || response.items || response;
                if (components && Array.isArray(components)) {
                    this.items.clear();
                    components.forEach((item: InventoryItem) => {
                        this.items.set(item.id, item);
                    });
                    this.isLoaded = true;
                    this.notify();
                    return true;
                }
            } catch (e) {
                console.error("[InventoryStore] Load error:", e);
            } finally {
                this.loadPromise = null;
            }
            return false;
        })();

        return this.loadPromise;
    }

    getItem(id: string): InventoryItem | undefined {
        return this.items.get(id);
    }

    getAllItems(): InventoryItem[] {
        return Array.from(this.items.values());
    }
}

// Global instance
(window as any).inventoryStore = new InventoryStore();
