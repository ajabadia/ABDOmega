#pragma once

#include <string>
#include <vector>
#include <map>
#include <memory>
#include "Input/ModSource.h"

namespace Omega {
namespace Core {

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
    Omega::Core::Input::ModSource modSource = Omega::Core::Input::ModSource::Count;

    // For Telemetry mapping (index in ModulationTelemetryHub)
    int telemetryIndex = -1;
    
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

    Omega::Core::Input::ModSource getModSourceFromCC(int cc) const {
        auto id = getParamIdFromCC(cc);
        if (id.empty()) return Omega::Core::Input::ModSource::Count;
        
        auto it = mParameters.find(id);
        return (it != mParameters.end()) ? it->second.modSource : Omega::Core::Input::ModSource::Count;
    }

    // Common Factory
    void initializeDefaults() {
        // --- JUNO FAMILY / CORE ---
        registerParameter({"LAYERAMAINCUTOFF", "Cutoff", "Main low-pass filter cutoff", ParamValueType::Continuous, 20.0f, 20000.0f, 2000.0f, 0.0f, 0.3f, "Hz", "VCF", "synthesis", "knob", false, 74, Omega::Core::Input::ModSource::PE1, 8});
        registerParameter({"LAYERAMAINRESONANCE", "Resonance", "Filter resonance / Q", ParamValueType::Continuous, 0.0f, 1.0f, 0.1f, 0.0f, 1.0f, "%", "VCF", "synthesis", "knob", false, 71, Omega::Core::Input::ModSource::PE2, 7});
        
        ParameterDescriptor chorusMode = {"MASTERCHORUSMODE", "Chorus Mode", "Juno-style chorus selection", ParamValueType::Enum, 0.0f, 3.0f, 1.0f, 1.0f, 1.0f, "Choice", "FX", "synthesis", "select", false, 93};
        chorusMode.options = {{0, "Off"}, {1, "I"}, {2, "II"}, {3, "I+II"}};
        registerParameter(chorusMode);

        registerParameter({"MASTERCHORUSMIX", "Chorus Mix", "Juno chorus wet/dry level", ParamValueType::Continuous, 0.0f, 1.0f, 0.5f, 0.0f, 1.0f, "%", "FX", "synthesis", "knob"});

        ParameterDescriptor hpfPos = {"LAYERAMAINHPF", "HPF Position", "High-pass filter mode", ParamValueType::Enum, 0.0f, 3.0f, 1.0f, 1.0f, 1.0f, "Choice", "VCF", "synthesis", "switch", false, 81};
        hpfPos.options = {{0, "Off"}, {1, "1"}, {2, "2"}, {3, "3"}};
        registerParameter(hpfPos);

        ParameterDescriptor vcaMode = {"LAYERAMAINVCAMODE", "VCA Mode", "VCA Gate or Envelope mode", ParamValueType::Enum, 0.0f, 1.0f, 0.0f, 1.0f, 1.0f, "Choice", "VCA", "synthesis", "switch"};
        vcaMode.options = {{0, "Gate"}, {1, "Env"}};
        registerParameter(vcaMode);

        registerParameter({"LAYERAMAINANALOGDRIFT", "Analog Drift", "Simulated oscillator pitch instability", ParamValueType::Continuous, 0.0f, 1.0f, 0.1f, 0.0f, 1.0f, "%", "DCO", "synthesis", "knob"});
        
        registerParameter({"LAYERAMAINSAWON", "Saw On", "Toggle Sawtooth waveform", ParamValueType::Boolean, 0.0f, 1.0f, 1.0f, 1.0f, 1.0f, "Bool", "DCO", "synthesis", "switch"});
        registerParameter({"LAYERAMAINPULSEON", "Pulse On", "Toggle Pulse/Square waveform", ParamValueType::Boolean, 0.0f, 1.0f, 1.0f, 1.0f, 1.0f, "Bool", "DCO", "synthesis", "switch"});
        registerParameter({"LAYERASUBOSELEVEL", "Sub Level", "Sub-oscillator volume", ParamValueType::Continuous, 0.0f, 1.0f, 0.5f, 0.0f, 1.0f, "%", "DCO", "synthesis", "knob"});
        registerParameter({"LAYERANOISELEVEL", "Noise Level", "White noise volume", ParamValueType::Continuous, 0.0f, 1.0f, 0.05f, 0.0f, 1.0f, "%", "DCO", "synthesis", "knob"});
        
        ParameterDescriptor pwmMode = {"LAYERAPWMMODE", "PWM Mode", "Pulse Width Modulation source", ParamValueType::Enum, 0.0f, 1.0f, 0.0f, 1.0f, 1.0f, "Choice", "DCO", "synthesis", "switch"};
        pwmMode.options = {{0, "Manual/LFO"}, {1, "Env"}};
        registerParameter(pwmMode);

        registerParameter({"LAYERAPWMAMOUNT", "PWM Amount", "Pulse width or PWM modulation depth", ParamValueType::Continuous, 0.0f, 1.0f, 0.5f, 0.0f, 1.0f, "%", "DCO", "synthesis", "knob"});
        
        registerParameter({"LAYERAVCFENVDEPTH", "VCF Env Depth", "Envelope modulation of cutoff", ParamValueType::Continuous, 0.0f, 1.0f, 0.5f, 0.0f, 1.0f, "%", "VCF", "synthesis", "knob"});
        registerParameter({"LAYERAVCFMODDEPTH", "VCF LFO Depth", "LFO modulation of cutoff", ParamValueType::Continuous, 0.0f, 1.0f, 0.0f, 0.0f, 1.0f, "%", "VCF", "synthesis", "knob"});
        registerParameter({"LAYERAVCFKYBD", "VCF Keytrack", "Keyboard tracking of cutoff", ParamValueType::Continuous, 0.0f, 1.0f, 0.5f, 0.0f, 1.0f, "%", "VCF", "synthesis", "knob"});
        
        ParameterDescriptor vcfPol = {"LAYERAVCFENVPOL", "VCF Env Polarity", "Inverts the VCF envelope", ParamValueType::Enum, 0.0f, 1.0f, 0.0f, 1.0f, 1.0f, "Choice", "VCF", "synthesis", "switch"};
        vcfPol.options = {{0, "Normal"}, {1, "Inverted"}};
        registerParameter(vcfPol);
        
        registerParameter({"LAYERADCOMODDEPTH", "DCO LFO Depth", "LFO modulation of pitch (Vibrato)", ParamValueType::Continuous, 0.0f, 1.0f, 0.0f, 0.0f, 1.0f, "%", "DCO", "synthesis", "knob"});
        
        registerParameter({"LAYERAMAINLFORATE", "LFO Rate", "LFO cycle speed", ParamValueType::Continuous, 0.01f, 20.0f, 1.0f, 0.0f, 0.3f, "Hz", "LFO", "synthesis", "knob"});
        
        ParameterDescriptor lfoWave = {"LAYERAMAINLFOWAVE", "LFO Wave", "LFO waveform selection", ParamValueType::Enum, 0.0f, 5.0f, 0.0f, 1.0f, 1.0f, "Choice", "LFO", "synthesis", "select"};
        lfoWave.options = {{0, "Sin"}, {1, "Tri"}, {2, "Saw"}, {3, "Sqr"}, {4, "Rnd"}, {5, "Noi"}};
        registerParameter(lfoWave);
        
        // --- JP-808X ---
        registerParameter({"LAYERAMAINJPDETUNE", "JP Detune", "SuperSaw detune amount", ParamValueType::Continuous, 0.0f, 1.0f, 0.5f, 0.0f, 1.0f, "%", "DCO", "synthesis", "knob"});
        registerParameter({"LAYERAMAINJPSPREAD", "JP Spread", "SuperSaw detune spread/width", ParamValueType::Continuous, 0.0f, 1.0f, 0.5f, 0.0f, 1.0f, "%", "DCO", "synthesis", "knob"});
        
        ParameterDescriptor jpFilterMode = {"LAYERAMAINJPFILTERMODE", "JP Filter Mode", "JP-style filter slope selection", ParamValueType::Enum, 0.0f, 2.0f, 0.0f, 1.0f, 1.0f, "Choice", "VCF", "synthesis", "select"};
        jpFilterMode.options = {{0, "LP 12dB"}, {1, "LP 24dB"}, {2, "BP"}};
        registerParameter(jpFilterMode);
        
        // --- Korg ---
        registerParameter({"LAYERAKORGHPFCUTOFF", "Korg HP Cutoff", "Korg MS-20 style High-pass cutoff", ParamValueType::Continuous, 20.0f, 20000.0f, 100.0f, 0.0f, 0.3f, "Hz", "VCF", "synthesis", "knob"});
        registerParameter({"LAYERAKORGHPFRESONANCE", "Korg HP Res", "Korg MS-20 style High-pass resonance", ParamValueType::Continuous, 0.0f, 1.0f, 0.1f, 0.0f, 1.0f, "%", "VCF", "synthesis", "knob"});
        registerParameter({"LAYERAKORGGRIT", "Korg Grit", "Filter drive/saturation amount", ParamValueType::Continuous, 1.0f, 10.0f, 1.0f, 0.0f, 1.0f, "Mult", "VCF", "synthesis", "knob"});
        
        // --- Space Echo ---
        registerParameter({"LAYERAFXSPACEENABLE", "Space Echo Enable", "Enable Roland RE-201 Simulation", ParamValueType::Boolean, 0.0f, 1.0f, 0.0f, 1.0f, 1.0f, "Bool", "FX", "synthesis", "switch"});
        registerParameter({"LAYERAFXSPACESPEED", "Echo Speed", "Tape motor speed", ParamValueType::Continuous, 0.0f, 1.0f, 0.5f, 0.0f, 1.0f, "%", "FX", "synthesis", "knob"});
        registerParameter({"LAYERAFXSPACEINTENSITY", "Intensity", "Echo feedback intensity", ParamValueType::Continuous, 0.0f, 1.0f, 0.4f, 0.0f, 1.0f, "%", "FX", "synthesis", "knob"});
        registerParameter({"LAYERAFXSPACEECHOVOL", "Echo Volume", "Wet echo signal level", ParamValueType::Continuous, 0.0f, 1.0f, 0.5f, 0.0f, 1.0f, "%", "FX", "synthesis", "knob"});
        registerParameter({"LAYERAFXSPACEREVERBVOL", "Reverb Volume", "Spring reverb signal level", ParamValueType::Continuous, 0.0f, 1.0f, 0.3f, 0.0f, 1.0f, "%", "FX", "synthesis", "knob"});
        
        ParameterDescriptor spaceMode = {"LAYERAFXSPACEMODE", "Echo Mode", "RE-201 Head Selection Mode", ParamValueType::Enum, 1.0f, 12.0f, 1.0f, 1.0f, 1.0f, "Mode", "FX", "synthesis", "select"};
        for(int i=1; i<=12; ++i) spaceMode.options.push_back({i, std::to_string(i)});
        registerParameter(spaceMode);

        registerParameter({"LAYERAFXSPACEWOW", "Wow & Flutter", "Tape speed mod depth", ParamValueType::Continuous, 0.0f, 1.0f, 0.2f, 0.0f, 1.0f, "%", "FX", "synthesis", "knob"});
        registerParameter({"LAYERAFXSPACEDRIVE", "Tape Drive", "Tape saturation amount", ParamValueType::Continuous, 0.0f, 1.0f, 0.5f, 0.0f, 1.0f, "%", "FX", "synthesis", "knob"});

        // --- ADSR ---
        registerParameter({"LAYERAMAINATTACK", "Attack", "Envelope attack time", ParamValueType::Continuous, 0.1f, 10000.0f, 10.0f, 0.0f, 1.0f, "ms", "ENV", "synthesis", "slider", false, 73});
        registerParameter({"LAYERAMAINDECAY", "Decay", "Envelope decay time", ParamValueType::Continuous, 0.1f, 10000.0f, 100.0f, 0.0f, 1.0f, "ms", "ENV", "synthesis", "slider", false, 75});
        registerParameter({"LAYERAMAINSUSTAIN", "Sustain", "Envelope sustain level", ParamValueType::Continuous, 0.0f, 1.0f, 0.8f, 0.0f, 1.0f, "%", "ENV", "synthesis", "slider", false, 79});
        registerParameter({"LAYERAMAINRELEASE", "Release", "Envelope release time", ParamValueType::Continuous, 1.0f, 10000.0f, 500.0f, 0.0f, 1.0f, "ms", "ENV", "synthesis", "slider", false, 72});

        // --- VCA ---
        registerParameter({"LAYERAMAINVCAGAIN", "VCA Gain", "Voice amplifier volume", ParamValueType::Continuous, 0.0f, 1.0f, 0.8f, 0.0f, 1.0f, "%", "AMP", "synthesis", "knob"});

        
        // --- Special Modulation Sources (GM Standard) ---
        registerParameter({"MIDI_MODWHEEL", "Mod Wheel", "Standard MIDI Modulation Wheel", ParamValueType::Continuous, 0.0f, 1.0f, 0.0f, 0.0f, 1.0f, "%", "MIDI", "midi", "slider", false, 1, Omega::Core::Input::ModSource::ModWheel});
        registerParameter({"MIDI_BREATH", "Breath", "MIDI Breath Controller", ParamValueType::Continuous, 0.0f, 1.0f, 0.0f, 0.0f, 1.0f, "%", "MIDI", "midi", "slider", false, 2, Omega::Core::Input::ModSource::Breath});
        registerParameter({"MIDI_EXPRESSION", "Expression", "MIDI Expression Pedal", ParamValueType::Continuous, 0.0f, 1.0f, 0.0f, 0.0f, 1.0f, "%", "MIDI", "midi", "slider", false, 11, Omega::Core::Input::ModSource::Expression});
        registerParameter({"MIDI_SUSTAIN", "Sustain", "MIDI Sustain Pedal", ParamValueType::Boolean, 0.0f, 1.0f, 0.0f, 1.0f, 1.0f, "Bool", "MIDI", "midi", "switch", false, 64, Omega::Core::Input::ModSource::Sustain});
        registerParameter({"MIDI_RIBBON", "Ribbon", "MIDI Ribbon Controller", ParamValueType::Continuous, 0.0f, 1.0f, 0.0f, 0.0f, 1.0f, "%", "MIDI", "midi", "slider", false, 16, Omega::Core::Input::ModSource::Ribbon});

        // --- MASTER DELAY (Modern) ---
        registerParameter({"MASTERDELAYENABLED", "Delay Enable", "Global delay effect toggle", ParamValueType::Boolean, 0.0f, 1.0f, 0.0f, 1.0f, 1.0f, "Bool", "FX", "global", "switch"});
        registerParameter({"MASTERDELAYTIME", "Delay Time", "Time between delay echoes", ParamValueType::Continuous, 0.001f, 2.0f, 0.5f, 0.0f, 0.5f, "s", "FX", "global", "knob"});
        registerParameter({"MASTERDELAYFEEDBACK", "Delay Feedback", "Amount of signal fed back into delay", ParamValueType::Continuous, 0.0f, 1.0f, 0.3f, 0.0f, 1.0f, "%", "FX", "global", "knob"});
        registerParameter({"MASTERDELAYMIX", "Delay Mix", "Wet/Dry mix of the delay effect", ParamValueType::Continuous, 0.0f, 1.0f, 0.0f, 0.0f, 1.0f, "%", "FX", "global", "knob"});
    }

private:
    ParameterMetadataRegistry() = default;
    std::map<std::string, ParameterDescriptor> mParameters;
    std::map<int, std::string> mMidiMap;
};

} // namespace Core
} // namespace Omega
