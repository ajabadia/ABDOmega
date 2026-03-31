#pragma once

#include <juce_data_structures/juce_data_structures.h>
#include "OmegaIdentifiers.h"

namespace Omega {
namespace Core {
namespace Preset {

    /**
     * @brief Normalizes a ValueTree by mapping legacy/heuristic keys to canonical ones.
     */
    class OmegaPresetNormalizer {
    public:
        using IDs = Omega::Core::Identifiers;

        static void normalize(juce::ValueTree& tree) {
            if (!tree.isValid()) return;

            // 1. Recursive normalization for children
            for (auto child : tree) {
                normalize(child);
            }

            // 2. Specific remappings
            if (tree.hasType(IDs::params) || tree.getType().toString().contains("params")) {
                remap(tree, "vcfKybd", IDs::vcfKeyTracking);
                remap(tree, "vcfEnvInv", IDs::vcfEnvInverted);
                remap(tree, "hpfPos", IDs::hpfPosition);
                remap(tree, "kHpRes", IDs::korgHpResonance);
                remap(tree, "korgHpRes", IDs::korgHpResonance);
                remap(tree, "pwmModeLfo", IDs::pwmMode);
            }

            if (tree.hasType(IDs::LAYER) || tree.hasType("LAYER")) {
                remap(tree, "architecture", IDs::voiceArch);
            }

            if (tree.hasType(IDs::OMEGAPRESET) || tree.hasType("OMEGAPRESET")) {
                remap(tree, "presetId", IDs::id);
            }
        }

    private:
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
