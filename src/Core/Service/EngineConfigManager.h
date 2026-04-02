#pragma once

#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <memory>
#include <atomic>

#include "EngineConfig.h"
#include "../Preset/OmegaPreset.h"
#include "../Ace/AceValidator.h"
#include "../../DSP/Engines/Modular/VirtualAnalogEngine.h"

// New Mappers
#include "PresetToVoiceArchMapper.h"
#include "VoiceArchToEngineConfigMapper.h"
#include "ParamBindingRegistry.h"
#include "ModulationMatrixService.h"

namespace Omega {
namespace Core {
namespace Service {

    /**
     * @brief Refactored Orchestrator for DSP engine configuration.
     * Delegates extraction and mapping to specialized components.
     */
    class EngineConfigManager {
    public:
        EngineConfigManager(DSP::Engines::Modular::VirtualAnalogEngine& engine, const Ace::AceCatalog& catalog)
            : mEngine(engine), mCatalog(catalog), mValidator(catalog) {
            mSnapshots[0] = std::make_unique<EngineConfig>();
            mSnapshots[1] = std::make_unique<EngineConfig>();
            mCurrentSnapshot.store(mSnapshots[0].get());
            mEngine.setConfigProvider(&mCurrentSnapshot);
        }

        /**
         * @brief Aplica un preset completo al motor.
         */
        void applyPreset(Preset::OmegaPreset& preset) {
            using IDs = Preset::OmegaPreset::IDs;

            // 1. Validar ACE
            auto report = mValidator.validateAndRepairPreset(preset);
            if (report.status == Ace::ValidationStatus::Invalid) return;

            // 2. Preparar back buffer
            EngineConfig* next = (mCurrentSnapshot.load() == mSnapshots[0].get()) ? mSnapshots[1].get() : mSnapshots[0].get();
            *next = EngineConfig(); // Reset to defaults

            // 3. Extraer Arquitectura y Mapear a Voces
            if (preset.getNumLayers() > 0) {
                auto layer = preset.getLayerTree(0);
                auto voiceArch = PresetToVoiceArchMapper::map(layer);
                
                // Aplicar estructura modular a todas las voces
                for (int i = 0; i < 16; ++i) {
                    VoiceArchToEngineConfigMapper::mapArchitecture(voiceArch, next->voices[i]);
                }

                // Aplicar Parámetros (vía Registry para consistencia)
                auto params = layer.getChildWithName(IDs::params);
                for (int p = 0; p < params.getNumProperties(); ++p) {
                    auto pid = params.getPropertyName(p).toString();
                    juce::String fullId = "LAYER:A:" + pid.toUpperCase();
                    float val = params.getProperty(pid);
                    
                    for (int i = 0; i < 16; ++i) {
                        ParamBindingRegistry::getInstance().apply(fullId, val, next->voices[i]);
                    }
                }

                // 4. Voice Architecture 2.0 (Batch 4) - Compile dynamic topology
                auto compileResult = Voice::VoiceArchitectureCompiler::compile(layer, mCatalog);
                if (compileResult.success) {
                    // Modulation Matrix 2.0 - Inject matrix routes into the plan
                    ModulationMatrixService::compileMatrix(preset, compileResult.plan);
                    
                    mEngine.setVoicePlan(compileResult.plan);
                }

                next->masterGainDb = preset.getMasterGainDb();
            }

            // 4. Swap Atómico
            mCurrentSnapshot.store(next);
            mEngine.pushConfigUpdate(); 
        }

        /**
         * @brief Actualiza un parámetro en tiempo real.
         */
        void updateParameter(const std::string& paramId, float value) {
            auto* current = mCurrentSnapshot.load();
            
            // 1. Global Parameters (Direct Access)
            if (paramId == "LAYERAMAINVCAGAIN") {
                mEngine.setVcaGain(value);
            } else if (paramId == "MASTERCHORUSMODE") {
                current->chorusMode = (int)value;
            } else if (paramId == "MASTERCHORUSMIX") {
                current->chorusMix = value;
            } else if (paramId == "LAYERAMAINJPDETUNE") {
                current->jpDetune = value;
            } else if (paramId == "LAYERAMAINJPSPREAD") {
                current->jpSpread = value;
            } else if (paramId == "LAYERAFXSPACEENABLE") {
                current->spaceEchoEnabled = (value > 0.5f);
            } else if (paramId == "LAYERAFXSPACESPEED") {
                current->spaceEchoSpeed = value;
            } else if (paramId == "LAYERAFXSPACEINTENSITY") {
                current->spaceEchoIntensity = value;
            } else if (paramId == "LAYERAFXSPACEECHOVOL") {
                current->spaceEchoEchoVol = value;
            } else if (paramId == "LAYERAFXSPACEREVERBVOL") {
                current->spaceEchoReverbVol = value;
            } else if (paramId == "LAYERAFXSPACEMODE") {
                current->spaceEchoMode = (int)value;
            } else {
                // 2. Per-Voice Parameters (Registry)
                for (int i = 0; i < 16; ++i) {
                    ParamBindingRegistry::getInstance().apply(paramId, value, current->voices[i]);
                }
            }

            mEngine.pushConfigUpdate();
        }

        const EngineConfig* getCurrentConfig() const { return mCurrentSnapshot.load(); }

    private:
        DSP::Engines::Modular::VirtualAnalogEngine& mEngine;
        const Ace::AceCatalog& mCatalog;
        Ace::AceValidator mValidator;
        
        std::unique_ptr<EngineConfig> mSnapshots[2];
        std::atomic<EngineConfig*> mCurrentSnapshot;
    };

} // namespace Service
} // namespace Core
} // namespace Omega
