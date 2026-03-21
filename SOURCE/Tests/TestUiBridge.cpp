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
    juce::AudioProcessorValueTreeState apvts(mock, nullptr, "PARAMS", std::move(layout));
    UI::OmegaUiBridge bridge(apvts);

    SECTION("handleMessageFromUi: setParam")
    {
        juce::String msg = R"({"id": 1, "method": "setParam", "params": {"id": "TEST_PARAM", "value": 0.8}})";
        juce::String response = bridge.handleMessageFromUi(msg);
        
        auto json = juce::JSON::parse(response);
        REQUIRE(json["result"].toString() == "OK");
        REQUIRE(apvts.getRawParameterValue("TEST_PARAM")->load() == Catch::Approx(0.8f));
    }

    SECTION("handleMessageFromUi: getState")
    {
        apvts.getParameter("TEST_PARAM")->setValueNotifyingHost(0.4f);
        
        juce::String msg = R"({"id": 2, "method": "getState", "params": {}})";
        juce::String response = bridge.handleMessageFromUi(msg);
        
        auto json = juce::JSON::parse(response);
        auto result = json["result"];
        REQUIRE(result["TEST_PARAM"].operator float() == Catch::Approx(0.4f));
    }

    SECTION("handleMessageFromUi: Unknown method")
    {
        juce::String msg = R"({"id": 3, "method": "nonExistent", "params": {}})";
        juce::String response = bridge.handleMessageFromUi(msg);
        
        auto json = juce::JSON::parse(response);
        REQUIRE(json["error"].toString().contains("Unknown method"));
    }

    SECTION("Notifications: paramChanged")
    {
        juce::String receivedNotification;
        bridge.setUiMessageCallback([&](const juce::String& msg) {
            receivedNotification = msg;
        });

        apvts.getParameter("TEST_PARAM")->setValueNotifyingHost(0.2f);
        
        auto json = juce::JSON::parse(receivedNotification);
        REQUIRE(json["method"].toString() == "paramChanged");
        REQUIRE(json["params"]["id"].toString() == "TEST_PARAM");
        REQUIRE(json["params"]["value"].operator float() == Catch::Approx(0.2f));
    }
}
