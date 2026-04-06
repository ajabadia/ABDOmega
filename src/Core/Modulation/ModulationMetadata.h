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
     */
    class ModulationRegistry {
    public:
        static TargetStableId getStableId(const std::string& targetId) {
            static const std::map<std::string, TargetStableId> mapping = {
                // Unified Canonical IDs (Build #195)
                {"layer.a.pitch",      TargetStableId::Pitch},
                {"layer.a.gate",       TargetStableId::Gate},
                {"layer.a.gain",       TargetStableId::VcaGain},
                {"layer.a.cutoff",     TargetStableId::Cutoff},
                {"layer.a.resonance",  TargetStableId::Resonance},
                {"layer.a.pwm",        TargetStableId::PwmAmount},
                {"mcv.1.midi",         TargetStableId::Custom},
                
                // Component Specific Aliases (Build #200 Systemic)
                {"osc.1.pitch",        TargetStableId::Pitch},
                {"osc.1.cutoff",       TargetStableId::Cutoff},
                {"osc.1.resonance",    TargetStableId::Resonance},
                {"osc.1.pwm",          TargetStableId::PwmAmount},
                {"env.1.attack",       TargetStableId::EnvAttack},
                {"env.1.decay",        TargetStableId::EnvDecay},
                {"env.1.sustain",      TargetStableId::EnvSustain},
                {"env.1.release",      TargetStableId::EnvRelease},
                {"env.1.gate",         TargetStableId::Gate},
                {"vca.1.gain",         TargetStableId::VcaGain},
                {"mcv.1.midi",         TargetStableId::Custom},
                {"mon.1.midi",         TargetStableId::Custom}
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
            
            // MIDI-to-CV published signals
            if (sourceId == "mcv.1.pitch") return CompiledSignalSpace::kMidiToCvPitch;
            if (sourceId == "mcv.1.gate")  return CompiledSignalSpace::kMidiToCvGate;
            if (sourceId == "mcv.1.vel")   return CompiledSignalSpace::kMidiToCvVelocity;
            if (sourceId == "mcv.1.mw")    return CompiledSignalSpace::kMidiToCvModWheel;
            if (sourceId == "mcv.1.at")    return CompiledSignalSpace::kMidiToCvAftertouch;
            if (sourceId == "mcv.1.pb")    return CompiledSignalSpace::kMidiToCvPitchBend;
            if (sourceId == "mcv.1.timbre") return CompiledSignalSpace::kMidiToCvTimbre;
            
            // MIDI-Link (Build #197)
            if (sourceId == "trig.1.midi") return CompiledSignalSpace::kMidiLink;
            
            return CompiledSignalSpace::kInvalid;
        }

        static std::vector<SourceDescriptor> getAvailableSources() {
            return {
                {"lfo.1",   "LFO 1",    SourceCategory::LFO, NodeType::LFO, 0},
                {"lfo.2",   "LFO 2",    SourceCategory::LFO, NodeType::LFO, 1},
                {"env.1",   "ENV 1",    SourceCategory::Envelope, NodeType::Envelope, 0},
                {"env.2",   "ENV 2",    SourceCategory::Envelope, NodeType::Envelope, 1},
                {"midi.vel", "VELOCITY", SourceCategory::MIDI, NodeType::MIDIInput, -1},
                {"midi.mw",  "MOD WHEEL", SourceCategory::MIDI, NodeType::MIDIInput, -1},
                
                // MIDI-to-CV (Build #190 Alignment)
                {"mcv.1.pitch", "MCV PITCH", SourceCategory::Internal, NodeType::MIDIInput, -1},
                {"mcv.1.gate",  "MCV GATE",  SourceCategory::Internal, NodeType::MIDIInput, -1},
                {"mcv.1.vel",   "MCV VEL",   SourceCategory::Internal, NodeType::MIDIInput, -1},
                {"mcv.1.mw",    "MCV MODW",  SourceCategory::Internal, NodeType::MIDIInput, -1},
                {"mcv.1.at",    "MCV AFTER", SourceCategory::Internal, NodeType::MIDIInput, -1},
                {"mcv.1.pb",    "MCV BEND",  SourceCategory::Internal, NodeType::MIDIInput, -1},
                {"mcv.1.timbre", "MCV TIMBRE", SourceCategory::Internal, NodeType::MIDIInput, -1},

                // MIDI Link (Build #197)
                {"trig.1.midi", "MIDI TRIG OUT", SourceCategory::MIDI, NodeType::MIDIInput, -1}
            };
        }

        static std::vector<TargetDescriptor> getAvailableTargets() {
            return {
                {"layer.a.pitch",      "VOICE PITCH", NodeType::VoicePitch, "pitch"},
                {"layer.a.gate",       "VOICE GATE",  NodeType::CustomParameter, "gate"},
                {"layer.a.gain",       "VOICE GAIN",  NodeType::CustomParameter, "gain"},
                {"layer.a.cutoff",     "VCF CUTOFF",  NodeType::FilterCutoff, "cutoff"},
                {"layer.a.resonance",  "VCF RES",     NodeType::FilterCutoff, "resonance"},
                {"layer.a.pwm",        "OSC PWM",     NodeType::CustomParameter, "pwm"},
                
                // MIDI Targets
                {"mcv.1.midi",         "MCV MIDI IN", NodeType::CustomParameter, "mcv_midi"}
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
