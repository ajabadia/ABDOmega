#include <juce_audio_basics/juce_audio_basics.h>
#include "../Core/Input/Midi2InputAdapter.h"
#include "../Core/Input/OmegaInput.h"
#include <iostream>
#include <cassert>

/**
 * @brief Test de integración para MIDI 2.0 (UMP).
 * Simula paquetes UMP y verifica la traducción a OmegaInput.
 */
void testMidi2Conversion() {
    using namespace Omega::Core::Input;
    
    OmegaInput input;
    juce::MidiBuffer buffer;
    
    // 1. Simular MIDI 2.0 Note On (UMP Type 4)
    // Word 0: [MT:4][Group:0][Status:0x90][Note:60] -> 0x40903C00
    // Word 1: [Velocity: 0x8000 (0.5)] -> 0x80000000
    uint32_t noteOnUmp[2] = { 0x40903C00, 0x80000000 };
    buffer.addEvent(noteOnUmp, sizeof(noteOnUmp), 0);
    
    // 2. Simular MIDI 2.0 CC (UMP Type 4)
    // CC 74 (Cutoff), Value 0xFFFFFFFF (1.0)
    // Word 0: [MT:4][Group:0][Status:0xB0][Index:74] -> 0x40B04A00
    // Word 1: [Value: 0xFFFFFFFF] -> 0xFFFFFFFF
    uint32_t ccUmp[2] = { 0x40B04A00, 0xFFFFFFFF };
    buffer.addEvent(ccUmp, sizeof(ccUmp), 10);
    
    // Procesar
    Midi2InputAdapter::process(buffer, input);
    
    const auto& events = input.getEvents();
    assert(events.size() == 2);
    
    // Verificar Note On
    const auto& e1 = events[0];
    assert(e1.type == InputEventType::NoteOn);
    assert(e1.data.noteOn.pitch == 60.0f);
    // 0x8000 / 0xFFFF ~= 0.5
    assert(std::abs(e1.data.noteOn.velocity - 0.5f) < 0.001f);
    
    // Verificar CC
    const auto& e2 = events[1];
    assert(e2.type == InputEventType::ChannelExpression);
    assert(e2.data.channel.value == 1.0f); // 0xFFFFFFFF / max
    
    std::cout << "SUCCESS: MIDI 2.0 (UMP) conversion verified." << std::endl;
}

int main() {
    testMidi2Conversion();
    return 0;
}
