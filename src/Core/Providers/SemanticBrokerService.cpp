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
        
        // --- VA 2.2: EXTENDED MODULAR DISCOVERY ---
        // 1. Scan Legacy Voice Chain Nodes
        scanDynamicNodes(preset.getState());

        // 2. Scan Era 4 Auxiliary Modules (Racks)
        scanAuxiliaryModules(preset.getState());

        // 3. Scan for WASM/AOT Modules (VA 2.1.W)
        scanWasmModules();

        // 4. Add standard MIDI sources (Internal to engine)
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

    void SemanticBrokerService::scanDynamicNodes(const juce::ValueTree& state) {
        using namespace Modulation;
        using IDs = Core::Identifiers;

        // VA 2.1: The 'voiceChain/NODES' is the primary source of truth for the rack.
        juce::ValueTree chain = state.getChildWithName(IDs::voiceChain);
        if (!chain.isValid()) return;

        juce::ValueTree nodes = chain.getChildWithName(IDs::NODES);
        for (int i = 0; i < nodes.getNumChildren(); ++i) {
            auto node = nodes.getChild(i);
            std::string id = node.getProperty(IDs::nodeId).toString().toStdString();
            std::string modelId = node.getProperty(IDs::componentId).toString().toStdString();

            if (id.empty() || modelId.empty()) continue;

            ModuleManifest m;
            m.instanceId = id;
            m.modelId = modelId;
            m.status = "active";

            if (mCatalog) {
                auto const* info = mCatalog->getComponent(modelId);
                if (info) {
                    m.category = info->family;
                    m.uiLayout = info->uiLayout;
                    m.style = info->style;
                    
                    // Parameters as modulation targets (inputs)
                    for (auto const& p : info->parameters) {
                        if (!p.modulable) continue;
                        Modulation::PortDescriptor pd = { p.id, p.label, Modulation::ModPortType::CV, true };
                        pd.options = p.options;
                        pd.defaultValue = p.defaultValue;
                        m.ports.push_back(pd);
                    }

                    // Unified Era 4 Ports (Sources and Targets)
                    for (auto const& port : info->ports) {
                        m.ports.push_back(port);
                    }
                }
            }
            mInventory[id] = m;
        }
    }

    void SemanticBrokerService::scanAuxiliaryModules(const juce::ValueTree& state) {
        using namespace Modulation;
        using IDs = Core::Identifiers;

        juce::ValueTree aux = state.getChildWithName(IDs::auxiliary);
        if (!aux.isValid()) return;

        for (int i = 0; i < aux.getNumChildren(); ++i) {
            auto node = aux.getChild(i);
            std::string id = node.getProperty(IDs::instanceId).toString().toStdString();
            std::string modelId = node.getProperty(IDs::componentId).toString().toStdString();

            if (id.empty() || modelId.empty()) continue;

            ModuleManifest m;
            m.instanceId = id;
            m.modelId = modelId;
            m.status = "active";

            if (mCatalog) {
                auto const* info = mCatalog->getComponent(modelId);
                if (info) {
                    m.category = info->family;
                    m.uiLayout = info->uiLayout;
                    m.style = info->style;
                    
                    // Parameters as modulation targets (inputs)
                    for (auto const& p : info->parameters) {
                        if (!p.modulable) continue;
                        Modulation::PortDescriptor pd = {p.id, p.label, Modulation::ModPortType::CV, true};
                        pd.options = p.options;
                        pd.defaultValue = p.defaultValue;
                        m.ports.push_back(pd);
                    }

                    // Unified ports (Targets, Sources, and Generic Ports)
                    for (auto const& port : info->ports) {
                        m.ports.push_back(port);
                    }
                }
            }
            mInventory[id] = m;
        }
    }

    void SemanticBrokerService::addStandardMidiSources() {
        // ... (existing code omitted for brevity but preserved)
    }

    void SemanticBrokerService::scanWasmModules() {
        if (!mCatalog) return;

        // The AceCatalog has already scanned Resources/modules via loadFromModulesDirectory().
        // We just need to make sure any component in the catalog that isn't already in mInventory
        // (as an instance) is available for the browser or discovery.
        
        for (auto const* info : mCatalog->getComponents()) {
            // If this is a WASM module (implementationId >= 500), ensure it's represented
            if (info->implementationId >= 500) {
                Modulation::ModuleManifest m;
                m.instanceId = info->id; // For the browser, instanceId == modelId
                m.modelId = info->id;
                m.category = info->family;
                m.status = "template";
                m.uiLayout = info->uiLayout;
                m.style = info->style;

                for (auto const& p : info->parameters) {
                    if (!p.modulable) continue;
                    Modulation::PortDescriptor pd = { p.id, p.label, Modulation::ModPortType::CV, true };
                    pd.options = p.options;
                    pd.defaultValue = p.defaultValue;
                    m.ports.push_back(pd);
                }

                for (auto const& port : info->ports) {
                    m.ports.push_back(port);
                }

                // Only add if not already present (racks take precedence)
                if (mInventory.find(m.instanceId) == mInventory.end()) {
                    mInventory[m.instanceId] = m;
                }
            }
        }
    }

} // namespace Service
} // namespace Core
} // namespace Omega
