#pragma once

#include <functional>
#include <map>
#include <juce_core/juce_core.h>
#include "VoiceArchToEngineConfigMapper.h"
#include "../OmegaIdentifiers.h"

namespace Omega {
namespace Core {
namespace Service {

    /**
     * @brief Declarative registry for parameter-to-engine-config bindings.
     * Maps both canonical IDs (LAYER:A:CUTOFF) and legacy APVTS IDs (LAYERAMAINCUTOFF)
     * to VoiceConfig fields.
     */
    class ParamBindingRegistry {
    public:
        using BindingAction = std::function<void(VoiceConfig&, float)>;

        static ParamBindingRegistry& getInstance() {
            static ParamBindingRegistry instance;
            return instance;
        }

        void apply(const juce::String& paramId, float value, VoiceConfig& cfg) {
            if (mBindings.count(paramId)) {
                mBindings[paramId](cfg, value);
            }
        }

    private:
        ParamBindingRegistry() {
            registerStandardBindings();
        }

        void registerStandardBindings() {
            auto reg = [&](const juce::String& canonical, const juce::String& legacy, BindingAction action) {
                mBindings["LAYER:A:" + canonical] = action;
                mBindings[legacy] = action;
            };

            // --- Voice Components ---
            reg("CUTOFF",           "LAYERAMAINCUTOFF",     [](VoiceConfig& c, float v) { c.cutoff = v; });
            reg("RESONANCE",        "LAYERAMAINRESONANCE",  [](VoiceConfig& c, float v) { c.resonance = v; });
            reg("ATTACK",           "LAYERAMAINATTACK",     [](VoiceConfig& c, float v) { c.attack = v; });
            reg("DECAY",            "LAYERAMAINDECAY",      [](VoiceConfig& c, float v) { c.decay = v; });
            reg("SUSTAIN",          "LAYERAMAINSUSTAIN",    [](VoiceConfig& c, float v) { c.sustain = v; });
            reg("RELEASE",          "LAYERAMAINRELEASE",    [](VoiceConfig& c, float v) { c.release = v; });
            
            // --- Oscillators ---
            reg("SAW_ON",           "LAYERAMAINSAWON",      [](VoiceConfig& c, float v) { c.sawOn = (v > 0.5f); });
            reg("PULSE_ON",         "LAYERAMAINPULSEON",    [](VoiceConfig& c, float v) { c.pulseOn = (v > 0.5f); });
            reg("SUB_LEVEL",        "LAYERASUBOSELEVEL",    [](VoiceConfig& c, float v) { c.subLevel = v; });
            reg("NOISE_LEVEL",      "LAYERANOISELEVEL",     [](VoiceConfig& c, float v) { c.noiseLevel = v; });
            reg("PWM_AMOUNT",       "LAYERAPWMAMOUNT",      [](VoiceConfig& c, float v) { c.pwmAmount = v; });
            reg("PWM_MODE",         "LAYERAPWMMODE",        [](VoiceConfig& c, float v) { c.pwmModeLfo = (v > 0.5f); });
            
            // --- Filters & Modulation ---
            reg("VCF_ENV_DEPTH",    "LAYERAVCFENVDEPTH",    [](VoiceConfig& c, float v) { c.vcfEnvDepth = v; });
            reg("VCF_MOD_DEPTH",    "LAYERAVCFMODDEPTH",    [](VoiceConfig& c, float v) { c.vcfLfoDepth = v; });
            reg("VCF_KEY_TRACKING", "LAYERAVCFKYBD",        [](VoiceConfig& c, float v) { c.vcfKeyTracking = v; });
            reg("VCF_ENV_INVERTED", "LAYERAVCFENVPOL",      [](VoiceConfig& c, float v) { c.vcfEnvInverted = (v > 0.5f); });
            reg("DCO_LFO_DEPTH",    "LAYERADCOMODDEPTH",    [](VoiceConfig& c, float v) { c.dcoLfoDepth = v; });
            reg("HPF_POSITION",     "LAYERAMAINHPF",        [](VoiceConfig& c, float v) { c.hpfPosition = (int)v; });
            reg("VCA_GATE_MODE",    "LAYERAMAINVCAMODE",    [](VoiceConfig& c, float v) { c.vcaGateMode = (v > 0.5f); });
            
            // --- Korg/Extra ---
            reg("LFO_RATE",         "LAYERAMAINLFORATE",    [](VoiceConfig& c, float v) { c.lfoRate = v; });
            reg("LFO_WAVE",         "LAYERAMAINLFOWAVE",    [](VoiceConfig& c, float v) { c.lfoWave = (int)v; });
            reg("KORG_HPF_CUTOFF",  "LAYERAKORGHPFCUTOFF",  [](VoiceConfig& c, float v) { c.korgHpCutoff = v; });
            reg("KORG_HPF_RES",     "LAYERAKORGHPFRESONANCE",[](VoiceConfig& c, float v) { c.korgHpRes = v; });
            reg("KORG_GRIT",        "LAYERAKORGGRIT",       [](VoiceConfig& c, float v) { c.korgGrit = v; });
        }

        std::map<juce::String, BindingAction> mBindings;
    };

} // namespace Service
} // namespace Core
} // namespace Omega
