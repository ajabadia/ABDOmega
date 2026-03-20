#include "ModulationGraph.h"
#include "ModulationRuntime.h"
#include <algorithm>
#include <map>
#include <queue>

namespace Omega::Core::Modulation {

    NodeId ModulationGraph::addNode(NodeType type, const std::string& name, SignalType outputType) {
        auto node = std::make_unique<ModNode>();
        node->id = mNextId++;
        node->type = type;
        node->name = name;
        node->outputType = outputType;
        mNodes.push_back(std::move(node));
        return mNodes.back()->id;
    }

    void ModulationGraph::connect(NodeId source, uint8_t sourceOut, NodeId dest, uint8_t destIn, float amount) {
        mConnections.push_back({ source, sourceOut, dest, destIn, amount });
    }

    CompileResult ModulationGraph::compile() {
        CompileResult result;
        result.success = false;

        std::map<NodeId, std::vector<NodeId>> adj;
        std::map<NodeId, int> inDegree;

        for (const auto& node : mNodes) inDegree[node->id] = 0;
        for (const auto& conn : mConnections) {
            adj[conn.sourceNode].push_back(conn.destNode);
            inDegree[conn.destNode]++;
        }

        std::queue<NodeId> q;
        std::vector<NodeId> executionOrder;
        for (const auto& node : mNodes) {
            if (inDegree[node->id] == 0) q.push(node->id);
        }

        while (!q.empty()) {
            NodeId u = q.front(); q.pop();
            executionOrder.push_back(u);
            for (NodeId v : adj[u]) {
                inDegree[v]--;
                if (inDegree[v] == 0) q.push(v);
            }
        }

        if (executionOrder.size() != mNodes.size()) {
            result.errorMessage = "Ciclo detectado en el ModulationGraph sin compensación de delay.";
            return result;
        }

        result.runtime = std::make_unique<ModulationRuntime>();
        for (NodeId id : executionOrder) {
            auto it = std::find_if(mNodes.begin(), mNodes.end(), [id](const auto& n) { return n->id == id; });
            if (it != mNodes.end()) {
                RuntimeNode rtNode{};
                rtNode.type = (uint8_t)(*it)->type;
                rtNode.outputType = (uint8_t)(*it)->outputType;
                rtNode.outputIndex = (uint8_t)id;
                
                int inputIdx = 0;
                rtNode.inputIndices.fill(255);
                for (const auto& conn : mConnections) {
                    if (conn.destNode == id && inputIdx < 4) {
                        rtNode.inputIndices[inputIdx] = (uint8_t)conn.sourceNode;
                        rtNode.weights[inputIdx] = conn.amount;
                        inputIdx++;
                    }
                }
                result.runtime->addRuntimeNode(rtNode);
            }
        }

        result.success = true;
        return result;
    }

} // namespace Omega::Core::Modulation
