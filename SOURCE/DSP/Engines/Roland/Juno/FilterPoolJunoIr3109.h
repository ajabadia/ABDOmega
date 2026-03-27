#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>
#include <array>
#include <cmath>

namespace Omega::DSP::Engines::Roland::Juno {

    /**
     * @brief Implementación del filtro polifónico IR3109 (tipo Juno-60/106).
     */
    class FilterPoolJunoIr3109 {
    public:
        static constexpr int kMaxVoices = 16;

        void prepare(double sampleRate) noexcept {
            mSampleRate = sampleRate;
            ::juce::dsp::ProcessSpec spec { sampleRate, 1024, 1 };
            for (auto& f : mFilters) {
                f.prepare(spec);
                f.setType(::juce::dsp::StateVariableTPTFilterType::lowpass);
            }
        }

        void setVoiceParams(int voiceIndex, float cutoffHz, float resonance) noexcept {
            if (voiceIndex < kMaxVoices) {
                mFilters[voiceIndex].setCutoffFrequency(cutoffHz);
                mFilters[voiceIndex].setResonance(resonance * 2.0f + 0.5f); // Map 0..1 to 0..4 approx
            }
        }

        float process(int voiceIndex, float input) noexcept {
            return mFilters[voiceIndex].processSample(0, input);
        }

    private:
        double mSampleRate = 44100.0;
        std::array<::juce::dsp::StateVariableTPTFilter<float>, kMaxVoices> mFilters;
    };

} // namespace Omega::DSP::Engines::Roland::Juno
