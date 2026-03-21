#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_core/juce_core.h>
#include <functional>

namespace Omega::UI {

    /**
     * @brief Puente de comunicación entre C++ y la WebUI (React).
     * [Protocol]: JSON-RPC v1 simplificado.
     * [ThreadSafety]: Traduce mensajes de la UI al MessageThread y notifica cambios desde APVTS.
     */
    class OmegaUiBridge : private juce::AudioProcessorValueTreeState::Listener {
    public:
        using MessageCallback = std::function<void(const juce::String&)>;

        OmegaUiBridge(juce::AudioProcessorValueTreeState& apvts);
        ~OmegaUiBridge() override;

        /**
         * @brief Procesa un mensaje JSON proveniente del Frontend.
         */
        juce::String handleMessageFromUi(const juce::String& jsonMessage);

        /**
         * @brief Define el callback para enviar mensajes espontáneos a la UI (ej. cambios de parámetros).
         */
        void setUiMessageCallback(MessageCallback callback);

    private:
        // --- APVTS Listener ---
        void parameterChanged(const juce::String& parameterID, float newValue) override;

        // --- Handlers Internos ---
        juce::var handleGetState(const juce::var& params);
        juce::var handleSetParam(const juce::var& params);
        juce::var handleListAceComponents(const juce::var& params);

        // --- Helpers ---
        juce::String createResponse(const juce::var& id, const juce::var& result, const juce::var& error = {});
        void notifyUi(const juce::var& notification);

        juce::AudioProcessorValueTreeState& mApvts;
        MessageCallback mUiCallback;

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(OmegaUiBridge)
    };

} // namespace Omega::UI
