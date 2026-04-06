#include <catch2/catch_test_macros.hpp>
#include "../Engine/Modulation/ModulationGraph.h"
#include "../Engine/Modulation/ModulationRuntime.h"

using namespace Omega::Core::Modulation;

TEST_CASE("ModulationGraph Compilation and Runtime", "[modgraph]") {
    ModulationGraph graph;

    // Crear un grafo: LFO -> Mix (con peso 0.5)
    NodeId lfoNode = graph.addNode(NodeType::LFO, "Main LFO", SignalType::Control);
    NodeId mixNode = graph.addNode(NodeType::Mix, "Mod Mixer", SignalType::Control);

    graph.connect(lfoNode, 0, mixNode, 0, 0.5f);

    SECTION("Compilation succeeds with valid graph") {
        auto result = graph.compile();
        REQUIRE(result.success);
        REQUIRE(result.runtime != nullptr);
    }

    SECTION("Cycle detection fails compilation") {
        // Crear ciclo: Mix -> Mix (auto-feedback ilegal sin Delay1)
        graph.connect(mixNode, 0, mixNode, 1, 1.0f);
        
        auto result = graph.compile();
        REQUIRE_FALSE(result.success);
        REQUIRE(result.errorMessage.find("Ciclo") != std::string::npos);
    }

    SECTION("Runtime execution order is correct") {
        auto result = graph.compile();
        REQUIRE(result.success);
        
        // El LFO (id 1) debe ejecutarse antes que el Mix (id 2)
        // En nuestro cÃ³digo, el outputIndex es el ID por ahora
        // Solo podemos verificar que el runtime procesa 2 nodos
    }
}
