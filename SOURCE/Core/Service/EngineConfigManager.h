#pragma once

#include <juce_core/juce_core.h>
#include <memory>
#include <atomic>
#include "EngineConfig.h"
#include "../Preset/OmegaPreset.h"
#include "../Ace/AceValidator.h"
#include "../../DSP/Engines/Modular/VirtualAnalogEngine.h"

namespace Omega {
namespace Core {
namespace Service {

    /**
     * @brief Fachada para la configuración y control de alto nivel del motor DSP.
     */
    class EngineConfigManager {
    public:
        EngineConfigManager(DSP::Engines::Modular::VirtualAnalogEngine& engine, const Ace::AceCatalog& catalog)
            : mEngine(engine), mValidator(catalog) {
            // Inicializar snapshots
            mSnapshots[0] = std::make_unique<EngineConfig>();
            mSnapshots[1] = std::make_unique<EngineConfig>();
            mCurrentSnapshot.store(mSnapshots[0].get());
            mEngine.setConfigProvider(&mCurrentSnapshot);
        }

        /**
         * @brief Aplica un preset completo al motor usando validación ACE y swap atómico.
         */
        void applyPreset(Preset::OmegaPreset& preset) {
            // 1. Validar y Reparar preset en el Message Thread
            auto report = mValidator.validateAndRepairPreset(preset);
            if (report.status == Ace::ValidationStatus::Invalid) return;

            // 2. Preparar el siguiente snapshot (back buffer)
            EngineConfig* next = (mCurrentSnapshot.load() == mSnapshots[0].get()) ? mSnapshots[1].get() : mSnapshots[0].get();
            
            // Llenar el snapshot desde el ValueTree
            if (preset.getNumLayers() > 0) {
                auto layer = preset.getLayerTree(0);
                auto arch = layer.getChildWithName(Preset::IDs::architecture);
                auto params = layer.getChildWithName(Preset::IDs::params);

                // --- Osciladores ---
                auto oscs = arch.getChildWithName("oscillators");
                auto oscMode = OscillatorMode::JunoDco;
                if (oscs.isValid() && oscs.getNumChildren() > 0) {
                    juce::String oscId = oscs.getChild(0).getProperty(Preset::IDs::componentId);
                    if (oscId == "OSC-VA-002") oscMode = OscillatorMode::KorgMs20Vco;
                    else if (oscId == "OSC-VA-004") oscMode = OscillatorMode::JpSuperSaw;
                }

                // --- Filtros ---
                auto filters = arch.getChildWithName("filters");
                auto filterType = FilterType::JunoIR3109;
                if (filters.isValid() && filters.getNumChildren() > 0) {
                    juce::String fltId = filters.getChild(0).getProperty(Preset::IDs::componentId);
                    if (fltId == "FLT-VA-003") filterType = FilterType::Korg35;
                    else if (fltId == "FLT-VA-008") filterType = FilterType::JP8080;
                }

                // --- Parámetros ---
                float cut = params.getProperty("cutoff", 2000.0f);
                float res = params.getProperty("resonance", 0.2f);
                float atk = params.getProperty("attack", 10.0f);
                float dec = params.getProperty("decay", 100.0f);
                float sus = params.getProperty("sustain", 0.5f);
                float rel = params.getProperty("release", 500.0f);

                bool saw = params.getProperty("sawOn", true);
                bool pulse = params.getProperty("pulseOn", false);
                float sub = params.getProperty("subLevel", 0.0f);
                float noise = params.getProperty("noiseLevel", 0.0f);
                float pwm = params.getProperty("pwmAmount", 0.5f);
                bool pwmMode = params.getProperty("pwmModeLfo", false);

                float vcfEnv = params.getProperty("vcfEnvDepth", 0.0f);
                float vcfLfo = params.getProperty("vcfLfoDepth", 0.0f);
                float vcfKybd = params.getProperty("vcfKeyTracking", 0.0f);
                bool vcfInv = params.getProperty("vcfEnvInverted", false);

                float kHpCut = params.getProperty("korgHpCutoff", 20.0f);
                float kHpRes = params.getProperty("korgHpResonance", 0.1f);
                float kGrit = params.getProperty("korgGrit", 0.0f);

                // --- FX ---
                auto fxSlots = arch.getChildWithName("fxSlots");
                bool chorusOn = false;
                float chorusLevel = 0.0f;
                // ... (simplified FX mapping for brevity)

                // Aplicar a todas las voces del snapshot
                for (int i = 0; i < 16; ++i) {
                    next->voices[i].oscMode = oscMode;
                    next->voices[i].filterType = filterType;
                    next->voices[i].cutoff = cut;
                    next->voices[i].resonance = res;
                    next->voices[i].attack = atk;
                    next->voices[i].decay = dec;
                    next->voices[i].sustain = sus;
                    next->voices[i].release = rel;
                    next->voices[i].sawOn = saw;
                    next->voices[i].pulseOn = pulse;
                    next->voices[i].subLevel = sub;
                    next->voices[i].noiseLevel = noise;
                    next->voices[i].pwmAmount = pwm;
                    next->voices[i].pwmModeLfo = pwmMode;
                    next->voices[i].vcfEnvDepth = vcfEnv;
                    next->voices[i].vcfLfoDepth = vcfLfo;
                    next->voices[i].vcfKeyTracking = vcfKybd;
                    next->voices[i].vcfEnvInverted = vcfInv;
                    next->voices[i].hpfPosition = params.getProperty("hpfPosition", 1);
                    next->voices[i].vcaGateMode = params.getProperty("vcaGateMode", false);
                    next->voices[i].korgHpCutoff = kHpCut;
                    next->voices[i].korgHpRes = kHpRes;
                    next->voices[i].korgGrit = kGrit;
                }
                next->chorusEnabled = chorusOn;
                next->chorusMix = chorusLevel;
                next->chorusMode = params.getProperty("chorusMode", 1);
                next->jpDetune = params.getProperty("jpDetune", 0.5f);
                next->jpSpread = params.getProperty("jpSpread", 0.5f);
                next->jpFilterMode = params.getProperty("jpFilterMode", 0);
                next->spaceEchoEnabled = params.getProperty("spaceEchoEnabled", false);
                next->spaceEchoSpeed = params.getProperty("spaceEchoSpeed", 0.5f);
                next->spaceEchoIntensity = params.getProperty("spaceEchoIntensity", 0.5f);
                next->spaceEchoEchoVol = params.getProperty("spaceEchoEchoVol", 0.5f);
                next->spaceEchoReverbVol = params.getProperty("spaceEchoReverbVol", 0.3f);
                next->spaceEchoMode = params.getProperty("spaceEchoMode", 1);
                next->spaceEchoWow = params.getProperty("spaceEchoWow", 0.1f);
                next->spaceEchoDrive = params.getProperty("spaceEchoDrive", 0.5f);
                next->masterGainDb = preset.getMasterGainDb();
            }

            // 3. Swap Atómico
            mCurrentSnapshot.store(next);
            
            // 4. Notificar al motor que hay cambios
            mEngine.pushConfigUpdate(); 
        }

        /**
         * @brief Actualiza un parámetro en tiempo real (thread-safe para el audio thread).
         */
        void updateParameter(const std::string& paramId, float value) {
            auto* current = mCurrentSnapshot.load();
            
            if (paramId == "LAYERAMAINCUTOFF") {
                for(int i=0; i<16; ++i) current->voices[i].cutoff = value;
            }
            else if (paramId == "LAYERAMAINRESONANCE") {
                for(int i=0; i<16; ++i) current->voices[i].resonance = value;
            }
            else if (paramId == "LAYERAMAINATTACK") {
                for(int i=0; i<16; ++i) current->voices[i].attack = value;
            }
            else if (paramId == "LAYERAMAINDECAY") {
                for(int i=0; i<16; ++i) current->voices[i].decay = value;
            }
            else if (paramId == "LAYERAMAINSUSTAIN") {
                for(int i=0; i<16; ++i) current->voices[i].sustain = value;
            }
            else if (paramId == "LAYERAMAINRELEASE") {
                for(int i=0; i<16; ++i) current->voices[i].release = value;
            }
            else if (paramId == "LAYERAMAINSAWON") {
                for(int i=0; i<16; ++i) current->voices[i].sawOn = (value > 0.5f);
            }
            else if (paramId == "LAYERAMAINPULSEON") {
                for(int i=0; i<16; ++i) current->voices[i].pulseOn = (value > 0.5f);
            }
            else if (paramId == "LAYERASUBOSELEVEL") {
                for(int i=0; i<16; ++i) current->voices[i].subLevel = value;
            }
            else if (paramId == "LAYERANOISELEVEL") {
                for(int i=0; i<16; ++i) current->voices[i].noiseLevel = value;
            }
            else if (paramId == "LAYERAVCFENVDEPTH") {
                for(int i=0; i<16; ++i) current->voices[i].vcfEnvDepth = value;
            }
            else if (paramId == "LAYERAVCFMODDEPTH") {
                for(int i=0; i<16; ++i) current->voices[i].vcfLfoDepth = value;
            }
            else if (paramId == "LAYERAKORGHPFCUTOFF") {
                for(int i=0; i<16; ++i) current->voices[i].korgHpCutoff = value;
            }
            else if (paramId == "LAYERAKORGHPFRESONANCE") {
                for(int i=0; i<16; ++i) current->voices[i].korgHpRes = value;
            }
            else if (paramId == "LAYERAKORGGRIT") {
                for(int i=0; i<16; ++i) current->voices[i].korgGrit = value;
            }
            else if (paramId == "LAYERAMAINHPF") {
                for(int i=0; i<16; ++i) current->voices[i].hpfPosition = (int)value;
            }
            else if (paramId == "LAYERAMAINVCAMODE") {
                for(int i=0; i<16; ++i) current->voices[i].vcaGateMode = (value > 0.5f);
            }
            else if (paramId == "LAYERACHORUSMODE") {
                current->chorusMode = (int)value;
            }
            else if (paramId == "LAYERAMAINJPDETUNE") {
                current->jpDetune = value;
            }
            else if (paramId == "LAYERAMAINJPSPREAD") {
                current->jpSpread = value;
            }
            else if (paramId == "LAYERAFXSPACEENABLE") {
                current->spaceEchoEnabled = (value > 0.5f);
            }
            else if (paramId == "LAYERAFXSPACESPEED") {
                current->spaceEchoSpeed = value;
            }
            else if (paramId == "LAYERAFXSPACEINTENSITY") {
                current->spaceEchoIntensity = value;
            }
            else if (paramId == "LAYERAFXSPACEECHOVOL") {
                current->spaceEchoEchoVol = value;
            }
            else if (paramId == "LAYERAFXSPACEREVERBVOL") {
                current->spaceEchoReverbVol = value;
            }
            else if (paramId == "LAYERAFXSPACEMODE") {
                current->spaceEchoMode = (int)value;
            }
            else if (paramId == "LAYERAMAINVCAGAIN") {
                mEngine.setVcaGain(value);
            }

            // Notificar al motor para que procese el cambio
            mEngine.pushConfigUpdate();
        }

        /**
         * @brief Acceso para el audio thread.
         */
        const EngineConfig* getCurrentConfig() const { return mCurrentSnapshot.load(); }

    private:
        DSP::Engines::Modular::VirtualAnalogEngine& mEngine;
        Ace::AceValidator mValidator;
        
        std::unique_ptr<EngineConfig> mSnapshots[2];
        std::atomic<EngineConfig*> mCurrentSnapshot;
    };

} // namespace Service
} // namespace Core
} // namespace Omega
