#pragma once

#include <cmath>
#include <array>

namespace Omega::DSP::Engines::Juno {

    /**
     * @brief Filtro IR3109 (LPF 24dB/oct) para Juno MVP.
     * [Fidelity]: Implementación TPT (Topology Preserving Transform) de 4 polos.
     * Incluye compensación de ganancia básica durante la resonancia.
     */
    class JunoIr3109Filter {
    public:
        void prepare(double sr) noexcept {
            mSampleRate = sr;
            reset();
        }

        void reset() noexcept {
            for (auto& s : mS) s = 0.0f;
        }

        void setParams(float cutoffHz, float resonance) noexcept {
            // Pre-warping para el mapeo S-to-Z
            float g = std::tan(3.14159265359f * cutoffHz / float(mSampleRate));
            mG = g / (1.0f + g);
            
            // Resonancia mapeada (0..1 a 0..4 en ladder clásica)
            mK = resonance * 3.95f; // Evitamos el 4.0 exacto para prevenir explosión numérica sin clipping
            
            // Compensación de ganancia (el Juno/Moog pierden graves al subir resonancia)
            float g4 = mG * mG * mG * mG;
            mAlpha = 1.0f / (1.0f + mK * g4);
        }

        /**
         * @brief Procesa una muestra.
         * [AudioThreadSafety]: Optimizado sin vtables ni saltos condicionales pesados.
         */
        float process(float x) noexcept {
            // 4-pole TPT Ladder
            // [Optimization]: Use pre-calculated mAlpha to avoid division and pow in sample loop
            float sigma = mG * mG * mG * mS[0] + mG * mG * mS[1] + mG * mS[2] + mS[3];
            
            float u = (x - mK * sigma) * mAlpha;

            // Etapa 1
            float v = (u - mS[0]) * mG;
            float y1 = v + mS[0];
            mS[0] = y1 + v;

            // Etapa 2
            v = (y1 - mS[1]) * mG;
            float y2 = v + mS[1];
            mS[1] = y2 + v;

            // Etapa 3
            v = (y2 - mS[2]) * mG;
            float y3 = v + mS[2];
            mS[2] = y3 + v;

            // Etapa 4
            v = (y3 - mS[3]) * mG;
            float y4 = v + mS[3];
            mS[3] = y4 + v;

            // [Optimization]: Fast rational tanh approximation
            // Tanh(x) ~ x * (27 + x^2) / (27 + 9*x^2) for x in [-3, 3]
            float x2 = y4 * y4;
            return y4 * (27.0f + x2) / (27.0f + 9.0f * x2);
        }

    private:
        double mSampleRate = 44100.0;
        std::array<float, 4> mS = {0,0,0,0}; // Estados unit_delay
        float mG = 0.0f;
        float mK = 0.0f;
        float mAlpha = 1.0f;
    };

    /**
     * @brief Pool de filtros IR3109 para polifonía.
     */
    class FilterPoolJunoIr3109 {
    public:
        static constexpr int kMaxVoices = 16;

        void prepare(double sr) noexcept {
            for (auto& f : mFilters) f.prepare(sr);
        }

        void reset() noexcept {
            for (auto& f : mFilters) f.reset();
        }

        void setVoiceParams(int voiceIndex, float cutoff, float resonance) noexcept {
            if (voiceIndex < kMaxVoices) {
                mFilters[voiceIndex].setParams(cutoff, resonance);
            }
        }

        float process(int voiceIndex, float x) noexcept {
            return mFilters[voiceIndex].process(x);
        }

    private:
        std::array<JunoIr3109Filter, kMaxVoices> mFilters;
    };

} // namespace Omega::DSP::Engines::Juno
