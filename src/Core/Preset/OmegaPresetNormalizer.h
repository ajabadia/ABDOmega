#pragma once

#include <juce_data_structures/juce_data_structures.h>
#include "OmegaIdentifiers.h"
#include <functional>
#include <string>

namespace Omega {
namespace Core {
namespace Preset {

    /**
     * @brief Structural Normalizer for OMEGA Presets.
     * Ensures structural integrity (e.g. correct slot count) without any ID translation.
     * 
     * [Era 4 Principle]: All IDs must be correct at the source (YAML/C++ defaults).
     * No compatibility shims or legacy ID translation are permitted here.
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

            // Ensure patchbay matrix always has the correct number of slots
            if (typeId == IDs::patchbayMatrix || type == "patchbayMatrix") {
                normalizePatchbayMatrix(tree, log);
            }

            // Propagate to children
            for (int i = 0; i < tree.getNumChildren(); ++i) {
                normalize(tree.getChild(i), log);
            }
        }

    private:
        /**
         * @brief Ensures the Patchbay Matrix has exactly 64 slots.
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
