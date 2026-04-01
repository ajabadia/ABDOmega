#pragma once

#include <algorithm>
#include <cmath>

namespace Omega {
namespace DSP {
namespace Modulation {

    /**
     * @brief High-fidelity Modular ADSR Envelope Generator.
     * Implements Case 401 for Voice Architecture 2.0.
     */
    enum class AdsrStage { Idle, Attack, Decay, Sustain, Release };

    struct AdsrParams {
        float attackS;
        float decayS;
        float sustain;
        float releaseS;
        float sampleRate;
    };

    struct AdsrState {
        AdsrStage stage;
        float current;
        float stageValue; // Internal accumulator
        bool gate;
    };

    /**
     * @brief High-fidelity Modular ADSR Envelope Generator.
     * Implements Case 401 for Voice Architecture 2.0.
     */
    class AceUnitAdsr {
    public:

        /**
         * @brief Processes a single sample of the envelope.
         */
        static float process(AdsrState& state, const AdsrParams& p) {
            switch (state.stage) {
                case AdsrStage::Idle:
                    state.current = 0.0f;
                    break;

                case AdsrStage::Attack:
                {
                    float step = 1.0f / (std::max(0.001f, p.attackS) * p.sampleRate);
                    state.current += step;
                    if (state.current >= 1.0f) {
                        state.current = 1.0f;
                        state.stage = AdsrStage::Decay;
                    }
                    break;
                }

                case AdsrStage::Decay:
                {
                    float target = p.sustain;
                    float timeConstant = std::max(0.001f, p.decayS);
                    float factor = std::exp(-1.0f / (timeConstant * p.sampleRate));
                    state.current = target + (state.current - target) * factor;
                    
                    if (std::abs(state.current - target) < 0.001f) {
                        state.current = target;
                        state.stage = AdsrStage::Sustain;
                    }
                    break;
                }

                case AdsrStage::Sustain:
                    state.current = p.sustain;
                    break;

                case AdsrStage::Release:
                {
                    float timeConstant = std::max(0.001f, p.releaseS);
                    float factor = std::exp(-1.0f / (timeConstant * p.sampleRate));
                    state.current *= factor;
                    
                    if (state.current < 0.0001f) {
                        state.current = 0.0f;
                        state.stage = AdsrStage::Idle;
                    }
                    break;
                }
            }
            return state.current;
        }

        /**
         * @brief Handles gate trigger logic.
         */
        static void setGate(AdsrState& state, bool gateActive) {
            if (gateActive && !state.gate) {
                state.stage = AdsrStage::Attack;
            } else if (!gateActive && state.gate) {
                state.stage = AdsrStage::Release;
            }
            state.gate = gateActive;
        }
    };

} // namespace Modulation
} // namespace DSP
} // namespace Omega
