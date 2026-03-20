#pragma once

#include <array>
#include <vector>
#include "JpSuperSawOscillator.h"

namespace Omega::DSP::Engines::JP {

    /**
     * @brief Pool de osciladores JP-8080.
     * Gestiona las instancias de JpSuperSawOscillator para polifonía.
     */
    class OscillatorPoolJp8080 {
    public:
        static constexpr int kMaxVoices = 16; // O lo que defina el engine

        void prepare(double sampleRate) noexcept {
            for (auto& osc : mOscillators) {
                osc.prepare(sampleRate);
            }
        }

        void reset() noexcept {
            for (auto& osc : mOscillators) {
                osc.reset();
            }
        }

        /**
         * @brief Procesa el Supersaw para una voz específica.
         * @param voiceIndex Índice de la voz (0 a kMaxVoices-1)
         * @param buffer Bloque de samples (mono/stereo acumulativo)
         * @param numSamples Cantidad de samples
         * @param freqHz Frecuencia base
         * @param detune Detune spread (0..1)
         * @param level Nivel de salida total
         */
        inline void process(int voiceIndex, float* buffer, int numSamples, float freqHz, float detune, float level) noexcept {
            if (voiceIndex < 0 || voiceIndex >= kMaxVoices) return;
            mOscillators[voiceIndex].process(buffer, numSamples, freqHz, detune, level);
        }

    private:
        std::array<JpSuperSawOscillator, kMaxVoices> mOscillators{};
    };

} // namespace Omega::DSP::Engines::JP
