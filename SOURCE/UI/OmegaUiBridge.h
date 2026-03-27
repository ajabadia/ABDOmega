#pragma once

#include "../Core/Preset/OmegaPreset.h"
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_core/juce_core.h>
#include <functional>

namespace Omega {
    namespace Core {
        namespace Ace { class AceCatalog; }
        namespace Preset { class PresetRepository; }
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
                      juce::AudioProcessorValueTreeState& apvts);
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

        // --- Handlers Internos (v1 Spec) ---
        
        juce::var handleGetState(const juce::var& requestId, const juce::var& payload);
        juce::var handleSetParam(const juce::var& requestId, const juce::var& payload);
        juce::var handleListAceComponents(const juce::var& requestId, const juce::var& payload);
        juce::var handleLoadPreset(const juce::var& requestId, const juce::var& payload);
        juce::var handleSavePreset(const juce::var& requestId, const juce::var& payload);
        juce::var handleUiReady(const juce::var& requestId, const juce::var& payload);

        // [Git-for-Sounds] handlers
        juce::var handleListPresets(const juce::var& requestId, const juce::var& payload);
        juce::var handleGetHistory(const juce::var& requestId, const juce::var& payload);
        juce::var handleSaveSnapshot(const juce::var& requestId, const juce::var& payload);
        juce::var handleCheckout(const juce::var& requestId, const juce::var& payload);
        juce::var handleCreateBranch(const juce::var& requestId, const juce::var& payload);
        juce::var handleGetMetadata(const juce::var& requestId, const juce::var& payload);
        juce::var handleGetTelemetry(const juce::var& requestId, const juce::var& payload);
        juce::var handleGetModConnections(const juce::var& requestId, const juce::var& payload);
        juce::var handleTriggerNote(const juce::var& requestId, const juce::var& payload);

        // --- Helpers ---
        juce::var presetToVar(const Core::Preset::OmegaPreset& p);
        juce::String createResponse(const juce::var& type, const juce::var& requestId, const juce::var& error, const juce::var& payload = {});
        void notifyUi(const juce::var& notification);

        Core::Preset::OmegaPreset& mPreset;
        Core::Ace::AceCatalog& mCatalog;
        Core::Preset::PresetRepository* mRepository;
        juce::AudioProcessorValueTreeState& mApvts;
        Plugin::OmegaAudioProcessor* mProcessor;
        MessageCallback mUiCallback;
        std::function<void(const Core::Preset::OmegaPreset&)> mOnLoadPreset;

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(OmegaUiBridge)
    };

    } // namespace UI
} // namespace Omega
