#include "ModulationRuntime.h"
#include <cmath>

namespace Omega::Core::Modulation {

    void ModulationRuntime::processNode(RuntimeNode& node, int numSamples) {
        switch (node.type) {
            case 0: // LFO
            {
                node.state.lfo.phase += node.state.lfo.increment * numSamples;
                if (node.state.lfo.phase > 1.0f) node.state.lfo.phase -= 1.0f;
                mBuffers.values[node.outputIndex] = std::sin(node.state.lfo.phase * 6.283185f);
                break;
            }
            case 1: // Envelope
            {
                if (node.state.env.samplesRemaining > 0) {
                    node.state.env.current += (node.state.env.target - node.state.env.current) * 0.01f;
                    node.state.env.samplesRemaining -= numSamples;
                }
                mBuffers.values[node.outputIndex] = node.state.env.current;
                break;
            }
            case 2: // MIDIInput
            {
                // El valor ya se seta externamente en el buffer bank o en state.raw
                break;
            }
            case 3: // Mix
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
            case 4: // Multiply
            {
                float res = 1.0f;
                for (int i = 0; i < 4; ++i) {
                    if (node.inputIndices[i] != 255) {
                        res *= mBuffers.values[node.inputIndices[i]];
                    }
                }
                mBuffers.values[node.outputIndex] = res;
                break;
            }
            case 6: // Curve
            {
                float in = mBuffers.values[node.inputIndices[0]];
                float exp = node.state.raw[0];
                if (exp == 1.0f) mBuffers.values[node.outputIndex] = in;
                else mBuffers.values[node.outputIndex] = std::pow(std::abs(in), exp) * (in < 0 ? -1.0f : 1.0f);
                break;
            }
            case 8: // FilterCutoff
             {
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

} // namespace Omega::Core::Modulation
