#include <catch2/catch_test_macros.hpp>
#include "../Core/Preset/OmegaPreset.h"
#include <iostream>

using namespace Omega::Core::Preset;

TEST_CASE("YAML Preset Serialization Symmetry", "[Core][Preset][YAML]") {
    OmegaPreset original;
    original.id = "test-preset-001";
    original.name = "Symmetry Test Pad";
    original.author = "Antigravity";
    original.engine = "VirtualAnalog";
    original.masterGainDb = -3.0f;

    Layer layer;
    layer.id = "layer-1";
    layer.name = "Main Synth";
    layer.polyphony = 12;

    // Set some specific LayerParams
    layer.params.cutoff = 1234.5f;
    layer.params.resonance = 0.75f;
    layer.params.sawOn = false;
    layer.params.pulseOn = true;
    layer.params.subLevel = 0.8f;
    layer.params.pwmModeLfo = true;
    layer.params.vcfEnvInv = true;

    // Add an ACE component
    AceComponent osc;
    osc.slotType = "Oscillator";
    osc.slotName = "DCO1";
    osc.componentId = "OSC-JUNO-DCO";
    osc.params["fineTune"] = 0.12f;
    layer.voiceArch.oscillators.push_back(osc);

    // Add a ModGraph node
    ModGraphNodeData lfoNode;
    lfoNode.id = 101;
    lfoNode.type = "LFO";
    lfoNode.name = "MainLFO";
    lfoNode.params["rate"] = 5.5f;
    layer.modulationGraph.nodes.push_back(lfoNode);

    // Add a connection
    ModGraphConnectionData conn;
    conn.sourceNode = 101;
    conn.destNode = 0; // Filter
    conn.destInput = 1; // Cutoff
    conn.amount = 0.5f;
    layer.modulationGraph.connections.push_back(conn);

    original.layers.push_back(layer);

    // ROUNDTRIP
    std::string yaml = original.toYaml();
    
    // DEBUG: Output YAML to console if needed
    // std::cout << yaml << std::endl;

    OmegaPreset loaded;
    bool success = OmegaPreset::fromYaml(yaml, loaded);

    REQUIRE(success);
    CHECK(loaded.id == original.id);
    CHECK(loaded.name == original.name);
    CHECK(loaded.author == original.author);
    CHECK(loaded.masterGainDb == original.masterGainDb);

    REQUIRE(loaded.layers.size() == 1);
    CHECK(loaded.layers[0].id == layer.id);
    CHECK(loaded.layers[0].params.cutoff == layer.params.cutoff);
    CHECK(loaded.layers[0].params.sawOn == layer.params.sawOn);
    CHECK(loaded.layers[0].params.vcfEnvInv == layer.params.vcfEnvInv);

    REQUIRE(loaded.layers[0].voiceArch.oscillators.size() == 1);
    CHECK(loaded.layers[0].voiceArch.oscillators[0].componentId == osc.componentId);
    CHECK(loaded.layers[0].voiceArch.oscillators[0].params["fineTune"] == 0.12f);

    REQUIRE(loaded.layers[0].modulationGraph.nodes.size() == 1);
    CHECK(loaded.layers[0].modulationGraph.nodes[0].id == 101);
    CHECK(loaded.layers[0].modulationGraph.nodes[0].params["rate"] == 5.5f);

    REQUIRE(loaded.layers[0].modulationGraph.connections.size() == 1);
    CHECK(loaded.layers[0].modulationGraph.connections[0].sourceNode == 101);
    CHECK(loaded.layers[0].modulationGraph.connections[0].amount == 0.5f);
}
