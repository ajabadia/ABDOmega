#pragma once

#include "RpcBaseController.h"
#include <juce_core/juce_core.h>
#include "../Core/Providers/ModulationTelemetryHub.h"
#include "../Core/Providers/ModulationTelemetryIndex.h"
#include "../Core/Input/MidiMonitor.h"

namespace Omega {
namespace UI {

    /**
     * @brief Controller for Telemetry, Scope and Signal visualization.
     */
    class RpcTelemetryController : public RpcBaseController {
    public:
        RpcTelemetryController() = default;

        juce::var handleGetTelemetry(const juce::var& requestId, const juce::var& payload);
        juce::var handleGetTelemetrySources(const juce::var& requestId, const juce::var& payload);
        juce::var handleGetScopeState(const juce::var& requestId, const juce::var& payload, const juce::var& currentScopeState);
        juce::var handleSetScopeState(const juce::var& requestId, const juce::var& payload, juce::var& targetScopeState);
        juce::var handleGetModConnections(const juce::var& requestId, const juce::var& payload);
    };

} // namespace UI
} // namespace Omega
