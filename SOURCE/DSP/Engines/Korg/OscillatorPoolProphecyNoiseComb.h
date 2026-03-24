#pragma once

#include <vector>
#include <algorithm>
#include <array>
#include <cmath>

namespace Omega {
    namespace DSP {
        namespace Engines {
            namespace Korg {

    /**
     * @brief Oscilador Noise + Comb Filter tipo Korg Prophecy.
     * [ID]: OSC-PM-009 (MOSS Architecture)
     * [Tech]: Noise source fed into a feedback delay line with LPF.
     */
    class OscillatorPoolProphecyNoiseComb {
    public:
        static constexpr int kMaxVoices = 16;
        static constexpr int kMaxDelaySize = 2048;

        struct VoiceState {
            std::array<float, kMaxDelaySize> delayLine;
            int writeIdx = 0;
            
            float noiseLevel = 0.5f;
            float feedback = 0.8f;
            float cutoff = 0.5f; // Loop LPF frequency
            float pitch = 440.0f;
            
            float filterZ1 = 0.0f;
            bool active = false;
        };

        OscillatorPoolProphecyNoiseComb() {
            for(auto& v : mVoices) v.delayLine.fill(0.0f);
        }

        void prepare(double sampleRate) noexcept {
            mSampleRate = sampleRate;
        }

        void trigger(int voiceIndex, float frequency) noexcept {
            if (voiceIndex >= kMaxVoices) return;
            auto& v = mVoices[voiceIndex];
            v.pitch = frequency;
            v.active = true;
        }

        void setVoiceParams(int voiceIndex, float noise, float feedback, float cutoff) noexcept {
            if (voiceIndex < kMaxVoices) {
                auto& v = mVoices[voiceIndex];
                v.noiseLevel = std::max(0.0f, std::min(1.0f, noise));
                v.feedback = std::max(0.0f, std::min(0.99f, feedback));
                v.cutoff = std::max(0.01f, std::min(0.99f, cutoff));
            }
        }

        float process(int voiceIndex) noexcept {
            auto& v = mVoices[voiceIndex];
            if (!v.active) return 0.0f;

            // 1. Generar ruido blanco
            float noise = ((float)rand() / (float)RAND_MAX) * 2.0f - 1.0f;
            float excitation = noise * v.noiseLevel;

            // 2. Leer del Delay Line (Comb)
            float delaySeconds = 1.0f / v.pitch;
            float delaySamples = delaySeconds * (float)mSampleRate;
            int readIdx = (v.writeIdx - static_cast<int>(delaySamples) + kMaxDelaySize) % kMaxDelaySize;
            float delayedSignal = v.delayLine[readIdx];

            // 3. Loop LPF (Damping)
            float lpOut = delayedSignal * (1.0f - v.cutoff) + v.filterZ1 * v.cutoff;
            v.filterZ1 = lpOut;

            // 4. Feedback y mezcla
            float combIn = excitation + lpOut * v.feedback;
            v.delayLine[v.writeIdx] = combIn;
            v.writeIdx = (v.writeIdx + 1) % kMaxDelaySize;

            return lpOut; // Salida del comb filtrado
        }

    private:
        double mSampleRate = 44100.0;
        std::array<VoiceState, kMaxVoices> mVoices;
    };

            } // namespace Korg
        } // namespace Engines
    } // namespace DSP
} // namespace Omega
