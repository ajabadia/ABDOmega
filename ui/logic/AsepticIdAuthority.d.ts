/**
 * OMEGA Era 7 - Aseptic ID Authority
 * Centralized logic for ID generation and mapping.
 */
export declare class AsepticIdAuthority {
    /**
     * Generates a canonical parameter key for the RuntimeStore.
     * Format: p.[instanceId].[paramId]
     */
    static mkParamKey(instanceId: number, paramId: number): string;
    /**
     * Generates a canonical telemetry pin key.
     * Format: t.[instanceId].[sourceId]
     */
    static mkTelemetryKey(instanceId: number, sourceId: string | number): string;
    /**
     * Generates a stable DOM ID for UI components.
     * Format: omega-ui-[role]-[instanceId]-[entityId]
     */
    static mkDomId(role: 'disp' | 'led' | 'knob', instanceId: number, entityId: string | number): string;
    /**
     * Normalizes an incoming ID (string or number) to a numeric ParamId.
     */
    static normalizeParamId(id: string | number): number;
}
//# sourceMappingURL=AsepticIdAuthority.d.ts.map