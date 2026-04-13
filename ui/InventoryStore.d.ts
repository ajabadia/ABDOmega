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
export declare class InventoryStore extends BaseStore {
    private items;
    private isLoaded;
    private loadPromise;
    ensureLoaded(): Promise<boolean>;
    getItem(id: string): InventoryItem | undefined;
    getAllItems(): InventoryItem[];
}
//# sourceMappingURL=InventoryStore.d.ts.map