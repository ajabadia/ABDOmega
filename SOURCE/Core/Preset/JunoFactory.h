#pragma once

#include "OmegaPreset.h"

namespace Omega {
namespace Core {
namespace Preset {

    /**
     * @brief Factoría estática para presets de la familia Juno y sus híbridos.
     */
    class JunoFactory {
    public:
        /**
         * @brief ACE-JUNO-BASIC-PAD
         */
        static OmegaPreset createJunoBasicPad() {
            OmegaPreset p;
            p.setUuid("ACE-JUNO-BASIC-PAD");
            p.setName("Classic Juno Pad");
            p.setAuthor("antigravity");
            
            Layer layer;
            layer.id = "A";
            layer.name = "Main Pad";
            layer.params.cutoff = 3500.0f;
            layer.params.resonance = 0.15f;
            layer.params.hpfPos = 1; // Bypass
            layer.params.analogDrift = 0.15f;
            layer.params.sawOn = true;
            layer.params.pulseOn = true;
            layer.params.subLevel = 0.4f;
            layer.params.noiseLevel = 0.02f;
            layer.params.vcfEnvDepth = 0.3f;
            
            AceComponent osc;
            osc.slotName = "Osc1";
            osc.componentId = "OSC-VA-001";
            osc.params["pwm"] = 0.5f;
            layer.voiceArch.oscillators.push_back(osc);
            
            AceComponent flt;
            flt.slotName = "Filter1";
            flt.componentId = "FLT-VA-001";
            layer.voiceArch.filters.push_back(flt);
            
            p.addLayer(layer);

            // Modular Components (Phase 11 Refinement)
            AceComponent adsr;
            adsr.slotName = "ADSR 1";
            adsr.componentId = "EG-STANDARD-001";
            adsr.params["attack"] = 10.0f;
            adsr.params["decay"] = 100.0f;
            adsr.params["sustain"] = 0.5f;
            adsr.params["release"] = 500.0f;
            p.addEnvelope(adsr);

            AceComponent vca;
            vca.slotName = "VCA 1";
            vca.componentId = "VCA-STANDARD-001";
            vca.params["gain"] = 0.8f;
            p.addAmplifier(vca);

            AceComponent lfo;
            lfo.slotName = "LFO 1";
            lfo.componentId = "LFO-STANDARD-001";
            lfo.params["rate"] = 5.0f;
            lfo.params["wave"] = 0.0f; // Sine
            p.addModulator(lfo);
            
            // Utility Modules (Parameterized)
            AceComponent trig;
            trig.slotName = "MIDI TRIGGER";
            trig.componentId = "MIDI-TRIG";
            trig.slotType = "midi-trig";
            p.addAuxiliary(trig);

            AceComponent mon;
            mon.slotName = "MIDI MONITOR";
            mon.componentId = "MIDI-MON";
            mon.slotType = "midi-mon";
            p.addAuxiliary(mon);

            AceComponent osci;
            osci.slotName = "GLOBAL WAVE";
            osci.componentId = "OSCILLOSCOPE";
            osci.slotType = "osci";
            osci.params["rack"] = 1.0f; // Lower/Main rack
            p.addAuxiliary(osci);

            return p;
        }

        /**
         * @brief ACE-JUNO-BASIC-BRASS (A11 style)
         */
        static OmegaPreset createJunoBrassA11() {
            OmegaPreset p;
            p.setUuid("ACE-JUNO-BASIC-BRASS");
            p.setName("Juno Brass A11");
            p.setAuthor("antigravity");
            
            Layer layer;
            layer.id = "A";
            layer.name = "Brass Layer";
            layer.params.cutoff = 1800.0f;
            layer.params.resonance = 0.2f;
            layer.params.hpfPos = 2; // Position 2
            layer.params.vcaGateMode = true; // Gate mode for punchy brass
            layer.params.sawOn = true;
            layer.params.pulseOn = false;
            layer.params.subLevel = 0.3f;
            layer.params.noiseLevel = 0.0f;
            layer.params.vcfEnvDepth = 0.7f;
            
            AceComponent osc;
            osc.slotName = "Osc1";
            osc.componentId = "OSC-VA-001";
            osc.params["sub"] = 0.3f;
            layer.voiceArch.oscillators.push_back(osc);
            
            // Utility Modules
            AceComponent trig;
            trig.slotName = "MIDI TRIGGER";
            trig.componentId = "MIDI-TRIG";
            trig.slotType = "midi-trig";
            p.addAuxiliary(trig);

            p.addLayer(layer);
            return p;
        }

        /**
         * @brief ACE-HYBRID-JUNO-MS20
         * Juno DCO -> Korg MS-20 Filter (KORG35)
         */
        static OmegaPreset createJunoMs20Hybrid() {
            OmegaPreset p;
            p.setUuid("ACE-HYBRID-JUNO-MS20");
            p.setName("Hybrid Juno + MS20 Filter");
            p.setAuthor("antigravity");
            
            Layer layer;
            layer.id = "A";
            layer.name = "Hybrid Core";
            layer.params.sawOn = true;
            layer.params.pulseOn = true;
            layer.params.subLevel = 0.5f;
            layer.params.noiseLevel = 0.1f;
            layer.params.vcfEnvDepth = 0.8f;
            
            AceComponent osc;
            osc.slotName = "Osc1";
            osc.componentId = "OSC-VA-001";
            osc.params["sub"] = 0.5f;
            layer.voiceArch.oscillators.push_back(osc);
            
            AceComponent flt;
            flt.slotName = "Filter1";
            flt.componentId = "FLT-VA-003"; // KORG35
            flt.params["resonance"] = 0.8f;
            flt.params["drive"] = 2.0f;
            layer.voiceArch.filters.push_back(flt);
            
            // Utility Modules
            AceComponent trig;
            trig.slotName = "MIDI TRIGGER";
            trig.componentId = "MIDI-TRIG";
            trig.slotType = "midi-trig";
            p.addAuxiliary(trig);

            p.addLayer(layer);
            return p;
        }
        /**
         * @brief ACE-TEST-MONO
         * Minimal monophonic path for basic verification.
         */
        static OmegaPreset createMonoTestPreset() {
            OmegaPreset p;
            p.setUuid("ACE-TEST-MONO");
            p.setName("MONO TEST (SAW)");
            p.setAuthor("antigravity");
            
            Layer layer;
            layer.id = "A";
            layer.name = "Test Core";
            layer.params.cutoff = 5000.0f;
            layer.params.resonance = 0.1f;
            layer.params.hpfPos = 1; // Bypass
            layer.params.sawOn = true;
            layer.params.pulseOn = false;
            layer.params.subLevel = 0.5f;
            layer.params.noiseLevel = 0.0f;
            layer.params.vcfEnvDepth = 0.0f;
            layer.params.vcaGateMode = false; // Use ADSR
            
            AceComponent osc;
            osc.slotName = "Osc1";
            osc.componentId = "OSC-VA-001";
            layer.voiceArch.oscillators.push_back(osc);
            
            p.addLayer(layer);

            // ADSRExponencial Standard
            AceComponent adsr;
            adsr.slotName = "ADSR 1";
            adsr.componentId = "EG-STANDARD-001";
            adsr.params["attack"] = 1.0f;
            adsr.params["decay"] = 100.0f;
            adsr.params["sustain"] = 0.8f;
            adsr.params["release"] = 100.0f;
            p.addEnvelope(adsr);

            // VCA Standard
            AceComponent vca;
            vca.slotName = "VCA 1";
            vca.componentId = "VCA-STANDARD-001";
            vca.params["gain"] = 0.8f;
            p.addAmplifier(vca);

            // Utility Modules
            AceComponent trig;
            trig.slotName = "MIDI TRIGGER";
            trig.componentId = "MIDI-TRIG";
            trig.slotType = "midi-trig";
            p.addAuxiliary(trig);

            return p;
        }

        /**
         * @brief ACE-SUPER-MINIMAL
         * Only ONE oscillator module for absolute isolation.
         */
        static OmegaPreset createSuperMinimalTest() {
            OmegaPreset p;
            p.setUuid("ACE-SUPER-MINIMAL");
            p.setName("DEBUG: SINGLE DCO");
            p.setAuthor("antigravity");
            
            Layer layer;
            layer.id = "A";
            layer.name = "Debug Layer";
            layer.params.sawOn = true;
            
            AceComponent osc;
            osc.slotName = "DEBUG-OSC";
            osc.componentId = "OSC-VA-001";
            layer.voiceArch.oscillators.push_back(osc);
            
            p.addLayer(layer);

            // Utility Modules
            AceComponent trig;
            trig.slotName = "MIDI TRIGGER";
            trig.componentId = "MIDI-TRIG";
            trig.slotType = "midi-trig";
            p.addAuxiliary(trig);

            return p;
        }

        /**
         * @brief ACE-VERIFY-DYNAMIC
         * Minimal preset for verifying dynamic rack rendering.
         * Upper: MIDI Monitor ONLY.
         * Lower: ADSR ONLY.
         */
        static OmegaPreset createVerificationPreset() {
            OmegaPreset p;
            p.setUuid("ACE-VERIFY-DYNAMIC");
            p.setName("VERIFICATION: MINIMAL");
            p.setAuthor("antigravity");
            
            // Upper Rack: MIDI-MON & MIDI-TRIG
            AceComponent midiTrig;
            midiTrig.slotName = "MIDI TRIGGER";
            midiTrig.componentId = "MIDI-TRIG";
            midiTrig.slotType = "midi-trig";
            p.addAuxiliary(midiTrig);

            AceComponent midiMon;
            midiMon.slotName = "MIDI MONITOR";
            midiMon.componentId = "MIDI-MON";
            midiMon.slotType = "midi-mon";
            p.addAuxiliary(midiMon);

            AceComponent osci;
            osci.slotName = "GLOBAL WAVE";
            osci.componentId = "OSCILLOSCOPE";
            osci.slotType = "osci";
            osci.params["rack"] = 1.0f; // Lower rack
            p.addAuxiliary(osci);

            // Lower Rack: ADSR 1 ONLY
            AceComponent adsr;
            adsr.slotName = "ADSR 1";
            adsr.componentId = "EG-STANDARD-001";
            adsr.params["attack"] = 1.0f;
            adsr.params["decay"] = 100.0f;
            adsr.params["sustain"] = 0.8f;
            adsr.params["release"] = 100.0f;
            p.addEnvelope(adsr);
            
            // Add a layer with Prophecy architecture
            Layer l;
            l.id = "A";
            l.name = "Prophecy Core";
            l.params.sawOn = true;
            l.params.pulseOn = false;
            
            AceComponent osc;
            osc.slotName = "PROPHECY OSC";
            osc.componentId = "OSC-KORG-P";
            l.voiceArch.oscillators.push_back(osc);
            
            AceComponent flt;
            flt.slotName = "KORG FILTER";
            flt.componentId = "FLT-VA-003"; // This triggers Korg35 model
            l.voiceArch.filters.push_back(flt);
            
            p.addLayer(l);

            return p;
        }
    };

} // namespace Preset
} // namespace Core
} // namespace Omega
