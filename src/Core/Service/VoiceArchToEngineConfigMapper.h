#pragma once

#include "EngineConfig.h"
#include "../Preset/OmegaPresetSchema.h"

namespace Omega {
namespace Core {
namespace Service {

    /**
     * @brief Maps modular architectural components to the final EngineConfig struct.
     */
    class VoiceArchToEngineConfigMapper {
    public:
        static void mapArchitecture(const Preset::VoiceArchitecture& arch, VoiceConfig& cfg) {
            // 1. Oscillators
            cfg.numActiveOscillators = 0;
            for (const auto& osc : arch.oscillators) {
                if (cfg.numActiveOscillators < VoiceConfig::kMaxOscillatorsPerVoice) {
                    cfg.oscModes[cfg.numActiveOscillators] = mapOscMode(osc.componentId);
                    cfg.numActiveOscillators++;
                }
            }

            // 2. Filters
            if (!arch.filters.empty()) {
                cfg.filterType = mapFilterType(arch.filters[0].componentId);
            }

            // Note: Individual parameter mapping (cutoff, resonance, etc.) 
            // is handled by the ParamBindingRegistry in real-time or during full apply.
        }

    private:
        static OscillatorMode mapOscMode(const std::string& compId) {
            if (compId == "OSC-VA-001" || compId == "OSC-JUNO-DCO") return OscillatorMode::JunoDco;
            if (compId == "OSC-JP-SUPER") return OscillatorMode::JunoDco; // Placeholder for SuperSaw if mapped same
            return OscillatorMode::JunoDco; // Default fallback
        }

        static FilterType mapFilterType(const std::string& compId) {
            if (compId == "VCF-JUNO-001" || compId == "VCF-IR3109") return FilterType::JunoIR3109;
            if (compId == "VCF-KORG-35") return FilterType::Korg35;
            if (compId == "VCF-JP-8000") return FilterType::JunoIR3109; // Placeholder
            return FilterType::JunoIR3109;
        }
    };

} // namespace Service
} // namespace Core
} // namespace Omega
