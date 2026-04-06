#pragma once

#include <cmath>
#include <array>
#include <algorithm>

namespace Omega::DSP::Engines::Korg::Prophecy {

    /**
     * @brief Korg Prophecy Waveshaper (PRP-SH-001).
     * Multi-table nonlinear waveshaper for MOSS synthesis.
     * Supports various folding and clipping algorithms.
     */
    class OscillatorPoolProphecyWaveshaper {
    public:
        static constexpr int kMaxVoices = 16;

        enum Mode { Clip, Fold, Tube, Gritty };

        struct Params {
            float drive = 1.0f;
            float mix = 1.0f;
            Mode mode = Clip;
        };

        float process(int vIdx, float input, const Params& p) {
            float x = input * p.drive;
            float shaped = 0.0f;

            switch (p.mode) {
                case Clip:
                    shaped = std::tanh(x);
                    break;
                case Fold:
                    shaped = std::sin(x * 3.14159f);
                    break;
                case Tube:
                    shaped = (x > 0.0f) ? (1.0f - std::exp(-x)) : (-1.0f + std::exp(x));
                    break;
                case Gritty:
                    shaped = (x > 0.0f) ? std::pow(x, 0.5f) : -std::pow(-x, 0.5f);
                    if (shaped > 1.0f) shaped = 1.0f;
                    if (shaped < -1.0f) shaped = -1.0f;
                    break;
            }

            return input * (1.0f - p.mix) + shaped * p.mix;
        }
    };

} // namespace Omega::DSP::Engines::Korg::Prophecy
