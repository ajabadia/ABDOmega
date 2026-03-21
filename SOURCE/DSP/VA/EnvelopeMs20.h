#pragma once

#include <algorithm>
#include <cmath>

namespace Omega {
    namespace DSP {
        namespace VA {

    /**
     * @brief Envelope estilo Korg MS-20 (ENV1).
     * [Fidelity]: Incluye fases de Delay y Hold.
     * [States]: Delay -> Attack -> Hold -> Decay -> Sustain -> Release.
     */
    class EnvelopeMs20 {
    public:
        enum class State { Idle, Delay, Attack, Hold, Decay, Sustain, Release };

        void prepare(double sampleRate) noexcept {
            mSampleRate = sampleRate > 0.0 ? sampleRate : 44100.0;
            reset();
        }

        void reset() noexcept {
            mLevel = 0.0f;
            mState = State::Idle;
            mTimer = 0;
        }

        void noteOn() noexcept {
            if (mDelayMs > 0.1f) {
                mState = State::Delay;
                mTimer = static_cast<int>(mDelayMs * 0.001f * mSampleRate);
            } else {
                mState = State::Attack;
            }
        }

        void noteOff() noexcept {
            if (mState != State::Idle)
                mState = State::Release;
        }

        void setDelayMs(float ms) noexcept { mDelayMs = ms; }
        void setAttackMs(float ms) noexcept { mAttackMs = std::max(ms, 0.1f); calcAttackCoef(); }
        void setHoldMs(float ms) noexcept { mHoldMs = ms; }
        void setDecayMs(float ms) noexcept { mDecayMs = std::max(ms, 0.1f); calcDecayCoef(); }
        void setSustain(float s) noexcept { mSustain = (s < 0.0f) ? 0.0f : (s > 1.0f ? 1.0f : s); }
        void setReleaseMs(float ms) noexcept { mReleaseMs = std::max(ms, 1.0f); calcReleaseCoef(); }

        float getNextSample() noexcept {
            switch (mState) {
                case State::Idle:
                    mLevel = 0.0f;
                    break;

                case State::Delay:
                    mLevel = 0.0f;
                    if (--mTimer <= 0) mState = State::Attack;
                    break;

                case State::Attack:
                    mLevel += mAttackCoef * (1.01f - mLevel);
                    if (mLevel >= 1.0f) {
                        mLevel = 1.0f;
                        if (mHoldMs > 0.1f) {
                            mState = State::Hold;
                            mTimer = static_cast<int>(mHoldMs * 0.001f * mSampleRate);
                        } else {
                            mState = State::Decay;
                        }
                    }
                    break;

                case State::Hold:
                    mLevel = 1.0f;
                    if (--mTimer <= 0) mState = State::Decay;
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

        bool isActive() const noexcept { return mState != State::Idle; }

    private:
        void calcAttackCoef() noexcept { mAttackCoef = 1.0f - std::exp(-1.0f / (mAttackMs * 0.001f * mSampleRate)); }
        void calcDecayCoef() noexcept { mDecayCoef = 1.0f - std::exp(-1.0f / (mDecayMs * 0.001f * mSampleRate)); }
        void calcReleaseCoef() noexcept { mReleaseCoef = 1.0f - std::exp(-1.0f / (mReleaseMs * 0.001f * mSampleRate)); }

        double mSampleRate = 44100.0;
        float mLevel = 0.0f;
        State mState = State::Idle;
        int mTimer = 0;
        
        float mDelayMs = 0.0f, mAttackMs = 10.0f, mHoldMs = 0.0f, mDecayMs = 100.0f, mSustain = 0.8f, mReleaseMs = 200.0f;
        float mAttackCoef = 0.001f, mDecayCoef = 0.001f, mReleaseCoef = 0.001f;
    };

        } // namespace VA
    } // namespace DSP
} // namespace Omega
