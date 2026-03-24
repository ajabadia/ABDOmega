#include <juce_audio_basics/juce_audio_basics.h>
#include "Midi1InputAdapter.h"
#include "../Core/ParameterMetadata.h"

namespace Omega::Core::Input {

    Midi1InputAdapter::Midi1InputAdapter() {}

    void Midi1InputAdapter::process(const juce::MidiBuffer& midiMessages, OmegaInput& output) {
        for (const auto metadata : midiMessages) {
            const auto msg = metadata.getMessage();
            const int sampleOffset = metadata.samplePosition;
            
            InputEvent event;
            event.sampleOffset = sampleOffset;

            const int noteId = (msg.getChannel() << 8) | msg.getNoteNumber();

            if (msg.isNoteOn()) {
                event.type = InputEventType::NoteOn;
                event.data.noteOn.noteId = noteId;
                event.data.noteOn.pitch = static_cast<float>(msg.getNoteNumber());
                event.data.noteOn.velocity = msg.getFloatVelocity();
                output.addEvent(event);
            }
            else if (msg.isNoteOff()) {
                event.type = InputEventType::NoteOff;
                event.data.noteOff.noteId = noteId;
                event.data.noteOff.releaseVelocity = msg.getFloatVelocity();
                output.addEvent(event);
            }
            else if (msg.isPitchWheel()) {
                event.type = InputEventType::ChannelExpression;
                event.data.channel.source = ModSource::PitchBend;
                event.data.channel.value = (static_cast<float>(msg.getPitchWheelValue()) - 8192.0f) / 8192.0f;
                output.addEvent(event);
            }
            else if (msg.isAftertouch()) {
                event.type = InputEventType::PerNoteExpression;
                event.data.perNote.noteId = noteId;
                event.data.perNote.source = ModSource::NotePressure;
                event.data.perNote.value = static_cast<float>(msg.getAfterTouchValue()) / 127.0f;
                output.addEvent(event);
            }
            else if (msg.isChannelPressure()) {
                event.type = InputEventType::ChannelExpression;
                event.data.channel.source = ModSource::ChannelPressure;
                event.data.channel.value = static_cast<float>(msg.getChannelPressureValue()) / 127.0f;
                output.addEvent(event);
            }
            else if (msg.isController()) {
                ModSource source = mapCCtoSource(msg.getControllerNumber());
                if (source != ModSource::Count) {
                    event.type = InputEventType::ChannelExpression;
                    event.data.channel.source = source;
                    event.data.channel.value = static_cast<float>(msg.getControllerValue()) / 127.0f;
                    output.addEvent(event);
                }
            }
        }
    }

    ModSource Midi1InputAdapter::mapCCtoSource(int ccNumber) const {
        auto& registry = Omega::Core::ParameterMetadataRegistry::getInstance();
        std::string paramId = registry.getParamIdFromCC(ccNumber);
        
        if (!paramId.empty()) {
            const auto* desc = registry.getParameter(paramId);
            if (desc && desc->modSource != ModSource::Count) {
                return desc->modSource;
            }
        }

        switch (ccNumber) {
            case 1:  return ModSource::ModWheel;
            case 2:  return ModSource::Breath;
            case 11: return ModSource::Expression;
            case 64: return ModSource::Sustain;
            case 12: return ModSource::PE1;
            case 13: return ModSource::PE2;
            case 14: return ModSource::PE3;
            case 15: return ModSource::PE4;
            case 17: return ModSource::PE5;
            case 16: return ModSource::Ribbon;
            default: return ModSource::Count;
        }
    }

} // namespace Omega::Core::Input
