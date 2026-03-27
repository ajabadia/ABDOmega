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
#include "../Core/Modulation/MidiMonitor.h"
#include <fstream>
#include <chrono>

static void logToFile(const std::string& msg) {
    juce::File logFile = juce::File::getSpecialLocation(juce::File::currentExecutableFile).getSiblingFile("OMEGA_BOOT_LOG.txt");
    logFile.appendText("[" + juce::Time::getCurrentTime().toString(true, true) + "] " + msg + "\n");
}

namespace Omega {
namespace UI {

    OmegaUiBridge::OmegaUiBridge(Plugin::OmegaAudioProcessor* processor,
                                 Core::Preset::OmegaPreset& preset, 
                                 Core::Ace::AceCatalog& catalog,
                                 Core::Preset::PresetRepository* repository,
                                 juce::AudioProcessorValueTreeState& apvts)
        : mPreset(preset), mCatalog(catalog), mRepository(repository), mApvts(apvts), mProcessor(processor)
    {
        logToFile("OmegaUiBridge: Initializing...");
        for (auto& param : mProcessor->getParameters())
        {
            if (auto* p = dynamic_cast<juce::AudioProcessorParameterWithID*>(param))
                mApvts.addParameterListener(p->getParameterID(), this);
        }
        logToFile("OmegaUiBridge: Parameter listeners ENABLED for Build 58");
    }

    OmegaUiBridge::~OmegaUiBridge()
    {
        for (auto& param : mProcessor->getParameters())
        {
            if (auto* p = dynamic_cast<juce::AudioProcessorParameterWithID*>(param))
                mApvts.removeParameterListener(p->getParameterID(), this);
        }
    }

    juce::String OmegaUiBridge::handleMessageFromUi(const juce::String& jsonMessage)
    {
        logToFile("Bridge: Received message: " + jsonMessage.toStdString());
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

    juce::var OmegaUiBridge::handleMessageFromUiAsVar(const juce::String& type, const juce::var& requestId, const juce::var& payload)
    {
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
        else if (type.equalsIgnoreCase("getModConnections"))
            result = handleGetModConnections(requestId, payload);
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
        logToFile("NativeBridge -> UI: " + juce::JSON::toString(finalVar, false).toStdString());
        return finalVar;
    }

    juce::var OmegaUiBridge::handleMessageFromUiAsVar(const juce::String& jsonMessage)
    {
        logToFile("Bridge: Received [" + jsonMessage.toStdString() + "]");
        auto json = juce::JSON::parse(jsonMessage);
        
        if (json.isUndefined() || !json.isObject())
        {
            logToFile("Bridge ERROR: Invalid JSON or not an object");
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
        else if (type.equalsIgnoreCase("getModConnections"))
            result = handleGetModConnections(requestId, payload);
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

    juce::var OmegaUiBridge::handleGetState(const juce::var& requestId, const juce::var&)
    {
        juce::DynamicObject::Ptr root = new juce::DynamicObject();
        
        // 1. Preset Snapshot
        // 2. Macro Params Snapshot
        juce::DynamicObject::Ptr params = new juce::DynamicObject();
        for (auto* param : mProcessor->getParameters())
        {
            auto* pWithId = dynamic_cast<juce::AudioProcessorParameterWithID*>(param);
            auto* pRanged = dynamic_cast<juce::RangedAudioParameter*>(param);
            
            if (pWithId != nullptr && pRanged != nullptr)
            {
                params->setProperty(pWithId->getParameterID(), pRanged->getNormalisableRange().convertFrom0to1(pRanged->getValue()));
            }
        }
        
        root->setProperty("preset", presetToVar(mPreset));
        root->setProperty("params", juce::var(params.get()));

        juce::var stateVar(root.get());
        logToFile("Bridge: getState Response size: " + std::to_string(juce::JSON::toString(stateVar).length()));
        return stateVar;
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
        
        // 1. Intentar cargar desde el repositorio (Git-for-Sounds layer)
        Omega::Core::Preset::OmegaPreset newPreset;
        if (mRepository != nullptr) {
            auto path = mRepository->getPresetPath(presetId.toStdString());
            if (newPreset.loadFromYaml(path.string())) {
                if (mOnLoadPreset) mOnLoadPreset(newPreset);
                return juce::var("OK");
            }
        }

        // 2. Fallback a factoría para presets core
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
        result->setProperty("presetId", mPreset.getUuid());
        
        return juce::var(result.get());
    }
    juce::var OmegaUiBridge::handleUiReady(const juce::var& requestId, const juce::var& payload)
    {
        return handleGetState(requestId, payload);
    }

    juce::var OmegaUiBridge::handleListPresets(const juce::var&, const juce::var&)
    {
        auto presets = mRepository->listPresets();
        
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
        auto history = mRepository->getHistory(presetId.toStdString());
        
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
        
        std::string hash = mRepository->saveSnapshot(mPreset, author.toStdString(), message.toStdString());
        return juce::var(juce::String(hash));
    }

    juce::var OmegaUiBridge::handleCheckout(const juce::var&, const juce::var& payload)
    {
        juce::String presetId = payload["presetId"].toString();
        juce::String hash = payload["hash"].toString();
        
        Core::Preset::OmegaPreset loadedPreset;
        if (mRepository->checkout(presetId.toStdString(), hash.toStdString(), loadedPreset))
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
        
        if (mRepository->createBranch(presetId.toStdString(), branchName.toStdString(), fromHash.toStdString()))
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
            d->setProperty("telemetryIndex", desc.telemetryIndex);
            paramsMap->setProperty(juce::String(id), juce::var(d.get()));
        }
        
        return juce::var(paramsMap.get());
    }

    juce::var OmegaUiBridge::handleGetTelemetry(const juce::var& requestId, const juce::var& payload)
    {
        auto& hub = Core::Modulation::ModulationTelemetryHub::getInstance();
        juce::DynamicObject::Ptr result = new juce::DynamicObject();
        
        auto requestedIndices = payload["indices"];
        if (requestedIndices.isUndefined()) requestedIndices = payload["INDICES"];
        
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
        
        // --- Add MIDI Events ---
        auto midiEvents = Core::Modulation::MidiMonitor::getInstance().getRecentEvents(16);
        juce::Array<juce::var> midiArray;
        for (const auto& e : midiEvents) {
            juce::DynamicObject::Ptr ev = new juce::DynamicObject();
            ev->setProperty("type", (int)e.type);
            ev->setProperty("ch", (int)e.channel);
            ev->setProperty("d1", (int)e.data1);
            ev->setProperty("d2", (int)e.data2);
            ev->setProperty("ts", e.timestamp);
            midiArray.add(juce::var(ev.get()));
        }
        result->setProperty("midi", midiArray);

        return juce::var(result.get());
    }

    juce::var OmegaUiBridge::handleGetModConnections(const juce::var&, const juce::var&)
    {
        juce::DynamicObject::Ptr result = new juce::DynamicObject();
        
        // Mapeo básico para el visualizador (esto se volverá dinámico con el ModulationGraph)
        // Por ahora hardcoding de los mappings estándar de OMEGA para el MVP
        juce::Array<juce::var> mappings;
        
        auto addMap = [&](int targetIndex, int sourceIndex, float weight, const char* label) {
            juce::DynamicObject::Ptr m = new juce::DynamicObject();
            m->setProperty("target", targetIndex);
            m->setProperty("source", sourceIndex);
            m->setProperty("weight", weight);
            m->setProperty("label", juce::String(label));
            mappings.add(juce::var(m.get()));
        };

        // LFO 1 -> Cutoff (Standard mapping)
        addMap(8, 10, 0.4f, "VCF LFO");
        // ENV 1 -> Cutoff
        addMap(8, 20, 0.6f, "VCF ENV");
        // LFO 1 -> DCO Pitch
        addMap(0, 10, 0.1f, "Vibrato");

        result->setProperty("mappings", mappings);
        return juce::var(result.get());
    }

    juce::var OmegaUiBridge::handleTriggerNote(const juce::var&, const juce::var& payload)
    {
        int note = (int)payload["note"];
        int velocity = (int)payload["velocity"];
        bool isOn = (bool)payload["on"];
        
        mProcessor->triggerNote(note, velocity, isOn);
        return juce::var("OK");
    }

    juce::var OmegaUiBridge::presetToVar(const Core::Preset::OmegaPreset& p)
    {
        if (!p.isValid()) return juce::var();

        juce::DynamicObject::Ptr root = new juce::DynamicObject();
        root->setProperty("id", p.getUuid());
        root->setProperty("name", p.getName());
        root->setProperty("author", p.getAuthor());
        root->setProperty("engine", p.getEngine());
        
        auto componentToVar = [](const juce::ValueTree& c) {
            juce::DynamicObject::Ptr obj = new juce::DynamicObject();
            obj->setProperty("slotName", c.getProperty(Core::Preset::IDs::slotName).toString());
            obj->setProperty("componentId", c.getProperty(Core::Preset::IDs::componentId).toString());
            
            juce::DynamicObject::Ptr params = new juce::DynamicObject();
            auto pTree = c.getChildWithName(Core::Preset::IDs::params);
            if (pTree.isValid()) {
                for (int i = 0; i < pTree.getNumProperties(); ++i) {
                    auto name = pTree.getPropertyName(i).toString();
                    params->setProperty(name, pTree.getProperty(name));
                }
            }
            obj->setProperty("params", juce::var(params.get()));
            
            return juce::var(obj.get());
        };

        juce::Array<juce::var> layers;
        for (int i = 0; i < p.getNumLayers(); ++i) {
            auto l = p.getLayerTree(i);
            juce::DynamicObject::Ptr lObj = new juce::DynamicObject();
            lObj->setProperty("name", l.getProperty(Core::Preset::IDs::name).toString());
            
            auto arch = l.getChildWithName(Core::Preset::IDs::architecture);
            juce::DynamicObject::Ptr archObj = new juce::DynamicObject();
            
            auto mapComponents = [&](const juce::Identifier& type) {
                juce::Array<juce::var> arr;
                auto list = arch.getChildWithName(type);
                for (int j = 0; j < list.getNumChildren(); ++j) arr.add(componentToVar(list.getChild(j)));
                return arr;
            };

            archObj->setProperty("oscillators", mapComponents("oscillators"));
            archObj->setProperty("filters", mapComponents("filters"));
            archObj->setProperty("fxSlots", mapComponents("fxSlots"));
            
            lObj->setProperty("voiceArch", juce::var(archObj.get()));
            layers.add(juce::var(lObj.get()));
        }
        root->setProperty("layers", layers);
        
        // Similar para envelopes, amplifiers, etc si se desea exponer todo el árbol
        return juce::var(root.get());
    }

} // namespace UI
} // namespace Omega
