/**
 * OMEGA Metadata Store (TypeScript)
 * Formalizes the "Single Source of Truth" for parameters.
 */

export interface ParamDescriptor {
    id: string;
    name: string;
    min: number;
    max: number;
    default: number;
    unit?: string;
    groupId?: string;
    category?: string;
    uiControl?: string;
    cc?: number;
    options?: { value: number; label: string }[];
}

export interface GroupDescriptor {
    id: string;
    name: string;
}

export class MetadataStore {
    private parameters: Map<string, ParamDescriptor> = new Map();
    private groups: Map<string, GroupDescriptor> = new Map();
    private inventory: any[] = [];
    private isLoaded: boolean = false;
    private version: string = "5.2.0-ALPHA";
    private build: string = "397";
    private timestamp: string = new Date().toISOString();

    constructor() {}

    async ensureLoaded(): Promise<boolean> {
        if (this.isLoaded) return true;

        try {
            const rpc = window.omegaRPC;
            if (!rpc) return false;
            
            const response = await rpc.getMetadata();
            if (response && response.parameters) {
                this.parameters.clear();
                response.parameters.forEach((p: ParamDescriptor) => {
                    this.parameters.set(p.id, p);
                });
                if (response.groups) {
                    this.groups.clear();
                    response.groups.forEach((g: GroupDescriptor) => {
                        this.groups.set(g.id, g);
                    });
                }
                if (response.version) this.version = response.version;
                if (response.build) this.build = response.build;
                if (response.timestamp) this.timestamp = response.timestamp;

                this.isLoaded = true;
                return true;
            }
        } catch (e) {
            console.error("[MetadataStore] Load error:", e);
        }
        return false;
    }

    async getModulationMetadata(): Promise<any> {
        const rpc = window.omegaRPC;
        
        try {
            const res = rpc ? await rpc.send("getModulationMetadata", {}) : null;
            if (res && res.inventory && res.inventory.length > 0) {
                this.inventory = res.inventory;
            }
            return { inventory: this.inventory, sources: res?.sources || [], targets: res?.targets || [] };
        } catch (e) {
            return { inventory: this.inventory, sources: [], targets: [] };
        }
    }

    getInventoryItem(id: string): any {
        return this.inventory.find(m => m.instanceId === id || m.id === id);
    }

    getParam(id: string): ParamDescriptor | undefined {
        const p = this.parameters.get(id);
        if (!p) {
            // High verbosity for Era 5.2 diagnostic
            // console.warn(`[MetadataStore] Param NOT found: ${id}`);
        }
        return p;
    }

    getInventory(): any[] { return this.inventory; }
    isInitialized(): boolean { return this.isLoaded; }
    getVersion(): string { return this.version; }
    getBuild(): string { return this.build; }
    getTimestamp(): string { return this.timestamp; }
}

// Global instance
window.metadataStore = new MetadataStore();
