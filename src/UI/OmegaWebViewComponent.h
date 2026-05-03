#pragma once

#include <juce_gui_extra/juce_gui_extra.h>
#include <optional>
#include <vector>
#include <cstring>
#include <functional>
#include "../Core/BuildVersion.h"
#include "OmegaUiBridge.h"

namespace Omega {
    namespace UI {

    /**
     * @brief Web-based UI Container for OMEGA.
     */
    class OmegaWebViewComponent : public juce::Component {
    public:
        OmegaWebViewComponent(OmegaUiBridge& bridge)
             : mBridge(bridge),
               mWebView(juce::WebBrowserComponent::Options{}
                .withBackend(juce::WebBrowserComponent::Options::Backend::webview2)
                .withWinWebView2Options(juce::WebBrowserComponent::Options::WinWebView2()
                    .withUserDataFolder(juce::File::getSpecialLocation(juce::File::tempDirectory)
                        .getChildFile("OmegaSynth_WebView2_V74_Diagnostic")))
                .withNativeIntegrationEnabled(true)
                .withInitialisationData("omega", createInitData())
                .withEventListener("omega_rpc_query", [this](juce::var p) {
                    juce::Logger::writeToLog("!!! [BRIDGE] RPC QUERY RECEIVED via EVENT !!!");
                    juce::var type = p["type"];
                    juce::var rid = p["requestId"];
                    juce::var payload = p["payload"];
                    
                    juce::var response = this->mBridge.handleMessageFromUiAsVar(type.toString(), rid, payload);
                    // Send response back via the push channel
                    mWebView.evaluateJavascript("if(window.handleOmegaMessage) window.handleOmegaMessage(" + juce::JSON::toString(response) + ")", nullptr);
                })
#if JUCE_WEB_BROWSER_RESOURCE_PROVIDER_AVAILABLE
                .withResourceProvider([this](const juce::String& url) -> std::optional<juce::WebBrowserComponent::Resource> {
                    juce::String path = url;
                    if (path.contains("?")) path = path.upToFirstOccurrenceOf("?", false, false);

                    if (path.startsWith("https://juce.localhost/")) path = path.substring(23);
                    else if (path.startsWith("http://juce.localhost/")) path = path.substring(22);
                    else if (path.startsWith("/")) path = path.substring(1);
                    if (path.isEmpty() || path == "/") path = "index.html";

                    // All WebUI files (HTML, JS, CSS, SVG assets) live in ui/
                    juce::File webUiDir("d:\\desarrollos\\ABDOmega\\ui");
                    juce::File targetFile = webUiDir.getChildFile(path.replace("/", "\\"));
                    
                    if (targetFile.existsAsFile()) {
                        juce::MemoryBlock mb;
                        targetFile.loadFileAsData(mb);
                        
                        auto getMime = [](const juce::String& p) {
                            if (p.endsWithIgnoreCase(".html")) return "text/html";
                            if (p.endsWithIgnoreCase(".js")) return "application/javascript";
                            if (p.endsWithIgnoreCase(".css")) return "text/css";
                            if (p.endsWithIgnoreCase(".png")) return "image/png";
                            if (p.endsWithIgnoreCase(".svg")) return "image/svg+xml";
                            return "application/octet-stream";
                        };

                        const auto* rawData = static_cast<const std::byte*>(mb.getData());
                        std::vector<std::byte> data(rawData, rawData + mb.getSize());
                        return juce::WebBrowserComponent::Resource { std::move(data), getMime(path) };
                    }
                    return std::nullopt;
                })
#endif
               )
        {
            addAndMakeVisible(mWebView);
            
            mBridge.setUiMessageCallback([this](const juce::String& json) {
                mWebView.evaluateJavascript("if(window.handleOmegaMessage) window.handleOmegaMessage(" + json + ")", nullptr);
            });

            // Wire the preset-load callback: when a module is added, trigger forceRepaint()
            // which serializes the preset and broadcasts onStateUpdate to the WebUI.
            mBridge.setOnLoadCallback([this]() {
                mBridge.forceRepaint();
            });

            mWebView.goToURL(juce::WebBrowserComponent::getResourceProviderRoot());
        }

        void resized() override {
            mWebView.setBounds(getLocalBounds());
        }

    private:
        static juce::var createInitData() {
            juce::DynamicObject::Ptr obj = new juce::DynamicObject();
            obj->setProperty("version", "1.0.0");
            obj->setProperty("build", OMEGA_BUILD_VERSION);
            obj->setProperty("timestamp", OMEGA_BUILD_TIMESTAMP);
            return juce::var(obj.get());
        }

        OmegaUiBridge& mBridge;
        juce::WebBrowserComponent mWebView;

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(OmegaWebViewComponent)
    };

    } // namespace UI
} // namespace Omega
