#include "OmegaPreset.h"
#include <juce_cryptography/juce_cryptography.h>

namespace Omega {
namespace Core {
namespace Preset {

    OmegaPreset::OmegaPreset() : mState(IDs::OMEGAPRESET) {
        setUuid(juce::Uuid().toString());
    }

    OmegaPreset::OmegaPreset(const juce::ValueTree& tree) : mState(tree) {
        // Auto-normalize on load if possible
        OmegaPresetNormalizer::normalize(mState);
    }

    OmegaPreset::OmegaPreset(const OmegaPreset& other) : mState(other.mState.createCopy()) {}

    OmegaPreset& OmegaPreset::operator=(const OmegaPreset& other) {
        mState = other.mState.createCopy();
        return *this;
    }

    OmegaPreset OmegaPreset::createDefault() {
        return OmegaPreset(OmegaPresetDefaults::createDefaultPreset());
    }

    OmegaPreset OmegaPreset::createDefaultVirtualAnalog() {
        return createDefault(); // Currently synonymous
    }

    bool OmegaPreset::fromYaml(const std::string& yamlSource, OmegaPreset& out) {
        auto tree = OmegaPresetCodecYaml::decode(yamlSource);
        if (tree.isValid()) {
            OmegaPresetNormalizer::normalize(tree);
            out.mState = tree;
            return true;
        }
        return false;
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
        return OmegaPresetCodecYaml::encode(mState);
    }

    std::string OmegaPreset::calculateHash() const {
        std::string yaml = toYaml();
        juce::SHA256 sha(yaml.data(), (size_t)yaml.size());
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
        
        juce::ValueTree p(IDs::params);
        #define SET_P(id, val) p.setProperty(IDs::id, val, nullptr)
        SET_P(levelDb, layer.params.levelDb);
        SET_P(pan, layer.params.pan);
        SET_P(cutoff, layer.params.cutoff);
        SET_P(resonance, layer.params.resonance);
        SET_P(hpfPosition, layer.params.hpfPosition);
        SET_P(vcaGateMode, layer.params.vcaGateMode);
        SET_P(analogDrift, layer.params.analogDrift);
        SET_P(sawOn, layer.params.sawOn);
        SET_P(pulseOn, layer.params.pulseOn);
        SET_P(subLevel, layer.params.subLevel);
        SET_P(noiseLevel, layer.params.noiseLevel);
        SET_P(pwmMode, layer.params.pwmMode);
        SET_P(pwmAmount, layer.params.pwmAmount);
        SET_P(vcfEnvDepth, layer.params.vcfEnvDepth);
        SET_P(vcfModDepth, layer.params.vcfModDepth);
        SET_P(vcfKeyTracking, layer.params.vcfKeyTracking);
        SET_P(vcfEnvInverted, layer.params.vcfEnvInverted);
        SET_P(dcoLfoDepth, layer.params.dcoLfoDepth);
        SET_P(lfoRate, layer.params.lfoRate);
        SET_P(lfoWave, layer.params.lfoWave);
        SET_P(jpDetune, layer.params.jpDetune);
        SET_P(jpSpread, layer.params.jpSpread);
        SET_P(korgHpCutoff, layer.params.korgHpCutoff);
        SET_P(korgHpResonance, layer.params.korgHpResonance);
        SET_P(korgGrit, layer.params.korgGrit);
        SET_P(attack, layer.params.attack);
        SET_P(decay, layer.params.decay);
        SET_P(sustain, layer.params.sustain);
        SET_P(release, layer.params.release);
        #undef SET_P
        l.addChild(p, -1, nullptr);

        juce::ValueTree arch(IDs::voiceArch);
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
        mapComp(IDs::fxSlots, layer.voiceArch.fxSlots);
        mapComp(IDs::auxiliary, layer.voiceArch.auxiliary);

        l.addChild(arch, -1, nullptr);
        layers.addChild(l, -1, nullptr);
    }

    void OmegaPreset::addLayer(const juce::String& name) {
        addLayer(Layer{ "A", name.toStdString(), {}, {} });
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

    juce::ValueTree OmegaPreset::getScopeTree() {
        return mState.getOrCreateChildWithName(IDs::VISUAL, nullptr).getOrCreateChildWithName(IDs::scope, nullptr);
    }

    void OmegaPreset::resetScopeToDefault() {
        auto visual = mState.getOrCreateChildWithName(IDs::VISUAL, nullptr);
        visual.removeChild(visual.getChildWithName(IDs::scope), nullptr);
        visual.addChild(OmegaPresetDefaults::createDefaultVisual().getChildWithName(IDs::scope).createCopy(), -1, nullptr);
    }

} // namespace Preset
} // namespace Core
} // namespace Omega
