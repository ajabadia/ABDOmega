#pragma once

#include "SignalTypes.h"
#include <vector>
#include <string>
#include <memory>
#include <cstdint>

namespace Omega::Core::Modulation {

    /**
     * @brief Identificador único de nodo.
     */
    using NodeId = uint32_t;

    /**
     * @brief Tipos de nodos disponibles en el grafo.
     */
    enum class NodeType : uint8_t {
        LFO,
        Envelope,       // ADSR / Multi-stage
        MIDIInput,      // Velocity, ModWheel, Aftertouch
        Mix,            // Suma
        Multiply,       // Multiplicación (VCA style / Depth control)
        Scale,
        Curve,          // Shaper / Response
        VoicePitch,
        FilterCutoff,
        CustomParameter
    };

    /**
     * @brief Definición de una conexión entre puertos de nodos.
     */
    struct Connection {
        NodeId sourceNode;
        uint8_t sourceOutput;
        NodeId destNode;
        uint8_t destInput;
        float amount;
    };

    /**
     * @brief Nodo del grafo de modulación (Capa Logica/Configuración).
     */
    struct ModNode {
        NodeId id;
        NodeType type;
        std::string name;
        SignalType outputType;
    };

    /**
     * @brief Resultado de la compilación del grafo.
     */
    struct CompileResult {
        bool success;
        std::string errorMessage;
        std::unique_ptr<class ModulationRuntime> runtime;
    };

    /**
     * @brief Grafo de modulación principal.
     * [Logic]: Gestión de nodos y conexiones, validación y compilación topológica.
     */
    class ModulationGraph {
    public:
        ModulationGraph() : mNextId(1) {}

        NodeId addNode(NodeType type, const std::string& name, SignalType outputType);
        void connect(NodeId source, uint8_t sourceOut, NodeId dest, uint8_t destIn, float amount = 1.0f);
        
        /**
         * @brief Compila el grafo en un orden de ejecución válido (Toposort).
         * [Detección de ciclos]: Si hay un ciclo sin un nodo Delay1, la compilación falla.
         */
        CompileResult compile();

    private:
        std::vector<std::unique_ptr<ModNode>> mNodes;
        std::vector<Connection> mConnections;
        NodeId mNextId;

        bool hasCycle(NodeId startNode, std::vector<NodeId>& visited, std::vector<NodeId>& stack);
    };

} // namespace Omega::Core::Modulation
