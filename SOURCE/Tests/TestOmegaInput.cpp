#include <catch2/catch_test_macros.hpp>
#include <catch2/catch_approx.hpp>
#include <juce_audio_basics/juce_audio_basics.h>
#include "Core/Input/OmegaInput.h"
#include "Midi1InputAdapter.h"

using namespace Omega::Core::Input;

TEST_CASE("OmegaInput: Event Queue Management", "[Core][Input]") {
    OmegaInput input;
    
    SECTION("Clear and Add") {
        input.clear();
        REQUIRE(input.getEvents().empty());
        
        InputEvent e;
        e.type = InputEventType::NoteOn;
        e.sampleOffset = 10;
        input.addEvent(e);
        
        REQUIRE(input.getEvents().size() == 1);
        REQUIRE(input.getEvents()[0].sampleOffset == 10);
    }
}

TEST_CASE("Midi1InputAdapter: Translation Logic", "[Core][Input]") {
    Midi1InputAdapter adapter;
    OmegaInput output;
    juce::MidiBuffer buffer;
    
    SECTION("Note On Translation") {
        buffer.addEvent(juce::MidiMessage::noteOn(1, 60, 0.5f), 100);
        adapter.process(buffer, output);
        
        const auto& events = output.getEvents();
        REQUIRE(events.size() == 1);
        REQUIRE(events[0].type == InputEventType::NoteOn);
        REQUIRE(events[0].sampleOffset == 100);
        REQUIRE(events[0].data.noteOn.pitch == 60.0f);
        REQUIRE(events[0].data.noteOn.velocity == Catch::Approx(0.5f).margin(0.01));
    }
    
    SECTION("Pitch Bend Translation") {
        output.clear();
        buffer.clear();
        // Pitch bend a la mitad (8192 es centro, 12288 es +0.5)
        buffer.addEvent(juce::MidiMessage::pitchWheel(1, 12288), 50);
        adapter.process(buffer, output);
        
        const auto& events = output.getEvents();
        REQUIRE(events.size() == 1);
        REQUIRE(events[0].type == InputEventType::ChannelExpression);
        REQUIRE(events[0].data.channel.source == ModSource::PitchBend);
        REQUIRE(events[0].data.channel.value == Catch::Approx(0.5f));
    }

    SECTION("CC Mapping") {
        output.clear();
        buffer.clear();
        buffer.addEvent(juce::MidiMessage::controllerEvent(1, 1, 127), 0); // Mod Wheel
        adapter.process(buffer, output);
        
        const auto& events = output.getEvents();
        REQUIRE(events.size() == 1);
        REQUIRE(events[0].data.channel.source == ModSource::ModWheel);
        REQUIRE(events[0].data.channel.value == 1.0f);
    }
}
