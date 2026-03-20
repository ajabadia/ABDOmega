#pragma once

#include <juce_audio_basics/juce_audio_basics.h>

#include "../Core/Input/OmegaInput.h"
#include "../Core/Input/ModSource.h"

namespace Omega::Core::Input {

    /**
     * @brief Adaptador para convertir MIDI 1.0 (JUCE) a la capa neutra de OMEGA.
     */
    class Midi1InputAdapter {
    public:
        Midi1InputAdapter();
        
        /**
         * @brief Procesa el buffer MIDI de JUCE y rellena el contenedor OmegaInput.
         */
        void process(const juce::MidiBuffer& midiMessages, OmegaInput& output);

    private:
        // Helper para convertir CC a ModSource (mapeo por defecto)
        ModSource mapCCtoSource(int ccNumber) const;
    };

} // namespace Omega::Core::Input
