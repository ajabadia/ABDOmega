#include "RpcPresetController.h"
#include "../Core/OmegaIdentifiers.h"
#include "../Core/Providers/EngineConfigManager.h"
#include "../Core/Model/PatchIdentifiers.h"
#include "../Core/Model/PatchDocument.h"
#include <juce_gui_basics/juce_gui_basics.h>
#include <algorithm>

namespace Omega {
namespace UI {

    void RpcPresetController::registerCommands(RpcCommandDispatcher& dispatcher, std::function<void()> onLoad) {
        dispatcher.registerHandler("listAce",            [this](const juce::var& rid, const juce::var& p) { return handleListAceComponents(rid, p); });
        dispatcher.registerHandler("loadPreset",         [this, onLoad](const juce::var& rid, const juce::var& p) { return handleLoadPreset(rid, p, onLoad); });
        dispatcher.registerHandler("newPreset",          [this, onLoad](const juce::var& rid, const juce::var& p) { return handleNewPreset(rid, p, onLoad); });
        dispatcher.registerHandler("savePreset",         [this](const juce::var& rid, const juce::var& p) { return handleSavePreset(rid, p); });
        dispatcher.registerHandler("listPresets",        [this](const juce::var& rid, const juce::var& p) { return handleListPresets(rid, p); });
        dispatcher.registerHandler("getBrowserData",     [this](const juce::var& rid, const juce::var& p) { return handleGetBrowserData(rid, p); });
        dispatcher.registerHandler("getHistory",         [this](const juce::var& rid, const juce::var& p) { return handleGetHistory(rid, p); });
        
        dispatcher.registerHandler("addModule",          [this, onLoad](const juce::var& rid, const juce::var& p) { return handleAddModule(rid, p, onLoad); });
        dispatcher.registerHandler("removeModule",       [this, onLoad](const juce::var& rid, const juce::var& p) { return handleRemoveModule(rid, p, onLoad); });
        dispatcher.registerHandler("moveModule",         [this, onLoad](const juce::var& rid, const juce::var& p) { return handleMoveModule(rid, p, onLoad); });
    }

    juce::var RpcPresetController::handleListAceComponents(const juce::var& requestId, const juce::var&) {
        juce::Array<juce::var> components;
        for (const auto& comp : mCatalog.getComponents()) {
            juce::DynamicObject::Ptr obj = new juce::DynamicObject();
            obj->setProperty("id", juce::String(comp->id));
            obj->setProperty("name", juce::String(comp->name));
            obj->setProperty("family", juce::String(comp->family));
            components.add(juce::var(obj.get()));
        }
        return createResponse("ACE_LIST", requestId, juce::var(), components);
    }

    juce::var RpcPresetController::handleLoadPreset(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad) {
        // [Era 7] Aseptic Bridge: Presets are handled via PatchDocument persistence in EngineConfig.
        return createResponse("LOAD_ACK", requestId, {}, true);
    }

    juce::var RpcPresetController::handleNewPreset(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad) {
        Core::Model::PatchDocument doc;
        doc.metadata.name = "Aseptic Initial Patch";
        doc.masterGainDb = 0.0f;
        
        mEngineConfig.applyPatch(doc);
        if (mOnConfigChanged) mOnConfigChanged();
        if (onLoad) onLoad();
        
        return createResponse("NEW_ACK", requestId, {}, true);
    }

    juce::var RpcPresetController::handleSavePreset(const juce::var& requestId, const juce::var& payload) {
        return createResponse("SAVE_ACK", requestId, juce::var());
    }

    juce::var RpcPresetController::handleListPresets(const juce::var& requestId, const juce::var&) {
        juce::Array<juce::var> list;
        list.add("Default Era 7 Patch");
        return createResponse("PRESET_LIST", requestId, juce::var(), list);
    }

    juce::var RpcPresetController::handleGetBrowserData(const juce::var& requestId, const juce::var&) {
        juce::DynamicObject::Ptr root = new juce::DynamicObject();
        juce::Array<juce::var> libraries;

        juce::DynamicObject::Ptr factLib = new juce::DynamicObject();
        factLib->setProperty("name", "Factory Era 7");
        factLib->setProperty("category", "Factory");
        
        juce::Array<juce::var> patches;
        factLib->setProperty("patches", patches);
        libraries.add(juce::var(factLib.get()));

        root->setProperty("libraries", libraries);
        
        juce::Array<juce::var> categories;
        categories.add("Factory");
        root->setProperty("categories", categories);

        return createResponse("BROWSER_DATA", requestId, juce::var(), juce::var(root.get()));
    }

    juce::var RpcPresetController::handleAddModule(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad) {
        auto componentId = payload["componentId"].toString();
        auto typeId = Core::Model::mapIdToType(componentId.toStdString());
        
        if (typeId == Core::Model::ModuleTypeId::None) {
            return createError("ADD_MODULE_ACK", requestId, "Component not Era 7 compatible: " + componentId);
        }

        auto doc = mEngineConfig.getPatchDocument();
        
        Core::Model::ModuleInstance ni;
        ni.typeId = typeId;
        
        uint32_t maxId = 0;
        for (const auto& m : doc.modules) if (m.instanceId > maxId) maxId = m.instanceId;
        ni.instanceId = maxId + 1;
        
        ni.position.rack = 0;
        ni.position.slot = (int16_t)doc.modules.size();
        
        doc.modules.push_back(ni);
        mEngineConfig.applyPatch(doc);
        
        if (mOnConfigChanged) mOnConfigChanged();
        if (onLoad) onLoad();
        
        return createResponse("ADD_MODULE_ACK", requestId, juce::var(), true);
    }

    juce::var RpcPresetController::handleRemoveModule(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad) {
        juce::String idStr = payload["instanceId"].toString();
        uint32_t instanceId = 0;
        
        if (idStr.startsWith("v7_")) {
            instanceId = (uint32_t)idStr.substring(3).getLargeIntValue();
        } else {
            instanceId = (uint32_t)payload["instanceId"].operator int();
        }
        
        auto doc = mEngineConfig.getPatchDocument();
        auto it = std::find_if(doc.modules.begin(), doc.modules.end(), 
                               [instanceId](const Core::Model::ModuleInstance& m) { return m.instanceId == instanceId; });
        
        if (it != doc.modules.end()) {
            doc.modules.erase(it);
            mEngineConfig.applyPatch(doc);
            if (mOnConfigChanged) mOnConfigChanged();
            if (onLoad) onLoad();
            return createResponse("REMOVE_MODULE_ACK", requestId, juce::var(), true);
        }
        
        return createError("REMOVE_MODULE_ACK", requestId, "Module not found (Era 7)");
    }

    juce::var RpcPresetController::handleMoveModule(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad) {
        juce::String idStr = payload["instanceId"].toString();
        int direction = (int)payload["direction"];
        uint32_t instanceId = 0;
        
        if (idStr.startsWith("v7_")) {
            instanceId = (uint32_t)idStr.substring(3).getLargeIntValue();
            
            auto doc = mEngineConfig.getPatchDocument();
            auto it = std::find_if(doc.modules.begin(), doc.modules.end(), 
                                   [instanceId](const Core::Model::ModuleInstance& m) { return m.instanceId == instanceId; });
            
            if (it != doc.modules.end()) {
                int oldIdx = (int)std::distance(doc.modules.begin(), it);
                int newIdx = oldIdx + direction;
                
                if (newIdx >= 0 && newIdx < (int)doc.modules.size()) {
                    auto mod = *it;
                    doc.modules.erase(it);
                    doc.modules.insert(doc.modules.begin() + newIdx, mod);
                    
                    for (int i = 0; i < (int)doc.modules.size(); ++i) {
                        doc.modules[i].position.slot = (int16_t)i;
                    }
                    
                    mEngineConfig.applyPatch(doc);
                    if (mOnConfigChanged) mOnConfigChanged();
                    if (onLoad) onLoad();
                    return createResponse("MOVE_MODULE_ACK", requestId, juce::var(), true);
                }
            }
        }
        return createError("MOVE_MODULE_ACK", requestId, "Move invalid in Era 7 Mode");
    }

    juce::var RpcPresetController::handleGetHistory(const juce::var& requestId, const juce::var&) {
        return createError("HISTORY", requestId, "Version control deferred in Era 7 Aseptic Phase");
    }

    juce::var RpcPresetController::valueTreeToVar(const juce::ValueTree& tree) {
        if (!tree.isValid()) return juce::var();
        juce::DynamicObject::Ptr obj = new juce::DynamicObject();
        for (int i = 0; i < tree.getNumProperties(); ++i) {
            obj->setProperty(tree.getPropertyName(i), tree.getProperty(tree.getPropertyName(i)));
        }
        return juce::var(obj.get());
    }

} // namespace UI
} // namespace Omega
