/**
 * OMEGA Era 6.1 - Hardened Authoritative Contract Types
 * Aseptic Contractual Paradigm.
 */
// --- Type Guards ---
export function isRpcEnvelope(value) {
    return !!value && typeof value === 'object' && 'type' in value;
}
export function isUiEvent(value) {
    if (!isRpcEnvelope(value))
        return false;
    return value.type === 'PARAMCHANGE' || value.type === 'onStateUpdate' || value.type === 'telemetryUpdate';
}
export function isParamChangeEvent(value) {
    return isRpcEnvelope(value) && value.type === 'PARAMCHANGE';
}
export function isStateUpdateEvent(value) {
    return isRpcEnvelope(value) && value.type === 'onStateUpdate';
}
export function isTelemetryUpdateEvent(value) {
    return isRpcEnvelope(value) && value.type === 'telemetryUpdate';
}
// --- Normalization Shunt ---
export function normalizeIncomingEvent(value) {
    if (!isRpcEnvelope(value))
        return null;
    // Normalización Era 6.1: PARAM_CHANGE legacy -> PARAMCHANGE nominal
    if (value.type === 'PARAM_CHANGE') {
        const raw = value;
        return {
            type: 'PARAMCHANGE',
            id: String(raw.target ?? raw.id ?? ''),
            value: Number(raw.value ?? 0),
        };
    }
    // Asegurar que si el tipo ya es el nominal, lo devolvemos tal cual para que el rpc.ts lo despache
    return value;
}
//# sourceMappingURL=omega_types.js.map