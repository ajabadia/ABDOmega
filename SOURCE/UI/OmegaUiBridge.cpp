#include "OmegaUiBridge.h"
#include "../Plugin/OmegaAudioProcessor.h"
#include <juce_core/juce_core.h>
#include "../Core/Preset/OmegaPreset.h"
#include "../Core/Preset/PresetRepository.h"
#include "../Core/Ace/AceCatalog.h"
#include "../Core/Preset/JunoFactory.h"
#include "../Core/ParameterMetadata.h"
#include "../Core/Modulation/ModulationTelemetryHub.h"
#include <juce_gui_basics/juce_gui_basics.h>
#include <fstream>
#include <chrono>

static void logToFile(const std::string& msg) {
    // Usar una ruta más universal y segura
    std::ofstream f("C:/temp/OMEGA_RPC_LOG.txt", std::ios::app);
    if (!f.is_open()) {
        // Fallback al directorio actual si C:/temp no existe
        f.open("OMEGA_RPC_LOG.txt", std::ios::app);
    }
    
    if (f.is_open()) {
        auto now = std::chrono::system_clock::to_time_t(std::chrono::system_clock::now());
        struct tm timeinfo;
        localtime_s(&timeinfo, &now);
        char buffer[80];
        strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", &timeinfo);
        f << "[" << buffer << "] " << msg << std::endl;
    }
}

namespace Omega {
namespace UI {

    OmegaUiBridge::OmegaUiBridge(Plugin::OmegaAudioProcessor& processor,
                                 Core::Preset::OmegaPreset& preset, 
                                 Core::Ace::AceCatalog& catalog,
                                 Core::Preset::PresetRepository& repository,
                                 juce::AudioProcessorValueTreeState& apvts)
        : mPreset(preset), mCatalog(catalog), mRepository(repository), mApvts(apvts), mProcessor(processor)
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
        logToFile("UI -> C++: " + jsonMessage.toStdString());
        auto json = juce::JSON::parse(jsonMessage);
        
        if (json.isUndefined() || !json.isObject())
        {
            logToFile("C++ ERROR: Invalid JSON");
            juce::DynamicObject::Ptr err = new juce::DynamicObject();
            err->setProperty("message", "Invalid JSON or Object expected");
            return juce::var(err.get());
        }

        juce::String type = json["type"].toString().trim();
        auto requestId = json["requestId"];
        auto payload = json["payload"];

        juce::var result;
        if (type.equalsIgnoreCase("getState"))
            result = handleGetState(requestId, payload);
        else if (type.equalsIgnoreCase("setParam"))
            result = handleSetParam(requestId, payload);
        else if (type.equalsIgnoreCase("listAceComponents"))
            result = handleListAceComponents(requestId, payload);
        else if (type.equalsIgnoreCase("loadPreset"))
            result = handleLoadPreset(requestId, payload);
        else if (type.equalsIgnoreCase("savePreset"))
            result = handleSavePreset(requestId, payload);
        else if (type.equalsIgnoreCase("uiReady"))
            result = handleUiReady(requestId, payload);
        else if (type.equalsIgnoreCase("listPresets"))
            result = handleListPresets(requestId, payload);
        else if (type.equalsIgnoreCase("getHistory"))
            result = handleGetHistory(requestId, payload);
        else if (type.equalsIgnoreCase("saveSnapshot"))
            result = handleSaveSnapshot(requestId, payload);
        else if (type.equalsIgnoreCase("checkout"))
            result = handleCheckout(requestId, payload);
        else if (type.equalsIgnoreCase("createBranch"))
            result = handleCreateBranch(requestId, payload);
        else if (type.equalsIgnoreCase("getMetadata"))
            result = handleGetMetadata(requestId, payload);
        else if (type.equalsIgnoreCase("getTelemetry"))
            result = handleGetTelemetry(requestId, payload);
        else if (type.equalsIgnoreCase("triggerNote"))
            result = handleTriggerNote(requestId, payload);
        else if (type.equalsIgnoreCase("exit"))
        {
            juce::MessageManager::callAsync ([] {
                if (auto* app = juce::JUCEApplication::getInstance())
                    app->systemRequestedQuit();
                else
                    juce::MessageManager::getInstance()->stopDispatchLoop();
            });
            result = juce::var("OK");
        }
        else
            result = juce::var("UNKNOWN_TYPE: " + type);

        juce::DynamicObject::Ptr response = new juce::DynamicObject();
        response->setProperty("type", type);
        response->setProperty("requestId", requestId);
        response->setProperty("payload", result);
        
        juce::var finalVar(response.get());
        logToFile("C++ -> UI: " + juce::JSON::toString(finalVar, false).toStdString());
        return finalVar;
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
        return handleGetState(requestId, payload);
    }

    juce::var OmegaUiBridge::handleListPresets(const juce::var&, const juce::var&)
    {
        auto presets = mRepository.listPresets();
        
        // --- EMERGENCY TEST: Add a virtual preset if empty ---
        if (presets.empty()) {
            DBG("[BRIDGE] REPO EMPTY! Adding VIRTUAL Preset for testing...");
            presets.push_back("VIRTUAL_TEST_PRESET.yaml");
        }

        juce::Array<juce::var> list;
        for (const auto& p : presets)
            list.add(juce::var(juce::String(p)));
        
        return list;
    }

    juce::var OmegaUiBridge::handleGetHistory(const juce::var&, const juce::var& payload)
    {
        juce::String presetId = payload["presetId"].toString();
        auto history = mRepository.getHistory(presetId.toStdString());
        
        juce::DynamicObject::Ptr root = new juce::DynamicObject();
        root->setProperty("presetId", juce::String(history.presetId));
        root->setProperty("currentBranch", juce::String(history.currentBranch));
        
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
            s->setProperty("parent", juce::String(v.parentHash));
            s->setProperty("author", juce::String(v.author));
            s->setProperty("message", juce::String(v.message));
            s->setProperty("timestamp", (juce::int64)v.timestamp);
            snapshots.add(juce::var(s.get()));
        }
        root->setProperty("snapshots", snapshots);

        return juce::var(root.get());
    }

    juce::var OmegaUiBridge::handleSaveSnapshot(const juce::var&, const juce::var& payload)
    {
        juce::String author = payload["author"].toString();
        juce::String message = payload["message"].toString();
        
        std::string hash = mRepository.saveSnapshot(mPreset, author.toStdString(), message.toStdString());
        return juce::var(juce::String(hash));
    }

    juce::var OmegaUiBridge::handleCheckout(const juce::var&, const juce::var& payload)
    {
        juce::String presetId = payload["presetId"].toString();
        juce::String hash = payload["hash"].toString();
        
        Core::Preset::OmegaPreset loadedPreset;
        if (mRepository.checkout(presetId.toStdString(), hash.toStdString(), loadedPreset))
        {
            if (mOnLoadPreset)
                mOnLoadPreset(loadedPreset);
            return juce::var("OK");
        }
        return juce::var("ERROR_CHECKOUT_FAILED");
    }

    juce::var OmegaUiBridge::handleCreateBranch(const juce::var&, const juce::var& payload)
    {
        juce::String presetId = payload["presetId"].toString();
        juce::String branchName = payload["branchName"].toString();
        juce::String fromHash = payload["fromHash"].toString();
        
        if (mRepository.createBranch(presetId.toStdString(), branchName.toStdString(), fromHash.toStdString()))
            return juce::var("OK");
            
        return juce::var("ERROR_CREATE_BRANCH_FAILED");
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

    juce::var OmegaUiBridge::handleGetMetadata(const juce::var& requestId, const juce::var&)
    {
        juce::DynamicObject::Ptr paramsMap = new juce::DynamicObject();
        
        auto& registry = Omega::Core::ParameterMetadataRegistry::getInstance();
        // Initialize if empty (this should probably be done in the Processor, but for MVP we do it here)
        if (registry.getAllParameters().empty()) {
            registry.initializeDefaults();
        }

        for (auto const& [id, desc] : registry.getAllParameters()) {
            juce::DynamicObject::Ptr d = new juce::DynamicObject();
            d->setProperty("id", juce::String(id));
            d->setProperty("name", juce::String(desc.name));
            d->setProperty("min", desc.minValue);
            d->setProperty("max", desc.maxValue);
            d->setProperty("default", desc.defaultValue);
            d->setProperty("unit", juce::String(desc.unit));
            d->setProperty("skew", desc.skew);
            d->setProperty("group", juce::String(desc.groupId));
            paramsMap->setProperty(juce::String(id), juce::var(d.get()));
        }
        
        return juce::var(paramsMap.get());
    }

    juce::var OmegaUiBridge::handleGetTelemetry(const juce::var& requestId, const juce::var& payload)
    {
        auto& hub = Core::Modulation::ModulationTelemetryHub::getInstance();
        juce::DynamicObject::Ptr result = new juce::DynamicObject();
        
        auto requestedIndices = payload["indices"];
        
        if (requestedIndices.isArray()) {
            for (int i = 0; i < requestedIndices.size(); ++i) {
                int idx = (int)requestedIndices[i];
                if (idx >= 0 && idx < 64) {
                    juce::DynamicObject::Ptr data = new juce::DynamicObject();
                    data->setProperty("latest", hub.getLatest(idx));
                    
                    juce::Array<juce::var> historyArray;
                    float history[128];
                    hub.getHistory(idx, history);
                    for (int j = 0; j < 128; ++j) historyArray.add(history[j]);
                    
                    data->setProperty("history", historyArray);
                    result->setProperty(juce::String(idx), juce::var(data.get()));
                }
            }
        } else {
            for (int idx : {10}) {
                 juce::DynamicObject::Ptr data = new juce::DynamicObject();
                 data->setProperty("latest", hub.getLatest(idx));
                 result->setProperty(juce::String(idx), juce::var(data.get()));
            }
        }

        return juce::var(result.get());
    }

    juce::var OmegaUiBridge::handleTriggerNote(const juce::var&, const juce::var& payload)
    {
        int note = (int)payload["note"];
        int velocity = (int)payload["velocity"];
        bool isOn = (bool)payload["on"];
        
        mProcessor.triggerNote(note, velocity, isOn);
        return juce::var("OK");
    }

} // namespace UI
} // namespace Omega
