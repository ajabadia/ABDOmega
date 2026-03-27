#include <catch2/catch_test_macros.hpp>
#include "../Core/Preset/OmegaPreset.h"

using namespace Omega::Core::Preset;

TEST_CASE("OmegaPreset Default State", "[Core][Preset]") {
    auto p = OmegaPreset::createDefault();
    
    REQUIRE(p.isValid());
    CHECK(p.getName() == "Default Preset");
    CHECK(p.getAuthor() == "OMEGA");
    CHECK(p.getEngine() == "VirtualAnalog");
    CHECK(p.getMasterGainDb() == -3.0f);
    
    REQUIRE(p.getNumLayers() == 1);
    auto l0 = p.getLayerTree(0);
    REQUIRE(l0.isValid());
    CHECK(l0.getType() == IDs::LAYER);
    CHECK(l0.getProperty(IDs::name).toString() == "Main Layer");
}

TEST_CASE("OmegaPreset Property Access", "[Core][Preset]") {
    OmegaPreset p;
    p.setName("Test Synth");
    p.setAuthor("Dev");
    p.setMasterGainDb(-6.0f);
    
    CHECK(p.getName() == "Test Synth");
    CHECK(p.getAuthor() == "Dev");
    CHECK(p.getMasterGainDb() == -6.0f);
    
    // Check internal ValueTree properties
    CHECK(p.getState().getProperty(IDs::name).toString() == "Test Synth");
}

TEST_CASE("OmegaPreset Layer Management", "[Core][Preset]") {
    OmegaPreset p = OmegaPreset::createEmpty();
    REQUIRE(p.getNumLayers() == 0);
    
    p.addLayer("Lead");
    p.addLayer("Bass");
    
    REQUIRE(p.getNumLayers() == 2);
    CHECK(p.getLayerTree(0).getProperty(IDs::name).toString() == "Lead");
    CHECK(p.getLayerTree(1).getProperty(IDs::name).toString() == "Bass");
    
    p.removeLayer(0);
    REQUIRE(p.getNumLayers() == 1);
    CHECK(p.getLayerTree(0).getProperty(IDs::name).toString() == "Bass");
}

TEST_CASE("OmegaPreset YAML Roundtrip (ValueTree)", "[Core][Preset][YAML]") {
    OmegaPreset p = OmegaPreset::createDefault();
    p.setName("Golden Preset");
    p.setMasterGainDb(-1.5f);
    
    std::string yaml = p.toYaml();
    REQUIRE(!yaml.empty());
    
    OmegaPreset p2;
    bool success = OmegaPreset::fromYaml(yaml, p2);
    
    REQUIRE(success);
    CHECK(p2.getName() == "Golden Preset");
    CHECK(p2.getMasterGainDb() == -1.5f);
    CHECK(p2.getNumLayers() == 1);
    CHECK(p2.getLayerTree(0).getProperty(IDs::name).toString() == "Main Layer");
}
