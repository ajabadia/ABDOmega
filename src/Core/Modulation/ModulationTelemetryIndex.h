#pragma once

#include <cstdint>

namespace Omega {
    namespace Core {
        namespace Modulation {

    /**
     * @brief Standardized indices for the ModulationTelemetryHub.
     * 
     * Split into two ranges:
     * - 0 to 31: Control/Modulation signals (updated per block).
     * - 32 to 63: High-speed/Audio signals (sub-sampled every 32 samples).
     */
    enum class TelemetryIndex : int {
        // --- Modulation Signals (0-31: Block-rate) ---
        // Range 0-7: LFOs
        Mod_LFO1           = 0, // role: MOD_LFO
        Mod_LFO2           = 1,
        
        // Range 8-15: Envelopes
        Mod_ENV1_Amp       = 8, // role: MOD_ENV
        Mod_ENV2_Filter    = 9,
        
        // Range 16-23: Dynamic/Input
        Mod_EnvFollower    = 16, // role: MOD_SOURCE
        Mod_ModWheel       = 17, // role: MOD_SOURCE
        Mod_PitchBend      = 18,
        Mod_Macro1         = 19,
        Mod_Pitch          = 20, // role: MOD_PITCH (freq in Hz)
        
        // --- Audio Signals (32-63: Sub-sampled) ---
        // Range 32-39: Voice-level Taps
        Audio_DCO_Main     = 32, // role: LOCAL_OSC (pre-filter sum)
        Audio_DCO_Sub      = 33,
        Audio_Noise        = 34,
        Audio_VCF_Out      = 35, // role: LOCAL_FILTER
        Audio_HPF_Out      = 36,
        
        // Range 40-47: Global/Bus Taps
        Audio_Bus_PreFX    = 40, // role: GLOBAL_BUS (multi-voice sum)
        Audio_FX_Out       = 41, // role: GLOBAL_BUS (dry/wet mix)
        Audio_Master_Out   = 47, // role: GLOBAL_MASTER (final system out)
        
        // --- Virtual/Event Signals (64+) ---
        Midi_Traffic       = 64  // role: MIDI_EVENTS
    };

} // namespace Modulation
} // namespace Core
} // namespace Omega
