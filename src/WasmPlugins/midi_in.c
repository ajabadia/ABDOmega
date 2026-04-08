/**
 * OMEGA WASM SDK - MIDI IN Bridge (#501)
 * (c) 2026 ABD OMEGA
 */

#include <stdint.h>

// --- Host Imports ---
#define WASM_IMPORT(name) __attribute__((import_module("env"), import_name(#name)))

WASM_IMPORT(omega_publish_telemetry)
extern void omega_publish_telemetry(float value);

// --- Plugin State ---
static int g_target_channel = 0; // 0 = OMNI

/**
 * @brief MIDI Message Received from Host
 */
void omega_on_midi(uint8_t status, uint8_t d1, uint8_t d2) {
    int msg_channel = (status & 0x0F) + 1;
    
    // 1. Channel Filtering
    if (g_target_channel != 0 && msg_channel != g_target_channel) {
        return;
    }

    // 2. Telemetry Activity
    omega_publish_telemetry(1.0f);

    // 3. Forward to Modular Bus (Mapping shared memory for VoiceState)
    // In VA 2.1.W, the modularMidi buffer is at a known host-offset.
    // For this prototype, we assume the host fills state.modularMidi 
    // after calling this.
}

/**
 * @brief Per-sample DSP loop (Standard OMEGA contract)
 */
void omega_process(float* buffer, int length) {
    // MIDI IN doesn't process audio, just bridges control.
    // We could decay the activity LED here if needed.
}

/**
 * @brief Parameter Update
 */
void omega_on_param(int paramId, float value) {
    if (paramId == 0) { // midi_channel
        g_target_channel = (int)value;
    }
}
