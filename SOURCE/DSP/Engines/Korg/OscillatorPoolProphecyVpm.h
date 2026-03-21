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
     * @brief Oscilador VPM (Variable Phase Modulation) tipo Korg Prophecy.
     * [ID]: OSC-VPM-001 (MOSS Architecture)
     * [Tech]: Carrier/Modulator Phase Modulation with Feedback.
     */
    class OscillatorPoolProphecyVpm {
    public:
        static constexpr int kMaxVoices = 16;
        static constexpr double kTwoPi = 6.28318530717958647692;

        struct VoiceState {
            double phaseCarrier = 0.0;
            double phaseModulator = 0.0;
            double phaseDeltaCarrier = 0.0;
            double phaseDeltaModulator = 0.0;
            
            float modDepth = 0.5f;
            float feedback = 0.2f;
            float ratio = 1.0f; // Modulator/Carrier ratio
            
            float lastModOutput = 0.0f;
            bool active = false;
        };

        OscillatorPoolProphecyVpm() = default;

        void prepare(double sampleRate) noexcept {
            mSampleRate = sampleRate;
        }

        void trigger(int voiceIndex, float frequency) noexcept {
            if (voiceIndex >= kMaxVoices) return;
            
            auto& v = mVoices[voiceIndex];
            v.phaseDeltaCarrier = frequency / mSampleRate;
            v.phaseDeltaModulator = (frequency * v.ratio) / mSampleRate;
            v.phaseCarrier = 0.0;
            v.phaseModulator = 0.0;
            v.lastModOutput = 0.0f;
            v.active = true;
        }

        void setVoiceParams(int voiceIndex, float depth, float feedback, float ratio) noexcept {
            if (voiceIndex < kMaxVoices) {
                auto& v = mVoices[voiceIndex];
                v.modDepth = std::max(0.0f, std::min(5.0f, depth));
                v.feedback = std::max(0.0f, std::min(0.95f, feedback));
                v.ratio = std::max(0.25f, std::min(16.0f, ratio));
            }
        }

        float process(int voiceIndex) noexcept {
            auto& v = mVoices[voiceIndex];
            if (!v.active) return 0.0f;

            // 1. Modulator con Feedback
            double modPhase = v.phaseModulator + (v.lastModOutput * v.feedback);
            float modVal = (float)std::sin(modPhase * kTwoPi);
            v.lastModOutput = modVal;

            // 2. Carrier con Phase Modulation
            double carrierPhase = v.phaseCarrier + (modVal * v.modDepth);
            float outVal = (float)std::sin(carrierPhase * kTwoPi);

            // Actualizar fases
            v.phaseCarrier += v.phaseDeltaCarrier;
            if (v.phaseCarrier >= 1.0) v.phaseCarrier -= 1.0;

            v.phaseModulator += v.phaseDeltaModulator;
            if (v.phaseModulator >= 1.0) v.phaseModulator -= 1.0;

            return outVal;
        }

    private:
        double mSampleRate = 44100.0;
        std::array<VoiceState, kMaxVoices> mVoices;
    };

            } // namespace Korg
        } // namespace Engines
    } // namespace DSP
} // namespace Omega
