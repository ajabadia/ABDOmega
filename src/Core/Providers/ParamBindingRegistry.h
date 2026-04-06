#pragma once

#include <functional>
#include <map>
#include <juce_core/juce_core.h>
#include "EngineConfig.h"
#include "VoiceArchToEngineConfigMapper.h"
#include "../OmegaIdentifiers.h"

namespace Omega {
namespace Core {
namespace Service {


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
            auto reg = [&](const juce::String& id, auto action) {
                mBindings[id] = [action](VoiceConfig& c, float v) { action(c, v); };
            };

            // --- Voice Components ---
            reg("layer.a.cutoff",           [](VoiceConfig& c, float v) { c.cutoff = v; });
            reg("layer.a.resonance",        [](VoiceConfig& c, float v) { c.resonance = v; });
            reg("layer.a.env.attack",       [](VoiceConfig& c, float v) { c.attack = v; });
            reg("layer.a.env.decay",        [](VoiceConfig& c, float v) { c.decay = v; });
            reg("layer.a.env.sustain",      [](VoiceConfig& c, float v) { c.sustain = v; });
            reg("layer.a.env.release",      [](VoiceConfig& c, float v) { c.release = v; });
            
            // --- Oscillators ---
            reg("layer.a.osc.saw.on",       [](VoiceConfig& c, float v) { c.sawOn = (v > 0.5f); });
            reg("layer.a.osc.pulse.on",     [](VoiceConfig& c, float v) { c.pulseOn = (v > 0.5f); });
            reg("layer.a.osc.sub.level",    [](VoiceConfig& c, float v) { c.subLevel = v; });
            reg("layer.a.osc.noise.level",  [](VoiceConfig& c, float v) { c.noiseLevel = v; });
            reg("layer.a.osc.pwm.amount",   [](VoiceConfig& c, float v) { c.pwmAmount = v; });
            reg("layer.a.osc.pwm.mode",     [](VoiceConfig& c, float v) { c.pwmModeLfo = (v > 0.5f); });
            
            // --- Filters & Modulation ---
            reg("layer.a.vcf.env.depth",    [](VoiceConfig& c, float v) { c.vcfEnvDepth = v; });
            reg("layer.a.vcf.lfo.depth",    [](VoiceConfig& c, float v) { c.vcfLfoDepth = v; });
            reg("layer.a.vcf.keytrack",     [](VoiceConfig& c, float v) { c.vcfKeyTracking = v; });
            reg("layer.a.vcf.env.inv",      [](VoiceConfig& c, float v) { c.vcfEnvInverted = (v > 0.5f); });
            reg("layer.a.dco.lfo.depth",    [](VoiceConfig& c, float v) { c.dcoLfoDepth = v; });
            reg("layer.a.hpf.pos",          [](VoiceConfig& c, float v) { c.hpfPosition = (int)v; });
            reg("layer.a.vca.mode",         [](VoiceConfig& c, float v) { c.vcaGateMode = (v > 0.5f); });
            reg("layer.a.vca.gain",         [](VoiceConfig& c, float v) { c.vcaGain = v; });
            
            // --- Korg/Extra ---
            reg("layer.a.lfo.rate",         [](VoiceConfig& c, float v) { c.lfoRate = v; });
            reg("layer.a.lfo.wave",         [](VoiceConfig& c, float v) { c.lfoWave = (int)v; });
            reg("layer.a.korg.hpf.cutoff",  [](VoiceConfig& c, float v) { c.korgHpCutoff = v; });
            reg("layer.a.korg.hpf.res",     [](VoiceConfig& c, float v) { c.korgHpRes = v; });
            reg("layer.a.korg.grit",        [](VoiceConfig& c, float v) { c.korgGrit = v; });

            // --- JP-8080 Specific ---
            reg("layer.a.jp.detune",        [](VoiceConfig& c, float v) { c.jpDetune = v; });
            reg("layer.a.jp.spread",        [](VoiceConfig& c, float v) { c.jpSpread = v; });
            reg("layer.a.jp.filter.mode",   [](VoiceConfig& c, float v) { c.jpFilterMode = (int)v; });
        }

        std::map<juce::String, BindingAction> mBindings;
    };

} // namespace Service
} // namespace Core
} // namespace Omega
