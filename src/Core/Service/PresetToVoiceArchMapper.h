#pragma once

#include <juce_data_structures/juce_data_structures.h>
#include "../Preset/OmegaPreset.h"
#include "../Preset/OmegaPresetSchema.h"

namespace Omega {
namespace Core {
namespace Service {

    /**
     * @brief Extracts modular architecture (oscillators, filters, etc.) from a preset ValueTree.
     */
    class PresetToVoiceArchMapper {
    public:
        using IDs = Omega::Core::Identifiers;

        static Preset::VoiceArchitecture map(const juce::ValueTree& layerTree) {
            Preset::VoiceArchitecture arch;
            auto archNode = layerTree.getChildWithName(IDs::voiceArch);
            if (!archNode.isValid()) return arch;

            arch.oscillators = mapCategory(archNode.getChildWithName(IDs::oscillators));
            arch.filters     = mapCategory(archNode.getChildWithName(IDs::filters));
            arch.amplifiers  = mapCategory(archNode.getChildWithName(IDs::amplifiers));
            arch.envelopes   = mapCategory(archNode.getChildWithName(IDs::envelopes));
            arch.lfos        = mapCategory(archNode.getChildWithName(IDs::lfos));
            arch.modulators  = mapCategory(archNode.getChildWithName(IDs::modulators));
            arch.fxSlots     = mapCategory(archNode.getChildWithName(IDs::fxSlots));
            arch.auxiliary   = mapCategory(archNode.getChildWithName(IDs::auxiliary));

            return arch;
        }

    private:
        static std::vector<Preset::AceComponent> mapCategory(const juce::ValueTree& catNode) {
            std::vector<Preset::AceComponent> comps;
            for (auto cn : catNode) {
                if (cn.hasType(IDs::COMPONENT)) {
                    Preset::AceComponent c;
                    c.slotName = cn.getProperty(IDs::slotName).toString().toStdString();
                    c.componentId = cn.getProperty(IDs::componentId).toString().toStdString();
                    c.slotType = cn.getProperty(IDs::slotType).toString().toStdString();
                    
                    auto params = cn.getChildWithName(IDs::params);
                    for (int i = 0; i < params.getNumProperties(); ++i) {
                        auto name = params.getPropertyName(i).toString().toStdString();
                        c.params[name] = (float)params.getProperty(params.getPropertyName(i));
                    }
                    comps.push_back(c);
                }
            }
            return comps;
        }
    };

} // namespace Service
} // namespace Core
} // namespace Omega
