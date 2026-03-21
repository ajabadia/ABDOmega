#include <catch2/catch_test_macros.hpp>
#include "../Core/Ace/AceValidator.h"
#include "../Core/Ace/AceCatalog.h"
#include "../Core/Preset/OmegaPreset.h"
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_core/juce_core.h>


using namespace Omega::Core::Ace;
using namespace Omega::Core::Preset;

TEST_CASE("AceValidator Basic Repair Logic", "[ace][validator]") {
    juce::File resourceDir("d:\\desarrollos\\ABDOmega\\Resources\\ace");
    if (!resourceDir.isDirectory()) {
        resourceDir = juce::File::getSpecialLocation(juce::File::currentExecutableFile)
            .getParentDirectory().getParentDirectory().getParentDirectory()
            .getChildFile("Resources/ace");
    }
    
    auto catalogPtr = AceCatalog::createFromResources(resourceDir.getFullPathName().toStdString());
    REQUIRE(catalogPtr != nullptr);
    AceValidator validator(*catalogPtr);

    SECTION("Valid preset passes without issues") {
        OmegaPreset preset;
        preset.id = "VALID-PRESET";
        
        Layer layer;
        layer.id = "A";
        
        AceComponent osc;
        osc.slotName = "Osc1";
        osc.componentId = "OSC-VA-001"; // Valid
        layer.voiceArch.oscillators.push_back(osc);
        
        preset.layers.push_back(layer);

        ValidationReport report = validator.validateAndRepairPreset(preset);
        
        REQUIRE(report.status == ValidationStatus::Ok);
        REQUIRE(report.issues.empty());
        REQUIRE(preset.layers[0].voiceArch.oscillators[0].componentId == "OSC-VA-001");
    }

    SECTION("Invalid component ID is repaired with fallback") {
        OmegaPreset preset;
        preset.id = "INVALID-PRESET";
        
        Layer layer;
        layer.id = "A";
        
        AceComponent osc;
        osc.slotName = "Osc1";
        osc.componentId = "NON-EXISTENT-OSC"; // Invalid
        layer.voiceArch.oscillators.push_back(osc);
        
        AceComponent flt;
        flt.slotName = "Filter1";
        flt.componentId = "NON-EXISTENT-FLT"; // Invalid
        layer.voiceArch.filters.push_back(flt);
        
        preset.layers.push_back(layer);

        ValidationReport report = validator.validateAndRepairPreset(preset);
        
        // Should be Degraded because it's repaired
        REQUIRE(report.status == ValidationStatus::Degraded);
        REQUIRE(report.issues.size() == 2);
        
        // Verify repair
        REQUIRE(preset.layers[0].voiceArch.oscillators[0].componentId == "OSC-VA-001");
        REQUIRE(preset.layers[0].voiceArch.filters[0].componentId == "FLT-VA-001");
        
        REQUIRE(report.issues[0].code == "UnknownComponent");
        REQUIRE(report.issues[0].severity == ValidationStatus::Degraded);
    }
}
