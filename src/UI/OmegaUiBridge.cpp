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
        mTelemetryController = std::make_unique<RpcTelemetryController>(settings);
        mSystemController = std::make_unique<RpcSystemController>(settings, repository);
        mMetadataController = std::make_unique<RpcMetadataController>(mProcessor);
        mInputController = std::make_unique<RpcInputController>(mProcessor);
        mModulationController = std::make_unique<RpcModulationController>(mPreset);
        mParameterController = std::make_unique<RpcParameterController>(mProcessor, mApvts, mPreset);

        // --- CONTEXTUAL COMMAND REGISTRATION ---
        mPresetController->registerCommands(mDispatcher, mOnLoadPreset);
        mTelemetryController->registerCommands(mDispatcher, mScopeState);
        mSystemController->registerCommands(mDispatcher, mProcessor);
        mMetadataController->registerCommands(mDispatcher);
        mInputController->registerCommands(mDispatcher);
        mModulationController->registerCommands(mDispatcher);
        mParameterController->setupParameterCommands(mDispatcher);

        // [Era 6] Final Nominal Bootstrap Commands
        mDispatcher.registerHandler("uiReady", [this](const juce::var& rid, const juce::var&) {
            forceRepaint();
            return createResponse("UI_READY_ACK", rid, juce::var());
        });

        // [Era 6] Fail-Fast: Catch legacy protocols in the dispatcher
        mDispatcher.registerHandler("setParam", [this](const juce::var& rid, const juce::var&) {
            return createError("CONTRACTVIOLATION", rid, "Legacy protocol 'setParam' is deprecated. Use 'setParameter' command.");
        });
        mDispatcher.registerHandler("menuAction", [this](const juce::var& rid, const juce::var&) {
            return createError("CONTRACTVIOLATION", rid, "Legacy protocol 'menuAction' is deprecated. Use 'newPreset' or 'exit' directly.");
        });

        auto& reg = Core::Providers::ModulationTelemetryRegistry::getInstance();
        reg.registerPin("system", "midi_monitor", Core::Providers::TelemetryType::Discrete, "MIDI Monitor");

        mScopeState = juce::var(new juce::DynamicObject());

        for (auto& param : mProcessor->getParameters()) {
            if (auto* p = dynamic_cast<juce::AudioProcessorParameterWithID*>(param))
                mApvts.addParameterListener(p->getParameterID(), this);
        }

        // [Era 6] Start Telemetry Push Timer (60Hz)
        startTimerHz(60);
    }

    OmegaUiBridge::~OmegaUiBridge() {
        stopTimer();
        for (auto& param : mProcessor->getParameters()) {
            if (auto* p = dynamic_cast<juce::AudioProcessorParameterWithID*>(param))
                mApvts.removeParameterListener(p->getParameterID(), this);
        }
    }

    juce::String OmegaUiBridge::handleMessageFromUi(const juce::String& jsonMessage) {
        juce::var jsonVar = juce::JSON::parse(jsonMessage);
        if (jsonVar.isVoid()) return createError("INVALID_JSON", 0, "Empty or invalid message body.");

        juce::var type = jsonVar["type"];
        juce::var requestId = jsonVar.hasProperty("requestId") ? jsonVar["requestId"] : jsonVar["id"];
        juce::var payload = jsonVar["payload"];

        juce::var result = handleMessageFromUiAsVar(type.toString(), requestId, payload);
        return juce::JSON::toString(result);
    }

    juce::var OmegaUiBridge::handleMessageFromUiAsVar(const juce::String& type, const juce::var& requestId, const juce::var& payload) {
        DBG("[RPC] RECV: " << type << " [ID: " << requestId.toString() << "]");
        // [Era 6 Absolute] Universal Routing via Dispatcher
        return mDispatcher.dispatch(type, requestId, payload);
    }

    void OmegaUiBridge::timerCallback() {
        // [Era 6] Multi-Tier Telemetry Push (Phased)
        // Phase 1: Discrete (PK/V) - Always collected at 60Hz (Ultra-Cheap)
        // Phase 2: Streaming (H)   - Collected every 4 frames at 15Hz (Expensive serialization)
        
        mTelemetryFrameCounter++;
        bool includeStreaming = (mTelemetryFrameCounter % 4 == 0);
        
        juce::var data = mTelemetryController->collectTelemetry(includeStreaming);
        
        if (!data.isVoid()) {
            juce::DynamicObject::Ptr push = new juce::DynamicObject();
            push->setProperty("type", "telemetryUpdate");
            push->setProperty("payload", data);
            
            // Add tier meta-info if streaming was included
            if (includeStreaming) push->setProperty("tier", "streaming");
            else push->setProperty("tier", "discrete");

            notifyUi(juce::var(push.get()));
        }
    }

    juce::var OmegaUiBridge::createResponse(const juce::var& type, const juce::var& requestId, const juce::var& payload) {
        juce::DynamicObject::Ptr obj = new juce::DynamicObject();
        obj->setProperty("type", type);
        obj->setProperty("requestId", requestId);
        obj->setProperty("payload", payload);
        return juce::var(obj.get());
    }
    
    juce::var OmegaUiBridge::createError(const juce::var& errorCode, const juce::var& requestId, const juce::String& message) {
        juce::DynamicObject::Ptr obj = new juce::DynamicObject();
        obj->setProperty("type", "rpcError");
        obj->setProperty("requestId", requestId);
        obj->setProperty("errorCode", errorCode);
        obj->setProperty("message", message);
        return juce::var(obj.get());
    }

    void OmegaUiBridge::notifyUi(const juce::var& notification) {
        if (mUiCallback) mUiCallback(juce::JSON::toString(notification));
    }

    void OmegaUiBridge::parameterChanged(const juce::String& parameterID, float newValue) {
        juce::DynamicObject::Ptr n = new juce::DynamicObject();
        n->setProperty("type", "PARAM_CHANGE");
        n->setProperty("target", parameterID);
        n->setProperty("value", newValue);
        notifyUi(juce::var(n.get()));
    }

    void OmegaUiBridge::setUiMessageCallback(MessageCallback callback) { mUiCallback = callback; }
    void OmegaUiBridge::setOnLoadCallback(std::function<void(const Core::Preset::OmegaPreset&)> callback) { mOnLoadPreset = callback; }

    void OmegaUiBridge::forceRepaint() {
        juce::DynamicObject::Ptr push = new juce::DynamicObject();
        push->setProperty("type", "onStateUpdate");
        
        juce::var payload = mPresetController->presetToVar(mPreset);
        // Ensure schemaVersion is present in the payload (if presetToVar doesn't add it)
        if (!payload.hasProperty("schemaVersion")) {
            if (auto* obj = payload.getDynamicObject()) {
                obj->setProperty("schemaVersion", "1.0");
            }
        }
        
        push->setProperty("payload", payload);
        notifyUi(juce::var(push.get()));
    }

} // namespace UI
} // namespace Omega
