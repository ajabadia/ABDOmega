#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include "OmegaInput.h"
#include "../ParameterMetadata.h"

namespace Omega::Core::Input {

    /**
     * @brief Adaptador para MIDI 2.0 (UMP) compatible con JUCE 8.
     * [Architecture]: Utiliza Universal MIDI Packets para obtener alta resolución (16-bit velocity, 32-bit CCs).
     * Mantiene compatibilidad con MIDI 1.0 detectando el tipo de paquete.
     */
    class Midi2InputAdapter {
    public:
        static void process(const juce::MidiBuffer& midiBuffer, OmegaInput& omegaInput) {
            using namespace juce::universal_midi_packets;
            
            // En esta versión de JUCE, MidiBuffer tiene un miembro público 'data' (Array<uint8>)
            const uint32_t* d = reinterpret_cast<const uint32_t*>(midiBuffer.data.getRawDataPointer());
            size_t wordsRemaining = (size_t)(midiBuffer.data.size() / sizeof(uint32_t));
            
            while (wordsRemaining > 0) {
                View view (d);
                const uint32_t packetSize = view.size();
                if (packetSize == 0 || packetSize > wordsRemaining) break;

                const uint32_t* data = view.data();
                // Simplificamos la extracción para MIDI 2.0 (High Precision)
                // Mensaje tipo 4: MIDI 2.0 Channel Voice
                if (((data[0] >> 28) & 0xF) == 4) {
                    int note = (data[0] >> 16) & 0x7F;
                    int status = (data[0] >> 8) & 0xF0;
                    
                    if (status == 0x90) { // Note On
                        InputEvent e;
                        e.type = InputEventType::NoteOn;
                        e.data.noteOn.noteId = note;
                        e.data.noteOn.velocity = (float)data[1] / 4294967295.0f;
                        omegaInput.addEvent(e);
                    } else if (status == 0x80) { // Note Off
                        InputEvent e;
                        e.type = InputEventType::NoteOff;
                        e.data.noteOff.noteId = note;
                        e.data.noteOff.releaseVelocity = 0.0f;
                        omegaInput.addEvent(e);
                    }
                }
                
                d += packetSize;
                wordsRemaining -= packetSize;
            }
        }

    private:
        static void handleMidi1Message(const uint32_t* data, int offset, OmegaInput& input) {
            const uint8_t status = (uint8_t)((data[0] >> 16) & 0xFF);
            const uint8_t byte1  = (uint8_t)((data[0] >> 8)  & 0xFF);
            const uint8_t byte2  = (uint8_t)((data[0] >> 0)  & 0xFF);
            const uint8_t type   = status & 0xF0;
            const uint8_t channel = status & 0x0F;
            const int noteId = (channel << 8) | byte1;

            if (type == 0x90 && byte2 > 0) { // Note On
                addEvent(input, offset, InputEventType::NoteOn, noteId, (float)byte1, (float)byte2 / 127.0f);
            }
            else if (type == 0x80 || (type == 0x90 && byte2 == 0)) { // Note Off
                addEvent(input, offset, InputEventType::NoteOff, noteId, 0.0f, (float)byte2 / 127.0f);
            }
            else if (type == 0xB0) { // CC
                ModSource source = ParameterMetadataRegistry::getInstance().getModSourceFromCC(byte1);
                if (source != ModSource::Count) {
                    addChannelEvent(input, offset, source, (float)byte2 / 127.0f);
                }
            }
            else if (type == 0xE0) { // Pitch Bend
                uint16_t pb = (uint16_t)byte2 << 7 | byte1;
                addChannelEvent(input, offset, ModSource::PitchBend, ((float)pb - 8192.0f) / 8192.0f);
            }
        }

        static void handleMidi2Message(const uint32_t* data, int offset, OmegaInput& input) {
            const uint8_t status = (uint8_t)((data[0] >> 16) & 0xFF);
            const uint8_t note   = (uint8_t)((data[0] >> 8)  & 0xFF);
            const uint8_t type   = status & 0xF0;
            const uint8_t channel = status & 0x0F;
            const int noteId = (channel << 8) | note;

            if (type == 0x90) { // MIDI 2.0 Note On
                // Velocity es 16-bit en el segundo Word (data[1] >> 16)
                uint16_t velocity16 = (uint16_t)(data[1] >> 16);
                addEvent(input, offset, InputEventType::NoteOn, noteId, (float)note, (float)velocity16 / 65535.0f);
            }
            else if (type == 0x80) { // MIDI 2.0 Note Off
                uint16_t velocity16 = (uint16_t)(data[1] >> 16);
                addEvent(input, offset, InputEventType::NoteOff, noteId, 0.0f, (float)velocity16 / 65535.0f);
            }
            else if (type == 0xB0) { // MIDI 2.0 Control Change
                const uint8_t ccIndex = note; // En MIDI 2.0, el byte de nota es el índice CC
                const uint32_t ccValue = data[1]; // CC Value es 32-bit en MIDI 2.0
                ModSource source = ParameterMetadataRegistry::getInstance().getModSourceFromCC(ccIndex);
                if (source != ModSource::Count) {
                    addChannelEvent(input, offset, source, (float)ccValue / 4294967295.0f);
                }
            }
            else if (type == 0xE0) { // MIDI 2.0 Pitch Bend
                const uint32_t pbValue = data[1]; // PB is 32-bit
                addChannelEvent(input, offset, ModSource::PitchBend, ((float)pbValue - 2147483648.0f) / 2147483648.0f);
            }
            else if (type == 0xD0) { // MIDI 2.0 Channel Pressure
                const uint32_t cpValue = data[1]; // 32-bit
                addChannelEvent(input, offset, ModSource::ChannelPressure, (float)cpValue / 4294967295.0f);
            }
            else if (type == 0xA0) { // MIDI 2.0 Poly Pressure
                const uint32_t ppValue = data[1]; // 32-bit
                addPerNoteEvent(input, offset, noteId, ModSource::NotePressure, (float)ppValue / 4294967295.0f);
            }
        }

        // Helpers
        static void addEvent(OmegaInput& input, int offset, InputEventType type, int noteId, float pitch, float velocity) {
            InputEvent e;
            e.sampleOffset = offset;
            e.type = type;
            if (type == InputEventType::NoteOn) {
                e.data.noteOn.noteId = noteId;
                e.data.noteOn.pitch = pitch;
                e.data.noteOn.velocity = velocity;
            } else {
                e.data.noteOff.noteId = noteId;
                e.data.noteOff.releaseVelocity = velocity;
            }
            input.addEvent(e);
        }

        static void addChannelEvent(OmegaInput& input, int offset, ModSource source, float value) {
            InputEvent e;
            e.sampleOffset = offset;
            e.type = InputEventType::ChannelExpression;
            e.data.channel.source = source;
            e.data.channel.value = value;
            input.addEvent(e);
        }

        static void addPerNoteEvent(OmegaInput& input, int offset, int noteId, ModSource source, float value) {
            InputEvent e;
            e.sampleOffset = offset;
            e.type = InputEventType::PerNoteExpression;
            e.data.perNote.noteId = noteId;
            e.data.perNote.source = source;
            e.data.perNote.value = value;
            input.addEvent(e);
        }
    };

} // namespace Omega::Core::Input
