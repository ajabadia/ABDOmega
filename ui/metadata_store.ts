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
    private isLoaded: boolean = false;
    private version: string = "1.0.0";
    private build: string = "0";
    private timestamp: string = "";

    constructor() {}

    async ensureLoaded(): Promise<boolean> {
        if (this.isLoaded) return true;

        try {
            console.log("[MetadataStore] Attempting to load metadata via omegaRPC...");
            // @ts-ignore - window.omegaRPC defined globally
            if (!(window as any).omegaRPC) {
                console.warn("[MetadataStore] window.omegaRPC is missing!");
                return false;
            }
            const response = await (window as any).omegaRPC.getMetadata();
            console.log("[MetadataStore] RPC Response received:", response ? "SUCCESS" : "EMPTY");
            if (response && response.parameters) {
                response.parameters.forEach((p: ParamDescriptor) => {
                    this.parameters.set(p.id, p);
                });
                if (response.groups) {
                    response.groups.forEach((g: GroupDescriptor) => {
                        this.groups.set(g.id, g);
                    });
                }
                if (response.version) this.version = response.version;
                if (response.build !== undefined) this.build = response.build.toString();
                if (response.timestamp) this.timestamp = response.timestamp;

                this.isLoaded = true;
                return true;
            }
        } catch (e) {
            console.error("[MetadataStore] Failed to load metadata:", e);
        }
        return false;
    }

    getParam(id: string): ParamDescriptor | undefined {
        return this.parameters.get(id);
    }

    getAllParams(): ParamDescriptor[] {
        return Array.from(this.parameters.values());
    }

    getGroup(id: string): GroupDescriptor | undefined {
        return this.groups.get(id);
    }

    getVersion(): string { return this.version; }
    getBuild(): string { return this.build; }
    getTimestamp(): string { return this.timestamp; }
}

// Global instance for runtime
// @ts-ignore
window.metadataStore = new MetadataStore();
