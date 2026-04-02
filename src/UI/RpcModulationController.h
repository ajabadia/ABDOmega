#pragma once

#include "RpcBaseController.h"
#include "../Core/Modulation/ModulationMetadata.h"
#include "../Core/Preset/OmegaPreset.h"

namespace Omega {
namespace UI {

    /**
     * @brief Controller for Modulation Matrix operations.
     */
    class RpcModulationController : public RpcBaseController {
    public:
        RpcModulationController(Core::Preset::OmegaPreset& preset) : mPreset(preset) {}

        juce::var handleGetModulationMetadata(const juce::var& requestId, const juce::var& payload);
        juce::var handleUpdateModMatrixSlot(const juce::var& requestId, const juce::var& payload);

    private:
        Core::Preset::OmegaPreset& mPreset;
    };

} // namespace UI
} // namespace Omega
