#pragma once

#include <string>
#include <vector>
#include <juce_core/juce_core.h>

namespace Omega {
namespace Core {
namespace Modulation {

    /**
     * @brief Port types for semantic discovery.
     */
    enum class ModPortType {
        Audio,      // Audio signals (High-res mono/stereo)
        CV,         // Modulation signals (Bipolar/Unipolar)
        Gate,       // Binary/Trigger signals
        MIDI,       // Raw MIDI event stream
        Digital     // Custom digital data
    };

    /**
     * @brief Descriptor for a module input or output port.
     */
    struct PortDescriptor {
        std::string id;         // Internal ID (e.g., "pitch_in")
        std::string label;      // UI Label (e.g., "PITCH")
        ModPortType type;       // CV, Audio, etc.
        bool isInput = false;   // Direction
        int telemetryIndex = -1; // Mapping to high-speed buffer (-1 if not visualizable)
    };

    /**
     * @brief The Manifest: A module's "Social Contract".
     * Every module advertises its capabilities through this structure.
     */
    struct ModuleManifest {
        std::string instanceId;     // Unique in rack (e.g., "LFO-1")
        std::string modelId;        // Model reference (e.g., "LFO-STD-01")
        std::string category;       // Family (LFO, OSC, ENV, TRIG, etc.)
        
        std::vector<PortDescriptor> ports;

        // Helpers to filter ports
        std::vector<PortDescriptor> getInputs() const {
            std::vector<PortDescriptor> results;
            for (const auto& p : ports) if (p.isInput) results.push_back(p);
            return results;
        }

        std::vector<PortDescriptor> getOutputs() const {
            std::vector<PortDescriptor> results;
            for (const auto& p : ports) if (!p.isInput) results.push_back(p);
            return results;
        }
    };

} // namespace Modulation
} // namespace Core
} // namespace Omega
