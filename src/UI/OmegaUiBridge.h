#pragma once

#include "../Core/Preset/OmegaPreset.h"
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_core/juce_core.h>
#include <functional>
#include "RpcPresetController.h"
#include "RpcTelemetryController.h"
#include "RpcSystemController.h"
#include "RpcMetadataController.h"
#include "RpcInputController.h"

namespace Omega {
    namespace Core {
        namespace Ace { class AceCatalog; }
        namespace Preset { class PresetRepository; }
        namespace Service { class SystemSettingsManager; }
    }

    namespace Plugin { class OmegaAudioProcessor; }

    namespace UI {
        /**
         * @brief Puente de comunicación entre C++ y la WebUI (React).
         * [Protocol]: JSON-RPC v1 High-Fidelity.
         * [ThreadSafety]: Traduce mensajes de la UI al MessageThread y notifica cambios desde APVTS.
         */
        class OmegaUiBridge : private juce::AudioProcessorValueTreeState::Listener {
    public:
        using MessageCallback = std::function<void(const juce::String&)>;

        OmegaUiBridge(Plugin::OmegaAudioProcessor* processor,
                      Core::Preset::OmegaPreset& preset, 
                      Core::Ace::AceCatalog& catalog,
                      Core::Preset::PresetRepository* repository,
                      juce::AudioProcessorValueTreeState& apvts,
                      Core::Service::SystemSettingsManager& settings);
        ~OmegaUiBridge() override;

        /**
         * @brief Procesa un mensaje JSON proveniente del Frontend.
         */
        juce::String handleMessageFromUi(const juce::String& jsonMessage);
        juce::var    handleMessageFromUiAsVar(const juce::String& jsonMessage);
        juce::var    handleMessageFromUiAsVar(const juce::String& type, const juce::var& requestId, const juce::var& payload);

        /**
         * @brief Define el callback para enviar mensajes espontáneos a la UI.
         */
        void setUiMessageCallback(MessageCallback callback);
        void setOnLoadCallback(std::function<void(const Core::Preset::OmegaPreset&)> callback);

    private:
        // --- APVTS Listener ---
        void parameterChanged(const juce::String& parameterID, float newValue) override;

        // --- Router Helpers ---
        juce::String createResponse(const juce::var& type, const juce::var& requestId, const juce::var& error, const juce::var& payload = {});
        void notifyUi(const juce::var& notification);

        // --- Specialized Controllers ---
        std::unique_ptr<RpcPresetController> mPresetController;
        std::unique_ptr<RpcTelemetryController> mTelemetryController;
        std::unique_ptr<RpcSystemController> mSystemController;
        std::unique_ptr<RpcMetadataController> mMetadataController;
        std::unique_ptr<RpcInputController> mInputController;

        Plugin::OmegaAudioProcessor* mProcessor;
        Core::Preset::OmegaPreset& mPreset;
        juce::AudioProcessorValueTreeState& mApvts;
        MessageCallback mUiCallback;
        std::function<void(const Core::Preset::OmegaPreset&)> mOnLoadPreset;
        
        juce::var mScopeState;

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(OmegaUiBridge)
    };

    } // namespace UI
} // namespace Omega
