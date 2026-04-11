/**
 * OMEGA WASM SDK - MIDI IN Bridge (#501)
 * (c) 2026 ABD OMEGA
 */

#include <stdint.h>

// --- Host Imports ---
#define WASM_IMPORT(name) __attribute__((import_module("env"), import_name(#name)))

WASM_IMPORT(omega_publish_telemetry)
extern void omega_publish_telemetry(float value);

/**
 * @brief MIDI Message Received from Host
 */
void omega_on_midi(uint8_t status, uint8_t d1, uint8_t d2) {
    // 1. Telemetry Activity (Direct Peak-Hold)
    omega_publish_telemetry(1.0f);

    // 2. Data Propagation
    // The host handles the routing of the global MIDI buffer.
    // This hook is for Reactive Visuals and Custom Protocol transformations.
}

/**
 * @brief Per-sample DSP loop (Standard OMEGA contract)
 */
void omega_process(float* buffer, int length) {
    // MIDI IN doesn't process audio, just bridges control.
}

/**
 * @brief Parameter Update
 * [Era 4.1] Simplified: No channel filtering for this module.
 */
void omega_on_param(int paramId, float value) {
    // No parameters for the aseptic MIDI Bridge
}
