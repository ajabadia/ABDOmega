#pragma once

#include <vector>
#include <cmath>
#include <array>
#include <algorithm>

namespace Omega {
namespace DSP {
namespace Engines {
namespace Roland {
namespace JP {

    /**
     * @brief Pool de filtros para la familia JP-808X.
     * Refinado en Build 213: SVF de 12/24dB con saturación no lineal optimizada.
     * Soporta 6 modos (LP12, BP12, HP12, LP24, BP24, HP24).
     */
    class FilterPoolJp8080 {
    public:
        static constexpr int kMaxVoices = 16;

        struct State {
            float ic1eq[2] = {0.0f, 0.0f}; 
            float ic2eq[2] = {0.0f, 0.0f};
        };

    private:
        // Soft-clipper "Roland-tuned"
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
            
            // Warp cutoff para TPT (Usando PI manual para compatibilidad)
            const float pi = 3.14159265358979323846f;
            float g = std::tan(pi * cutoff / static_cast<float>(mSampleRate));
            
            // Respuesta de resonancia ajustada (exponencial suave para el "grip" de Roland)
            float k = 2.0f * (1.0f - std::pow(resonance, 0.25f)); 

            // Límites de seguridad manuales (std::clamp es C++17, pero lo implementamos manual)
            if (g < 0.0001f) g = 0.0001f;
            if (g > 10.0f) g = 10.0f;

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

            // Para 24dB cascamos las etapas
            auto res2 = processStage(1, res1[subMode]); 
            return res2[subMode];
        }

    private:
        double mSampleRate = 44100.0;
        std::array<State, kMaxVoices> mStates{};
    };

} // namespace JP
} // namespace Roland
} // namespace Engines
} // namespace DSP
} // namespace Omega
