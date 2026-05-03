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
        console.log("[InventoryStore] ensureLoaded called. isLoaded:", this.isLoaded);
        if (this.isLoaded) return true;
        if (this.loadPromise) return this.loadPromise;

        this.loadPromise = (async () => {
            console.log("[InventoryStore] Starting fetch via RPC...");
            try {
                const rpc = (window as any).omegaRPC;
                if (!rpc) {
                    console.error("[InventoryStore] RPC Bridge NOT FOUND!");
                    return false;
                }

                console.log("[InventoryStore] Sending 'getInventory' command...");
                const response = await rpc.send("getInventory", {});
                console.log("[InventoryStore] RAW RESPONSE:", response);
                
                // Era 6.3 Standard: Data is in 'payload', and inventory wraps it in 'components'
                const rawData = response.payload || response;
                const components = rawData.components || rawData.items || (Array.isArray(rawData) ? rawData : null);
                
                if (components && Array.isArray(components)) {
                    console.log(`[InventoryStore] Success. Loaded ${components.length} components.`);
                    this.items.clear();
                    components.forEach((item: InventoryItem) => {
                        this.items.set(item.id, item);
                    });
                    this.isLoaded = true;
                    this.notify();
                    return true;
                } else {
                    console.warn("[InventoryStore] Response is not a valid array:", components);
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
