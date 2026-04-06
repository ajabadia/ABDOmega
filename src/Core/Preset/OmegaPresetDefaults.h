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
            
            juce::ValueTree aux(IDs::auxiliary);
            
            juce::ValueTree trigger(IDs::COMPONENT);
            trigger.setProperty(IDs::id, "trig.1", nullptr);
            trigger.setProperty(IDs::slotName, "MIDI TRIGGER", nullptr);
            trigger.setProperty(IDs::slotType, "trig", nullptr);
            trigger.setProperty(IDs::componentId, "MIDI-TRIG-001", nullptr);
            aux.addChild(trigger, -1, nullptr);

            juce::ValueTree mon(IDs::COMPONENT);
            mon.setProperty(IDs::id, "mon.1", nullptr);
            mon.setProperty(IDs::slotName, "MIDI MONITOR", nullptr);
            mon.setProperty(IDs::slotType, "mon", nullptr);
            mon.setProperty(IDs::componentId, "MIDI-MON-001", nullptr);
            aux.addChild(mon, -1, nullptr);

            juce::ValueTree scope(IDs::COMPONENT);
            scope.setProperty(IDs::id, "scope.1", nullptr);
            scope.setProperty(IDs::slotName, "GLOBAL WAVE", nullptr);
            scope.setProperty(IDs::slotType, "scope", nullptr);
            scope.setProperty(IDs::componentId, "SCOPE-AUDIO-001", nullptr);
            aux.addChild(scope, -1, nullptr);

            juce::ValueTree mcv(IDs::COMPONENT);
            mcv.setProperty(IDs::id, "mcv.1", nullptr);
            mcv.setProperty(IDs::slotName, "MIDI TO CV", nullptr);
            mcv.setProperty(IDs::slotType, "mcv", nullptr);
            mcv.setProperty(IDs::componentId, "MIDI-MCV-001", nullptr);
            aux.addChild(mcv, -1, nullptr);

            juce::ValueTree matrixMod(IDs::COMPONENT);
            matrixMod.setProperty(IDs::slotName, "MOD MATRIX", nullptr);
            matrixMod.setProperty(IDs::slotType, "matrix", nullptr);
            matrixMod.setProperty(IDs::componentId, "MOD-MATRIX-001", nullptr);
            aux.addChild(matrixMod, -1, nullptr);

            p.addChild(aux, -1, nullptr);
            
            // Modulation Matrix 2.1 (Paginable 64 Slots)
            juce::ValueTree matrix(IDs::modMatrix);
            for (int i = 0; i < 64; ++i) {
                juce::ValueTree slot(IDs::slot);
                if (i == 0) {
                    // MIDI Context: Trigger to Converter
                    slot.setProperty(IDs::active, true, nullptr);
                    slot.setProperty(IDs::source, "trig.1.midi", nullptr);
                    slot.setProperty(IDs::target, "mcv.1.midi", nullptr);
                    slot.setProperty(IDs::amount, 1.0f, nullptr);
                } else if (i == 1) {
                    // CV Context: MCV Pitch to Oscillator Pitch
                    slot.setProperty(IDs::active, true, nullptr);
                    slot.setProperty(IDs::source, "mcv.1.pitch", nullptr);
                    slot.setProperty(IDs::target, "osc.1.pitch", nullptr);
                    slot.setProperty(IDs::amount, 1.0f, nullptr);
                } else if (i == 2) {
                    // Gate Context: MCV Gate to Envelope Gate
                    slot.setProperty(IDs::active, true, nullptr);
                    slot.setProperty(IDs::source, "mcv.1.gate", nullptr);
                    slot.setProperty(IDs::target, "env.1.gate", nullptr);
                    slot.setProperty(IDs::amount, 1.0f, nullptr);
                } else if (i == 3) {
                    // Vel Context: Velocity to VCA Gain
                    slot.setProperty(IDs::active, true, nullptr);
                    slot.setProperty(IDs::source, "mcv.1.vel", nullptr);
                    slot.setProperty(IDs::target, "vca.1.gain", nullptr); // Modular Target
                    slot.setProperty(IDs::amount, 0.8f, nullptr);
                } else if (i == 4) {
                    // MIDI Context: Trigger to Monitor
                    slot.setProperty(IDs::active, true, nullptr);
                    slot.setProperty(IDs::source, "trig.1.midi", nullptr);
                    slot.setProperty(IDs::target, "mon.1.midi", nullptr);
                    slot.setProperty(IDs::amount, 1.0f, nullptr);
                } else {
                    slot.setProperty(IDs::active, false, nullptr);
                    slot.setProperty(IDs::amount, 0.0f, nullptr);
                }
                matrix.addChild(slot, -1, nullptr);
            }
            p.addChild(matrix, -1, nullptr);

            p.addChild(createDefaultVisual(), -1, nullptr);
            return p;
        }

        static juce::ValueTree createDefaultLayer(const juce::String& name) {
            juce::ValueTree l(IDs::LAYER);
            l.setProperty(IDs::id, "layer.a", nullptr);
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
            // Default Oscillator (osc.1)
            juce::ValueTree oscList(IDs::oscillators);
            juce::ValueTree osc(IDs::COMPONENT);
            osc.setProperty(IDs::id, "osc.1", nullptr);
            osc.setProperty(IDs::slotName, "OSC 1", nullptr);
            osc.setProperty(IDs::slotType, "osc", nullptr);
            osc.setProperty(IDs::componentId, "OSC-VA-001", nullptr);
            oscList.addChild(osc, -1, nullptr);
            arch.addChild(oscList, -1, nullptr);

            // Default Envelope (env.1)
            juce::ValueTree envList(IDs::envelopes);
            juce::ValueTree env(IDs::COMPONENT);
            env.setProperty(IDs::id, "env.1", nullptr);
            env.setProperty(IDs::slotName, "ENV 1", nullptr);
            env.setProperty(IDs::slotType, "eg", nullptr);
            env.setProperty(IDs::componentId, "EG-STANDARD-001", nullptr);
            envList.addChild(env, -1, nullptr);
            arch.addChild(envList, -1, nullptr);

            // Default VCA (vca.1)
            juce::ValueTree vcaList(IDs::amplifiers);
            juce::ValueTree vca(IDs::COMPONENT);
            vca.setProperty(IDs::id, "vca.1", nullptr);
            vca.setProperty(IDs::slotName, "VCA 1", nullptr);
            vca.setProperty(IDs::slotType, "amp", nullptr);
            vca.setProperty(IDs::componentId, "VCA-STANDARD-001", nullptr);
            vcaList.addChild(vca, -1, nullptr);
            arch.addChild(vcaList, -1, nullptr);
            
            l.addChild(arch, -1, nullptr);
            return l;
        }



        static juce::ValueTree createMinimalPreset() {
            juce::ValueTree p(IDs::OMEGAPRESET);
            p.setProperty(IDs::name, "Minimal Debug Preset", nullptr);
            p.setProperty(IDs::author, "OMEGA", nullptr);
            p.setProperty(IDs::engine, "VirtualAnalog", nullptr);
            p.setProperty(IDs::masterGainDb, 0.0f, nullptr);
            
            juce::ValueTree layers(IDs::layers);
            juce::ValueTree l(IDs::LAYER);
            l.setProperty(IDs::id, "layer.a", nullptr);
            l.setProperty(IDs::name, "Debug Layer", nullptr);
            l.addChild(juce::ValueTree(IDs::params), -1, nullptr);
            l.addChild(juce::ValueTree(IDs::voiceArch), -1, nullptr);
            layers.addChild(l, -1, nullptr);
            p.addChild(layers, -1, nullptr);
            
            juce::ValueTree aux(IDs::auxiliary);
            
            // 1. MOD MATRIX (Primary Utility)
            juce::ValueTree matrix(IDs::COMPONENT);
            matrix.setProperty(IDs::id, "matrix.1", nullptr);
            matrix.setProperty(IDs::slotName, "MOD MATRIX", nullptr);
            matrix.setProperty(IDs::slotType, "matrix", nullptr);
            matrix.setProperty(IDs::componentId, "MOD-MATRIX-001", nullptr);
            aux.addChild(matrix, -1, nullptr);

            // 2. MIDI TRIGGER
            juce::ValueTree trigger(IDs::COMPONENT);
            trigger.setProperty(IDs::id, "trig.1", nullptr);
            trigger.setProperty(IDs::slotName, "MIDI TRIGGER", nullptr);
            trigger.setProperty(IDs::slotType, "trig", nullptr);
            trigger.setProperty(IDs::componentId, "MIDI-TRIG-001", nullptr);
            aux.addChild(trigger, -1, nullptr);
            
            p.addChild(aux, -1, nullptr);
            
            // Note: Root modMatrix node is now redundant for rendering but kept 
            // empty for consistency with normalization logic if needed.
            p.addChild(juce::ValueTree(IDs::modMatrix), -1, nullptr);
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
