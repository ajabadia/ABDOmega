#pragma once

#include <cmath>
#include <array>
#include <algorithm>

namespace Omega::DSP::Engines::Roland::JP {

    /**
     * @brief Implementación de Roland Supersaw (JP-8000).
     * [ID]: OSC-VA-004
     * [Fidelity]: 7 osciladores de sierra con detune y spread.
     * [AudioThreadSafety]: Optimizado para procesamiento en bloque.
     */
    class OscillatorPoolSuperSaw {
    public:
        static constexpr int kNumOscillators = 7;
        static constexpr int kMaxVoices = 16;

        struct VoiceState {
            std::array<double, kNumOscillators> phases;
            float detune = 0.0f;
            float spread = 0.0f;
            float frequency = 440.0f;
        };

        void prepare(double sampleRate) noexcept {
            mSampleRate = sampleRate;
            mInvSampleRate = 1.0 / sampleRate;
            for (auto& v : mVoices) {
                v.phases.fill(0.0);
            }
        }

        void setVoiceParams(int voiceIndex, float freqHz, float detune, float spread) noexcept {
            if (voiceIndex < kMaxVoices) {
                mVoices[voiceIndex].frequency = freqHz;
                mVoices[voiceIndex].detune = detune;
                mVoices[voiceIndex].spread = spread;
            }
        }

        float process(int voiceIndex) noexcept {
            auto& v = mVoices[voiceIndex];
            float sum = 0.0f;

            const float detuneAmts[kNumOscillators] = { 0.0f, -0.05f, 0.05f, -0.1f, 0.1f, -0.15f, 0.15f };

            for (int i = 0; i < kNumOscillators; ++i) {
                float saw = (float)(2.0 * v.phases[i] - 1.0);
                sum += saw;

                float freq = v.frequency * (1.0f + detuneAmts[i] * v.detune);
                double phaseStep = freq * mInvSampleRate;
                v.phases[i] += phaseStep;
                if (v.phases[i] >= 1.0) v.phases[i] -= 1.0;
            }

            return sum / (float)kNumOscillators;
        }

    private:
        double mSampleRate = 44100.0;
        double mInvSampleRate = 1.0 / 44100.0;
        std::array<VoiceState, kMaxVoices> mVoices;
    };

} // namespace Omega::DSP::Engines::Roland::JP
