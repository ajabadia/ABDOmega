#include "RpcModulationController.h"
#include <set>
#include "../Core/Providers/SemanticBrokerService.h"

namespace Omega {
namespace UI {

    void RpcModulationController::registerCommands(RpcCommandDispatcher& dispatcher) {
        dispatcher.registerHandler("getModulationMetadata", [this](const juce::var& rid, const juce::var& p) { return handleGetModulationMetadata(rid, p); });
        dispatcher.registerHandler("updatePatchbayMatrixSlot", [this](const juce::var& rid, const juce::var& p) { return handleUpdatePatchbayMatrixSlot(rid, p); });
    }

    juce::var RpcModulationController::handleGetModulationMetadata(const juce::var& requestId, const juce::var& payload) {
        juce::DynamicObject::Ptr resp = new juce::DynamicObject();
        
        auto& broker = Core::Service::SemanticBrokerService::getInstance();
        auto inventory = broker.getInventory();

        // Always rebuild to ensure total synchronization with the rack (Era 4 strict isolation)
        broker.rebuildInventory(mPreset);
        inventory = broker.getInventory();

        juce::Logger::writeToLog("[RpcModulationController] Serving modulation metadata. Inventory size: " + juce::String((int)inventory.size()));

        juce::Array<juce::var> sources;
        juce::Array<juce::var> targets;
        juce::Array<juce::var> inventoryArr;

        auto typeToStr = [](Core::Modulation::ModPortType t) -> juce::String {
            switch(t) {
                case Core::Modulation::ModPortType::Audio: return "AUDIO";
                case Core::Modulation::ModPortType::CV:    return "CV";
                case Core::Modulation::ModPortType::Gate:  return "GATE";
                case Core::Modulation::ModPortType::MIDI:  return "MIDI";
                default: return "CV";
            }
        };

        for (const auto& manifest : inventory) {
            juce::DynamicObject::Ptr mObj = new juce::DynamicObject();
            mObj->setProperty("instanceId", juce::var(juce::String(manifest.instanceId)));
            mObj->setProperty("category", juce::var(juce::String(manifest.category)));
            mObj->setProperty("status", juce::var(juce::String(manifest.status)));
            
            juce::Array<juce::var> portsArr;
            for (const auto& port : manifest.ports) {
                juce::DynamicObject::Ptr portObj = new juce::DynamicObject();
                portObj->setProperty("id", juce::var(juce::String(manifest.instanceId + "." + port.id)));
                portObj->setProperty("name", juce::var(juce::String(manifest.instanceId + " " + port.label)));
                portObj->setProperty("type", typeToStr(port.type));
                portObj->setProperty("instance", juce::var(juce::String(manifest.instanceId)));
                portObj->setProperty("category", juce::var(juce::String(manifest.category)));
                portObj->setProperty("telemetryIndex", port.telemetryIndex);
                portObj->setProperty("label", juce::var(juce::String(port.label)));
                portObj->setProperty("isInput", (bool)port.isInput);

                // Nested structure for Patch Modal
                juce::DynamicObject::Ptr nestPort = new juce::DynamicObject();
                nestPort->setProperty("id", juce::var(juce::String(port.id)));
                nestPort->setProperty("label", juce::var(juce::String(port.label)));
                nestPort->setProperty("type", typeToStr(port.type));
                nestPort->setProperty("isInput", (bool)port.isInput);
                nestPort->setProperty("defaultValue", port.defaultValue);
                
                if (!port.options.empty()) {
                    juce::Array<juce::var> optArr;
                    for (const auto& opt : port.options) {
                        juce::DynamicObject::Ptr oObj = new juce::DynamicObject();
                        oObj->setProperty("value", opt.value);
                        oObj->setProperty("label", juce::String(opt.label));
                        optArr.add(juce::var(oObj.get()));
                    }
                    nestPort->setProperty("options", optArr);
                }
                portsArr.add(juce::var(nestPort.get()));

                if (manifest.status == "active") {
                    if (port.isInput) targets.add(juce::var(portObj.get()));
                    else sources.add(juce::var(portObj.get()));
                }
            }
            mObj->setProperty("ports", portsArr);
            inventoryArr.add(juce::var(mObj.get()));
        }

        resp->setProperty("sources", sources);
        resp->setProperty("targets", targets);
        resp->setProperty("inventory", inventoryArr);

        return createResponse("MOD_METADATA_ACK", requestId, juce::var(), juce::var(resp.get()));
    }

    juce::var RpcModulationController::handleUpdatePatchbayMatrixSlot(const juce::var& requestId, const juce::var& payload) {
        int slotIdx = (int)payload["slot"];
        juce::String key = payload["key"].toString();
        juce::var value = payload["value"];

        if (slotIdx < 0 || slotIdx >= 64) return createError("PATCHBAY_UPDATE_ERR", requestId, "Invalid slot index");

        auto slot = mPreset.getPatchbaySlot(slotIdx);
        
        if (key == "source") slot.source = value.toString().toStdString();
        else if (key == "target") slot.target = value.toString().toStdString();
        else if (key == "amount") slot.amount = (float)value;
        else if (key == "via") slot.via = value.toString().toStdString();
        else if (key == "viaAmount") slot.viaAmount = (float)value;
        else if (key == "active") slot.active = (bool)value;
        
        if (key == "source" || key == "target") {
            slot.active = !slot.source.empty() && !slot.target.empty();
        }

        mPreset.setPatchbaySlot(slotIdx, slot);

        return createResponse("PATCHBAY_UPDATE_ACK", requestId, juce::var());
    }

} // namespace UI
} // namespace Omega
