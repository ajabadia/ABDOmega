#include "SystemSettingsManager.h"
#include <juce_core/juce_core.h>
#include <yaml-cpp/yaml.h>

namespace Omega::Core::Service {

    SystemSettingsManager::SystemSettingsManager() {
        initializeDefaults();
        load();
    }

    void SystemSettingsManager::initializeDefaults() {
        // --- 1. Hardcoded Fail-Safe Defaults ---
        SettingDef voices;
        voices.id = "numVoices";
        voices.label = "Polyphony (Voices)";
        voices.defaultValue = 16.0f;
        voices.minValue = 1.0f;
        voices.maxValue = 16.0f;
        voices.isInteger = true;
        registerSetting(voices);

        // --- 2. Load Metadata from YAML (Externalized) ---
        juce::File exeFile = juce::File::getSpecialLocation(juce::File::currentExecutableFile);
        juce::File yamlFile = exeFile.getSiblingFile("Resources").getChildFile("system_settings.yaml");
        
        // Fallback for Debug builds (if Resources is in root)
        if (!yamlFile.exists()) {
             yamlFile = juce::File("d:/desarrollos/ABDOmega/Resources/system_settings.yaml");
        }

        if (yamlFile.existsAsFile()) {
            try {
                YAML::Node root = YAML::LoadFile(yamlFile.getFullPathName().toStdString());
                if (root["settings"] && root["settings"].IsSequence()) {
                    for (auto const& s : root["settings"]) {
                        SettingDef def;
                        def.id = s["id"].as<std::string>();
                        def.label = s["label"].as<std::string>();
                        def.tooltip = s["tooltip"].as<std::string>("");
                        def.defaultValue = s["defaultValue"].as<float>(0.0f);
                        def.minValue = s["minValue"].as<float>(0.0f);
                        def.maxValue = s["maxValue"].as<float>(1.0f);
                        def.isInteger = s["isInteger"].as<bool>(false);
                        def.category = s["category"].as<std::string>("GENERAL");
                        
                        if (s["options"] && s["options"].IsMap()) {
                            for (auto const& it : s["options"]) {
                                def.options[it.first.as<int>()] = it.second.as<std::string>();
                            }
                        }
                        registerSetting(def);
                    }
                }
            } catch (...) {
                // Silently fallback to hardcoded
            }
        }
    }

    void SystemSettingsManager::registerSetting(const SettingDef& def) {
        mDefs[def.id] = def;
        if (mValues.find(def.id) == mValues.end()) {
            mValues[def.id] = def.defaultValue;
        }
    }

    float SystemSettingsManager::getSettingValue(const std::string& id) const {
        auto it = mValues.find(id);
        if (it != mValues.end()) return it->second;
        
        auto defIt = mDefs.find(id);
        if (defIt != mDefs.end()) return defIt->second.defaultValue;
        
        return 0.0f;
    }

    void SystemSettingsManager::setSettingValue(const std::string& id, float value) {
        auto defIt = mDefs.find(id);
        if (defIt == mDefs.end()) return;
        
        mValues[id] = juce::jlimit(defIt->second.minValue, defIt->second.maxValue, value);
        save();
    }

    const SettingDef* SystemSettingsManager::getSettingDef(const std::string& id) const {
        auto it = mDefs.find(id);
        if (it != mDefs.end()) return &it->second;
        return nullptr;
    }

    juce::File SystemSettingsManager::getSettingsFile() {
        juce::File appData = juce::File::getSpecialLocation(juce::File::userApplicationDataDirectory)
                            .getChildFile("ABD")
                            .getChildFile("OMEGA");
        
        if (!appData.exists()) appData.createDirectory();
        return appData.getChildFile("settings.xml");
    }

    void SystemSettingsManager::load() {
        juce::File file = getSettingsFile();
        if (!file.exists()) return;

        auto xml = juce::XmlDocument::parse(file);
        if (xml == nullptr) return;

        if (xml->hasTagName("OMEGA_SETTINGS")) {
            for (auto* e : xml->getChildIterator()) {
                if (e->hasTagName("SETTING")) {
                    std::string id = e->getStringAttribute("id").toStdString();
                    float val = (float)e->getDoubleAttribute("value");
                    if (mDefs.find(id) != mDefs.end()) {
                        mValues[id] = val;
                    }
                }
            }
        }
    }

    void SystemSettingsManager::save() {
        juce::File file = getSettingsFile();
        juce::XmlElement xml("OMEGA_SETTINGS");

        for (auto const& [id, val] : mValues) {
            auto* e = xml.createNewChildElement("SETTING");
            e->setAttribute("id", id);
            e->setAttribute("value", (double)val);
        }

        xml.writeTo(file);
    }

    void SystemSettingsManager::resetToDefaults() {
        for (auto const& [id, def] : mDefs) {
            mValues[id] = def.defaultValue;
        }
        save();
    }

} // namespace Omega::Core::Service
