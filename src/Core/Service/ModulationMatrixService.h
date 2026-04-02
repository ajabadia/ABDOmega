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
    class ModulationMatrixService {
    public:
        /**
         * @brief Compiles mod matrix slots from a preset into a voice plan.
         * @param preset The source preset containing modMatrix data.
         * @param outPlan The voice plan to populate with modRoutes.
         */
        static void compileMatrix(const Preset::OmegaPreset& preset, Voice::CompiledVoicePlan& outPlan);

    private:
        /**
         * @brief Resolves a modulation via/amount pair into a consolidated amount.
         * @note Future implementation: will support dynamic VIA scaling.
         */
        static float resolveEffectiveAmount(const Preset::ModMatrixSlot& slot);
    };

} // namespace Omega::Core::Service
