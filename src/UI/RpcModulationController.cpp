#include "RpcModulationController.h"
#include <set>

namespace Omega {
namespace UI {

    juce::var RpcModulationController::handleGetModulationMetadata(const juce::var& requestId, const juce::var& payload) {
        juce::DynamicObject::Ptr resp = new juce::DynamicObject();
        
        // 1. Collect Active Semantic Types from Preset
        std::set<std::string> activeTypes;
        using IDs = Core::Identifiers;
        auto state = mPreset.getState();
        
        auto collect = [&](juce::ValueTree node) {
            for (int i = 0; i < node.getNumChildren(); ++i) {
                auto c = node.getChild(i);
                if (c.hasType(IDs::COMPONENT) || c.hasType(IDs::NODE)) {
                    juce::String type = c.getProperty(IDs::slotType).toString().toLowerCase();
                    juce::String cid = c.getProperty(IDs::componentId).toString().toLowerCase();
                    juce::String id = c.getProperty(IDs::id).toString().toLowerCase();
                    
                    if (!type.isEmpty()) activeTypes.insert(type.toStdString());
                    else if (!id.isEmpty()) activeTypes.insert(id.toStdString());
                    
                    // Prefix matching for absolute aseptic robustness
                    if (cid.startsWith("lfo")) activeTypes.insert("lfo");
                    if (cid.startsWith("eg") || cid.startsWith("env")) activeTypes.insert("eg");
                    if (cid.startsWith("osc")) activeTypes.insert("osc");
                    if (cid.startsWith("vcf") || cid.startsWith("flt")) activeTypes.insert("filter");
                }
            }
        };

        // Scan Layers
        auto layers = state.getChildWithName(IDs::layers);
        for (int i = 0; i < layers.getNumChildren(); ++i) {
            auto layer = layers.getChild(i);
            auto arch = layer.getChildWithName(IDs::voiceArch);
            for (int j = 0; j < arch.getNumChildren(); ++j) collect(arch.getChild(j));
        }
        
        // Scan Auxiliary & Global Modulators
        collect(state.getChildWithName(IDs::auxiliary));
        collect(state.getChildWithName(IDs::modulators));

        // 2. Filter Sources
        juce::Array<juce::var> sources;
        for (const auto& s : Core::Modulation::ModulationRegistry::getAvailableSources()) {
            bool isAvailable = false;
            juce::String sid(s.id);
            if (s.category == Core::Modulation::SourceCategory::MIDI) {
                isAvailable = true; 
            } else if (sid.startsWith("lfo")) {
                isAvailable = activeTypes.count("lfo") > 0;
            } else if (sid.startsWith("env")) {
                isAvailable = activeTypes.count("eg") > 0 || activeTypes.count("env") > 0;
            }
            
            if (isAvailable) {
                juce::DynamicObject::Ptr obj = new juce::DynamicObject();
                obj->setProperty("id", sid);
                obj->setProperty("name", juce::String(s.name));
                sources.add(juce::var(obj.get()));
            }
        }
        resp->setProperty("sources", sources);

        // 3. Filter Targets
        juce::Array<juce::var> targets;
        for (const auto& t : Core::Modulation::ModulationRegistry::getAvailableTargets()) {
            bool isAvailable = false;
            juce::String tid(t.id);
            if (tid.contains("vcf")) {
                isAvailable = activeTypes.count("filter") > 0 || activeTypes.count("vcf") > 0;
            } else if (tid.contains("osc")) {
                isAvailable = activeTypes.count("osc") > 0 || activeTypes.count("osci") > 0;
            } else if (tid.contains("vca")) {
                isAvailable = activeTypes.count("amp") > 0 || activeTypes.count("vca") > 0;
            } else if (tid.contains("lfo")) {
                isAvailable = activeTypes.count("lfo") > 0;
            } else if (tid.contains("env")) {
                isAvailable = activeTypes.count("eg") > 0 || activeTypes.count("env") > 0;
            }

            if (isAvailable) {
                juce::DynamicObject::Ptr obj = new juce::DynamicObject();
                obj->setProperty("id", tid);
                obj->setProperty("name", juce::String(t.name));
                targets.add(juce::var(obj.get()));
            }
        }
        resp->setProperty("targets", targets);

        return createResponse("MOD_METADATA_ACK", requestId, {}, juce::var(resp.get()));
    }

    juce::var RpcModulationController::handleUpdateModMatrixSlot(const juce::var& requestId, const juce::var& payload) {
        int slotIdx = (int)payload["slot"];
        juce::String key = payload["key"].toString();
        juce::var value = payload["value"];

        if (slotIdx < 0 || slotIdx >= 32) return createError("MOD_UPDATE_ERR", requestId, "Invalid slot index");

        auto slot = mPreset.getModSlot(slotIdx);
        
        if (key == "source") slot.source = value.toString().toStdString();
        else if (key == "target") slot.target = value.toString().toStdString();
        else if (key == "amount") slot.amount = (float)value;
        else if (key == "via") slot.via = value.toString().toStdString();
        else if (key == "viaAmount") slot.viaAmount = (float)value;
        else if (key == "active") slot.active = (bool)value;
        
        // Auto-activate logic if modifying source or target
        if (key == "source" || key == "target") {
            slot.active = !slot.source.empty() && !slot.target.empty();
        }

        mPreset.setModSlot(slotIdx, slot);

        return createResponse("MOD_UPDATE_ACK", requestId, {});
    }

} // namespace UI
} // namespace Omega
