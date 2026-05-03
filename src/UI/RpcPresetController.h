#pragma once

#include <juce_data_structures/juce_data_structures.h>
#include "RpcBaseController.h"
#include "../Core/Ace/AceCatalog.h"

namespace Omega {
    namespace Core {
        namespace Service { class EngineConfigManager; }
        namespace Ace { class AceCatalog; }
    }

namespace UI {

    /**
     * @brief Controller for ACE operations (Era 7).
     * Decoupled from legacy Preset systems.
     */
    class RpcPresetController : public RpcBaseController {
    public:
        RpcPresetController(Core::Ace::AceCatalog& catalog,
                            Core::Service::EngineConfigManager& engineConfig)
            : mCatalog(catalog), mEngineConfig(engineConfig) {}

        juce::var handleListAceComponents(const juce::var& requestId, const juce::var& payload);
        juce::var handleLoadPreset(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad);
        juce::var handleNewPreset(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad);
        juce::var handleSavePreset(const juce::var& requestId, const juce::var& payload);
        juce::var handleListPresets(const juce::var& requestId, const juce::var& payload);
        juce::var handleGetBrowserData(const juce::var& requestId, const juce::var& payload);
        
        juce::var handleAddModule(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad);
        juce::var handleRemoveModule(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad);
        juce::var handleMoveModule(const juce::var& requestId, const juce::var& payload, std::function<void()> onLoad);

        // Version Control (Era 7 - Stubbed)
        juce::var handleGetHistory(const juce::var& requestId, const juce::var& payload);

        void registerCommands(RpcCommandDispatcher& dispatcher, std::function<void()> onLoad);
        
        void setOnConfigChangedCallback(std::function<void()> callback) { mOnConfigChanged = callback; }

        static juce::var valueTreeToVar(const juce::ValueTree& tree);

    private:
        Core::Ace::AceCatalog& mCatalog;
        Core::Service::EngineConfigManager& mEngineConfig;
        std::function<void()> mOnConfigChanged;
    };

} // namespace UI
} // namespace Omega
