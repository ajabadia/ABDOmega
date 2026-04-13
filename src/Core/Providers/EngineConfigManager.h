#pragma once

#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <memory>
#include <atomic>

#include "EngineConfig.h"
#include "../Preset/OmegaPreset.h"
#include "../Ace/AceValidator.h"
/** [BUILD_FORCE_15] Absolute Aseptic Restoration of Config Manager. **/
#include "../../Engine/Modular/VirtualAnalogEngine.h"

// New Mappers
#include "PresetToVoiceArchMapper.h"
#include "VoiceArchToEngineConfigMapper.h"
#include "ParamBindingRegistry.h"
#include "PatchbayMatrixService.h"

namespace Omega {
namespace Core {
namespace Service {

    /**
     * @brief Refactored Orchestrator for DSP engine configuration.
     * Delegates extraction and mapping to specialized components.
     * [Architecture]: Synchronized with Omega::Engine::Modular::VirtualAnalogEngine.
     */
    class EngineConfigManager {
    public:
        EngineConfigManager(::Omega::Engine::Modular::VirtualAnalogEngine& engine, const Ace::AceCatalog& catalog)
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

                // Aplicar ParÃ¡metros (vÃ­a Registry para consistencia)
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
                    // Modulation Matrix 2.0 - Inject matrix routes into the plan using dynamic limits
                    PatchbayMatrixService::compileMatrix(preset, compileResult.plan, mEngine.getMaxPatchbaySlots());
                    
                    mEngine.setVoicePlan(compileResult.plan);
                }

                next->masterGainDb = preset.getMasterGainDb();
            }

            // 4. Swap AtÃ³mico
            mCurrentSnapshot.store(next);
            mEngine.pushConfigUpdate(); 
        }

        /**
         * @brief Actualiza un parÃ¡metro en tiempo real.
         */
        void updateParameter(const std::string& paramId, float value) {
            auto* current = mCurrentSnapshot.load();
            juce::String pid = paramId;

            // 1. Direct Engine Hooks (High Priority)
            if (pid == "LAYERAMAINVCAGAIN") {
                mEngine.setVcaGain(value);
            } 
            else {
                // 2. Global Registry (Era 6 Aseptic)
                ParamBindingRegistry::getInstance().applyGlobal(pid, value, *current);

                // 3. Per-Voice Parameters (Registry)
                for (int i = 0; i < 16; ++i) {
                    ParamBindingRegistry::getInstance().apply(pid, value, current->voices[i]);
                }
            }

            mEngine.pushConfigUpdate();
        }

        const EngineConfig* getCurrentConfig() const { return mCurrentSnapshot.load(); }

    private:
        ::Omega::Engine::Modular::VirtualAnalogEngine& mEngine;
        const Ace::AceCatalog& mCatalog;
        Ace::AceValidator mValidator;
        
        std::unique_ptr<EngineConfig> mSnapshots[2];
        std::atomic<EngineConfig*> mCurrentSnapshot;
    };

} // namespace Service
} // namespace Core
} // namespace Omega
