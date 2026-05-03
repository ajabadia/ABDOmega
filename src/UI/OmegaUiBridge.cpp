#include "OmegaUiBridge.h"
#include "../Plugin/OmegaAudioProcessor.h"
#include <juce_core/juce_core.h>
#include "../Core/Model/PatchIdentifiers.h"
#include "../Core/Providers/EngineConfigManager.h"

namespace Omega {
namespace UI {

    OmegaUiBridge::OmegaUiBridge(Plugin::OmegaAudioProcessor* processor,
                                 Core::Ace::AceCatalog& catalog,
                                 juce::AudioProcessorValueTreeState& apvts,
                                 Core::Service::SystemSettingsManager& settings)
        : mProcessor(processor), mApvts(apvts)
    {
        auto& config = mProcessor->getEngineConfigManager();

        mPresetController = std::make_unique<RpcPresetController>(catalog, config);
        mTelemetryController = std::make_unique<RpcTelemetryController>(settings);
        mSystemController = std::make_unique<RpcSystemController>(settings);
        mMetadataController = std::make_unique<RpcMetadataController>(mProcessor);
        mInputController = std::make_unique<RpcInputController>(mProcessor);
        mModulationController = std::make_unique<RpcModulationController>(config);
        mParameterController = std::make_unique<RpcParameterController>(mProcessor, mApvts);
        
        mPresetController->setOnConfigChangedCallback([this]() { forceRepaint(); });

        mPresetController->registerCommands(mDispatcher, mOnLoadPreset);
        mTelemetryController->registerCommands(mDispatcher, mScopeState);
        mSystemController->registerCommands(mDispatcher, mProcessor);
        mMetadataController->registerCommands(mDispatcher);
        mInputController->registerCommands(mDispatcher);
        mModulationController->registerCommands(mDispatcher);
        mParameterController->setupParameterCommands(mDispatcher);

        mDispatcher.registerHandler("uiReady", [this](const juce::var& rid, const juce::var&) {
            forceRepaint();
            return createResponse("UI_READY_ACK", rid, juce::var());
        });

        mScopeState = juce::var(new juce::DynamicObject());

        for (auto& param : mProcessor->getParameters()) {
            if (auto* p = dynamic_cast<juce::AudioProcessorParameterWithID*>(param))
                mApvts.addParameterListener(p->getParameterID(), this);
        }

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
        if (jsonVar.isVoid()) return createError("INVALID_JSON", 0, "Empty message body.");

        juce::var type = jsonVar["type"];
        juce::var requestId = jsonVar.hasProperty("requestId") ? jsonVar["requestId"] : jsonVar["id"];
        juce::var payload = jsonVar["payload"];

        juce::var result = mDispatcher.dispatch(type.toString(), requestId, payload);
        return juce::JSON::toString(result);
    }

    juce::var OmegaUiBridge::handleMessageFromUiAsVar(const juce::String& type, const juce::var& requestId, const juce::var& payload) {
        return mDispatcher.dispatch(type, requestId, payload);
    }

    void OmegaUiBridge::timerCallback() {
        mTelemetryFrameCounter++;
        bool includeStreaming = (mTelemetryFrameCounter % 4 == 0);
        juce::var data = mTelemetryController->collectTelemetry(includeStreaming);
        
        if (!data.isVoid()) {
            juce::DynamicObject::Ptr push = new juce::DynamicObject();
            push->setProperty("type", "telemetryUpdate");
            push->setProperty("payload", data);
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
    void OmegaUiBridge::setOnLoadCallback(std::function<void()> callback) { mOnLoadPreset = callback; }

    void OmegaUiBridge::forceRepaint() {
        juce::DynamicObject::Ptr push = new juce::DynamicObject();
        push->setProperty("type", "onStateUpdate");
        
        auto& config = mProcessor->getEngineConfigManager();
        auto doc = config.getPatchDocument();
        
        juce::DynamicObject::Ptr patchObj = new juce::DynamicObject();
        patchObj->setProperty("masterGainDb", doc.masterGainDb);
        
        juce::Array<juce::var> modules;
        for (const auto& m : doc.modules) {
            juce::DynamicObject::Ptr mo = new juce::DynamicObject();
            mo->setProperty("instanceId", (int)m.instanceId);
            mo->setProperty("typeId", (int)m.typeId);
            mo->setProperty("componentId", juce::String(Core::Model::mapTypeToId(m.typeId)));
            mo->setProperty("rack", m.position.rack);
            mo->setProperty("slot", m.position.slot);
            
            juce::DynamicObject::Ptr params = new juce::DynamicObject();
            for (const auto& p : m.parameters) {
                params->setProperty(juce::String((int)p.id), p.value);
            }
            mo->setProperty("parameters", params.get());
            modules.add(mo.get());
        }
        patchObj->setProperty("modules", modules);
        
        juce::DynamicObject::Ptr payload = new juce::DynamicObject();
        payload->setProperty("patch", patchObj.get());
        payload->setProperty("schemaVersion", "7.0");

        push->setProperty("payload", juce::var(payload.get()));
        notifyUi(juce::var(push.get()));
    }

} // namespace UI
} // namespace Omega
