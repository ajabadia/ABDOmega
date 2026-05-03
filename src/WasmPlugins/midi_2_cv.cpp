/**
 * OMEGA WASM SDK - Pro MIDI to CV Converter
 * Era 7.2.3 Industrial C++ Implementation (Zero-Dep)
 * Gold Standard Compliance - ZERO NOISE Audit
 */

#include "../Core/Ace/OmegaContract.h"
#include "../Core/Ace/OmegaConstants.h"

using namespace Omega::Constants;

// --- OMEGA Self-Describing Contract ---
BEGIN_OMEGA_PARAMETERS("midi_2_cv", "Pro MIDI-CV (Industrial)")
    OMEGA_FAMILY("control")
    OMEGA_PARAM(midi_channel, "MIDI Channel", 0, 16, 0, "Ch")
    OMEGA_PARAM(glide_mode,   "Glide Mode",   0, 1, 0, "bin")
    OMEGA_PARAM(glide_time,   "Glide Time",   0, 2000, 0, "ms")
    OMEGA_PARAM(bend_range,   "Pitch Bend",   0, 24, 2, "st")
    OMEGA_PARAM(at_mode,      "AT Mode",      0, 1, 0, "bin")
    BEGIN_OMEGA_PORTS
        OMEGA_PORT(cv_out,   "CV Out",    output, cv)
        OMEGA_PORT(gate_out, "Gate Out",  output, gate)
        OMEGA_PORT(vel_out,  "Velocity",  output, cv)
        OMEGA_PORT(at_out,   "Aftertouch", output, cv)
END_OMEGA_PARAMETERS

// --- Host Imports ---
#define WASM_IMPORT(name) __attribute__((import_module("env"), import_name(#name)))

extern "C" {
    WASM_IMPORT(omega_publish_telemetry) void omega_publish_telemetry(float value);
    WASM_IMPORT(omega_set_voice_freq)     void omega_set_voice_freq(float frequency);
    WASM_IMPORT(omega_set_voice_gate)     void omega_set_voice_gate(float gateSignal);
    WASM_IMPORT(omega_set_voice_vel)      void omega_set_voice_vel(float velocity);
    WASM_IMPORT(omega_set_voice_at)       void omega_set_voice_at(float pressure);
}

// --- Module Logic ---
class MidiCvConverter {
public:
    MidiCvConverter() = default;

    void init(float sampleRate) {
        mSampleRate = sampleRate;
    }

    void onParam(int paramId, float value) { // NOLINT(bugprone-easily-swappable-parameters)
        switch(paramId) {
            case 0:  mChannel = static_cast<int>(value); break;
            case 1:  mGlideMode = static_cast<int>(value); break;
            case 2:  mGlideTimeMs = value; break;
            case 3:  mBendRange = static_cast<int>(value); break;
            case 4:  mAtMode = static_cast<int>(value); break;
            default: break;
        }
    }

    void onMidi(uint8_t status, uint8_t data1, uint8_t data2) { // NOLINT(bugprone-easily-swappable-parameters)
        const uint8_t channel = (status & MIDI_CHANNEL_MASK) + 1;
        const uint8_t type = status & MIDI_STATUS_MASK;

        if (mChannel != 0 && mChannel != channel) {
            return;
        }

        omega_publish_telemetry(TELEMETRY_FULL_SIGNAL);

        if (type == MIDI_NOTE_ON && data2 > 0) {
            mBaseFreq = midiToHz(data1);
            mTargetFreq = mBaseFreq * mBendOffset;

            if (mGlideTimeMs <= GLIDE_MIN_THRESHOLD) {
                mCurrentFreq = mTargetFreq;
                omega_set_voice_freq(mCurrentFreq);
            } else {
                const float delta = mTargetFreq - mCurrentFreq;
                const float samples = (mGlideTimeMs / MS_TO_S_FACTOR) * mSampleRate;
                mGlideStep = delta / (samples > 0.0F ? samples : 1.0F);
            }

            omega_set_voice_vel(static_cast<float>(data2) * MIDI_NORM_FACTOR);
            omega_set_voice_gate(TELEMETRY_FULL_SIGNAL);
        }
        else if (type == MIDI_NOTE_OFF || (type == MIDI_NOTE_ON && data2 == 0)) {
            omega_set_voice_gate(0.0F);
        }
        else if (type == MIDI_PITCH_BEND) {
            const auto bend = static_cast<uint16_t>((data2 << 7) | data1);
            const float normalized = static_cast<float>(static_cast<int>(bend) - MIDI_BEND_CENTER) * MIDI_BEND_NORM_FACTOR;
            
            // Bend range is in semitones.
            constexpr float PITCH_BEND_SENSITIVITY = 0.7F;
            mBendOffset = 1.0F + (normalized * (static_cast<float>(mBendRange) / static_cast<float>(SEMITONES_PER_OCTAVE)) * PITCH_BEND_SENSITIVITY);
            mTargetFreq = mBaseFreq * mBendOffset;
            
            if (mGlideTimeMs <= GLIDE_MIN_THRESHOLD) {
                mCurrentFreq = mTargetFreq;
                omega_set_voice_freq(mCurrentFreq);
            }
        }
    }

    void process(const float* buffer, int length) {
        if (mCurrentFreq != mTargetFreq) {
            for (int i = 0; i < length; i++) {
                mCurrentFreq += mGlideStep;
                if ((mGlideStep > 0.0F && mCurrentFreq > mTargetFreq) || 
                    (mGlideStep < 0.0F && mCurrentFreq < mTargetFreq)) {
                    mCurrentFreq = mTargetFreq;
                }
            }
            omega_set_voice_freq(mCurrentFreq);
        }
        (void)buffer;
    }

private:
    static float midiToHz(int note) {
        int clampedNote = note;
        if (clampedNote < 0) { clampedNote = 0; }
        if (clampedNote > static_cast<int>(MIDI_MAX_VALUE)) { clampedNote = static_cast<int>(MIDI_MAX_VALUE); }
        
        static const float SEMITONE_TABLE[SEMITONES_PER_OCTAVE] = {
            8.1757989156F, 8.6619572180F, 9.1770239974F, 9.7227182413F,
            10.3008611535F, 10.9133822323F, 11.5623257097F, 12.2498573744F,
            12.9782717994F, 13.7500000000F, 14.5676175474F, 15.4338531643F
        };
        
        const int octave = clampedNote / SEMITONES_PER_OCTAVE;
        const int semi = clampedNote % SEMITONES_PER_OCTAVE;
        float frequency = SEMITONE_TABLE[semi];
        
        for (int i = 0; i < octave; i++) {
            frequency *= 2.0F; // Octave doubling
        }
        return frequency;
    }

    float mSampleRate = DEFAULT_SAMPLE_RATE;
    float mCurrentFreq = CONCERT_A_FREQ;
    float mTargetFreq = CONCERT_A_FREQ;
    float mBaseFreq = CONCERT_A_FREQ;
    float mBendOffset = 1.0F;
    float mGlideStep = 0.0F;
    
    int mChannel = 0;
    int mGlideMode = 0;
    float mGlideTimeMs = 0.0F;
    int mBendRange = 2;
    int mAtMode = 0;
};

// --- C-Linkage Exports ---
static MidiCvConverter g_converter;

extern "C" {
    EMSCRIPTEN_KEEPALIVE void omega_init(float sampleRate) { g_converter.init(sampleRate); }
    EMSCRIPTEN_KEEPALIVE void omega_on_param(int paramId, float value) { g_converter.onParam(paramId, value); } // NOLINT(bugprone-easily-swappable-parameters)
    EMSCRIPTEN_KEEPALIVE void omega_on_midi(uint8_t status, uint8_t data1, uint8_t data2) { g_converter.onMidi(status, data1, data2); } // NOLINT(bugprone-easily-swappable-parameters)
    EMSCRIPTEN_KEEPALIVE void omega_process(const float* buffer, int length) { g_converter.process(buffer, length); }
}
