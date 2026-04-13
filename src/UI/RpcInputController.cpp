#include "RpcInputController.h"
#include "../Plugin/OmegaAudioProcessor.h"
#include "../Core/Input/MidiMonitor.h"

namespace Omega {
namespace UI {

    RpcInputController::RpcInputController(Plugin::OmegaAudioProcessor* processor)
        : mProcessor(processor) {}

    void RpcInputController::registerCommands(RpcCommandDispatcher& dispatcher) {
        dispatcher.registerHandler("triggerNote", [this](const juce::var& rid, const juce::var& p) { return handleTriggerNote(rid, p); });
    }

    juce::var RpcInputController::handleTriggerNote(const juce::var& requestId, const juce::var& payload) {
        int note = (int)payload["note"];
        int vel = (int)payload["velocity"];
        bool on = (bool)payload["on"];
        
        if (mProcessor) {
            mProcessor->triggerNote(note, vel, on);
            
            // Record in MIDI Monitor for UI feedback (Using correct Aseptic 2.0 namespace)
            auto msg = on ? juce::MidiMessage::noteOn(1, note, (uint8_t)vel) 
                          : juce::MidiMessage::noteOff(1, note);
            
            // Give it a valid timestamp based on current time
            msg.setTimeStamp(juce::Time::getMillisecondCounterHiRes() * 0.001);
            
            ::Omega::Core::Input::MidiMonitor::getInstance().pushEvent(msg);
        }
        
        return createResponse("TRIGGER_ACK", requestId, juce::var(), true);
    }

} // namespace UI
} // namespace Omega
