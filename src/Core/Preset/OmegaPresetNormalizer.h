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
                
                // --- Voice Architecture 2.0 Normalization ---
                if (!tree.getChildWithName(IDs::voiceChain).isValid()) {
                    generateVoiceChainFromLegacyArch(tree);
                }
            }

            if (tree.hasType(IDs::OMEGAPRESET) || tree.hasType("OMEGAPRESET")) {
                remap(tree, "presetId", IDs::id);
            }
        }

    private:
        static void generateVoiceChainFromLegacyArch(juce::ValueTree& layer) {
            juce::ValueTree chain(IDs::voiceChain);
            juce::ValueTree nodes(IDs::NODES);
            juce::ValueTree conns(IDs::CONNECTIONS);

            // Access legacy voiceArch categories
            auto legacy = layer.getChildWithName(IDs::voiceArch);
            
            // 1. Add Oscillator (if exists)
            auto oscillators = legacy.getChildWithName(IDs::oscillators);
            if (oscillators.getNumChildren() > 0) {
                juce::ValueTree n(IDs::NODE);
                n.setProperty(IDs::nodeId, "osc0", nullptr);
                n.setProperty(IDs::componentId, oscillators.getChild(0)[IDs::componentId], nullptr);
                n.setProperty(IDs::role, "Source", nullptr);
                nodes.appendChild(n, nullptr);
            } else {
                // Default fallback if legacy is empty
                juce::ValueTree n(IDs::NODE);
                n.setProperty(IDs::nodeId, "osc0", nullptr);
                n.setProperty(IDs::componentId, "OSC-VA-001", nullptr);
                n.setProperty(IDs::role, "Source", nullptr);
                nodes.appendChild(n, nullptr);
            }

            // 2. Add Filter
            auto filters = legacy.getChildWithName(IDs::filters);
            std::string filterCompId = "VCF-VA-001";
            if (filters.getNumChildren() > 0) {
                filterCompId = filters.getChild(0)[IDs::componentId].toString().toStdString();
            }

            juce::ValueTree fn(IDs::NODE);
            fn.setProperty(IDs::nodeId, "flt0", nullptr);
            fn.setProperty(IDs::componentId, juce::String(filterCompId), nullptr);
            fn.setProperty(IDs::role, "Processor", nullptr);
            nodes.appendChild(fn, nullptr);

            // 3. Add Amplifier (Output)
            juce::ValueTree an(IDs::NODE);
            an.setProperty(IDs::nodeId, "amp0", nullptr);
            an.setProperty(IDs::componentId, "VCA-CANONICAL", nullptr);
            an.setProperty(IDs::role, "Processor", nullptr);
            nodes.appendChild(an, nullptr);

            // 4. Connect them
            auto createConn = [](const char* from, const char* to) {
                juce::ValueTree c(IDs::CONNECTION);
                c.setProperty(IDs::from, from, nullptr);
                c.setProperty(IDs::to, to, nullptr);
                c.setProperty("amount", 1.0f, nullptr);
                return c;
            };

            conns.appendChild(createConn("osc0", "flt0"), nullptr);
            conns.appendChild(createConn("flt0", "amp0"), nullptr);

            chain.appendChild(nodes, nullptr);
            chain.appendChild(conns, nullptr);
            layer.appendChild(chain, nullptr);
        }
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
