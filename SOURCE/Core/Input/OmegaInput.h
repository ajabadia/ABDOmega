#pragma once

#include <vector>
#include <cstdint>
#include "ModSource.h"

namespace Omega::Core::Input {

    /**
     * @brief Tipos de eventos de entrada neutros.
     */
    enum class InputEventType : uint8_t {
        NoteOn,
        NoteOff,
        PerNoteExpression,
        ChannelExpression
    };

    /**
     * @brief Representa un evento de entrada procesado y normalizado.
     */
    struct InputEvent {
        int sampleOffset;    // Posición dentro del bloque de audio
        InputEventType type;
        
        union Data {
            struct {
                int noteId;      // Identificador único de la nota (MPE safe)
                float pitch;     // Frecuencia base en semitonos
                float velocity;  // 0..1
            } noteOn;
            
            struct {
                int noteId;
                float releaseVelocity;
            } noteOff;
            
            struct {
                int noteId;
                ModSource source;
                float value;    // Normalmente 0..1, o semitonos para Pitch
            } perNote;
            
            struct {
                ModSource source;
                float value;
            } channel;
        } data;
    };

    /**
     * @brief Buffer de eventos de entrada para un bloque de audio.
     */
    class OmegaInput {
    public:
        void addEvent(const InputEvent& e) {
            mEvents.push_back(e);
        }

        const std::vector<InputEvent>& getEvents() const noexcept {
            return mEvents;
        }

        void clear() noexcept {
            mEvents.clear();
        }

        bool isEmpty() const noexcept {
            return mEvents.empty();
        }

    private:
        std::vector<InputEvent> mEvents;
    };

} // namespace Omega::Core::Input
