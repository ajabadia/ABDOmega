#pragma once

#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <memory>
#include <atomic>

#include "../Model/PatchDocument.h"
#include "../Model/RuntimeSnapshot.h"
#include "../Compiler/RuntimeCompiler.h"
#include "../Ace/AceCatalog.h"
#include "../../Engine/Modular/VirtualAnalogEngine.h"

namespace Omega::Core::Service {

    /**
     * @brief [Era 7] Centralized Store for the Engine State.
     * Replaces the legacy EngineConfigManager.
     */
    class EngineConfigManager {
    public:
        EngineConfigManager(::Omega::Engine::Modular::VirtualAnalogEngine& engine, const Ace::AceCatalog& catalog)
            : mEngine(engine), mCatalog(catalog) {
            mCurrentSnapshot.store(&mSnapshots[0]);
        }

        /**
         * @brief Aplica un patch completo al motor.
         */
        void applyPatch(const Model::PatchDocument& doc) {
            mPatchDocument = doc;
            recompile();
        }

        /**
         * @brief [Legacy] Adaptador para el sistema de presets Era 6.
         */
        // void applyPreset(const Preset::OmegaPreset& preset) { ... }

        /**
         * @brief Actualiza un parÃ¡metro individual y recompila el snapshot.
         */
        void updateParameter(uint32_t instanceId, Model::ParamId paramId, float value) {
            auto* mod = const_cast<Model::ModuleInstance*>(mPatchDocument.findModule(instanceId));
            if (mod) {
                bool found = false;
                for (auto& p : mod->parameters) {
                    if (p.id == paramId) { p.value = value; found = true; break; }
                }
                if (!found) mod->parameters.push_back({paramId, value});
                
                recompile();
            }
        }

        /**
         * @brief [Legacy] Soporte para parÃ¡metros por nombre.
         */
        void updateParameter(const juce::String& paramName, float value) {
            if (paramName == "LAYERAMAINVCAGAIN") {
                mPatchDocument.masterGainDb = value;
                recompile();
                return;
            }
            // Otros mapeos legacy aquÃ­...
        }

        /**
         * @brief [Critical Path] Recompila el snapshot atÃ³micamente.
         */
        void recompile() {
            auto nextIdx = (mCurrentSnapshot.load() == &mSnapshots[0]) ? 1 : 0;
            mSnapshots[nextIdx] = Compiler::RuntimeCompiler::compile(mPatchDocument, mCatalog);
            
            mCurrentSnapshot.store(&mSnapshots[nextIdx]);
            mEngine.pushConfigUpdate(); // Notify audio thread
        }

        const Model::RuntimeSnapshot* getCurrentSnapshot() const { return mCurrentSnapshot.load(); }
        const Model::PatchDocument& getPatchDocument() const { return mPatchDocument; }

    private:
        ::Omega::Engine::Modular::VirtualAnalogEngine& mEngine;
        const Ace::AceCatalog& mCatalog;
        
        Model::PatchDocument mPatchDocument;
        Model::RuntimeSnapshot mSnapshots[2];
        std::atomic<Model::RuntimeSnapshot*> mCurrentSnapshot;
    };

} // namespace Omega::Core::Service
