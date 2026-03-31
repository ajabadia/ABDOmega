#pragma once

#include <juce_dsp/juce_dsp.h>
#include <array>
#include <cmath>

namespace Omega::DSP::Engines::Roland::Juno {

    /**
     * @brief Emulación del Chorus BBD del Juno-60.
     */
    class ChorusPoolJuno {
    public:
        void prepare(double sampleRate) noexcept {
            mSampleRate = sampleRate;
            ::juce::dsp::ProcessSpec spec { sampleRate, 1024, 2 };
            mChorus.prepare(spec);
            mChorus.setCentreDelay(0.015f); // 15ms base
            mChorus.setFeedback(0.0f);
            mChorus.setMix(0.5f);
        }

        void setMode(int mode) noexcept {
            if (mode == 0) { // Off
                mChorus.setDepth(0.0f);
            } else if (mode == 1) { // Mode I
                mChorus.setRate(0.513f);
                mChorus.setDepth(0.2f);
            } else if (mode == 2) { // Mode II
                mChorus.setRate(0.863f);
                mChorus.setDepth(0.25f);
            } else if (mode == 3) { // Mode I+II
                mChorus.setRate(1.2f);
                mChorus.setDepth(0.35f);
            }
        }

        void setMix(float mix) noexcept {
            mChorus.setMix(mix);
        }

        void process(float& left, float& right) noexcept {
            float* channelPointers[2] = { &left, &right };
            ::juce::dsp::AudioBlock<float> block(channelPointers, 2, 1);
            mChorus.process(::juce::dsp::ProcessContextReplacing<float>(block));
        }

    private:
        double mSampleRate = 44100.0;
        ::juce::dsp::Chorus<float> mChorus;
    };

} // namespace Omega::DSP::Engines::Roland::Juno
