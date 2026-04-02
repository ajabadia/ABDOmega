#pragma once

#include <juce_data_structures/juce_data_structures.h>
#include "OmegaIdentifiers.h"

namespace Omega {
namespace Core {
namespace Preset {

    /**
     * @brief High-integrity normalizer for OMEGA Presets.
     * In the Current Core 2.0 version, all legacy remapping has been purged as 
     * project maintains zero-legacy compatibility for non-production environments. 
     */
    class OmegaPresetNormalizer {
    public:
        using IDs = Omega::Core::Identifiers;

        /**
         * @brief Normalizes a ValueTree to adhere to current schema standards.
         */
        static void normalize(juce::ValueTree& tree) {
            if (!tree.isValid()) return;

            // Recursive normalization for children
            for (auto child : tree) {
                normalize(child);
            }

            // Future schema-validation or default-value-filling logic goes here.
        }

    private:
        /**
         * @brief Internal helper to move properties between identifiers.
         */
        static void remap(juce::ValueTree& tree, const juce::Identifier& oldId, const juce::Identifier& newId) {
            if (tree.hasProperty(oldId)) {
                auto val = tree.getProperty(oldId);
                tree.setProperty(newId, val, nullptr);
                tree.removeProperty(oldId, nullptr);
            }
        }
    };

} // namespace Preset
} // namespace Core
} // namespace Omega
