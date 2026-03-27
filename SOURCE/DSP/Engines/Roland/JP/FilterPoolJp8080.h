#pragma once

#include <vector>
#include <cmath>
#include <numbers>
#include <array>
#include <algorithm>

namespace Omega::DSP::Engines::Roland::JP {

    /**
     * @brief Pool de filtros para la familia JP-808X.
     * Refinado en Sprint 6: SVF de 12/24dB con saturación no lineal optimizada.
     * [ID]: FLT-VA-008
     */
    class FilterPoolJp8080 {
    public:
        static constexpr int kMaxVoices = 16;

        struct State {
            float ic1eq[2] = {0.0f, 0.0f}; // Dos etapas para soporte de 24dB
            float ic2eq[2] = {0.0f, 0.0f};
        };

    private:
        // Soft-clipper "Roland-tuned" para preservar la pegada en resonancias altas
        inline float softClip(float x) const noexcept {
            if (x > 1.0f) return 1.0f;
            if (x < -1.0f) return -1.0f;
            return x * (1.5f - 0.5f * x * x);
        }

    public:
        void prepare(double sampleRate) {
            mSampleRate = sampleRate;
            reset();
        }

        void reset() {
            for (auto& s : mStates) {
                for (int i = 0; i < 2; ++i) {
                    s.ic1eq[i] = 0.0f;
                    s.ic2eq[i] = 0.0f;
                }
            }
        }

        /**
         * @brief Procesa el filtro para una voz.
         * @param v Índice de voz
         * @param sample Sample de entrada
         * @param cutoff Cutoff en Hz
         * @param resonance 0.0 - 1.0
         * @param mode 0: LP12, 1: BP12, 2: HP12, 3: LP24, 4: BP24, 5: HP24
         */
        float process(int v, float sample, float cutoff, float resonance, int mode = 0) {
            auto& s = mStates[v];
            
            // Warp cutoff para TPT
            float g = std::tan(static_cast<float>(std::numbers::pi * cutoff / mSampleRate));
            // Respuesta de resonancia ajustada (exponencial suave para el "grip" de Roland)
            float k = 2.0f * (1.0f - std::pow(resonance, 0.25f)); 

            // Límites de seguridad para evitar explosiones numéricas
            g = std::clamp(g, 0.0001f, 10.0f);

            auto processStage = [&](int stage, float input) -> std::array<float, 3> {
                float a1 = 1.0f / (1.0f + g * (g + k));
                float a2 = g * a1;
                float a3 = g * a2;

                float v3 = input - s.ic2eq[stage];
                float v1 = a1 * s.ic1eq[stage] + a2 * v3;
                float v2 = s.ic2eq[stage] + a2 * s.ic1eq[stage] + a3 * v3;

                s.ic1eq[stage] = 2.0f * v1 - s.ic1eq[stage];
                s.ic2eq[stage] = 2.0f * v2 - s.ic2eq[stage];

                // Saturación en el lazo para el carácter "bark" del JP
                s.ic2eq[stage] = softClip(s.ic2eq[stage] * 1.05f);

                return { v2, v1, input - k * v1 - v2 }; // { LP, BP, HP }
            };

            const bool is24dB = (mode >= 3);
            const int subMode = mode % 3; // 0:LP, 1:BP, 2:HP

            auto res1 = processStage(0, sample);
            if (!is24dB) {
                return res1[subMode];
            }

            // Para 24dB cascamos dos etapas idénticas
            auto res2 = processStage(1, res1[0]); 
            return res2[subMode];
        }

    private:
        double mSampleRate = 44100.0;
        std::array<State, kMaxVoices> mStates{};
    };

} // namespace Omega::DSP::Engines::JP
