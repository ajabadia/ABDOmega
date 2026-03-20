#include "ModulationRuntime.h"
#include <cmath>

namespace Omega::DSP::Modulation {

    void ModulationRuntime::processNode(RuntimeNode& node, int numSamples) {
        // Implementación ultra-simplificada para el MVP
        // Aquí iría el switch por NodeType
        
        switch (node.type) {
            case 0: // LFO (Simplified)
            {
                node.state.lfo.phase += node.state.lfo.increment * numSamples;
                if (node.state.lfo.phase > 1.0f) node.state.lfo.phase -= 1.0f;
                mBuffers.values[node.outputIndex] = std::sin(node.state.lfo.phase * 6.283185f);
                break;
            }
            case 1: // Envelope (ADSR - Simplified Trigger)
            {
                if (node.state.env.samplesRemaining > 0) {
                    node.state.env.current += (node.state.env.target - node.state.env.current) * 0.01f; // Simple smoothing
                    node.state.env.samplesRemaining -= numSamples;
                }
                mBuffers.values[node.outputIndex] = node.state.env.current;
                break;
            }
            case 2: // MIDIInput (Velocity, CC, etc.)
            {
                // El valor ya se seteó externamente en state.raw[0] por el voice manager
                mBuffers.values[node.outputIndex] = node.state.raw[0]; 
                break;
            }
            case 3: // Mix/Sum
            {
                float sum = 0.0f;
                for (int i = 0; i < 4; ++i) {
                    if (node.inputIndices[i] != 255) {
                        sum += mBuffers.values[node.inputIndices[i]] * node.weights[i];
                    }
                }
                mBuffers.values[node.outputIndex] = sum;
                break;
            }
            case 4: // Multiply (Depth/VCA)
            {
                float result = 1.0f;
                for (int i = 0; i < 4; ++i) {
                    if (node.inputIndices[i] != 255) {
                        result *= mBuffers.values[node.inputIndices[i]];
                    }
                }
                mBuffers.values[node.outputIndex] = result;
                break;
            }
            case 6: // Curve (Shaper)
            {
                // state.raw[0] = exponent (1.0 = linear, >1.0 = exponential, <1.0 = logarithmic)
                float in = mBuffers.values[node.inputIndices[0]];
                float exp = node.state.raw[0];
                if (exp == 1.0f) mBuffers.values[node.outputIndex] = in;
                else mBuffers.values[node.outputIndex] = std::pow(std::abs(in), exp) * (in < 0 ? -1.0f : 1.0f);
                break;
            }
            case 8: // FilterCutoff (Sink)
            {
                // Un sumador final para el destino
                float totalMod = 0.0f;
                for (int i = 0; i < 4; ++i) {
                    if (node.inputIndices[i] != 255) {
                        totalMod += mBuffers.values[node.inputIndices[i]] * node.weights[i];
                    }
                }
                mBuffers.values[node.outputIndex] = totalMod;
                break;
            }
            default:
                break;
        }
    }

} // namespace Omega::DSP::Modulation
