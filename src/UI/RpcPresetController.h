#pragma once

#include "RpcBaseController.h"
#include "../Core/Preset/OmegaPreset.h"
#include "../Core/Ace/AceCatalog.h"
#include "../Core/Preset/PresetRepository.h"

namespace Omega {
    namespace Core {
        namespace Service { class EngineConfigManager; }
        namespace Preset { class OmegaPreset; class PresetRepository; }
        namespace Ace { class AceCatalog; }
    }

namespace UI {

    /**
     * @brief Controller for Preset and ACE operations.
     */
    class RpcPresetController : public RpcBaseController {
    public:
        RpcPresetController(Core::Preset::OmegaPreset& preset, 
                            Core::Ace::AceCatalog& catalog,
                            Core::Preset::PresetRepository* repository,
                            Core::Service::EngineConfigManager& engineConfig)
            : mPreset(preset), mCatalog(catalog), mRepository(repository), mEngineConfig(engineConfig) {}

        juce::var handleListAceComponents(const juce::var& requestId, const juce::var& payload);
        juce::var handleLoadPreset(const juce::var& requestId, const juce::var& payload, std::function<void(const Core::Preset::OmegaPreset&)> onLoad);
        juce::var handleSavePreset(const juce::var& requestId, const juce::var& payload);
        juce::var handleListPresets(const juce::var& requestId, const juce::var& payload);
        juce::var handleGetBrowserData(const juce::var& requestId, const juce::var& payload);
        juce::var handleSelectLibrary(const juce::var& requestId, const juce::var& payload);
        juce::var handleLoadLibraryPreset(const juce::var& requestId, const juce::var& payload, std::function<void(const Core::Preset::OmegaPreset&)> onLoad);
        juce::var handleSetFavorite(const juce::var& requestId, const juce::var& payload);
        juce::var handleAddModule(const juce::var& requestId, const juce::var& payload, std::function<void(const Core::Preset::OmegaPreset&)> onLoad);
        juce::var handleRemoveModule(const juce::var& requestId, const juce::var& payload, std::function<void(const Core::Preset::OmegaPreset&)> onLoad);
        juce::var handleMoveModule(const juce::var& requestId, const juce::var& payload, std::function<void(const Core::Preset::OmegaPreset&)> onLoad);
        juce::var handleSetModuleTheme(const juce::var& requestId, const juce::var& payload, std::function<void(const Core::Preset::OmegaPreset&)> onLoad);

        // Version Control (Moved from System)
        juce::var handleGetHistory(const juce::var& requestId, const juce::var& payload);
        juce::var handleSaveSnapshot(const juce::var& requestId, const juce::var& payload, const Core::Preset::OmegaPreset& currentPreset);
        juce::var handleCheckout(const juce::var& requestId, const juce::var& payload, std::function<void(const Core::Preset::OmegaPreset&)> onLoad);
        juce::var handleCreateBranch(const juce::var& requestId, const juce::var& payload);

        void registerCommands(RpcCommandDispatcher& dispatcher, std::function<void(const Core::Preset::OmegaPreset&)> onLoad);
        
        void setOnConfigChangedCallback(std::function<void()> callback) { mOnConfigChanged = callback; }

        // Utility to convert preset to var (moved from Bridge)
        static juce::var presetToVar(const Core::Preset::OmegaPreset& p);
        static juce::var valueTreeToVar(const juce::ValueTree& tree);

    private:
        Core::Preset::OmegaPreset& mPreset;
        Core::Ace::AceCatalog& mCatalog;
        Core::Preset::PresetRepository* mRepository;
        Core::Service::EngineConfigManager& mEngineConfig;
        std::function<void()> mOnConfigChanged;
    };

} // namespace UI
} // namespace Omega
