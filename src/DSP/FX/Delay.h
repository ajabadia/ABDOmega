#pragma once

#include <vector>
#include <algorithm>
#include <juce_audio_basics/juce_audio_basics.h>

namespace Omega {
namespace DSP {
namespace FX {

    /**
     * @brief Procesador de Delay estéreo simple.
     */
    class Delay {
    public:
        Delay() {
            mBuffer.resize(kMaxDelaySamples * 2, 0.0f);
        }

        void setSampleRate(double sr) {
            mSampleRate = sr;
        }

        void prepare(double sr) {
            setSampleRate(sr);
            std::fill(mBuffer.begin(), mBuffer.end(), 0.0f);
            mWritePos = 0;
        }

        void process(juce::AudioBuffer<float>& buffer, float timeS = 0.5f, float feedback = 0.3f, float mix = 0.2f) {
            if (buffer.getNumChannels() < 2) return;
            process(buffer.getWritePointer(0), buffer.getWritePointer(1), buffer.getNumSamples(), timeS, feedback, mix);
        }

        void process(float* left, float* right, int numSamples, float timeS, float feedback, float mix) {
            int delaySamples = static_cast<int>(timeS * mSampleRate);
            if (delaySamples < 0) delaySamples = 0;
            if (delaySamples >= kMaxDelaySamples) delaySamples = kMaxDelaySamples - 1;

            for (int i = 0; i < numSamples; ++i) {
                // Leer de buffer circular
                int readPos = (mWritePos - delaySamples + kMaxDelaySamples) % kMaxDelaySamples;
                float delayL = mBuffer[readPos * 2];
                float delayR = mBuffer[readPos * 2 + 1];

                // Escribir en buffer (Input + Feedback)
                mBuffer[mWritePos * 2] = left[i] + delayL * feedback;
                mBuffer[mWritePos * 2 + 1] = right[i] + delayR * feedback;

                // Mix seco/mojado
                left[i] = (left[i] * (1.0f - mix)) + (delayL * mix);
                right[i] = (right[i] * (1.0f - mix)) + (delayR * mix);

                mWritePos = (mWritePos + 1) % kMaxDelaySamples;
            }
        }

    private:
        static constexpr int kMaxDelaySamples = 192000; // 4 seconds at 48kHz
        std::vector<float> mBuffer;
        int mWritePos { 0 };
        double mSampleRate { 44100.0 };
    };

} // namespace FX
} // namespace DSP
} // namespace Omega
