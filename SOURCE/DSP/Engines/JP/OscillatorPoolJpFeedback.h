#pragma once

#include <vector>
#include <algorithm>
#include <array>
#include <cmath>

namespace Omega {
    namespace DSP {
        namespace Engines {
            namespace JP {

    /**
     * @brief Emulación del oscilador de realimentación (Feedback) del JP-8080.
     * [ID]: OSC-PM-010
     * [Tech]: Sawtooth -> Comb Filter (High Feedback).
     */
    class OscillatorPoolJpFeedback {
    public:
        struct VoiceState {
            double phase = 0.0;
            double phaseStep = 0.0;
            float feedback = 0.8f;
            float speed = 0.5f; // Relative frequency of the comb
            
            // Delay line for Comb Filter
            static constexpr int kDelayBufferMask = 1023;
            std::array<float, 1024> delayBuffer;
            int writePos = 0;
            float lastReadValue = 0.0f;
            
            bool active = false;
        };

        OscillatorPoolJpFeedback() = default;

        void prepare(double sampleRate) noexcept {
            mSampleRate = sampleRate;
        }

        void setVoiceParams(int vIdx, float freq, float feedback, float speed) noexcept {
            if (vIdx >= kMaxVoices) return;
            auto& v = mVoices[vIdx];
            v.phaseStep = freq / mSampleRate;
            v.feedback = feedback;
            v.speed = speed;
        }

        void trigger(int vIdx) noexcept {
            if (vIdx >= kMaxVoices) return;
            mVoices[vIdx].phase = 0.0;
            mVoices[vIdx].delayBuffer.fill(0.0f);
            mVoices[vIdx].writePos = 0;
            mVoices[vIdx].active = true;
        }

        float process(int vIdx) noexcept {
            auto& v = mVoices[vIdx];
            if (!v.active) return 0.0f;

            // 1. Base Sawtooth (-1.0 to 1.0)
            float saw = (float)(v.phase * 2.0 - 1.0);
            v.phase += v.phaseStep;
            if (v.phase >= 1.0) v.phase -= 1.0;

            // 2. Comb Filter Logic
            // Speed controls delay time: length = mSampleRate / (baseFreq * mult)
            // For simplicity, we use frequency-proportional delay
            float baseFreq = (float)(v.phaseStep * mSampleRate);
            if (baseFreq < 20.0f) baseFreq = 20.0f;
            
            // Speed maps to a multiplier (e.g., 0.5x to 4.0x base frequency)
            float mult = 0.5f + v.speed * 3.5f;
            float delayInSamples = (float)(mSampleRate / (baseFreq * mult));
            
            // Clamp delay length to buffer size
            if (delayInSamples > 1020.0f) delayInSamples = 1020.0f;
            if (delayInSamples < 1.0f) delayInSamples = 1.0f;

            // Fractional delay (Linear interpolation)
            float readPos = (float)v.writePos - delayInSamples;
            while (readPos < 0) readPos += 1024.0f;
            
            int idx1 = (int)readPos & VoiceState::kDelayBufferMask;
            int idx2 = (idx1 + 1) & VoiceState::kDelayBufferMask;
            float frac = readPos - (float)((int)readPos);
            
            float delayedValue = v.delayBuffer[idx1] * (1.0f - frac) + v.delayBuffer[idx2] * frac;

            // 3. Feedback Loop
            // input_to_comb = saw + feedback * delayedValue
            float combIn = saw + v.feedback * delayedValue;
            
            // Soft clipping in the loop to prevent explosion
            if (combIn > 1.2f) combIn = 1.2f;
            if (combIn < -1.2f) combIn = -1.2f;

            v.delayBuffer[v.writePos] = combIn;
            v.writePos = (v.writePos + 1) & VoiceState::kDelayBufferMask;

            return combIn * 0.5f; // Normalización
        }

    private:
        static constexpr int kMaxVoices = 16;
        double mSampleRate = 44100.0;
        std::array<VoiceState, kMaxVoices> mVoices;
    };

            } // namespace JP
        } // namespace Engines
    } // namespace DSP
} // namespace Omega
