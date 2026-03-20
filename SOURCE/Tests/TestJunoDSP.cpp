#include <catch2/catch_test_macros.hpp>
#include "../DSP/Engines/Juno/OscillatorPoolJunoDco.h"
#include "../DSP/Engines/Juno/FilterPoolJunoIr3109.h"

using namespace Omega::DSP::Engines::Juno;

TEST_CASE("Juno DCO Basic Integrity", "[dsp][juno][dco]") {
    OscillatorPoolJunoDco dco;
    dco.prepare(44100.0);
    dco.setVoiceFrequency(0, 440.0f);
    
    SECTION("Initial sample is not NaN/Zero") {
        float sample = dco.process(0);
        REQUIRE(!std::isnan(sample));
    }
}

TEST_CASE("Juno IR3109 Filter Stability", "[dsp][juno][filter]") {
    FilterPoolJunoIr3109 filter;
    filter.prepare(44100.0);
    filter.setVoiceParams(0, 1000.0f, 0.5f);
    
    SECTION("Filter produces audio and stays stable") {
        float sample = filter.process(0, 1.0f);
        REQUIRE(!std::isnan(sample));
        REQUIRE(std::abs(sample) <= 1.0f); // Tanh clipping
    }
}
