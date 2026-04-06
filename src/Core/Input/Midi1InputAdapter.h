#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include "OmegaInput.h"
#include "../ParameterMetadata.h"

namespace Omega {
namespace Core {
namespace Input {

    /**
     * @brief Adaptador para convertir MidiBuffer de JUCE (MIDI 1.0) al formato interno de OMEGA.
     * [Nota]: Implementación consolidada y optimizada para tiempo real.
     */
    class Midi1InputAdapter {
    public:
        static void process(const juce::MidiBuffer& midiBuffer, OmegaInput& omegaInput) {
            omegaInput.clear();

            for (const auto metadata : midiBuffer) {
                const auto msg = metadata.getMessage();
                const int sampleOffset = metadata.samplePosition;
                const int channel = msg.getChannel();
                const int noteId = (channel << 8) | msg.getNoteNumber();

                if (msg.isNoteOn()) {
                    InputEvent e;
                    e.sampleOffset = sampleOffset;
                    e.channel = channel;
                    e.type = InputEventType::NoteOn;
                    e.data.noteOn.noteId = noteId;
                    e.data.noteOn.pitch = (float)msg.getNoteNumber();
                    e.data.noteOn.velocity = msg.getFloatVelocity();
                    omegaInput.addEvent(e);
                }
                else if (msg.isNoteOff()) {
                    InputEvent e;
                    e.sampleOffset = sampleOffset;
                    e.channel = channel;
                    e.type = InputEventType::NoteOff;
                    e.data.noteOff.noteId = noteId;
                    e.data.noteOff.releaseVelocity = msg.getFloatVelocity();
                    omegaInput.addEvent(e);
                }
                else if (msg.isPitchWheel()) {
                    InputEvent e;
                    e.sampleOffset = sampleOffset;
                    e.channel = channel;
                    e.type = InputEventType::ChannelExpression;
                    e.data.channel.source = ModSource::PitchBend;
                    e.data.channel.value = ((float)msg.getPitchWheelValue() - 8192.0f) / 8192.0f;
                    omegaInput.addEvent(e);
                }
                else if (msg.isAftertouch()) {
                    InputEvent e;
                    e.sampleOffset = sampleOffset;
                    e.channel = channel;
                    e.type = InputEventType::PerNoteExpression;
                    e.data.perNote.noteId = noteId;
                    e.data.perNote.source = ModSource::NotePressure;
                    e.data.perNote.value = (float)msg.getAfterTouchValue() / 127.0f;
                    omegaInput.addEvent(e);
                }
                else if (msg.isChannelPressure()) {
                    InputEvent e;
                    e.sampleOffset = sampleOffset;
                    e.channel = channel;
                    e.type = InputEventType::ChannelExpression;
                    e.data.channel.source = ModSource::ChannelPressure;
                    e.data.channel.value = (float)msg.getChannelPressureValue() / 127.0f;
                    omegaInput.addEvent(e);
                }
                else if (msg.isController()) {
                    ModSource source = mapCCtoSource(msg.getControllerNumber());
                    if (source != ModSource::Count) {
                        InputEvent e;
                        e.sampleOffset = sampleOffset;
                        e.channel = channel;
                        e.type = InputEventType::ChannelExpression;
                        e.data.channel.source = source;
                        e.data.channel.value = (float)msg.getControllerValue() / 127.0f;
                        omegaInput.addEvent(e);
                    }
                }
            }
        }

    private:
        static ModSource mapCCtoSource(int ccNumber) {
            auto& registry = Omega::Core::ParameterMetadataRegistry::getInstance();
            ModSource source = registry.getModSourceFromCC(ccNumber);
            
            if (source != ModSource::Count) return source;

            // Minimal hardcoded fallback for safety (if registry is empty)
            switch (ccNumber) {
                case 1:  return ModSource::ModWheel;
                case 2:  return ModSource::Breath;
                case 64: return ModSource::Sustain;
                default: return ModSource::Count;
            }
        }
    };

} // namespace Input
} // namespace Core
} // namespace Omega
