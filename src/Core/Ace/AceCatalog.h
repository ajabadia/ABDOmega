#pragma once

#include <string>
#include <vector>
#include <map>
#include <memory>
#include <filesystem>
#include <sstream>
#include <iostream>
#include <yaml-cpp/yaml.h>
#include <juce_core/juce_core.h>

namespace Omega::Core::Ace {

    /**
     * @brief Definición de un parámetro de componente ACE.
     */
    struct ParameterDef {
        std::string id;
        std::string label;
        std::string unit;
        float min = 0.0f;
        float max = 1.0f;
        float defaultValue = 0.0f;
    };

    /**
     * @brief Definición de un objetivo de modulación.
     */
    struct ModTarget {
        std::string id;
        std::string label;
        std::string unit;
    };

    /**
     * @brief Información extendida de un componente ACE.
     */
    struct ComponentInfo {
        std::string id;
        std::string name;
        std::string family;   // Oscillator, Filter, Envelope, LFO, FX
        std::string engine;   // VirtualAnalog, etc.
        std::string modelId;
        std::string origin;
        std::string status;   // active, experimental, deprecated
        int version = 1;
        std::vector<std::string> tags;
        std::string description;
        std::string icon;
        std::vector<ParameterDef> parameters;
        std::vector<ModTarget> modulationTargets;
        
        // Metadata defined UI (Hyper-ACE)
        std::string uiLayout; 
        std::string style;    
        
        uint32_t implementationId = 0; // Numeric ID for engine dispatch
        
        std::map<std::string, float> defaultParams; 
    };

    /**
     * @brief Catálogo centralizado de componentes ACE disponibles.
     */
    class AceCatalog {
    public:
        AceCatalog() {}
        
        static void parseComponentNode(const YAML::Node& c, ComponentInfo& info) {
            info.id = c["id"].as<std::string>();
            info.name = c["name"].as<std::string>();
            info.family = c["family"].as<std::string>();
            info.engine = c["engine"].as<std::string>();
            info.modelId = c["modelId"] ? c["modelId"].as<std::string>() : info.id;
            info.implementationId = c["implementationId"] ? c["implementationId"].as<uint32_t>() : 0;
            info.origin = c["origin"] ? c["origin"].as<std::string>() : "Unknown";
            info.status = c["status"] ? c["status"].as<std::string>() : "active";
            info.version = c["version"] ? c["version"].as<int>() : 1;
            
            if (c["tags"]) {
                for (auto t : c["tags"]) info.tags.push_back(t.as<std::string>());
            }
            
            if (c["description"]) info.description = c["description"].as<std::string>();
            if (c["icon"]) info.icon = c["icon"].as<std::string>();

            if (c["parameters"]) {
                for (auto p : c["parameters"]) {
                    ParameterDef pdef;
                    pdef.id = p["id"].as<std::string>();
                    pdef.label = p["label"].as<std::string>();
                    pdef.unit = p["unit"] ? p["unit"].as<std::string>() : "";
                    pdef.min = p["min"] ? p["min"].as<float>() : 0.0f;
                    pdef.max = p["max"] ? p["max"].as<float>() : 1.0f;
                    
                    if (p["default"]) pdef.defaultValue = p["default"].as<float>();
                    else if (p["defaultValue"]) pdef.defaultValue = p["defaultValue"].as<float>();
                    else pdef.defaultValue = pdef.min;

                    info.parameters.push_back(pdef);
                    info.defaultParams[pdef.id] = pdef.defaultValue;
                }
            }
            
            if (c["modulationTargets"]) {
                for (auto mt : c["modulationTargets"]) {
                    ModTarget target;
                    target.id = mt["id"].as<std::string>();
                    target.label = mt["label"] ? mt["label"].as<std::string>() : target.id;
                    target.unit = mt["unit"] ? mt["unit"].as<std::string>() : "";
                    info.modulationTargets.push_back(target);
                }
            }

            if (c["uiLayout"]) {
                std::stringstream ss;
                ss << c["uiLayout"];
                info.uiLayout = ss.str();
            }
            
            if (c["style"]) info.style = c["style"].as<std::string>();
            else if (c["panelClass"]) info.style = c["panelClass"].as<std::string>();
        }

        static std::unique_ptr<AceCatalog> createFromResources(const std::filesystem::path& resourcesDir) {
            auto catalog = std::make_unique<AceCatalog>();
            std::filesystem::path indexFile = resourcesDir / "aceindex.yaml";
            if (!std::filesystem::exists(indexFile)) return catalog;

            try {
                YAML::Node index = YAML::LoadFile(indexFile.string());
                if (index["files"]) {
                    for (auto f : index["files"]) {
                        std::filesystem::path componentFile = resourcesDir / f.as<std::string>();
                        if (std::filesystem::exists(componentFile)) {
                            YAML::Node doc = YAML::LoadFile(componentFile.string());
                            std::vector<YAML::Node> componentNodes;
                            if (doc["components"]) {
                                for (auto c : doc["components"]) componentNodes.push_back(c);
                            } else if (doc["id"]) {
                                componentNodes.push_back(doc);
                            }
                            for (auto const& c : componentNodes) {
                                ComponentInfo info;
                                parseComponentNode(c, info);
                                catalog->registerComponent(info);
                            }
                        }
                    }
                }
            } catch (...) {}
            catalog->buildFallbacks();
            return catalog;
        }

        void registerComponent(const ComponentInfo& info) {
            if (info.id.empty()) return;
            mComponents[info.id] = info;
        }

        const ComponentInfo* getComponent(const std::string& id) const {
            auto it = mComponents.find(id);
            if (it != mComponents.end()) return &it->second;
            return nullptr;
        }

        std::vector<const ComponentInfo*> listByFamilyAndEngine(const std::string& family, const std::string& engine) const {
            std::vector<const ComponentInfo*> results;
            for (auto const& [id, info] : mComponents) {
                if (info.family == family && info.engine == engine) results.push_back(&info);
            }
            return results;
        }

        std::vector<const ComponentInfo*> getComponents() const {
            std::vector<const ComponentInfo*> results;
            for (auto const& [id, info] : mComponents) results.push_back(&info);
            return results;
        }

        std::string getFallbackId(const std::string& family, const std::string& engine) const {
            auto key = family + "|" + engine;
            auto it = mFallbacks.find(key);
            if (it != mFallbacks.end()) return it->second;
            return "";
        }

        void buildFallbacks() {
            mFallbacks.clear();
            for (auto const& [id, info] : mComponents) {
                auto key = info.family + "|" + info.engine;
                if (mFallbacks.find(key) == mFallbacks.end()) mFallbacks[key] = id;
            }
        }

        bool loadFromDirectory(const juce::File& directory) {
            if (!directory.isDirectory()) return false;
            juce::DirectoryIterator it(directory, true, "*.yaml");
            bool anyFound = false;
            while (it.next()) {
                try {
                    YAML::Node doc = YAML::LoadFile(it.getFile().getFullPathName().toStdString());
                    std::vector<YAML::Node> componentNodes;
                    if (doc["components"]) {
                        for (auto c : doc["components"]) componentNodes.push_back(c);
                    } else if (doc["id"]) {
                        componentNodes.push_back(doc);
                    }
                    for (auto const& c : componentNodes) {
                        ComponentInfo info;
                        parseComponentNode(c, info);
                        registerComponent(info);
                        anyFound = true;
                    }
                } catch (...) {}
            }
            if (anyFound) buildFallbacks();
            return anyFound;
        }

        /**
         * @brief Discover modules strictly based on WASM binary existence. (Era 4 Paradigm)
         */
        bool loadFromPluginDirectory(const ::juce::File& pluginDir, const ::juce::File& metadataDir) {
            if (!pluginDir.isDirectory()) return false;
            
            ::juce::DirectoryIterator it(pluginDir, true, "*.wasm");
            bool anyFound = false;
            
            while (it.next()) {
                ::juce::File wasmFile = it.getFile();
                ::juce::String stem = wasmFile.getFileNameWithoutExtension();
                
                // Search for metadata: 1. Local (.yaml next to .wasm), 2. Global (metadataDir)
                ::juce::File yamlFile = wasmFile.withFileExtension(".yaml");
                if (!yamlFile.exists() && metadataDir.isDirectory()) {
                    yamlFile = metadataDir.getChildFile(stem + ".yaml");
                }

                if (yamlFile.exists()) {
                    try {
                        YAML::Node doc = YAML::LoadFile(yamlFile.getFullPathName().toStdString());
                        std::vector<YAML::Node> componentNodes;
                        if (doc["components"]) {
                            for (auto c : doc["components"]) componentNodes.push_back(c);
                        } else if (doc["id"]) {
                            componentNodes.push_back(doc);
                        }

                        for (auto const& c : componentNodes) {
                            ComponentInfo info;
                            parseComponentNode(c, info);
                            
                            registerComponent(info);
                            anyFound = true;
                        }
                    } catch (...) {
                        ::juce::Logger::writeToLog("ACE: Error loading metadata for " + stem);
                    }
                } else {
                    ::juce::Logger::writeToLog("ACE: Found WASM without YAML: " + stem + " (Skipping)");
                }
            }
            
            if (anyFound) buildFallbacks();
            return anyFound;
        }

    private:
        std::map<std::string, ComponentInfo> mComponents;
        std::map<std::string, std::string> mFallbacks;
    };

} // namespace Omega::Core::Ace
