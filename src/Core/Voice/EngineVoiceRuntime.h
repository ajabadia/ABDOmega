#pragma once

#include "CompiledVoicePlan.h"
#include "VoiceState.h"
#include "../../DSP/Engines/Modular/EngineTypes.h"
#include "../../DSP/Modulation/AceUnitAdsr.h"

#include "../../DSP/Engines/Roland/Juno/OscillatorPoolJunoDco.h"
#include "../../DSP/Engines/Roland/Juno/FilterPoolJunoIr3109.h"
#include "../../DSP/Engines/Korg/MS20/FilterPoolKorg35.h"
#include "../../DSP/Engines/Roland/JP/OscillatorPoolJp8080.h"

namespace Omega {
namespace Core {
namespace Voice {

    /**
     * @brief Container for all available DSP pools to avoid passing multiple arguments.
     */
    struct DspPoolSet {
        Omega::DSP::Engines::Roland::Juno::OscillatorPoolJunoDco& junoOsc;
        Omega::DSP::Engines::Roland::Juno::FilterPoolJunoIr3109& junoFlt;
        Omega::DSP::Engines::Korg::MS20::FilterPoolKorg35& korgFlt;
        Omega::DSP::Engines::Roland::JP::OscillatorPoolJp8080& jpOsc;
    };

    /**
     * @brief Snapshot of internal signals for a single sample.
     */
    struct TelemetrySnapshot {
        float rawOsc = 0.0f;
        float rawFilter = 0.0f;
    };

    /**
     * @brief Modular execution engine for a single voice.
     * Implements Phase 15 Batch 5: "Modular Dispatcher Engine".
     */
    struct EngineVoiceRuntime {
        /**
         * @brief Renders a single sample for the voice based on the compiled plan.
         */
        static void renderSample(int voiceIdx, 
                                 const CompiledVoicePlan& plan, 
                                 VoiceState& state,
                                 float lfoVal,
                                 float& outL, float& outR,
                                 const DspPoolSet& pools,
                                 TelemetrySnapshot& telemetry)
        {
            if (!state.isActive) return;

            // 1. Clear accumulation buses
            for (int i = 0; i < CompiledVoicePlan::kMaxBuses; ++i) state.buses[i] = 0.0f;

            // 2. Execute plan in topological order
            for (int i = 0; i < plan.unitCount; ++i) {
                uint8_t unitIdx = plan.executionOrder[i];
                const auto& unit = plan.units[unitIdx];
                
                float unitOut = 0.0f;
                float inputSum = state.buses[unitIdx]; 

                // 2.1 Calculate modulated parameters (Batch 6)
                auto getModulatedParam = [&](int paramIdx, const char* name) {
                    float val = unit.baseValues[paramIdx];
                    uint32_t pId = unit.stableParamIds[paramIdx];
                    if (pId == 0) return val;

                    for (int m = 0; m < plan.modRouteCount; ++m) {
                        const auto& route = plan.modRoutes[m];
                        if (route.targetParamId == pId) {
                            // Modular Signal Mapping (Case 401 integration)
                            float srcVal = state.modSignals[route.sourceSignal];
                            
                            // Legacy fallback (can be phased out once compiler is updated)
                            if (route.sourceSignal == 0 && srcVal == 0.0f) srcVal = lfoVal;
                            else if (route.sourceSignal == 32 && srcVal == 0.0f) srcVal = state.ampEnvelope;
                            
                            val += srcVal * route.amount;
                        }
                    }
                    return val;
                };

                // 3. Dispatch based on implementationId
                switch (unit.implementationId) {
                    case 101: // Juno DCO
                        unitOut = pools.junoOsc.process(voiceIdx, lfoVal);
                        break;
                    case 102: // JP Supersaw
                    {
                        float detune = getModulatedParam(2, "detune");
                        float spread = getModulatedParam(3, "spread");
                        // Simplified JP process for now (Mono)
                        float buf[1] = { 0.0f };
                        pools.jpOsc.process(voiceIdx, buf, 1, state.frequencyHz, detune, 1.0f);
                        unitOut = buf[0];
                        break;
                    }
                    case 201: // Juno Filter
                    {
                        float cutoff = getModulatedParam(0, "cutoff");
                        float resonance = getModulatedParam(1, "resonance");
                        pools.junoFlt.setVoiceParams(voiceIdx, cutoff, resonance);
                        unitOut = pools.junoFlt.process(voiceIdx, inputSum);
                        break;
                    }
                    case 202: // Korg Filter
                    {
                        float cutoff = getModulatedParam(0, "cutoff");
                        float resonance = getModulatedParam(1, "resonance");
                        pools.korgFlt.setVoiceParams(voiceIdx, cutoff, resonance, 20.0f, 0.0f, 1.0f); // LP + HP(20Hz) + Grit(1.0)
                        unitOut = pools.korgFlt.process(voiceIdx, inputSum);
                        break;
                    }
                    case 301: // VCA
                    {
                        float gain = getModulatedParam(0, "gain");
                        unitOut = inputSum * gain; // Modulation now comes from implicit routing if connected
                        break;
                    }
                    case 401: // Modular ADSR (EG-STANDARD-001)
                    {
                        Omega::DSP::Modulation::AdsrParams p;
                        p.attackS = unit.baseValues[0];
                        p.decayS  = unit.baseValues[1];
                        p.sustain = unit.baseValues[2];
                        p.releaseS = unit.baseValues[3];
                        p.sampleRate = 44100.0f; // TODO: Pull from engine constants

                        auto& adsrState = state.units[unitIdx].data.adsr;
                        Omega::DSP::Modulation::AceUnitAdsr::setGate(adsrState, state.isActive);
                        unitOut = Omega::DSP::Modulation::AceUnitAdsr::process(adsrState, p);
                        
                        // Internal Routing: Update the modulation signal space for this unit
                        // Signal indices for ADSRs start at 32
                        state.modSignals[32 + unitIdx] = unitOut;
                        
                        // Legacy Bridge: If this is the primary envelope, update state.ampEnvelope
                        if (unitIdx == 0) state.ampEnvelope = unitOut; 
                        break;
                    }
                    default:
                        unitOut = inputSum;
                        break;
                }

                // 3.1 Capture Telemetry (Task 2 Alignment)
                if (voiceIdx == 0) {
                    if (unit.implementationId == 101 || unit.implementationId == 102) {
                        telemetry.rawOsc = unitOut;
                    } else if (unit.implementationId == 201 || unit.implementationId == 202) {
                        telemetry.rawFilter = unitOut;
                    }
                }

                // 4. Distribute output to connected units
                for (int c = 0; c < plan.connectionCount; ++c) {
                    const auto& conn = plan.connections[c];
                    if (conn.fromUnit == unitIdx) {
                        state.buses[conn.toUnit] += unitOut * conn.amount;
                    }
                }
                
                // Track for final output if it's the last node or a designated sink
                if (i == plan.unitCount - 1) {
                    outL = unitOut;
                    outR = unitOut;
                }
            }
        }
    };

} // namespace Voice
} // namespace Core
} // namespace Omega
