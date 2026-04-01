#include "RpcSystemController.h"

namespace Omega {
namespace UI {

    juce::var RpcSystemController::handleGetSystemSettings(const juce::var& requestId, const juce::var&) {
        juce::Array<juce::var> settings;
        for (auto const& [id, def] : mSettings.getAllSettings()) {
            juce::DynamicObject::Ptr obj = new juce::DynamicObject();
            obj->setProperty("id", juce::String(id));
            obj->setProperty("label", juce::String(def.label));
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
        return createResponse("SYSTEM_SETTINGS", requestId, {}, settings);
    }

    juce::var RpcSystemController::handleSetSystemSetting(const juce::var& requestId, const juce::var& payload) {
        juce::String id = payload["id"].toString();
        float value = (float)payload["value"];
        mSettings.setSettingValue(id.toStdString(), value);
        mSettings.save();
        return createResponse("SETTING_ACK", requestId, {}, true);
    }

} // namespace UI
} // namespace Omega
