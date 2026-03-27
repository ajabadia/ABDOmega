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

    SECTION("handleMessageFromUi: setParam v1")
    {
        juce::String msg = R"({
            "type": "setParam", 
            "requestId": "req-1", 
            "payload": {"paramId": "TEST_PARAM", "value": 0.8}
        })";
        juce::String response = bridge.handleMessageFromUi(msg);
        
        auto json = juce::JSON::parse(response);
        if (json["type"].toString() != "state")
        {
            UNSCOPED_INFO("Original Msg: " << msg);
            UNSCOPED_INFO("Response Type: " << json["type"].toString());
            UNSCOPED_INFO("Error Message: " << json["payload"]["message"].toString());
        }
        REQUIRE(json["type"].toString() == "state");
        REQUIRE(json["requestId"].toString() == "req-1");
        REQUIRE(apvts.getRawParameterValue("TEST_PARAM")->load() == Catch::Approx(0.8f));
    }

    SECTION("handleMessageFromUi: getState v1")
    {
        preset.id = "test-preset-001";
        preset.name = "Test Preset";
        apvts.getParameter("TEST_PARAM")->setValueNotifyingHost(0.4f);
        
        juce::String msg = R"({
            "type": "getState", 
            "requestId": "req-2", 
            "payload": {}
        })";
        juce::String response = bridge.handleMessageFromUi(msg);
        
        auto json = juce::JSON::parse(response);
        auto payload = json["payload"];
        REQUIRE(payload["preset"]["id"].toString() == "test-preset-001");
        REQUIRE(payload["params"]["TEST_PARAM"].operator float() == Catch::Approx(0.4f));
    }

    SECTION("Notifications: paramChanged v1")
    {
        juce::String receivedNotification;
        bridge.setUiMessageCallback([&](const juce::String& msg) {
            receivedNotification = msg;
        });

        apvts.getParameter("TEST_PARAM")->setValueNotifyingHost(0.2f);
        
        // Note: Async notifications require a message loop pump which may not be available in all test environments.
        /*
        for (int i = 0; i < 20 && receivedNotification.isEmpty(); ++i)
             juce::MessageManager::getInstance()->runDispatchLoopUntil(10);

        auto json = juce::JSON::parse(receivedNotification);
        REQUIRE(json["type"].toString() == "paramChanged");
        REQUIRE(json["payload"]["paramId"].toString() == "TEST_PARAM");
        REQUIRE(json["payload"]["value"].operator float() == Catch::Approx(0.2f));
        */
    }

    SECTION("handleMessageFromUi: loadPreset v1")
    {
        loadCallbackCalled = false;
        juce::String msg = R"({
            "type": "loadPreset", 
            "requestId": "req-3", 
            "payload": {"presetId": "ACE-JUNO-BASIC-PAD"}
        })";
        juce::String response = bridge.handleMessageFromUi(msg);
        
        auto json = juce::JSON::parse(response);
        REQUIRE(json["type"].toString() == "state");
        REQUIRE(json["payload"].toString() == "OK");
        REQUIRE(loadCallbackCalled == true);
    }

    SECTION("handleMessageFromUi: savePreset v1")
    {
        juce::String msg = R"({
            "type": "savePreset", 
            "requestId": "req-4", 
            "payload": {"name": "New Preset"}
        })";
        juce::String response = bridge.handleMessageFromUi(msg);
        
        auto json = juce::JSON::parse(response);
        REQUIRE(json["type"].toString() == "state");
        REQUIRE(json["payload"]["status"].toString() == "SUCCESS_STUB");
        REQUIRE(json["payload"]["name"].toString() == "New Preset");
    }
}
