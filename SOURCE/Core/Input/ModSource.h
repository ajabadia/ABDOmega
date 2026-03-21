#pragma once

#include <cstdint>

namespace Omega::Core::Input {

    /**
     * @brief Fuentes de modulación internas de OMEGA.
     * Representan la capa neutra entre el protocolo de entrada (MIDI, MPE, UI) 
     * y el motor de síntesis.
     */
    enum class ModSource : uint8_t {
        // --- Por nota (Per-note) ---
        NotePitch,          // Desviación en semitonos (microtonalidad/bend)
        NoteVelocity,       // Velocidad de ataque (0..1)
        NoteReleaseVelocity,// Velocidad de release (0..1)
        NotePressure,       // Presión por nota (Aftertouch polifónico)
        NoteTimbre,         // Timbre (MPE CC74 / MIDI 2.0 PPE)
        
        // --- Por canal/global ---
        ModWheel,           // Rueda de modulación (CC1)
        PitchBend,          // Pitch bend global (-1..+1)
        Expression,         // Pedal de expresión (CC11)
        Breath,             // Controlador de soplido (CC2)
        Sustain,            // Pedal de sustain (CC64)
        ChannelPressure,    // Aftertouch de canal
        Ribbon,             // Controlador de cinta (CC16)
        
        // --- Performance Macros ---
        Macro1, Macro2, Macro3, Macro4,
        Macro5, Macro6, Macro7, Macro8,

        // --- Prophecy Performance Editors (PE1-5) ---
        PE1, PE2, PE3, PE4, PE5,

        // --- MS-20 External Signal Processor ---
        EspPitch, EspEnvelope, EspTrigger,

        // --- Internos / Especiales ---
        RandomPerNote,      // Valor aleatorio fijado al inicio de la nota
        
        Count
    };

} // namespace Omega::Core::Input
