#include "OmegaPreset.h"
#include <yaml-cpp/yaml.h>
#include <juce_cryptography/juce_cryptography.h>
#include <sstream>

namespace Omega {
namespace Core {
namespace Preset {
    using namespace IDs;
    
    OmegaPreset::OmegaPreset() : mState(OMEGAPRESET) {
        setUuid(juce::Uuid().toString());
    }

    OmegaPreset::OmegaPreset(const juce::ValueTree& tree) : mState(tree) {}

    OmegaPreset::OmegaPreset(const OmegaPreset& other) : mState(other.mState.createCopy()) {}

    OmegaPreset& OmegaPreset::operator=(const OmegaPreset& other) {
        mState = other.mState.createCopy();
        return *this;
    }

    OmegaPreset OmegaPreset::createEmpty() {
        return OmegaPreset();
    }

    OmegaPreset OmegaPreset::createDefault() {
        OmegaPreset p;
        p.setName("Default Preset");
        p.setAuthor("OMEGA");
        p.setEngine("VirtualAnalog");
        p.setMasterGainDb(-3.0f);
        p.addLayer("Main Layer");
        return p;
    }

    OmegaPreset OmegaPreset::createDefaultVirtualAnalog() {
        OmegaPreset p = createDefault();
        // Personalización extra para VA si fuera necesario
        return p;
    }

    bool OmegaPreset::fromYaml(const std::string& yamlSource, OmegaPreset& out) {
        try {
            YAML::Node root = YAML::Load(yamlSource);
            if (!root.IsDefined() || root.IsNull()) return false;
            
            out.mState = yamlToValueTree(root);
            return out.isValid();
        } catch (...) {
            return false;
        }
    }

    bool OmegaPreset::loadFromYaml(const std::string& filePath) {
        juce::File f(filePath);
        if (!f.existsAsFile()) return false;
        return fromYaml(f.loadFileAsString().toStdString(), *this);
    }

    bool OmegaPreset::saveToYaml(const std::string& filePath) const {
        juce::File f(filePath);
        if (!f.getParentDirectory().exists()) f.getParentDirectory().createDirectory();
        return f.replaceWithText(toYaml());
    }

    std::string OmegaPreset::toYaml() const {
        if (!mState.isValid()) return "";
        try {
            YAML::Emitter out;
            out << valueTreeToYaml(mState);
            return out.c_str();
        } catch (...) {
            return "";
        }
    }

    std::string OmegaPreset::calculateHash() const {
        std::string yaml = toYaml();
        juce::SHA256 sha(yaml.data(), yaml.size());
        return sha.toHexString().toStdString();
    }

    // --- Typed API ---
    juce::String OmegaPreset::getUuid() const { return mState[IDs::id].toString(); }
    void OmegaPreset::setUuid(const juce::String& uuid) { mState.setProperty(IDs::id, uuid, nullptr); }
    juce::String OmegaPreset::getName() const { return mState[IDs::name].toString(); }
    void OmegaPreset::setName(const juce::String& name) { mState.setProperty(IDs::name, name, nullptr); }
    juce::String OmegaPreset::getAuthor() const { return mState[IDs::author].toString(); }
    void OmegaPreset::setAuthor(const juce::String& author) { mState.setProperty(IDs::author, author, nullptr); }
    juce::String OmegaPreset::getEngine() const { return mState[IDs::engine].toString(); }
    void OmegaPreset::setEngine(const juce::String& engine) { mState.setProperty(IDs::engine, engine, nullptr); }
    float OmegaPreset::getMasterGainDb() const { return (float)mState.getProperty(IDs::masterGainDb, 0.0f); }
    void OmegaPreset::setMasterGainDb(float db) { mState.setProperty(IDs::masterGainDb, db, nullptr); }

    int OmegaPreset::getNumLayers() const {
        return mState.getChildWithName(IDs::layers).getNumChildren();
    }

    juce::ValueTree OmegaPreset::getLayerTree(int index) const {
        return mState.getChildWithName(IDs::layers).getChild(index);
    }

    void OmegaPreset::addLayer(const Layer& layer) {
        juce::ValueTree layers = mState.getOrCreateChildWithName(IDs::layers, nullptr);
        juce::ValueTree l(IDs::LAYER);
        l.setProperty(IDs::id, juce::String(layer.id), nullptr);
        l.setProperty(IDs::name, juce::String(layer.name), nullptr);
        
        juce::ValueTree params(IDs::params);
        #define SET_PARAM(name) params.setProperty(IDs::name, layer.params.name, nullptr)
        SET_PARAM(levelDb); SET_PARAM(pan); SET_PARAM(cutoff); SET_PARAM(resonance);
        SET_PARAM(hpfPos); SET_PARAM(vcaGateMode); SET_PARAM(analogDrift);
        SET_PARAM(sawOn); SET_PARAM(pulseOn); SET_PARAM(subLevel); SET_PARAM(noiseLevel);
        SET_PARAM(vcfEnvDepth); SET_PARAM(vcfLfoDepth); SET_PARAM(vcfKybd);
        SET_PARAM(vcfEnvInv); SET_PARAM(dcoLfoDepth); SET_PARAM(pwmModeLfo);
        SET_PARAM(pwmAmount);
        #undef SET_PARAM
        l.addChild(params, -1, nullptr);

        juce::ValueTree arch(IDs::architecture);
        auto mapComp = [&](const juce::Identifier& cat, const std::vector<AceComponent>& comps) {
            juce::ValueTree catNode(cat);
            for (const auto& c : comps) {
                juce::ValueTree cn(IDs::COMPONENT);
                cn.setProperty(IDs::slotName, juce::String(c.slotName), nullptr);
                cn.setProperty(IDs::componentId, juce::String(c.componentId), nullptr);
                if (!c.slotType.empty()) cn.setProperty(IDs::slotType, juce::String(c.slotType), nullptr);
                juce::ValueTree cp(IDs::params);
                for (auto const& [k, v] : c.params) cp.setProperty(juce::Identifier(k), v, nullptr);
                cn.addChild(cp, -1, nullptr);
                catNode.addChild(cn, -1, nullptr);
            }
            arch.addChild(catNode, -1, nullptr);
        };

        mapComp(IDs::oscillators, layer.voiceArch.oscillators);
        mapComp(IDs::filters, layer.voiceArch.filters);
        mapComp(IDs::amplifiers, layer.voiceArch.amplifiers);
        mapComp(IDs::envelopes, layer.voiceArch.envelopes);
        mapComp(IDs::lfos, layer.voiceArch.lfos);
        mapComp(IDs::modulators, layer.voiceArch.modulators);
        mapComp(IDs::auxiliary, layer.voiceArch.auxiliary);

        l.addChild(arch, -1, nullptr);
        layers.addChild(l, -1, nullptr);
    }

    void OmegaPreset::addLayer(const juce::String& name) {
        Layer l;
        l.name = name.toStdString();
        addLayer(l);
    }

    void OmegaPreset::addEnvelope(const AceComponent& comp) { addComponent(comp, IDs::envelopes); }
    void OmegaPreset::addAmplifier(const AceComponent& comp) { addComponent(comp, IDs::amplifiers); }
    void OmegaPreset::addModulator(const AceComponent& comp) { addComponent(comp, IDs::modulators); }
    void OmegaPreset::addAuxiliary(const AceComponent& comp) { addComponent(comp, IDs::auxiliary); }

    void OmegaPreset::addComponent(const AceComponent& c, const juce::Identifier& cat) {
        juce::ValueTree catNode = mState.getOrCreateChildWithName(cat, nullptr);
        juce::ValueTree cn(IDs::COMPONENT);
        cn.setProperty(IDs::slotName, juce::String(c.slotName), nullptr);
        cn.setProperty(IDs::componentId, juce::String(c.componentId), nullptr);
        if (!c.slotType.empty()) cn.setProperty(IDs::slotType, juce::String(c.slotType), nullptr);
        juce::ValueTree cp(IDs::params);
        for (auto const& [k, v] : c.params) cp.setProperty(juce::Identifier(k), v, nullptr);
        cn.addChild(cp, -1, nullptr);
        catNode.addChild(cn, -1, nullptr);
    }

    void OmegaPreset::removeLayer(int index) {
        mState.getChildWithName(IDs::layers).removeChild(index, nullptr);
    }

    // --- Conversion Logic ---
    static juce::ValueTree yamlToValueTreeWithId(const YAML::Node& node, const juce::Identifier& typeId);

    juce::ValueTree OmegaPreset::yamlToValueTree(const YAML::Node& node) {
        return yamlToValueTreeWithId(node, IDs::OMEGAPRESET);
    }

    juce::ValueTree yamlToValueTreeWithId(const YAML::Node& node, const juce::Identifier& typeId) {
        if (!node.IsMap()) return {};
        
        juce::ValueTree vt(typeId);
        
        for (auto const& it : node) {
            std::string key = it.first.as<std::string>();
            YAML::Node val = it.second;
            
            juce::Identifier id(key);
            
            if (val.IsScalar()) {
                // Infer type (rough approximation)
                try {
                    if (val.Tag() == "!!int") vt.setProperty(id, val.as<int>(), nullptr);
                    else if (val.Tag() == "!!float") vt.setProperty(id, val.as<float>(), nullptr);
                    else if (val.Tag() == "!!bool") vt.setProperty(id, val.as<bool>(), nullptr);
                    else vt.setProperty(id, juce::String(val.as<std::string>()), nullptr);
                } catch (...) {
                    vt.setProperty(id, juce::String(val.as<std::string>()), nullptr);
                }
            } else if (val.IsMap()) {
                // Nested objects become children or properties depending on key
                // For simplicity in this refactor, we stick to a flat-ish property structure for small maps
                // and children for larger things. 
                // In a production system, we'd have a strict schema here.
                auto child = yamlToValueTreeWithId(val, id);
                vt.addChild(child, -1, nullptr);
            } else if (val.IsSequence()) {
                juce::ValueTree list(id);
                for (auto item : val) {
                    if (item.IsMap()) {
                        // We use the singular form of the key as child type if possible
                        juce::String type = id.toString();
                        if (type.endsWith("s")) type = type.dropLastCharacters(1);
                        
                        auto child = yamlToValueTreeWithId(item, juce::Identifier(type.toUpperCase()));
                        list.addChild(child, -1, nullptr);
                    }
                }
                vt.addChild(list, -1, nullptr);
            }
        }
        return vt;
    }

    YAML::Node OmegaPreset::valueTreeToYaml(const juce::ValueTree& tree) {
        YAML::Node node;
        
        // Properties
        for (int i = 0; i < tree.getNumProperties(); ++i) {
            auto name = tree.getPropertyName(i).toString().toStdString();
            auto val = tree.getProperty(tree.getPropertyName(i));
            
            if (val.isInt()) node[name] = (int)val;
            else if (val.isDouble()) node[name] = (double)val;
            else if (val.isBool()) node[name] = (bool)val;
            else node[name] = val.toString().toStdString();
        }
        
        // Children
        for (int i = 0; i < tree.getNumChildren(); ++i) {
            auto child = tree.getChild(i);
            auto name = child.getType().toString().toStdString();
            
            // If it's a "list" type child (like 'layers'), we make it a YAML sequence
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

} // namespace Preset
} // namespace Core
} // namespace Omega
