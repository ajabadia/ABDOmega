#pragma once

#include <juce_core/juce_core.h>
#include <juce_data_structures/juce_data_structures.h>
#include <vector>
#include <string>
#include <map>
#include "../../Core/Voice/CompiledVoicePlan.h"
#include "../Ace/AceCatalog.h"

namespace Omega {
namespace Core {
namespace Voice {

    /**
     * @brief Severity levels for compiler diagnostics.
     */
    enum class DiagnosticSeverity {
        Info,
        Warning,
        Error
    };

    /**
     * @brief A single diagnostic message from the compilation process.
     */
    struct Diagnostic {
        DiagnosticSeverity severity;
        std::string code;
        std::string scope; // e.g., "Oscillator", "Filter", "Connection"
        std::string message;
    };

    /**
     * @brief Result of a compilation attempt.
     */
    struct CompilerResult {
        bool success = false;
        std::string errorMessage;
        CompiledVoicePlan plan;
        std::vector<Diagnostic> diagnostics;
        
        void addDiagnostic(DiagnosticSeverity s, const std::string& code, const std::string& scope, const std::string& msg) {
            diagnostics.push_back({s, code, scope, msg});
        }
    };

    /**
     * @brief Compiles a declarative VoiceChain (from ValueTree/Preset) into a flat, 
     * topologically ordered CompiledVoicePlan for the audio thread.
     */
    class VoiceArchitectureCompiler {
    public:
        /**
         * @brief Main entry point for voice architecture compilation.
         * @param layerTree The ValueTree node representing the layer containing 'voiceChain'.
         * @param catalog The global ACE component catalog for component resolution.
         */
        static CompilerResult compile(const juce::ValueTree& layerTree, 
                                      const Omega::Core::Ace::AceCatalog& catalog);

    private:
        /**
         * @brief Computes the execution order based on signal connections.
         */
        static bool computeTopologicalOrder(const juce::ValueTree& voiceChain, 
                                           std::vector<int>& outOrder, 
                                           std::string& outError);

        /**
         * @brief Resolves a component ID to a numeric implementation ID.
         */
        static uint32_t resolveImplementationId(const std::string& componentId, 
                                               const Omega::Core::Ace::AceCatalog& catalog);
    };

} // namespace Voice
} // namespace Core
} // namespace Omega
