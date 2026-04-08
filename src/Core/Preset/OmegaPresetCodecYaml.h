#pragma once

#include <yaml-cpp/yaml.h>
#include <juce_data_structures/juce_data_structures.h>
#include "OmegaIdentifiers.h"
#include "OmegaPresetSchema.h"

namespace Omega {
namespace Core {
namespace Preset {

    /**
     * @brief Strict encoder/decoder for OMEGA presets.
     */
    class OmegaPresetCodecYaml {
    public:
        using IDs = Omega::Core::Identifiers;

        static juce::ValueTree decode(const std::string& yamlSource) {
            try {
                YAML::Node root = YAML::Load(yamlSource);
                if (!root.IsDefined() || root.IsNull()) return {};
                
                return yamlToValueTree(root, IDs::OMEGAPRESET);
            } catch (...) {
                return {};
            }
        }

        static std::string encode(const juce::ValueTree& tree) {
            if (!tree.isValid()) return "";
            try {
                YAML::Emitter out;
                out << valueTreeToYaml(tree);
                return out.c_str();
            } catch (...) {
                return "";
            }
        }

    private:
        static juce::ValueTree yamlToValueTree(const YAML::Node& node, const juce::Identifier& typeId) {
            if (!node.IsMap()) return {};
            
            juce::ValueTree vt(typeId);
            
            for (auto const& it : node) {
                std::string key = it.first.as<std::string>();
                YAML::Node val = it.second;
                juce::Identifier id(key);
                
                if (val.IsScalar()) {
                    if (val.Tag() == "!!int") vt.setProperty(id, val.as<int>(), nullptr);
                    else if (val.Tag() == "!!float") vt.setProperty(id, val.as<float>(), nullptr);
                    else if (val.Tag() == "!!bool") vt.setProperty(id, val.as<bool>(), nullptr);
                    else vt.setProperty(id, juce::String(val.as<std::string>()), nullptr);
                } 
                else if (val.IsMap()) {
                    // Recursive map (e.g. 'params', 'visual')
                    vt.addChild(yamlToValueTree(val, id), -1, nullptr);
                } 
                else if (val.IsSequence()) {
                    // Recursive sequence (e.g. 'layers', 'oscillators')
                    juce::ValueTree list(id);
                    for (auto item : val) {
                        if (item.IsMap()) {
                            // Inferred child type (Build #214: Normalized for Aseptic modularity)
                            juce::String cat = id.toString();
                            juce::Identifier childType;
                            
                            if (cat == "layers")           childType = IDs::LAYER;
                            else if (cat == "patchbayMatrix") childType = IDs::slot;
                            else if (cat == "visual")      childType = IDs::VISUAL;
                            else                            childType = IDs::COMPONENT; 
                            
                            list.addChild(yamlToValueTree(item, childType), -1, nullptr);
                        }
                    }
                    vt.addChild(list, -1, nullptr);
                }
            }
            return vt;
        }

        static YAML::Node valueTreeToYaml(const juce::ValueTree& tree) {
            YAML::Node node;
            
            for (int i = 0; i < tree.getNumProperties(); ++i) {
                auto name = tree.getPropertyName(i).toString().toStdString();
                auto val = tree.getProperty(tree.getPropertyName(i));
                
                if (val.isInt()) node[name] = (int)val;
                else if (val.isDouble()) node[name] = (double)val;
                else if (val.isBool()) node[name] = (bool)val;
                else node[name] = val.toString().toStdString();
            }
            
            for (int i = 0; i < tree.getNumChildren(); ++i) {
                auto child = tree.getChild(i);
                auto name = child.getType().toString().toStdString();
                
                if (child.getNumChildren() > 0 && child.getNumProperties() == 0) {
                    YAML::Node seq;
                    for (int j = 0; j < child.getNumChildren(); ++j) {
                        seq.push_back(valueTreeToYaml(child.getChild(j)));
                    }
                    node[name] = seq;
                } else {
                    node[name] = valueTreeToYaml(child);
                }
            }
            return node;
        }
    };

} // namespace Preset
} // namespace Core
} // namespace Omega
