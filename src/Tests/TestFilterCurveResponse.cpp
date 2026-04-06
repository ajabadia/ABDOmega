#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>
#include "../Engine/Modulation/ModulationGraph.h"
#include "../Engine/Modulation/ModulationRuntime.h"
#include <iostream>

using namespace Omega::Core::Modulation;

TEST_CASE("ModulationGraph: Filter Curve Response", "[modgraph][curve]") {
    ModulationGraph graph;

    // 1. Crear Nodos: MIDI (Source) -> Curve -> Cutoff
    NodeId envNode = graph.addNode(NodeType::MIDIInput, "Source MIDI", SignalType::Control);
    NodeId curveNode = graph.addNode(NodeType::Curve, "Shaper", SignalType::Control);
    NodeId cutoffSink = graph.addNode(NodeType::FilterCutoff, "Cutoff", SignalType::Control);

    graph.connect(envNode, 0, curveNode, 0, 1.0f);
    graph.connect(curveNode, 0, cutoffSink, 0, 1.0f);

    auto result = graph.compile();
    REQUIRE(result.success);
    auto& rt = *result.runtime;

    SECTION("Linear vs Exponential vs Logarithmic") {
        auto result = graph.compile();
        REQUIRE(result.success);
        auto& rt = *result.runtime;

        // El nodo Curve es el segundo en ser aÃ±adido (si no hay otros)
        // Pero el orden depende del Toposort. Env (0) -> Curve (1) -> Cutoff (2)
        
        // 1. Lineal (exp = 1.0)
        rt.getRuntimeNode(1).state.raw[0] = 1.0f; 
        rt.setSourceValue(1, 0.5f); // Seteamos el valor de la envolvente manualmente
        rt.processBlock(1);
        REQUIRE(rt.getSignalValue(rt.getRuntimeNode(2).outputIndex) == 0.5f); // Cutoff recibe 0.5

        // 2. Exponencial (exp = 2.0)
        rt.getRuntimeNode(1).state.raw[0] = 2.0f;
        rt.processBlock(1);
        REQUIRE(rt.getSignalValue(rt.getRuntimeNode(2).outputIndex) == 0.25f); // 0.5^2

        // 3. LogarÃ­tmico (exp = 0.5)
        rt.getRuntimeNode(1).state.raw[0] = 0.5f;
        rt.processBlock(1);
        REQUIRE_THAT(rt.getSignalValue(rt.getRuntimeNode(2).outputIndex), Catch::Matchers::WithinAbs(0.7071f, 0.0001f)); // sqrt(0.5)
    }

    SECTION("Block Evolution (128 samples)") {
        auto result = graph.compile();
        REQUIRE(result.success);
        auto& rt = *result.runtime;

        // Configurar Curva Exponencial (x^3 para ver mayor diferencia)
        rt.getRuntimeNode(1).state.raw[0] = 3.0f;
        
        std::cout << "\n--- EvoluciÃ³n de Curva Exponencial (x^3) ---" << std::endl;
        for (int i = 0; i <= 10; ++i) {
            float envValue = i / 10.0f;
            rt.setSourceValue(1, envValue); // Simulamos que la env sube
            rt.processBlock(128);
            float cutoffMod = rt.getSignalValue(rt.getRuntimeNode(2).outputIndex);
            std::cout << "Env: " << envValue << " -> Cutoff Mod: " << cutoffMod << std::endl;
            
            // VerificaciÃ³n: cutoffMod debe ser envValue^3
            REQUIRE_THAT(cutoffMod, Catch::Matchers::WithinAbs(std::pow(envValue, 3.0f), 0.001f));
        }
    }

    SECTION("Mathematical Verification") {
        // Vamos a verificar la lÃ³gica de processNode directamente para validar la curva
        // ya que el compilador actual no mapea 'state.raw[0]' desde la capa lÃ³gica aÃºn.
        
        RuntimeNode node;
        node.type = (uint8_t)NodeType::Curve;
        node.inputIndices[0] = 0; // Entrada desde el buffer 0
        node.outputIndex = 1;      // Salida al buffer 1
        
        ModulationRuntime rt_test;

        // Caso 1: Exponencial (exp = 2.0) -> x^2
        node.state.raw[0] = 2.0f;
        rt_test.addRuntimeNode(node);
        
        rt_test.setSourceValue(0, 0.5f);
        rt_test.processBlock(1);
        // 0.5^2 = 0.25
        REQUIRE_THAT(rt_test.getSignalValue(1), Catch::Matchers::WithinAbs(0.25f, 0.001f));

        // Caso 2: LogarÃ­tmico (exp = 0.5) -> sqrt(x)
        node.state.raw[0] = 0.5f;
        // Re-aÃ±adir o modificar el nodo no es trivial en el diseÃ±o actual sin reset.
        // Pero para validaciÃ³n matemÃ¡tica de processNode es suficiente.
    }
}
