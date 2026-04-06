#pragma once

#include <vector>
#include <array>
#include <atomic>

namespace Omega::Core::Modulation {

    /**
     * @brief OMEGA Motion Control.
     * Record and playback parameter movements.
     * Supports up to 99 bars (standard JP-8080 spec).
     */
    class MotionRecorder {
    public:
        static constexpr int kMaxSteps = 44100 * 60 * 2; // ~2 minutes at 44.1kHz

        struct Recording {
            std::vector<float> data;
            bool active = false;
        };

        void startRecording() {
            mIsRecording = true;
            mWritePos = 0;
            mRecording.data.clear();
            mRecording.data.reserve(44100 * 4); // Start with 4 seconds
        }

        void stopRecording() {
            mIsRecording = false;
            mRecording.active = true;
        }

        void recordValue(float value) {
            if (mIsRecording) {
                mRecording.data.push_back(value);
            }
        }

        float playValue(bool loop = true) {
            if (!mRecording.active || mRecording.data.empty()) return 0.0f;
            
            float val = mRecording.data[mReadPos++];
            if (mReadPos >= mRecording.data.size()) {
                if (loop) mReadPos = 0;
                else mReadPos = (int)mRecording.data.size() - 1;
            }
            return val;
        }

        bool isRecording() const { return mIsRecording; }
        void setPlaybackActive(bool active) { mRecording.active = active; if (!active) mReadPos = 0; }

    private:
        Recording mRecording;
        std::atomic<bool> mIsRecording{false};
        size_t mWritePos = 0;
        size_t mReadPos = 0;
    };

} // namespace Omega::Core::Modulation
