#pragma once

/**
 * OMEGA MODULE SDK - Era 7.2.3
 * Minimal Header for C/C++ Developers
 */

extern "C" {
    // --- HOST IMPORTS (Functions provided by OMEGA) ---
    
    /** Returns current system sample rate */
    extern float omega_get_sample_rate();
    
    /** Returns current processing block size */
    extern int omega_get_block_size();
    
    /** Publishes a value to the UI telemetry system (e.g. for LEDs or Scopes) */
    extern void omega_publish_telemetry(float val);
    
    /** Logs a message to the OMEGA terminal */
    extern void omega_log(const char* msg);

    // VOICE CONTROL (For Engine modules)
    extern void omega_set_voice_freq(float hz);
    extern void omega_set_voice_gate(float gate);
    extern void omega_set_voice_vel(float vel);
    extern void omega_set_voice_at(float pressure);

    // --- MODULE EXPORTS (Functions you must implement) ---

    /** Must return a pointer to the JSON contract string */
    const char* omega_get_contract();

    /** Main audio/signal processing loop */
    void omega_process(float* buffer, int length);

    /** Called when a parameter changes from the UI */
    void omega_set_param(int paramId, float value);
}
