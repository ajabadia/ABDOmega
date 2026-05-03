#include "RuntimeCompiler.h"
#include "../../Engine/Voice/VoiceArchitectureCompiler.h"
#include "../../Core/Providers/ModulationTelemetryRegistry.h"
#include <algorithm>
#include <map>

namespace Omega {
namespace Core {
namespace Compiler {

    using namespace ::Omega::Core::Model;
    using namespace ::Omega::Core::Voice;


    RuntimeSnapshot RuntimeCompiler::compile(const PatchDocument& doc, const ::Omega::Core::Ace::AceCatalog& catalog) {
        RuntimeSnapshot snapshot;
        snapshot.voicePlan.unitCount = 0;
        snapshot.voicePlan.connectionCount = 0;
        snapshot.voicePlan.modRouteCount = 0;

        std::map<uint32_t, uint8_t> instanceToUnitIdx;

        // 1. Compilar Unidades (Módulos)
        for (const auto& mod : doc.modules) {
            if (snapshot.voicePlan.unitCount >= CompiledVoicePlan::kMaxUnits) break;

            CompiledUnit unit;
            unit.nodeId = mod.instanceId;
            
            // Resolución vía Catálogo
            std::string catalogId = mapTypeToId(mod.typeId);
            auto const* info = catalog.getComponent(catalogId);
            
            if (info) {
                unit.implementationId = info->implementationId;
                
                // Mapear parámetros del PatchDocument a los slots del motor
                for (size_t pIdx = 0; pIdx < info->parameters.size() && pIdx < CompiledUnit::kMaxParams; ++pIdx) {
                    const auto& pDef = info->parameters[pIdx];
                    // Buscamos si el PatchDocument tiene un valor para este parámetro
                    bool valueSet = false;
                    for (const auto& pVal : mod.parameters) {
                        // Aquí necesitaríamos un mapeo de ParamId a String de manifest o viceversa
                        // Por ahora simplificamos asumiendo que el orden coincide o buscando por ID
                        if (static_cast<uint16_t>(pVal.id) == pIdx + 1) { // Placeholder logic
                             unit.baseValues[pIdx] = pVal.value;
                             valueSet = true;
                             break;
                        }
                    }
                    if (!valueSet) unit.baseValues[pIdx] = pDef.defaultValue;
                    unit.stableParamIds[pIdx] = static_cast<uint32_t>(pIdx); // Placeholder
                }
            }

            instanceToUnitIdx[mod.instanceId] = static_cast<uint8_t>(snapshot.voicePlan.unitCount);
            snapshot.voicePlan.units[snapshot.voicePlan.unitCount++] = unit;
        }

        // 2. Compilar Conexiones (Audio)
        for (const auto& conn : doc.connections) {
            if (conn.type != ConnectionType::Audio) continue;
            if (snapshot.voicePlan.connectionCount >= CompiledVoicePlan::kMaxConnections) break;

            if (instanceToUnitIdx.count(conn.sourceModuleId) && instanceToUnitIdx.count(conn.targetModuleId)) {
                CompiledConnection cc;
                cc.fromUnit = instanceToUnitIdx[conn.sourceModuleId];
                cc.toUnit = instanceToUnitIdx[conn.targetModuleId];
                cc.srcBus = static_cast<uint8_t>(conn.sourcePortId);
                cc.dstBus = static_cast<uint8_t>(conn.targetPortId);
                cc.amount = 1.0f;
                snapshot.voicePlan.connections[snapshot.voicePlan.connectionCount++] = cc;
            }
        }

        // 3. Ordenación Topológica
        sortExecutionOrder(snapshot.voicePlan);

        // 4. Parámetros Globales
        for (int i = 0; i < 256; ++i) snapshot.globalParams[i] = 0.0f;
        snapshot.globalParams[0] = doc.masterGainDb;
        
        // 5. Finalización
        snapshot.snapshotId = 1234; // TODO: Real Hash
        snapshot.isValid = true;
        snapshot.voicePlan.isInitialised = true;

        return snapshot;
    }

    void RuntimeCompiler::sortExecutionOrder(CompiledVoicePlan& plan) {
        // [Era 7] Kahn's Algorithm Implementation (Simplified for the prototype)
        // This is a direct port of the logic in VoiceArchitectureCompiler
        std::vector<int> inDegree(plan.unitCount, 0);
        for (int i = 0; i < plan.connectionCount; ++i) {
            inDegree[plan.connections[i].toUnit]++;
        }

        std::vector<int> queue;
        for (int i = 0; i < plan.unitCount; ++i) {
            if (inDegree[i] == 0) queue.push_back(i);
        }

        int count = 0;
        while (!queue.empty()) {
            int u = queue.front();
            queue.erase(queue.begin());
            plan.executionOrder[count++] = static_cast<uint8_t>(u);

            for (int i = 0; i < plan.connectionCount; ++i) {
                if (plan.connections[i].fromUnit == u) {
                    int v = plan.connections[i].toUnit;
                    if (--inDegree[v] == 0) queue.push_back(v);
                }
            }
        }
    }

} // namespace Compiler
} // namespace Core
} // namespace Omega
