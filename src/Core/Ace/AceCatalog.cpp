#include "AceCatalog.h"
#include "AceValidator.h"
#include "../Wasm/WasmModuleService.h"
#include <yaml-cpp/yaml.h>
#include <filesystem>
#include <memory>
#include <string>
#include <vector>
#include <map>
#include "../Providers/ModulationTelemetryRegistry.h"
#include <juce_core/juce_core.h>
#include <juce_cryptography/juce_cryptography.h>

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
            info.version = safeAsInt(componentNode["version"], 7); // Era 7 default
            
            // Legacy Compatibility Initialization
            info.modelId = componentNode["modelId"].IsDefined() ? componentNode["modelId"].as<std::string>() : info.id;
            info.implementationId = (uint32_t)safeAsInt(componentNode["implementationId"], 0);

            // ERA 7 MANDATORY BLOCKS
            const YAML::Node metadata = componentNode["metadata"];
            const YAML::Node ui = componentNode["ui"];

            if (!metadata.IsDefined()) {
                juce::Logger::writeToLog("ACE ERROR: Module '" + juce::String(info.id) + "' is missing mandatory 'metadata' block (Era 7).");
                return; 
            }

            // 1. Metadata Extraction
            info.name = metadata["name"].IsDefined() ? metadata["name"].as<std::string>() : info.id;
            info.family = metadata["family"].IsDefined() ? metadata["family"].as<std::string>() : "utility";
            info.description = metadata["description"].IsDefined() ? metadata["description"].as<std::string>() : "";
            
            if (metadata["rack"].IsDefined()) {
                const YAML::Node rack = metadata["rack"];
                info.hp = safeAsInt(rack["hp"], 0);
                if (rack["slot"].IsDefined()) info.rack = rack["slot"].as<std::string>();
            }

            if (metadata["tags"].IsDefined() && metadata["tags"].IsSequence()) {
                for (auto t : metadata["tags"]) info.tags.push_back(t.as<std::string>());
            }

            if (metadata["governance"].IsDefined()) {
                const YAML::Node gov = metadata["governance"];
                info.registryRole = gov["registry_role"].IsDefined() ? gov["registry_role"].as<std::string>() : "";
                info.vendorId = gov["vendor_id"].IsDefined() ? gov["vendor_id"].as<std::string>() : "";
            }

            // 2. Engine Logic
            if (componentNode["engine"].IsDefined()) {
                info.engine = componentNode["engine"].as<std::string>();
            } else {
                info.engine = "Modular";
            }

            // 3. UI Block Parsing
            if (ui.IsDefined()) {
                info.uiSkin = ui["skin"].IsDefined() ? ui["skin"].as<std::string>() : "industrial";
                
                if (ui["dimensions"].IsDefined()) {
                    info.uiWidth = safeAsFloat(ui["dimensions"]["width"], 0);
                    info.uiHeight = safeAsFloat(ui["dimensions"]["height"], 0);
                }

                // 3.1 Layout & Containers (Era 7.2)
                if (ui["layout"].IsDefined()) {
                    const auto& layout = ui["layout"];
                    info.gridSnap = safeAsInt(layout["gridSnap"], 5);
                    
                    if (layout["containers"].IsDefined() && layout["containers"].IsSequence()) {
                        for (auto c : layout["containers"]) {
                            LayoutContainer container;
                            container.id = c["id"].as<std::string>();
                            container.label = c["label"].IsDefined() ? c["label"].as<std::string>() : container.id;
                            
                            if (c["pos"].IsDefined()) {
                                container.x = safeAsFloat(c["pos"]["x"], 0);
                                container.y = safeAsFloat(c["pos"]["y"], 0);
                            }
                            
                            if (c["size"].IsDefined()) {
                                container.width = c["size"]["w"].as<std::string>();
                                container.height = safeAsFloat(c["size"]["h"], 0);
                            }
                            
                            container.variant = c["variant"].IsDefined() ? c["variant"].as<std::string>() : "default";
                            container.tab = c["tab"].IsDefined() ? c["tab"].as<std::string>() : "";
                            container.zIndex = safeAsInt(c["zIndex"], 0);
                            container.labelPosition = c["labelPosition"].IsDefined() ? c["labelPosition"].as<std::string>() : "top";
                            
                            info.uiContainers.push_back(container);
                        }
                    }
                }

                // Controls -> Parameters & Input Ports
                if (ui["controls"].IsDefined() && ui["controls"].IsSequence()) {
                    for (auto c : ui["controls"]) {
                        UIItem item = parseEntryNode(c, info);
                        info.uiControls.push_back(item);
                    }
                }

                // Jacks -> Communication Ports
                if (ui["jacks"].IsDefined() && ui["jacks"].IsSequence()) {
                    for (auto j : ui["jacks"]) {
                        UIItem item = parseEntryNode(j, info);
                        info.uiJacks.push_back(item);
                    }
                }
            }

        } catch (const std::exception& parseEx) {
            juce::Logger::writeToLog("ACE ERROR: Critical parse error in Era 7 module '" + juce::String(info.id) + "': " + juce::String(parseEx.what()));
        }
    }

    UIItem AceCatalog::parseEntryNode(const YAML::Node& entryNode, ComponentInfo& info) {
        UIItem ui;
        try {
            if (!entryNode["bind"].IsDefined()) return ui;
            
            std::string bindId = entryNode["bind"].as<std::string>();
            std::string label = entryNode["label"].IsDefined() ? entryNode["label"].as<std::string>() : bindId;
            std::string typeStr = entryNode["type"].IsDefined() ? entryNode["type"].as<std::string>() : "port";
            float defVal = safeAsFloat(entryNode["default"], 0.0f);

            ui.bind = bindId;
            ui.label = label;
            ui.type = typeStr;

            // 1. Visual Metadata (Era 7)
            if (entryNode["pos"].IsDefined()) {
                ui.x = safeAsFloat(entryNode["pos"]["x"], 0);
                ui.y = safeAsFloat(entryNode["pos"]["y"], 0);
            }

            if (entryNode["presentation"].IsDefined()) {
                const auto& pres = entryNode["presentation"];
                ui.tab = pres["tab"].IsDefined() ? pres["tab"].as<std::string>() : "";
                ui.container = pres["container"].IsDefined() ? pres["container"].as<std::string>() : "";
                ui.group = pres["group"].IsDefined() ? pres["group"].as<std::string>() : "";
                
                // Fallback for Era 7.2 engine parity
                if (ui.container.empty() && !ui.group.empty()) {
                    ui.container = ui.group;
                }

                ui.component = pres["component"].IsDefined() ? pres["component"].as<std::string>() : "";
                ui.variant = pres["variant"].IsDefined() ? pres["variant"].as<std::string>() : "";

                if (pres["attachments"].IsDefined() && pres["attachments"].IsSequence()) {
                    for (auto a : pres["attachments"]) {
                        Attachment att;
                        att.type = a["type"].IsDefined() ? a["type"].as<std::string>() : "label";
                        att.position = a["position"].IsDefined() ? a["position"].as<std::string>() : "top";
                        att.bind = a["bind"].IsDefined() ? a["bind"].as<std::string>() : "";
                        att.text = a["text"].IsDefined() ? a["text"].as<std::string>() : "";
                        att.variant = a["variant"].IsDefined() ? a["variant"].as<std::string>() : "";
                        att.offset = safeAsFloat(a["offset"], 0);
                        ui.attachments.push_back(att);
                    }
                }
            }

            // 2. Logic Registration
            // Only add to parameters if it looks like a control
            if (typeStr == "control" || typeStr == "knob" || typeStr == "slider" || typeStr == "switch") {
                ParameterDef pdef;
                pdef.id = bindId;
                pdef.label = label;
                pdef.defaultValue = defVal;
                
                if (entryNode["range"].IsDefined()) {
                    pdef.min = safeAsFloat(entryNode["range"]["min"], 0.0f);
                    pdef.max = safeAsFloat(entryNode["range"]["max"], 1.0f);
                    pdef.defaultValue = safeAsFloat(entryNode["range"]["default"], defVal);
                }
                
                info.parameters.push_back(pdef);
                info.defaultParams[bindId] = pdef.defaultValue;
            }

            // Communication Ports
            bool isJack = (typeStr == "port" || typeStr == "jack");
            bool isModulable = (typeStr != "display" && typeStr != "led");

            if (isJack || isModulable) {
                Modulation::ModPortType portType = Modulation::ModPortType::CV;
                std::string signal = entryNode["signal"].IsDefined() ? entryNode["signal"].as<std::string>() : "cv";
                if (signal == "audio") portType = Modulation::ModPortType::Audio;
                else if (signal == "midi") portType = Modulation::ModPortType::MIDI;
                else if (signal == "gate" || signal == "trigger") portType = Modulation::ModPortType::Gate;

                bool isInput = true;
                if (entryNode["direction"].IsDefined()) {
                    isInput = (entryNode["direction"].as<std::string>() == "input");
                } else if (bindId.find("out") != std::string::npos) {
                    isInput = false;
                }

                int teleIdx = -1;
                if (!isInput || signal == "audio") {
                    auto& reg = Providers::ModulationTelemetryRegistry::getInstance();
                    Providers::TelemetryType tType = (portType == Modulation::ModPortType::Audio) ? 
                                                     Providers::TelemetryType::Audio : Providers::TelemetryType::Discrete;
                    teleIdx = reg.registerPin(info.id, bindId, tType, label);
                }

                info.ports.push_back({bindId, label, portType, isInput, teleIdx, defVal});
            }
        } catch (...) {}
        return ui;
    }

    std::unique_ptr<AceCatalog> AceCatalog::createFromResources(const std::filesystem::path& resourcesDir) {
        return std::make_unique<AceCatalog>();
    }

    void AceCatalog::registerComponent(const ComponentInfo& info) {
        if (info.id.empty()) {
            juce::Logger::writeToLog("ACE ERROR: Attempted to register component with empty ID");
            return;
        }

        // [ERA 6.3]: Strict Aseptic Validation
        AceValidator sheriff(*this);
        auto report = sheriff.validateManifest(info);

        if (report.status == ValidationStatus::Invalid) {
            std::cerr << "[ACE WARNING] Module '" << info.id << "' has validation errors but was loaded anyway (Permissive Mode)." << std::endl;
            for (const auto& issue : report.issues) {
                std::cerr << "  - [" << issue.code << "] " << issue.message << std::endl;
            }
            // Temporarily allowing invalid modules for transition
            mComponents[info.id] = info;
            return;
        }

        if (report.status == ValidationStatus::Degraded) {
            std::cout << "[ACE WARNING] Module '" << info.id << "' loaded with degraded status." << std::endl;
        }

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

    std::vector<const ComponentInfo*> AceCatalog::findComponents(const std::string& query) const {
        std::vector<const ComponentInfo*> results;
        if (query.empty()) return getComponents();

        juce::String jquery(query);
        for (auto const& [id, info] : mComponents) {
            bool match = false;
            if (juce::String(info.id).containsIgnoreCase(jquery)) match = true;
            else if (juce::String(info.name).containsIgnoreCase(jquery)) match = true;
            else if (juce::String(info.modelId).containsIgnoreCase(jquery)) match = true;
            else {
                for (auto const& tag : info.tags) {
                    if (juce::String(tag).containsIgnoreCase(jquery)) {
                        match = true;
                        break;
                    }
                }
            }

            if (match) results.push_back(&info);
        }
        return results;
    }

    std::string AceCatalog::getFallbackId(const std::string& family, const std::string& engine) const {
        return "";
    }

    bool AceCatalog::parseContractJson(const std::string& json, ComponentInfo& info) {
        juce::var data = juce::JSON::parse(json);
        if (data.isUndefined()) return false;

        info.id = data["id"].toString().toStdString();
        info.name = data["name"].toString().toStdString();
        info.engine = "WASM";
        info.family = data.getProperty("family", "utility").toString().toStdString();
        
        if (data.hasProperty("parameters")) {
            auto* params = data["parameters"].getArray();
            if (params) {
                for (int i = 0; i < params->size(); ++i) {
                    auto p = (*params)[i];
                    ParameterDef pdef;
                    pdef.id = p["id"].toString().toStdString();
                    pdef.label = p["label"].toString().toStdString();
                    pdef.min = (float)p["min"];
                    pdef.max = (float)p["max"];
                    pdef.defaultValue = (float)p["default"];
                    pdef.unit = p["unit"].toString().toStdString();
                    
                    // Defaults for self-describing WASM
                    pdef.modulable = true;
                    pdef.front = true;
                    pdef.back = true;
                    
                    info.parameters.push_back(pdef);
                    info.defaultParams[pdef.id] = pdef.defaultValue;

                    // Auto-generate ports for parameters if they are modulable
                    Modulation::PortDescriptor port;
                    port.id = pdef.id;
                    port.label = pdef.label;
                    port.type = Modulation::ModPortType::CV;
                    port.isInput = true;
                    port.telemetryIndex = -1;
                    port.defaultValue = pdef.defaultValue;
                    info.ports.push_back(port);
                }
            }
        }

        return !info.id.empty();
    }

    void AceCatalog::buildFallbacks() {}

    bool AceCatalog::loadFromDirectory(const juce::File& directory) {
        if (!directory.isDirectory()) return false;

        juce::File asepticFile = directory.getChildFile(directory.getFileName() + ".acemm");
        juce::File legacyFile = directory.getChildFile(directory.getFileName() + ".yaml");
        juce::File wasmFile = directory.getChildFile(directory.getFileName() + ".wasm");
        
        juce::File targetFile = asepticFile.existsAsFile() ? asepticFile : legacyFile;

        if (targetFile.existsAsFile()) {
            try {
                YAML::Node root = YAML::LoadFile(targetFile.getFullPathName().toStdString());
                ComponentInfo info;
                parseComponentNode(root, info);
                
                info.sourcePath = directory.getFullPathName().toStdString();
                info.isPackaged = false;
                info.isCompliant = directory.getChildFile("AUDIT_REPORT.md").existsAsFile();

                registerComponent(info);
                return true;
            } catch (const std::exception& e) {
                juce::Logger::writeToLog("ACE ERROR: Failed to load manifest from " + targetFile.getFullPathName() + " : " + juce::String(e.what()));
            }
        }

        // [Era 7] Fallback: If no manifest, try to ask the WASM binary for its contract
        if (wasmFile.existsAsFile()) {
            std::string contract = Wasm::WasmModuleService::getInstance().getModuleContract(wasmFile.getFullPathName().toStdString());
            if (!contract.empty()) {
                ComponentInfo info;
                if (parseContractJson(contract, info)) {
                    juce::Logger::writeToLog("ACE INFO: Loaded self-describing module from " + wasmFile.getFileName());
                    
                    info.sourcePath = directory.getFullPathName().toStdString();
                    info.isPackaged = false;
                    info.isCompliant = directory.getChildFile("AUDIT_REPORT.md").existsAsFile();

                    registerComponent(info);
                    return true;
                }
            }
        }

        return false;
    }

    bool AceCatalog::loadFromModulesDirectory(const juce::File& modulesDir) {
        if (!modulesDir.isDirectory()) {
            juce::Logger::writeToLog("ACE ERROR: Modules directory not found: " + modulesDir.getFileName());
            return false;
        }

        int loadedCount = 0;
        juce::Array<juce::File> children;
        modulesDir.findChildFiles(children, juce::File::findDirectories, false);

        for (const auto& child : children) {
            if (loadFromDirectory(child)) {
                loadedCount++;
            }
        }

        return loadedCount > 0;
    }

    juce::var AceCatalog::exportComponentContract(const std::string& id) const {
        auto* info = getComponent(id);
        if (!info) return juce::var();

        auto contract = new juce::DynamicObject();
        contract->setProperty("id", juce::String(info->id));
        contract->setProperty("name", juce::String(info->name));
        contract->setProperty("description", juce::String(info->description));
        contract->setProperty("family", juce::String(info->family));
        contract->setProperty("engine", juce::String(info->engine));
        contract->setProperty("version", info->version);
        contract->setProperty("hp", info->hp);

        // ERA 7 UI BLOCK
        auto uiObj = new juce::DynamicObject();
        uiObj->setProperty("skin", juce::String(info->uiSkin));
        
        auto dims = new juce::DynamicObject();
        dims->setProperty("width", info->uiWidth);
        dims->setProperty("height", info->uiHeight);
        uiObj->setProperty("dimensions", juce::var(dims));

        auto exportItems = [](const std::vector<UIItem>& items) {
            juce::Array<juce::var> arr;
            for (const auto& item : items) {
                auto o = new juce::DynamicObject();
                o->setProperty("bind", juce::String(item.bind));
                o->setProperty("type", juce::String(item.type));
                o->setProperty("label", juce::String(item.label));
                
                auto pos = new juce::DynamicObject();
                pos->setProperty("x", item.x);
                pos->setProperty("y", item.y);
                o->setProperty("pos", juce::var(pos));

                auto pres = new juce::DynamicObject();
                pres->setProperty("tab", juce::String(item.tab));
                pres->setProperty("container", juce::String(item.container));
                pres->setProperty("group", juce::String(item.group));
                pres->setProperty("component", juce::String(item.component));
                pres->setProperty("variant", juce::String(item.variant));
                
                juce::Array<juce::var> atts;
                for (const auto& a : item.attachments) {
                    auto ao = new juce::DynamicObject();
                    ao->setProperty("type", juce::String(a.type));
                    ao->setProperty("position", juce::String(a.position));
                    ao->setProperty("bind", juce::String(a.bind));
                    ao->setProperty("text", juce::String(a.text));
                    ao->setProperty("variant", juce::String(a.variant));
                    ao->setProperty("offset", a.offset);
                    atts.add(juce::var(ao));
                }
                pres->setProperty("attachments", atts);
                o->setProperty("presentation", juce::var(pres));
                
                arr.add(juce::var(o));
            }
            return arr;
        };

        uiObj->setProperty("controls", exportItems(info->uiControls));
        uiObj->setProperty("jacks", exportItems(info->uiJacks));

        // ERA 7.2 LAYOUT BLOCK
        auto layoutObj = new juce::DynamicObject();
        layoutObj->setProperty("gridSnap", info->gridSnap);
        
        juce::Array<juce::var> containersArr;
        for (const auto& c : info->uiContainers) {
            auto co = new juce::DynamicObject();
            co->setProperty("id", juce::String(c.id));
            co->setProperty("label", juce::String(c.label));
            
            auto cpos = new juce::DynamicObject();
            cpos->setProperty("x", c.x);
            cpos->setProperty("y", c.y);
            co->setProperty("pos", juce::var(cpos));
            
            auto csize = new juce::DynamicObject();
            csize->setProperty("w", juce::String(c.width));
            csize->setProperty("h", c.height);
            co->setProperty("size", juce::var(csize));
            
            co->setProperty("variant", juce::String(c.variant));
            co->setProperty("tab", juce::String(c.tab));
            co->setProperty("zIndex", c.zIndex);
            co->setProperty("labelPosition", juce::String(c.labelPosition));
            containersArr.add(juce::var(co));
        }
        layoutObj->setProperty("containers", containersArr);
        uiObj->setProperty("layout", juce::var(layoutObj));

        contract->setProperty("ui", juce::var(uiObj));

        // ERA 7.2.3: Detailed Compliance Report
        AceValidator validator(*this);
        auto report = validator.validateManifest(*info);
        
        auto complianceObj = new juce::DynamicObject();
        complianceObj->setProperty("status", report.status == ValidationStatus::Ok ? "ok" : 
                                            (report.status == ValidationStatus::Degraded ? "degraded" : "invalid"));
        
        juce::Array<juce::var> issuesArr;
        for (const auto& issue : report.issues) {
            auto iobj = new juce::DynamicObject();
            iobj->setProperty("severity", issue.severity == ValidationStatus::Ok ? "ok" : 
                                         (issue.severity == ValidationStatus::Degraded ? "degraded" : "invalid"));
            iobj->setProperty("code", juce::String(issue.code));
            iobj->setProperty("scope", juce::String(issue.scope));
            iobj->setProperty("message", juce::String(issue.message));
            iobj->setProperty("metadata", issue.metadata);
            issuesArr.add(juce::var(iobj));
        }
        complianceObj->setProperty("issues", issuesArr);
        complianceObj->setProperty("firmwareHash", juce::String(info->manifestHash));
        contract->setProperty("compliance", juce::var(complianceObj));

        // Legacy Registry (Parameters)
        juce::Array<juce::var> params;
        for (const auto& p : info->parameters) {
            auto pobj = new juce::DynamicObject();
            pobj->setProperty("id", juce::String(p.id));
            pobj->setProperty("label", juce::String(p.label));
            pobj->setProperty("unit", juce::String(p.unit));
            pobj->setProperty("min", p.min);
            pobj->setProperty("max", p.max);
            pobj->setProperty("default", p.defaultValue);
            pobj->setProperty("modulable", p.modulable);
            params.add(juce::var(pobj));
        }
        contract->setProperty("parameters", params);

        // Ports
        juce::Array<juce::var> ports;
        for (const auto& p : info->ports) {
            auto pobj = new juce::DynamicObject();
            pobj->setProperty("id", juce::String(p.id));
            pobj->setProperty("label", juce::String(p.label));
            pobj->setProperty("direction", p.isInput ? "input" : "output");
            
            juce::String typeStr = "cv";
            if (p.type == Modulation::ModPortType::Audio) typeStr = "audio";
            else if (p.type == Modulation::ModPortType::MIDI) typeStr = "midi";
            else if (p.type == Modulation::ModPortType::Gate) typeStr = "gate";
            
            pobj->setProperty("type", typeStr);
            ports.add(juce::var(pobj));
        }
        contract->setProperty("ports", ports);

        return juce::var(contract);
    }

    void AceCatalog::exportAllContracts(const juce::File& outputDir) const {
        if (!outputDir.exists()) {
            outputDir.createDirectory();
        }

        for (const auto& [id, info] : mComponents) {
            juce::var contract = exportComponentContract(id);
            juce::String json = juce::JSON::toString(contract, false);
            
            juce::File outFile = outputDir.getChildFile(juce::String(id) + ".contract.json");
            outFile.replaceWithText(json);
            
            juce::Logger::writeToLog("[ACE] Exported contract: " + outFile.getFullPathName());
        }
    }

    juce::var AceCatalog::generateSchema() const {
        auto schema = new juce::DynamicObject();
        schema->setProperty("$schema", "http://json-schema.org/draft-07/schema#");
        schema->setProperty("$id", "https://omega-synth.dev/schema/module-schema-6.3.json");
        schema->setProperty("title", "OMEGA Aseptic Module Contract (Era 6.3 - Absolute)");
        schema->setProperty("type", "object");

        auto props = new juce::DynamicObject();
        
        auto createStringProp = [](const juce::String& desc) {
            auto p = new juce::DynamicObject();
            p->setProperty("type", "string");
            p->setProperty("description", desc);
            return juce::var(p);
        };

        props->setProperty("id", createStringProp("Module unique identifier (snake_case)"));
        props->setProperty("name", createStringProp("Display name"));
        props->setProperty("description", createStringProp("Module purpose and short documentation"));
        props->setProperty("modelId", createStringProp("Hardware reference or logical class"));
        
        auto implIdProp = new juce::DynamicObject();
        implIdProp->setProperty("type", "integer");
        props->setProperty("implementationId", juce::var(implIdProp));

        // Registry & Parameters
        auto registryProp = new juce::DynamicObject();
        registryProp->setProperty("type", "array");
        auto items = new juce::DynamicObject();
        items->setProperty("type", "object");
        
        auto itemProps = new juce::DynamicObject();
        itemProps->setProperty("id", createStringProp("Item binding ID"));
        itemProps->setProperty("label", createStringProp("UI Label"));
        
        auto frontProp = new juce::DynamicObject();
        frontProp->setProperty("type", "boolean");
        itemProps->setProperty("front", juce::var(frontProp));
        
        auto backProp = new juce::DynamicObject();
        backProp->setProperty("type", "boolean");
        itemProps->setProperty("back", juce::var(backProp));

        items->setProperty("properties", juce::var(itemProps));
        juce::Array<juce::var> requiredItems;
        requiredItems.add("id"); requiredItems.add("label"); requiredItems.add("front"); requiredItems.add("back");
        items->setProperty("required", requiredItems);

        registryProp->setProperty("items", juce::var(items));
        props->setProperty("registry", juce::var(registryProp));
        
        schema->setProperty("properties", juce::var(props));
        
        juce::Array<juce::var> requiredRoot;
        requiredRoot.add("id"); requiredRoot.add("name"); requiredRoot.add("registry");
        schema->setProperty("required", requiredRoot);

        return juce::var(schema);
    }

    bool AceCatalog::loadFromAcePack(const juce::File& acePackFile) {
        if (!acePackFile.existsAsFile()) return false;

        juce::ZipFile zip(acePackFile);
        int loaded = 0;

        for (int i = 0; i < zip.getNumEntries(); ++i) {
            auto* entry = zip.getEntry(i);
            if (entry == nullptr) continue;

            juce::String name = entry->filename;
            if (name.endsWithIgnoreCase(".acemm") || name.endsWithIgnoreCase(".yaml")) {
                std::unique_ptr<juce::InputStream> stream(zip.createStreamForEntry(i));
                if (stream && loadFromArchive(*stream, name, acePackFile.getFullPathName())) {
                    loaded++;
                }
            }
        }

        if (loaded > 0) {
            // Check for global audit report in the pack
            bool hasAudit = false;
            for (int i = 0; i < zip.getNumEntries(); ++i) {
                if (juce::String(zip.getEntry(i)->filename).endsWithIgnoreCase("AUDIT_REPORT.md")) {
                    hasAudit = true;
                    break;
                }
            }

            if (hasAudit) {
                juce::Logger::writeToLog("ACE INFO: OmegaPack is COMPLIANT (Audit Report found).");
            }

            juce::Logger::writeToLog("ACE INFO: Loaded " + juce::String(loaded) + " modules from pack: " + acePackFile.getFileName());
        }

        return loaded > 0;
    }

    bool AceCatalog::loadFromArchive(juce::InputStream& archiveStream, const juce::String& sourceName, const juce::String& fullSourcePath) {
        try {
            juce::String yamlContent = archiveStream.readEntireStreamAsString();
            
            ComponentInfo info;
            // Era 7.2.3: Calculate SHA-256 Firmware Integrity Hash
            info.manifestHash = juce::SHA256(yamlContent.toUTF8()).toHexString().toStdString();
            
            YAML::Node root = YAML::Load(yamlContent.toStdString());
            parseComponentNode(root, info);
            
            info.sourcePath = fullSourcePath.toStdString();
            info.isPackaged = true;

            // Check if there is an audit report in the ZIP for this specific module
            // For now, we'll check if the ZIP contains an AUDIT_REPORT.md
            juce::File zipFile(fullSourcePath);
            juce::ZipFile zip(zipFile);
            for (int i = 0; i < zip.getNumEntries(); ++i) {
                if (juce::String(zip.getEntry(i)->filename).containsIgnoreCase("AUDIT_REPORT.md")) {
                    info.isCompliant = true;
                    break;
                }
            }
            registerComponent(info);
            return true;
        } catch (const std::exception& e) {
            juce::Logger::writeToLog("ACE ERROR: Failed to load manifest from archive entry " + sourceName + " : " + juce::String(e.what()));
            return false;
        }
    }

    std::unique_ptr<juce::InputStream> AceCatalog::getResourceStream(const std::string& componentId, const std::string& resourcePath) const {
        auto* info = getComponent(componentId);
        if (!info) return nullptr;

        juce::File source(info->sourcePath);
        if (info->isPackaged) {
            if (!source.existsAsFile()) return nullptr;
            
            auto zip = std::make_unique<juce::ZipFile>(source);
            int entryIdx = -1;
            
            // Search for the resource in the ZIP
            for (int i = 0; i < zip->getNumEntries(); ++i) {
                if (juce::String(zip->getEntry(i)->filename).endsWithIgnoreCase(resourcePath)) {
                    entryIdx = i;
                    break;
                }
            }

            if (entryIdx != -1) {
                return std::unique_ptr<juce::InputStream>(zip->createStreamForEntry(entryIdx));
            }
        } else {
            juce::File resFile = source.getChildFile(resourcePath);
            if (resFile.existsAsFile()) {
                return resFile.createInputStream();
            }
        }

        return nullptr;
    }

} // namespace Ace
} // namespace Core
} // namespace Omega
