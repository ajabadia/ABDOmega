#pragma once

#include <cmath>
#include <algorithm>

namespace Omega {
    namespace DSP {
        namespace Engines {
            namespace Korg {

    /**
     * @brief Korg MS-20 External Signal Processor (ESP).
     * [ID]: ACC-MS20-ESP
     * [Fidelity]: Emulación del procesador de señales externas: BPF + F-V + Env Follower.
     */
    class KorgMs20Esp {
    public:
        struct EspResult {
            float pitch = 0.0f;     // 0..1 (normalizado a rango musical)
            float envelope = 0.0f;  // 0..1
            bool trigger = false;
        };

        void prepare(double sampleRate) {
            mSampleRate = sampleRate;
            mEnvState = 0.0f;
            mBpf_z1 = mBpf_z2 = 0.0f;
            mLastSample = 0.0f;
            mTimer = 0;
            mLastPeriod = 0.0f;
        }

        EspResult process(float input) {
            EspResult res;

            // 1. Preamp & Bandpass Filter (Simplificado 1-pole BP)
            // En el MS-20 real es un BPF para elegir el área de tracking
            float g = std::tan(3.14159f * mBpfFreq / (float)mSampleRate);
            auto clean_tanh = [](float x) { return x / (1.0f + std::abs(x)); };
            
            float bpf_in = clean_tanh(input * mGain);
            float bpf_out = (bpf_in - mBpf_z1) * g;
            mBpf_z1 = bpf_out; // Simplificación extrema para el ESP

            // 2. Envelope Follower
            float absIn = std::abs(bpf_in);
            float coeff = (absIn > mEnvState) ? mAttackCoeff : mReleaseCoeff;
            mEnvState += (absIn - mEnvState) * coeff;
            res.envelope = (mEnvState < 0.0f) ? 0.0f : (mEnvState > 1.0f ? 1.0f : mEnvState);

            // 3. F-V Converter (Zero Crossing simple)
            mTimer++;
            if (mLastSample <= 0.0f && bpf_out > 0.0f) {
                if (mTimer > 10) { // Denoiser
                    mLastPeriod = (float)mTimer;
                    mTimer = 0;
                }
            }
            mLastSample = bpf_out;

            if (mLastPeriod > 0.0f) {
                float freq = (float)mSampleRate / mLastPeriod;
                // Normalizar freq a un valor 0..1 (ej: 20Hz a 2000Hz)
                float normFreq = (std::log2(freq / 20.0f)) / 7.0f;
                res.pitch = (normFreq < 0.0f) ? 0.0f : (normFreq > 1.0f ? 1.0f : normFreq);
            }

            // 4. Trigger Out (Threshold)
            res.trigger = (res.envelope > mThreshold);

            return res;
        }

        void setParams(float gain, float bpfFreq, float attack, float release, float threshold) {
            mGain = gain;
            mBpfFreq = bpfFreq;
            mAttackCoeff = 1.0f - std::exp(-1.0f / (attack * (float)mSampleRate + 1.0f));
            mReleaseCoeff = 1.0f - std::exp(-1.0f / (release * (float)mSampleRate + 1.0f));
            mThreshold = threshold;
        }

    private:
        double mSampleRate = 44100.0;
        float mGain = 1.0f;
        float mBpfFreq = 1000.0f;
        float mAttackCoeff = 0.1f;
        float mReleaseCoeff = 0.01f;
        float mThreshold = 0.1f;

        float mEnvState = 0.0f;
        float mBpf_z1 = 0.0f;
        float mBpf_z2 = 0.0f;
        float mLastSample = 0.0f;
        int mTimer = 0;
        float mLastPeriod = 0.0f;
    };

            } // namespace Korg
        } // namespace Engines
    } // namespace DSP
} // namespace Omega
