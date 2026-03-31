#pragma once

#include <vector>
#include <algorithm>
#include <array>
#include <cmath>

namespace Omega {
    namespace DSP {
        namespace Core {
            namespace Modulation {

    /**
     * @brief Envolvente Multi-etapa tipo Korg Prophecy.
     * [ID]: ENV-MULTI-001
     * [Tech]: 5-stage ADBSR with Level/Time and Curve support.
     */
    class EnvelopeMultiStage {
    public:
        enum State { Idle, Attack, Decay, Break, Slope, Release };

        struct StageParams {
            float timeMs;
            float level;
            float curve; // 0 = linear, -1..0 = log, 0..1 = exp
        };

        struct VoiceState {
            State state = Idle;
            float currentLevel = 0.0f;
            float stageStartLevel = 0.0f;
            double stageSampleCount = 0;
            double stageDurationSamples = 0;
            
            std::array<StageParams, 5> stages;
            bool active = false;
        };

        EnvelopeMultiStage() = default;

        void prepare(double sampleRate) noexcept {
            mSampleRate = sampleRate;
        }

        void setVoiceParams(int voiceIndex, const std::array<StageParams, 5>& params) noexcept {
            if (voiceIndex < kMaxVoices) {
                mVoices[voiceIndex].stages = params;
            }
        }

        void trigger(int voiceIndex) noexcept {
            if (voiceIndex >= kMaxVoices) return;
            auto& v = mVoices[voiceIndex];
            v.state = Attack;
            v.stageStartLevel = 0.0f;
            v.currentLevel = 0.0f;
            v.stageSampleCount = 0;
            updateStageDuration(voiceIndex);
            v.active = true;
        }

        void release(int voiceIndex) noexcept {
            if (voiceIndex >= kMaxVoices) return;
            auto& v = mVoices[voiceIndex];
            v.state = Release;
            v.stageStartLevel = v.currentLevel;
            v.stageSampleCount = 0;
            updateStageDuration(voiceIndex);
        }

        float process(int voiceIndex) noexcept {
            auto& v = mVoices[voiceIndex];
            if (v.state == Idle) return 0.0f;

            float targetLevel = 0.0f;
            float curve = 0.0f;

            int stageIdx = static_cast<int>(v.state) - 1;
            if (stageIdx >= 0 && stageIdx < 5) {
                targetLevel = v.stages[stageIdx].level;
                curve = v.stages[stageIdx].curve;
            }

            if (v.stageDurationSamples > 0) {
                double t = v.stageSampleCount / v.stageDurationSamples;
                
                // Aplicar curva
                float progress = (float)t;
                if (curve != 0.0f) {
                    if (curve > 0) progress = std::pow(progress, 1.0f + curve * 4.0f); // Exp
                    else progress = 1.0f - std::pow(1.0f - progress, 1.0f - curve * 4.0f); // Log
                }

                v.currentLevel = v.stageStartLevel + (targetLevel - v.stageStartLevel) * progress;
                v.stageSampleCount++;

                if (v.stageSampleCount >= v.stageDurationSamples) {
                    moveToNextStage(voiceIndex);
                }
            } else {
                v.currentLevel = targetLevel;
                moveToNextStage(voiceIndex);
            }

            return v.currentLevel;
        }

    private:
        static constexpr int kMaxVoices = 16;
        double mSampleRate = 44100.0;
        std::array<VoiceState, kMaxVoices> mVoices;

        void updateStageDuration(int vIdx) {
            auto& v = mVoices[vIdx];
            int stageIdx = static_cast<int>(v.state) - 1;
            if (stageIdx >= 0 && stageIdx < 5) {
                v.stageDurationSamples = (v.stages[stageIdx].timeMs / 1000.0) * mSampleRate;
            }
        }

        void moveToNextStage(int vIdx) {
            auto& v = mVoices[vIdx];
            v.stageSampleCount = 0;
            v.stageStartLevel = v.currentLevel;

            switch (v.state) {
                case Attack: v.state = Decay; break;
                case Decay: v.state = Break; break;
                case Break: v.state = Slope; break;
                case Slope: break; // Sustain stage, wait for release
                case Release: v.state = Idle; v.active = false; break;
                default: break;
            }
            updateStageDuration(vIdx);
        }
    };

            } // namespace Modulation
        } // namespace Core
    } // namespace DSP
} // namespace Omega
