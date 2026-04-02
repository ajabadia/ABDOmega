#include "OmegaUiBridge.h"
#include "../Plugin/OmegaAudioProcessor.h"
#include <juce_core/juce_core.h>

namespace Omega {
namespace UI {

    OmegaUiBridge::OmegaUiBridge(Plugin::OmegaAudioProcessor* processor,
                                 Core::Preset::OmegaPreset& preset, 
                                 Core::Ace::AceCatalog& catalog,
                                 Core::Preset::PresetRepository* repository,
                                 juce::AudioProcessorValueTreeState& apvts,
                                 Core::Service::SystemSettingsManager& settings)
        : mProcessor(processor), mPreset(preset), mApvts(apvts)
    {
        mPresetController = std::make_unique<RpcPresetController>(mPreset, catalog, repository);
        mTelemetryController = std::make_unique<RpcTelemetryController>();
        mSystemController = std::make_unique<RpcSystemController>(settings, repository);
        mMetadataController = std::make_unique<RpcMetadataController>(mProcessor);
        mInputController = std::make_unique<RpcInputController>(mProcessor);
        mModulationController = std::make_unique<RpcModulationController>(mPreset);

        mScopeState = juce::var(new juce::DynamicObject());

        for (auto& param : mProcessor->getParameters()) {
            if (auto* p = dynamic_cast<juce::AudioProcessorParameterWithID*>(param))
                mApvts.addParameterListener(p->getParameterID(), this);
        }
    }

    OmegaUiBridge::~OmegaUiBridge() {
        for (auto& param : mProcessor->getParameters()) {
            if (auto* p = dynamic_cast<juce::AudioProcessorParameterWithID*>(param))
                mApvts.removeParameterListener(p->getParameterID(), this);
        }
    }

    juce::String OmegaUiBridge::handleMessageFromUi(const juce::String& jsonMessage) {
        juce::var jsonVar = juce::JSON::parse(jsonMessage);
        if (jsonVar.isVoid()) return createResponse("error", 0, "Invalid JSON");

        juce::var type = jsonVar["type"];
        juce::var requestId = jsonVar.hasProperty("requestId") ? jsonVar["requestId"] : jsonVar["id"];
        juce::var payload = jsonVar["payload"];

        juce::var result = handleMessageFromUiAsVar(type.toString(), requestId, payload);
        return juce::JSON::toString(result);
    }

    juce::var OmegaUiBridge::handleMessageFromUiAsVar(const juce::String& type, const juce::var& requestId, const juce::var& payload) {
        // --- ROUTER ---
        
        // 1. Preset & Version Control
        if (type == "getState") return mPresetController->handleGetState(requestId, payload);
        if (type == "listAce") return mPresetController->handleListAceComponents(requestId, payload);
        if (type == "loadPreset") return mPresetController->handleLoadPreset(requestId, payload, mOnLoadPreset);
        if (type == "savePreset") return mPresetController->handleSavePreset(requestId, payload);
        if (type == "listPresets") return mPresetController->handleListPresets(requestId, payload);
        if (type == "getHistory") return mPresetController->handleGetHistory(requestId, payload);
        if (type == "saveSnapshot") return mPresetController->handleSaveSnapshot(requestId, payload, mPreset);
        if (type == "checkout") return mPresetController->handleCheckout(requestId, payload, mOnLoadPreset);
        if (type == "createBranch") return mPresetController->handleCreateBranch(requestId, payload);
        if (type == "getBrowserData") return mPresetController->handleGetBrowserData(requestId, payload);
        if (type == "selectLibrary") return mPresetController->handleSelectLibrary(requestId, payload);
        if (type == "loadLibraryPreset") return mPresetController->handleLoadLibraryPreset(requestId, payload, mOnLoadPreset);
        if (type == "setFavorite") return mPresetController->handleSetFavorite(requestId, payload);
        if (type == "saveAsNewPreset") {
             // Redirect to saveSnapshot logic or similar
             return mPresetController->handleSaveSnapshot(requestId, payload, mPreset);
        }
        
        if (type == "setParam") {
            juce::String paramId = payload["id"].toString();
            float value = (float)payload["value"];
            if (auto* param = mApvts.getParameter(paramId)) {
                param->setValueNotifyingHost(param->getNormalisableRange().convertTo0to1(value));
                return createResponse("PARAM_ACK", requestId, {}, payload);
            }
        }

        // 2. Telemetry & Visuals
        if (type == "getTelemetry") return mTelemetryController->handleGetTelemetry(requestId, payload);
        if (type == "getTelemetrySources") return mTelemetryController->handleGetTelemetrySources(requestId, payload);
        if (type == "getModConnections") return mTelemetryController->handleGetModConnections(requestId, payload);
        if (type == "getScopeState") return mTelemetryController->handleGetScopeState(requestId, payload, mScopeState);
        if (type == "setScopeState") return mTelemetryController->handleSetScopeState(requestId, payload, mScopeState);

        // 3. System & Config
        if (type == "getSystemSettings") return mSystemController->handleGetSystemSettings(requestId, payload);
        if (type == "setSystemSetting") return mSystemController->handleSetSystemSetting(requestId, payload);

        // 4. Metadata & Runtime
        if (type == "getMetadata") return mMetadataController->handleGetMetadata(requestId, payload);
        if (type == "getSampleRate") return mMetadataController->handleGetSampleRate(requestId, payload);
        if (type == "getTempo") return mMetadataController->handleGetTempo(requestId, payload);
        if (type == "uiReady") {
            // Proactive Push: Ensure UI is in sync with real engine state immediately
            // We use the same format as onStateUpdate so ModuleManager handles it.
            juce::DynamicObject::Ptr push = new juce::DynamicObject();
            push->setProperty("type", "onStateUpdate");
            push->setProperty("payload", mPresetController->presetToVar(mPreset));
            notifyUi(juce::var(push.get()));
            
            return createResponse("UI_READY_ACK", requestId, {});
        }

        // 5. Input
        if (type == "triggerNote") return mInputController->handleTriggerNote(requestId, payload);
        if (type == "sendMidi") {
            // Translate raw MIDI from UI to handleTriggerNote
            int status = (int)payload["status"];
            int note = (int)payload["data1"];
            int vel = (int)payload["data2"];
            
            juce::DynamicObject::Ptr triggerPayload = new juce::DynamicObject();
            triggerPayload->setProperty("note", note);
            triggerPayload->setProperty("velocity", vel);
            triggerPayload->setProperty("on", (status & 0xF0) == 0x90 && vel > 0);
            
            return mInputController->handleTriggerNote(requestId, juce::var(triggerPayload.get()));
        }

        // 6. Modulation Matrix 2.0
        if (type == "getModulationMetadata") return mModulationController->handleGetModulationMetadata(requestId, payload);
        if (type == "updateModMatrixSlot")    return mModulationController->handleUpdateModMatrixSlot(requestId, payload);

        // 7. Menu Actions & System
        if (type == "menuAction") {
            juce::String action = payload["action"].toString();
            DBG("[OMEGA BRIDGE] menuAction received: " << action);
            
            if (action == "exit") {
                DBG("[OMEGA BRIDGE] Executing System Quit");
                juce::JUCEApplication::getInstance()->systemRequestedQuit();
                return createResponse("EXIT_ACK", requestId, {});
            }
            // Add other system actions here
        }

        return createResponse("error", requestId, "Unknown method: " + type);
    }

    juce::String OmegaUiBridge::createResponse(const juce::var& type, const juce::var& requestId, const juce::var& error, const juce::var& payload) {
        juce::DynamicObject::Ptr obj = new juce::DynamicObject();
        obj->setProperty("type", type);
        obj->setProperty("requestId", requestId);
        obj->setProperty("error", error);
        obj->setProperty("payload", payload);
        return juce::JSON::toString(juce::var(obj.get()));
    }

    void OmegaUiBridge::notifyUi(const juce::var& notification) {
        if (mUiCallback) mUiCallback(juce::JSON::toString(notification));
    }

    void OmegaUiBridge::parameterChanged(const juce::String& parameterID, float newValue) {
        juce::DynamicObject::Ptr n = new juce::DynamicObject();
        n->setProperty("type", "PARAM_CHANGE");
        n->setProperty("id", parameterID);
        n->setProperty("value", newValue);
        notifyUi(juce::var(n.get()));
    }

    void OmegaUiBridge::setUiMessageCallback(MessageCallback callback) { mUiCallback = callback; }
    void OmegaUiBridge::setOnLoadCallback(std::function<void(const Core::Preset::OmegaPreset&)> callback) { mOnLoadPreset = callback; }

} // namespace UI
} // namespace Omega
