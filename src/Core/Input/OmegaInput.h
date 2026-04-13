#pragma once

#include <array>
#include <cstdint>
#include <iterator>
#include "ModSource.h"

namespace Omega {
namespace Core {
namespace Input {

    /**
     * @brief Capacidad máxima de eventos por bloque de audio.
     * 256 eventos es suficiente para la mayoría de ráfagas MPE/CC.
     */
    static constexpr size_t KMaxEventsPerBlock = 256;

    /**
     * @brief Tipos de eventos de entrada neutros.
     */
    enum class InputEventType : uint8_t {
        NoteOn,
        NoteOff,
        PerNoteExpression,
        ChannelExpression,
        RawMidi
    };

    /**
     * @brief Representa un evento de entrada procesado y normalizado.
     */
    struct InputEvent {
        int sampleOffset = 0;
        InputEventType type = InputEventType::NoteOn;
        int channel = 0; // 0-based channel index
        
        union Data {
            struct {
                int noteId;
                float pitch;
                float velocity;
            } noteOn;
            
            struct {
                int noteId;
                float releaseVelocity;
            } noteOff;
            
            struct {
                int noteId;
                ModSource source;
                float value;
            } perNote;
            
            struct {
                ModSource source;
                float value;
            } channel;

            struct {
                uint8_t status;
                uint8_t d1;
                uint8_t d2;
            } rawMidi;
        } data;

        InputEvent() { std::memset(&data, 0, sizeof(data)); }
    };

    /**
     * @brief Buffer de eventos de entrada de TIEMPO REAL (Lock-free, No-alloc).
     * [Performance]: Usa un array estático para evitar fragmentación en el audio thread.
     */
    class OmegaInput {
    public:
        OmegaInput() = default;

        /**
         * @brief Añade un evento al buffer. 
         * @return true si se añadió, false si el buffer está lleno.
         */
        bool addEvent(const InputEvent& e) noexcept {
            if (mCount < KMaxEventsPerBlock) {
                mEvents[mCount++] = e;
                return true;
            }
            return false;
        }

        const InputEvent* begin() const noexcept { return mEvents.data(); }
        const InputEvent* end() const noexcept { return mEvents.data() + mCount; }

        size_t size() const noexcept { return mCount; }
        bool isEmpty() const noexcept { return mCount == 0; }

        void clear() noexcept {
            mCount = 0;
        }

        const InputEvent& operator[](size_t index) const {
            return mEvents[index];
        }

    private:
        std::array<InputEvent, KMaxEventsPerBlock> mEvents;
        size_t mCount = 0;
    };

} // namespace Input
} // namespace Core
} // namespace Omega
