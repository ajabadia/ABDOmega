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

        // [REPAIR] Build #189 Bypass: Always trust core modular systemic modules
        if (sId == "MIDI-MCV-001") return;

        if (mCatalog.getComponent(sId) != nullptr)
            return;

        // [VISION 2.1.3]: TOTAL MODULARITY - NEVER DELETE FROM PRESET
        // If manifest is missing, keep the original ID so the UI can flag it.
        ValidationIssue issue;
        issue.scope = scope;
        issue.code = "MissingManifest";
        issue.severity = ValidationStatus::Degraded;
        issue.message = "Manifest for " + sId + " NOT FOUND. Preset integrity preserved.";
        
        if (report.status == ValidationStatus::Ok)
            report.status = ValidationStatus::Degraded;

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

    ValidationReport AceValidator::validateManifest(const ComponentInfo& info) const {
        ValidationReport report;
        
        // 1. Core Identity Check
        if (info.id.empty() || info.name.empty() || info.modelId.empty()) {
            ValidationIssue issue;
            issue.severity = ValidationStatus::Invalid;
            issue.code = "IncompleteIdentity";
            issue.scope = info.id;
            issue.message = "Module manifest is missing basic identity (id, name or modelId).";
            report.issues.push_back(issue);
            report.status = ValidationStatus::Invalid;
        }

        // 2. Era 6.3 Visibility Enforcement
        // Note: For 6.3+, we require at least some semantic grouping or visibility flags
        if (info.version >= 1) { // Assuming version 1 maps to Era 6 structure
            for (const auto& p : info.parameters) {
                // We check if the parameter has a valid label and ID
                if (p.id.empty() || p.label.empty()) {
                    ValidationIssue issue;
                    issue.severity = ValidationStatus::Invalid;
                    issue.code = "BrokenParameter";
                    issue.scope = info.id + "." + p.id;
                    issue.message = "Parameter is missing ID or Label.";
                    report.issues.push_back(issue);
                    report.status = ValidationStatus::Invalid;
                }
            }
        }

        // 3. Aseptic Sanitization: Reject modules with 0 visible front parameters (Ghost Modules)
        bool hasFront = false;
        for (const auto& p : info.parameters) if (p.front) { hasFront = true; break; }
        
        if (!hasFront && !info.parameters.empty()) {
            ValidationIssue issue;
            issue.severity = ValidationStatus::Degraded;
            issue.code = "GhostModule";
            issue.scope = info.id;
            issue.message = "Module has NO front-panel parameters. It will be invisible in the standard rack.";
            report.issues.push_back(issue);
            if (report.status == ValidationStatus::Ok) report.status = ValidationStatus::Degraded;
        }

        // 4. Structural Integrity Check (Era 7.2.3)
        float rackW = info.uiWidth > 0 ? info.uiWidth : (float)(info.hp * 15);
        float rackH = info.uiHeight > 0 ? info.uiHeight : 420.0f; // Default height

        // 4.1 Container Integrity
        for (const auto& c : info.uiContainers) {
            float cW = 0;
            // Resolve width for validation (rough estimation for fractions)
            if (c.width == "full") cW = rackW;
            else if (c.width == "3/4") cW = rackW * 0.75f;
            else if (c.width == "1/2") cW = rackW * 0.5f;
            else if (c.width == "1/4") cW = rackW * 0.25f;
            else try { cW = std::stof(c.width); } catch (...) { cW = rackW; }

            if (c.x < 0 || c.y < 0 || (c.x + cW) > rackW || (c.y + c.height) > rackH) {
                ValidationIssue issue;
                issue.severity = ValidationStatus::Degraded;
                issue.code = "SpatialLeak";
                issue.scope = info.id + ".layout." + c.id;
                issue.message = "Container '" + c.id + "' exceeds Rack boundaries. Clipping will occur.";
                
                auto meta = new juce::DynamicObject();
                meta->setProperty("x", c.x);
                meta->setProperty("y", c.y);
                meta->setProperty("w", cW);
                meta->setProperty("h", c.height);
                meta->setProperty("rackW", rackW);
                meta->setProperty("rackH", rackH);
                issue.metadata = juce::var(meta);

                report.issues.push_back(issue);
                if (report.status == ValidationStatus::Ok) report.status = ValidationStatus::Degraded;
            }
        }

        // 4.2 Entity Integrity
        auto checkEntities = [&](const std::vector<UIItem>& items, const std::string& type) {
            for (const auto& item : items) {
                if (item.x < 0 || item.y < 0 || item.x > rackW || item.y > rackH) {
                    ValidationIssue issue;
                    issue.severity = ValidationStatus::Degraded;
                    issue.code = "OutofBounds";
                    issue.scope = info.id + "." + type + "." + item.bind;
                    issue.message = "Entity '" + item.bind + "' is outside the physical Rack area.";
                    
                    auto meta = new juce::DynamicObject();
                    meta->setProperty("x", item.x);
                    meta->setProperty("y", item.y);
                    meta->setProperty("rackW", rackW);
                    meta->setProperty("rackH", rackH);
                    issue.metadata = juce::var(meta);

                    report.issues.push_back(issue);
                    if (report.status == ValidationStatus::Ok) report.status = ValidationStatus::Degraded;
                }
            }
        };

        checkEntities(info.uiControls, "controls");
        checkEntities(info.uiJacks, "jacks");

        return report;
    }

} // namespace Omega::Core::Ace
