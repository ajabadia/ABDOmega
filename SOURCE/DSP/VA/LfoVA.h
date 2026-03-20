#pragma once

#include <cmath>
#include <numbers>
#include <array>

namespace Omega::DSP::VA {

    /**
     * @brief LFO simple para OMEGA.
     * [Fidelity]: Soporta Sine y Square.
     */
    class LfoVA {
    public:
        void prepare(double sampleRate) noexcept {
            mSampleRate = sampleRate;
            mInvSampleRate = 1.0 / sampleRate;
        }

        void reset() noexcept {
            mPhase = 0.0;
        }

        void setRate(float rateHz) noexcept {
            mPhaseStep = rateHz * mInvSampleRate;
        }

        float process() noexcept {
            float out = 0.0f;
            
            // Sine LFO por defecto
            out = std::sin(2.0f * std::numbers::pi_v<float> * float(mPhase));

            mPhase += mPhaseStep;
            if (mPhase >= 1.0) mPhase -= 1.0;
            
            return out;
        }

    private:
        double mSampleRate = 44100.0;
        double mInvSampleRate = 1.0 / 44100.0;
        double mPhase = 0.0;
        double mPhaseStep = 0.0;
    };

} // namespace Omega::DSP::VA
