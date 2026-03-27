#pragma once

#include <array>
#include <cmath>
#include <cstdint>

namespace Omega::DSP::Engines::Roland::JP {

    /**
     * @brief Oscilador individual de 7 sierras (SuperSaw) para una voz.
     * Refinado en Sprint 6 con la curva polinómica de Szabo y ratios precisos.
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
         * @brief Procesa un bloque de samples estéreo para esta voz.
         * @param leftBuffer Buffer de salida izquierdo
         * @param rightBuffer Buffer de salida derecho
         * @param numSamples Cantidad de samples
         * @param baseHz Frecuencia fundamental
         * @param detune 0.0 - 1.0 (Szabo curve)
         * @param spread 0.0 - 1.0 (Stereo width)
         * @param level Nivel de salida
         */
        inline void processStereo(float* leftBuffer, float* rightBuffer, int numSamples, 
                                 float baseHz, float detune, float spread, float level) noexcept {
            if (baseHz <= 0.0f || numSamples <= 0) return;

            const float invSr = 1.0f / static_cast<float>(mSampleRate);
            const float basePhaseInc = baseHz * invSr;

            // 1. Szabo Detune Curve: f(x) = 0.002852x^2 + 0.01461x
            float d = (0.002852f * detune * detune) + (0.01461f * detune);

            // 2. Szabo Mix Curve (Parabolic)
            float x2 = detune * detune;
            float lateralGain = (-0.55366f * x2) + (0.99785f * detune) + 0.1091f;
            float centerGain = (-0.73764f * x2) + (0.00844f * detune) + 1.0f;

            // Ratios de detune precisos (Szabo measured)
            // Central osc at index 3 (0.0 offset)
            static constexpr float detuneRatios[7] = {
                -1.1444f, -0.5365f, -1.0f, 0.0f, 1.0f, 0.5365f, 1.1444f
            };

            // Pans para el spread: 0 center, 1/2 wide, 3/4 medium, 5/6 narrow
            const float pans[7] = {
                0.5f - (0.5f * spread), // L (Wide)
                0.5f + (0.5f * spread), // R (Wide)
                0.5f - (0.25f * spread), // L (Mid)
                0.5f + (0.25f * spread), // R (Mid)
                0.5f - (0.125f * spread), // L (Narrow)
                0.5f + (0.125f * spread), // R (Narrow)
                0.5f                     // Center
            };

            float vPhaseInc[7];
            float vGainsL[7];
            float vGainsR[7];

            for (int v = 0; v < 7; ++v) {
                vPhaseInc[v] = basePhaseInc * (1.0f + detuneRatios[v] * d);
                float g = (v == 6) ? centerGain : lateralGain;
                vGainsL[v] = g * std::sqrt(1.0f - pans[v]);
                vGainsR[v] = g * std::sqrt(pans[v]);
            }

            for (int i = 0; i < numSamples; ++i) {
                float sumL = 0.0f;
                float sumR = 0.0f;
                for (int v = 0; v < 7; ++v) {
                    mPhase[v] += vPhaseInc[v];
                    if (mPhase[v] >= 1.0f) mPhase[v] -= 1.0f;
                    
                    // Basic Saw with PolyBLEP
                    float ph = mPhase[v];
                    float saw = 2.0f * ph - 1.0f;
                    
                    // Simple PolyBLEP to reduce aliasing
                    if (ph < vPhaseInc[v]) {
                        float t = ph / vPhaseInc[v];
                        saw -= (t + t - t * t - 1.0f);
                    } else if (ph > 1.0f - vPhaseInc[v]) {
                        float t = (ph - 1.0f) / vPhaseInc[v];
                        saw += (t + t + t * t + 1.0f);
                    }

                    sumL += saw * vGainsL[v];
                    sumR += saw * vGainsR[v];
                }

                const float scaleFactor = 0.18f * level;
                leftBuffer[i] += sumL * scaleFactor;
                rightBuffer[i] += sumR * scaleFactor;
            }
        }

        // Legacy mono support
        inline void process(float* buffer, int numSamples, float baseHz, float detune, float level) noexcept {
            processStereo(buffer, buffer, numSamples, baseHz, detune, 0.0f, level);
        }

    private:
        double mSampleRate{ 44100.0 };
        std::array<float, 7> mPhase{};
    };

} // namespace Omega::DSP::Engines::JP
