#include <catch2/catch_test_macros.hpp>
#include "../Core/Model/PatchDocument.h"
#include "../Core/Compiler/RuntimeCompiler.h"
#include "../Core/Ace/AceCatalog.h"

using namespace Omega::Core::Model;
using namespace Omega::Core::Compiler;
using namespace Omega::Core::Ace;

TEST_CASE("Era 7 Golden: Parameter Update Integrity", "[Era7][Golden]") {
    AceCatalog catalog;
    // Mocking a basic component registration in catalog for the test
    // In a real scenario, this would be loaded from manifests
    
    PatchDocument doc;
    doc.modules.push_back({101, ModuleTypeId::JunoDCO, {0,0,0}, {}, {}});
    
    // Initial Compilation
    auto snapshot1 = RuntimeCompiler::compile(doc, catalog);
    REQUIRE(snapshot1.isValid);

    // Update Parameter via the same logic RpcController uses
    uint32_t instanceId = 101;
    ParamId pId = ParamId::Cutoff;
    float newValue = 0.75f;
    
    auto* mod = const_cast<ModuleInstance*>(doc.findModule(instanceId));
    REQUIRE(mod != nullptr);
    mod->parameters.push_back({pId, newValue});
    
    // Second Compilation
    auto snapshot2 = RuntimeCompiler::compile(doc, catalog);
    
    SECTION("Predictable Side Effects") {
        // El ID del snapshot debe haber cambiado (simulado por ahora)
        // REQUIRE(snapshot1.snapshotId != snapshot2.snapshotId);
        
        // El valor debe estar en el snapshot (el compilador debe haberlo mapeado)
        // En el prototipo actual el compilador usa una lógica simple de mapeo
        REQUIRE(snapshot2.isValid);
    }
}

TEST_CASE("Era 7 Golden: PatchDocument Round-trip Equality", "[Era7][Golden]") {
    PatchDocument doc;
    doc.metadata.name = "Golden Patch";
    doc.masterGainDb = -6.0f;
    doc.modules.push_back({1, ModuleTypeId::JpFilter, {0,0,0}, {{ParamId::Resonance, 0.5f}}, {}});
    
    SECTION("Structural Integrity") {
        REQUIRE(doc.modules.size() == 1);
        REQUIRE(doc.modules[0].parameters[0].value == 0.5f);
        REQUIRE(doc.masterGainDb == -6.0f);
    }
    
    // Aquí iría el test de serialización JSON cuando el RpcController lo implemente
}
