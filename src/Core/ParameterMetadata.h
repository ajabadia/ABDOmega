#pragma once

#include <string>
#include <vector>
#include <map>
#include <memory>
#include <juce_core/juce_core.h>
// #include "Input/ModSource.h" - ASEPTIC PURGE
#include "OmegaIdentifiers.h"

namespace Omega {
namespace Core {

/**
 * @brief Minimalist ModSource for Era 7 Aseptic Bridge.
 * Decoupled from legacy Input/ModSource.h.
 */
enum class ModSource {
    Count,
    PE1, PE2,
    ModWheel, Breath, Expression, Sustain, Ribbon
};

enum class ParamValueType {
    Continuous,
    Integer,
    Boolean,
    Enum
};

struct ParameterOption {
    int value;
    std::string label;
};

/**
 * Descriptor for a single synthesizer parameter.
 * Used to unify UI, MIDI, and DSP logic.
 */
struct ParameterDescriptor {
    std::string id;
    std::string name;
    std::string description;
    
    ParamValueType valueType = ParamValueType::Continuous;
    
    float minValue = 0.0f;
    float maxValue = 1.0f;
    float defaultValue = 0.5f;
    float step = 0.0f;
    float skew = 1.0f; // 1.0 = linear, other = logarithmic-style mapping
    
    std::string unit = "%";
    std::string groupId = "Global";
    std::string category = "synthesis"; // synthesis, modulation, midi, global
    std::string uiControl = "knob";     // knob, switch, select, slider, button
    
    bool expert = false;
    
    // For MIDI mapping
    int ccNumber = -1;
    
    // For Modulation mapping (if this parameter can be a modulation source or target)
    Omega::Core::ModSource modSource = Omega::Core::ModSource::Count;

    // For Telemetry mapping (index in ModulationTelemetryHub)
    int telemetryIndex = -1;
    
    // For ValueTree mapping (property name in IDs::params node)
    juce::Identifier valueTreePropertyId;

    std::vector<ParameterOption> options;
};

/**
 * Central registry for all parameters in the OMEGA system.
 */
class ParameterMetadataRegistry {
public:
    static ParameterMetadataRegistry& getInstance() {
        static ParameterMetadataRegistry instance;
        return instance;
    }

    void registerParameter(const ParameterDescriptor& desc) {
        mParameters[desc.id] = desc;
        if (desc.ccNumber >= 0) {
            mMidiMap[desc.ccNumber] = desc.id;
        }
    }

    const ParameterDescriptor* getParameter(const std::string& id) const {
        auto it = mParameters.find(id);
        return (it != mParameters.end()) ? &it->second : nullptr;
    }

    const std::map<std::string, ParameterDescriptor>& getAllParameters() const {
        return mParameters;
    }

    std::string getParamIdFromCC(int cc) const {
        auto it = mMidiMap.find(cc);
        return (it != mMidiMap.end()) ? it->second : "";
    }

    Omega::Core::ModSource getModSourceFromCC(int cc) const {
        auto id = getParamIdFromCC(cc);
        if (id.empty()) return Omega::Core::ModSource::Count;
        
        auto it = mParameters.find(id);
        return (it != mParameters.end()) ? it->second.modSource : Omega::Core::ModSource::Count;
    }

    // Common Factory
    void initializeDefaults() {
        using IDs = Identifiers;

        // --- JUNO FAMILY / CORE ---
        registerParameter({"layer.a.cutoff", "Cutoff", "Main low-pass filter cutoff", ParamValueType::Continuous, 20.0f, 20000.0f, 2000.0f, 0.0f, 0.3f, "Hz", "VCF", "synthesis", "knob", false, 74, Omega::Core::ModSource::PE1, 8, IDs::cutoff});
        registerParameter({"layer.a.resonance", "Resonance", "Filter resonance / Q", ParamValueType::Continuous, 0.0f, 1.0f, 0.1f, 0.0f, 1.0f, "%", "VCF", "synthesis", "knob", false, 71, Omega::Core::ModSource::PE2, 7, IDs::resonance});
        
        ParameterDescriptor chorusMode = {"global.chorus.mode", "Chorus Mode", "Juno-style chorus selection", ParamValueType::Enum, 0.0f, 3.0f, 1.0f, 1.0f, 1.0f, "Choice", "FX", "synthesis", "select", false, 93, Omega::Core::ModSource::Count, -1, IDs::mode};
        chorusMode.options = {{0, "Off"}, {1, "I"}, {2, "II"}, {3, "I+II"}};
        registerParameter(chorusMode);

        registerParameter({"global.chorus.mix", "Chorus Mix", "Juno chorus wet/dry level", ParamValueType::Continuous, 0.0f, 1.0f, 0.5f, 0.0f, 1.0f, "%", "FX", "synthesis", "knob", false, -1, Omega::Core::ModSource::Count, -1, IDs::levelDb}); // Reusing levelDb for mix for now

        ParameterDescriptor hpfPos = {"layer.a.hpf.pos", "HPF Position", "High-pass filter mode", ParamValueType::Enum, 0.0f, 3.0f, 1.0f, 1.0f, 1.0f, "Choice", "VCF", "synthesis", "switch", false, 81, Omega::Core::ModSource::Count, -1, IDs::hpfPosition};
        hpfPos.options = {{0, "Off"}, {1, "1"}, {2, "2"}, {3, "3"}};
        registerParameter(hpfPos);

        ParameterDescriptor vcaMode = {"layer.a.vca.mode", "VCA Mode", "VCA Gate or Envelope mode", ParamValueType::Enum, 0.0f, 1.0f, 0.0f, 1.0f, 1.0f, "Choice", "VCA", "synthesis", "switch", false, -1, Omega::Core::ModSource::Count, -1, IDs::vcaGateMode};
        vcaMode.options = {{0, "Gate"}, {1, "Env"}};
        registerParameter(vcaMode);

        registerParameter({"layer.a.drift", "Analog Drift", "Simulated oscillator pitch instability", ParamValueType::Continuous, 0.0f, 1.0f, 0.1f, 0.0f, 1.0f, "%", "DCO", "synthesis", "knob", false, -1, Omega::Core::ModSource::Count, -1, IDs::analogDrift});
        
        registerParameter({"layer.a.osc.saw.on", "Saw On", "Toggle Sawtooth waveform", ParamValueType::Boolean, 0.0f, 1.0f, 1.0f, 1.0f, 1.0f, "Bool", "DCO", "synthesis", "switch", false, -1, Omega::Core::ModSource::Count, -1, IDs::sawOn});
        registerParameter({"layer.a.osc.pulse.on", "Pulse On", "Toggle Pulse/Square waveform", ParamValueType::Boolean, 0.0f, 1.0f, 1.0f, 1.0f, 1.0f, "Bool", "DCO", "synthesis", "switch", false, -1, Omega::Core::ModSource::Count, -1, IDs::pulseOn});
        registerParameter({"layer.a.osc.sub.level", "Sub Level", "Sub-oscillator volume", ParamValueType::Continuous, 0.0f, 1.0f, 0.5f, 0.0f, 1.0f, "%", "DCO", "synthesis", "knob", false, -1, Omega::Core::ModSource::Count, -1, IDs::subLevel});
        registerParameter({"layer.a.osc.noise.level", "Noise Level", "White noise volume", ParamValueType::Continuous, 0.0f, 1.0f, 0.05f, 0.0f, 1.0f, "%", "DCO", "synthesis", "knob", false, -1, Omega::Core::ModSource::Count, -1, IDs::noiseLevel});
        
        ParameterDescriptor pwmMode = {"layer.a.osc.pwm.mode", "PWM Mode", "Pulse Width Modulation source", ParamValueType::Enum, 0.0f, 1.0f, 0.0f, 1.0f, 1.0f, "Choice", "DCO", "synthesis", "switch", false, -1, Omega::Core::ModSource::Count, -1, IDs::pwmMode};
        pwmMode.options = {{0, "Manual/LFO"}, {1, "Env"}};
        registerParameter(pwmMode);

        registerParameter({"layer.a.osc.pwm.amount", "PWM Amount", "Pulse width or PWM modulation depth", ParamValueType::Continuous, 0.0f, 1.0f, 0.5f, 0.0f, 1.0f, "%", "DCO", "synthesis", "knob", false, -1, Omega::Core::ModSource::Count, -1, IDs::pwmAmount});
        
        registerParameter({"layer.a.vcf.env.depth", "VCF Env Depth", "Envelope modulation of cutoff", ParamValueType::Continuous, 0.0f, 1.0f, 0.5f, 0.0f, 1.0f, "%", "VCF", "synthesis", "knob", false, -1, Omega::Core::ModSource::Count, -1, IDs::vcfEnvDepth});
        registerParameter({"layer.a.vcf.lfo.depth", "VCF LFO Depth", "LFO modulation of cutoff", ParamValueType::Continuous, 0.0f, 1.0f, 0.0f, 0.0f, 1.0f, "%", "VCF", "synthesis", "knob", false, -1, Omega::Core::ModSource::Count, -1, IDs::vcfModDepth});
        registerParameter({"layer.a.vcf.keytrack", "VCF Keytrack", "Keyboard tracking of cutoff", ParamValueType::Continuous, 0.0f, 1.0f, 0.5f, 0.0f, 1.0f, "%", "VCF", "synthesis", "knob", false, -1, Omega::Core::ModSource::Count, -1, IDs::vcfKeyTracking});
        
        ParameterDescriptor vcfPol = {"layer.a.vcf.env.inv", "VCF Env Polarity", "Inverts the VCF envelope", ParamValueType::Enum, 0.0f, 1.0f, 0.0f, 1.0f, 1.0f, "Choice", "VCF", "synthesis", "switch", false, -1, Omega::Core::ModSource::Count, -1, IDs::vcfEnvInverted};
        vcfPol.options = {{0, "Normal"}, {1, "Inverted"}};
        registerParameter(vcfPol);
        
        registerParameter({"layer.a.dco.lfo.depth", "DCO LFO Depth", "LFO modulation of pitch (Vibrato)", ParamValueType::Continuous, 0.0f, 1.0f, 0.0f, 0.0f, 1.0f, "%", "DCO", "synthesis", "knob", false, -1, Omega::Core::ModSource::Count, -1, IDs::dcoLfoDepth});
        
        registerParameter({"layer.a.lfo.rate", "LFO Rate", "LFO cycle speed", ParamValueType::Continuous, 0.01f, 20.0f, 1.0f, 0.0f, 0.3f, "Hz", "LFO", "synthesis", "knob", false, -1, Omega::Core::ModSource::Count, -1, IDs::lfoRate});
        
        ParameterDescriptor lfoWave = {"layer.a.lfo.wave", "LFO Wave", "LFO waveform selection", ParamValueType::Enum, 0.0f, 5.0f, 0.0f, 1.0f, 1.0f, "Choice", "LFO", "synthesis", "select", false, -1, Omega::Core::ModSource::Count, -1, IDs::lfoWave};
        lfoWave.options = {{0, "Sin"}, {1, "Tri"}, {2, "Saw"}, {3, "Sqr"}, {4, "Rnd"}, {5, "Noi"}};
        registerParameter(lfoWave);
        
        // --- JP-808X ---
        registerParameter({"layer.a.jp.detune", "JP Detune", "SuperSaw detune amount", ParamValueType::Continuous, 0.0f, 1.0f, 0.5f, 0.0f, 1.0f, "%", "DCO", "synthesis", "knob", false, -1, Omega::Core::ModSource::Count, -1, IDs::jpDetune});
        registerParameter({"layer.a.jp.spread", "JP Spread", "SuperSaw detune spread/width", ParamValueType::Continuous, 0.0f, 1.0f, 0.5f, 0.0f, 1.0f, "%", "DCO", "synthesis", "knob", false, -1, Omega::Core::ModSource::Count, -1, IDs::jpSpread});
        
        ParameterDescriptor jpFilterMode = {"layer.a.jp.filter.mode", "JP Filter Mode", "JP-style filter slope selection", ParamValueType::Enum, 0.0f, 2.0f, 0.0f, 1.0f, 1.0f, "Choice", "VCF", "synthesis", "select", false, -1, Omega::Core::ModSource::Count, -1, IDs::mode};
        jpFilterMode.options = {{0, "LP 12dB"}, {1, "LP 24dB"}, {2, "BP"}};
        registerParameter(jpFilterMode);
        
        // --- Korg ---
        registerParameter({"layer.a.korg.hpf.cutoff", "Korg HP Cutoff", "Korg MS-20 style High-pass cutoff", ParamValueType::Continuous, 20.0f, 20000.0f, 100.0f, 0.0f, 0.3f, "Hz", "VCF", "synthesis", "knob", false, -1, Omega::Core::ModSource::Count, -1, IDs::korgHpCutoff});
        registerParameter({"layer.a.korg.hpf.res", "Korg HP Res", "Korg MS-20 style High-pass resonance", ParamValueType::Continuous, 0.0f, 1.0f, 0.1f, 0.0f, 1.0f, "%", "VCF", "synthesis", "knob", false, -1, Omega::Core::ModSource::Count, -1, IDs::korgHpResonance});
        registerParameter({"layer.a.korg.grit", "Korg Grit", "Filter drive/saturation amount", ParamValueType::Continuous, 1.0f, 10.0f, 1.0f, 0.0f, 1.0f, "Mult", "VCF", "synthesis", "knob", false, -1, Omega::Core::ModSource::Count, -1, IDs::korgGrit});
        
        // --- Space Echo ---
        registerParameter({"layer.a.fx.space.enable", "Space Echo Enable", "Enable Roland RE-201 Simulation", ParamValueType::Boolean, 0.0f, 1.0f, 0.0f, 1.0f, 1.0f, "Bool", "FX", "synthesis", "switch", false, -1, Omega::Core::ModSource::Count, -1, IDs::id});
        registerParameter({"layer.a.fx.space.speed", "Echo Speed", "Tape motor speed", ParamValueType::Continuous, 0.0f, 1.0f, 0.5f, 0.0f, 1.0f, "%", "FX", "synthesis", "knob", false, -1, Omega::Core::ModSource::Count, -1, IDs::lfoRate});
        registerParameter({"layer.a.fx.space.intensity", "Intensity", "Echo feedback intensity", ParamValueType::Continuous, 0.0f, 1.0f, 0.4f, 0.0f, 1.0f, "%", "FX", "synthesis", "knob", false, -1, Omega::Core::ModSource::Count, -1, IDs::resonance});
        registerParameter({"layer.a.fx.space.echo.vol", "Echo Volume", "Wet echo signal level", ParamValueType::Continuous, 0.0f, 1.0f, 0.5f, 0.0f, 1.0f, "%", "FX", "synthesis", "knob", false, -1, Omega::Core::ModSource::Count, -1, IDs::levelDb});
        registerParameter({"layer.a.fx.space.rev.vol", "Reverb Volume", "Spring reverb signal level", ParamValueType::Continuous, 0.0f, 1.0f, 0.3f, 0.0f, 1.0f, "%", "FX", "synthesis", "knob", false, -1, Omega::Core::ModSource::Count, -1, IDs::levelDb});
        
        ParameterDescriptor spaceMode = {"layer.a.fx.space.mode", "Echo Mode", "RE-201 Head Selection Mode", ParamValueType::Enum, 1.0f, 12.0f, 1.0f, 1.0f, 1.0f, "Mode", "FX", "synthesis", "select", false, -1, Omega::Core::ModSource::Count, -1, IDs::mode};
        for(int i=1; i<=12; ++i) spaceMode.options.push_back({i, std::to_string(i)});
        registerParameter(spaceMode);

        registerParameter({"layer.a.fx.space.wow", "Wow & Flutter", "Tape speed mod depth", ParamValueType::Continuous, 0.0f, 1.0f, 0.2f, 0.0f, 1.0f, "%", "FX", "synthesis", "knob", false, -1, Omega::Core::ModSource::Count, -1, IDs::analogDrift});
        registerParameter({"layer.a.fx.space.drive", "Tape Drive", "Tape saturation amount", ParamValueType::Continuous, 0.0f, 1.0f, 0.5f, 0.0f, 1.0f, "%", "FX", "synthesis", "knob", false, -1, Omega::Core::ModSource::Count, -1, IDs::resonance});

        // --- ADSR ---
        registerParameter({"layer.a.env.attack", "Attack", "Envelope attack time", ParamValueType::Continuous, 0.1f, 10000.0f, 10.0f, 0.0f, 1.0f, "ms", "ENV", "synthesis", "slider", false, 73, Omega::Core::ModSource::Count, -1, IDs::attack});
        registerParameter({"layer.a.env.decay", "Decay", "Envelope decay time", ParamValueType::Continuous, 0.1f, 10000.0f, 100.0f, 0.0f, 1.0f, "ms", "ENV", "synthesis", "slider", false, 75, Omega::Core::ModSource::Count, -1, IDs::decay});
        registerParameter({"layer.a.env.sustain", "Sustain", "Envelope sustain level", ParamValueType::Continuous, 0.0f, 1.0f, 0.8f, 0.0f, 1.0f, "%", "ENV", "synthesis", "slider", false, 79, Omega::Core::ModSource::Count, -1, IDs::sustain});
        registerParameter({"layer.a.env.release", "Release", "Envelope release time", ParamValueType::Continuous, 1.0f, 10000.0f, 500.0f, 0.0f, 1.0f, "ms", "ENV", "synthesis", "slider", false, 72, Omega::Core::ModSource::Count, -1, IDs::release});

        // --- VCA ---
        registerParameter({"layer.a.vca.gain", "VCA Gain", "Voice amplifier volume", ParamValueType::Continuous, 0.0f, 1.0f, 0.8f, 0.0f, 1.0f, "%", "AMP", "synthesis", "knob", false, -1, Omega::Core::ModSource::Count, -1, IDs::levelDb});

        
        // --- Special Modulation Sources (GM Standard) ---
        registerParameter({"midi.modwheel", "Mod Wheel", "Standard MIDI Modulation Wheel", ParamValueType::Continuous, 0.0f, 1.0f, 0.0f, 0.0f, 1.0f, "%", "MIDI", "midi", "slider", false, 1, Omega::Core::ModSource::ModWheel});
        registerParameter({"midi.breath", "Breath", "MIDI Breath Controller", ParamValueType::Continuous, 0.0f, 1.0f, 0.0f, 0.0f, 1.0f, "%", "MIDI", "midi", "slider", false, 2, Omega::Core::ModSource::Breath});
        registerParameter({"midi.expression", "Expression", "MIDI Expression Pedal", ParamValueType::Continuous, 0.0f, 1.0f, 0.0f, 0.0f, 1.0f, "%", "MIDI", "midi", "slider", false, 11, Omega::Core::ModSource::Expression});
        registerParameter({"midi.sustain", "Sustain", "MIDI Sustain Pedal", ParamValueType::Boolean, 0.0f, 1.0f, 0.0f, 1.0f, 1.0f, "Bool", "MIDI", "midi", "switch", false, 64, Omega::Core::ModSource::Sustain});
        registerParameter({"midi.ribbon", "Ribbon", "MIDI Ribbon Controller", ParamValueType::Continuous, 0.0f, 1.0f, 0.0f, 0.0f, 1.0f, "%", "MIDI", "midi", "slider", false, 16, Omega::Core::ModSource::Ribbon});

        // --- MASTER DELAY (Modern) ---
        registerParameter({"global.delay.enable", "Delay Enable", "Global delay effect toggle", ParamValueType::Boolean, 0.0f, 1.0f, 0.0f, 1.0f, 1.0f, "Bool", "FX", "global", "switch", false, -1, Omega::Core::ModSource::Count, -1, IDs::id});
        registerParameter({"global.delay.time", "Delay Time", "Time between delay echoes", ParamValueType::Continuous, 0.001f, 2.0f, 0.5f, 0.0f, 0.5f, "s", "FX", "global", "knob", false, -1, Omega::Core::ModSource::Count, -1, IDs::lfoRate});
        registerParameter({"global.delay.feedback", "Delay Feedback", "Amount of signal fed back into delay", ParamValueType::Continuous, 0.0f, 1.0f, 0.3f, 0.0f, 1.0f, "%", "FX", "global", "knob", false, -1, Omega::Core::ModSource::Count, -1, IDs::resonance});
        registerParameter({"global.delay.mix", "Delay Mix", "Wet/Dry mix of the delay effect", ParamValueType::Continuous, 0.0f, 1.0f, 0.0f, 0.0f, 1.0f, "%", "FX", "global", "knob", false, -1, Omega::Core::ModSource::Count, -1, IDs::levelDb});
    }

private:
    ParameterMetadataRegistry() = default;
    std::map<std::string, ParameterDescriptor> mParameters;
    std::map<int, std::string> mMidiMap;
};

} // namespace Core
} // namespace Omega
