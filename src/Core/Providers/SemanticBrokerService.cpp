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

        // Recursive scan
        std::function<void(juce::ValueTree)> scan = [&](juce::ValueTree node) {
            for (int i = 0; i < node.getNumChildren(); ++i) {
                auto c = node.getChild(i);
                if (c.hasType(IDs::COMPONENT) || c.hasType(IDs::NODE) || c.hasType(IDs::LAYER)) {
                    std::string id = c.getProperty(IDs::id).toString().toStdString();
                    if (id.empty()) id = c.getProperty(IDs::slotName).toString().toStdString();

                    std::string modelId = c.getProperty(IDs::componentId).toString().toStdString();
                    std::string type = c.getProperty(IDs::slotType).toString().toLowerCase().toStdString();
                    
                    if (c.hasType(IDs::LAYER)) {
                        type = "layer";
                        if (id.empty()) id = "layer.a"; 
                    }

                    ModuleManifest m;
                    m.instanceId = id;
                    m.modelId = modelId;
                    
                    bool populated = false;

                    // --- 1. TRY CATALOG-DRIVEN DISCOVERY (ACE 2.0) ---
                    if (mCatalog && !modelId.empty()) {
                        auto const* info = mCatalog->getComponent(modelId);
                        if (info) {
                            m.category = info->family;
                            
                            // Map Parameters as Inputs
                            for (auto const& p : info->parameters) {
                                PortDescriptor pd;
                                pd.id = p.id;
                                pd.label = p.label;
                                pd.type = ModPortType::CV;
                                pd.isInput = true;
                                pd.telemetryIndex = -1;
                                m.ports.push_back(pd);
                            }

                            // Map Modulation Targets as Outputs
                            for (auto const& t : info->modulationTargets) {
                                PortDescriptor pd;
                                pd.id = t.id;
                                pd.label = t.label;
                                pd.type = ModPortType::CV;
                                pd.isInput = false;
                                pd.telemetryIndex = -1;
                                m.ports.push_back(pd);
                            }
                            populated = true;
                        }
                    }

                    // --- 2. FALLBACK TO HARDCODED DISCOVERY (LEGACY ACE) ---
                    if (!populated && !type.empty()) {
                        m.category = type;
                        if (type == "lfo") {
                            int tIdx = (id == "LFO-1") ? (int)TelemetryIndex::Mod_LFO1 : 
                                       (id == "LFO-2") ? (int)TelemetryIndex::Mod_LFO2 : -1;
                            m.ports.push_back({"out", "OUTPUT", ModPortType::CV, false, tIdx});
                            m.ports.push_back({"rate", "RATE", ModPortType::CV, true});
                        } else if (type == "eg" || type == "env") {
                            int tIdx = (id == "ENV-1") ? (int)TelemetryIndex::Mod_ENV1_Amp : 
                                       (id == "ENV-2") ? (int)TelemetryIndex::Mod_ENV2_Filter : -1;
                            m.ports.push_back({"out", "ENVELOPE", ModPortType::CV, false, tIdx});
                            m.ports.push_back({"gate", "GATE IN", ModPortType::Gate, true});
                        } else if (type == "filter" || type == "vcf") {
                            m.ports.push_back({"in", "AUDIO IN", ModPortType::Audio, true});
                            m.ports.push_back({"out", "AUDIO OUT", ModPortType::Audio, false, (int)TelemetryIndex::Audio_VCF_Out});
                            m.ports.push_back({"cutoff", "CUTOFF", ModPortType::CV, true});
                            m.ports.push_back({"resonance", "RESONANCE", ModPortType::CV, true});
                        } else if (type == "osc" || type == "vco") {
                            m.ports.push_back({"out", "AUDIO OUT", ModPortType::Audio, false, (int)TelemetryIndex::Audio_DCO_Main});
                            m.ports.push_back({"pitch", "PITCH", ModPortType::CV, true});
                            m.ports.push_back({"gain", "VOLUME", ModPortType::CV, true});
                        } else if (type == "layer") {
                            m.ports.push_back({"pitch", "GLOBAL PITCH", ModPortType::CV, true});
                            m.ports.push_back({"gate", "LAYER GATE", ModPortType::Gate, true});
                        }
                        populated = true;
                    }

                    if (populated && !id.empty()) {
                        mInventory[id] = m;
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
        
        m.ports.push_back({"stream", "RAW MIDI", ModPortType::MIDI, false, (int)TelemetryIndex::Midi_Traffic});
        m.ports.push_back({"pitch", "PITCH", ModPortType::CV, false, (int)TelemetryIndex::Mod_Pitch});
        m.ports.push_back({"gate", "GATE", ModPortType::Gate, false});
        m.ports.push_back({"vel", "VELOCITY", ModPortType::CV, false});
        
        mInventory[m.instanceId] = m;
    }

} // namespace Service
} // namespace Core
} // namespace Omega
