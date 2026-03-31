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
            p.setProperty(IDs::name, "Default Preset", nullptr);
            p.setProperty(IDs::author, "OMEGA", nullptr);
            p.setProperty(IDs::engine, "VirtualAnalog", nullptr);
            p.setProperty(IDs::masterGainDb, -3.0f, nullptr);
            
            juce::ValueTree layers(IDs::layers);
            layers.addChild(createDefaultLayer("Main Layer"), -1, nullptr);
            p.addChild(layers, -1, nullptr);
            
            p.addChild(createDefaultVisual(), -1, nullptr);
            return p;
        }

        static juce::ValueTree createDefaultLayer(const juce::String& name) {
            juce::ValueTree l(IDs::LAYER);
            l.setProperty(IDs::id, "A", nullptr);
            l.setProperty(IDs::name, name, nullptr);
            
            juce::ValueTree params(IDs::params);
            params.setProperty(IDs::cutoff, 2000.0f, nullptr);
            params.setProperty(IDs::resonance, 0.2f, nullptr);
            params.setProperty(IDs::attack, 10.0f, nullptr);
            params.setProperty(IDs::decay, 100.0f, nullptr);
            params.setProperty(IDs::sustain, 0.8f, nullptr);
            params.setProperty(IDs::release, 500.0f, nullptr);
            params.setProperty(IDs::sawOn, true, nullptr);
            params.setProperty(IDs::pulseOn, true, nullptr);
            params.setProperty(IDs::vcaGateMode, false, nullptr);
            l.addChild(params, -1, nullptr);
            
            juce::ValueTree arch(IDs::voiceArch);
            // Default Oscillator
            juce::ValueTree oscList(IDs::oscillators);
            juce::ValueTree osc(IDs::COMPONENT);
            osc.setProperty(IDs::slotName, "OSC 1", nullptr);
            osc.setProperty(IDs::componentId, "OSC-VA-001", nullptr);
            oscList.addChild(osc, -1, nullptr);
            arch.addChild(oscList, -1, nullptr);
            
            l.addChild(arch, -1, nullptr);
            return l;
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
