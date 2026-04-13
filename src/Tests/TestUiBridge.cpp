#include <catch2/catch_test_macros.hpp>
#include <catch2/catch_approx.hpp>
#include "../Plugin/OmegaAudioProcessor.h"
#include "../UI/OmegaUiBridge.h"

using namespace Omega;

TEST_CASE("OmegaUiBridge Direct Testing", "[ui][bridge]")
{
    juce::AudioProcessorValueTreeState::ParameterLayout layout;
    layout.add(std::make_unique<juce::AudioParameterFloat>(juce::ParameterID("TEST_PARAM", 1), "Test Param", 0.0f, 1.0f, 0.5f));
    
    struct MockProcessor : public juce::AudioProcessor
    {
        MockProcessor() : AudioProcessor(BusesProperties()) {}
        void prepareToPlay(double, int) override {}
        void releaseResources() override {}
        void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override {}
        juce::AudioProcessorEditor* createEditor() override { return nullptr; }
        bool hasEditor() const override { return false; }
        const juce::String getName() const override { return "Mock"; }
        bool acceptsMidi() const override { return false; }
        bool producesMidi() const override { return false; }
        double getTailLengthSeconds() const override { return 0.0; }
        int getNumPrograms() override { return 0; }
        int getCurrentProgram() override { return 0; }
        void setCurrentProgram(int) override {}
        const juce::String getProgramName(int) override { return {}; }
        void changeProgramName(int, const juce::String&) override {}
        void getStateInformation(juce::MemoryBlock&) override {}
        void setStateInformation(const void*, int) override {}
    };

    MockProcessor mock;
    Core::Preset::OmegaPreset preset;
    Core::Ace::AceCatalog catalog;
    juce::AudioProcessorValueTreeState apvts(mock, nullptr, "PARAMS", std::move(layout));
    bool loadCallbackCalled = false;
    UI::OmegaUiBridge bridge(nullptr, preset, catalog, nullptr, apvts);
    bridge.setOnLoadCallback([&](const Core::Preset::OmegaPreset&) { loadCallbackCalled = true; });

    SECTION("Era 6: setParameter (Nominal)")
    {
        juce::String msg = R"({
            "type": "setParameter", 
            "requestId": "req-nominal-1", 
            "payload": {"target": "TEST_PARAM", "value": 0.8}
        })";
        juce::String response = bridge.handleMessageFromUi(msg);
        
        auto json = juce::JSON::parse(response);
        REQUIRE(json["type"].toString() == "PARAM_ACK");
        REQUIRE(json["requestId"].toString() == "req-nominal-1");
        REQUIRE(apvts.getRawParameterValue("TEST_PARAM")->load() == Catch::Approx(0.8f));
    }

    SECTION("Era 6: Contract Violation (Legacy setParam)")
    {
        juce::String msg = R"({
            "type": "setParam", 
            "requestId": "req-legacy-1", 
            "payload": {"paramId": "TEST_PARAM", "value": 0.1}
        })";
        juce::String response = bridge.handleMessageFromUi(msg);
        
        auto json = juce::JSON::parse(response);
        REQUIRE(json["type"].toString() == "error");
        REQUIRE(json["error"].toString().contains("CONTRACT_VIOLATION"));
    }

    SECTION("Era 6: getState (Nominal)")
    {
        preset.id = "era6-test-001";
        preset.name = "Nominal Preset";
        apvts.getParameter("TEST_PARAM")->setValueNotifyingHost(0.4f);
        
        juce::String msg = R"({
            "type": "getState", 
            "requestId": "req-nominal-2", 
            "payload": {}
        })";
        juce::String response = bridge.handleMessageFromUi(msg);
        
        auto json = juce::JSON::parse(response);
        auto payload = json["payload"];
        REQUIRE(payload["preset"]["id"].toString() == "era6-test-001");
        REQUIRE(payload["parameters"]["TEST_PARAM"].operator float() == Catch::Approx(0.4f));
    }

    SECTION("Era 6: Parameter Notifications (Nominal)")
    {
        juce::String receivedNotification;
        bridge.setUiMessageCallback([&](const juce::String& msg) {
            receivedNotification = msg;
            notification = juce::JSON::parse(msg);
        });
        
        bridge.parameterChanged("TEST_PARAM", 0.75f);
        REQUIRE(notification["type"].toString() == "PARAM_CHANGE");
        REQUIRE(notification["target"].toString() == "TEST_PARAM");
        REQUIRE(notification["value"].operator float() == Catch::Approx(0.75f));
    }

    SECTION("Era 6: loadPreset (Nominal)")
    {
        juce::String msg = R"({
            "type": "loadPreset", 
            "requestId": "req-load", 
            "payload": {"target": "factory:init"}
        })";
        juce::String response = bridge.handleMessageFromUi(msg);
        
        auto json = juce::JSON::parse(response);
        REQUIRE(json["type"].toString() == "LOAD_ACK");
        REQUIRE(loadCallbackCalled == true);
    }

    SECTION("Era 6: savePreset (Nominal)")
    {
        juce::String msg = R"({
            "type": "savePreset", 
            "requestId": "req-save", 
            "payload": {"name": "My New Preset"}
        })";
        juce::String response = bridge.handleMessageFromUi(msg);
        
        auto json = juce::JSON::parse(response);
        REQUIRE(json["type"].toString() == "SAVE_ACK");
        REQUIRE(json["payload"]["status"].toString() == "SUCCESS_STUB");
        REQUIRE(json["payload"]["name"].toString() == "My New Preset");
    }
}
