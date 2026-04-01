#pragma once

#include <cstdint>
#include <array>
#include "CompiledVoicePlan.h"
#include "../../DSP/Modulation/AceUnitAdsr.h"

namespace Omega {
namespace Core {
namespace Voice {

    /**
     * @brief Internal DSP state for a single unit (union to save space).
     */
    struct UnitRuntimeState {
        // Generic buffers for various DSP implementations
        union {
            struct { float phase; float increment; } osc;
            struct { float z1, z2; float k, g; } filter;
            Omega::DSP::Modulation::AdsrState adsr; // Type-safe modular ADSR
            struct { float l, r; } bus;
        } data;
        
        bool active = false;
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
        
        // DSP State
        std::array<UnitRuntimeState, CompiledVoicePlan::kMaxUnits> units;
        
        // Modular Buses (Batch 2: 16 float accumulation slots)
        float buses[16] = { 0.0f };

        // Modulation Signal Space (Case 401: ADSR, LFO outputs)
        float modSignals[64] = { 0.0f };
        
        // Link to shared hardware/plan
        const CompiledVoicePlan* plan = nullptr;
        
        // ADSR / LFO explicit states (Tanda 9)
        struct {
            float value = 0.0f;
            Omega::DSP::Modulation::AdsrParams params;
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
