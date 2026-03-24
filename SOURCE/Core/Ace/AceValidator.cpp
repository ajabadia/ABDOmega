#include "AceValidator.h"

namespace Omega::Core::Ace {

    ValidationReport AceValidator::validateAndRepairPreset(Preset::OmegaPreset& preset) const {
        ValidationReport report;
        for (auto& layer : preset.layers) {
            validateLayer(layer, report);
        }
        return report;
    }

    void AceValidator::checkComponent(const std::string& scope,
                                      std::string& componentId,
                                      const std::string& family,
                                      const std::string& engine,
                                      ValidationReport& report) const {
        if (mCatalog.getComponent(componentId) != nullptr)
            return;

        std::string fb = mCatalog.getFallbackId(family, engine);
        ValidationIssue issue;
        issue.scope = scope;
        issue.code = "UnknownComponent";

        if (!fb.empty()) {
            issue.severity = ValidationStatus::Degraded;
            issue.message = "Component " + componentId + " no encontrado, usando fallback " + fb;
            componentId = fb;
            if (report.status == ValidationStatus::Ok)
                report.status = ValidationStatus::Degraded;
        } else {
            issue.severity = ValidationStatus::Invalid;
            issue.message = "Component " + componentId + " no encontrado y no hay fallback disponible";
            report.status = ValidationStatus::Invalid;
        }

        report.issues.push_back(issue);
    }

    void AceValidator::validateLayer(Preset::Layer& layer, ValidationReport& report) const {
        const std::string engine = "VirtualAnalog"; // Default engine para el MVP

        // Validar Osciladores
        for (auto& osc : layer.voiceArch.oscillators) {
            std::string scope = "Layer" + layer.id + "." + osc.slotName;
            checkComponent(scope, osc.componentId, "Oscillator", engine, report);
        }

        // Validar Filtros
        for (auto& flt : layer.voiceArch.filters) {
            std::string scope = "Layer" + layer.id + "." + flt.slotName;
            checkComponent(scope, flt.componentId, "Filter", engine, report);
        }

        // Validar Envelopes
        for (auto& env : layer.voiceArch.envelopes) {
            std::string scope = "Layer" + layer.id + "." + env.slotName;
            checkComponent(scope, env.componentId, "Envelope", engine, report);
        }

        // Validar LFOs
        for (auto& lfo : layer.voiceArch.lfos) {
            std::string scope = "Layer" + layer.id + "." + lfo.slotName;
            checkComponent(scope, lfo.componentId, "LFO", engine, report);
        }

        // Validar FX
        for (auto& fx : layer.voiceArch.fxSlots) {
            std::string scope = "Layer" + layer.id + "." + fx.slotName;
            checkComponent(scope, fx.componentId, "FX", engine, report);
        }
    }

} // namespace Omega::Core::Ace
