#pragma once

#include <string>
#include <vector>
#include <map>
#include "OmegaIdentifiers.h"

namespace Omega {
namespace Core {
namespace Preset {

    /**
     * @brief Parameters for a single synthesis layer.
     * These directly map to the 'params' node in the ValueTree.
     */
    struct LayerParams {
        float levelDb = 0.0f;
        float pan = 0.0f;
        float cutoff = 2000.0f;
        float resonance = 0.2f;
        int hpfPosition = 1;      // Unified ID
        bool vcaGateMode = false;
        float analogDrift = 0.1f;
        
        bool sawOn = true;
        bool pulseOn = true;
        float subLevel = 0.5f;
        float noiseLevel = 0.05f;
        int pwmMode = 0;         // 0=Manual, 1=LFO (Unified: was pwmModeLfo bool)
        float pwmAmount = 0.5f;
        
        float vcfEnvDepth = 0.5f;
        float vcfModDepth = 0.0f;
        float vcfKeyTracking = 0.5f; // Unified: was vcfKybd
        bool vcfEnvInverted = false; // Unified: was vcfEnvInv
        float dcoLfoDepth = 0.0f;

        // ADSR (Explicitly added to schema)
        float attack = 10.0f;
        float decay = 100.0f;
        float sustain = 0.8f;
        float release = 500.0f;

        // Korg Specific
        float korgHpCutoff = 100.0f;
        float korgHpResonance = 0.1f;
        float korgGrit = 1.0f;
    };

    /**
     * @brief A generic component descriptor (Oscillator, Filter, Envelope, etc.)
     */
    struct AceComponent {
        std::string slotName;
        std::string slotType;
        std::string componentId;
        std::map<std::string, float> params;
    };

    /**
     * @brief The modular architecture graph (serialized as lists of components)
     */
    struct VoiceArchitecture {
        std::vector<AceComponent> oscillators;
        std::vector<AceComponent> filters;
        std::vector<AceComponent> lfos;
        std::vector<AceComponent> envelopes;
        std::vector<AceComponent> amplifiers;
        std::vector<AceComponent> modulators;
        std::vector<AceComponent> fxSlots;
        std::vector<AceComponent> auxiliary;
    };

    /**
     * @brief High-level layer definition.
     */
    struct Layer {
        std::string id;
        std::string name;
        LayerParams params;
        VoiceArchitecture voiceArch;
    };

} // namespace Preset
} // namespace Core
} // namespace Omega
