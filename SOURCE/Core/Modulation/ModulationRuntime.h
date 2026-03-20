#pragma once

#include "SignalTypes.h"
#include <array>
#include <vector>
#include <atomic>
#include <algorithm>

namespace Omega::Core::Modulation {

    /**
     * @brief Nodo optimizado para el audio thread.
     */
    struct alignas(32) RuntimeNode {
        uint8_t type;
        uint8_t outputType;
        
        std::array<uint8_t, 4> inputIndices; // Índices al buffer de señales
        std::array<float, 4> weights;
        
        uint8_t outputIndex;

        // Estado interno (ej: fase del LFO)
        union {
            struct { float phase; float increment; } lfo;
            struct { float current; float target; int samplesRemaining; } env;
            float raw[8];
        } state;
    };

    /**
     * @brief Almacén de señales procesadas en el bloque actual.
     */
    struct SignalBufferBank {
        static constexpr int kMaxSignals = 64;
        std::array<float, kMaxSignals> values; // Valores de control por bloque
    };

    /**
     * @brief Motor de ejecución de modulación lock-free.
     */
    class ModulationRuntime {
    public:
        static constexpr int kMaxNodes = 32;

        ModulationRuntime() : mNumNodes(0) {
            std::fill(mNodes.begin(), mNodes.end(), RuntimeNode{});
        }

        void reset() {
            mBuffers.values.fill(0.0f);
        }

        /**
         * @brief Procesa un bloque de modulación.
         */
        void processBlock(int numSamples) {
            for (int i = 0; i < mNumNodes; ++i) {
                processNode(mNodes[i], numSamples);
            }
        }

        // Métodos para que el compilador configure el runtime
        void addRuntimeNode(const RuntimeNode& node) {
            if (mNumNodes < kMaxNodes) mNodes[mNumNodes++] = node;
        }

        // API para que el motor inyecte valores externos (MIDI, etc)
        void setSourceValue(uint8_t index, float value) {
            mBuffers.values[index] = value;
        }

        float getSignalValue(uint8_t index) const { return mBuffers.values[index]; }

        // Acceso para pruebas unitarias
        RuntimeNode& getRuntimeNode(int index) { return mNodes[index]; }

    private:
        void processNode(RuntimeNode& node, int numSamples);

        std::array<RuntimeNode, kMaxNodes> mNodes;
        int mNumNodes;
        SignalBufferBank mBuffers;
    };

} // namespace Omega::Core::Modulation
