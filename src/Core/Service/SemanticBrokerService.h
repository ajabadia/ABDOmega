#pragma once

#include <vector>
#include <string>
#include <map>
#include <memory>
#include <mutex>
#include <juce_core/juce_core.h>
#include "../Modulation/ModuleManifest.h"
#include "../Preset/OmegaPreset.h"

namespace Omega {
namespace Core {
namespace Service {

    /**
     * @brief The Semantic Broker: Aggregates and manages module manifests from the active preset.
     * This is the single source of truth for 'What is loaded and what can it do?'.
     */
    class SemanticBrokerService {
    public:
        static SemanticBrokerService& getInstance() {
            static SemanticBrokerService instance;
            return instance;
        }

        /**
         * @brief Scans the given preset and rebuilds the semantic inventory.
         */
        void rebuildInventory(const Preset::OmegaPreset& preset);

        /**
         * @brief Returns the complete active inventory.
         */
        std::vector<Modulation::ModuleManifest> getInventory() const;

        /**
         * @brief Retrieves a manifest for a specific instance.
         */
        const Modulation::ModuleManifest* getManifest(const std::string& instanceId) const;

    private:
        SemanticBrokerService() = default;

        void scanLegacyRack(const juce::ValueTree& state);
        void scanDynamicNodes(const juce::ValueTree& state);
        void addStandardMidiSources();

        std::map<std::string, Modulation::ModuleManifest> mInventory;
        mutable std::mutex mMutex;
    };

} // namespace Service
} // namespace Core
} // namespace Omega
