#include "AceValidator.h"

namespace Omega::Core::Ace {

    ValidationReport AceValidator::validateAndRepairPreset(Preset::OmegaPreset& preset) const {
        ValidationReport report;
        if (!preset.isValid()) {
            report.status = ValidationStatus::Invalid;
            return report;
        }

        for (int i = 0; i < preset.getNumLayers(); ++i) {
            auto layer = preset.getLayerTree(i);
            validateLayer(layer, report);
        }
        return report;
    }

    void AceValidator::checkComponent(const std::string& scope,
                                      juce::ValueTree& componentNode,
                                      const std::string& family,
                                      const std::string& engine,
                                      ValidationReport& report) const {
        if (!componentNode.isValid()) return;

        juce::String cid = componentNode.getProperty(Identifiers::componentId).toString();
        std::string sId = cid.toStdString();

        if (mCatalog.getComponent(sId) != nullptr)
            return;

        std::string fb = mCatalog.getFallbackId(family, engine);
        ValidationIssue issue;
        issue.scope = scope;
        issue.code = "UnknownComponent";

        if (!fb.empty()) {
            issue.severity = ValidationStatus::Degraded;
            issue.message = "Component " + sId + " no encontrado, usando fallback " + fb;
            componentNode.setProperty(Identifiers::componentId, juce::String(fb), nullptr);
            
            if (report.status == ValidationStatus::Ok)
                report.status = ValidationStatus::Degraded;
        } else {
            issue.severity = ValidationStatus::Invalid;
            issue.message = "Component " + sId + " no encontrado y no hay fallback disponible";
            report.status = ValidationStatus::Invalid;
        }

        report.issues.push_back(issue);
    }

    void AceValidator::validateLayer(juce::ValueTree& layer, ValidationReport& report) const {
        auto arch = layer.getChildWithName(Identifiers::voiceArch);
        if (!arch.isValid()) return;

        // Try to get engine from parent preset if not explicitly in layer
        juce::String engine = layer.getParent().getParent().getProperty(Identifiers::engine).toString();
        if (engine.isEmpty()) engine = "VirtualAnalog";
        
        std::string sEngine = engine.toStdString();
        juce::String layerIdStr = layer.getProperty(Identifiers::id).toString();

        struct CategoryMap { juce::Identifier id; std::string family; };
        static const CategoryMap maps[] = {
            { Identifiers::oscillators, "Oscillator" },
            { Identifiers::filters,     "Filter" },
            { Identifiers::envelopes,   "Envelope" },
            { Identifiers::lfos,        "LFO" },
            { Identifiers::fxSlots,     "FX" },
            { Identifiers::amplifiers,  "Amplifier" },
            { Identifiers::modulators,  "Modulator" },
            { Identifiers::auxiliary,   "Auxiliary" }
        };

        for (const auto& m : maps) {
            auto folder = arch.getChildWithName(m.id);
            if (folder.isValid()) {
                for (int i = 0; i < folder.getNumChildren(); ++i) {
                    auto component = folder.getChild(i);
                    juce::String slotNameStr = component.getProperty(Identifiers::slotName).toString();
                    std::string scope = "Layer" + layerIdStr.toStdString() + "." + m.family + "." + slotNameStr.toStdString();
                    checkComponent(scope, component, m.family, sEngine, report);
                }
            }
        }
    }

} // namespace Omega::Core::Ace
