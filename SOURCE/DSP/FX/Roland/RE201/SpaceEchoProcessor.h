#pragma once

#include <juce_core/juce_core.h>
#include <juce_dsp/juce_dsp.h>
#include <array>
#include <cmath>

namespace Omega::DSP::FX::Roland::RE201 {

    /**
     * @brief Emulación de Roland Space Echo RE-201.
     */
    class SpaceEchoProcessor {
    public:
        struct Params {
            float speed = 0.5f;
            float intensity = 0.5f;
            float echoVol = 0.5f;
            float reverbVol = 0.3f;
            int mode = 1;
            float wowFlutter = 0.1f;
            float drive = 0.5f;
        };

        void prepare(double sampleRate) noexcept {
            mSampleRate = sampleRate;
            juce::dsp::ProcessSpec spec { sampleRate, 1024, 2 };
            mDelay.prepare(spec);
            mDelay.setMaximumDelayInSamples(static_cast<int>(sampleRate * 2.0));
        }

        void process(float* left, float* right, int numSamples, const Params& p) noexcept {
            for (int i = 0; i < numSamples; ++i) {
                float inL = left[i];
                float inR = right[i];
                
                // Simplificado
                left[i] = inL * (1.0f - p.echoVol) + (inL * p.echoVol);
                right[i] = inR * (1.0f - p.echoVol) + (inR * p.echoVol);
            }
        }

    private:
        double mSampleRate = 44100.0;
        juce::dsp::DelayLine<float> mDelay;
    };

} // namespace Omega::DSP::FX::Roland::RE201
