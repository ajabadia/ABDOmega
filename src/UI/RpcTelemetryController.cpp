#include "RpcTelemetryController.h"

namespace Omega {
namespace UI {

    juce::var RpcTelemetryController::handleGetTelemetry(const juce::var& requestId, const juce::var& payload) {
        using namespace Core::Providers;
        using namespace Core::Input;
        auto indices = payload["indices"];
        auto& hub = ModulationTelemetryHub::getInstance();
        juce::DynamicObject::Ptr results = new juce::DynamicObject();

        if (indices.isArray()) {
            auto* arr = indices.getArray();
            for (int i = 0; i < arr->size(); ++i) {
                int idx = (int)arr->getReference(i);
                juce::Identifier idKey(std::to_string(idx));

                if (idx == (int)TelemetryIndex::Midi_Traffic) {
                    auto events = MidiMonitor::getInstance().getRecentEvents(32);
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
                    results->setProperty(idKey, midiArr);
                } else {
                    std::vector<float> data(ModulationTelemetryHub::kHistoryLength);
                    hub.getHistory(idx, data.data());
                    juce::Array<juce::var> traceData;
                    for (float v : data) traceData.add(v);

                    juce::DynamicObject::Ptr signalObj = new juce::DynamicObject();
                    signalObj->setProperty("history", traceData);
                    signalObj->setProperty("latest", (double)hub.getLatest(idx));
                    results->setProperty(idKey, juce::var(signalObj.get()));
                }
            }
        }
        return createResponse("TELEMETRY_DATA", requestId, {}, results.get());
    }

    juce::var RpcTelemetryController::handleGetTelemetrySources(const juce::var& requestId, const juce::var&) {
        using namespace Core::Providers;
        juce::Array<juce::var> audioSources;
        juce::Array<juce::var> modSources;
        
        struct SourceDef { int index; const char* name; const char* category; };
        SourceDef defs[] = {
            { (int)TelemetryIndex::Audio_DCO_Main,   "DCO Main",  "Audio" },
            { (int)TelemetryIndex::Audio_DCO_Sub,    "DCO Sub",   "Audio" },
            { (int)TelemetryIndex::Audio_Noise,      "Noise",     "Audio" },
            { (int)TelemetryIndex::Audio_VCF_Out,    "VCF Out",   "Audio" },
            { (int)TelemetryIndex::Audio_HPF_Out,    "HPF Out",   "Audio" },
            { (int)TelemetryIndex::Audio_Bus_PreFX,  "Bus PreFX", "Audio" },
            { (int)TelemetryIndex::Audio_FX_Out,     "FX Out",    "Audio" },
            { (int)TelemetryIndex::Audio_Master_Out, "Final Out", "Audio" },
            
            { (int)TelemetryIndex::Mod_LFO1,         "LFO 1",     "Modulation" },
            { (int)TelemetryIndex::Mod_LFO2,         "LFO 2",     "Modulation" },
            { (int)TelemetryIndex::Mod_ENV1_Amp,     "Env 1 (A)", "Modulation" },
            { (int)TelemetryIndex::Mod_ENV2_Filter,  "Env 2 (F)", "Modulation" },
            { (int)TelemetryIndex::Mod_EnvFollower,  "Env Fold",  "Modulation" },
            { (int)TelemetryIndex::Mod_ModWheel,     "ModWheel",  "Modulation" },
            { (int)TelemetryIndex::Mod_Pitch,        "Pitch",     "Modulation" }
        };

        for (int i=0; i < (int)(sizeof(defs)/sizeof(defs[0])); ++i) {
            auto const& d = defs[i];
            juce::DynamicObject::Ptr obj = new juce::DynamicObject();
            obj->setProperty(juce::Identifier("index"), juce::var(d.index));
            obj->setProperty(juce::Identifier("name"), juce::var(d.name));
            if (juce::String(d.category) == "Audio") audioSources.add(juce::var(obj.get()));
            else modSources.add(juce::var(obj.get()));
        }

        juce::DynamicObject::Ptr results = new juce::DynamicObject();
        results->setProperty("audio", audioSources);
        results->setProperty("modulation", modSources);
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
