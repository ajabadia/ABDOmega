#pragma once

#include <juce_data_structures/juce_data_structures.h>
#include "OmegaIdentifiers.h"
#include <functional>
#include <string>

namespace Omega {
namespace Core {
namespace Preset {

    /**
     * @brief Logger-Synced Normalizer for OMEGA Build #188.
     * Redirects traces to the OMEGA_BOOT_LOG.txt via functional injection.
     */
    class OmegaPresetNormalizer {
    public:
        using IDs = Omega::Core::Identifiers;
        using Logger = std::function<void(const std::string&)>;

        /**
         * @brief Normalizes a ValueTree recursively with full tracing.
         */
        static void normalize(juce::ValueTree tree, Logger log = nullptr) {
            if (!tree.isValid()) return;

            juce::Identifier typeId = tree.getType();
            juce::String type = typeId.toString();
            
            if (log) log("[DEBUG] normalize: visiting node type '" + type.toStdString() + "'");

            // 1. Direct Identifier Match (The most robust way in JUCE)
            if (typeId == IDs::patchbayMatrix || type == "patchbayMatrix") {
                normalizePatchbayMatrix(tree, log);
            }

            // 2. Propagate to children
            for (int i = 0; i < tree.getNumChildren(); ++i) {
                normalize(tree.getChild(i), log);
            }
        }

    private:
        /**
         * @brief Normalizes the Patchbay Matrix to exactly 64 slots.
         */
        static void normalizePatchbayMatrix(juce::ValueTree matrix, Logger log) {
            int currentCount = matrix.getNumChildren();
            if (currentCount < 64) {
                if (log) log("[REPAIR] Expanding PatchbayMatrix from " + std::to_string(currentCount) + " to 64 slots");
                for (int i = currentCount; i < 64; ++i) {
                    juce::ValueTree slot(IDs::slot);
                    slot.setProperty(IDs::active, false, nullptr);
                    slot.setProperty(IDs::source, "", nullptr);
                    slot.setProperty(IDs::target, "", nullptr);
                    slot.setProperty(IDs::amount, 0.0f, nullptr);
                    matrix.addChild(slot, -1, nullptr);
                }
            }
        }
    };

} // namespace Preset
} // namespace Core
} // namespace Omega
