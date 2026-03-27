#pragma once

#include <juce_dsp/juce_dsp.h>
#include <array>
#include <cmath>

namespace Omega::DSP::Engines::Korg::MS20 {

    /**
     * @brief Emulación del filtro Korg 35 (MS-20).
     */
    class FilterPoolKorg35 {
    public:
        static constexpr int kMaxVoices = 16;

        void prepare(double sampleRate) noexcept {
            mSampleRate = sampleRate;
            ::juce::dsp::ProcessSpec spec { sampleRate, 1024, 1 };
            for (auto& f : mLpFilters) {
                f.prepare(spec);
                f.setType(::juce::dsp::StateVariableTPTFilterType::lowpass);
            }
            for (auto& f : mHpFilters) {
                f.prepare(spec);
                f.setType(::juce::dsp::StateVariableTPTFilterType::highpass);
            }
        }

        void setVoiceParams(int voiceIndex, float lpCutoff, float lpRes, float hpCutoff, float hpRes, float grit) noexcept {
            if (voiceIndex < kMaxVoices) {
                mLpFilters[voiceIndex].setCutoffFrequency(lpCutoff);
                mLpFilters[voiceIndex].setResonance(lpRes * 3.0f + 0.5f);
                mHpFilters[voiceIndex].setCutoffFrequency(hpCutoff);
                mHpFilters[voiceIndex].setResonance(hpRes * 2.0f + 0.5f);
                mGrit = grit;
            }
        }

        float process(int voiceIndex, float input) noexcept {
            float hpOut = mHpFilters[voiceIndex].processSample(0, input);
            float lpOut = mLpFilters[voiceIndex].processSample(0, hpOut);
            
            if (mGrit > 1.01f) {
                return std::tanh(lpOut * mGrit);
            }
            return lpOut;
        }

    private:
        double mSampleRate = 44100.0;
        float mGrit = 1.0f;
        std::array<::juce::dsp::StateVariableTPTFilter<float>, kMaxVoices> mLpFilters;
        std::array<::juce::dsp::StateVariableTPTFilter<float>, kMaxVoices> mHpFilters;
    };

} // namespace Omega::DSP::Engines::Korg::MS20
