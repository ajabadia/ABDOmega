#pragma once

#include <vector>
#include <string>
#include <cmath>
#include <algorithm>
#include <array>

#include "../../Core/Voice/CompiledVoicePlan.h"
#include "VoiceState.h"
#include "../../Core/Wasm/WasmModuleService.h"
#include "../../DSP/Core/Modulation/EnvelopeMultiStage.h"
#include "../../DSP/Engines/Roland/Juno/OscillatorPoolJunoDco.h"
#include "../../DSP/Engines/Roland/Juno/FilterPoolJunoIr3109.h"
#include "../../DSP/Engines/Korg/MS20/FilterPoolKorg35.h"
#include "../../DSP/Engines/Roland/JP/OscillatorPoolJp8080.h"
#include "../../DSP/Engines/Roland/JP/FilterPoolJp8080.h"
#include "../../Core/Providers/EngineConfig.h"
#include "ParamIdRegistry.h"
#include "../Modulation/ModulationRuntime.h"

namespace Omega {
namespace Core {
namespace Voice {

    /**
     * @brief Snapshots for modular telemetry routing.
     */
    struct TelemetrySnapshot {
        float rawOsc = 0.0f;
        float rawFilter = 0.0f;
        float envLevel = 0.0f;
        float midiActivity = 0.0f;
    };

    /**
     * @brief Registry of shared DSP pools to avoid per-voice allocations.
     */
    struct DspPoolSet {
        ::Omega::DSP::Engines::Roland::Juno::OscillatorPoolJunoDco& junoOsc;
        ::Omega::DSP::Engines::Roland::Juno::FilterPoolJunoIr3109& junoFlt;
        ::Omega::DSP::Engines::Korg::MS20::FilterPoolKorg35& korgFlt;
        ::Omega::DSP::Engines::Roland::JP::OscillatorPoolJp8080& jpOsc;
        ::Omega::DSP::Engines::Roland::JP::FilterPoolJp8080& jpFlt;
    };

    /**
     * @brief Statless Modular Interpreter.
     * Executes the VoicePlan step-by-step for a single sample.
     */
    class EngineVoiceRuntime {
    public:
        /**
         * @brief Renders a single sample for a voice based on its plan.
         */
        static inline void renderSample(int voiceIdx, 
                                       const CompiledVoicePlan& plan,
                                       VoiceState& state, 
                                       float lfoVal,
                                       float& outL, float& outR,
                                       DspPoolSet& pools,
                                       TelemetrySnapshot& snapshot) noexcept {
            
            // 1. Reset Internal Buses
            for (auto& b : state.buses) b = 0.0f;
            outL = 0.0f; outR = 0.0f;

            // Pre-calculate common IDs for speed
            static const uint32_t idPitch = 0x50495443; // 'PITCH'
            static const uint32_t idCutoff = 0x4355544F; // 'CUTOFF'
            static const uint32_t idGate = 0x47415445; // 'GATE'

            // --- LOCAL LAMBDAS FOR MODULATION (ACE 2.0) ---
            auto getModulationOffset = [&](uint32_t paramId) -> float {
                float total = 0.0f;
                for (int i = 0; i < plan.modRouteCount; ++i) {
                    if (plan.modRoutes[i].targetParamId == paramId) {
                        total += state.modSignals[plan.modRoutes[i].sourceSignal] * plan.modRoutes[i].amount;
                    }
                }
                return total;
            };

            auto getModulatedParam = [&](int unitIdx, const char* paramName) -> float {
                const auto& unit = plan.units[unitIdx];
                float base = 0.0f;
                bool found = false;
                uint32_t pIdFound = 0;

                // 1. Try to resolve from VoiceConfig (Real-time Knobs)
                if (state.activeConfig != nullptr) {
                    if (strcmp(paramName, "cutoff") == 0) { base = state.activeConfig->cutoff; found = true; pIdFound = 0x4355544F; }
                    else if (strcmp(paramName, "resonance") == 0) { base = state.activeConfig->resonance; found = true; }
                    else if (strcmp(paramName, "detune") == 0) { base = state.activeConfig->jpDetune; found = true; }
                    else if (strcmp(paramName, "spread") == 0) { base = state.activeConfig->jpSpread; found = true; }
                    else if (strcmp(paramName, "gain") == 0) { base = state.activeConfig->vcaGain; found = true; }
                }

                // 2. Fallback to static plan
                if (!found) {
                    auto& reg = ParamIdRegistry::getInstance();
                    for (int pIdx = 0; pIdx < CompiledUnit::kMaxParams; ++pIdx) {
                        uint32_t pId = unit.stableParamIds[pIdx];
                        if (pId == 0) continue;
                        
                        juce::String sId = reg.getStringId(pId);
                        if (sId == paramName) {
                            base = unit.baseValues[pIdx];
                            pIdFound = pId;
                            found = true;
                            break;
                        }
                    }
                }

                // 3. Apply Modulation Bus offset (ACE 2.0 Mapping)
                if (pIdFound != 0) {
                    base += getModulationOffset(pIdFound);
                }

                return base;
            };

            // 2. Execute Graph (Execution Order from Compiler)
            // VA 2.1: NO SERIAL SUMMATION. Every unit reads from a specific bus and writes to another.
            for (int i = 0; i < plan.unitCount; ++i) {
                const auto& unitIndex = plan.executionOrder[i];
                const auto& unit = plan.units[unitIndex];
                float unitOut = 0.0f;

                // Resolve Input Bus (Default to 0 - the global input sum/oscillator output)
                // In VA 2.1 we'll look for connections that target this unit.
                float currentInput = 0.0f;
                for (int cIdx = 0; cIdx < plan.connectionCount; ++cIdx) {
                    if (plan.connections[cIdx].toUnit == unitIndex) {
                        currentInput += state.buses[plan.connections[cIdx].fromUnit % 16]; 
                    }
                }

                switch (unit.implementationId) {
                    case 101: // Juno DCO
                    {
                        unitOut = pools.junoOsc.process(voiceIdx, lfoVal); 
                        snapshot.rawOsc = unitOut;
                        break;
                    }
                    case 102: // JP Supersaw
                    {
                        if (state.triggerRequested) { pools.jpOsc.resetVoicePhase(voiceIdx); }
                        
                        float detune = getModulatedParam(unitIndex, "detune");
                        float spread = getModulatedParam(unitIndex, "spread");
                        float gain = getModulatedParam(unitIndex, "gain");
                        
                        float left[1] = { 0.0f }, right[1] = { 0.0f };
                        // Note: currentInput can be used as FM or Sync source in the future
                        pools.jpOsc.processStereo(voiceIdx, left, right, 1, state.frequencyHz, detune, spread, gain);
                        unitOut = (left[0] + right[0]) * 0.5f; 
                        snapshot.rawOsc = unitOut;
                        break;
                    }
                    case 201: // Juno Filter
                    {
                        float cutoff = getModulatedParam(unitIndex, "cutoff");
                        float resonance = getModulatedParam(unitIndex, "resonance");
                        pools.junoFlt.setVoiceParams(voiceIdx, cutoff, resonance);
                        unitOut = pools.junoFlt.process(voiceIdx, currentInput);
                        snapshot.rawFilter = unitOut;
                        break;
                    }
                    case 202: // Korg Filter
                    {
                        float cutoff = getModulatedParam(unitIndex, "cutoff");
                        float resonance = getModulatedParam(unitIndex, "resonance");
                        pools.korgFlt.setVoiceParams(voiceIdx, cutoff, resonance, 20.0f, 0.0f, 1.0f);
                        unitOut = pools.korgFlt.process(voiceIdx, currentInput);
                        break;
                    }
                    case 203: // JP-8080 Filter (SVF)
                    {
                        float res = getModulatedParam(unitIndex, "resonance");
                        int mode = static_cast<int>(getModulatedParam(unitIndex, "mode"));
                        unitOut = pools.jpFlt.process(voiceIdx, currentInput, state.frequencyHz, res, mode);
                        snapshot.rawFilter = unitOut;
                        break; 
                    }
                    case 301: // VCA
                    {
                        float gain = getModulatedParam(unitIndex, "gain");
                        unitOut = currentInput * gain * state.ampEnvelope; 
                        break;
                    }
                    /* DEPRECATED NATIVE MIDI (VA 2.1.W Migration)
                    case 501: // MIDI IN Bridge (WASM Paradigm)
                    {
                        // 1. Forward external MIDI to the modular buffer (POD Mockup)
                        // In a real WASM host, this would invoke the WASM bridge.
                        uint8_t status = state.modularMidi[0];
                        
                        // 2. Publish activity to telemetry for the UI LED
                        snapshot.midiActivity = (status > 0) ? 1.0f : 0.0f;
                        unitOut = 0.0f; 
                        break;
                    }
                    case 601: // MIDI to CV Converter
                    {
                        uint8_t status = state.modularMidi[0];
                        uint8_t data1  = state.modularMidi[1];
                        uint8_t data2  = state.modularMidi[2];
                        
                        if ((status & 0xF0) == 0x90 && data2 > 0) {
                            state.frequencyHz = 440.0f * pow(2.0f, (data1 - 69) / 12.0f);
                            state.velocity = data2 / 127.0f;
                            state.triggerRequested = true;
                        }
                        
                        unitOut = 0.0f;
                        break;
                    }
                    */
                    default:
                    {
                        // Dynamic WASM Unit Support (VA 2.1.W)
                        // Threshold lowered to 500 to include fundamental MIDI plugins
                        if (unit.implementationId >= 500) {
                            auto& wasm = Wasm::WasmModuleService::getInstance();
                            // Pass currentInput as the first float in the buffer (mock-up)
                            float ioBuffer[1] = { currentInput };
                            wasm.process(voiceIdx, unit.implementationId, ioBuffer, 1);
                            unitOut = ioBuffer[0];
                        }
                        break;
                    }
                }
                
                // Final Write to internal bus for this unit
                state.buses[unitIndex % 16] = unitOut;
            }

            // 3. Final Output Routing (VA 2.1: Use the last active unit or explicit master out)
            // By convention, the last unit in execution order that produces audio is the output.
            if (plan.unitCount > 0) {
                float lastOut = state.buses[plan.executionOrder[plan.unitCount - 1] % 16];
                outL = lastOut;
                outR = lastOut;
            }


            // Trigger will be cleared by the engine at the end of the block processing
        }
    };

} // namespace Voice
} // namespace Core
} // namespace Omega
