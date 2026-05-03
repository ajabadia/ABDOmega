import { OmegaLog } from './omega_log.js';
export class ModuleRegistry {
    static catalog = new Map();
    static constructors = new Map();
    static register(id, constructor) {
        this.constructors.set(id, constructor);
        OmegaLog.info("REGISTRY", `Registered Constructor: ${id}`);
    }
    static getConstructor(id) {
        return this.constructors.get(id);
    }
    static async bootstrap() {
        OmegaLog.info("REGISTRY", "Building Unified Era 7 Catalog...");
        const win = window;
        const inventoryStore = win.inventoryStore;
        const schemaStore = win.schemaStore;
        if (!inventoryStore) {
            OmegaLog.error("REGISTRY", "InventoryStore NOT FOUND during bootstrap");
            return;
        }
        const inventory = inventoryStore.getAllItems?.() || [];
        OmegaLog.info("REGISTRY", `Probing ${inventory.length} inventory items...`);
        this.catalog.clear();
        // 1. Map all inventory items
        inventory.forEach((item) => {
            if (!item || !item.id)
                return;
            this.catalog.set(item.id, {
                id: item.id,
                name: item.name || item.id,
                family: item.family || 'utility',
                hasInventory: true,
                hasSchema: false,
                isInstantiable: false
            });
        });
        // 2. Overlay schemas
        if (schemaStore) {
            this.catalog.forEach((entry, id) => {
                const schema = schemaStore.getSchema?.(id);
                if (schema) {
                    entry.hasSchema = true;
                    entry.schema = schema;
                    entry.isInstantiable = entry.hasInventory && entry.hasSchema;
                }
            });
        }
        OmegaLog.info("REGISTRY", `Catalog Ready. ${this.catalog.size} modules found, ${Array.from(this.catalog.values()).filter(m => m.isInstantiable).length} instantiable.`);
    }
    static getModuleDescriptor(id) {
        return this.catalog.get(id);
    }
    static getInstantiableModules() {
        return Array.from(this.catalog.values()).filter(m => m.isInstantiable);
    }
}
//# sourceMappingURL=ModuleRegistry.js.map