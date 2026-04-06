#pragma once

#include <cstdint>

namespace Omega {
namespace Core {
namespace Providers {

    /**
     * @brief Canonical Telemetry Signal Indices for OMEGA (Synced with UI/RPC).
     * [Architecture]: Defined in Core/Providers to ensure consistent indexing 
     * across Audio Engine, Visualization UI, and RPC layers.
     * [Sync]: These names match RpcTelemetryController.cpp to avoid UI breakage.
     */
    enum class TelemetryIndex : uint32_t {
        // Audio Signals (0-15)
        Audio_DCO_Main    = 0,
        Audio_DCO_Sub     = 1,
        Audio_Noise       = 2,
        Audio_VCF_Out     = 3,
        Audio_HPF_Out     = 4,
        Audio_Bus_PreFX   = 5,
        Audio_FX_Out      = 6,
        Audio_Master_Out  = 7,

        // Modulation Sources (16-31)
        Mod_LFO1          = 16,
        Mod_LFO2          = 17,
        Mod_ENV1_Amp      = 18,
        Mod_ENV2_Filter   = 19,
        Mod_EnvFollower   = 20,
        Mod_ModWheel      = 21,
        Mod_Pitch         = 22,
        Midi_Traffic      = 23,

        // Performance / MIDI (32-47)
        Perf_Midi_Gate    = 32,
        Perf_Midi_Pitch   = 33,
        Perf_Midi_Vel     = 34,

        // System / Debug (48-63)
        Sys_Cpu_Load      = 48,
        Sys_Voice_Count   = 49,
        
        MaxSignals        = 64
    };

} // namespace Providers
} // namespace Core
} // namespace Omega
