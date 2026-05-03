#pragma once

#include <vector>
#include <string>
#include <map>
#include <memory>
#include <mutex>
#include <juce_core/juce_core.h>
#include "../Modulation/ModuleManifest.h"
#include "../Ace/AceCatalog.h"
#include "../Model/PatchDocument.h"

namespace Omega {
namespace Core {
namespace Service {

    /**
     * @brief The Semantic Broker (Era 7): Aggregates and manages module manifests from the active PatchDocument.
     * Single source of truth for semantic signal routing.
     */
    class SemanticBrokerService {
    public:
        static SemanticBrokerService& getInstance() {
            static SemanticBrokerService instance;
            return instance;
        }

        void setCatalog(Ace::AceCatalog* catalog) { mCatalog = catalog; }

        /**
         * @brief Scans and rebuilds the semantic inventory based on Era 7 PatchDocument.
         */
        void rebuildInventory(const Model::PatchDocument& doc);

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


        std::map<std::string, Modulation::ModuleManifest> mInventory;
        Ace::AceCatalog* mCatalog = nullptr;
        mutable std::mutex mMutex;
    };

} // namespace Service
} // namespace Core
} // namespace Omega
