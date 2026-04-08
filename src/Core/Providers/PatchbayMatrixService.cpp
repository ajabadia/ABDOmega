#include "PatchbayMatrixService.h"
#include "ParamBindingRegistry.h"
#include "../Modulation/ModulationMetadata.h"
#include "../Modulation/ModulationTypes.h"
#include "../Preset/OmegaPreset.h"
#include "../Voice/CompiledVoicePlan.h"

namespace Omega {
namespace Core {
namespace Service {

    void PatchbayMatrixService::compileMatrix(const Preset::OmegaPreset& preset, Voice::CompiledVoicePlan& outPlan, int maxSlots) {
        // Clear existing routes in the plan
        outPlan.modRouteCount = 0;

        using Registry = Modulation::ModulationRegistry;

        // [Hyper-ACE] Dynamic loop limit from SystemSettings
        int limit = std::min({ maxSlots, (int)preset.getNumPatchbaySlots(), (int)Voice::CompiledVoicePlan::kMaxModRoutes });

        for (int i = 0; i < limit; ++i) {
            auto slot = preset.getPatchbaySlot(i);
            if (!slot.active || slot.source.empty() || slot.target.empty()) continue;

            if (outPlan.modRouteCount >= Voice::CompiledVoicePlan::kMaxModRoutes) break;

            // Resolve Source Signal Index
            uint8_t srcIndex = Registry::getSignalIndex(slot.source);
            if (srcIndex == Voice::CompiledSignalSpace::kInvalid) continue;

            // Resolve Target Parameter Index
            Modulation::TargetStableId targetId = Registry::getStableId(slot.target);
            if (targetId == Modulation::TargetStableId::None) continue;

            // Create low-level route for the engine
            Voice::RuntimeModRoute& route = outPlan.modRoutes[outPlan.modRouteCount++];
            route.sourceSignal = srcIndex;
            route.targetParamId = resolveRuntimeParamId(targetId);
            route.amount = slot.amount;
        }
    }

    float PatchbayMatrixService::resolveEffectiveAmount(const Preset::PatchbayMatrixSlot& slot) {
        return slot.amount;
    }

    uint32_t PatchbayMatrixService::resolveRuntimeParamId(Modulation::TargetStableId targetId) {
        return static_cast<uint32_t>(targetId);
    }

} // namespace Service
} // namespace Core
} // namespace Omega
