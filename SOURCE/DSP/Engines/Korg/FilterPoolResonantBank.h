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
     * @brief Resonant Filter Bank tipo Korg Prophecy / Z1.
     * [ID]: FLT-RES-001 (MOSS Architecture)
     * [Tech]: 6 Parallel 2-pole Resonant Peak Filters.
     */
    class FilterPoolResonantBank {
    public:
        static constexpr int kMaxVoices = 16;
        static constexpr int kNumPeaks = 6;

        struct BiquadState {
            float z1 = 0, z2 = 0;
            float b0 = 1, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
            
            float process(float in) noexcept {
                float out = in * b0 + z1;
                z1 = in * b1 - out * a1 + z2;
                z2 = in * b2 - out * a2;
                return out;
            }
        };

        struct VoiceState {
            std::array<BiquadState, kNumPeaks> peaks;
            float masterCutoff = 1000.0f;
            float spread = 1.2f;
            float resonance = 0.5f;
            std::array<float, kNumPeaks> peakGains;
            bool active = false;
        };

        FilterPoolResonantBank() {
            for(auto& v : mVoices) v.peakGains.fill(1.0f);
        }

        void prepare(double sampleRate) noexcept {
            mSampleRate = sampleRate;
        }

        void updateCoefficients(int voiceIndex) noexcept {
            auto& v = mVoices[voiceIndex];
            float q = 1.0f + v.resonance * 20.0f; // Q mapping

            for (int i = 0; i < kNumPeaks; ++i) {
                // Frecuencias espaciadas armónicamente o por spread
                float freq = v.masterCutoff * std::pow(v.spread, (float)i);
                freq = std::min(freq, (float)mSampleRate * 0.45f);

                // Diseño de Biquad Bandpass (pico resonante)
                float omega = 2.0f * 3.14159265f * freq / (float)mSampleRate;
                float sn = std::sin(omega);
                float cs = std::cos(omega);
                float alpha = sn / (2.0f * q);
                
                float a0 = 1.0f + alpha;
                v.peaks[i].b0 = alpha / a0;
                v.peaks[i].b1 = 0.0f;
                v.peaks[i].b2 = -alpha / a0;
                v.peaks[i].a1 = -2.0f * cs / a0;
                v.peaks[i].a2 = (1.0f - alpha) / a0;
            }
        }

        float process(int voiceIndex, float input) noexcept {
            auto& v = mVoices[voiceIndex];
            if (!v.active) return input;

            float outMix = 0.0f;
            for (int i = 0; i < kNumPeaks; ++i) {
                outMix += v.peaks[i].process(input) * v.peakGains[i];
            }

            return outMix * 0.5f; // Normalización básica
        }

        void setVoiceParams(int voiceIndex, float cutoff, float spread, float res) noexcept {
            if (voiceIndex < kMaxVoices) {
                auto& v = mVoices[voiceIndex];
                v.masterCutoff = cutoff;
                v.spread = spread;
                v.resonance = res;
                v.active = true;
                updateCoefficients(voiceIndex);
            }
        }

    private:
        double mSampleRate = 44100.0;
        std::array<VoiceState, kMaxVoices> mVoices;
    };

            } // namespace Korg
        } // namespace Engines
    } // namespace DSP
} // namespace Omega
