#include "RpcPresetController.h"
#include "../Core/OmegaIdentifiers.h"

namespace Omega {
namespace UI {

    juce::var RpcPresetController::handleGetState(const juce::var& requestId, const juce::var&) {
        return createResponse("STATE", requestId, {}, presetToVar(mPreset));
    }

    juce::var RpcPresetController::handleListAceComponents(const juce::var& requestId, const juce::var&) {
        juce::Array<juce::var> components;
        for (const auto& comp : mCatalog.getComponents()) {
            juce::DynamicObject::Ptr obj = new juce::DynamicObject();
            obj->setProperty("id", juce::String(comp->id));
            obj->setProperty("name", juce::String(comp->name));
            obj->setProperty("family", juce::String(comp->family));
            
            // Hyper-ACE UI Metadata
            if (!comp->uiLayout.empty()) {
                obj->setProperty("uiLayout", juce::JSON::parse(comp->uiLayout));
            }
            if (!comp->style.empty()) {
                obj->setProperty("style", juce::String(comp->style));
            }

            components.add(juce::var(obj.get()));
        }
        return createResponse("ACE_LIST", requestId, {}, components);
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
        return createResponse("SAVE_ACK", requestId, {});
    }

    juce::var RpcPresetController::handleListPresets(const juce::var& requestId, const juce::var&) {
        auto presets = mRepository->listPresets();
        juce::Array<juce::var> list;
        for (const auto& p : presets) list.add(juce::String(p));
        return createResponse("PRESET_LIST", requestId, {}, list);
    }

    juce::var RpcPresetController::handleGetBrowserData(const juce::var& requestId, const juce::var&) {
        juce::DynamicObject::Ptr root = new juce::DynamicObject();
        juce::Array<juce::var> libraries;

        // 1. Factory Library (from Repository)
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

        // 2. User Library (Placeholder for now)
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

        return createResponse("BROWSER_DATA", requestId, {}, juce::var(root.get()));
    }

    juce::var RpcPresetController::handleSelectLibrary(const juce::var& requestId, const juce::var&) {
        return createResponse("SELECT_LIB_ACK", requestId, {}, true);
    }

    juce::var RpcPresetController::handleLoadLibraryPreset(const juce::var& requestId, const juce::var& payload, std::function<void(const Core::Preset::OmegaPreset&)> onLoad) {
        int libIdx = (int)payload["libIdx"];
        int prstIdx = (int)payload["prstIdx"];
        
        auto presets = mRepository->listPresets();
        if (prstIdx >= 0 && prstIdx < (int)presets.size()) {
            Core::Preset::OmegaPreset loaded;
            if (mRepository->loadPreset(presets[prstIdx], loaded)) {
                if (onLoad) onLoad(loaded);
                return createResponse("LOAD_ACK", requestId, {}, true);
            }
        }
        return createError("LOAD_ACK", requestId, "Preset not found at index");
    }

    juce::var RpcPresetController::handleSetFavorite(const juce::var& requestId, const juce::var&) {
        return createResponse("FAV_ACK", requestId, {}, true);
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

        return createResponse("HISTORY", requestId, {}, root.get());
    }

    juce::var RpcPresetController::handleSaveSnapshot(const juce::var& requestId, const juce::var& payload, const Core::Preset::OmegaPreset& currentPreset) {
        if (!mRepository) return createError("SAVE_SNAPSHOT_ACK", requestId, "Repository not available");
        juce::String author = payload["author"].toString();
        juce::String message = payload["message"].toString();
        std::string hash = mRepository->saveSnapshot(currentPreset, author.toStdString(), message.toStdString());
        return createResponse("SAVE_SNAPSHOT_ACK", requestId, {}, juce::String(hash));
    }

    juce::var RpcPresetController::handleCheckout(const juce::var& requestId, const juce::var& payload, std::function<void(const Core::Preset::OmegaPreset&)> onLoad) {
        if (!mRepository) return createError("CHECKOUT_ACK", requestId, "Repository not available");
        juce::String presetId = payload["presetId"].toString();
        juce::String hash = payload["hash"].toString();
        Core::Preset::OmegaPreset loadedPreset;
        if (mRepository->checkout(presetId.toStdString(), hash.toStdString(), loadedPreset)) {
            if (onLoad) onLoad(loadedPreset);
            return createResponse("CHECKOUT_ACK", requestId, {}, true);
        }
        return createError("CHECKOUT_ACK", requestId, "Checkout failed");
    }

    juce::var RpcPresetController::handleCreateBranch(const juce::var& requestId, const juce::var& payload) {
        if (!mRepository) return createError("BRANCH_ACK", requestId, "Repository not available");
        juce::String presetId = payload["presetId"].toString();
        juce::String branchName = payload["name"].toString();
        juce::String fromHash = payload["from"].toString();
        bool ok = mRepository->createBranch(presetId.toStdString(), branchName.toStdString(), fromHash.toStdString());
        return createResponse("BRANCH_ACK", requestId, {}, ok);
    }

    // Recursive helper for ValueTree -> JSON map
    static juce::var valueTreeToVar(const juce::ValueTree& tree) {
        if (!tree.isValid()) return juce::var();
        auto tag = tree.getType().toString();

        // Collection Flattening
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
            
            // [VISION 2.1.3/2.1.4]: Standard Alignment (toFixed crash fix)
            if (propName == Core::Identifiers::amount && val.isVoid()) {
                obj->setProperty(propName, 0.0);
            } else if (propName == Core::Identifiers::viaAmount && val.isVoid()) {
                obj->setProperty(propName, 1.0);
            } else {
                obj->setProperty(propName, val);
            }
        }

        for (int i = 0; i < tree.getNumChildren(); ++i) {
            auto child = tree.getChild(i);
            auto childTag = child.getType();
            obj->setProperty(childTag, valueTreeToVar(child));
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
