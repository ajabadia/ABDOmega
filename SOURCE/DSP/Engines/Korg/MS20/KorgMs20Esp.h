#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <array>
#include <cmath>

namespace Omega::DSP::Engines::Korg::MS20 {

    /**
     * @brief Emulación del External Signal Processor (ESP) del MS-20.
     */
    class KorgMs20Esp {
    public:
        struct Result {
            float pitch = 0.0f;
            float envelope = 0.0f;
            bool trigger = false;
        };

        Result process(float input) noexcept {
            Result r;
            r.envelope = std::abs(input) * 0.8f; // Simplificado
            r.pitch = 0.0f;
            r.trigger = (r.envelope > 0.1f);
            return r;
        }
    };

} // namespace Omega::DSP::Engines::Korg::MS20
