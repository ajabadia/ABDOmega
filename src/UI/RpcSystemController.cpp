#include "RpcSystemController.h"
#include "../Plugin/OmegaAudioProcessor.h"
#include <juce_gui_basics/juce_gui_basics.h>

namespace Omega {
namespace UI {

    void RpcSystemController::registerCommands(RpcCommandDispatcher& dispatcher, Plugin::OmegaAudioProcessor* processor) {
        dispatcher.registerHandler("getSystemSettings", [this](const juce::var& rid, const juce::var& p) { return handleGetSystemSettings(rid, p); });
        dispatcher.registerHandler("setSystemSetting",  [this](const juce::var& rid, const juce::var& p) { return handleSetSystemSetting(rid, p); });
        
        // [Era 6] Nominal Application Lifecycle Commands
        dispatcher.registerHandler("exit",              [this](const juce::var& rid, const juce::var& p) { return handleExit(rid, p); });
        dispatcher.registerHandler("newPreset",          [this, processor](const juce::var& rid, const juce::var& p) { return handleNewPreset(rid, p, processor); });
        
        // [Era 6] Service & Hardware Diagnostics
        dispatcher.registerHandler("serviceAction",      [this](const juce::var& rid, const juce::var& p) { return handleServiceAction(rid, p); });
    }

    juce::var RpcSystemController::handleExit(const juce::var& requestId, const juce::var&) {
        DBG("[RpcSystemController] Executing System Quit");
        juce::JUCEApplication::getInstance()->systemRequestedQuit();
        return createResponse("EXIT_ACK", requestId, juce::var());
    }

    juce::var RpcSystemController::handleNewPreset(const juce::var& requestId, const juce::var& payload, Plugin::OmegaAudioProcessor* processor) {
        DBG("[RpcSystemController] Loading Minimal Preset (Era 6 Nominal)");
        
        juce::String presetName = "Init Preset";
        if (payload.hasProperty("args") && payload["args"].isArray()) {
            auto* arr = payload["args"].getArray();
            if (arr->size() > 0) presetName = (*arr)[0].toString();
        }

        if (processor) {
            juce::MessageManager::callAsync([this, processor, presetName]() {
                auto p = Core::Preset::OmegaPreset::createMinimal();
                p.setName(presetName);
                processor->loadPreset(p);
            });
        }
        return createResponse("NEW_PRESET_ACK", requestId, juce::var());
    }

    juce::var RpcSystemController::handleGetSystemSettings(const juce::var& requestId, const juce::var&) {
        juce::Array<juce::var> settings;
        for (auto const& [id, def] : mSettings.getAllSettings()) {
            juce::DynamicObject::Ptr obj = new juce::DynamicObject();
            obj->setProperty("id", juce::String(id));
            obj->setProperty("label", juce::String(def.label));
            obj->setProperty("tooltip", juce::String(def.tooltip));
            obj->setProperty("currentValue", mSettings.getSettingValue(id));
            obj->setProperty("defaultValue", def.defaultValue);
            obj->setProperty("minValue", def.minValue);
            obj->setProperty("maxValue", def.maxValue);
            obj->setProperty("category", juce::String(def.category));
            
            if (!def.options.empty()) {
                juce::DynamicObject::Ptr optObj = new juce::DynamicObject();
                for (auto const& [val, label] : def.options) {
                    optObj->setProperty(juce::String(val), juce::String(label));
                }
                obj->setProperty("options", juce::var(optObj.get()));
            }

            settings.add(juce::var(obj.get()));
        }
        return createResponse("SYSTEM_SETTINGS", requestId, juce::var(), settings);
    }

    juce::var RpcSystemController::handleSetSystemSetting(const juce::var& requestId, const juce::var& payload) {
        juce::String id = payload["id"].toString();
        float value = (float)payload["value"];
        mSettings.setSettingValue(id.toStdString(), value);
        mSettings.save();
        return createResponse("SETTING_ACK", requestId, juce::var(), true);
    }

    juce::var RpcSystemController::handleServiceAction(const juce::var& requestId, const juce::var& payload) {
        juce::String action = payload["action"].toString();
        DBG("[RpcSystemController] Service Action: " << action);
        
        // Future: Pipe these to specialized HardwareCalibration or VoiceTester services
        juce::DynamicObject::Ptr result = new juce::DynamicObject();
        result->setProperty("status", "received");
        result->setProperty("action", action);
        return createResponse("SERVICE_ACK", requestId, juce::var(), juce::var(result.get()));
    }

} // namespace UI
} // namespace Omega
