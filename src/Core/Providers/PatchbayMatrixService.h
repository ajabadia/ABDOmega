#pragma once

#include "../Preset/OmegaPreset.h"
#include "../Voice/CompiledVoicePlan.h"
#include "../Modulation/ModulationMetadata.h"

namespace Omega::Core::Service {

    /**
     * @brief Compiler service for Modulation Matrix 2.0.
     * Translates declarative matrix slots from a preset into hardcoded routes 
     * in a CompiledVoicePlan for the audio engine.
     */
    class PatchbayMatrixService {
    public:
        /**
         * @brief Compiles mod matrix slots from a preset into a voice plan.
         * @param preset The source preset containing patchbayMatrix data.
         * @param outPlan The voice plan to populate with modRoutes.
         * @param maxSlots Dynamic limit from system settings.
         */
        static void compileMatrix(const Preset::OmegaPreset& preset, Voice::CompiledVoicePlan& outPlan, int maxSlots = 64);

    private:
        /**
         * @brief Resolves a modulation via/amount pair into a consolidated amount.
         * @note Future implementation: will support dynamic VIA scaling.
         */
        static float resolveEffectiveAmount(const Preset::PatchbayMatrixSlot& slot);
        
        /**
         * @brief Translates modulation metadata IDs into ParamIdRegistry stable IDs.
         */
        static uint32_t resolveRuntimeParamId(Modulation::TargetStableId targetId);
    };

} // namespace Omega::Core::Service
