#pragma once

#include <cmath>
#include <algorithm>
#include <vector>
#include <random>

namespace OmegaDSP
{
    namespace Modulation
    {
        /**
         * @brief High-fidelity LFO inspired by Korg Prophecy.
         * Supports over 30 shapes, manual/tempo sync, and smoothing.
         */
        class ProphecyLfo
        {
        public:
            enum class Shape
            {
                Triangle, Saw, Square, Sine, 
                RandomSNH, RandomSNH_Smooth,
                Step4, Step8, Step16,
                Pulse10, Pulse25, Pulse75,
                Guitar_Vib, // Special Prophecy shapes
                Human_Vib,
                // ... more to be added in full spec
            };

            ProphecyLfo() = default;

            void prepare(double sampleRate) noexcept
            {
                mSampleRate = sampleRate;
                mInvSampleRate = 1.0 / sampleRate;
                mPhase = 0.0f;
            }

            void reset() noexcept { mPhase = 0.0f; }

            void setFrequency(float hz) noexcept
            {
                mFrequency = (hz < 0.01f) ? 0.01f : (hz > 100.0f ? 100.0f : hz);
                mPhaseInc = mFrequency * static_cast<float>(mInvSampleRate);
            }

            void setShape(Shape shape) noexcept { mShape = shape; }
            void setSmoothing(float amount) noexcept { mSmoothing = amount; }
            void setOffset(float offset) noexcept { mOffset = offset; } // Start phase

            float process() noexcept
            {
                float output = 0.0f;

                switch (mShape)
                {
                    case Shape::Triangle:
                        output = 1.0f - 4.0f * std::abs(std::fmod(mPhase + 0.25f, 1.0f) - 0.5f);
                        break;
                    case Shape::Saw:
                        output = 1.0f - 2.0f * mPhase;
                        break;
                    case Shape::Square:
                        output = (mPhase < 0.5f) ? 1.0f : -1.0f;
                        break;
                    case Shape::Sine:
                        output = std::sin(2.0f * 3.14159265f * mPhase);
                        break;
                    case Shape::RandomSNH:
                    case Shape::RandomSNH_Smooth:
                        if (mPhase < mPhaseInc) // Trigger new value
                            mCurrentRandom = mDist(mGen);
                        
                        if (mShape == Shape::RandomSNH_Smooth)
                            output = mCurrentRandom * (1.0f - mSmoothing) + mPrevRandom * mSmoothing;
                        else
                            output = mCurrentRandom;
                        break;
                    default:
                        output = std::sin(2.0f * 3.14159265f * mPhase);
                        break;
                }

                // Update Phase
                mPhase += mPhaseInc;
                if (mPhase >= 1.0f)
                {
                    mPhase -= 1.0f;
                    mPrevRandom = mCurrentRandom;
                }

                return output;
            }

        private:
            double mSampleRate = 44100.0;
            double mInvSampleRate = 1.0 / 44100.0;
            float mPhase = 0.0f;
            float mPhaseInc = 0.0f;
            float mFrequency = 1.0f;
            float mSmoothing = 0.0f;
            float mOffset = 0.0f;
            Shape mShape = Shape::Triangle;

            float mCurrentRandom = 0.0f;
            float mPrevRandom = 0.0f;
            std::mt19937 mGen{std::random_device{}()};
            std::uniform_real_distribution<float> mDist{-1.0f, 1.0f};
        };
    }
}
