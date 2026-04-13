#pragma once

#include "RpcBaseController.h"
#include "RpcCommandDispatcher.h"
#include "../Core/Providers/SystemSettingsManager.h"
#include "../Core/Preset/PresetRepository.h"
#include "../Core/Preset/OmegaPreset.h"

namespace Omega {
    namespace Plugin { class OmegaAudioProcessor; }
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
        
        juce::var handleExit(const juce::var& requestId, const juce::var& payload);
        juce::var handleNewPreset(const juce::var& requestId, const juce::var& payload, Plugin::OmegaAudioProcessor* processor);
        juce::var handleServiceAction(const juce::var& requestId, const juce::var& payload);

        void registerCommands(RpcCommandDispatcher& dispatcher, Plugin::OmegaAudioProcessor* processor);

    private:
        Core::Service::SystemSettingsManager& mSettings;
        Core::Preset::PresetRepository* mRepository;
    };

} // namespace UI
} // namespace Omega
