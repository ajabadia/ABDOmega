#include "RpcModulationController.h"
#include <set>
#include "../Core/Providers/SemanticBrokerService.h"
#include "../Core/Providers/EngineConfigManager.h"
#include "../Core/Model/PatchDocument.h"

namespace Omega {
namespace UI {

    void RpcModulationController::registerCommands(RpcCommandDispatcher& dispatcher) {
        dispatcher.registerHandler("getModulationMetadata", [this](const juce::var& rid, const juce::var& p) { return handleGetModulationMetadata(rid, p); });
        dispatcher.registerHandler("updatePatchbayMatrixSlot", [this](const juce::var& rid, const juce::var& p) { return handleUpdatePatchbayMatrixSlot(rid, p); });
    }

    juce::var RpcModulationController::handleGetModulationMetadata(const juce::var& requestId, const juce::var& payload) {
        juce::DynamicObject::Ptr resp = new juce::DynamicObject();
        
        auto& broker = Core::Service::SemanticBrokerService::getInstance();
        
        // [Era 7] Inventory is now managed globally by the Aseptic Registry based on PatchDocument.
        broker.rebuildInventory(mEngineConfig.getPatchDocument()); 
        
        auto inventory = broker.getInventory();

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

                juce::DynamicObject::Ptr nestPort = new juce::DynamicObject();
                nestPort->setProperty("id", juce::var(juce::String(port.id)));
                nestPort->setProperty("label", juce::var(juce::String(port.label)));
                nestPort->setProperty("type", typeToStr(port.type));
                nestPort->setProperty("isInput", (bool)port.isInput);
                nestPort->setProperty("defaultValue", port.defaultValue);
                
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

        auto doc = mEngineConfig.getPatchDocument();
        // [Era 7] Update PatchDocument.patchbayMatrix directly
        // This is a stub until PatchbayMatrix is fully normalized in the model.
        
        return createResponse("PATCHBAY_UPDATE_ACK", requestId, juce::var());
    }

} // namespace UI
} // namespace Omega
