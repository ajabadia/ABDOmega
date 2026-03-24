#pragma once

#include <vector>
#include <array>
#include <algorithm>

namespace Omega::DSP::Engines::Korg {

    /**
     * @brief Korg Prophecy Arpeggiator.
     * Supports classic modes and user-definable 16-step patterns.
     */
    class ProphecyArpeggiator {
    public:
        enum Mode { Up, Down, Alt1, Alt2, Random, User };

        struct Step {
            bool gate = true;
            float velocityScale = 1.0f;
            int semitoneOffset = 0;
        };

        struct Params {
            Mode mode = Up;
            int octaveRange = 1;
            float gateTime = 0.8f; // 0.0 to 1.0
            bool active = false;
        };

        void setPattern(const std::array<Step, 16>& pattern) {
            mUserPattern = pattern;
        }

        void update(const Params& p, const std::vector<int>& heldNotes) {
            mParams = p;
            mHeldNotes = heldNotes;
            if (mHeldNotes.empty()) {
                mCurrentNoteIndex = -1;
                return;
            }
            std::sort(mHeldNotes.begin(), mHeldNotes.end());
        }

        int nextNote(int& velocity) {
            if (!mParams.active || mHeldNotes.empty()) return -1;

            mStepCounter++;
            if (mStepCounter >= mHeldNotes.size() * mParams.octaveRange) {
                mStepCounter = 0;
            }

            // Simplified User Pattern logic
            if (mParams.mode == User) {
                auto& step = mUserPattern[mStepCounter % 16];
                if (!step.gate) return -2; // Rest
                
                int noteBase = mHeldNotes[0]; // User patterns often use first held note as base
                velocity = (int)(100 * step.velocityScale);
                return noteBase + step.semitoneOffset;
            }

            // Standard Modes
            int noteIdx = mStepCounter % mHeldNotes.size();
            int octave = mStepCounter / mHeldNotes.size();
            
            int baseNote = mHeldNotes[noteIdx];
            return baseNote + (octave * 12);
        }

    private:
        Params mParams;
        std::vector<int> mHeldNotes;
        std::array<Step, 16> mUserPattern{};
        int mStepCounter = 0;
        int mCurrentNoteIndex = -1;
    };

} // namespace Omega::DSP::Engines::Korg
