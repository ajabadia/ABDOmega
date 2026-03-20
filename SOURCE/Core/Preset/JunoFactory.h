#pragma once

#include "OmegaPreset.h"

namespace Omega::Core::Preset {

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
            p.id = "ACE-JUNO-BASIC-PAD";
            p.name = "Classic Juno Pad";
            p.author = "antigravity";
            
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
            
            p.layers.push_back(layer);
            return p;
        }

        /**
         * @brief ACE-JUNO-BASIC-BRASS (A11 style)
         */
        static OmegaPreset createJunoBrassA11() {
            OmegaPreset p;
            p.id = "ACE-JUNO-BASIC-BRASS";
            p.name = "Juno Brass A11";
            p.author = "antigravity";
            
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
            
            p.layers.push_back(layer);
            return p;
        }

        /**
         * @brief ACE-HYBRID-JUNO-MS20
         * Juno DCO -> Korg MS-20 Filter (KORG35)
         */
        static OmegaPreset createJunoMs20Hybrid() {
            OmegaPreset p;
            p.id = "ACE-HYBRID-JUNO-MS20";
            p.name = "Hybrid Juno + MS20 Filter";
            p.author = "antigravity";
            
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
            
            p.layers.push_back(layer);
            return p;
        }
    };

} // namespace Omega::Core::Preset
