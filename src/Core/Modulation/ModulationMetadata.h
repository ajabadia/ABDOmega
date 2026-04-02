#pragma once

#include <string>
#include <vector>
#include <map>
#include "ModulationGraph.h"
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
        Custom = 100 // Base for dynamic/component parameters
    };

    /**
     * @brief Central registry for modulation capabilities.
     */
    class ModulationRegistry {
    public:
        static TargetStableId getStableId(const std::string& targetId) {
            static const std::map<std::string, TargetStableId> mapping = {
                {"layer.a.osc.pitch",  TargetStableId::Pitch},
                {"layer.a.vcf.cutoff", TargetStableId::Cutoff},
                {"layer.a.vcf.res",    TargetStableId::Resonance},
                {"layer.a.vca.gain",   TargetStableId::VcaGain},
                {"layer.a.osc.pwm",    TargetStableId::PwmAmount},
                {"layer.a.lfo.rate",   TargetStableId::LfoRate},
                {"layer.a.env.attack", TargetStableId::EnvAttack}
            };
            if (mapping.count(targetId)) return mapping.at(targetId);
            return TargetStableId::None;
        }

        static uint8_t getSignalIndex(const std::string& sourceId) {
            using namespace Omega::Core::Voice;
            if (sourceId == "lfo.1") return CompiledSignalSpace::lfo(0);
            if (sourceId == "lfo.2") return CompiledSignalSpace::lfo(1);
            if (sourceId == "env.1") return CompiledSignalSpace::adsr(0);
            if (sourceId == "env.2") return CompiledSignalSpace::adsr(1);
            if (sourceId == "midi.vel") return CompiledSignalSpace::kVelocity;
            if (sourceId == "midi.mw")  return CompiledSignalSpace::kModWheel;
            return CompiledSignalSpace::kInvalid;
        }

        static std::vector<SourceDescriptor> getAvailableSources() {
            return {
                {"lfo.1",   "LFO 1",    SourceCategory::LFO, NodeType::LFO, 0},
                {"lfo.2",   "LFO 2",    SourceCategory::LFO, NodeType::LFO, 1},
                {"env.1",   "ENV 1",    SourceCategory::Envelope, NodeType::Envelope, 0},
                {"env.2",   "ENV 2",    SourceCategory::Envelope, NodeType::Envelope, 1},
                {"midi.vel", "VELOCITY", SourceCategory::MIDI, NodeType::MIDIInput, -1},
                {"midi.mw",  "MOD WHEEL", SourceCategory::MIDI, NodeType::MIDIInput, -1}
            };
        }

        static std::vector<TargetDescriptor> getAvailableTargets() {
            return {
                {"layer.a.osc.pitch",  "OSC PITCH",   NodeType::VoicePitch, "pitch"},
                {"layer.a.vcf.cutoff", "VCF CUTOFF",  NodeType::FilterCutoff, "cutoff"},
                {"layer.a.vcf.res",    "VCF RES",     NodeType::FilterCutoff, "resonance"},
                {"layer.a.vca.gain",   "VCA GAIN",    NodeType::CustomParameter, "gain"},
                {"layer.a.osc.pwm",    "OSC PWM",     NodeType::CustomParameter, "pwm"},
                {"layer.a.lfo.rate",   "LFO RATE",    NodeType::LFO, "rate"},
                {"layer.a.env.attack", "ENV ATTACK",  NodeType::Envelope, "attack"}
            };
        }

        static bool isValidSource(const std::string& id) {
            for (const auto& s : getAvailableSources()) if (s.id == id) return true;
            return false;
        }

        static bool isValidTarget(const std::string& id) {
            for (const auto& t : getAvailableTargets()) if (t.id == id) return true;
            return false;
        }
    };

} // namespace Modulation
} // namespace Core
} // namespace Omega
