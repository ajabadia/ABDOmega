#pragma once

#include <string>
#include <vector>
#include <map>
#include "ModulationTypes.h"
#include "../Voice/CompiledVoicePlan.h"

namespace Omega {
namespace Core {
namespace Modulation {

    /**
     * @brief High-level categories for modulation sources.
     */
    enum class SourceCategory {
        LFO,
        Envelope,
        MIDI,
        Macro,
        Internal
    };

    /**
     * @brief Descriptor for a modulation source.
     */
    struct SourceDescriptor {
        std::string id;             // e.g. "lfo.1"
        std::string name;           // e.g. "LFO 1"
        SourceCategory category;
        NodeType graphNodeType;
        int voiceIndex;             // -1 for global, 0+ for per-voice
    };

    /**
     * @brief Descriptor for a modulation destination.
     */
    struct TargetDescriptor {
        std::string id;             // e.g. "layer.a.cutoff"
        std::string name;           // e.g. "VCF Cutoff"
        NodeType graphNodeType;
        std::string parameterId;    // The actual param ID linked to this sink
    };

    /**
     * @brief Stable IDs for modulation targets (used in CompiledVoicePlan).
     * These must remain constant to avoid breaking binary compatibility of plans.
     */
    enum class TargetStableId : uint32_t {
        None = 0,
        Pitch = 1,
        Cutoff = 2,
        Resonance = 3,
        VcaGain = 4,
        PwmAmount = 5,
        LfoRate = 6,
        EnvAttack = 7,
        EnvDecay = 8,
        EnvSustain = 9,
        EnvRelease = 10,
        Gate = 11,
        Custom = 100 // Base for dynamic/component parameters
    };

    /**
     * @brief Central registry for modulation capabilities.
     * VA 2.1: This registry is now a bridge. Static discovery is deprecated in favor of 
     * manifest-driven ports from SemanticBrokerService.
     */
    class ModulationRegistry {
    public:
        static TargetStableId getStableId(const std::string& targetId) {
            // Unified Modular Resolution (Build #311)
            // Local port IDs are resolved by the unit itself.
            // Global voice parameters map to Stable IDs.
            if (targetId.find("pitch") != std::string::npos) return TargetStableId::Pitch;
            if (targetId.find("gate") != std::string::npos) return TargetStableId::Gate;
            if (targetId.find("gain") != std::string::npos) return TargetStableId::VcaGain;
            if (targetId.find("cutoff") != std::string::npos) return TargetStableId::Cutoff;
            if (targetId.find("resonance") != std::string::npos) return TargetStableId::Resonance;
            if (targetId.find("attack") != std::string::npos) return TargetStableId::EnvAttack;
            if (targetId.find("decay") != std::string::npos) return TargetStableId::EnvDecay;
            if (targetId.find("sustain") != std::string::npos) return TargetStableId::EnvSustain;
            if (targetId.find("release") != std::string::npos) return TargetStableId::EnvRelease;
            
            return TargetStableId::Custom; 
        }

        static uint8_t getSignalIndex(const std::string& sourceId) {
            using namespace Omega::Core::Voice;
            
            // VA 2.1: Semantic Signal Mapping
            if (sourceId.find("pitch") != std::string::npos) return CompiledSignalSpace::kMidiToCvPitch;
            if (sourceId.find("gate") != std::string::npos)  return CompiledSignalSpace::kMidiToCvGate;
            if (sourceId.find("vel") != std::string::npos)   return CompiledSignalSpace::kMidiToCvVelocity;
            if (sourceId.find("midi") != std::string::npos)  return CompiledSignalSpace::kMidiLink;
            
            // Static internal sources (Wait for removal in VA 2.2)
            if (sourceId == "lfo.1") return CompiledSignalSpace::lfo(0);
            if (sourceId == "env.1") return CompiledSignalSpace::adsr(0);
            
            return CompiledSignalSpace::kInvalid;
        }

        /**
         * @brief Returns sources that are ALWAYS present regardless of the patch.
         */
        static std::vector<SourceDescriptor> getStaticSources() {
            return {
                {"midi.vel", "VELOCITY", SourceCategory::MIDI, NodeType::MIDIInput, -1},
                {"midi.mw",  "MOD WHEEL", SourceCategory::MIDI, NodeType::MIDIInput, -1}
            };
        }

        // DEPRECATED: Discovery should now happen via SemanticBrokerService::getInventory()
        static std::vector<SourceDescriptor> getAvailableSources() { return getStaticSources(); }
        static std::vector<TargetDescriptor> getAvailableTargets() { return {}; }


        static bool isValidSource(const std::string& id) { return !id.empty(); }
        static bool isValidTarget(const std::string& id) { return !id.empty(); }
    };

} // namespace Modulation
} // namespace Core
} // namespace Omega
