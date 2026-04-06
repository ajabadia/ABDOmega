#include "AceCatalog.h"
#include <yaml-cpp/yaml.h>
#include <fstream>
#include <iostream>

namespace Omega::Core::Ace {

    AceCatalog::AceCatalog() {
    }

    std::unique_ptr<AceCatalog> AceCatalog::createFromResources(const std::filesystem::path& resourcesDir) {
        auto catalog = std::make_unique<AceCatalog>();
        
        std::filesystem::path indexFile = resourcesDir / "aceindex.yaml";
        if (!std::filesystem::exists(indexFile)) {
            std::cerr << "ACE Catalog Error: aceindex.yaml not found in " << resourcesDir << std::endl;
            return catalog;
        }

        try {
            YAML::Node index = YAML::LoadFile(indexFile.string());
            if (index["files"]) {
                for (auto f : index["files"]) {
                    std::filesystem::path componentFile = resourcesDir / f.as<std::string>();
                    if (std::filesystem::exists(componentFile)) {
                        YAML::Node doc = YAML::LoadFile(componentFile.string());
                        
                        // Handle both single-component files and multi-component files
                        std::vector<YAML::Node> componentNodes;
                        if (doc["components"]) {
                            for (auto c : doc["components"]) componentNodes.push_back(c);
                        } else if (doc["id"]) {
                            componentNodes.push_back(doc);
                        }

                        for (auto const& c : componentNodes) {
                            ComponentInfo info;
                            info.id = c["id"].as<std::string>();
                            info.name = c["name"].as<std::string>();
                            info.family = c["family"].as<std::string>();
                            info.engine = c["engine"].as<std::string>();
                            info.modelId = c["modelId"].as<std::string>();
                            info.origin = c["origin"] ? c["origin"].as<std::string>() : "Unknown";
                            info.status = c["status"] ? c["status"].as<std::string>() : "active";
                            info.version = c["version"] ? c["version"].as<int>() : 1;
                            
                            if (c["tags"]) {
                                for (auto t : c["tags"]) info.tags.push_back(t.as<std::string>());
                            }

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

                            catalog->registerComponent(info);
                        }
                    }
                }
            }
        } catch (const std::exception& e) {
            std::cerr << "Error parsing ACE YAML catalog: " << e.what() << std::endl;
        }

        catalog->buildFallbacks();
        return catalog;
    }

    void AceCatalog::registerComponent(const ComponentInfo& info) {
        if (info.id.empty()) return;
        mComponents[info.id] = info;
    }

    const ComponentInfo* AceCatalog::getComponent(const std::string& id) const {
        auto it = mComponents.find(id);
        if (it != mComponents.end()) return &it->second;
        return nullptr;
    }

    std::vector<const ComponentInfo*> AceCatalog::listByFamilyAndEngine(const std::string& family, const std::string& engine) const {
        std::vector<const ComponentInfo*> results;
        for (auto const& [id, info] : mComponents) {
            if (info.family == family && info.engine == engine) {
                results.push_back(&info);
            }
        }
        return results;
    }

    std::string AceCatalog::getFallbackId(const std::string& family, const std::string& engine) const {
        auto key = makeFallbackKey(family, engine);
        auto it = mFallbacks.find(key);
        if (it != mFallbacks.end()) return it->second;
        return "";
    }

    void AceCatalog::registerDefaults() {
        // Redundante con la carga de YAML, pero mantenemos el símbolo por compatibilidad de linkeo si es necesario (vacio)
    }

    void AceCatalog::buildFallbacks() {
        mFallbacks.clear();
        for (auto const& [id, info] : mComponents) {
            auto key = makeFallbackKey(info.family, info.engine);
            // El primero que se registre de cada tipo es el fallback automatizo
            if (mFallbacks.find(key) == mFallbacks.end()) {
                mFallbacks[key] = id;
            }
        }
    }

    std::string AceCatalog::makeFallbackKey(const std::string& family, const std::string& engine) {
        return family + "|" + engine;
    }

    bool AceCatalog::loadFromDirectory(const juce::File& directory) {
        if (!directory.isDirectory()) return false;
        
        juce::Logger::writeToLog("ACE: Scanning Resource Directory: " + directory.getFullPathName());

        juce::DirectoryIterator it(directory, true, "*.yaml");
        bool anyFound = false;

        while (it.next()) {
            auto path = it.getFile().getFullPathName().toStdString();
            try {
                YAML::Node doc = YAML::LoadFile(path);
                std::vector<YAML::Node> componentNodes;
                if (doc["components"]) {
                    for (auto c : doc["components"]) componentNodes.push_back(c);
                } else if (doc["id"]) {
                    componentNodes.push_back(doc);
                }

                for (auto const& c : componentNodes) {
                    ComponentInfo info;
                    info.id = c["id"].as<std::string>();
                    info.name = c["name"].as<std::string>();
                    info.family = c["family"].as<std::string>();
                    info.engine = c["engine"].as<std::string>();
                    info.modelId = c["modelId"].as<std::string>();
                    info.origin = c["origin"] ? c["origin"].as<std::string>() : "Unknown";
                    info.status = c["status"] ? c["status"].as<std::string>() : "active";
                    info.version = c["version"] ? c["version"].as<int>() : 1;
                    
                    if (c["tags"]) {
                        for (auto t : c["tags"]) info.tags.push_back(t.as<std::string>());
                    }

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

                    registerComponent(info);
                    anyFound = true;
                }
            } catch (...) {
                // Skip invalid files
            }
        }

        if (anyFound) buildFallbacks();
        return anyFound;
    }

} // namespace Omega::Core::Ace
