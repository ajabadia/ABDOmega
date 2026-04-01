/**
 * preferences.ts - OMEGA Premium Preferences Logic (TypeScript Implementation)
 * Phase 15.1 - Structural Maturity
 */
export interface SystemSetting {
    id: string;
    label: string;
    tooltip: string;
    currentValue: number;
    defaultValue: number;
    minValue: number;
    maxValue: number;
    category: string;
    options?: {
        [key: string]: string;
    };
}
export declare class OMEGA_Preferences {
    private settings;
    private currentCategory;
    constructor();
    init(): Promise<void>;
    private setupTabs;
    refresh(): Promise<void>;
    render(): void;
    private setSetting;
    update(id: string, value: any): Promise<void>;
    reset(id: string): Promise<void>;
}
export declare const Preferences: OMEGA_Preferences;
//# sourceMappingURL=preferences.d.ts.map