#include "RpcModulationController.h"
#include <set>
#include "../Core/Service/SemanticBrokerService.h"

namespace Omega {
namespace UI {

    juce::var RpcModulationController::handleGetModulationMetadata(const juce::var& requestId, const juce::var& payload) {
        juce::DynamicObject::Ptr resp = new juce::DynamicObject();
        
        auto& broker = Core::Service::SemanticBrokerService::getInstance();
        auto inventory = broker.getInventory();

        // Lazy initialization: Rebuild if empty
        if (inventory.empty()) {
            broker.rebuildInventory(mPreset);
            inventory = broker.getInventory();
        }

        juce::Logger::writeToLog("[RpcModulationController] Serving modulation metadata. Inventory size: " + juce::String((int)inventory.size()));

        juce::Array<juce::var> sources;
        juce::Array<juce::var> targets;

        for (const auto& manifest : inventory) {
            for (const auto& port : manifest.ports) {
                juce::DynamicObject::Ptr obj = new juce::DynamicObject();
                // Format: InstanceID.PortID (e.g., "LFO-1.out")
                obj->setProperty("id", juce::String(manifest.instanceId + "." + port.id));
                obj->setProperty("name", juce::String(manifest.instanceId + " " + port.label));
                obj->setProperty("type", (int)port.type);
                obj->setProperty("instance", juce::String(manifest.instanceId));
                obj->setProperty("category", juce::String(manifest.category));
                obj->setProperty("telemetryIndex", port.telemetryIndex);

                if (port.isInput) {
                    targets.add(juce::var(obj.get()));
                } else {
                    sources.add(juce::var(obj.get()));
                }
            }
        }

        resp->setProperty("sources", sources);
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
