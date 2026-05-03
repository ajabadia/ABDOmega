#include "RpcParameterController.h"
#include "../Plugin/OmegaAudioProcessor.h"

namespace Omega {
namespace UI {

    RpcParameterController::RpcParameterController(Plugin::OmegaAudioProcessor* processor, juce::AudioProcessorValueTreeState& apvts, Core::Preset::OmegaPreset& preset)
        : mProcessor(processor), mApvts(apvts), mPreset(preset)
    {
    }

    void RpcParameterController::setupParameterCommands(RpcCommandDispatcher& dispatcher) {
        dispatcher.registerHandler("setParameter", [this](const juce::var& r, const juce::var& p) { 
            return this->handleSetParameter(r, p); 
        });
        
        dispatcher.registerHandler("getState", [this](const juce::var& r, const juce::var& p) { 
            return this->handleGetState(r, p); 
        });
    }

    juce::var RpcParameterController::handleSetParameter(const juce::var& requestId, const juce::var& payload)
    {
        float value = (float)payload["value"];

        if (mProcessor) {
            auto& configStore = mProcessor->getEngineConfigManager();

            // Era 7: Typed Numeric IDs
            if (payload.hasProperty("instanceId") && payload.hasProperty("paramId")) {
                uint32_t instanceId = static_cast<uint32_t>((int)payload["instanceId"]);
                uint16_t paramId = static_cast<uint16_t>((int)payload["paramId"]);
                
                configStore.updateParameter(instanceId, static_cast<Core::Model::ParamId>(paramId), value);
            }
            // Legacy / Global: String IDs
            else {
                juce::String target = payload["target"].toString();
                
                // 1. Static APVTS Path (Host-visible parameters)
                if (auto* param = mApvts.getParameter(target)) {
                    param->setValueNotifyingHost(value);
                }

                // 2. Global Bridge Fallback
                if (target == "master_gain") {
                    configStore.updateParameter(0, Core::Model::ParamId::Frequency, value); // Map to Global Slot 0
                }
            }
        }

        // Acknowledge the change
        juce::DynamicObject::Ptr resp = new juce::DynamicObject();
        resp->setProperty("type", "PARAM_ACK");
        resp->setProperty("requestId", requestId);
        resp->setProperty("payload", payload);
        return juce::var(resp.get());
    }

    juce::var RpcParameterController::handleGetState(const juce::var& requestId, const juce::var& payload)
    {
        juce::DynamicObject::Ptr stateObj = new juce::DynamicObject();
        stateObj->setProperty("schemaVersion", "7.0"); // Era 7
        
        if (mProcessor) {
            const auto& doc = mProcessor->getEngineConfigManager().getPatchDocument();
            
            juce::DynamicObject::Ptr docObj = new juce::DynamicObject();
            docObj->setProperty("name", juce::String(doc.metadata.name));
            docObj->setProperty("author", juce::String(doc.metadata.author));
            docObj->setProperty("masterGainDb", doc.masterGainDb);
            
            juce::Array<juce::var> modules;
            for (const auto& m : doc.modules) {
                juce::DynamicObject::Ptr mObj = new juce::DynamicObject();
                mObj->setProperty("instanceId", (int)m.instanceId);
                mObj->setProperty("typeId", (int)m.typeId);
                
                // [Era 7] Resolve string componentId for UI compatibility
                mObj->setProperty("componentId", juce::String(Core::Model::mapTypeToId(m.typeId)));
                
                juce::DynamicObject::Ptr params = new juce::DynamicObject();
                for (const auto& p : m.parameters) {
                    params->setProperty(juce::String((int)p.id), p.value);
                }
                mObj->setProperty("params", juce::var(params.get()));
                modules.add(juce::var(mObj.get()));
            }
            docObj->setProperty("modules", modules);
            
            stateObj->setProperty("patch", juce::var(docObj.get()));
        }

        juce::DynamicObject::Ptr resp = new juce::DynamicObject();
        resp->setProperty("type", "state");
        resp->setProperty("requestId", requestId);
        resp->setProperty("payload", juce::var(stateObj.get()));
        return juce::var(resp.get());
    }

} // namespace UI
} // namespace Omega
