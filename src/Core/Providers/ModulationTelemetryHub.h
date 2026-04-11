#pragma once

#include <vector>
#include <array>
#include <atomic>
#include <string>
#include <cstdint>

namespace Omega {
namespace Core {
namespace Providers {

    /**
     * @brief High-Performance Modulation Telemetry Hub.
     * [ThreadSafety]: Lock-free. Designed to be fed by the Audio Thread
     * and consumed by the Message/UI Thread (RPC Layer).
     * [Architecture]: Relocated to Core/Providers for professional visibility.
     */
    class ModulationTelemetryHub {
    public:
        static constexpr int kMaxSignals = 128; // Doubled for dynamic registration
        static constexpr int kHistoryLength = 2048; // Standardized High-Fidelity length

        static ModulationTelemetryHub& getInstance() {
            static ModulationTelemetryHub instance;
            return instance;
        }

        /**
         * @brief Updates the current values from the Audio Thread.
         */
        void update(const std::array<float, kMaxSignals>& currentValues) {
            for (int i = 0; i < kMaxSignals; ++i) {
                pushSignal(i, currentValues[i]);
            }
        }

        /**
         * @brief Pushes an individual value into one of the telemetry cells.
         * Updates history and absolute peak for UI consumption.
         */
        void pushSignal(int i, float val) {
            if (i < 0 || i >= kMaxSignals) return;
            
            mLatestValues[i].store(val, std::memory_order_relaxed);
            
            // Peak-Hold logic: Store the maximum absolute value since last UI poll
            float currentPeak = mPeakValues[i].load(std::memory_order_relaxed);
            float absVal = std::abs(val);
            if (absVal > currentPeak) {
                mPeakValues[i].store(absVal, std::memory_order_relaxed);
            }

            // Update history (circular) - Atomic store
            int pos = mWritePos[i].load(std::memory_order_relaxed);
            mHistory[i][pos].store(val, std::memory_order_relaxed);
            mWritePos[i].store((pos + 1) % kHistoryLength, std::memory_order_release);
        }

        /**
         * @brief Gets the most recent peak value and RESETS it.
         * Used by LEDs and Meters (Low-Speed / Discrete).
         */
        float getPeakAndReset(int signalIndex) {
            if (signalIndex < 0 || signalIndex >= kMaxSignals) return 0.0f;
            return mPeakValues[signalIndex].exchange(0.0f, std::memory_order_relaxed);
        }

        /**
         * @brief Gets the most recent value of a signal.
         */
        float getLatest(int signalIndex) const {
            if (signalIndex < 0 || signalIndex >= kMaxSignals) return 0.0f;
            return mLatestValues[signalIndex].load(std::memory_order_relaxed);
        }

        /**
         * @brief Copies a portion of history for visualization.
         * @param resolution Number of samples to retrieve (from Preferenes).
         */
        void getHistory(int signalIndex, float* targetBuffer, int resolution) const {
            if (signalIndex < 0 || signalIndex >= kMaxSignals) return;
            
            int samplesToCopy = std::min(resolution, (int)kHistoryLength);
            int writePos = mWritePos[signalIndex].load(std::memory_order_acquire);
            
            for (int i = 0; i < samplesToCopy; ++i) {
                // Read backwards from writePos to get the most recent data
                int readIdx = (writePos - samplesToCopy + i + kHistoryLength) % kHistoryLength;
                targetBuffer[i] = mHistory[signalIndex][readIdx].load(std::memory_order_relaxed);
            }
        }

    private:
        ModulationTelemetryHub() {
            for (int i = 0; i < kMaxSignals; ++i) {
                mLatestValues[i].store(0.0f);
                mPeakValues[i].store(0.0f);
                mWritePos[i].store(0);
                for (auto& h : mHistory[i]) h.store(0.0f);
            }
        }

        std::array<std::atomic<float>, kMaxSignals> mLatestValues;
        std::array<std::atomic<float>, kMaxSignals> mPeakValues;
        std::array<std::array<std::atomic<float>, kHistoryLength>, kMaxSignals> mHistory;
        std::array<std::atomic<int>, kMaxSignals> mWritePos;
    };

} // namespace Providers
} // namespace Core
} // namespace Omega
