/**
 * OMEGA Logger Utility - Era 6 Aseptic Telemetry
 * Provides precision timestamps [HH:MM:SS.ms] for all console entries.
 */
export class OmegaLog {
    static getTimestamp() {
        const now = new Date();
        const h = now.getHours().toString().padStart(2, '0');
        const m = now.getMinutes().toString().padStart(2, '0');
        const s = now.getSeconds().toString().padStart(2, '0');
        const ms = now.getMilliseconds().toString().padStart(3, '0');
        return `[${h}:${m}:${s}.${ms}]`;
    }
    static info(tag, message, ...args) {
        console.log(`${this.getTimestamp()} [LOG] [${tag}] ${message}`, ...args);
    }
    static warn(tag, message, ...args) {
        console.warn(`${this.getTimestamp()} [WARN] [${tag}] ${message}`, ...args);
    }
    static error(tag, message, ...args) {
        console.error(`${this.getTimestamp()} [ERROR] [${tag}] ${message}`, ...args);
    }
    static debug(tag, message, ...args) {
        console.debug(`${this.getTimestamp()} [DEBUG] [${tag}] ${message}`, ...args);
    }
}
//# sourceMappingURL=omega_log.js.map