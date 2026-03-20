#include <catch2/catch_test_macros.hpp>
#include "../Core/Modulation/ModulationGraph.h"
#include "../Core/Modulation/ModulationRuntime.h"

using namespace Omega::Core::Modulation;

TEST_CASE("ModulationGraph: ModWheel to Vibrato Route", "[modgraph][vibrato]") {
    ModulationGraph graph;

    // 1. Crear Nodos
    NodeId lfoNode = graph.addNode(NodeType::LFO, "Vibrato LFO", SignalType::Control);
    NodeId modWheelNode = graph.addNode(NodeType::MIDIInput, "ModWheel", SignalType::Control);
    NodeId multiplyNode = graph.addNode(NodeType::Multiply, "Depth Mult", SignalType::Control);
    NodeId pitchSink = graph.addNode(NodeType::VoicePitch, "Pitch Destination", SignalType::Pitch);

    // 2. Conectar: LFO * ModWheel -> Pitch
    graph.connect(lfoNode, 0, multiplyNode, 0, 1.0f);
    graph.connect(modWheelNode, 0, multiplyNode, 1, 1.0f);
    graph.connect(multiplyNode, 0, pitchSink, 0, 1.0f);

    SECTION("Vibrato graph compiles") {
        auto result = graph.compile();
        REQUIRE(result.success);
        REQUIRE(result.runtime != nullptr);
    }
}
