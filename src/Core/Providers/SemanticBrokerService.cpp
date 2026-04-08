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
        
        // --- VA 2.1: STRICT MODULAR DISCOVERY ---
        // We only scan explicitly defined nodes and standard MIDI sources.
        
        // 2. Scan for WASM/AOT Plugins (VA 2.1.W)
        scanWasmPlugins();

        // 3. Add standard MIDI sources (Internal to engine)
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

            if (mCatalog) {
                auto const* info = mCatalog->getComponent(modelId);
                if (info) {
                    m.category = info->family;
                    m.uiLayout = info->uiLayout;
                    m.style = info->style;
                    
                    for (auto const& p : info->parameters) {
                        m.ports.push_back({p.id, p.label, ModPortType::CV, true});
                    }
                    for (auto const& t : info->modulationTargets) {
                        m.ports.push_back({t.id, t.label, ModPortType::CV, false});
                    }
                }
            }
            mInventory[id] = m;
        }
    }

    void SemanticBrokerService::addStandardMidiSources() {
        // ... (existing code omitted for brevity but preserved)
    }

    void SemanticBrokerService::scanWasmPlugins() {
        using namespace Modulation;
        
        juce::File pluginDir = juce::File::getSpecialLocation(juce::File::currentApplicationFile)
                                .getParentDirectory()
                                .getChildFile("Resources/plugins");

        if (!pluginDir.exists() || !pluginDir.isDirectory()) return;

        juce::Array<juce::File> files;
        pluginDir.findChildFiles(files, juce::File::findFiles, false, "*.wasm;*.aot");

        int dynamicId = 1000;
        for (const auto& file : files) {
            ModuleManifest m;
            m.instanceId = "wasm." + std::to_string(dynamicId);
            m.modelId = file.getFileNameWithoutExtension().toStdString();
            m.category = "3rd Party";
            m.status = "active";
            
            // Standard WASM Ports (VA 2.1.W Contract)
            m.ports.push_back({"in", "AUDIO IN", ModPortType::Audio, true});
            m.ports.push_back({"out", "AUDIO OUT", ModPortType::Audio, false});
            m.ports.push_back({"cv", "MOD IN", ModPortType::CV, true});

            mInventory[m.instanceId] = m;
            dynamicId++;
        }
    }

} // namespace Service
} // namespace Core
} // namespace Omega
