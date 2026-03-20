#include "AceCatalog.h"
#include <yaml-cpp/yaml.h>
#include <fstream>
#include <iostream>

namespace Omega::Core::Ace {

    AceCatalog::AceCatalog() {
        // buildFallbacks() se llamará después de registerDefaults o carga de recursos
    }

    std::unique_ptr<AceCatalog> AceCatalog::createFromResources(const std::filesystem::path& resourcesDir) {
        auto catalog = std::make_unique<AceCatalog>();
        
        std::filesystem::path indexFile = resourcesDir / "aceindex.yaml";
        if (!std::filesystem::exists(indexFile)) {
            catalog->registerDefaults();
            catalog->buildFallbacks();
            return catalog;
        }

        try {
            YAML::Node index = YAML::LoadFile(indexFile.string());
            if (index["files"]) {
                for (auto f : index["files"]) {
                    std::filesystem::path componentFile = resourcesDir / f.as<std::string>();
                    if (std::filesystem::exists(componentFile)) {
                        YAML::Node doc = YAML::LoadFile(componentFile.string());
                        if (doc["components"]) {
                            for (auto c : doc["components"]) {
                                ComponentInfo info;
                                info.id = c["id"].as<std::string>();
                                info.name = c["name"].as<std::string>();
                                info.family = c["family"].as<std::string>();
                                info.engine = c["engine"].as<std::string>();
                                info.modelId = c["modelId"].as<std::string>();
                                info.origin = c["origin"].as<std::string>();
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
                                        pdef.unit = p["unit"].as<std::string>();
                                        pdef.min = p["min"].as<float>();
                                        pdef.max = p["max"].as<float>();
                                        pdef.defaultValue = p["default"].as<float>();
                                        info.parameters.push_back(pdef);
                                        info.defaultParams[pdef.id] = pdef.defaultValue;
                                    }
                                }
                                
                                if (c["modulationTargets"]) {
                                    for (auto mt : c["modulationTargets"]) {
                                        ModTarget target;
                                        target.id = mt["id"].as<std::string>();
                                        target.label = mt["label"].as<std::string>();
                                        target.unit = mt["unit"].as<std::string>();
                                        info.modulationTargets.push_back(target);
                                    }
                                }

                                catalog->registerComponent(info);
                            }
                        }
                    }
                }
            }
        } catch (const std::exception& e) {
            std::cerr << "Error parsing ACE YAML: " << e.what() << std::endl;
            // Fallback a defaults si hay error crítico
            catalog->registerDefaults();
        }

        catalog->buildFallbacks();
        return catalog;
    }

    void AceCatalog::registerComponent(const ComponentInfo& info) {
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
        // Juno DCO (Legacy fallback)
        registerComponent({"OSC-VA-001", "Juno DCO", "Oscillator", "VirtualAnalog", "RolandJunoDco", "Roland Juno-106", "active", 1, {"va", "roland", "juno", "dco"}, 
            {{"tune", "Tune", "semitones", -24.0f, 24.0f, 0.0f}, {"sub", "Sub level", "norm", 0.0f, 1.0f, 0.0f}, {"pwm", "Pulse Width", "norm", 0.0f, 1.0f, 0.5f}},
            {}, {{"tune", 0.0f}, {"sub", 0.0f}, {"pwm", 0.5f}}});
    }

    void AceCatalog::buildFallbacks() {
        for (auto const& [id, info] : mComponents) {
            auto key = makeFallbackKey(info.family, info.engine);
            if (mFallbacks.find(key) == mFallbacks.end()) {
                mFallbacks[key] = id;
            }
        }
    }

    std::string AceCatalog::makeFallbackKey(const std::string& family, const std::string& engine) {
        return family + "|" + engine;
    }

} // namespace Omega::Core::Ace
