#include <catch2/catch_test_macros.hpp>
#include "../Core/Preset/OmegaPreset.h"
#include "../Core/Preset/PresetRepository.h"
#include <filesystem>
#include <fstream>

using namespace Omega::Core::Preset;

TEST_CASE("Git-for-Sounds: Basic Snapshots", "[Core][Preset][Git]") {
    std::filesystem::path testDir = std::filesystem::temp_directory_path() / "OmegaGitTest";
    if (std::filesystem::exists(testDir)) std::filesystem::remove_all(testDir);
    std::filesystem::create_directories(testDir);

    PresetRepository repo(testDir);
    
    OmegaPreset p;
    p.id = "test-lead";
    p.name = "Basic Lead";
    p.layers.push_back({}); // Add a layer for content
    p.layers[0].params.cutoff = 1000.0f;

    SECTION("Linear History") {
        std::string h1 = repo.saveSnapshot(p, "UserA", "Version 1");
        REQUIRE(!h1.empty());

        p.layers[0].params.cutoff = 2000.0f;
        std::string h2 = repo.saveSnapshot(p, "UserA", "Version 2");
        REQUIRE(h1 != h2);

        auto history = repo.getHistory("test-lead");
        REQUIRE(history.snapshots.size() == 2);
        CHECK(history.snapshots[0].hash == h1);
        CHECK(history.snapshots[1].hash == h2);
        CHECK(history.snapshots[1].parentHash == h1);
    }

    SECTION("Branching and Checkout") {
        std::string h1 = repo.saveSnapshot(p, "UserA", "Base");
        
        // Create branch "variation-b"
        repo.createBranch("test-lead", "variation-b");
        
        p.layers[0].params.cutoff = 5000.0f;
        std::string hb = repo.saveSnapshot(p, "UserA", "Branch version");
        
        // Switch back to main
        repo.createBranch("test-lead", "main", h1);
        
        OmegaPreset restored;
        bool success = repo.checkout("test-lead", h1, restored);
        REQUIRE(success);
        CHECK(restored.layers[0].params.cutoff == 1000.0f);
        
        success = repo.checkout("test-lead", hb, restored);
        REQUIRE(success);
        CHECK(restored.layers[0].params.cutoff == 5000.0f);
    }

    // Cleanup
    std::filesystem::remove_all(testDir);
}

TEST_CASE("Git-for-Sounds: SHA-256 Consistency", "[Core][Preset][Git]") {
    OmegaPreset p1;
    p1.id = "h1";
    p1.layers.push_back({});
    p1.layers[0].params.cutoff = 1500.0f;

    std::string sha1 = p1.calculateHash();
    std::string sha2 = p1.calculateHash();
    CHECK(sha1 == sha2);

    p1.layers[0].params.cutoff = 1500.1f;
    std::string sha3 = p1.calculateHash();
    CHECK(sha1 != sha3);
}
