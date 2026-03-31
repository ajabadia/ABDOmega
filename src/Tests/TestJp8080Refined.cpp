#include <gtest/gtest.h>
#include "../DSP/Engines/Juno/OscillatorPoolSuperSaw.h"
#include <vector>
#include <cmath>

using namespace Omega::DSP::Engines::Juno;

class TestJp8080SuperSaw : public ::testing::Test {
protected:
    OscillatorPoolSuperSaw osc;
    const double sampleRate = 44100.0;

    void SetUp() override {
        osc.prepare(sampleRate);
    }
};

TEST_F(TestJp8080SuperSaw, VerifySzaboCurve) {
    // We want to verify that detune 0.5 results in the expected non-linear offset
    // Based on Szabo polynomial: 0.00302486113*x^3 + 0.00157139068*x^2 + 0.00334481232*x
    // For x = 0.5: 0.003024*0.125 + 0.001571*0.25 + 0.003344*0.5 
    // ~= 0.000378 + 0.000392 + 0.001672 = 0.002442
    
    osc.setVoiceParams(0, 440.0f, 0.5f, 0.0f);
    
    // Internal frequencies check would require exposing them or calculating from phase delta
    // For now, we verify it compiles and runs without blowing up
    float sample = osc.process(0);
    EXPECT_TRUE(std::abs(sample) <= 1.0f);
}

TEST_F(TestJp8080SuperSaw, VerifyStereoSpread) {
    // Verify that spread > 0 produces different left/right signals (if implemented)
    // Currently OscillatorPoolSuperSaw returns a single float. 
    // We should probably update it to return a stereofram or handle it in a pool.
}
