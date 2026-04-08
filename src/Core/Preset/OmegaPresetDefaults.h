#pragma once

#include <juce_data_structures/juce_data_structures.h>
#include "OmegaIdentifiers.h"
#include "OmegaPresetSchema.h"

namespace Omega {
namespace Core {
namespace Preset {

    /**
     * @brief Authority for default OMEGA preset states.
     */
    class OmegaPresetDefaults {
    public:
        using IDs = Omega::Core::Identifiers;

        static juce::ValueTree createDefaultPreset() {
            juce::ValueTree p(IDs::OMEGAPRESET);
            p.setProperty(IDs::name, "Default Modular", nullptr);
            p.setProperty(IDs::author, "OMEGA", nullptr);
            p.setProperty(IDs::engine, "Modular", nullptr);
            p.setProperty(IDs::masterGainDb, -3.0f, nullptr);
            
            juce::ValueTree layers(IDs::layers);
            layers.addChild(createDefaultLayer("Main Voice"), -1, nullptr);
            p.addChild(layers, -1, nullptr);
            
            juce::ValueTree aux(IDs::auxiliary);
            
            // 1. PATCHBAY-MATRIX (Routing Hub)
            juce::ValueTree matrixMod(IDs::COMPONENT);
            matrixMod.setProperty(IDs::slotName, "PATCHBAY-MATRIX", nullptr);
            matrixMod.setProperty(IDs::componentId, "PATCHBAY-MATRIX-001", nullptr);
            aux.addChild(matrixMod, -1, nullptr);

            p.addChild(aux, -1, nullptr);
            
            // VA 2.1: Explicit Patchbay Routing
            juce::ValueTree matrix(IDs::patchbayMatrix);
            
            p.addChild(matrix, -1, nullptr);
            p.addChild(createDefaultVisual(), -1, nullptr);
            return p;
        }

        static juce::ValueTree createDefaultLayer(const juce::String& name) {
            juce::ValueTree l(IDs::LAYER);
            l.setProperty(IDs::id, "layer.a", nullptr);
            l.setProperty(IDs::name, name, nullptr);
            
            juce::ValueTree params(IDs::params);
            l.addChild(params, -1, nullptr);
            
            // VA 2.1: Unified Voice Chain (Empty by default in Era 4)
            juce::ValueTree chain(IDs::voiceChain);
            juce::ValueTree nodes(IDs::NODES);
            juce::ValueTree conns(IDs::CONNECTIONS);

            chain.addChild(nodes, -1, nullptr);
            chain.addChild(conns, -1, nullptr);
            l.addChild(chain, -1, nullptr);

            return l;
        }

        static juce::ValueTree createMinimalPreset() {
            juce::ValueTree p(IDs::OMEGAPRESET);
            p.setProperty(IDs::name, "Empty Modular Slate", nullptr);
            p.setProperty(IDs::author, "OMEGA", nullptr);
            p.setProperty(IDs::engine, "Modular", nullptr);
            p.setProperty(IDs::masterGainDb, 0.0f, nullptr);
            
            juce::ValueTree layers(IDs::layers);
            juce::ValueTree l(IDs::LAYER);
            l.setProperty(IDs::id, "layer.a", nullptr);
            l.setProperty(IDs::name, "Voice A", nullptr);
            l.addChild(juce::ValueTree(IDs::params), -1, nullptr);
            l.addChild(juce::ValueTree(IDs::voiceChain), -1, nullptr);
            layers.addChild(l, -1, nullptr);
            juce::ValueTree aux(IDs::auxiliary);
            juce::ValueTree matrixMod(IDs::COMPONENT);
            matrixMod.setProperty(IDs::slotName, "PATCHBAY-MATRIX", nullptr);
            matrixMod.setProperty(IDs::componentId, "PATCHBAY-MATRIX-001", nullptr);
            aux.addChild(matrixMod, -1, nullptr);

            p.addChild(aux, -1, nullptr);
            p.addChild(juce::ValueTree(IDs::patchbayMatrix), -1, nullptr);
            p.addChild(createDefaultVisual(), -1, nullptr);
            return p;
        }

        static juce::ValueTree createDefaultVisual() {
            juce::ValueTree v(IDs::VISUAL);
            juce::ValueTree s(IDs::scope);
            s.setProperty(IDs::followsPreset, true, nullptr);
            s.setProperty(IDs::mode, "PRESET", nullptr);
            s.setProperty(IDs::currentContext, "audio", nullptr);
            s.setProperty(IDs::freeze, false, nullptr);

            auto audio = juce::ValueTree(IDs::audio);
            audio.setProperty(IDs::viewMode, "SOURCE_A", nullptr);
            audio.setProperty(IDs::sourceA, "MASTER_OUT", nullptr);
            audio.setProperty(IDs::timebase, 0.5f, nullptr);
            audio.setProperty(IDs::scale, 1.0f, nullptr);
            s.addChild(audio, -1, nullptr);

            v.addChild(s, -1, nullptr);
            return v;
        }
    };

} // namespace Preset
} // namespace Core
} // namespace Omega
