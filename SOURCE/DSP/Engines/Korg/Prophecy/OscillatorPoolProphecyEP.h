#pragma once

#include <cmath>
#include <array>
#include <vector>
#include <algorithm>

namespace Omega::DSP::Engines::Korg::Prophecy {

    /**
     * @brief Korg Prophecy/Z1 Electric Piano Model (OSC-EP-001).
     * Physical modeling of a Tine/Reed piano.
     * Involves a hammer impulse and a resonant tine (high-Q filter/delay).
     */
    class OscillatorPoolProphecyEP {
    public:
        static constexpr int kMaxVoices = 16;

        struct Tine {
            float z1 = 0.0f, z2 = 0.0f;
            float b0, b1, b2, a1, a2;
            float hammerPos = 0.0f;
            float decay = 0.999f;
            bool active = false;

            void setParams(float freq, float hardness, double sampleRate) {
                float w0 = 2.0f * 3.14159f * freq / (float)sampleRate;
                float q = 500.0f + (hardness * 1000.0f); // High Q for metal tine
                float alpha = std::sin(w0) / (2.0f * q);
                float cosW0 = std::cos(w0);
                
                b0 = alpha; b1 = 0.0f; b2 = -alpha;
                float a0 = 1.0f + alpha;
                a1 = -2.0f * cosW0; a2 = 1.0f - alpha;
                b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
                decay = 0.999f + (hardness * 0.0009f);
            }

            inline float process(float impulse) {
                if (!active) return 0.0f;
                float out = b0 * impulse + b1 * 0 + b2 * 0 - a1 * z1 - a2 * z2;
                z2 = z1;
                z1 = out;
                z1 *= decay; // Physical damping
                if (std::abs(z1) < 1e-9) active = false;
                return out;
            }
        };

        void prepare(double sampleRate) {
            mSampleRate = sampleRate;
        }

        void trigger(int vIdx, float velocity, float frequency, float hardness) {
            if (vIdx >= kMaxVoices) return;
            mTines[vIdx].active = true;
            mTines[vIdx].setParams(frequency, hardness, mSampleRate);
            mImpulsePhase[vIdx] = 1.0f; // High amplitude impulse
        }

        float process(int vIdx) {
            if (vIdx >= kMaxVoices) return 0.0f;
            
            float impulse = 0.0f;
            if (mImpulsePhase[vIdx] > 0.0f) {
                impulse = mImpulsePhase[vIdx];
                mImpulsePhase[vIdx] *= 0.9f; // Fast hammer decay
                if (mImpulsePhase[vIdx] < 0.01f) mImpulsePhase[vIdx] = 0.0f;
            }

            return mTines[vIdx].process(impulse);
        }

    private:
        double mSampleRate = 44100.0;
        std::array<Tine, kMaxVoices> mTines{};
        float mImpulsePhase[kMaxVoices];
    };

} // namespace Omega::DSP::Engines::Korg
