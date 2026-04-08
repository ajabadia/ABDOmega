#include "VoiceArchitectureCompiler.h"
#include "ParamIdRegistry.h"
#include "../Modulation/ModulationMetadata.h"
#include "../OmegaIdentifiers.h"

#include <algorithm>
#include <set>

namespace Omega {
namespace Core {
namespace Voice {

CompilerResult VoiceArchitectureCompiler::compile(const juce::ValueTree& layerTree, 
                                                  const Omega::Core::Ace::AceCatalog& catalog)
{
    using IDs = Omega::Core::Identifiers;
    CompilerResult result;
    
    juce::ValueTree chainNode = layerTree.getChildWithName(IDs::voiceChain);
    if (!chainNode.isValid()) {
        // Fallback or Normalization should have handled this, but we'll try to be robust.
        result.errorMessage = "Missing 'voiceChain' node in layer";
        return result;
    }

    juce::ValueTree nodesNode = chainNode.getChildWithName(IDs::NODES);
    juce::ValueTree connectionsNode = chainNode.getChildWithName(IDs::CONNECTIONS);

    // 1. Resolve Units
    std::map<std::string, int> nodeIdToIndex;
    std::map<std::string, uint8_t> nodeIdToSignal; // Moved up for unit resolution scope
    for (int i = 0; i < nodesNode.getNumChildren(); ++i) {
        if (result.plan.unitCount >= CompiledVoicePlan::kMaxUnits) break;

        auto node = nodesNode.getChild(i);
        std::string nodeId = node[IDs::nodeId].toString().toStdString();
        std::string componentId = node[IDs::componentId].toString().toStdString();
        
        CompiledUnit unit;
        unit.nodeId = static_cast<uint32_t>(i); // Internal index for connections
        
        auto& reg = ParamIdRegistry::getInstance();
        auto const* info = catalog.getComponent(componentId);
        if (info) {
            unit.implementationId = info->implementationId;
            
            // Map Parameters from Manifest (ACE 2.1)
            for (int pIdx = 0; pIdx < (int)info->parameters.size() && pIdx < CompiledUnit::kMaxParams; ++pIdx) {
                const auto& pDef = info->parameters[pIdx];
                unit.stableParamIds[pIdx] = reg.getStableId(pDef.id);
            }
        } else {
            unit.implementationId = 0; // Unknown
        }
        
        // Copy base values from node properties if present
        for (int pIdx = 0; pIdx < CompiledUnit::kMaxParams; ++pIdx) {
            uint32_t pId = unit.stableParamIds[pIdx];
            if (pId != 0) {
                juce::String sId = reg.getStringId(pId);
                if (node.hasProperty(sId)) {
                    unit.baseValues[pIdx] = static_cast<float>(node.getProperty(sId));
                }
            }
        }

        nodeIdToIndex[nodeId] = result.plan.unitCount;
        
        // --- ADSR Signal Routing (Case 401) ---
        if (unit.implementationId == 401) {
            nodeIdToSignal[nodeId] = CompiledSignalSpace::adsr(result.plan.unitCount);
        } else if (unit.implementationId == 101 || unit.implementationId == 102) {
             // For diagnostic oscilloscope monitoring of LFOs, etc. (Can be expanded)
        }

        result.plan.units[result.plan.unitCount++] = unit;
    }

    // 2. Resolve Connections
    for (int i = 0; i < connectionsNode.getNumChildren(); ++i) {
        if (result.plan.connectionCount >= CompiledVoicePlan::kMaxConnections) break;

        auto conn = connectionsNode.getChild(i);
        std::string from = conn[IDs::from].toString().toStdString();
        std::string to = conn[IDs::to].toString().toStdString();
        
        if (nodeIdToIndex.count(from) && nodeIdToIndex.count(to)) {
            CompiledConnection cc;
            cc.fromUnit = static_cast<uint8_t>(nodeIdToIndex[from]);
            cc.toUnit = static_cast<uint8_t>(nodeIdToIndex[to]);
            cc.amount = static_cast<float>(conn["amount"]); // Default to 1.0 if missing
            if (cc.amount == 0.0f && !conn.hasProperty("amount")) cc.amount = 1.0f;
            
            result.plan.connections[result.plan.connectionCount++] = cc;
        }
    }

    // 3. Topological Sort (Kahn's Algorithm)
    std::vector<int> sortedIndices;
    std::vector<int> inDegree(result.plan.unitCount, 0);
    for (int i = 0; i < result.plan.connectionCount; ++i) {
        inDegree[result.plan.connections[i].toUnit]++;
    }

    std::vector<int> queue;
    for (int i = 0; i < result.plan.unitCount; ++i) {
        if (inDegree[i] == 0) queue.push_back(i);
    }

    int head = 0;
    while (head < queue.size()) {
        int u = queue[head++];
        sortedIndices.push_back(u);
        
        for (int i = 0; i < result.plan.connectionCount; ++i) {
            if (result.plan.connections[i].fromUnit == u) {
                int v = result.plan.connections[i].toUnit;
                if (--inDegree[v] == 0) queue.push_back(v);
            }
        }
    }

    if (sortedIndices.size() < result.plan.unitCount) {
        result.errorMessage = "Circular dependency detected in VoiceChain";
        result.addDiagnostic(DiagnosticSeverity::Error, "CycleDetected", "Toposort", result.errorMessage);
        return result;
    }

    for (int i = 0; i < sortedIndices.size(); ++i) {
        result.plan.executionOrder[i] = static_cast<uint8_t>(sortedIndices[i]);
    }

    // 4. Resolve Modulation Routes [STRICT MODULARITY VA 2.1]
    // In VA 2.1, we strictly follow the CONNECTIONS node from the ValueTree.
    // If the bus is anything but 'audio', it's a modulation route.
    for (int i = 0; i < connectionsNode.getNumChildren(); ++i) {
        auto conn = connectionsNode.getChild(i);
        std::string bus = conn[IDs::bus].toString().toLowerCase().toStdString();
        
        if (bus != "audio" && bus != "" && bus != "unknown") {
            if (result.plan.modRouteCount >= CompiledVoicePlan::kMaxModRoutes) break;
            
            std::string from = conn[IDs::from].toString().toStdString();
            std::string to = conn[IDs::to].toString().toStdString();
            
            RuntimeModRoute route;
            // Map source: Priority 1: Use pre-resolved signal space index
            if (nodeIdToSignal.count(from)) {
                route.sourceSignal = nodeIdToSignal[from];
            } else {
                // VA 2.1: Use explicit signal space lookup for fixed engine sources (LFO, Velocity, etc.)
                route.sourceSignal = Modulation::ModulationRegistry::getSignalIndex(from);
            }

            // Map target: VA 2.1: Strictly use the Parameter ID defined in the Patchbay/Connection
            std::string targetPort = conn["targetPort"].toString().toStdString();
            if (targetPort.empty()) {
                // Heuristic fallback for legacy presets [DEPRECATION WARNING]
                if (to.find("flt") != std::string::npos) route.targetParamId = ParamIdRegistry::getInstance().getStableId("cutoff");
                else if (to.find("vca") != std::string::npos) route.targetParamId = ParamIdRegistry::getInstance().getStableId("gain");
                else route.targetParamId = 0;
            } else {
                route.targetParamId = ParamIdRegistry::getInstance().getStableId(targetPort);
            }

            route.amount = static_cast<float>(conn["amount"]);
            if (route.amount == 0.0f && !conn.hasProperty("amount")) route.amount = 1.0f;

            result.plan.modRoutes[result.plan.modRouteCount++] = route;
        }
    }

    result.plan.isInitialised = true;
    result.success = true;
    return result;
}

uint32_t VoiceArchitectureCompiler::resolveImplementationId(const std::string& componentId, 
                                                            const Omega::Core::Ace::AceCatalog& catalog)
{
    // [DEPRECATED in VA 2.1] -> Use catalog.getComponent(id)->implementationId directly.
    auto* info = catalog.getComponent(componentId);
    return info ? info->implementationId : 0;
}

} // namespace Voice
} // namespace Core
} // namespace Omega
