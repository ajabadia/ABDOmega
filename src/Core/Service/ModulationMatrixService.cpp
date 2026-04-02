#include "ModulationMatrixService.h"

namespace Omega {
namespace Core {
namespace Service {

    using namespace Omega::Core::Modulation;
    using namespace Omega::Core::Voice;

    void ModulationMatrixService::compileMatrix(const Preset::OmegaPreset& preset, Voice::CompiledVoicePlan& outPlan) {
        // Reset current routes (but keep those already added by the voice chain compiler if any)
        // Note: Usually the matrix appends to or replaces specific slots.
        // For 2.0, we assume the matrix owns the modRoute array.
        outPlan.modRouteCount = 0;

        int numSlots = preset.getNumModSlots();
        for (int i = 0; i < numSlots && outPlan.modRouteCount < CompiledVoicePlan::kMaxModRoutes; ++i) {
            auto slot = preset.getModSlot(i);
            
            if (!slot.active || slot.source.empty() || slot.target.empty())
                continue;

            // 1. Resolve Source
            uint8_t srcIdx = ModulationRegistry::getSignalIndex(slot.source);
            if (srcIdx == CompiledSignalSpace::kInvalid) continue;

            // 2. Resolve Target
            TargetStableId targetId = ModulationRegistry::getStableId(slot.target);
            if (targetId == TargetStableId::None) continue;

            // 3. Create Route
            RuntimeModRoute route;
            route.sourceSignal = srcIdx;
            route.targetParamId = static_cast<uint32_t>(targetId);
            route.amount = resolveEffectiveAmount(slot);
            
            outPlan.modRoutes[outPlan.modRouteCount++] = route;
        }
    }

    float ModulationMatrixService::resolveEffectiveAmount(const Preset::ModMatrixSlot& slot) {
        // Simple linear amount for now. 
        // In the future, this is where we'd inject 'Via' logic if we want it 
        // to be pre-compiled (harder) or just pass the Via info to the engine.
        // For 2.0 MVP, we only use the base amount.
        return slot.amount;
    }

} // namespace Service
} // namespace Core
} // namespace Omega
