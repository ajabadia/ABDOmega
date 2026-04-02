#include "SemanticBrokerService.h"
#include "../Modulation/ModuleManifest.h"
#include "../OmegaIdentifiers.h"
#include "../Modulation/ModulationTelemetryIndex.h"
#include <juce_core/juce_core.h>
#include <juce_data_structures/juce_data_structures.h>
#include <algorithm>
#include <functional>

namespace Omega {
namespace Core {
namespace Service {

    void SemanticBrokerService::rebuildInventory(const Preset::OmegaPreset& preset) {
        std::lock_guard<std::mutex> lock(mMutex);
        mInventory.clear();
        
        // Scan for well-known modules in fixed racks (Legacy ACE)
        scanLegacyRack(preset.getState());
        
        // Scan for Dynamic Nodes (Voice Architecture 2.0)
        scanDynamicNodes(preset.getState());

        // Add standard MIDI sources (Internal to engine)
        addStandardMidiSources();
    }

    std::vector<Modulation::ModuleManifest> SemanticBrokerService::getInventory() const {
        std::lock_guard<std::mutex> lock(mMutex);
        std::vector<Modulation::ModuleManifest> results;
        for (const auto& [id, m] : mInventory) results.push_back(m);
        return results;
    }

    const Modulation::ModuleManifest* SemanticBrokerService::getManifest(const std::string& instanceId) const {
        std::lock_guard<std::mutex> lock(mMutex);
        auto it = mInventory.find(instanceId);
        return (it != mInventory.end()) ? &it->second : nullptr;
    }

    void SemanticBrokerService::scanLegacyRack(const juce::ValueTree& state) {
        using namespace Modulation;
        using IDs = Core::Identifiers;

        // Helper to register standard modules
        auto registerModule = [&](const std::string& instanceId, const std::string& modelId, const std::string& category) {
            ModuleManifest m;
            m.instanceId = instanceId;
            m.modelId = modelId;
            m.category = category;

            // Define Ports based on Category
            if (category == "lfo") {
                // Map LFO-1 and LFO-2 to their respective telemetry indices
                int tIdx = (instanceId == "LFO-1") ? (int)TelemetryIndex::Mod_LFO1 : 
                           (instanceId == "LFO-2") ? (int)TelemetryIndex::Mod_LFO2 : -1;
                m.ports.push_back({"out", "OUTPUT", PortType::CV, false, tIdx});
                m.ports.push_back({"rate", "RATE", PortType::CV, true});
            } else if (category == "eg" || category == "env") {
                int tIdx = (instanceId == "ENV-1") ? (int)TelemetryIndex::Mod_ENV1_Amp : 
                           (instanceId == "ENV-2") ? (int)TelemetryIndex::Mod_ENV2_Filter : -1;
                m.ports.push_back({"out", "ENVELOPE", PortType::CV, false, tIdx});
                m.ports.push_back({"gate", "GATE", PortType::Gate, true});
            } else if (category == "filter" || category == "vcf") {
                m.ports.push_back({"in", "AUDIO IN", PortType::Audio, true});
                m.ports.push_back({"out", "AUDIO OUT", PortType::Audio, false, (int)TelemetryIndex::Audio_VCF_Out});
                m.ports.push_back({"cutoff", "CUTOFF", PortType::CV, true});
            } else if (category == "osc" || category == "vco") {
                m.ports.push_back({"out", "AUDIO OUT", PortType::Audio, false, (int)TelemetryIndex::Audio_DCO_Main});
                m.ports.push_back({"pitch", "PITCH", PortType::CV, true});
                m.ports.push_back({"pwm", "PWM", PortType::CV, true});
            } else if (category == "trig") {
                m.ports.push_back({"gate", "GATE", PortType::Gate, false});
                m.ports.push_back({"pitch", "PITCH", PortType::CV, false, (int)TelemetryIndex::Mod_Pitch});
                m.ports.push_back({"vel", "VELOCITY", PortType::CV, false});
                m.ports.push_back({"raw", "MIDI RAW", PortType::MIDI, false, (int)TelemetryIndex::Midi_Traffic});
            } else if (category == "mon") {
                m.ports.push_back({"probe", "PROBE IN", PortType::Audio, true}); // Oscilloscope probe
                m.ports.push_back({"midi", "MIDI IN", PortType::MIDI, true});    // MIDI Monitor in
            }

            mInventory[instanceId] = m;
        };

        // Scan recursive
        std::function<void(juce::ValueTree)> scan = [&](juce::ValueTree node) {
            for (int i = 0; i < node.getNumChildren(); ++i) {
                auto c = node.getChild(i);
                if (c.hasType(IDs::COMPONENT) || c.hasType(IDs::NODE)) {
                    std::string id = c.getProperty(IDs::id).toString().toStdString();
                    if (id.empty()) id = c.getProperty(IDs::slotName).toString().toStdString();

                    std::string model = c.getProperty(IDs::componentId).toString().toStdString();
                    std::string type = c.getProperty(IDs::slotType).toString().toLowerCase().toStdString();
                    
                    if (type.empty()) {
                        // Aseptic fallback: Guess by ID or ModelID prefix
                        std::string probe = id + "|" + model;
                        std::transform(probe.begin(), probe.end(), probe.begin(), ::tolower);

                        if (probe.find("lfo") != std::string::npos) type = "lfo";
                        else if (probe.find("env") != std::string::npos || probe.find("eg") != std::string::npos) type = "eg";
                        else if (probe.find("osc") != std::string::npos || probe.find("vco") != std::string::npos || probe.find("dco") != std::string::npos) type = "osc";
                        else if (probe.find("vcf") != std::string::npos || probe.find("flt") != std::string::npos || probe.find("filter") != std::string::npos) type = "filter";
                        else if (probe.find("trig") != std::string::npos) type = "trig";
                        else if (probe.find("mon") != std::string::npos || probe.find("osci") != std::string::npos) type = "mon";
                    }

                    if (!id.empty() && !type.empty()) {
                        registerModule(id, model, type);
                    }
                }
                scan(c);
            }
        };

        scan(state);
    }

    void SemanticBrokerService::scanDynamicNodes(const juce::ValueTree& state) {
        // Placeholder for VA 2.0 dynamic chain scanning
    }

    void SemanticBrokerService::addStandardMidiSources() {
        using namespace Modulation;
        ModuleManifest m;
        m.instanceId = "midi.global";
        m.modelId = "MIDI-CORE";
        m.category = "midi";
        
        m.ports.push_back({"stream", "RAW MIDI", PortType::MIDI, false, (int)TelemetryIndex::Midi_Traffic});
        m.ports.push_back({"pitch", "PITCH", PortType::CV, false, (int)TelemetryIndex::Mod_Pitch});
        m.ports.push_back({"gate", "GATE", PortType::Gate, false});
        m.ports.push_back({"vel", "VELOCITY", PortType::CV, false});
        
        mInventory[m.instanceId] = m;
    }

} // namespace Service
} // namespace Core
} // namespace Omega
