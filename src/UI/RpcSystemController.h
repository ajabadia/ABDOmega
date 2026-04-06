#pragma once

#include "RpcBaseController.h"
#include "../Core/Providers/SystemSettingsManager.h"
#include "../Core/Preset/PresetRepository.h"

namespace Omega {
namespace UI {

    /**
     * @brief Controller for System Settings, Git History, and Metadata.
     */
    class RpcSystemController : public RpcBaseController {
    public:
        RpcSystemController(Core::Service::SystemSettingsManager& settings,
                            Core::Preset::PresetRepository* repository)
            : mSettings(settings), mRepository(repository) {}

        juce::var handleGetSystemSettings(const juce::var& requestId, const juce::var& payload);
        juce::var handleSetSystemSetting(const juce::var& requestId, const juce::var& payload);

    private:
        Core::Service::SystemSettingsManager& mSettings;
        Core::Preset::PresetRepository* mRepository;
    };

} // namespace UI
} // namespace Omega
