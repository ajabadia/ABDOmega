#include "SemanticBrokerService.h"
#include "../Modulation/ModuleManifest.h"
#include "../OmegaIdentifiers.h"
#include <juce_core/juce_core.h>
#include <juce_data_structures/juce_data_structures.h>
#include <algorithm>
#include <functional>
#include <map>

namespace Omega {
namespace Core {
namespace Service {

    void SemanticBrokerService::rebuildInventory(const Preset::OmegaPreset& preset) {
        std::lock_guard<std::mutex> lock(this->mMutex);
        this->mInventory.clear();
        this->scanDynamicNodes(preset.getState());
        this->scanAuxiliaryModules(preset.getState());
        this->scanWasmModules();
    }

    std::vector<Modulation::ModuleManifest> SemanticBrokerService::getInventory() const {
        std::lock_guard<std::mutex> lock(this->mMutex);
        std::vector<Modulation::ModuleManifest> results;
        for (auto const& pair : this->mInventory) results.push_back(pair.second);
        return results;
    }

    const Modulation::ModuleManifest* SemanticBrokerService::getManifest(const std::string& instanceId) const {
        std::lock_guard<std::mutex> lock(this->mMutex);
        auto it = this->mInventory.find(instanceId);
        return (it != this->mInventory.end()) ? &(it->second) : nullptr;
    }

    void SemanticBrokerService::scanDynamicNodes(const juce::ValueTree& state) {
        using IDs = Core::Identifiers;
        juce::ValueTree chain = state.getChildWithName(IDs::voiceChain);
        if (!chain.isValid()) return;
        juce::ValueTree nodes = chain.getChildWithName(IDs::NODES);
        for (int i = 0; i < nodes.getNumChildren(); ++i) {
            auto node = nodes.getChild(i);
            std::string id = node.getProperty(IDs::nodeId).toString().toStdString();
            std::string modelId = node.getProperty(IDs::componentId).toString().toStdString();
            if (id.empty() || modelId.empty()) continue;

            Modulation::ModuleManifest m;
            m.instanceId = id;
            m.modelId = modelId;
            m.status = "active";

            if (this->mCatalog) {
                auto const* info = this->mCatalog->getComponent(modelId);
                if (info) {
                    m.category = info->family;
                    for (auto const& p : info->parameters) {
                        if (!p.modulable) continue;
                        if (!p.front) continue; // ASEPTIC WALL: Physical pruning for the production rack
                        // Proper PortDescriptor initialization: {id, label, type, isInput, telemetryIndex, defaultValue, options, isFront, isBack}
                        m.ports.push_back({ p.id, p.label, Modulation::ModPortType::CV, true, -1, p.defaultValue, p.options, p.front, p.back });
                    }
                    for (auto const& port : info->ports) m.ports.push_back(port);
                }
            }
            this->mInventory[id] = m;
        }
    }

    void SemanticBrokerService::scanAuxiliaryModules(const juce::ValueTree& state) {
        using IDs = Core::Identifiers;
        juce::ValueTree aux = state.getChildWithName(IDs::auxiliary);
        if (!aux.isValid()) return;
        for (int i = 0; i < aux.getNumChildren(); ++i) {
            auto node = aux.getChild(i);
            std::string id = node.getProperty(IDs::instanceId).toString().toStdString();
            std::string modelId = node.getProperty(IDs::componentId).toString().toStdString();
            if (id.empty() || modelId.empty()) continue;

            Modulation::ModuleManifest m;
            m.instanceId = id;
            m.modelId = modelId;
            m.status = "active";

            if (this->mCatalog) {
                auto const* info = this->mCatalog->getComponent(modelId);
                if (info) {
                    m.category = info->family;
                    for (auto const& p : info->parameters) {
                        if (!p.modulable) continue;
                        if (!p.front) continue; // ASEPTIC WALL
                        m.ports.push_back({ p.id, p.label, Modulation::ModPortType::CV, true, -1, p.defaultValue, p.options, p.front, p.back });
                    }
                    for (auto const& port : info->ports) m.ports.push_back(port);
                }
            }
            this->mInventory[id] = m;
        }
    }

    void SemanticBrokerService::scanWasmModules() {
        if (!this->mCatalog) return;
        for (auto const* info : this->mCatalog->getComponents()) {
            if (info->implementationId >= 500) {
                Modulation::ModuleManifest m;
                m.instanceId = info->id;
                m.modelId = info->id;
                m.category = info->family;
                m.status = "template";
                for (auto const& p : info->parameters) {
                    if (!p.modulable) continue;
                    if (!p.front) continue; // ASEPTIC WALL
                    m.ports.push_back({ p.id, p.label, Modulation::ModPortType::CV, true, -1, p.defaultValue, p.options, p.front, p.back });
                }
                for (auto const& port : info->ports) m.ports.push_back(port);
                if (this->mInventory.find(m.instanceId) == this->mInventory.end()) this->mInventory[m.instanceId] = m;
            }
        }
    }

} // namespace Service
} // namespace Core
} // namespace Omega
