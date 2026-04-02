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

        // OMEGA Master LFO
        float lfoRate = 1.0f;
        int lfoWave = 0;

        // Roland JP-808X
        float jpDetune = 0.1f;
        float jpSpread = 0.5f;

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
     * @brief Voice Architecture 2.0 - Dynamic Topology Node
     */
    enum class VoiceNodeRole {
        Source,     // Oscillators, Noise
        Sink,       // Master Out, Bus Out
        Processor,  // Filters, Shapers, Amps
        Controller, // Envelopes, LFOs
        Auxiliary   // Visualizers, Analyzers
    };

    struct VoiceNode {
        std::string id;
        std::string componentId;
        std::string slotName;
        std::string slotType;
        VoiceNodeRole role = VoiceNodeRole::Processor;
        std::map<std::string, float> params;
    };

    struct VoiceConnection {
        std::string from;
        std::string to;
        std::string bus; // "audio0", "mod0", etc.
    };

    struct VoiceChain {
        std::vector<VoiceNode> nodes;
        std::vector<VoiceConnection> connections;
    };

    /**
     * @brief High-level layer definition.
     */
    struct Layer {
        std::string id;
        std::string name;
        LayerParams params;
        VoiceArchitecture voiceArch; // Legacy category-based
        VoiceChain voiceChain;      // 2.0 Graph-based
    };

    /**
     * @brief A single modulation routing slot.
     */
    struct ModMatrixSlot {
        std::string source;      // e.g. "lfo.1", "midi.vel"
        std::string target;      // e.g. "layer.a.cutoff"
        float amount = 0.0f;     // [-1.0, 1.0]
        std::string via;         // Optional modifier, e.g. "midi.modwheel"
        float viaAmount = 1.0f;  // [0.0, 1.0]
        bool active = false;
    };

} // namespace Preset
} // namespace Core
} // namespace Omega
