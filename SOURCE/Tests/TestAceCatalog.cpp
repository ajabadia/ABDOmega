#include <catch2/catch_test_macros.hpp>
#include "Core/Ace/AceCatalog.h"
#include <juce_core/juce_core.h>

using namespace Omega::Core::Ace;

TEST_CASE("AceCatalog loads from YAML resources", "[ace][catalog]")
{
    // Ruta base del proyecto
    juce::File resourceDir("d:\\desarrollos\\ABDOmega\\Resources\\ace");

    if (!resourceDir.isDirectory()) {
        // Intentar encontrarla relativa al ejecutable (para CI/CMD)
        resourceDir = juce::File::getSpecialLocation(juce::File::currentExecutableFile)
            .getParentDirectory().getParentDirectory().getParentDirectory()
            .getChildFile("Resources/ace");
    }

    REQUIRE(resourceDir.isDirectory());
    REQUIRE(resourceDir.getChildFile("aceindex.yaml").existsAsFile());

    auto catalog = AceCatalog::createFromResources(resourceDir.getFullPathName().toStdString());
    REQUIRE(catalog != nullptr);

    SECTION("Find Roland DCO") {
        auto* info = catalog->getComponent("OSC-VA-001");
        REQUIRE(info != nullptr);
        CHECK(info->name == "Roland DCO");
        CHECK(info->family == "Oscillator");
        CHECK(info->engine == "VirtualAnalog");
        CHECK(info->parameters.size() >= 3);
        
        // Verificar un parámetro específico
        auto it = std::find_if(info->parameters.begin(), info->parameters.end(), 
            [](const ParameterDef& p) { return p.id == "tune"; });
        REQUIRE(it != info->parameters.end());
        CHECK(it->unit == "semitones");
        CHECK(it->min == -24.0f);
    }

    SECTION("Find Roland Supersaw") {
        auto* info = catalog->getComponent("OSC-VA-004");
        REQUIRE(info != nullptr);
        CHECK(info->name == "Roland Supersaw");
        CHECK(info->modelId == "RolandJp8000Supersaw");
    }

    SECTION("Find Korg35 Filter") {
        auto* info = catalog->getComponent("FLT-VA-003");
        REQUIRE(info != nullptr);
        CHECK(info->name == "Korg KORG35");
        CHECK(info->family == "Filter");
    }

    SECTION("Fallback lookup") {
        auto oscId = catalog->getFallbackId("Oscillator", "VirtualAnalog");
        CHECK(oscId == "OSC-VA-001");
        
        auto fltId = catalog->getFallbackId("Filter", "VirtualAnalog");
        CHECK(fltId == "FLT-VA-001");
    }
}
