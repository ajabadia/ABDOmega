/**
 * OMEGA Logger Utility - Era 6 Aseptic Telemetry
 * Provides precision timestamps [HH:MM:SS.ms] for all console entries.
 */
export declare class OmegaLog {
    private static excludedTags;
    private static filtersActive;
    private static getTimestamp;
    static setFilter(tag: string, active: boolean): void;
    static toggleTelemetry(): void;
    private static syncUI;
    private static shouldLog;
    static info(tag: string, message: string, ...args: any[]): void;
    static warn(tag: string, message: string, ...args: any[]): void;
    static error(tag: string, message: string, ...args: any[]): void;
    static debug(tag: string, message: string, ...args: any[]): void;
}
//# sourceMappingURL=omega_log.d.ts.map