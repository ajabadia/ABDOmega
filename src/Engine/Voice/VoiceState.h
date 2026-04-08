#pragma once

#include <cstdint>
#include <array>
#include "../../Core/Voice/CompiledVoicePlan.h"
#include "../../DSP/Core/Modulation/EnvelopeMultiStage.h"

namespace Omega {
namespace Core {
namespace Service { struct VoiceConfig; }
namespace Voice {

    /**
     * @brief Internal DSP state for a single unit.
     */
    struct UnitRuntimeState {
        UnitRuntimeState() : active(false), type(None) {}

        // Generic state for various DSP implementations
        enum Type { None, Osc, Filter, Envelope, Bus };
        Type type = None;
        bool active = false;

        struct OscState { float phase = 0.0f; float increment = 0.0f; };
        struct FilterState { float z1 = 0.0f, z2 = 0.0f; float k = 0.0f, g = 0.0f; };
        struct BusState { float l = 0.0f, r = 0.0f; };

        OscState osc;
        FilterState filter;
        Omega::DSP::Core::Modulation::EnvelopeMultiStage::VoiceState env;
        BusState bus;
    };

    /**
     * @brief Signal buffers for a single voice (Audio and Modulation).
     */
    struct VoiceBuses {
        static constexpr int kMaxAudioBuses = 4;
        static constexpr int kMaxModBuses = 8;
        
        float audio[kMaxAudioBuses] = { 0.0f };
        float mod[kMaxModBuses] = { 0.0f };
    };

    /**
     * @brief Live state of a single synthesis voice.
     */
    struct VoiceState {
        bool isActive = false;     // Renamed to match Engine expectations
        bool releasing = false;
        
        int noteId = -1;
        float frequencyHz = 440.0f;
        float velocity = 0.0f;
        float ampEnvelope = 0.0f;  // Unified amp envelope value for dispatcher
        bool triggerRequested = false; // Phase/Envelope reset trigger
        
        // DSP State
        std::array<UnitRuntimeState, CompiledVoicePlan::kMaxUnits> units;
        
        // Modular Buses (Batch 2: 16 float accumulation slots)
        float buses[16] = { 0.0f };

        // Modular MIDI Bus (VA 2.1.W WASM Bridge)
        // [Byte0: Status, Byte1: Data1, Byte2: Data2, Byte3: Meta/Channel]
        uint8_t modularMidi[4] = { 0, 0, 0, 0 };

        // Modulation Signal Space (Case 401: ADSR, LFO outputs)
        float modSignals[64] = { 0.0f };
        
        // Link to shared hardware/plan/config
        const CompiledVoicePlan* plan = nullptr;
        const Service::VoiceConfig* activeConfig = nullptr;
        
        // ADSR / LFO explicit states (Tanda 9)
        struct {
            float value = 0.0f;
            int stage = 0; // 0=Idle, 1=A, 2=D, 3=S, 4=R
        } ampEnv;
        
        struct {
            float phase = 0.0f;
            float value = 0.0f;
        } lfo1;
        
        /**
         * @brief Resets the voice state for a new note.
         */
        void reset() noexcept {
            isActive = false;
            releasing = false;
            noteId = -1;
            ampEnvelope = 0.0f;
            for (auto& u : units) { u.active = false; }
            for (auto& b : buses) { b = 0.0f; }
            for (auto& m : modSignals) { m = 0.0f; }
        }
    };

} // namespace Voice
} // namespace Core
} // namespace Omega
