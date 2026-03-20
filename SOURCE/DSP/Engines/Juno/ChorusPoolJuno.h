#pragma once

#include "JunoConstants.h"
#include <juce_audio_basics/juce_audio_basics.h>

namespace Omega::DSP::Engines::Juno {

    using namespace Constants;

    /**
     * @brief Emulación de Chorus BBD (Bucket Brigade Device) de alta fidelidad.
     * [Fidelity]: Interpolación Cúbica Hermite, Saturación BBD y desfase de LFO.
     */
    class ChorusBbd {
    public:
        void prepare(double sr, float phaseOffset = 0.0f) noexcept {
            mSampleRate = sr;
            mDelayBuffer.fill(0.0f);
            mWritePtr = 0;
            mPhase = phaseOffset;
            mRandom.setSeed(static_cast<juce::int64>(phaseOffset * 1000.0f) + 1);
        }

        void setMode(int mode) noexcept {
            mMode = mode;
            switch (mode) {
                case 1:  mRate = Chorus::kRateIMHz; mDepth = Chorus::kModDepthMs; break;
                case 2:  mRate = Chorus::kRateIIMHz; mDepth = Chorus::kModDepthMs * 0.5f; break;
                case 3:  mRate = Chorus::kRateIIMHz * 1.5f; mDepth = Chorus::kModDepthMs * 0.8f; break; 
                default: mRate = 0.0f; mDepth = 0.0f; break;
            }
        }

        float process(float x, float mix) noexcept {
            if (mMode == 0) return x;

            // 1. Saturación de entrada BBD (Warmth)
            float inputSaturated = std::tanh(x * 1.2f);

            // 2. LFO Modulada
            float lfo = std::sin(juce::MathConstants<float>::twoPi * mPhase);
            float delayMs = Chorus::kDelayBaseMs + lfo * mDepth;
            float delaySamples = delayMs * (float(mSampleRate) * 0.001f);

            // 3. Lectura con Interpolación Cúbica Hermite
            float readPos = float(mWritePtr) - delaySamples;
            while (readPos < 0) readPos += kBufferSize;

            int i1 = int(readPos);
            int i0 = (i1 - 1 + kBufferSize) % kBufferSize;
            int i2 = (i1 + 1) % kBufferSize;
            int i3 = (i1 + 2) % kBufferSize;
            float frac = readPos - float(i1);

            float y0 = mDelayBuffer[i0], y1 = mDelayBuffer[i1], y2 = mDelayBuffer[i2], y3 = mDelayBuffer[i3];
            float a0 = -0.5f * y0 + 1.5f * y1 - 1.5f * y2 + 0.5f * y3;
            float a1 = y0 - 2.5f * y1 + 2.0f * y2 - 0.5f * y3;
            float a2 = -0.5f * y0 + 0.5f * y2;
            float a3 = y1;
            float delayed = ((a0 * frac + a1) * frac + a2) * frac + a3;

            // 4. Hiss Analógico (Opcional pero añade textura)
            float hiss = (mRandom.nextFloat() * 2.0f - 1.0f) * std::pow(10.0f, Chorus::kHissLevelDb / 20.0f);
            delayed += hiss;

            // 5. Escritura
            mDelayBuffer[mWritePtr] = inputSaturated;
            mWritePtr = (mWritePtr + 1) % kBufferSize;

            // Incremento fase LFO
            mPhase += mRate / mSampleRate;
            if (mPhase >= 1.0) mPhase -= 1.0;

            return x * (1.0f - mix) + delayed * mix;
        }

    private:
        static constexpr int kBufferSize = 4096;
        std::array<float, kBufferSize> mDelayBuffer;
        int mWritePtr = 0;
        double mSampleRate = 44100.0;
        float mPhase = 0.0;
        int mMode = 1;
        float mRate = 0.44f;
        float mDepth = 4.0f;
        juce::Random mRandom;
    };

    /**
     * @brief Pool de Chorus para el AudioProcessor.
     */
    class ChorusPoolJuno {
    public:
        void prepare(double sr) noexcept {
            mLeft.prepare(sr, 0.0f);
            mRight.prepare(sr, 0.5f); // 180 grados de desfase para amplitud estéreo
        }

        void setMode(int mode) noexcept {
            mLeft.setMode(mode);
            mRight.setMode(mode);
        }

        void process(float& L, float& R, float mix = 0.5f) noexcept {
            L = mLeft.process(L, mix);
            R = mRight.process(R, mix);
        }

    private:
        ChorusBbd mLeft, mRight;
    };

} // namespace Omega::DSP::Engines::Juno
