#pragma once

#include <vector>
#include <array>
#include <atomic>
#include <string>
#include <cstdint>

namespace Omega::Core::Modulation {

    /**
     * @brief Hub de telemetría de modulación.
     * [ThreadSafety]: Lock-free. Diseñado para ser alimentado por el Audio Thread
     * y leído por el Message/UI Thread.
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
         * @brief Actualiza los valores actuales desde el Audio Thread.
         */
        void update(const std::array<float, kMaxSignals>& currentValues) {
            for (int i = 0; i < kMaxSignals; ++i) {
                float val = currentValues[i];
                mLatestValues[i].store(val, std::memory_order_relaxed);
                
                // Update history (circular)
                int pos = mWritePos[i].load(std::memory_order_relaxed);
                mHistory[i][pos] = val;
                mWritePos[i].store((pos + 1) % kHistoryLength, std::memory_order_release);
            }
        }

        /**
         * @brief Obtiene el valor más reciente de una señal.
         */
        float getLatest(int signalIndex) const {
            if (signalIndex < 0 || signalIndex >= kMaxSignals) return 0.0f;
            return mLatestValues[signalIndex].load(std::memory_order_relaxed);
        }

        /**
         * @brief Copia el historial completo de una señal para visualización.
         */
        void getHistory(int signalIndex, float* targetBuffer) const {
            if (signalIndex < 0 || signalIndex >= kMaxSignals) return;
            
            int pos = mWritePos[signalIndex].load(std::memory_order_acquire);
            for (int i = 0; i < kHistoryLength; ++i) {
                targetBuffer[i] = mHistory[signalIndex][(pos + i) % kHistoryLength];
            }
        }

    private:
        ModulationTelemetryHub() {
            for (int i = 0; i < kMaxSignals; ++i) {
                mLatestValues[i].store(0.0f);
                mWritePos[i].store(0);
                mHistory[i].fill(0.0f);
            }
        }

        std::array<std::atomic<float>, kMaxSignals> mLatestValues;
        std::array<std::array<float, kHistoryLength>, kMaxSignals> mHistory;
        std::array<std::atomic<int>, kMaxSignals> mWritePos;
    };

} // namespace Omega::Core::Modulation
