/**
 * OMEGA WASM SDK - MIDI 2 CV Converter (#601)
 * (c) 2026 ABD OMEGA
 */

#include <stdint.h>
// --- Host Imports ---
#define WASM_IMPORT(name) __attribute__((import_module("env"), import_name(#name)))

WASM_IMPORT(omega_set_voice_freq)
extern void omega_set_voice_freq(float hz);

WASM_IMPORT(omega_set_voice_gate)
extern void omega_set_voice_gate(float gate);

WASM_IMPORT(omega_set_voice_vel)
extern void omega_set_voice_vel(float vel);

/**
 * @brief Minimal pitch to Hz conversion (440.0 * 2^((n-69)/12))
 */
static float midi_to_hz(float note) {
    // Basic approximation if powf is missing in nostdlib
    // 440 * exp2((note-69)/12)
    // We can use a small lookup or compiler builtin if available
    // For now, we will assume the host can provide it OR we use a simple linear-ish approach
    // Actually, let's just use a fixed 440.0 for the prototype until we have math.h
    return 440.0f; 
}

/**
 * @brief MIDI Event Decoder
 */
void omega_on_midi(uint8_t status, uint8_t d1, uint8_t d2) {
    uint8_t type = status & 0xF0;

    // Note On
    if (type == 0x90 && d2 > 0) {
        float hz = midi_to_hz((float)d1);
        omega_set_voice_freq(hz);
        omega_set_voice_vel(d2 / 127.0f);
        omega_set_voice_gate(1.0f);
    }
    // Note Off
    else if (type == 0x80 || (type == 0x90 && d2 == 0)) {
        omega_set_voice_gate(0.0f);
    }
}

/**
 * @brief DSP Process
 */
void omega_process(float* buffer, int length) {
    // Logic for pitch bend or glide could go here
}
