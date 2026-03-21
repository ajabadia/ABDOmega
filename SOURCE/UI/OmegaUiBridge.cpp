#include "OmegaUiBridge.h"

namespace Omega::UI {

    OmegaUiBridge::OmegaUiBridge(juce::AudioProcessorValueTreeState& apvts)
        : mApvts(apvts)
    {
        for (auto& param : mApvts.processor.getParameters())
        {
            if (auto* p = dynamic_cast<juce::AudioProcessorParameterWithID*>(param))
                mApvts.addParameterListener(p->getParameterID(), this);
        }
    }

    OmegaUiBridge::~OmegaUiBridge()
    {
        for (auto& param : mApvts.processor.getParameters())
        {
            if (auto* p = dynamic_cast<juce::AudioProcessorParameterWithID*>(param))
                mApvts.removeParameterListener(p->getParameterID(), this);
        }
    }

    juce::String OmegaUiBridge::handleMessageFromUi(const juce::String& jsonMessage)
    {
        auto json = juce::JSON::parse(jsonMessage);
        
        if (json.isUndefined() || !json.isObject())
            return "{\"error\": \"Invalid JSON or Object expected\"}";

        auto method = json["method"].toString();
        auto params = json["params"];
        auto id = json["id"];

        juce::var result;
        juce::var error;

        if (method == "getState")
            result = handleGetState(params);
        else if (method == "setParam")
            result = handleSetParam(params);
        else if (method == "listAceComponents")
            result = handleListAceComponents(params);
        else
            error = "Unknown method: " + method;

        return createResponse(id, result, error);
    }

    void OmegaUiBridge::setUiMessageCallback(MessageCallback callback)
    {
        mUiCallback = callback;
    }

    void OmegaUiBridge::parameterChanged(const juce::String& parameterID, float newValue)
    {
        if (mUiCallback)
        {
            juce::DynamicObject::Ptr notification = new juce::DynamicObject();
            notification->setProperty("method", "paramChanged");
            
            juce::DynamicObject::Ptr params = new juce::DynamicObject();
            params->setProperty("id", parameterID);
            params->setProperty("value", newValue);
            
            notification->setProperty("params", juce::var(params.get()));
            
            mUiCallback(juce::JSON::toString(juce::var(notification.get())));
        }
    }

    juce::var OmegaUiBridge::handleGetState(const juce::var& /*params*/)
    {
        juce::DynamicObject::Ptr state = new juce::DynamicObject();
        
        for (auto& param : mApvts.processor.getParameters())
        {
            if (auto* p = dynamic_cast<juce::AudioProcessorParameterWithID*>(param))
            {
                state->setProperty(p->getParameterID(), p->getValue());
            }
        }
        
        return juce::var(state.get());
    }

    juce::var OmegaUiBridge::handleSetParam(const juce::var& params)
    {
        juce::String paramId = params["id"].toString();
        float value = static_cast<float>(params["value"]);

        if (juce::RangedAudioParameter* param = mApvts.getParameter(paramId))
        {
            param->setValueNotifyingHost(value);
            return juce::var("OK");
        }

        return juce::var();
    }

    juce::var OmegaUiBridge::handleListAceComponents(const juce::var& params)
    {
        // TODO: Integrar con AceCatalog para devolver la lista real de componentes.
        // Por ahora devolvemos un stub para verificar comunicación.
        juce::Array<juce::var> list;
        list.add("OSC-VA-001");
        list.add("FLT-VA-001");
        list.add("OSC-PM-001");
        return list;
    }

    juce::String OmegaUiBridge::createResponse(const juce::var& id, const juce::var& result, const juce::var& error)
    {
        juce::DynamicObject::Ptr response = new juce::DynamicObject();
        response->setProperty("id", id);
        
        if (error.isUndefined() || error.toString().isEmpty())
        {
            response->setProperty("result", result);
        }
        else
        {
            response->setProperty("error", error);
        }

        return juce::JSON::toString(juce::var(response.get()));
    }

} // namespace Omega::UI
