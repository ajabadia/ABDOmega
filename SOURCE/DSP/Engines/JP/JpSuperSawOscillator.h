#pragma once

#include <array>
#include <cmath>
#include <cstdint>

namespace Omega::DSP::Engines::JP {

    /**
     * @brief Oscilador individual de 7 sierras (SuperSaw) para una voz.
     * Basado en las especificaciones de fidelidad de OMEGA (0006.txt).
     */
    class JpSuperSawOscillator {
    public:
        void prepare(double sampleRate) noexcept {
            mSampleRate = sampleRate > 0.0 ? sampleRate : 44100.0;
            reset();
        }

        void reset() noexcept {
            for (auto& ph : mPhase) ph = 0.0f;
        }

        /**
         * @brief Procesa un bloque de samples para esta voz.
         * @param buffer Bloque de salida (mono/stereo según contexto, aquí sumamos)
         * @param numSamples Cantidad de samples
         * @param baseHz Frecuencia fundamental
         * @param detune 0.0 - 1.0 (curva mHz shaped)
         * @param level Nivel de salida
         */
        inline void process(float* buffer, int numSamples, float baseHz, float detune, float level) noexcept {
            if (baseHz <= 0.0f || numSamples <= 0) return;

            const float basePhaseInc = static_cast<float>(baseHz / mSampleRate);

            // 1. Szabo Detune Curve (11th Order Polynomial Approximation)
            // Maps [0..1] input to frequency offset factor
            float x = detune;
            float x2 = x * x; float x3 = x2 * x; float x4 = x3 * x; float x5 = x4 * x;
            float d = (0.0030115f * x5 * x5 * x) - (0.0157189f * x5 * x5) + (0.0322300f * x5 * x4) 
                    - (0.0322314f * x4 * x4) + (0.0135722f * x4 * x3) + (0.0020027f * x3 * x3) 
                    - (0.0048854f * x5) + (0.0017530f * x4) + (0.0003327f * x3) 
                    - (0.0001012f * x2) + (0.0001140f * x) + 0.0000029f;

            // 2. Szabo Mix Curve (Parabolic)
            // Determinamos ganancia del oscilador central vs laterales
            float lateralGain = (-0.55366f * x2) + (0.99785f * x) + 0.1091f;
            float centerGain = (-0.73764f * x2) + (0.00844f * x) + 1.0f;

            // Ratios de detune fijos (Szabo measured)
            static constexpr float detuneRatios[7] = {
                -1.0f, -0.7379f, -0.25f, 0.0f, 0.25f, 0.7379f, 1.0f
            };

            float vPhaseInc[7];
            float vGains[7];
            for (int v = 0; v < 7; ++v) {
                vPhaseInc[v] = basePhaseInc * (1.0f + detuneRatios[v] * d);
                vGains[v] = (v == 3) ? centerGain : lateralGain;
            }

            for (int i = 0; i < numSamples; ++i) {
                float sum = 0.0f;
                for (int v = 0; v < 7; ++v) {
                    mPhase[v] += vPhaseInc[v];
                    if (mPhase[v] >= 1.0f) mPhase[v] -= 1.0f;
                    sum += (2.0f * mPhase[v] - 1.0f) * vGains[v];
                }

                // Normalización inteligente (Szabo scale factor approx)
                buffer[i] += (sum * 0.18f) * level; 
            }
        }

    private:
        double mSampleRate{ 44100.0 };
        std::array<float, 7> mPhase{};
    };

} // namespace Omega::DSP::Engines::JP
