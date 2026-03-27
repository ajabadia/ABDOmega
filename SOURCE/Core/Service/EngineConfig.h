#pragma once

#include "../../DSP/Engines/Modular/EngineTypes.h"

namespace Omega::Core::Service {

    using namespace ::Omega::DSP::Engines::Modular;

    /**
     * @brief Configuración inmutable para una sola voz.
     */
    struct VoiceConfig {
        OscillatorMode oscMode { OscillatorMode::JunoDco };
        FilterType filterType { FilterType::JunoIR3109 };
        float cutoff { 2000.0f };
        float resonance { 0.2f };
        float lfoRate { 1.0f };
        bool lfoEnabled { false };
    };

    /**
     * @brief Snapshot de configuración completa para el motor.
     */
    struct EngineConfig {
        VoiceConfig voices[16];
        float masterGainDb { 0.0f };
        float chorusMix { 0.0f };
        bool chorusEnabled { false };
    };

} // namespace Omega::Core::Service
