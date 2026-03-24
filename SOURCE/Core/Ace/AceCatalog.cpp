#include "AceCatalog.h"
#include <yaml-cpp/yaml.h>
#include <fstream>
#include <iostream>

namespace Omega::Core::Ace {

    AceCatalog::AceCatalog() {
        // buildFallbacks() se llamará después de registerDefaults o carga de recursos
    }

    std::unique_ptr<AceCatalog> AceCatalog::createFromResources(const std::filesystem::path& resourcesDir) {
        auto catalog = std::make_unique<AceCatalog>();
        
        std::filesystem::path indexFile = resourcesDir / "aceindex.yaml";
        if (!std::filesystem::exists(indexFile)) {
            catalog->registerDefaults();
            catalog->buildFallbacks();
            return catalog;
        }

        try {
            YAML::Node index = YAML::LoadFile(indexFile.string());
            if (index["files"]) {
                for (auto f : index["files"]) {
                    std::filesystem::path componentFile = resourcesDir / f.as<std::string>();
                    if (std::filesystem::exists(componentFile)) {
                        YAML::Node doc = YAML::LoadFile(componentFile.string());
                        if (doc["components"]) {
                            for (auto c : doc["components"]) {
                                ComponentInfo info;
                                info.id = c["id"].as<std::string>();
                                info.name = c["name"].as<std::string>();
                                info.family = c["family"].as<std::string>();
                                info.engine = c["engine"].as<std::string>();
                                info.modelId = c["modelId"].as<std::string>();
                                info.origin = c["origin"].as<std::string>();
                                info.status = c["status"] ? c["status"].as<std::string>() : "active";
                                info.version = c["version"] ? c["version"].as<int>() : 1;
                                
                                if (c["tags"]) {
                                    for (auto t : c["tags"]) info.tags.push_back(t.as<std::string>());
                                }

                                if (c["parameters"]) {
                                    for (auto p : c["parameters"]) {
                                        ParameterDef pdef;
                                        pdef.id = p["id"].as<std::string>();
                                        pdef.label = p["label"].as<std::string>();
                                        pdef.unit = p["unit"].as<std::string>();
                                        pdef.min = p["min"].as<float>();
                                        pdef.max = p["max"].as<float>();
                                        pdef.defaultValue = p["default"].as<float>();
                                        info.parameters.push_back(pdef);
                                        info.defaultParams[pdef.id] = pdef.defaultValue;
                                    }
                                }
                                
                                if (c["modulationTargets"]) {
                                    for (auto mt : c["modulationTargets"]) {
                                        ModTarget target;
                                        target.id = mt["id"].as<std::string>();
                                        target.label = mt["label"].as<std::string>();
                                        target.unit = mt["unit"].as<std::string>();
                                        info.modulationTargets.push_back(target);
                                    }
                                }

                                catalog->registerComponent(info);
                            }
                        }
                    }
                }
            }
        } catch (const std::exception& e) {
            std::cerr << "Error parsing ACE YAML: " << e.what() << std::endl;
            // Fallback a defaults si hay error crítico
            catalog->registerDefaults();
        }

        catalog->buildFallbacks();
        return catalog;
    }

    void AceCatalog::registerComponent(const ComponentInfo& info) {
        mComponents[info.id] = info;
    }

    const ComponentInfo* AceCatalog::getComponent(const std::string& id) const {
        auto it = mComponents.find(id);
        if (it != mComponents.end()) return &it->second;
        return nullptr;
    }

    std::vector<const ComponentInfo*> AceCatalog::listByFamilyAndEngine(const std::string& family, const std::string& engine) const {
        std::vector<const ComponentInfo*> results;
        for (auto const& [id, info] : mComponents) {
            if (info.family == family && info.engine == engine) {
                results.push_back(&info);
            }
        }
        return results;
    }

    std::string AceCatalog::getFallbackId(const std::string& family, const std::string& engine) const {
        auto key = makeFallbackKey(family, engine);
        auto it = mFallbacks.find(key);
        if (it != mFallbacks.end()) return it->second;
        return "";
    }

    void AceCatalog::registerDefaults() {
        // Juno DCO (Legacy fallback)
        registerComponent({"OSC-VA-001", "Juno DCO", "Oscillator", "VirtualAnalog", "RolandJunoDco", "Roland Juno-106", "active", 1, {"va", "roland", "juno", "dco"}, 
            {{"tune", "Tune", "semitones", -24.0f, 24.0f, 0.0f}, {"sub", "Sub level", "norm", 0.0f, 1.0f, 0.0f}, {"pwm", "Pulse Width", "norm", 0.0f, 1.0f, 0.5f}},
            {}, {{"tune", 0.0f}, {"sub", 0.0f}, {"pwm", 0.5f}}});

        // Roland RE-201 Space Echo (FX-DL-002)
        registerComponent({"FX-DL-002", "Space Echo", "Delay", "RolandRE201", "Roland", "RE-201 Space Echo", "active", 1, {"delay", "tape", "roland", "re201", "echo"},
            {
                {"speed", "Repeat Rate", "norm", 0.0f, 1.0f, 0.5f},
                {"intensity", "Intensity", "norm", 0.0f, 1.0f, 0.4f},
                {"echo_vol", "Echo Vol", "norm", 0.0f, 1.0f, 0.5f},
                {"reverb_vol", "Reverb Vol", "norm", 0.0f, 1.0f, 0.3f},
                {"mode", "Mode Selector", "int", 1.0f, 12.0f, 1.0f},
                {"wow_flutter", "Wow & Flutter", "norm", 0.0f, 1.0f, 0.2f},
                {"drive", "Input Drive", "norm", 0.0f, 1.0f, 0.0f}
            },
            {}, 
            {{"speed", 0.5f}, {"intensity", 0.4f}, {"echo_vol", 0.5f}, {"reverb_vol", 0.3f}, {"mode", 1.0f}, {"wow_flutter", 0.2f}, {"drive", 0.0f}}});

        // Korg Prophecy Unified Wind Model (OSC-PD-001)
        registerComponent({"OSC-PD-001", "Prophecy Wind", "Oscillator", "KorgMOSS", "Korg", "Prophecy Wind Refined", "active", 1, {"brass", "reed", "wind", "moss"},
            {{"tension", "Lip Tension", "norm", 0.0f, 1.0f, 0.5f}, {"pressure", "Pressure", "norm", 0.0f, 1.0f, 0.5f}, {"noise", "Noise Level", "norm", 0.0f, 1.0f, 0.1f}},
            {}, {{"tension", 0.5f}, {"pressure", 0.5f}, {"noise", 0.1f}}});

        // Korg Prophecy Noise+Comb (OSC-PM-009)
        registerComponent({"OSC-PM-009", "Noise+Comb", "Oscillator", "KorgMOSS", "Korg", "Prophecy Noise+Comb", "active", 1, {"noise", "comb", "industrial"},
            {{"noise", "Noise Level", "norm", 0.0f, 1.0f, 0.5f}, {"feedback", "Feedback", "norm", 0.0f, 1.0f, 0.8f}, {"cutoff", "Loop Cutoff", "norm", 0.01f, 0.99f, 0.5f}},
            {}, {{"noise", 0.5f}, {"feedback", 0.8f}, {"cutoff", 0.5f}}});

        registerComponent({"FLT-RES-001", "Resonant Bank", "Filter", "KorgMOSS", "Korg", "Prophecy Filter Bank", "active", 1, {"filter", "bank", "formant"},
            {{"cutoff", "Master Cutoff", "hz", 20.0f, 20000.0f, 1000.0f}, {"spread", "Spread", "norm", 0.5f, 2.0f, 1.2f}, {"resonance", "Resonance", "norm", 0.0f, 1.0f, 0.5f}},
            {}, {{"cutoff", 1000.0f}, {"spread", 1.2f}, {"resonance", 0.5f}}});

        // Korg Prophecy Electric Piano Model (OSC-EP-001)
        registerComponent({"OSC-EP-001", "MOSS EP", "Oscillator", "KorgMOSS", "Korg", "Electric Piano Physical Model", "active", 1, {"piano", "tine", "reed", "modeling"},
            {{"hardness", "Hammer Hardness", "norm", 0.0f, 1.0f, 0.5f}},
            {}, {{"hardness", 0.5f}}});

        // Korg Prophecy Drawbar Organ Model (OSC-OR-001)
        registerComponent({"OSC-OR-001", "MOSS Organ", "Oscillator", "KorgMOSS", "Korg", "Drawbar Organ Model", "active", 1, {"organ", "drawbar", "hammond"},
            {{"drawbar1", "16'", "norm", 0.0f, 1.0f, 0.8f}, {"drawbar2", "5 1/3'", "norm", 0.0f, 1.0f, 0.0f}, {"drawbar3", "8'", "norm", 0.0f, 1.0f, 0.8f}},
            {}, {{"drawbar1", 0.8f}, {"drawbar2", 0.0f}, {"drawbar3", 0.8f}}});

        // Korg Prophecy Waveshaper (PRP-SH-001)
        registerComponent({"PRP-SH-001", "MOSS Shaper", "Waveshaper", "KorgMOSS", "Korg", "Nonlinear Waveshaper", "active", 1, {"shaper", "dist", "fold"},
            {{"drive", "Drive", "norm", 0.0f, 1.0f, 0.5f}, {"mix", "Mix", "norm", 0.0f, 1.0f, 1.0f}},
            {}, {{"drive", 0.5f}, {"mix", 1.0f}}});

        registerComponent({"OSC-PM-010", "JP Feedback", "Oscillator", "JP8080", "Roland", "JP-8080 Chaotic Feedback Saw", "active", 1, {"saw", "feedback", "metallic", "industrial"},
            {{"feedback", "Feedback Amt", "norm", 0.0f, 1.0f, 0.6f}, {"speed", "Comb Speed", "norm", 0.0f, 1.0f, 0.5f}},
            {}, {{"feedback", 0.6f}, {"speed", 0.5f}}});

        // Roland JP-8080 Dual Oscillator (OSC-PM-011)
        registerComponent({"OSC-PM-011", "JP Dual", "Oscillator", "JP8080", "Roland", "JP-8080 Dual Osc with X-MOD/Sync", "active", 1, {"fm", "sync", "dual", "va"},
            {{"xmod", "X-Mod Depth", "norm", 0.0f, 1.0f, 0.0f}, {"detune", "OSC2 Detune", "semi", -24.0f, 24.0f, 0.0f}, {"sync", "Sync", "bool", 0.0f, 1.0f, 0.0f}},
            {}, {{"xmod", 0.0f}, {"detune", 0.0f}, {"sync", 0.0f}}});

        // Korg Prophecy Arpeggiator (ARP-PRP-001)
        registerComponent({"ARP-PRP-001", "MOSS Arp", "Arpeggiator", "KorgMOSS", "Korg", "Prophecy Classic & User Arp", "active", 1, {"arp", "pattern", "user"},
            {{"mode", "Mode", "enum", 0.0f, 5.0f, 0.0f}, {"range", "Octave Range", "int", 1.0f, 4.0f, 1.0f}},
            {}, {{"mode", 0.0f}, {"range", 1.0f}}});

        // OMEGA Motion Control (MOD-MOT-001)
        registerComponent({"MOD-MOT-001", "Motion Control", "Modulation", "OMEGA", "ABD", "Real-time Parameter Recorder", "active", 1, {"motion", "recorder", "automation"},
            {{"record", "Record", "bool", 0.0f, 1.0f, 0.0f}, {"play", "Play", "bool", 0.0f, 1.0f, 1.0f}},
            {}, {{"record", 0.0f}, {"play", 1.0f}}});
    }

    void AceCatalog::buildFallbacks() {
        for (auto const& [id, info] : mComponents) {
            auto key = makeFallbackKey(info.family, info.engine);
            if (mFallbacks.find(key) == mFallbacks.end()) {
                mFallbacks[key] = id;
            }
        }
    }

    std::string AceCatalog::makeFallbackKey(const std::string& family, const std::string& engine) {
        return family + "|" + engine;
    }

} // namespace Omega::Core::Ace
