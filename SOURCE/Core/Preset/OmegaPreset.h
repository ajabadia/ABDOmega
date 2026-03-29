#pragma once

#include <string>
#include <vector>
#include <map>
#include <juce_core/juce_core.h>
#include <juce_data_structures/juce_data_structures.h>


namespace YAML { class Node; }

namespace Omega {

namespace Core {
namespace Preset {

    /**
     * @brief Identificadores de tipos para el ValueTree de OMEGA.
     */
    namespace IDs {
        #define DECLARE_ID(name) inline const juce::Identifier name { #name }
        DECLARE_ID(OMEGAPRESET);
        DECLARE_ID(id);
        DECLARE_ID(name);
        DECLARE_ID(author);
        DECLARE_ID(engine);
        DECLARE_ID(masterGainDb);
        DECLARE_ID(layers);
        DECLARE_ID(LAYER);
        DECLARE_ID(polyphony);
        DECLARE_ID(params);
        DECLARE_ID(architecture);
        DECLARE_ID(COMPONENT);
        DECLARE_ID(amplifiers);
        DECLARE_ID(envelopes);
        DECLARE_ID(modulators);
        DECLARE_ID(oscillators);
        DECLARE_ID(filters);
        DECLARE_ID(lfos);
        DECLARE_ID(auxiliary);
        DECLARE_ID(slotType);
        DECLARE_ID(slotName);
        DECLARE_ID(componentId);
        DECLARE_ID(enabled);
        DECLARE_ID(modGraph);
        DECLARE_ID(NODE);
        DECLARE_ID(CONNECTION);
        
        // --- Layer Params ---
        DECLARE_ID(levelDb);
        DECLARE_ID(pan);
        DECLARE_ID(cutoff);
        DECLARE_ID(resonance);
        DECLARE_ID(hpfPos);
        DECLARE_ID(vcaGateMode);
        DECLARE_ID(analogDrift);
        DECLARE_ID(sawOn);
        DECLARE_ID(pulseOn);
        DECLARE_ID(subLevel);
        DECLARE_ID(noiseLevel);
        DECLARE_ID(vcfEnvDepth);
        DECLARE_ID(vcfLfoDepth);
        DECLARE_ID(vcfKybd);
        DECLARE_ID(vcfEnvInv);
        DECLARE_ID(dcoLfoDepth);
        DECLARE_ID(pwmModeLfo);
        DECLARE_ID(pwmAmount);
        
        // --- Visual / Scope ---
        DECLARE_ID(VISUAL);
        DECLARE_ID(scope);
        DECLARE_ID(followsPreset);
        DECLARE_ID(mode);
        DECLARE_ID(currentContext);
        DECLARE_ID(audio);
        DECLARE_ID(mod);
        DECLARE_ID(viewMode);
        DECLARE_ID(sourceA);
        DECLARE_ID(sourceB);
        DECLARE_ID(timebase);
        DECLARE_ID(scale);
        DECLARE_ID(trigger);
        DECLARE_ID(freeze);
        DECLARE_ID(value);
        #undef DECLARE_ID
    }

    // Estructuras de intercambio de datos (snapshots)
    struct LayerParams {
        float levelDb = 0.0f;
        float pan = 0.0f;
        float cutoff = 2000.0f;
        float resonance = 0.2f;
        int hpfPos = 1;
        bool vcaGateMode = false;
        float analogDrift = 0.1f;
        
        bool sawOn = true;
        bool pulseOn = true;
        float subLevel = 0.5f;
        float noiseLevel = 0.05f;
        bool pwmModeLfo = false;
        float pwmAmount = 0.5f;
        
        float vcfEnvDepth = 0.5f;
        float vcfLfoDepth = 0.0f;
        float vcfKybd = 0.5f;
        bool vcfEnvInv = false;
        float dcoLfoDepth = 0.0f;
    };

    struct AceComponent {
        std::string slotName;
        std::string slotType;
        std::string componentId;
        std::map<std::string, float> params;
    };

    struct VoiceArchitecture {
        std::vector<AceComponent> oscillators;
        std::vector<AceComponent> filters;
        std::vector<AceComponent> lfos;
        std::vector<AceComponent> envelopes;
        std::vector<AceComponent> amplifiers;
        std::vector<AceComponent> modulators;
        std::vector<AceComponent> auxiliary;
    };

    struct Layer {
        std::string id;
        std::string name;
        LayerParams params;
        VoiceArchitecture voiceArch;
    };

    /**
     * @brief Fachada sobre juce::ValueTree para gestionar presets de OMEGA.
     */
    class OmegaPreset {
    public:
        OmegaPreset();
        explicit OmegaPreset(const juce::ValueTree& tree);
        OmegaPreset(const OmegaPreset& other);
        OmegaPreset& operator=(const OmegaPreset& other);

        // --- Factory Methods ---
        static OmegaPreset createEmpty();
        static OmegaPreset createDefault();
        static OmegaPreset createDefaultVirtualAnalog();
        
        // --- Serialization ---
        static bool fromYaml(const std::string& yamlSource, OmegaPreset& outPreset);
        bool loadFromYaml(const std::string& filePath);
        bool saveToYaml(const std::string& filePath) const;
        std::string toYaml() const;
        std::string calculateHash() const;

        // --- Typed API ---
        juce::String getUuid() const;
        void setUuid(const juce::String& uuid);

        juce::String getName() const;
        void setName(const juce::String& name);

        juce::String getAuthor() const;
        void setAuthor(const juce::String& author);

        juce::String getEngine() const;
        void setEngine(const juce::String& engine);

        float getMasterGainDb() const;
        void setMasterGainDb(float db);

        // --- Layers API ---
        int getNumLayers() const;
        juce::ValueTree getLayerTree(int index) const;
        void addLayer(const juce::String& name);
        void addLayer(const Layer& layer);
        void addEnvelope(const AceComponent& comp);
        void addAmplifier(const AceComponent& comp);
        void addModulator(const AceComponent& comp);
        void addAuxiliary(const AceComponent& comp);
        void addComponent(const AceComponent& comp, const juce::Identifier& categoryId); 
        void removeLayer(int index);

        // Acceso al árbol subyacente
        juce::ValueTree& getState() { return mState; }
        const juce::ValueTree& getState() const { return mState; }
        
        // --- Persistence API ---
        juce::ValueTree getScopeTree();
        void resetScopeToDefault();

        bool isValid() const { return mState.isValid(); }

    private:
        juce::ValueTree mState { IDs::OMEGAPRESET };

        // Helpers para conversión ValueTree <-> YAML
        static juce::ValueTree yamlToValueTree(const YAML::Node& node);
        static YAML::Node valueTreeToYaml(const juce::ValueTree& tree);
    };

} // namespace Preset
} // namespace Core
} // namespace Omega
