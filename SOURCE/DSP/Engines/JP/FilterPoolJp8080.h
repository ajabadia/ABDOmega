#pragma once

#include <vector>
#include <cmath>
#include <numbers>
#include <array>

namespace Omega::DSP::Engines::JP {

    /**
     * @brief Pool de filtros para la familia JP-808X.
     * Implementa un SVF (State Variable Filter) con resonancia agresiva y saturación.
     */
    class FilterPoolJp8080 {
    public:
        static constexpr int kMaxVoices = 16;

        struct State {
            float ic1eq = 0.0f;
            float ic2eq = 0.0f;
        };

        void prepare(double sampleRate) {
            mSampleRate = sampleRate;
            for (auto& s : mStates) {
                s.ic1eq = 0.0f;
                s.ic2eq = 0.0f;
            }
        }

        void reset() {
            for (auto& s : mStates) {
                s.ic1eq = 0.0f;
                s.ic2eq = 0.0f;
            }
        }

        /**
         * @brief Procesa el filtro para una voz.
         * @param v Índice de voz
         * @param sample Sample de entrada
         * @param cutoff Cutoff en Hz
         * @param resonance 0.0 - 1.0
         * @param mode 0: LP, 1: BP, 2: HP
         */
        float process(int v, float sample, float cutoff, float resonance, int mode = 0) {
            // TPT SVF Implementation (Andy Simper)
            float g = std::tan(static_cast<float>(std::numbers::pi * cutoff / mSampleRate));
            float k = 2.0f - (2.0f * resonance); // Factor de resonancia (Q inverso)
            float a1 = 1.0f / (1.0f + g * (g + k));
            float a2 = g * a1;
            float a3 = g * a2;

            float v3 = sample - mStates[v].ic2eq;
            float v1 = a1 * mStates[v].ic1eq + a2 * v3;
            float v2 = mStates[v].ic2eq + a2 * mStates[v].ic1eq + a3 * v3;

            mStates[v].ic1eq = 2.0f * v1 - mStates[v].ic1eq;
            mStates[v].ic2eq = 2.0f * v2 - mStates[v].ic2eq;

            // Saturation suave (Roland-like)
            v2 = std::tanh(v2 * 1.2f); 

            switch (mode) {
                case 1: return v1; // BP
                case 2: return sample - k * v1 - v2; // HP
                default: return v2; // LP
            }
        }

    private:
        double mSampleRate = 44100.0;
        std::array<State, kMaxVoices> mStates{};
    };

} // namespace Omega::DSP::Engines::JP
