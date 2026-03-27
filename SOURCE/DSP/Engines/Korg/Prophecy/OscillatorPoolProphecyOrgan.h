#pragma once

#include <cmath>
#include <array>
#include <vector>

namespace Omega::DSP::Engines::Korg::Prophecy {

    /**
     * @brief Korg Prophecy/Z1 Drawbar Organ Model (OSC-OR-001).
     * Emulates a Tonewheel organ with 9 drawbars.
     * Uses additive synthesis with rotary/harmonic scaling.
     */
    class OscillatorPoolProphecyOrgan {
    public:
        static constexpr int kMaxVoices = 16;
        static constexpr int kNumDrawbars = 9;
        
        // Harmonics for 16', 5 1/3', 8', 4', 2 2/3', 2', 1 3/5', 1 1/3', 1'
        const float kHarmonicMultipliers[kNumDrawbars] = { 0.5f, 1.4983f, 1.0f, 2.0f, 2.9966f, 4.0f, 5.0397f, 5.9932f, 8.0f };

        struct VoiceState {
            std::array<double, kNumDrawbars> phases{};
            std::array<float, kNumDrawbars> levels{};
            bool active = false;
        };

        void prepare(double sampleRate) {
            mSampleRate = sampleRate;
        }

        void setDrawbars(int vIdx, const std::array<float, kNumDrawbars>& levels) {
            if (vIdx >= kMaxVoices) return;
            mVoices[vIdx].levels = levels;
        }

        void trigger(int vIdx) {
            if (vIdx >= kMaxVoices) return;
            mVoices[vIdx].active = true;
            mVoices[vIdx].phases.fill(0.0);
        }

        float process(int vIdx, float baseFreq) {
            if (vIdx >= kMaxVoices || !mVoices[vIdx].active) return 0.0f;
            
            auto& v = mVoices[vIdx];
            float out = 0.0f;
            
            for (int i = 0; i < kNumDrawbars; ++i) {
                float freq = baseFreq * kHarmonicMultipliers[i];
                float step = freq / (float)mSampleRate;
                
                out += std::sin(v.phases[i] * 6.283185f) * v.levels[i];
                
                v.phases[i] += step;
                if (v.phases[i] >= 1.0) v.phases[i] -= 1.0;
            }
            
            return out * 0.3f; // Scaling down to prevent clipping
        }

    private:
        double mSampleRate = 44100.0;
        std::array<VoiceState, kMaxVoices> mVoices{};
    };

} // namespace Omega::DSP::Engines::Korg
