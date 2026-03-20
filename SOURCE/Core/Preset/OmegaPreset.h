#pragma once

#include <string>
#include <vector>
#include <map>

namespace Omega::Core::Preset {

    struct LayerParams {
        float levelDb = 0.0f;
        float pan = 0.0f;
        float cutoff = 2000.0f;
        float resonance = 0.2f;
        int hpfPos = 1; // 0=Boost, 1=Bypass, 2, 3
        bool vcaGateMode = false;
        float analogDrift = 0.1f;
        
        // Modular Hardware
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
        std::string slotType; // e.g., "Oscillator", "Filter"
        std::string slotName; // e.g., "Osc1", "Filter1"
        std::string componentId;
        bool enabled = true;
        std::map<std::string, float> params;
    };

    struct ModRoute {
        std::string source;
        std::string destination;
        float amount = 0.0f;
        bool bipolar = false;
    };

    struct ModGraphNodeData {
        uint32_t id;
        std::string type;
        std::string name;
        std::map<std::string, float> params;
    };

    struct ModGraphConnectionData {
        uint32_t sourceNode;
        uint32_t destNode;
        uint8_t destInput;
        float amount = 1.0f;
    };

    struct ModulationGraphData {
        std::vector<ModGraphNodeData> nodes;
        std::vector<ModGraphConnectionData> connections;
    };

    struct VoiceArchitecture {
        std::vector<AceComponent> oscillators;
        std::vector<AceComponent> filters;
        std::vector<AceComponent> envelopes;
        std::vector<AceComponent> lfos;
        std::vector<AceComponent> fx;
    };

    struct Layer {
        std::string id;
        std::string name;
        int polyphony = 8;
        LayerParams params;
        VoiceArchitecture voiceArch;
        std::vector<ModRoute> modulationMatrix; // Legacy/Simple matrix
        ModulationGraphData modulationGraph;    // Advanced Graph
    };

    /**
     * @brief Representación central de un preset de OMEGA.
     * [Architecture]: Diseñado para ser serializado a YAML y validado por ACE.
     */
    class OmegaPreset {
    public:
        std::string id;
        std::string name;
        std::string author;
        std::string engine = "VirtualAnalog";
        float masterGainDb = 0.0f;
        
        std::vector<Layer> layers;

        // Métodos de serialización
        static bool fromYaml(const std::string& yamlSource, OmegaPreset& outPreset);
        std::string toYaml() const;
    };

} // namespace Omega::Core::Preset
