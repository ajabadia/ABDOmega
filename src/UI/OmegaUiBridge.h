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
#include "RpcModulationController.h"
#include "RpcParameterController.h"

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
         * [Era 6]: Nominal Command Dispatch + Subscription Telemetry.
         */
        class OmegaUiBridge : private juce::AudioProcessorValueTreeState::Listener,
                              private juce::Timer 
        {
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
        juce::var    handleMessageFromUiAsVar(const juce::String& type, const juce::var& requestId, const juce::var& payload);

        /**
         * @brief Define el callback para enviar mensajes espontáneos a la UI.
         */
        void setUiMessageCallback(MessageCallback callback);
        void setOnLoadCallback(std::function<void(const Core::Preset::OmegaPreset&)> callback);
        
        /**
         * @brief Fuerza un repintado de la UI notificando un cambio de estado completo.
         */
        void forceRepaint();

    private:
        // --- APVTS Listener ---
        void parameterChanged(const juce::String& parameterID, float newValue) override;

        // --- Timer Callback (60Hz Telemetry Push) ---
        void timerCallback() override;

        // --- Router Helpers ---
        juce::var createResponse(const juce::var& type, const juce::var& requestId, const juce::var& payload = {});
        juce::var createError(const juce::var& errorCode, const juce::var& requestId, const juce::String& message);
        void notifyUi(const juce::var& notification);

        // --- Specialized Controllers ---
        std::unique_ptr<RpcPresetController> mPresetController;
        std::unique_ptr<RpcTelemetryController> mTelemetryController;
        std::unique_ptr<RpcSystemController> mSystemController;
        std::unique_ptr<RpcMetadataController> mMetadataController;
        std::unique_ptr<RpcInputController> mInputController;
        std::unique_ptr<RpcModulationController> mModulationController;
        std::unique_ptr<RpcParameterController> mParameterController;
        RpcCommandDispatcher mDispatcher;

        Plugin::OmegaAudioProcessor* mProcessor;
        Core::Preset::OmegaPreset& mPreset;
        juce::AudioProcessorValueTreeState& mApvts;
        MessageCallback mUiCallback;
        std::function<void(const Core::Preset::OmegaPreset&)> mOnLoadPreset;
        
        juce::var mScopeState;
        int mTelemetryFrameCounter = 0;

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(OmegaUiBridge)
    };

    } // namespace UI
} // namespace Omega
