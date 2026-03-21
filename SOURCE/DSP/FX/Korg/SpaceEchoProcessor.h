#ifndef OMEGA_SPACE_ECHO_PROCESSOR_H
#define OMEGA_SPACE_ECHO_PROCESSOR_H

#include <vector>
#include <array>
#include <cmath>
#include <random>
#include <algorithm>

namespace Omega {
    namespace DSP {
        namespace FX {

    /**
     * @brief High-Fidelity Roland RE-201 Space Echo Emulation.
     * [ID]: FX-DL-002
     * [Tech]: Multi-head Tape Delay, Magnetic Saturation, Spring Tank.
     */
    class SpaceEchoProcessor {
    public:
        struct Params {
            float tapeSpeed = 0.5f;     // "Repeat Rate" knob (0.0 to 1.0)
            float intensity = 0.4f;     // "Intensity" (Feedback)
            float echoVol = 0.5f;       // "Echo Vol"
            float reverbVol = 0.3f;     // "Reverb Vol"
            int mode = 1;               // 1-12 (Mode Selector)
            float wowFlutter = 0.2f;    // Tape age / mechanical condition
            float tapeDrive = 0.5f;     // Input gain to tape
        };

    private:
        // Helper for simple LPF
        struct OnePoleLPF {
            float z1 = 0.0f;
            float process(float in, float coeff) {
                z1 = in * (1.0f - coeff) + z1 * coeff;
                return z1;
            }
        };

    public:
        void prepare(double sampleRate) {
            mSampleRate = sampleRate;
            // Buffer for 4 seconds of tape at 44.1k
            mBuffer.assign(static_cast<int>(sampleRate * 4.0), 0.0f);
            mWriteIdx = 0;
            mFeedbackPath = 0.0f;
            
            // Reverb Tank: 3 parallel spring lines (decoherent lengths)
            mSpring1.assign(static_cast<int>(sampleRate * 0.033), 0.0f);
            mSpring2.assign(static_cast<int>(sampleRate * 0.038), 0.0f);
            mSpring3.assign(static_cast<int>(sampleRate * 0.047), 0.0f);
            mS1Idx = mS2Idx = mS3Idx = 0;

            mRandomGen.seed(std::random_device{}());
            mNoiseDist = std::uniform_real_distribution<float>(-1.0f, 1.0f);
        }

        void process(float* left, float* right, int numSamples, const Params& p) {
            // Calculate base delay from tape speed (Inverse: Higher speed = Lower delay)
            // RE-201 typically 60ms to 600ms on Head 1
            float baseDelaySamples = (0.06f + (1.0f - p.tapeSpeed) * 0.54f) * (float)mSampleRate;
            
            // Tape frequency loss coefficient based on speed
            // Faster speed = higher fidelity (lower coefficient for high-cut)
            float tapeLossHz = 400.0f + p.tapeSpeed * 12000.0f;
            float lpfCoeff = std::exp(-2.0f * 3.14159f * tapeLossHz / (float)mSampleRate);

            for (int i = 0; i < numSamples; ++i) {
                float monoIn = (left[i] + right[i]) * 0.5f;

                // 1. Wow & Flutter (Dual LFO)
                updateModulation(p.wowFlutter);

                // 2. Input to Tape (Saturación Magnética)
                // x * (1.5 - 0.5 * x^2) is a decent soft-clipper
                float tapeInput = (monoIn + mFeedbackPath * p.intensity) * (0.5f + p.tapeDrive);
                float saturated = std::tanh(tapeInput); 

                // Add subtle tape hiss
                float hiss = mNoiseDist(mRandomGen) * 0.0001f * (1.0f + p.tapeSpeed * 0.5f);
                mBuffer[mWriteIdx] = saturated + hiss;

                // 3. Multi-Head Reading (Ratios: 1.0, 1.9, 2.9)
                float echoSignal = readHeads(p.mode, baseDelaySamples);

                // Apply Tape Loss (Filter)
                mFeedbackPath = mTapeLossFilter.process(echoSignal, lpfCoeff);

                // 4. Spring Reverb Tank
                float revIn = (monoIn * 0.3f) + (mFeedbackPath * 0.2f);
                float reverbSignal = processSpringTank(revIn);

                // 5. Output Mix
                float wetEcho = mFeedbackPath * p.echoVol;
                float wetRev  = reverbSignal * p.reverbVol;
                
                left[i] = monoIn + wetEcho + wetRev;
                right[i] = monoIn + wetEcho + wetRev;

                mWriteIdx = (mWriteIdx + 1) % mBuffer.size();
            }
        }

    private:
        double mSampleRate = 44100.0;
        std::vector<float> mBuffer;
        int mWriteIdx = 0;
        float mFeedbackPath = 0.0f;
        
        OnePoleLPF mTapeLossFilter;
        
        // Spring Tank
        std::vector<float> mSpring1, mSpring2, mSpring3;
        int mS1Idx, mS2Idx, mS3Idx;
        float mSpringZ1 = 0.0f;

        // Modulation members
        float mWowPhase = 0.0f;
        float mFlutterPhase = 0.0f;
        float mCurrentMod = 0.0f;
        std::mt19937 mRandomGen;
        std::uniform_real_distribution<float> mNoiseDist;

        void updateModulation(float amount) {
            // Wow: 0.8Hz Slow motor drift
            mWowPhase += (0.8f / mSampleRate) * 2.0f * 3.14159f;
            // Flutter: 12Hz mechanical jitter
            mFlutterPhase += (15.0f / mSampleRate) * 2.0f * 3.14159f;
            
            float drift = std::sin(mWowPhase) * 0.002f;
            float jitter = mNoiseDist(mRandomGen) * 0.0005f; 
            
            mCurrentMod = (drift + jitter) * amount;
        }

        float readHeads(int mode, float baseDelay) {
            auto readAt = [&](float ratio) -> float {
                float delay = baseDelay * ratio * (1.0f + mCurrentMod);
                float readPos = static_cast<float>(mWriteIdx) - delay;
                while (readPos < 0) readPos += (float)mBuffer.size();
                
                int i0 = static_cast<int>(readPos);
                int i1 = (i0 + 1) % mBuffer.size();
                float f = readPos - (float)i0;
                return mBuffer[i0] * (1.0f - f) + mBuffer[i1] * f;
            };

            float out = 0.0f;
            // Head Spacing accurately tuned to 1.0, 1.9, 2.9 (The "Dub" spacing)
            if (mode == 1 || mode == 4 || mode == 6 || mode == 7 || mode == 8 || mode == 11) 
                out += readAt(1.0f);
            if (mode == 2 || mode == 4 || mode == 5 || mode == 7 || mode == 9 || mode == 11 || mode == 12) 
                out += readAt(1.9f);
            if (mode == 3 || mode == 5 || mode == 6 || mode == 7 || mode == 10 || mode == 12) 
                out += readAt(2.9f);
            
            return out;
        }

        float processSpringTank(float in) {
            // Simple parallel comb tank
            auto driveMuelle = [&](std::vector<float>& buf, int& idx, float input, float fb) {
                float tap = buf[idx];
                buf[idx] = input + tap * fb;
                idx = (idx + 1) % buf.size();
                return tap;
            };

            float s1 = driveMuelle(mSpring1, mS1Idx, in, 0.85f);
            float s2 = driveMuelle(mSpring2, mS2Idx, in, 0.82f);
            float s3 = driveMuelle(mSpring3, mS3Idx, in, 0.79f);

            float mix = (s1 - s2 + s3) * 0.4f; // Decoherencia de fase con signo invertido
            
            // All-pass filter post-tank for "smear" (Schroeder)
            float apIn = mix;
            float apTap = mSpringZ1;
            mSpringZ1 = apIn + apTap * -0.5f;
            return apTap + mSpringZ1 * 0.5f;
        }
    };

        } // namespace FX
    } // namespace DSP
} // namespace Omega

#endif
