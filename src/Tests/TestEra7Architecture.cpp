#include <catch2/catch_test_macros.hpp>
#include "../Core/Model/PatchDocument.h"

using namespace Omega::Core::Model;

TEST_CASE("Era 7: PatchDocument Construction (Juno + JP + Delay)", "[Era7][Model]") {
    PatchDocument patch;
    patch.metadata.name = "Industrial Era 7 Prototype";
    patch.metadata.author = "Antigravity";
    
    // 1. Instanciar Módulos (IDs numéricos, sin strings)
    ModuleInstance junoDco;
    junoDco.instanceId = 101;
    junoDco.typeId = ModuleTypeId::JunoDCO;
    junoDco.parameters = {
        { ParamId::Frequency, 440.0f },
        { ParamId::SawOn, 1.0f },
        { ParamId::PulseOn, 0.0f }
    };
    
    ModuleInstance jpFilter;
    jpFilter.instanceId = 102;
    jpFilter.typeId = ModuleTypeId::JpFilter;
    jpFilter.parameters = {
        { ParamId::Cutoff, 2500.0f },
        { ParamId::Resonance, 0.4f },
        { ParamId::KeyTrack, 0.5f }
    };
    
    patch.modules.push_back(junoDco);
    patch.modules.push_back(jpFilter);
    
    // 2. Conectar Módulos (Audio Path)
    // Juno DCO (Port Out: 0) -> JP Filter (Port In: 0)
    patch.connections.push_back({
        101, 0, // Source
        102, 0, // Target
        ConnectionType::Audio
    });
    
    // 3. FX Globales (Delay)
    patch.globalFxParams = {
        { ParamId::Time, 0.5f },
        { ParamId::Feedback, 0.3f },
        { ParamId::Mix, 0.2f }
    };
    
    // VERIFICACIÓN
    SECTION("Structural Integrity") {
        REQUIRE(patch.modules.size() == 2);
        REQUIRE(patch.connections.size() == 1);
        
        const auto* m1 = patch.findModule(101);
        REQUIRE(m1 != nullptr);
        REQUIRE(m1->typeId == ModuleTypeId::JunoDCO);
    }
    
    SECTION("Parameter Access") {
        const auto* filter = patch.findModule(102);
        REQUIRE(filter != nullptr);
        
        bool foundCutoff = false;
        for(auto& p : filter->parameters) {
            if (p.id == ParamId::Cutoff) {
                REQUIRE(p.value == 2500.0f);
                foundCutoff = true;
            }
        }
        REQUIRE(foundCutoff);
    }
}
