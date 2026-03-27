#pragma once

#include <string>
#include <vector>
#include <map>
#include <memory>
#include "Input/ModSource.h"

namespace Omega {
namespace Core {

/**
 * Descriptor for a single synthesizer parameter.
 * Used to unify UI, MIDI, and DSP logic.
 */
struct ParameterDescriptor {
    std::string id;
    std::string name;
    float minValue = 0.0f;
    float maxValue = 1.0f;
    float defaultValue = 0.5f;
    std::string unit = "%";
    float skew = 1.0f; // 1.0 = linear, other = logarithmic-style mapping
    std::string groupId = "Global";
    
    // For MIDI mapping
    int ccNumber = -1;
    
    // For Modulation mapping (if this parameter can be a modulation source or target)
    Omega::Core::Input::ModSource modSource = Omega::Core::Input::ModSource::Count;

    // For Telemetry mapping (index in ModulationTelemetryHub)
    int telemetryIndex = -1;
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

    // Common Factory
    void initializeDefaults() {
        // --- JUNO FAMILY / CORE ---
        registerParameter({"LAYERAMAINCUTOFF", "Cutoff", 20.0f, 20000.0f, 2000.0f, "Hz", 0.3f, "VCF", 107, Omega::Core::Input::ModSource::Count, 8});
        registerParameter({"LAYERAMAINRESONANCE", "Resonance", 0.0f, 1.0f, 0.1f, "%", 1.0f, "VCF", 108, Omega::Core::Input::ModSource::Count, 7});
        registerParameter({"LAYERACHORUSMODE", "Chorus Mode", 0.0f, 3.0f, 1.0f, "Choice", 1.0f, "FX"});
        registerParameter({"LAYERAMAINHPF", "HPF Position", 0.0f, 3.0f, 1.0f, "Choice", 1.0f, "VCF"});
        registerParameter({"LAYERAMAINVCAMODE", "VCA Mode", 0.0f, 1.0f, 0.0f, "Choice", 1.0f, "VCA"});
        registerParameter({"LAYERAMAINANALOGDRIFT", "Analog Drift", 0.0f, 1.0f, 0.1f, "%", 1.0f, "DCO"});
        
        registerParameter({"LAYERAMAINSAWON", "Saw On", 0.0f, 1.0f, 1.0f, "Bool", 1.0f, "DCO"});
        registerParameter({"LAYERAMAINPULSEON", "Pulse On", 0.0f, 1.0f, 1.0f, "Bool", 1.0f, "DCO"});
        registerParameter({"LAYERASUBOSELEVEL", "Sub Level", 0.0f, 1.0f, 0.5f, "%", 1.0f, "DCO"});
        registerParameter({"LAYERANOISELEVEL", "Noise Level", 0.0f, 1.0f, 0.05f, "%", 1.0f, "DCO"});
        
        registerParameter({"LAYERAPWMMODE", "PWM Mode", 0.0f, 1.0f, 0.0f, "Choice", 1.0f, "DCO"});
        registerParameter({"LAYERAPWMAMOUNT", "PWM Amount", 0.0f, 1.0f, 0.5f, "%", 1.0f, "DCO"});
        
        registerParameter({"LAYERAVCFENVDEPTH", "VCF Env Depth", 0.0f, 1.0f, 0.5f, "%", 1.0f, "VCF"});
        registerParameter({"LAYERAVCFMODDEPTH", "VCF LFO Depth", 0.0f, 1.0f, 0.0f, "%", 1.0f, "VCF"});
        registerParameter({"LAYERAVCFKYBD", "VCF Keytrack", 0.0f, 1.0f, 0.5f, "%", 1.0f, "VCF"});
        registerParameter({"LAYERAVCFENVPOL", "VCF Env Polarity", 0.0f, 1.0f, 0.0f, "Choice", 1.0f, "VCF"});
        
        registerParameter({"LAYERADCOMODDEPTH", "DCO LFO Depth", 0.0f, 1.0f, 0.0f, "%", 1.0f, "DCO", -1, Omega::Core::Input::ModSource::Count, 0});
        
        // --- JP-808X ---
        registerParameter({"LAYERAMAINJPDETUNE", "JP Detune", 0.0f, 1.0f, 0.5f, "%", 1.0f, "DCO"});
        registerParameter({"LAYERAMAINJPFILTERMODE", "JP Filter Mode", 0.0f, 2.0f, 0.0f, "Choice", 1.0f, "VCF"});
        
        // --- Korg ---
        registerParameter({"LAYERAKORGHPFCUTOFF", "Korg HP Cutoff", 20.0f, 20000.0f, 100.0f, "Hz", 0.3f, "VCF"});
        registerParameter({"LAYERAKORGHPFRESONANCE", "Korg HP Res", 0.0f, 1.0f, 0.1f, "%", 1.0f, "VCF"});
        registerParameter({"LAYERAKORGGRIT", "Korg Grit", 1.0f, 10.0f, 1.0f, "Mult", 1.0f, "VCF"});
        
        // --- Space Echo ---
        registerParameter({"LAYERAFXSPACEENABLE", "Space Echo Enable", 0.0f, 1.0f, 0.0f, "Bool", 1.0f, "FX"});
        registerParameter({"LAYERAFXSPACESPEED", "Echo Speed", 0.0f, 1.0f, 0.5f, "%", 1.0f, "FX"});
        registerParameter({"LAYERAFXSPACEINTENSITY", "Intensity", 0.0f, 1.0f, 0.4f, "%", 1.0f, "FX"});
        registerParameter({"LAYERAFXSPACEECHOVOL", "Echo Volume", 0.0f, 1.0f, 0.5f, "%", 1.0f, "FX"});
        registerParameter({"LAYERAFXSPACEREVERBVOL", "Reverb Volume", 0.0f, 1.0f, 0.3f, "%", 1.0f, "FX"});
        registerParameter({"LAYERAFXSPACEMODE", "Echo Mode", 1.0f, 12.0f, 1.0f, "Mode", 1.0f, "FX"});
        registerParameter({"LAYERAFXSPACEWOW", "Wow & Flutter", 0.0f, 1.0f, 0.2f, "%", 1.0f, "FX"});
        registerParameter({"LAYERAFXSPACEDRIVE", "Tape Drive", 0.0f, 1.0f, 0.5f, "%", 1.0f, "FX"});

        // --- ADSR ---
        registerParameter({"LAYERAMAINATTACK", "Attack", 0.1f, 10000.0f, 10.0f, "ms", 1.0f, "ENV"});
        registerParameter({"LAYERAMAINDECAY", "Decay", 0.1f, 10000.0f, 100.0f, "ms", 1.0f, "ENV"});
        registerParameter({"LAYERAMAINSUSTAIN", "Sustain", 0.0f, 1.0f, 0.8f, "%", 1.0f, "ENV"});
        registerParameter({"LAYERAMAINRELEASE", "Release", 1.0f, 10000.0f, 500.0f, "ms", 1.0f, "ENV"});

        // --- VCA ---
        registerParameter({"LAYERAMAINVCAGAIN", "VCA Gain", 0.0f, 1.0f, 0.8f, "%", 1.0f, "AMP"});

        // --- LFO ---
        registerParameter({"LAYERAMAINLFORATE", "LFO Rate", 0.1f, 20.0f, 5.0f, "Hz", 1.0f, "MOD"});
        registerParameter({"LAYERAMAINLFOWAVE", "LFO Wave", 0.0f, 4.0f, 0.0f, "Choice", 1.0f, "MOD"});
    }

private:
    ParameterMetadataRegistry() = default;
    std::map<std::string, ParameterDescriptor> mParameters;
    std::map<int, std::string> mMidiMap;
};

} // namespace Core
} // namespace Omega
