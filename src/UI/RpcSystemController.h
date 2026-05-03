#pragma once

#include "RpcBaseController.h"
#include "RpcCommandDispatcher.h"
#include "../Core/Providers/SystemSettingsManager.h"

namespace Omega {
    namespace Plugin { class OmegaAudioProcessor; }
namespace UI {

    /**
     * @brief Controller for System Settings and Metadata (Era 7).
     * Decoupled from legacy repositories.
     */
    class RpcSystemController : public RpcBaseController {
    public:
        RpcSystemController(Core::Service::SystemSettingsManager& settings)
            : mSettings(settings) {}

        juce::var handleGetSystemSettings(const juce::var& requestId, const juce::var& payload);
        juce::var handleSetSystemSetting(const juce::var& requestId, const juce::var& payload);
        
        juce::var handleExit(const juce::var& requestId, const juce::var& payload);
        juce::var handleServiceAction(const juce::var& requestId, const juce::var& payload);
        
        juce::var handleGetAceSchema(const juce::var& requestId, Plugin::OmegaAudioProcessor* processor);
        juce::var handleSystemAction(const juce::var& requestId, const juce::var& payload, Plugin::OmegaAudioProcessor* processor);

        void registerCommands(RpcCommandDispatcher& dispatcher, Plugin::OmegaAudioProcessor* processor);

    private:
        Core::Service::SystemSettingsManager& mSettings;
    };

} // namespace UI
} // namespace Omega
