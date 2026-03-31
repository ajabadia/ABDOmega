#include "RpcMetadataController.h"
#include "../Plugin/OmegaAudioProcessor.h"

namespace Omega {
namespace UI {

    RpcMetadataController::RpcMetadataController(Plugin::OmegaAudioProcessor* processor)
        : mProcessor(processor) {}

    juce::var RpcMetadataController::handleGetMetadata(const juce::var& requestId, const juce::var&) {
        auto& registry = Core::ParameterMetadataRegistry::getInstance();
        
        juce::DynamicObject::Ptr root = new juce::DynamicObject();
        root->setProperty("version", "1.9.2"); // Build Hardened
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
            go->setProperty("label", juce::String(g)); // Simple for now
            groupArray.add(juce::var(go.get()));
        }
        root->setProperty("groups", groupArray);

        return createResponse("METADATA", requestId, {}, root.get());
    }

    juce::var RpcMetadataController::handleGetSampleRate(const juce::var& requestId, const juce::var&) {
        double sr = mProcessor ? mProcessor->getSampleRate() : 44100.0;
        return createResponse("SAMPLE_RATE", requestId, {}, sr);
    }

    juce::var RpcMetadataController::handleGetTempo(const juce::var& requestId, const juce::var&) {
        // Mocking for now, could be derived from PlayHead
        return createResponse("TEMPO", requestId, {}, 120.0);
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
