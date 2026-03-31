#include <catch2/catch_test_macros.hpp>
#include "../Core/Modulation/ModulationGraph.h"
#include "../Core/Modulation/ModulationRuntime.h"

using namespace Omega::Core::Modulation;

TEST_CASE("ModulationGraph: Modulated Filter Route", "[modgraph][filter]") {
    ModulationGraph graph;

    // 1. Crear Nodos
    NodeId envNode = graph.addNode(NodeType::Envelope, "Filter Env", SignalType::Control);
    NodeId lfoNode = graph.addNode(NodeType::LFO, "Filter LFO", SignalType::Control);
    NodeId mixNode = graph.addNode(NodeType::Mix, "Mod Combiner", SignalType::Control);
    NodeId cutoffSink = graph.addNode(NodeType::FilterCutoff, "Cutoff Destination", SignalType::Control);

    // 2. Conectar: Envelope + LFO -> Mix -> Cutoff
    graph.connect(envNode, 0, mixNode, 0, 1.0f);   // 100% Env
    graph.connect(lfoNode, 0, mixNode, 1, 0.2f);   // 20% LFO (subtle wobble)
    graph.connect(mixNode, 0, cutoffSink, 0, 1.0f);

    SECTION("Modulated Filter graph compiles") {
        auto result = graph.compile();
        REQUIRE(result.success);
        REQUIRE(result.runtime != nullptr);
    }
}
