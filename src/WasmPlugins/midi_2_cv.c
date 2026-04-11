/**
 * OMEGA WASM SDK - Pro MIDI to CV Converter
 * Era 4.1 Aseptic Implementation
 * (c) 2026 ABD OMEGA
 */

#include <stdint.h>

// --- Host Imports ---
#define WASM_IMPORT(name) __attribute__((import_module("env"), import_name(#name)))

WASM_IMPORT(omega_publish_telemetry)
extern void omega_publish_telemetry(float val);

WASM_IMPORT(omega_set_voice_freq)
extern void omega_set_voice_freq(float hz);

WASM_IMPORT(omega_set_voice_gate)
extern void omega_set_voice_gate(float gate);

WASM_IMPORT(omega_set_voice_vel)
extern void omega_set_voice_vel(float vel);

WASM_IMPORT(omega_set_voice_at)
extern void omega_set_voice_at(float pressure);

// --- Module State ---
static float g_sampleRate = 44100.0f;
static float g_targetFreq = 440.0f;
static float g_currentFreq = 440.0f;
static float g_baseFreq = 440.0f; // Freq before bend

static int g_midiChannel = 0; // 0 = OMNI
static int g_glideMode = 0;   // 0 = Time, 1 = Velocity
static float g_glideTimeMs = 0.0f;
static int g_bendRange = 2;    // semitones
static int g_atMode = 0;      // 0 = Mono, 1 = Poly

static float g_bendOffset = 1.0f; // Multiplier
static float g_glideStep = 0.0f;

// Tables
static const float SEMITONE_TABLE[12] = {
    8.1757989156f,  // C
    8.6619572180f,  // C#
    9.1770239974f,  // D
    9.7227182413f,  // D#
    10.3008611535f, // E
    10.9133822323f, // F
    11.5623257097f, // F#
    12.2498573744f, // G
    12.9782717994f, // G#
    13.7500000000f, // A
    14.5676175474f, // A#
    15.4338531643f  // B
};

/**
 * @brief MIDI Note to Hz conversion (Low CPU, No powf)
 */
static float midi_to_hz(int note) {
    if (note < 0) note = 0;
    if (note > 127) note = 127;
    int octave = note / 12;
    int semi = note % 12;
    float hz = SEMITONE_TABLE[semi];
    // Scale by octave
    for (int i = 0; i < octave; i++) hz *= 2.0f;
    return hz;
}

/**
 * @brief Lifecycle: Init (called by host)
 */
void omega_init(float sampleRate) {
    g_sampleRate = sampleRate;
}

/**
 * @brief Param Handler
 */
void omega_on_param(int paramId, float value) {
    // Note: paramId is derived from the manifest order or explicit ID mapping in VA 2.2
    // For this prototype, we'll use a simple index mapping (can be refined)
    switch(paramId) {
        case 0: g_midiChannel = (int)value; break;
        case 1: g_glideMode = (int)value; break;
        case 2: g_glideTimeMs = value; break;
        case 3: g_bendRange = (int)value; break;
        case 4: g_atMode = (int)value; break;
    }
}

/**
 * @brief MIDI Handler
 */
void omega_on_midi(uint8_t status, uint8_t d1, uint8_t d2) {
    uint8_t channel = (status & 0x0F) + 1;
    uint8_t type = status & 0xF0;

    // Channel Check
    if (g_midiChannel != 0 && g_midiChannel != channel) return;

    omega_publish_telemetry(1.0f); // Fast pulse

    // Note On
    if (type == 0x90 && d2 > 0) {
        g_baseFreq = midi_to_hz(d1);
        g_targetFreq = g_baseFreq * g_bendOffset;

        // If Glide is OFF, jump immediately
        if (g_glideTimeMs <= 0.001f) {
            g_currentFreq = g_targetFreq;
            omega_set_voice_freq(g_currentFreq);
        } else {
            // Calculate Glide Step (Linear Frequency Approach)
            if (g_glideMode == 0) { // Time Constant
                float delta = g_targetFreq - g_currentFreq;
                float samples = (g_glideTimeMs / 1000.0f) * g_sampleRate;
                g_glideStep = delta / samples;
            } else { // Velocity Constant (Simulated as fixed Hz/sample)
                g_glideStep = (g_targetFreq > g_currentFreq) ? 1.0f : -1.0f; // Placeholder
            }
        }

        omega_set_voice_vel(d2 / 127.0f);
        omega_set_voice_gate(1.0f);
    }
    // Note Off
    else if (type == 0x80 || (type == 0x90 && d2 == 0)) {
        omega_set_voice_gate(0.0f);
    }
    // Pitch Bend (0xEn)
    else if (type == 0xE0) {
        uint16_t bend = (d2 << 7) | d1; // 0..16383 (Center 8192)
        float normalized = (bend - 8192) / 8192.0f; // -1..1
        // Bend Approximation: 2^(range * norm / 12)
        // For range 2 semitones: norm 1.0 -> 2^(2/12) approx 1.122
        g_bendOffset = 1.0f + (normalized * (g_bendRange / 12.0f) * 0.7f); // Linear approximation for prototype
        g_targetFreq = g_baseFreq * g_bendOffset;
        
        if (g_glideTimeMs <= 0.001f) {
            g_currentFreq = g_targetFreq;
            omega_set_voice_freq(g_currentFreq);
        }
    }
    // Aftertouch (Channel: 0xDn, Poly: 0xAn)
    else if (type == 0xD0 && g_atMode == 0) {
        omega_set_voice_at(d1 / 127.0f);
    }
    else if (type == 0xA0 && g_atMode == 1) {
        omega_set_voice_at(d2 / 127.0f);
    }
}

/**
 * @brief DSP Process
 */
void omega_process(float* buffer, int length) {
    if (g_currentFreq != g_targetFreq) {
        for (int i = 0; i < length; i++) {
            if (g_currentFreq < g_targetFreq) {
                g_currentFreq += g_glideStep;
                if (g_currentFreq > g_targetFreq) g_currentFreq = g_targetFreq;
            } else {
                g_currentFreq += g_glideStep;
                if (g_currentFreq < g_targetFreq) g_currentFreq = g_targetFreq;
            }
        }
        omega_set_voice_freq(g_currentFreq);
    }
}
