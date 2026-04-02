#pragma once

#include <string>
#include <vector>
#include <map>
#include <juce_core/juce_core.h>
#include <juce_data_structures/juce_data_structures.h>

#include "OmegaIdentifiers.h"
#include "OmegaPresetSchema.h"
#include "OmegaPresetCodecYaml.h"
#include "OmegaPresetNormalizer.h"
#include "OmegaPresetDefaults.h"

namespace Omega {
namespace Core {
namespace Preset {

    /**
     * @brief Refactored Facade for OMEGA Presets.
     * Delegates to Schema, Codec, Normalizer, and Defaults.
     */
    class OmegaPreset {
    public:
        using IDs = Omega::Core::Identifiers;

        OmegaPreset();
        explicit OmegaPreset(const juce::ValueTree& tree);
        OmegaPreset(const OmegaPreset& other);
        OmegaPreset& operator=(const OmegaPreset& other);

        // --- Factory Methods ---
        static OmegaPreset createEmpty() { return OmegaPreset(); }
        static OmegaPreset createDefault();
        static OmegaPreset createDefaultVirtualAnalog();
        
        // --- Serialization & Normalization ---
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

        // Accessors
        juce::ValueTree& getState() { return mState; }
        const juce::ValueTree& getState() const { return mState; }
        
        // --- Visual / Scope ---
        juce::ValueTree getScopeTree();
        void resetScopeToDefault();

        // --- Modulation Matrix 2.0 ---
        int getNumModSlots() const;
        ModMatrixSlot getModSlot(int index) const;
        void setModSlot(int index, const ModMatrixSlot& slot);
        void clearModMatrix();

        bool isValid() const { return mState.isValid(); }

    private:
        juce::ValueTree mState { IDs::OMEGAPRESET };
    };

} // namespace Preset
} // namespace Core
} // namespace Omega
