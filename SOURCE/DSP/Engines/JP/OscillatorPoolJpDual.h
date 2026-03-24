#pragma once

#include <cmath>
#include <array>
#include <algorithm>

namespace Omega {
    namespace DSP {
        namespace Engines {
            namespace JP {

    /**
     * @brief Dual Oscillator Pool for JP-8080 style synthesis.
     * Supports X-MOD (Cross Modulation) and Hard Sync.
     */
    class OscillatorPoolJpDual {
    public:
        static constexpr int kMaxVoices = 16;

        enum Waveform { Saw, Square, Triangle };

        struct VoiceState {
            double phase1 = 0.0;
            double phase2 = 0.0;
            double phaseStep1 = 0.0;
            double phaseStep2 = 0.0;
            
            Waveform wave1 = Saw;
            Waveform wave2 = Saw;
            
            float xModDepth = 0.0f;
            bool sync = false;
            float mix = 0.5f; // OSC 1 vs OSC 2 balance
            bool active = false;
        };

        void prepare(double sampleRate) noexcept {
            mSampleRate = sampleRate;
        }

        void setVoiceParams(int vIdx, float freq1, float freq2, float xmod, bool sync, float mix) noexcept {
            if (vIdx >= kMaxVoices) return;
            auto& v = mVoices[vIdx];
            v.phaseStep1 = freq1 / mSampleRate;
            v.phaseStep2 = freq2 / mSampleRate;
            v.xModDepth = xmod;
            v.sync = sync;
            v.mix = mix;
        }

        void setWaveforms(int vIdx, Waveform w1, Waveform w2) noexcept {
            if (vIdx >= kMaxVoices) return;
            mVoices[vIdx].wave1 = w1;
            mVoices[vIdx].wave2 = w2;
        }

        void trigger(int vIdx) noexcept {
            if (vIdx >= kMaxVoices) return;
            mVoices[vIdx].phase1 = 0.0;
            mVoices[vIdx].phase2 = 0.0;
            mVoices[vIdx].active = true;
        }

        float process(int vIdx) noexcept {
            auto& v = mVoices[vIdx];
            if (!v.active) return 0.0f;

            // 1. Process OSC 2 First (Modulator)
            float out2 = 0.0f;
            float p2 = (float)v.phase2;
            switch (v.wave2) {
                case Saw:      out2 = p2 * 2.0f - 1.0f; break;
                case Square:   out2 = (p2 < 0.5f) ? 1.0f : -1.0f; break;
                case Triangle: out2 = (p2 < 0.5f) ? (p2 * 4.0f - 1.0f) : (3.0f - p2 * 4.0f); break;
            }

            // 2. Process OSC 1 (Carrier) with X-MOD
            // X-MOD in JP is essentially Exponential FM (Pitch Modulation)
            float xmodPitchMod = out2 * v.xModDepth * 24.0f; // Up to 2 octaves modulation
            double effectivePhaseStep1 = v.phaseStep1 * std::pow(2.0, xmodPitchMod / 12.0);
            
            float out1 = 0.0f;
            float p1 = (float)v.phase1;
            switch (v.wave1) {
                case Saw:      out1 = p1 * 2.0f - 1.0f; break;
                case Square:   out1 = (p1 < 0.5f) ? 1.0f : -1.0f; break;
                case Triangle: out1 = (p1 < 0.5f) ? (p1 * 4.0f - 1.0f) : (3.0f - p1 * 4.0f); break;
            }

            // Phase Update
            double oldPhase1 = v.phase1;
            v.phase1 += effectivePhaseStep1;
            if (v.phase1 >= 1.0) v.phase1 -= 1.0;

            // HARD SYNC: OSC 2 syncs to OSC 1
            if (v.sync && (v.phase1 < oldPhase1)) {
                v.phase2 = 0.0;
            }

            v.phase2 += v.phaseStep2;
            if (v.phase2 >= 1.0) v.phase2 -= 1.0;

            // Mix OSC 1 and OSC 2
            return out1 * (1.0f - v.mix) + out2 * v.mix;
        }

    private:
        double mSampleRate = 44100.0;
        std::array<VoiceState, kMaxVoices> mVoices{};
    };

            } // namespace JP
        } // namespace Engines
    } // namespace DSP
} // namespace Omega
