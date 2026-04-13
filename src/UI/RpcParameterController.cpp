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
        juce::String paramId = payload["target"].toString();
        float value = (float)payload["value"];

        if (auto* param = mApvts.getParameter(paramId)) 
        {
            param->setValueNotifyingHost(value);
            
            juce::DynamicObject::Ptr resp = new juce::DynamicObject();
            resp->setProperty("type", "PARAM_ACK");
            resp->setProperty("requestId", requestId);
            resp->setProperty("payload", payload);
            return juce::var(resp.get());
        }

        juce::DynamicObject::Ptr err = new juce::DynamicObject();
        err->setProperty("type", "error");
        err->setProperty("requestId", requestId);
        err->setProperty("error", "Parameter not found: " + paramId);
        return juce::var(err.get());
    }

    juce::var RpcParameterController::handleGetState(const juce::var& requestId, const juce::var& payload)
    {
        juce::DynamicObject::Ptr stateObj = new juce::DynamicObject();
        stateObj->setProperty("schemaVersion", "1.0");
        
        // 1. Preset Meta
        juce::DynamicObject::Ptr presetMeta = new juce::DynamicObject();
        presetMeta->setProperty("id", mPreset.getUuid());
        presetMeta->setProperty("name", mPreset.getName());
        presetMeta->setProperty("author", mPreset.getAuthor());
        stateObj->setProperty("preset", juce::var(presetMeta.get()));

        // 2. Parameters (Era 6 'params' key)
        juce::DynamicObject::Ptr paramsObj = new juce::DynamicObject();
        for (int i = 0; i < mApvts.state.getNumChildren(); ++i)
        {
            auto child = mApvts.state.getChild(i);
            juce::String pId = child.getProperty("id").toString();
            if (pId.isNotEmpty())
                paramsObj->setProperty(pId, child.getProperty("value"));
        }
        stateObj->setProperty("params", juce::var(paramsObj.get()));

        juce::DynamicObject::Ptr resp = new juce::DynamicObject();
        resp->setProperty("type", "state");
        resp->setProperty("requestId", requestId);
        resp->setProperty("payload", juce::var(stateObj.get()));
        return juce::var(resp.get());
    }

} // namespace UI
} // namespace Omega
