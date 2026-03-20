#pragma once

#include <algorithm>
#include <cmath>
#include <cstdint>

namespace Omega::DSP::VA {

    /**
     * @brief ADSR Envelope con curvas exponenciales.
     * [Fidelity]: Basado en la especificación de 0006.txt (línea 1594).
     * [AudioThreadSafety]: Optimizado para el audio thread.
     */
    class EnvelopeAdsrVA {
    public:
        enum class State { Idle, Attack, Decay, Sustain, Release };

        void prepare(double sampleRate) noexcept {
            mSampleRate = sampleRate > 0.0 ? sampleRate : 44100.0;
            reset();
        }

        void reset() noexcept {
            mLevel = 0.0f;
            mState = State::Idle;
        }

        void noteOn() noexcept {
            mState = State::Attack;
        }

        void noteOff() noexcept {
            if (mState != State::Idle)
                mState = State::Release;
        }

        void setAttackMs(float ms) noexcept { mAttackMs = std::max(ms, 0.1f); calcAttackCoef(); }
        void setDecayMs(float ms) noexcept { mDecayMs = std::max(ms, 0.1f); calcDecayCoef(); }
        void setSustain(float s) noexcept { mSustain = std::clamp(s, 0.0f, 1.0f); }
        void setReleaseMs(float ms) noexcept { mReleaseMs = std::max(ms, 1.0f); calcReleaseCoef(); }

        /**
         * @brief Procesa un bloque de muestras de la envolvente.
         */
        void process(float* envOut, int numSamples) noexcept {
            for (int i = 0; i < numSamples; ++i) {
                switch (mState) {
                    case State::Idle:
                        mLevel = 0.0f;
                        break;

                    case State::Attack:
                        mLevel += mAttackCoef * (1.01f - mLevel); // Pequeño offset para evitar asíntota infinita
                        if (mLevel >= 1.0f) {
                            mLevel = 1.0f;
                            mState = State::Decay;
                        }
                        break;

                    case State::Decay:
                        mLevel += mDecayCoef * (mSustain - mLevel);
                        if (std::abs(mLevel - mSustain) < 1e-4f) {
                            mLevel = mSustain;
                            mState = State::Sustain;
                        }
                        break;

                    case State::Sustain:
                        mLevel = mSustain;
                        break;

                    case State::Release:
                        mLevel += mReleaseCoef * (0.0f - mLevel);
                        if (mLevel <= 1e-4f) {
                            mLevel = 0.0f;
                            mState = State::Idle;
                        }
                        break;
                }
                envOut[i] = mLevel;
            }
        }

        float getCurrentLevel() const noexcept { return mLevel; }
        State getState() const noexcept { return mState; }
        bool isActive() const noexcept { return mState != State::Idle; }

        /**
         * @brief Procesa una única muestra de la envolvente.
         */
        float getNextSample() noexcept {
            switch (mState) {
                case State::Idle:
                    mLevel = 0.0f;
                    break;

                case State::Attack:
                    mLevel += mAttackCoef * (1.01f - mLevel);
                    if (mLevel >= 1.0f) {
                        mLevel = 1.0f;
                        mState = State::Decay;
                    }
                    break;

                case State::Decay:
                    mLevel += mDecayCoef * (mSustain - mLevel);
                    if (std::abs(mLevel - mSustain) < 1e-4f) {
                        mLevel = mSustain;
                        mState = State::Sustain;
                    }
                    break;

                case State::Sustain:
                    mLevel = mSustain;
                    break;

                case State::Release:
                    mLevel += mReleaseCoef * (0.0f - mLevel);
                    if (mLevel <= 1e-4f) {
                        mLevel = 0.0f;
                        mState = State::Idle;
                    }
                    break;
            }
            return mLevel;
        }

    private:
        void calcAttackCoef() noexcept { mAttackCoef = 1.0f - std::exp(-1.0f / (mAttackMs * 0.001f * mSampleRate)); }
        void calcDecayCoef() noexcept { mDecayCoef = 1.0f - std::exp(-1.0f / (mDecayMs * 0.001f * mSampleRate)); }
        void calcReleaseCoef() noexcept { mReleaseCoef = 1.0f - std::exp(-1.0f / (mReleaseMs * 0.001f * mSampleRate)); }

        double mSampleRate = 44100.0;
        float mLevel = 0.0f;
        State mState = State::Idle;
        
        float mAttackMs = 10.0f, mDecayMs = 100.0f, mSustain = 0.8f, mReleaseMs = 200.0f;
        float mAttackCoef = 0.001f, mDecayCoef = 0.001f, mReleaseCoef = 0.001f;
    };

} // namespace Omega::DSP::VA
