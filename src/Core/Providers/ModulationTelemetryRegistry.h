#pragma once

#include <string>
#include <vector>
#include <map>
#include <mutex>

namespace Omega {
namespace Core {
namespace Providers {

    /**
     * @brief Type of Telemetry Pin.
     * Determines how the Signal is processed for the UI.
     */
    enum class TelemetryType {
        Audio,      // High speed, full buffer (Stream)
        Modulation, // Control speed (Stream)
        Discrete    // Values only, Peak-Hold optimization (Discrete)
    };

    struct TelemetryPin {
        std::string id;        // instance:pin_name
        std::string label;
        TelemetryType type;
        int slotIndex;
    };

    /**
     * @brief Aseptic Telemetry Registry.
     * Maps semantic pin names to physical Hub slots dynamically.
     */
    class ModulationTelemetryRegistry {
    public:
        static ModulationTelemetryRegistry& getInstance() {
            static ModulationTelemetryRegistry instance;
            return instance;
        }

        /**
         * @brief Registers a new pin and returns its slot index.
         * If the pin already exists, returns the existing index.
         */
        int registerPin(const std::string& instanceId, 
                         const std::string& pinName, 
                         TelemetryType type,
                         const std::string& label = "") {
            std::lock_guard<std::mutex> lock(mMutex);
            
            std::string fullId = instanceId + ":" + pinName;
            
            if (mPinMap.find(fullId) != mPinMap.end()) {
                return mPinMap[fullId];
            }

            // Assign a new slot
            int slot = mNextSlot++;
            mPinMap[fullId] = slot;
            
            TelemetryPin pin;
            pin.id = fullId;
            pin.label = label.empty() ? pinName : label;
            pin.type = type;
            pin.slotIndex = slot;
            mActivePins.push_back(pin);

            return slot;
        }

        int getPinIndex(const std::string& fullId) {
            std::lock_guard<std::mutex> lock(mMutex);
            if (mPinMap.find(fullId) == mPinMap.end()) return -1;
            return mPinMap[fullId];
        }

        std::vector<TelemetryPin> getActivePins() {
            std::lock_guard<std::mutex> lock(mMutex);
            return mActivePins;
        }

    private:
        ModulationTelemetryRegistry() : mNextSlot(0) {}
        
        std::mutex mMutex;
        std::map<std::string, int> mPinMap;
        std::vector<TelemetryPin> mActivePins;
        int mNextSlot;
    };

} // namespace Providers
} // namespace Core
} // namespace Omega
