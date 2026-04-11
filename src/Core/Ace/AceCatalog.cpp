#include "AceCatalog.h"
#include <yaml-cpp/yaml.h>
#include <juce_core/juce_core.h>
#include <sstream>
#include <filesystem>

namespace Omega::Core::Ace {

    // Helper for safe YAML numeric conversion
    static float safeAsFloat(const YAML::Node& node, float fallback = 0.0f) {
        if (!node.IsDefined() || node.IsNull()) return fallback;
        try {
            return node.as<float>();
        } catch (...) {
            return fallback;
        }
    }

    static int safeAsInt(const YAML::Node& node, int fallback = 0) {
        if (!node.IsDefined() || node.IsNull()) return fallback;
        try {
            return node.as<int>();
        } catch (...) {
            return fallback;
        }
    }

    AceCatalog::AceCatalog() {}

    void AceCatalog::parseComponentNode(const YAML::Node& c, ComponentInfo& info) {
        try {
            info.id = c["id"].as<std::string>();
            info.name = c["name"] ? c["name"].as<std::string>() : info.id;
            info.family = c["family"] ? c["family"].as<std::string>() : "Utility";
            info.engine = c["engine"] ? c["engine"].as<std::string>() : "Modular";
            info.modelId = c["modelId"] ? c["modelId"].as<std::string>() : info.id;
            info.implementationId = c["implementationId"] ? c["implementationId"].as<uint32_t>() : 0;
            info.origin = c["origin"] ? c["origin"].as<std::string>() : "Unknown";
            info.status = c["status"] ? c["status"].as<std::string>() : "active";
            info.version = safeAsInt(c["version"], 1);
            info.visible = c["visible"] ? c["visible"].as<bool>() : true;
            info.rack = c["rack"] ? c["rack"].as<std::string>() : "upper";
            info.description = c["description"] ? c["description"].as<std::string>() : "";

            if (c["layout"]) {
                if (c["layout"]["hp"]) info.hp = safeAsInt(c["layout"]["hp"], 0);
                if (c["layout"]["rack"]) info.rack = c["layout"]["rack"].as<std::string>();
            }

            if (c["registry"]) {
                for (auto r : c["registry"]) {
                    try {
                        std::string id = r["id"].as<std::string>();
                        std::string label = r["label"] ? r["label"].as<std::string>() : id;
                        std::string direction = r["direction"] ? r["direction"].as<std::string>() : "input";
                        float defVal = safeAsFloat(r["default"], 0.0f);
                        if (!r["default"] && r["range"] && r["range"]["default"]) 
                            defVal = safeAsFloat(r["range"]["default"], 0.0f);

                        // Roles parsing
                        bool isControl = false;
                        bool isPort = false;
                        if (r["roles"]) {
                            for (auto role : r["roles"]) {
                                std::string s = role.as<std::string>();
                                if (s == "control" || s == "mod_target") isControl = true;
                                if (s == "output" || s == "stream" || s == "mod_source") isPort = true;
                            }
                        }

                        if (isControl) {
                            ParameterDef pdef;
                            pdef.id = id;
                            pdef.label = label;
                            pdef.defaultValue = defVal;
                            if (r["range"]) {
                                pdef.min = safeAsFloat(r["range"]["min"], 0.0f);
                                pdef.max = safeAsFloat(r["range"]["max"], 1.0f);
                            }
                            info.parameters.push_back(pdef);
                            info.defaultParams[id] = defVal;
                        }

                        if (isPort) {
                            Modulation::ModPortType portType = Modulation::ModPortType::CV;
                            if (r["type"]) {
                                std::string t = r["type"].as<std::string>();
                                if (t == "audio") portType = Modulation::ModPortType::Audio;
                                else if (t == "midi") portType = Modulation::ModPortType::MIDI;
                                else if (t == "bool" || t == "logic" || t == "gate") portType = Modulation::ModPortType::Gate;
                            }
                            info.ports.push_back({id, label, portType, (direction == "input"), -1, defVal});
                        }
                    } catch (...) {
                        ::juce::Logger::writeToLog("ACE WARN: Skipping malformed registry entry in module " + ::juce::String(info.id));
                    }
                }
            }


            // UI Layout Generation
            if (c["uiLayout"] || c["registry"]) {
                std::stringstream ss;
                ss << "{\"uiLayout\": {";
                ss << "\"columns\": " << (c["layout"] && c["layout"]["columns"] ? safeAsInt(c["layout"]["columns"], 1) : (c["uiLayout"] && c["uiLayout"]["columns"] ? safeAsInt(c["uiLayout"]["columns"], 1) : 1)) << ", ";
                ss << "\"rows\": " << (c["uiLayout"] && c["uiLayout"]["rows"] ? safeAsInt(c["uiLayout"]["rows"], 1) : 1);
                ss << "}, \"items\": [";
                
                bool first = true;
                if (c["uiLayout"] && c["uiLayout"]["items"]) {
                    for (auto item : c["uiLayout"]["items"]) {
                        if (!first) ss << ", ";
                        ss << "{";
                        bool firstProp = true;
                        for (auto const& prop : item) {
                            if (!firstProp) ss << ", ";
                            ss << "\"" << prop.first.as<std::string>() << "\": ";
                            if (prop.second.IsScalar()) {
                                try { ss << prop.second.as<float>(); } catch (...) { ss << "\"" << prop.second.as<std::string>() << "\""; }
                            } else { ss << "\"complex_node\""; }
                            firstProp = false;
                        }
                        ss << "}";
                        first = false;
                    }
                }

                if (c["registry"]) {
                    for (auto r : c["registry"]) {
                        if (r["presentation"] && r["presentation"]["ui"]) {
                            if (!first) ss << ", ";
                            ss << "{\"id\": \"" << r["id"].as<std::string>() << "\", ";
                            ss << "\"paramId\": \"" << r["id"].as<std::string>() << "\", ";
                            ss << "\"label\": \"" << (r["label"] ? r["label"].as<std::string>() : r["id"].as<std::string>()) << "\", ";
                            ss << "\"look\": \"" << (r["presentation"]["ui"]["component"] ? r["presentation"]["ui"]["component"].as<std::string>() : "knob") << "\", ";
                            ss << "\"tab\": \"" << (r["presentation"]["tab"] ? r["presentation"]["tab"].as<std::string>() : "MAIN") << "\", ";
                            ss << "\"group\": \"" << (r["presentation"]["group"] ? r["presentation"]["group"].as<std::string>() : "") << "\", ";
                            ss << "\"order\": " << (r["presentation"]["order"] ? safeAsInt(r["presentation"]["order"], 0) : 0) << ", ";
                            ss << "\"row\": " << (r["row"] ? safeAsInt(r["row"], 0) : 0) << ", ";
                            ss << "\"col\": " << (r["col"] ? safeAsInt(r["col"], 0) : 0) << "}";
                            first = false;
                        }
                    }
                }
                ss << "]}";
                info.uiLayout = ss.str();
            }
            
            if (c["style"]) info.style = c["style"].as<std::string>();
            else if (c["panelClass"]) info.style = c["panelClass"].as<std::string>();

        } catch (const std::exception& e) {
            ::juce::Logger::writeToLog("ACE ERROR: Failed to parse component node. Reason: " + ::juce::String(e.what()));
        }
    }

    std::unique_ptr<AceCatalog> AceCatalog::createFromResources(const std::filesystem::path& resourcesDir) {
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

    void AceCatalog::registerComponent(const ComponentInfo& info) {
        if (info.id.empty()) return;
        ::juce::Logger::writeToLog("ACE CATALOG: Registered component [" + ::juce::String(info.id) + "] (ImplID: " + ::juce::String((int)info.implementationId) + ")");
        mComponents[info.id] = info;
    }

    const ComponentInfo* AceCatalog::getComponent(const std::string& id) const {
        auto it = mComponents.find(id);
        if (it != mComponents.end()) return &it->second;
        return nullptr;
    }

    std::vector<const ComponentInfo*> AceCatalog::listByFamilyAndEngine(const std::string& family, const std::string& engine) const {
        std::vector<const ComponentInfo*> results;
        for (auto const& pair : mComponents) {
            if (pair.second.family == family && pair.second.engine == engine) results.push_back(&pair.second);
        }
        return results;
    }

    std::vector<const ComponentInfo*> AceCatalog::getComponents() const {
        std::vector<const ComponentInfo*> results;
        for (auto const& pair : mComponents) results.push_back(&pair.second);
        return results;
    }

    std::string AceCatalog::getFallbackId(const std::string& family, const std::string& engine) const {
        auto key = family + "|" + engine;
        auto it = mFallbacks.find(key);
        if (it != mFallbacks.end()) return it->second;
        return "";
    }

    void AceCatalog::buildFallbacks() {
        mFallbacks.clear();
        for (auto const& pair : mComponents) {
            auto key = pair.second.family + "|" + pair.second.engine;
            if (mFallbacks.find(key) == mFallbacks.end()) mFallbacks[key] = pair.second.id;
        }
    }

    bool AceCatalog::loadFromDirectory(const juce::File& directory) {
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

    bool AceCatalog::loadFromModulesDirectory(const ::juce::File& modulesDir) {
        if (!modulesDir.isDirectory()) return false;
        ::juce::Logger::writeToLog("ACE DEBUG: Discovery scanning modules at -> " + modulesDir.getFullPathName());
        ::juce::DirectoryIterator it(modulesDir, false, "*", ::juce::File::findDirectories);
        bool anyFound = false;
        while (it.next()) {
            ::juce::File moduleFolder = it.getFile();
            if (moduleFolder.isDirectory()) {
                ::juce::String id = moduleFolder.getFileName();
                ::juce::File yamlFile = moduleFolder.getChildFile(id + ".yaml");
                if (yamlFile.exists()) {
                    try {
                        ::juce::Logger::writeToLog("ACE DEBUG:   Parsing YAML...");
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
                            ::juce::Logger::writeToLog("ACE DEBUG:   Successfully registered module: " + id);
                        }
                    } catch (const std::exception& e) {
                        ::juce::Logger::writeToLog("ACE ERROR: Critical failure parsing module '" + id + "'. Reason: " + ::juce::String(e.what()));
                    } catch (...) {
                        ::juce::Logger::writeToLog("ACE ERROR: Unknown error loading Atomic Module: " + id);
                    }
                } else {
                    ::juce::Logger::writeToLog("ACE DEBUG:   Skipping folder " + id + " (No manifest found).");
                }
            }
        }
        if (anyFound) buildFallbacks();
        return anyFound;
    }

} // namespace Omega::Core::Ace
