#pragma once

#include "RpcBaseController.h"
#include "../Core/Preset/OmegaPreset.h"
#include "../Core/Ace/AceCatalog.h"
#include "../Core/Preset/PresetRepository.h"

namespace Omega {
namespace UI {

    /**
     * @brief Controller for Preset and ACE operations.
     */
    class RpcPresetController : public RpcBaseController {
    public:
        RpcPresetController(Core::Preset::OmegaPreset& preset, 
                            Core::Ace::AceCatalog& catalog,
                            Core::Preset::PresetRepository* repository)
            : mPreset(preset), mCatalog(catalog), mRepository(repository) {}

        juce::var handleGetState(const juce::var& requestId, const juce::var& payload);
        juce::var handleListAceComponents(const juce::var& requestId, const juce::var& payload);
        juce::var handleLoadPreset(const juce::var& requestId, const juce::var& payload, std::function<void(const Core::Preset::OmegaPreset&)> onLoad);
        juce::var handleSavePreset(const juce::var& requestId, const juce::var& payload);
        juce::var handleListPresets(const juce::var& requestId, const juce::var& payload);
        juce::var handleGetBrowserData(const juce::var& requestId, const juce::var& payload);
        juce::var handleSelectLibrary(const juce::var& requestId, const juce::var& payload);
        juce::var handleLoadLibraryPreset(const juce::var& requestId, const juce::var& payload, std::function<void(const Core::Preset::OmegaPreset&)> onLoad);
        juce::var handleSetFavorite(const juce::var& requestId, const juce::var& payload);

        // Version Control (Moved from System)
        juce::var handleGetHistory(const juce::var& requestId, const juce::var& payload);
        juce::var handleSaveSnapshot(const juce::var& requestId, const juce::var& payload, const Core::Preset::OmegaPreset& currentPreset);
        juce::var handleCheckout(const juce::var& requestId, const juce::var& payload, std::function<void(const Core::Preset::OmegaPreset&)> onLoad);
        juce::var handleCreateBranch(const juce::var& requestId, const juce::var& payload);

        // Utility to convert preset to var (moved from Bridge)
        static juce::var presetToVar(const Core::Preset::OmegaPreset& p);

    private:
        Core::Preset::OmegaPreset& mPreset;
        Core::Ace::AceCatalog& mCatalog;
        Core::Preset::PresetRepository* mRepository;
    };

} // namespace UI
} // namespace Omega
