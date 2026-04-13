#include "AceCatalog.h"
#include <yaml-cpp/yaml.h>
#include <filesystem>
#include <memory>
#include <string>
#include <vector>
#include <map>
#include "../Providers/ModulationTelemetryRegistry.h"
#include <juce_core/juce_core.h>

namespace Omega {
namespace Core {
namespace Ace {

    static float safeAsFloat(const YAML::Node& node, float fallback) {
        if (node.IsDefined() == false || node.IsNull() == true) return fallback;
        try { return node.as<float>(); } catch (...) { return fallback; }
    }

    static int safeAsInt(const YAML::Node& node, int fallback) {
        if (node.IsDefined() == false || node.IsNull() == true) return fallback;
        try { return node.as<int>(); } catch (...) { return fallback; }
    }

    AceCatalog::AceCatalog() {}

    void AceCatalog::parseComponentNode(const YAML::Node& componentNode, ComponentInfo& info) {
        try {
            info.id = componentNode["id"].as<std::string>();
            
            if (componentNode["name"].IsDefined()) {
                info.name = componentNode["name"].as<std::string>();
            } else {
                info.name = info.id;
            }

            if (componentNode["family"].IsDefined()) {
                info.family = componentNode["family"].as<std::string>();
            } else {
                info.family = "Utility";
            }

            if (componentNode["engine"].IsDefined()) {
                info.engine = componentNode["engine"].as<std::string>();
            } else {
                info.engine = "Modular";
            }

            if (componentNode["modelId"].IsDefined()) {
                info.modelId = componentNode["modelId"].as<std::string>();
            } else {
                info.modelId = info.id;
            }

            if (componentNode["implementationId"].IsDefined()) {
                info.implementationId = componentNode["implementationId"].as<uint32_t>();
            } else {
                info.implementationId = 0;
            }

            info.version = safeAsInt(componentNode["version"], 1);

            if (componentNode["registry"].IsDefined() && componentNode["registry"].IsSequence()) {
                YAML::Node regSeq = componentNode["registry"];
                for (auto it = regSeq.begin(); it != regSeq.end(); ++it) {
                    YAML::Node entryNode = *it;
                    
                    std::string currentEntryId = "";
                    std::string currentEntryLabel = "";
                    std::string currentEntryDir = "input";
                    float currentEntryDefVal = 0.0f;
                    bool hasCtrl = false;
                    bool hasPort = false;
                    bool hasTele = false;

                    try {
                        currentEntryId = entryNode["id"].as<std::string>();
                        currentEntryLabel = entryNode["label"].IsDefined() ? entryNode["label"].as<std::string>() : currentEntryId;
                        currentEntryDir = entryNode["direction"].IsDefined() ? entryNode["direction"].as<std::string>() : "input";
                        currentEntryDefVal = safeAsFloat(entryNode["default"], 0.0f);
                        
                        if (entryNode["roles"].IsDefined() && entryNode["roles"].IsSequence()) {
                            YAML::Node rolesNode = entryNode["roles"];
                            for (auto rit = rolesNode.begin(); rit != rolesNode.end(); ++rit) {
                                std::string roleValue = rit->as<std::string>();
                                if (roleValue == "control" || roleValue == "mod_target") hasCtrl = true;
                                if (roleValue == "output" || roleValue == "stream" || roleValue == "mod_source") hasPort = true;
                                if (roleValue == "telemetry") hasTele = true;
                            }
                        }

                        if (hasCtrl) {
                            ParameterDef pdef;
                            pdef.id = currentEntryId;
                            pdef.label = currentEntryLabel;
                            pdef.defaultValue = currentEntryDefVal;
                            if (entryNode["range"].IsDefined()) {
                                pdef.min = safeAsFloat(entryNode["range"]["min"], 0.0f);
                                pdef.max = safeAsFloat(entryNode["range"]["max"], 1.0f);
                            }
                            info.parameters.push_back(pdef);
                            info.defaultParams[currentEntryId] = currentEntryDefVal;
                        }

                        if (hasPort || hasTele) {
                            Modulation::ModPortType portTypeVal = Modulation::ModPortType::CV;
                            if (entryNode["type"].IsDefined() && entryNode["type"].IsNull() == false) {
                                std::string typeStringVal = entryNode["type"].as<std::string>();
                                if (typeStringVal == "audio") portTypeVal = Modulation::ModPortType::Audio;
                                else if (typeStringVal == "midi") portTypeVal = Modulation::ModPortType::MIDI;
                                else if (typeStringVal == "bool" || typeStringVal == "logic" || typeStringVal == "gate") portTypeVal = Modulation::ModPortType::Gate;
                            }
                            
                            int finalTeleIdx = -1;
                            bool isOutPath = (currentEntryDir == "output");
                            bool entryHasType = (entryNode["type"].IsDefined() && entryNode["type"].IsNull() == false);
                            
                            if (hasTele || (isOutPath && entryHasType)) {
                                auto& telemetryRegistryStore = Providers::ModulationTelemetryRegistry::getInstance();
                                Providers::TelemetryType telemetryTypeVal = Providers::TelemetryType::Discrete;
                                if (entryHasType) {
                                    std::string typeNameStr = entryNode["type"].as<std::string>();
                                    if (typeNameStr == "audio") telemetryTypeVal = Providers::TelemetryType::Audio;
                                    else if (typeNameStr == "modulation") telemetryTypeVal = Providers::TelemetryType::Modulation;
                                }
                                finalTeleIdx = telemetryRegistryStore.registerPin(info.id, currentEntryId, telemetryTypeVal, currentEntryLabel);
                            }

                            info.ports.push_back({currentEntryId, currentEntryLabel, portTypeVal, (currentEntryDir == "input"), finalTeleIdx, currentEntryDefVal});
                        }
                    } catch (...) {
                        juce::Logger::writeToLog("ACE WARN: Entry error in " + juce::String(info.id));
                    }
                }
            }
        } catch (const std::exception& parseEx) {
            juce::Logger::writeToLog("ACE ERROR: Parse error: " + juce::String(parseEx.what()));
        }
    }

    std::unique_ptr<AceCatalog> AceCatalog::createFromResources(const std::filesystem::path& resourcesDir) {
        return std::make_unique<AceCatalog>();
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
            if (info.family == family && info.engine == engine) results.push_back(&info);
        }
        return results;
    }

    std::vector<const ComponentInfo*> AceCatalog::getComponents() const {
        std::vector<const ComponentInfo*> results;
        for (auto const& [id, info] : mComponents) results.push_back(&info);
        return results;
    }

    std::string AceCatalog::getFallbackId(const std::string& family, const std::string& engine) const {
        return "";
    }

    void AceCatalog::buildFallbacks() {}

    bool AceCatalog::loadFromDirectory(const juce::File& directory) {
        if (!directory.isDirectory()) return false;

        juce::File asepticFile = directory.getChildFile(directory.getFileName() + ".acemm");
        juce::File legacyFile = directory.getChildFile(directory.getFileName() + ".yaml");
        
        juce::File targetFile = asepticFile.existsAsFile() ? asepticFile : legacyFile;

        if (!targetFile.existsAsFile()) return false;

        try {
            YAML::Node root = YAML::LoadFile(targetFile.getFullPathName().toStdString());
            ComponentInfo info;
            parseComponentNode(root, info);
            registerComponent(info);
            return true;
        } catch (const std::exception& e) {
            juce::Logger::writeToLog("ACE ERROR: Failed to load manifest from " + targetFile.getFullPathName() + " : " + juce::String(e.what()));
            return false;
        }
    }

    bool AceCatalog::loadFromModulesDirectory(const juce::File& modulesDir) {
        if (!modulesDir.isDirectory()) {
            juce::Logger::writeToLog("ACE ERROR: Modules directory not found: " + modulesDir.getFullPathName());
            return false;
        }

        juce::Array<juce::File> children;
        modulesDir.findChildFiles(children, juce::File::findDirectories, false);

        int loadedCount = 0;
        for (const auto& child : children) {
            if (loadFromDirectory(child)) {
                loadedCount++;
            }
        }

        return loadedCount > 0;
    }

} // namespace Ace
} // namespace Core
} // namespace Omega
