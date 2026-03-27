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

                // --- FX ---
                auto fxSlots = arch.getChildWithName("fxSlots");
                bool chorusOn = false;
                float chorusLevel = 0.0f;
                if (fxSlots.isValid() && fxSlots.getNumChildren() > 0) {
                    juce::String fxId = fxSlots.getChild(0).getProperty(Preset::IDs::componentId);
                    if (fxId == "FX-CH-001") {
                        chorusOn = true;
                        chorusLevel = 0.5f; // Mix por defecto si no está en params
                    }
                }

                // Aplicar a todas las voces del snapshot
                for (int i = 0; i < 16; ++i) {
                    next->voices[i].oscMode = oscMode;
                    next->voices[i].filterType = filterType;
                    next->voices[i].cutoff = cut;
                    next->voices[i].resonance = res;
                }
                next->chorusEnabled = chorusOn;
                next->chorusMix = chorusLevel;
                next->masterGainDb = preset.getMasterGainDb();
            }

            // 3. Swap Atómico
            mCurrentSnapshot.store(next);
            
            // 4. Notificar al motor que hay cambios (el motor leerá del snapshot en el audio thread)
            mEngine.pushConfigUpdate(); 
        }

        /**
         * @brief Actualiza un parámetro en tiempo real (thread-safe para el audio thread).
         */
        void updateParameter(const std::string& paramId, float value) {
            // Para el MVP, actualizamos el snapshot actual directamente (siendo cuidadosos)
            // O mejor: actualizamos campos atómicos si son muy frecuentes.
            // Aquí simplificamos para el MVP ya que mCurrentSnapshot es lo que lee el motor.
            auto* current = mCurrentSnapshot.load();
            if (paramId == "LAYERAMAINCUTOFF") {
                for(int i=0; i<16; ++i) current->voices[i].cutoff = value;
            }
            else if (paramId == "LAYERAMAINRESONANCE") {
                for(int i=0; i<16; ++i) current->voices[i].resonance = value;
            }
            else if (paramId == "LAYERAMAINVCAGAIN") {
                mEngine.setVcaGain(value);
            }
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
