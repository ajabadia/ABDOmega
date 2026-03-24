#include "OmegaUiBridge.h"
#include "../Core/Preset/OmegaPreset.h"
#include "../Core/Ace/AceCatalog.h"
#include "../Core/Preset/JunoFactory.h"
#include <juce_gui_basics/juce_gui_basics.h>

namespace Omega {
namespace UI {

    OmegaUiBridge::OmegaUiBridge(Core::Preset::OmegaPreset& preset, 
                                 Core::Ace::AceCatalog& catalog,
                                 juce::AudioProcessorValueTreeState& apvts)
        : mPreset(preset), mCatalog(catalog), mApvts(apvts)
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
            return "{\"type\": \"error\", \"payload\": {\"message\": \"Invalid JSON or Object expected\"}}";

        juce::String type = json["type"].toString().trim();
        auto requestId = json["requestId"];
        auto payload = json["payload"];

        juce::var resultPayload;
        juce::var error;

        if (type.equalsIgnoreCase("getState"))
            resultPayload = handleGetState(requestId, payload);
        else if (type.equalsIgnoreCase("setParam"))
            resultPayload = handleSetParam(requestId, payload);
        else if (type.equalsIgnoreCase("listAceComponents"))
            resultPayload = handleListAceComponents(requestId, payload);
        else if (type.equalsIgnoreCase("loadPreset"))
            resultPayload = handleLoadPreset(requestId, payload);
        else if (type.equalsIgnoreCase("savePreset"))
            resultPayload = handleSavePreset(requestId, payload);
        else if (type.equalsIgnoreCase("uiReady"))
            resultPayload = handleUiReady(requestId, payload);
        else if (type.equalsIgnoreCase("exit"))
        {
            juce::MessageManager::callAsync ([] {
                DBG("[BRIDGE] EXIT command received on MessageThread");
                if (auto* app = juce::JUCEApplication::getInstance())
                    app->systemRequestedQuit();
                else
                    juce::MessageManager::getInstance()->stopDispatchLoop();
            });
            resultPayload = "OK";
        }
        else
            error = "Unknown type: [" + type + "] (len=" + juce::String(type.length()) + ")";

        if (error.toString().isNotEmpty())
            return createResponse("error", requestId, error, {});
        
        // Debug
        // if (resultPayload.isUndefined()) error = "Result payload is undefined after matching";

        return createResponse("state", requestId, {}, resultPayload);
    }

    juce::var OmegaUiBridge::handleMessageFromUiAsVar(const juce::String& jsonMessage)
    {
        auto json = juce::JSON::parse(jsonMessage);
        
        if (json.isUndefined() || !json.isObject())
        {
            juce::DynamicObject::Ptr err = new juce::DynamicObject();
            err->setProperty("message", "Invalid JSON or Object expected");
            return juce::var(err.get());
        }

        juce::String type = json["type"].toString().trim();
        auto requestId = json["requestId"];
        auto payload = json["payload"];

        DBG("[BRIDGE] Received Request: " << type << " (ID: " << requestId.toString() << ")");

        if (type.equalsIgnoreCase("getState"))
            return handleGetState(requestId, payload);
        if (type.equalsIgnoreCase("setParam"))
            return handleSetParam(requestId, payload);
        if (type.equalsIgnoreCase("listAceComponents"))
            return handleListAceComponents(requestId, payload);
        if (type.equalsIgnoreCase("loadPreset"))
            return handleLoadPreset(requestId, payload);
        if (type.equalsIgnoreCase("savePreset"))
            return handleSavePreset(requestId, payload);
        if (type.equalsIgnoreCase("uiReady"))
            return handleUiReady(requestId, payload);
        if (type.equalsIgnoreCase("exit"))
        {
            juce::MessageManager::callAsync ([] {
                DBG("[BRIDGE] EXIT command received on MessageThread");
                if (auto* app = juce::JUCEApplication::getInstance())
                    app->systemRequestedQuit();
                else
                    juce::MessageManager::getInstance()->stopDispatchLoop();
            });
            return juce::var("OK");
        }

        juce::DynamicObject::Ptr err = new juce::DynamicObject();
        err->setProperty("message", "Unknown type: " + type);
        return juce::var(err.get());
    }

    void OmegaUiBridge::setUiMessageCallback(MessageCallback callback)
    {
        mUiCallback = callback;
    }

    void OmegaUiBridge::setOnLoadCallback(std::function<void(const Core::Preset::OmegaPreset&)> callback)
    {
        mOnLoadPreset = callback;
    }

    void OmegaUiBridge::parameterChanged(const juce::String& parameterID, float newValue)
    {
        if (mUiCallback)
        {
            // [ThreadSafety]: Emitir el mensaje de forma asíncrona en el Message Thread
            // ya que WebBrowserComponent::emitMessage no es thread-safe (y se espera que se llame en el UI thread).
            juce::MessageManager::callAsync([this, parameterID, newValue]() {
                juce::DynamicObject::Ptr notification = new juce::DynamicObject();
                notification->setProperty("type", "paramChanged");
                
                juce::DynamicObject::Ptr payload = new juce::DynamicObject();
                payload->setProperty("paramId", parameterID);
                payload->setProperty("value", newValue);
                
                notification->setProperty("payload", juce::var(payload.get()));
                
                if (mUiCallback)
                    mUiCallback(juce::JSON::toString(juce::var(notification.get()), true));
            });
        }
    }

    juce::var OmegaUiBridge::handleGetState(const juce::var&, const juce::var&)
    {
        juce::DynamicObject::Ptr root = new juce::DynamicObject();
        
        // 1. Preset Snapshot
        juce::DynamicObject::Ptr presetObj = new juce::DynamicObject();
        presetObj->setProperty("id", juce::String(mPreset.id));
        presetObj->setProperty("name", juce::String(mPreset.name));
        presetObj->setProperty("engine", juce::String(mPreset.engine));
        
        // 2. Macro Params Snapshot
        juce::DynamicObject::Ptr params = new juce::DynamicObject();
        for (auto* param : mApvts.processor.getParameters())
        {
            auto* pWithId = dynamic_cast<juce::AudioProcessorParameterWithID*>(param);
            auto* pRanged = dynamic_cast<juce::RangedAudioParameter*>(param);
            
            if (pWithId != nullptr && pRanged != nullptr)
            {
                params->setProperty(pWithId->getParameterID(), pRanged->getNormalisableRange().convertFrom0to1(pRanged->getValue()));
            }
        }
        
        root->setProperty("preset", juce::var(presetObj.get()));
        root->setProperty("params", juce::var(params.get()));
        
        return juce::var(root.get());
    }

    juce::var OmegaUiBridge::handleSetParam(const juce::var&, const juce::var& payload)
    {
        juce::String paramId = payload["paramId"].toString();
        float value = static_cast<float>(payload["value"]);

        if (juce::RangedAudioParameter* param = mApvts.getParameter(paramId))
        {
            param->setValueNotifyingHost(param->getNormalisableRange().convertTo0to1(value));
            return juce::var("OK");
        }

        return juce::var("PARAM_NOT_FOUND");
    }

    juce::var OmegaUiBridge::handleListAceComponents(const juce::var&, const juce::var& payload)
    {
        std::string family = payload["family"].toString().toStdString();
        std::string engine = payload["engine"].toString().toStdString();

        auto components = mCatalog.listByFamilyAndEngine(family, engine);
        juce::Array<juce::var> list;

        for (const auto* info : components)
        {
            juce::DynamicObject::Ptr item = new juce::DynamicObject();
            item->setProperty("id", juce::String(info->id));
            item->setProperty("name", juce::String(info->name));
            item->setProperty("origin", juce::String(info->origin));
            list.add(juce::var(item.get()));
        }

        return list;
    }

    juce::var OmegaUiBridge::handleLoadPreset(const juce::var&, const juce::var& payload)
    {
        juce::String presetId = payload["presetId"].toString();
        
        // MVP: Resolver el preset desde la factoría. 
        // En el futuro esto consultará un PresetManager real.
        Omega::Core::Preset::OmegaPreset newPreset;
        
        if (presetId == "ACE-JUNO-BASIC-PAD")
            newPreset = Omega::Core::Preset::JunoFactory::createJunoBasicPad();
        else if (presetId == "ACE-JUNO-BASIC-BRASS")
            newPreset = Omega::Core::Preset::JunoFactory::createJunoBrassA11();
        else if (presetId == "ACE-HYBRID-JUNO-MS20")
            newPreset = Omega::Core::Preset::JunoFactory::createJunoMs20Hybrid();
        else
            return juce::var("PRESET_NOT_FOUND: " + presetId);

        if (mOnLoadPreset)
            mOnLoadPreset(newPreset);

        return juce::var("OK");
    }

    juce::var OmegaUiBridge::handleSavePreset(const juce::var&, const juce::var& payload)
    {
        juce::String name = payload["name"].toString();
        
        // [Innovation]: Serializar el estado actual.
        // Por ahora devolvemos el objeto serializado para que la UI lo confirme.
        juce::DynamicObject::Ptr result = new juce::DynamicObject();
        result->setProperty("status", "SUCCESS_STUB");
        result->setProperty("name", name);
        result->setProperty("presetId", juce::String(mPreset.id));
        
        return juce::var(result.get());
    }
    juce::var OmegaUiBridge::handleUiReady(const juce::var& requestId, const juce::var& payload)
    {
        // El frontend dice que está listo. Hacemos un "dump" del estado actual.
        // Reutilizamos handleGetState para obtener el objeto de estado completo.
        auto state = handleGetState(requestId, payload);
        
        // Lo enviamos como una notificación "initialState" si queremos, 
        // o simplemente devolvemos el estado como respuesta al comando uiReady.
        // La especificación JSON-RPC v1 dice que devolvemos el resultado.
        return state;
    }

    juce::String OmegaUiBridge::createResponse(const juce::var& type, const juce::var& requestId, const juce::var& error, const juce::var& payload)
    {
        juce::DynamicObject::Ptr response = new juce::DynamicObject();
        response->setProperty("type", type);
        response->setProperty("requestId", requestId);
        
        if (!error.isUndefined() && !error.toString().isEmpty())
        {
            juce::DynamicObject::Ptr errObj = new juce::DynamicObject();
            errObj->setProperty("message", error);
            response->setProperty("payload", juce::var(errObj.get()));
        }
        else
        {
            response->setProperty("payload", payload);
        }

        return juce::JSON::toString(juce::var(response.get()), true);
    }

} // namespace UI
} // namespace Omega
