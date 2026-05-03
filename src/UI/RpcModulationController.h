#pragma once

#include "RpcBaseController.h"
#include "RpcCommandDispatcher.h"
#include "../Core/Modulation/ModulationMetadata.h"

namespace Omega {
    namespace Core {
        namespace Service { class EngineConfigManager; }
    }

namespace UI {

    /**
     * @brief Controller for Modulation Matrix operations (Era 7).
     * Decoupled from legacy preset state.
     */
    class RpcModulationController : public RpcBaseController {
    public:
        RpcModulationController(Core::Service::EngineConfigManager& engineConfig) 
            : mEngineConfig(engineConfig) {}

        juce::var handleGetModulationMetadata(const juce::var& requestId, const juce::var& payload);
        juce::var handleUpdatePatchbayMatrixSlot(const juce::var& requestId, const juce::var& payload);

        void registerCommands(RpcCommandDispatcher& dispatcher);

    private:
        Core::Service::EngineConfigManager& mEngineConfig;
    };

} // namespace UI
} // namespace Omega
