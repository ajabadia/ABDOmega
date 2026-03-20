#include "OmegaPreset.h"
#include <yaml-cpp/yaml.h>
#include <sstream>

namespace YAML {

    // --- LayerParams Serialization ---
    template<>
    struct convert<Omega::Core::Preset::LayerParams> {
        static Node encode(const Omega::Core::Preset::LayerParams& rhs) {
            Node node;
            node["levelDb"] = rhs.levelDb;
            node["pan"] = rhs.pan;
            node["cutoff"] = rhs.cutoff;
            node["resonance"] = rhs.resonance;
            node["hpfPos"] = rhs.hpfPos;
            node["vcaGateMode"] = rhs.vcaGateMode;
            node["analogDrift"] = rhs.analogDrift;
            
            node["sawOn"] = rhs.sawOn;
            node["pulseOn"] = rhs.pulseOn;
            node["subLevel"] = rhs.subLevel;
            node["noiseLevel"] = rhs.noiseLevel;
            node["pwmModeLfo"] = rhs.pwmModeLfo;
            node["pwmAmount"] = rhs.pwmAmount;
            
            node["vcfEnvDepth"] = rhs.vcfEnvDepth;
            node["vcfLfoDepth"] = rhs.vcfLfoDepth;
            node["vcfKybd"] = rhs.vcfKybd;
            node["vcfEnvInv"] = rhs.vcfEnvInv;
            node["dcoLfoDepth"] = rhs.dcoLfoDepth;
            return node;
        }

        static bool decode(const Node& node, Omega::Core::Preset::LayerParams& rhs) {
            if (!node.IsMap()) return false;
            
            #define LOAD_OPT(key, var) if (node[key]) var = node[key].as<decltype(var)>()
            LOAD_OPT("levelDb", rhs.levelDb);
            LOAD_OPT("pan", rhs.pan);
            LOAD_OPT("cutoff", rhs.cutoff);
            LOAD_OPT("resonance", rhs.resonance);
            LOAD_OPT("hpfPos", rhs.hpfPos);
            LOAD_OPT("vcaGateMode", rhs.vcaGateMode);
            LOAD_OPT("analogDrift", rhs.analogDrift);
            
            LOAD_OPT("sawOn", rhs.sawOn);
            LOAD_OPT("pulseOn", rhs.pulseOn);
            LOAD_OPT("subLevel", rhs.subLevel);
            LOAD_OPT("noiseLevel", rhs.noiseLevel);
            LOAD_OPT("pwmModeLfo", rhs.pwmModeLfo);
            LOAD_OPT("pwmAmount", rhs.pwmAmount);
            
            LOAD_OPT("vcfEnvDepth", rhs.vcfEnvDepth);
            LOAD_OPT("vcfLfoDepth", rhs.vcfLfoDepth);
            LOAD_OPT("vcfKybd", rhs.vcfKybd);
            LOAD_OPT("vcfEnvInv", rhs.vcfEnvInv);
            LOAD_OPT("dcoLfoDepth", rhs.dcoLfoDepth);
            #undef LOAD_OPT

            return true;
        }
    };

    // --- AceComponent Serialization ---
    template<>
    struct convert<Omega::Core::Preset::AceComponent> {
        static Node encode(const Omega::Core::Preset::AceComponent& rhs) {
            Node node;
            node["slotType"] = rhs.slotType;
            node["slotName"] = rhs.slotName;
            node["componentId"] = rhs.componentId;
            node["enabled"] = rhs.enabled;
            if (!rhs.params.empty()) node["params"] = rhs.params;
            return node;
        }

        static bool decode(const Node& node, Omega::Core::Preset::AceComponent& rhs) {
            if (!node["componentId"]) return false;
            rhs.componentId = node["componentId"].as<std::string>();
            if (node["slotType"]) rhs.slotType = node["slotType"].as<std::string>();
            if (node["slotName"]) rhs.slotName = node["slotName"].as<std::string>();
            if (node["enabled"]) rhs.enabled = node["enabled"].as<bool>();
            if (node["params"]) rhs.params = node["params"].as<std::map<std::string, float>>();
            return true;
        }
    };

    // --- Modulation Serialization ---
    template<>
    struct convert<Omega::Core::Preset::ModGraphNodeData> {
        static Node encode(const Omega::Core::Preset::ModGraphNodeData& rhs) {
            Node node;
            node["id"] = rhs.id;
            node["type"] = rhs.type;
            node["name"] = rhs.name;
            if (!rhs.params.empty()) node["params"] = rhs.params;
            return node;
        }
        static bool decode(const Node& node, Omega::Core::Preset::ModGraphNodeData& rhs) {
            if (!node["id"] || !node["type"]) return false;
            rhs.id = node["id"].as<uint32_t>();
            rhs.type = node["type"].as<std::string>();
            if (node["name"]) rhs.name = node["name"].as<std::string>();
            if (node["params"]) rhs.params = node["params"].as<std::map<std::string, float>>();
            return true;
        }
    };

    template<>
    struct convert<Omega::Core::Preset::ModGraphConnectionData> {
        static Node encode(const Omega::Core::Preset::ModGraphConnectionData& rhs) {
            Node node;
            node["source"] = rhs.sourceNode;
            node["dest"] = rhs.destNode;
            node["input"] = (int)rhs.destInput;
            node["amount"] = rhs.amount;
            return node;
        }
        static bool decode(const Node& node, Omega::Core::Preset::ModGraphConnectionData& rhs) {
            if (!node["source"] || !node["dest"]) return false;
            rhs.sourceNode = node["source"].as<uint32_t>();
            rhs.destNode = node["dest"].as<uint32_t>();
            if (node["input"]) rhs.destInput = (uint8_t)node["input"].as<int>();
            if (node["amount"]) rhs.amount = node["amount"].as<float>();
            return true;
        }
    };

} // namespace YAML

namespace Omega::Core::Preset {

    bool OmegaPreset::fromYaml(const std::string& yamlSource, OmegaPreset& out) {
        try {
            YAML::Node root = YAML::Load(yamlSource);
            if (!root.IsDefined() || root.IsNull()) return false;

            if (root["id"]) out.id = root["id"].as<std::string>();
            if (root["name"]) out.name = root["name"].as<std::string>();
            if (root["author"]) out.author = root["author"].as<std::string>();
            if (root["engine"]) out.engine = root["engine"].as<std::string>();
            if (root["global"] && root["global"]["masterGainDb"]) 
                out.masterGainDb = root["global"]["masterGainDb"].as<float>();

            if (root["layers"] && root["layers"].IsSequence()) {
                out.layers.clear();
                for (auto lNode : root["layers"]) {
                    Layer layer;
                    if (lNode["id"]) layer.id = lNode["id"].as<std::string>();
                    if (lNode["name"]) layer.name = lNode["name"].as<std::string>();
                    if (lNode["polyphony"]) layer.polyphony = lNode["polyphony"].as<int>();
                    
                    if (lNode["layerParams"]) layer.params = lNode["layerParams"].as<LayerParams>();

                    // Voice Architecture
                    if (lNode["voiceArchitecture"]) {
                        auto va = lNode["voiceArchitecture"];
                        if (va["oscillators"]) layer.voiceArch.oscillators = va["oscillators"].as<std::vector<AceComponent>>();
                        if (va["filters"]) layer.voiceArch.filters = va["filters"].as<std::vector<AceComponent>>();
                        if (va["envelopes"]) layer.voiceArch.envelopes = va["envelopes"].as<std::vector<AceComponent>>();
                        if (va["lfos"]) layer.voiceArch.lfos = va["lfos"].as<std::vector<AceComponent>>();
                        if (va["fx"]) layer.voiceArch.fx = va["fx"].as<std::vector<AceComponent>>();
                    }

                    // Modulation Graph
                    if (lNode["modulationGraph"]) {
                        auto mg = lNode["modulationGraph"];
                        if (mg["nodes"]) layer.modulationGraph.nodes = mg["nodes"].as<std::vector<ModGraphNodeData>>();
                        if (mg["connections"]) layer.modulationGraph.connections = mg["connections"].as<std::vector<ModGraphConnectionData>>();
                    }

                    out.layers.push_back(layer);
                }
            }
            return true;
        } catch (...) {
            return false;
        }
    }

    std::string OmegaPreset::toYaml() const {
        YAML::Emitter out;
        out << YAML::BeginMap;
        out << YAML::Key << "omegapresetVersion" << YAML::Value << 1;
        out << YAML::Key << "id" << YAML::Value << id;
        out << YAML::Key << "name" << YAML::Value << name;
        out << YAML::Key << "author" << YAML::Value << author;
        out << YAML::Key << "engine" << YAML::Value << engine;
        
        out << YAML::Key << "global" << YAML::BeginMap;
        out << YAML::Key << "masterGainDb" << YAML::Value << masterGainDb;
        out << YAML::EndMap;

        out << YAML::Key << "layers" << YAML::BeginSeq;
        for (const auto& l : layers) {
            out << YAML::BeginMap;
            out << YAML::Key << "id" << YAML::Value << l.id;
            out << YAML::Key << "name" << YAML::Value << l.name;
            out << YAML::Key << "polyphony" << YAML::Value << l.polyphony;
            
            out << YAML::Key << "layerParams" << YAML::Value << YAML::Node(l.params);

            out << YAML::Key << "voiceArchitecture" << YAML::BeginMap;
            out << YAML::Key << "oscillators" << YAML::Value << YAML::Node(l.voiceArch.oscillators);
            out << YAML::Key << "filters" << YAML::Value << YAML::Node(l.voiceArch.filters);
            out << YAML::Key << "envelopes" << YAML::Value << YAML::Node(l.voiceArch.envelopes);
            out << YAML::Key << "lfos" << YAML::Value << YAML::Node(l.voiceArch.lfos);
            out << YAML::Key << "fx" << YAML::Value << YAML::Node(l.voiceArch.fx);
            out << YAML::EndMap;

            out << YAML::Key << "modulationGraph" << YAML::BeginMap;
            out << YAML::Key << "nodes" << YAML::Value << YAML::Node(l.modulationGraph.nodes);
            out << YAML::Key << "connections" << YAML::Value << YAML::Node(l.modulationGraph.connections);
            out << YAML::EndMap;

            out << YAML::EndMap;
        }
        out << YAML::EndSeq;
        out << YAML::EndMap;

        return out.c_str();
    }

} // namespace Omega::Core::Preset
