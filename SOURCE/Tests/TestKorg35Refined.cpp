#include <catch2/catch_test_macros.hpp>
#include <catch2/catch_approx.hpp>
#include "../DSP/Engines/Korg/FilterPoolKorg35.h"

using namespace Omega::DSP::Engines::Korg;

TEST_CASE("FilterPoolKorg35: Refined Model", "[dsp][filter][korg]")
{
    FilterPoolKorg35 filter;
    filter.prepare(44100.0);

    SECTION("Independent LP/HP Cutoff")
    {
        // LP at 1000Hz, HP at 200Hz
        filter.setVoiceParams(0, 1000.0f, 0.0f, 200.0f, 0.0f, 1.0f);
        
        float pulse[100];
        pulse[0] = 1.0f;
        for(int i=1; i<100; ++i) pulse[i] = 0.0f;

        float output[100];
        for(int i=0; i<100; ++i) output[i] = filter.process(0, pulse[i]);

        // Check that there is output (pulse passed through filters)
        REQUIRE(std::abs(output[0]) > 0.0f);
        
        // Changing LPF cutoff should change impulse response
        filter.setVoiceParams(0, 5000.0f, 0.0f, 200.0f, 0.0f, 1.0f);
        float output2 = filter.process(0, 1.0f);
        REQUIRE(output2 != Catch::Approx(output[0]));
    }

    SECTION("Saturation (Grit)")
    {
        // Small signal (no grit)
        filter.setVoiceParams(0, 1000.0f, 0.0f, 20.0f, 0.0f, 1.0f);
        float outSmall = filter.process(0, 0.1f);

        // Large signal + Grit
        filter.setVoiceParams(0, 1000.0f, 0.0f, 20.0f, 0.0f, 5.0f);
        float outLarge = filter.process(0, 0.8f);

        // Saturation should limit the gain non-linearly
        // Since we scale input by drive (5.0), 0.8 * 5.0 = 4.0.
        // clean_tanh(4.0) = 4.0 / 5.0 = 0.8 (approximately)
        // Without saturation it would be much larger.
        REQUIRE(std::abs(outLarge) < 5.0f * 0.8f);
    }

    SECTION("Resonance Stability")
    {
        // High resonance test
        filter.setVoiceParams(0, 1000.0f, 1.8f, 20.0f, 0.0f, 1.0f);
        
        float out = 0.0f;
        for(int i=0; i<100; ++i) out = filter.process(0, 1.0f);
        
        // Should not explode (std::nan or inf)
        REQUIRE(std::isfinite(out));
    }
}
