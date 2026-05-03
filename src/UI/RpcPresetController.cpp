#include "RpcPresetController.h"
#include "../Core/OmegaIdentifiers.h"
#include "../Core/Providers/EngineConfigManager.h"
#include "../Core/Model/PatchIdentifiers.h"
#include "../Core/Model/PatchDocument.h"
#include <juce_gui_basics/juce_gui_basics.h>
#include <algorithm>

namespace Omega {
namespace UI {

    void RpcPresetController::registerCommands(RpcCommandDispatcher& dispatcher, std::function<void(const Core::Preset::OmegaPreset&)> onLoad) {
        dispatcher.registerHandler("listAce",            [this](const juce::var& rid, const juce::var& p) { return handleListAceComponents(rid, p); });
        dispatcher.registerHandler("loadPreset",         [this, onLoad](const juce::var& rid, const juce::var& p) { return handleLoadPreset(rid, p, onLoad); });
        dispatcher.registerHandler("savePreset",         [this](const juce::var& rid, const juce::var& p) { return handleSavePreset(rid, p); });
        dispatcher.registerHandler("listPresets",        [this](const juce::var& rid, const juce::var& p) { return handleListPresets(rid, p); });
        dispatcher.registerHandler("getBrowserData",     [this](const juce::var& rid, const juce::var& p) { return handleGetBrowserData(rid, p); });
        dispatcher.registerHandler("getHistory",         [this](const juce::var& rid, const juce::var& p) { return handleGetHistory(rid, p); });
        dispatcher.registerHandler("saveSnapshot",       [this](const juce::var& rid, const juce::var& p) { return handleSaveSnapshot(rid, p, mPreset); });
        dispatcher.registerHandler("checkout",           [this, onLoad](const juce::var& rid, const juce::var& p) { return handleCheckout(rid, p, onLoad); });
        dispatcher.registerHandler("createBranch",       [this](const juce::var& rid, const juce::var& p) { return handleCreateBranch(rid, p); });
        dispatcher.registerHandler("selectLibrary",      [this](const juce::var& rid, const juce::var& p) { return handleSelectLibrary(rid, p); });
        dispatcher.registerHandler("loadLibraryPreset",  [this, onLoad](const juce::var& rid, const juce::var& p) { return handleLoadLibraryPreset(rid, p, onLoad); });
        dispatcher.registerHandler("setFavorite",        [this](const juce::var& rid, const juce::var& p) { return handleSetFavorite(rid, p); });
        dispatcher.registerHandler("addModule",          [this, onLoad](const juce::var& rid, const juce::var& p) { return handleAddModule(rid, p, onLoad); });
        dispatcher.registerHandler("removeModule",       [this, onLoad](const juce::var& rid, const juce::var& p) { return handleRemoveModule(rid, p, onLoad); });
        dispatcher.registerHandler("moveModule",         [this, onLoad](const juce::var& rid, const juce::var& p) { return handleMoveModule(rid, p, onLoad); });
        dispatcher.registerHandler("setModuleTheme",     [this, onLoad](const juce::var& rid, const juce::var& p) { return handleSetModuleTheme(rid, p, onLoad); });
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

    juce::var RpcPresetController::handleLoadPreset(const juce::var& requestId, const juce::var& payload, std::function<void(const Core::Preset::OmegaPreset&)> onLoad) {
        juce::String id = payload.hasProperty("id") ? payload["id"].toString() : payload["presetId"].toString();
        
        Core::Preset::OmegaPreset loaded;
        if (mRepository && mRepository->loadPreset(id.toStdString(), loaded)) {
            if (onLoad) onLoad(loaded);
            return createResponse("LOAD_ACK", requestId, {}, true);
        }
        
        return createError("LOAD_ACK", requestId, "Preset not found: " + id);
    }

    juce::var RpcPresetController::handleSavePreset(const juce::var& requestId, const juce::var& payload) {
        return createResponse("SAVE_ACK", requestId, juce::var());
    }

    juce::var RpcPresetController::handleListPresets(const juce::var& requestId, const juce::var&) {
        auto presets = mRepository->listPresets();
        juce::Array<juce::var> list;
        for (const auto& p : presets) list.add(juce::String(p));
        return createResponse("PRESET_LIST", requestId, juce::var(), list);
    }

    juce::var RpcPresetController::handleGetBrowserData(const juce::var& requestId, const juce::var&) {
        juce::DynamicObject::Ptr root = new juce::DynamicObject();
        juce::Array<juce::var> libraries;

        juce::DynamicObject::Ptr factLib = new juce::DynamicObject();
        factLib->setProperty("name", "Factory");
        factLib->setProperty("category", "Factory");
        
        juce::Array<juce::var> patches;
        auto presets = mRepository->listPresets();
        for (const auto& p : presets) {
            juce::DynamicObject::Ptr patch = new juce::DynamicObject();
            patch->setProperty("name", juce::String(p));
            patch->setProperty("author", "OMEGA Team");
            patch->setProperty("category", "Factory");
            patch->setProperty("favorite", false);
            patches.add(juce::var(patch.get()));
        }
        factLib->setProperty("patches", patches);
        libraries.add(juce::var(factLib.get()));

        juce::DynamicObject::Ptr userLib = new juce::DynamicObject();
        userLib->setProperty("name", "User");
        userLib->setProperty("category", "User");
        userLib->setProperty("patches", juce::Array<juce::var>());
        libraries.add(juce::var(userLib.get()));

        root->setProperty("libraries", libraries);
        
        juce::Array<juce::var> categories;
        categories.add("Factory");
        categories.add("User");
        categories.add("Bass");
        categories.add("Lead");
        categories.add("Pad");
        root->setProperty("categories", categories);

        return createResponse("BROWSER_DATA", requestId, juce::var(), juce::var(root.get()));
    }

    juce::var RpcPresetController::handleSelectLibrary(const juce::var& requestId, const juce::var&) {
        return createResponse("SELECT_LIB_ACK", requestId, juce::var(), true);
    }

    juce::var RpcPresetController::handleLoadLibraryPreset(const juce::var& requestId, const juce::var& payload, std::function<void(const Core::Preset::OmegaPreset&)> onLoad) {
        int prstIdx = (int)payload["prstIdx"];
        
        auto presets = mRepository->listPresets();
        if (prstIdx >= 0 && prstIdx < (int)presets.size()) {
            Core::Preset::OmegaPreset loaded;
            if (mRepository->loadPreset(presets[prstIdx], loaded)) {
                if (onLoad) onLoad(loaded);
                return createResponse("LOAD_ACK", requestId, juce::var(), true);
            }
        }
        return createError("LOAD_ACK", requestId, "Preset not found at index");
    }

    juce::var RpcPresetController::handleSetFavorite(const juce::var& requestId, const juce::var&) {
        return createResponse("FAV_ACK", requestId, juce::var(), true);
    }
    
    juce::var RpcPresetController::handleAddModule(const juce::var& requestId, const juce::var& payload, std::function<void(const Core::Preset::OmegaPreset&)> onLoad) {
        auto componentId = payload["componentId"].toString();
        auto typeId = Core::Model::mapIdToType(componentId.toStdString());
        
        if (typeId == Core::Model::ModuleTypeId::None) {
            return createError("ADD_MODULE_ACK", requestId, "Component not Era 7 compatible or not found: " + componentId);
        }

        // [Era 7] Update PatchDocument directly
        auto doc = mEngineConfig.getPatchDocument();
        
        Core::Model::ModuleInstance ni;
        ni.typeId = typeId;
        
        // Generate InstanceId
        uint32_t maxId = 0;
        for (const auto& m : doc.modules) if (m.instanceId > maxId) maxId = m.instanceId;
        ni.instanceId = maxId + 1;
        
        // Default Position
        ni.position.rack = 0;
        ni.position.slot = (int16_t)doc.modules.size();
        
        // Default Parameters from Catalog
        auto info = mCatalog.getComponent(componentId.toStdString());
        if (info) {
            for (const auto& p : info->parameters) {
                // Map string ID to numeric ParamId (placeholder logic for now)
                try {
                    uint16_t pid = (uint16_t)std::stoi(p.id);
                    ni.parameters.push_back({(Core::Model::ParamId)pid, p.defaultValue});
                } catch(...) {}
            }
        }

        doc.modules.push_back(ni);
        mEngineConfig.applyPatch(doc);
        
        if (mOnConfigChanged) mOnConfigChanged();
        
        return createResponse("ADD_MODULE_ACK", requestId, juce::var(), true);
    }

    juce::var RpcPresetController::handleRemoveModule(const juce::var& requestId, const juce::var& payload, std::function<void(const Core::Preset::OmegaPreset&)> onLoad) {
        juce::String idStr = payload["instanceId"].toString();
        uint32_t instanceId = 0;
        
        if (idStr.startsWith("v7_")) {
            instanceId = (uint32_t)idStr.substring(3).getLargeIntValue();
        } else {
            instanceId = (uint32_t)payload["instanceId"].operator int();
        }
        
        // [Era 7] Update PatchDocument directly
        auto doc = mEngineConfig.getPatchDocument();
        auto it = std::find_if(doc.modules.begin(), doc.modules.end(), 
                               [instanceId](const Core::Model::ModuleInstance& m) { return m.instanceId == instanceId; });
        
        if (it != doc.modules.end()) {
            doc.modules.erase(it);
            mEngineConfig.applyPatch(doc);
            if (mOnConfigChanged) mOnConfigChanged();
            return createResponse("REMOVE_MODULE_ACK", requestId, juce::var(), true);
        }
        
        return createError("REMOVE_MODULE_ACK", requestId, "Module not found (Era 7): " + idStr);
    }
    juce::var RpcPresetController::handleMoveModule(const juce::var& requestId, const juce::var& payload, std::function<void(const Core::Preset::OmegaPreset&)> onLoad) {
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
                    
                    // Re-calculate slots to maintain order
                    for (int i = 0; i < (int)doc.modules.size(); ++i) {
                        doc.modules[i].position.slot = (int16_t)i;
                    }
                    
                    mEngineConfig.applyPatch(doc);
                    if (mOnConfigChanged) mOnConfigChanged();
                    return createResponse("MOVE_MODULE_ACK", requestId, juce::var(), true);
                }
            }
            return createError("MOVE_MODULE_ACK", requestId, "Module move invalid or out of bounds: " + idStr);
        }

        // Legacy Fallback (optional, but keep for safety during transition)
        auto& state = mPreset.getState();
        using IDs = Core::Preset::OmegaPreset::IDs;
        // ... (rest of legacy logic if needed)
        return createError("MOVE_MODULE_ACK", requestId, "Legacy move not supported in Era 7 Mode");
    }

    juce::var RpcPresetController::handleSetModuleTheme(const juce::var& requestId, const juce::var& payload, std::function<void(const Core::Preset::OmegaPreset&)> onLoad) {
        auto instanceId = payload["instanceId"].toString();
        auto theme = payload["theme"].toString();
        
        auto& state = mPreset.getState();
        using IDs = Core::Preset::OmegaPreset::IDs;
        auto aux = state.getChildWithName(IDs::auxiliary);
        
        if (aux.isValid()) {
            for (int i = 0; i < aux.getNumChildren(); ++i) {
                auto child = aux.getChild(i);
                if (child.getProperty(IDs::instanceId).toString() == instanceId) {
                    child.setProperty("theme", theme, nullptr);
                    
                    if (onLoad) {
                        Core::Preset::OmegaPreset presetCopy = mPreset;
                        juce::MessageManager::callAsync([onLoad, presetCopy]() {
                            onLoad(presetCopy);
                        });
                    }
                    return createResponse("SET_THEME_ACK", requestId, juce::var(), true);
                }
            }
        }
        return createError("SET_THEME_ACK", requestId, "Module not found: " + instanceId);
    }

    juce::var RpcPresetController::handleGetHistory(const juce::var& requestId, const juce::var& payload) {
        if (!mRepository) return createError("HISTORY", requestId, "Repository not available");
        juce::String presetId = payload["presetId"].toString();
        auto history = mRepository->getHistory(presetId.toStdString());
        
        juce::DynamicObject::Ptr root = new juce::DynamicObject();
        root->setProperty("presetId", juce::var(history.presetId));
        root->setProperty("currentBranch", juce::var(history.currentBranch));
        
        juce::Array<juce::var> branches;
        for (auto const& [name, hash] : history.branches) {
            juce::DynamicObject::Ptr b = new juce::DynamicObject();
            b->setProperty("name", juce::String(name));
            b->setProperty("hash", juce::String(hash));
            branches.add(juce::var(b.get()));
        }
        root->setProperty("branches", branches);

        juce::Array<juce::var> snapshots;
        for (const auto& v : history.snapshots) {
            juce::DynamicObject::Ptr s = new juce::DynamicObject();
            s->setProperty("hash", juce::String(v.hash));
            s->setProperty("message", juce::String(v.message));
            s->setProperty("timestamp", (juce::int64)v.timestamp);
            snapshots.add(juce::var(s.get()));
        }
        root->setProperty("snapshots", snapshots);

        return createResponse("HISTORY", requestId, juce::var(), root.get());
    }

    juce::var RpcPresetController::handleSaveSnapshot(const juce::var& requestId, const juce::var& payload, const Core::Preset::OmegaPreset& currentPreset) {
        if (!mRepository) return createError("SAVE_SNAPSHOT_ACK", requestId, "Repository not available");
        juce::String author = payload["author"].toString();
        juce::String message = payload["message"].toString();
        std::string hash = mRepository->saveSnapshot(currentPreset, author.toStdString(), message.toStdString());
        return createResponse("SAVE_SNAPSHOT_ACK", requestId, juce::var(), juce::String(hash));
    }

    juce::var RpcPresetController::handleCheckout(const juce::var& requestId, const juce::var& payload, std::function<void(const Core::Preset::OmegaPreset&)> onLoad) {
        if (!mRepository) return createError("CHECKOUT_ACK", requestId, "Repository not available");
        juce::String presetId = payload["presetId"].toString();
        juce::String hash = payload["hash"].toString();
        Core::Preset::OmegaPreset loadedPreset;
        if (mRepository->checkout(presetId.toStdString(), hash.toStdString(), loadedPreset)) {
            if (onLoad) onLoad(loadedPreset);
            return createResponse("CHECKOUT_ACK", requestId, juce::var(), true);
        }
        return createError("CHECKOUT_ACK", requestId, "Checkout failed");
    }

    juce::var RpcPresetController::handleCreateBranch(const juce::var& requestId, const juce::var& payload) {
        if (!mRepository) return createError("BRANCH_ACK", requestId, "Repository not available");
        juce::String presetId = payload["presetId"].toString();
        juce::String branchName = payload["name"].toString();
        juce::String fromHash = payload["from"].toString();
        bool ok = mRepository->createBranch(presetId.toStdString(), branchName.toStdString(), fromHash.toStdString());
        return createResponse("BRANCH_ACK", requestId, juce::var(), ok);
    }

    juce::var RpcPresetController::valueTreeToVar(const juce::ValueTree& tree) {
        if (!tree.isValid()) return juce::var();
        auto tag = tree.getType().toString();

        static const std::vector<juce::String> collections = {
            "layers", "oscillators", "filters", "lfos", "envelopes", 
            "amplifiers", "modulators", "fxSlots", "auxiliary", "modGraph",
            "nodes", "patchbayMatrix", "voiceChain", "NODES", "CONNECTIONS", "NODE", "CONNECTION"
        };

        if (std::find(collections.begin(), collections.end(), tag) != collections.end()) {
            juce::Array<juce::var> arr;
            for (int i = 0; i < tree.getNumChildren(); ++i) arr.add(valueTreeToVar(tree.getChild(i)));
            return juce::var(arr);
        }

        juce::DynamicObject::Ptr obj = new juce::DynamicObject();
        for (int i = 0; i < tree.getNumProperties(); ++i) {
            auto propName = tree.getPropertyName(i);
            auto val = tree.getProperty(propName);
            
            if (propName == Core::Identifiers::amount && val.isVoid()) obj->setProperty(propName, 0.0);
            else if (propName == Core::Identifiers::viaAmount && val.isVoid()) obj->setProperty(propName, 1.0);
            else obj->setProperty(propName, val);
        }

        for (int i = 0; i < tree.getNumChildren(); ++i) {
            auto child = tree.getChild(i);
            obj->setProperty(child.getType(), valueTreeToVar(child));
        }
        return juce::var(obj.get());
    }

    juce::var RpcPresetController::presetToVar(const Core::Preset::OmegaPreset& p) {
        juce::DynamicObject::Ptr root = new juce::DynamicObject();
        root->setProperty("preset", valueTreeToVar(p.getState()));
        return juce::var(root.get());
    }

} // namespace UI
} // namespace Omega
