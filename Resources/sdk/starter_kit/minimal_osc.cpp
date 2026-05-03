#include "omega_sdk.h"
#include <math.h>

// Module State
float phase = 0.0f;
float frequency = 440.0f;
float gain = 0.5f;

extern "C" {

    const char* omega_get_contract() {
        return "{"
               "  \"id\": \"minimal_osc\","
               "  \"parameters\": ["
               "    { \"id\": \"freq\", \"label\": \"Frequency\", \"role\": \"control\", \"range\": { \"min\": 20, \"max\": 20000, \"default\": 440 } },"
               "    { \"id\": \"gain\", \"label\": \"Volume\", \"role\": \"control\", \"range\": { \"min\": 0, \"max\": 1, \"default\": 0.5 } }"
               "  ],"
               "  \"ports\": ["
               "    { \"id\": \"out\", \"label\": \"Audio Out\", \"direction\": \"output\" }"
               "  ]"
               "}";
    }

    void omega_set_param(int paramId, float value) {
        // Simple mapping (usually you'd use a lookup table or hash)
        if (paramId == 0) frequency = value; // 'freq' is index 0
        if (paramId == 1) gain = value;      // 'gain' is index 1
    }

    void omega_process(float* buffer, int length) {
        float sr = omega_get_sample_rate();
        float phaseDelta = frequency / sr;

        for (int i = 0; i < length; ++i) {
            // Generate simple Sawtooth
            buffer[i] = (phase * 2.0f - 1.0f) * gain;
            
            phase += phaseDelta;
            if (phase >= 1.0f) phase -= 1.0f;
        }

        // Send peak level to UI telemetry
        omega_publish_telemetry(gain);
    }
}
