/**
 * OMEGA Logger Utility - Era 6 Aseptic Telemetry
 * Provides precision timestamps [HH:MM:SS.ms] for all console entries.
 */

export class OmegaLog {
    private static getTimestamp(): string {
        const now = new Date();
        const h = now.getHours().toString().padStart(2, '0');
        const m = now.getMinutes().toString().padStart(2, '0');
        const s = now.getSeconds().toString().padStart(2, '0');
        const ms = now.getMilliseconds().toString().padStart(3, '0');
        return `[${h}:${m}:${s}.${ms}]`;
    }

    public static info(tag: string, message: string, ...args: any[]) {
        console.log(`${this.getTimestamp()} [LOG] [${tag}] ${message}`, ...args);
    }

    public static warn(tag: string, message: string, ...args: any[]) {
        console.warn(`${this.getTimestamp()} [WARN] [${tag}] ${message}`, ...args);
    }

    public static error(tag: string, message: string, ...args: any[]) {
        console.error(`${this.getTimestamp()} [ERROR] [${tag}] ${message}`, ...args);
    }

    public static debug(tag: string, message: string, ...args: any[]) {
        console.debug(`${this.getTimestamp()} [DEBUG] [${tag}] ${message}`, ...args);
    }
}
