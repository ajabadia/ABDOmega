#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include "RpcBaseController.h"
#include "RpcCommandDispatcher.h"
#include "../Core/Preset/OmegaPreset.h"

namespace Omega {
    namespace Plugin { class OmegaAudioProcessor; }

namespace UI {

    /**
     * @brief Controller for parameter mutations (Era 6).
     * Acts as the formal Domain Dispatcher for 'setParameter' and 'getState'.
     */
    class RpcParameterController : public RpcBaseController {
    public:
        RpcParameterController(Plugin::OmegaAudioProcessor* processor, juce::AudioProcessorValueTreeState& apvts, Core::Preset::OmegaPreset& preset);

        void setupParameterCommands(RpcCommandDispatcher& dispatcher);

        /**
         * @brief Handles setParameter command.
         * [Nominal Command]: { id: string, value: float }
         */
        juce::var handleSetParameter(const juce::var& requestId, const juce::var& payload);

        /**
         * @brief Handles getState command.
         * [Nominal Command]: Returns current preset metadata and parameter state.
         */
        juce::var handleGetState(const juce::var& requestId, const juce::var& payload);

    private:
        Plugin::OmegaAudioProcessor* mProcessor;
        juce::AudioProcessorValueTreeState& mApvts;
        Core::Preset::OmegaPreset& mPreset;
    };

} // namespace UI
} // namespace Omega
