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
        static constexpr int kMaxSignals = 64;
        static constexpr int kHistoryLength = 128;

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
         */
        void pushSignal(int i, float val) {
            if (i < 0 || i >= kMaxSignals) return;
            mLatestValues[i].store(val, std::memory_order_relaxed);
            
            // Update history (circular) - Atomic store
            int pos = mWritePos[i].load(std::memory_order_relaxed);
            mHistory[i][pos].store(val, std::memory_order_relaxed);
            mWritePos[i].store((pos + 1) % kHistoryLength, std::memory_order_release);
        }

        /**
         * @brief Pushes an individual value using the canonical enum index.
         */
        template<typename EnumType>
        void pushSignal(EnumType index, float val) {
            pushSignal(static_cast<int>(index), val);
        }

        /**
         * @brief Gets the most recent value of a signal.
         */
        float getLatest(int signalIndex) const {
            if (signalIndex < 0 || signalIndex >= kMaxSignals) return 0.0f;
            return mLatestValues[signalIndex].load(std::memory_order_relaxed);
        }

        /**
         * @brief Copies the full history of a signal for visualization.
         */
        void getHistory(int signalIndex, float* targetBuffer) const {
            if (signalIndex < 0 || signalIndex >= kMaxSignals) return;
            
            int pos = mWritePos[signalIndex].load(std::memory_order_acquire);
            for (int i = 0; i < kHistoryLength; ++i) {
                targetBuffer[i] = mHistory[signalIndex][(pos + i) % kHistoryLength].load(std::memory_order_relaxed);
            }
        }

    private:
        ModulationTelemetryHub() {
            for (int i = 0; i < kMaxSignals; ++i) {
                mLatestValues[i].store(0.0f);
                mWritePos[i].store(0);
                for (auto& h : mHistory[i]) h.store(0.0f);
            }
        }

        std::array<std::atomic<float>, kMaxSignals> mLatestValues;
        std::array<std::array<std::atomic<float>, kHistoryLength>, kMaxSignals> mHistory;
        std::array<std::atomic<int>, kMaxSignals> mWritePos;
    };

} // namespace Providers
} // namespace Core
} // namespace Omega
