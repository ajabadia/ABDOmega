#include "RpcInputController.h"
#include "../Plugin/OmegaAudioProcessor.h"

namespace Omega {
namespace UI {

    RpcInputController::RpcInputController(Plugin::OmegaAudioProcessor* processor)
        : mProcessor(processor) {}

    juce::var RpcInputController::handleTriggerNote(const juce::var& requestId, const juce::var& payload) {
        int note = (int)payload["note"];
        int vel = (int)payload["velocity"];
        bool on = (bool)payload["on"];
        
        if (mProcessor) {
            mProcessor->triggerNote(note, vel, on);
        }
        
        return createResponse("TRIGGER_ACK", requestId, {}, true);
    }

} // namespace UI
} // namespace Omega
