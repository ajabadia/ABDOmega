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

        juce::String cid = componentNode.getProperty(Preset::IDs::componentId).toString();
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
            componentNode.setProperty(Preset::IDs::componentId, juce::String(fb), nullptr);
            
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
        auto arch = layer.getChildWithName(Preset::IDs::architecture);
        if (!arch.isValid()) return;

        juce::String layerIdStr = layer.getProperty(Preset::IDs::id).toString();

        // Helper para validar colecciones de componentes (osciladores, filtros, etc.)
        auto validateCollection = [&](const juce::Identifier& folderName, const std::string& family) {
            auto folder = arch.getChildWithName(folderName);
            if (folder.isValid()) {
                for (int i = 0; i < folder.getNumChildren(); ++i) {
                    auto component = folder.getChild(i);
                    juce::String slotNameStr = component.getProperty(Preset::IDs::slotName).toString();
                    std::string scope = "Layer" + layerIdStr.toStdString() + "." + family + "." + slotNameStr.toStdString();
                    checkComponent(scope, component, family, "VirtualAnalog", report);
                }
            }
        };

        validateCollection(juce::Identifier("oscillators"), "Oscillator");
        validateCollection(juce::Identifier("filters"), "Filter");
        validateCollection(juce::Identifier("envelopes"), "Envelope");
        validateCollection(juce::Identifier("lfos"), "LFO");
        validateCollection(juce::Identifier("fxSlots"), "FX");
    }

} // namespace Omega::Core::Ace
