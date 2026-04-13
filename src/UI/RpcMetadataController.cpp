#include "RpcMetadataController.h"
#include "../Plugin/OmegaAudioProcessor.h"
#include "../Core/BuildVersion.h"
#include "../Core/Modulation/ModuleManifest.h"
#include <juce_core/juce_core.h>

namespace Omega {
namespace UI {

    RpcMetadataController::RpcMetadataController(Plugin::OmegaAudioProcessor* processor)
        : mProcessor(processor) {}

    void RpcMetadataController::registerCommands(RpcCommandDispatcher& dispatcher) {
        dispatcher.registerHandler("getMetadata", [this](const juce::var& rid, const juce::var& p) { return handleGetMetadata(rid, p); });
        dispatcher.registerHandler("getSampleRate", [this](const juce::var& rid, const juce::var& p) { return handleGetSampleRate(rid, p); });
        dispatcher.registerHandler("getTempo", [this](const juce::var& rid, const juce::var& p) { return handleGetTempo(rid, p); });
        dispatcher.registerHandler("getInventory", [this](const juce::var& rid, const juce::var& p) { return handleGetInventory(rid, p); });
        dispatcher.registerHandler("getUiSchemas", [this](const juce::var& rid, const juce::var& p) { return handleGetUiSchemas(rid, p); });
    }

    juce::var RpcMetadataController::handleGetMetadata(const juce::var& requestId, const juce::var&) {
        auto& registry = Core::ParameterMetadataRegistry::getInstance();
        
        juce::DynamicObject::Ptr root = new juce::DynamicObject();
        root->setProperty("version", OMEGA_BUILD_VERSION); // Era 6 Sane versioning
        root->setProperty("build", OMEGA_BUILD_VERSION);
        root->setProperty("timestamp", OMEGA_BUILD_TIMESTAMP);
        root->setProperty("engine", "Omega VA (Direct Sum)");

        juce::Array<juce::var> parameters;
        for (auto const& [id, desc] : registry.getAllParameters()) {
            parameters.add(descriptorToVar(desc));
        }
        root->setProperty("parameters", parameters);

        // Add Group Definitions (derived from unique groupIds)
        std::set<std::string> groups;
        for (auto const& [id, desc] : registry.getAllParameters()) groups.insert(desc.groupId);
        
        juce::Array<juce::var> groupArray;
        for (const auto& g : groups) {
            juce::DynamicObject::Ptr go = new juce::DynamicObject();
            go->setProperty("id", juce::String(g));
            go->setProperty("label", juce::String(g)); 
            groupArray.add(juce::var(go.get()));
        }
        root->setProperty("groups", groupArray);

        return createResponse("METADATA", requestId, juce::var(), root.get());
    }

    juce::var RpcMetadataController::handleGetSampleRate(const juce::var& requestId, const juce::var&) {
        double sr = mProcessor ? mProcessor->getSampleRate() : 44100.0;
        return createResponse("SAMPLE_RATE", requestId, juce::var(), sr);
    }

    juce::var RpcMetadataController::handleGetTempo(const juce::var& requestId, const juce::var&) {
        return createResponse("TEMPO", requestId, juce::var(), 120.0);
    }

    juce::var RpcMetadataController::handleGetInventory(const juce::var& requestId, const juce::var&) {
        if (!mProcessor) return createError("GET_INVENTORY", requestId, "Missing Processor");
        
        auto& catalog = mProcessor->getCatalog();
        juce::Array<juce::var> components;
        
        for (auto const* info : catalog.getComponents()) {
            juce::DynamicObject::Ptr obj = new juce::DynamicObject();
            obj->setProperty("id", juce::String(info->id));
            obj->setProperty("name", juce::String(info->name));
            obj->setProperty("family", juce::String(info->family));
            obj->setProperty("engine", juce::String(info->engine));
            obj->setProperty("version", info->version);
            
            juce::Array<juce::var> registryArray;
            for (auto const& p : info->parameters) {
                juce::DynamicObject::Ptr pobj = new juce::DynamicObject();
                pobj->setProperty("id", juce::String(p.id));
                pobj->setProperty("label", juce::String(p.label));
                pobj->setProperty("roles", juce::Array<juce::var>({juce::var("control")}));
                pobj->setProperty("direction", "internal");
                
                juce::DynamicObject::Ptr range = new juce::DynamicObject();
                range->setProperty("min", p.min);
                range->setProperty("max", p.max);
                range->setProperty("default", p.defaultValue);
                range->setProperty("unit", juce::String(p.unit));
                pobj->setProperty("range", juce::var(range.get()));
                
                if (!p.options.empty()) {
                    juce::Array<juce::var> opts;
                    for (auto const& o : p.options) {
                        juce::DynamicObject::Ptr oo = new juce::DynamicObject();
                        oo->setProperty("value", o.value);
                        oo->setProperty("label", juce::String(o.label));
                        opts.add(juce::var(oo.get()));
                    }
                    pobj->setProperty("options", opts);
                }
                registryArray.add(juce::var(pobj.get()));
            }

            for (auto const& p : info->ports) {
                juce::DynamicObject::Ptr pobj = new juce::DynamicObject();
                pobj->setProperty("id", juce::String(p.id));
                pobj->setProperty("label", juce::String(p.label));
                pobj->setProperty("roles", juce::Array<juce::var>({juce::var(p.isInput ? "input" : "output")}));
                pobj->setProperty("direction", juce::String(p.isInput ? "input" : "output"));
                
                juce::String typeStr = "cv";
                if (p.type == Core::Modulation::ModPortType::Audio) typeStr = "audio";
                else if (p.type == Core::Modulation::ModPortType::MIDI) typeStr = "midi";
                else if (p.type == Core::Modulation::ModPortType::Gate) typeStr = "gate";
                pobj->setProperty("type", typeStr);
                
                registryArray.add(juce::var(pobj.get()));
            }
            obj->setProperty("registry", registryArray);
            components.add(juce::var(obj.get()));
        }
        
        juce::DynamicObject::Ptr payload = new juce::DynamicObject();
        payload->setProperty("components", components);
        
        return createResponse("INVENTORY", requestId, juce::var(), payload.get());
    }

    juce::var RpcMetadataController::handleGetUiSchemas(const juce::var& requestId, const juce::var&) {
        juce::DynamicObject::Ptr payload = new juce::DynamicObject();
        
        // [Era 6] Nominal Minimal Schema to prevent UI hang
        juce::Array<juce::var> schemas;
        juce::DynamicObject::Ptr nominal = new juce::DynamicObject();
        nominal->setProperty("id", "omega.nominal");
        nominal->setProperty("schemaVersion", "1.0");
        nominal->setProperty("target", "system");
        schemas.add(juce::var(nominal.get()));

        payload->setProperty("schemas", schemas);
        return createResponse("UISCHEMAS", requestId, juce::var(), payload.get());
    }

    juce::var RpcMetadataController::descriptorToVar(const Core::ParameterDescriptor& d) {
        juce::DynamicObject::Ptr obj = new juce::DynamicObject();
        obj->setProperty("id", juce::String(d.id));
        obj->setProperty("name", juce::String(d.name));
        obj->setProperty("description", juce::String(d.description));
        
        juce::String typeStr = "continuous";
        if (d.valueType == Core::ParamValueType::Integer) typeStr = "integer";
        else if (d.valueType == Core::ParamValueType::Boolean) typeStr = "boolean";
        else if (d.valueType == Core::ParamValueType::Enum) typeStr = "enum";
        obj->setProperty("valueType", typeStr);
        
        obj->setProperty("min", d.minValue);
        obj->setProperty("max", d.maxValue);
        obj->setProperty("default", d.defaultValue);
        obj->setProperty("step", d.step);
        obj->setProperty("skew", d.skew);
        obj->setProperty("unit", juce::String(d.unit));
        obj->setProperty("groupId", juce::String(d.groupId));
        obj->setProperty("category", juce::String(d.category));
        obj->setProperty("uiControl", juce::String(d.uiControl));
        obj->setProperty("expert", d.expert);
        obj->setProperty("cc", d.ccNumber);
        
        if (!d.options.empty()) {
            juce::Array<juce::var> options;
            for (const auto& opt : d.options) {
                juce::DynamicObject::Ptr o = new juce::DynamicObject();
                o->setProperty("value", opt.value);
                o->setProperty("label", juce::String(opt.label));
                options.add(juce::var(o.get()));
            }
            obj->setProperty("options", options);
        }
        
        return juce::var(obj.get());
    }

} // namespace UI
} // namespace Omega
