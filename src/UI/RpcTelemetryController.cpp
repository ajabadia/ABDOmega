#include "RpcTelemetryController.h"

namespace Omega {
namespace UI {

    juce::var RpcTelemetryController::handleGetTelemetry(const juce::var& requestId, const juce::var& payload) {
        using namespace Core::Providers;
        auto pinsToRequest = payload["pins"]; // Array of semantic IDs (string)
        auto& hub = ModulationTelemetryHub::getInstance();
        auto& registry = ModulationTelemetryRegistry::getInstance();
        juce::DynamicObject::Ptr results = new juce::DynamicObject();

        int resolution = (int)mSettings.getSettingValue("scopeResolution");
        if (resolution <= 0) resolution = 1024;

        if (pinsToRequest.isArray()) {
            auto* arr = pinsToRequest.getArray();
            for (int i = 0; i < arr->size(); ++i) {
                std::string pinId = arr->getReference(i).toString().toStdString();
                int idx = registry.getPinIndex(pinId);

                if (idx == -1) continue;

                // Special Case: System MIDI Monitor (Raw Events)
                if (pinId == "system:midi_monitor") {
                    auto events = Core::Input::MidiMonitor::getInstance().getRecentEvents(32);
                    juce::Array<juce::var> midiArr;
                    for (const auto& e : events) {
                        juce::DynamicObject::Ptr obj = new juce::DynamicObject();
                        obj->setProperty("type", (int)e.type);
                        obj->setProperty("ch", (int)e.channel);
                        obj->setProperty("d1", (int)e.data1);
                        obj->setProperty("d2", (int)e.data2); 
                        obj->setProperty("ts", e.timestamp);
                        midiArr.add(juce::var(obj.get()));
                    }
                    results->setProperty(juce::String(pinId), midiArr);
                    continue;
                }

                // Two-Speed Logic
                juce::DynamicObject::Ptr pinData = new juce::DynamicObject();
                
                // 1. DISCRETE (Peak-Hold) - For LEDs/Meters
                pinData->setProperty("peak", (double)hub.getPeakAndReset(idx));
                pinData->setProperty("latest", (double)hub.getLatest(idx));

                // 2. STREAMING (Waveform) - For Scope (Only if requested by flag or if relevant)
                if ((bool)payload["streaming"]) {
                    std::vector<float> history(resolution);
                    hub.getHistory(idx, history.data(), resolution);
                    juce::Array<juce::var> trace;
                    for (float v : history) trace.add(v);
                    pinData->setProperty("history", trace);
                }

                results->setProperty(juce::String(pinId), juce::var(pinData.get()));
            }
        }
        return createResponse("TELEMETRY_DATA", requestId, {}, results.get());
    }

    juce::var RpcTelemetryController::handleGetTelemetrySources(const juce::var& requestId, const juce::var&) {
        using namespace Core::Providers;
        auto activePins = ModulationTelemetryRegistry::getInstance().getActivePins();
        
        juce::Array<juce::var> sources;
        for (const auto& pin : activePins) {
            juce::DynamicObject::Ptr obj = new juce::DynamicObject();
            obj->setProperty("id", juce::String(pin.id));
            obj->setProperty("label", juce::String(pin.label));
            obj->setProperty("type", (int)pin.type);
            sources.add(juce::var(obj.get()));
        }

        juce::DynamicObject::Ptr results = new juce::DynamicObject();
        results->setProperty("sources", sources);
        return createResponse("TELEMETRY_SOURCES", requestId, {}, results.get());
    }

    juce::var RpcTelemetryController::handleGetScopeState(const juce::var& requestId, const juce::var&, const juce::var& currentScopeState) {
        return createResponse("SCOPE_STATE", requestId, {}, currentScopeState);
    }

    juce::var RpcTelemetryController::handleSetScopeState(const juce::var& requestId, const juce::var& payload, juce::var& targetScopeState) {
        targetScopeState = payload;
        return createResponse("SCOPE_ACK", requestId, {}, true);
    }

    juce::var RpcTelemetryController::handleGetModConnections(const juce::var& requestId, const juce::var&) {
        return createResponse("MOD_CONNECTIONS", requestId, {}, juce::Array<juce::var>());
    }

} // namespace UI
} // namespace Omega
