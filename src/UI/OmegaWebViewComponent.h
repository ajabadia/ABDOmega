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
                .withNativeFunction("omegaNativeCall", (juce::WebBrowserComponent::NativeFunction) [this](const juce::Array<juce::var>& args, juce::WebBrowserComponent::NativeFunctionCompletion completion) {
                    if (args.size() >= 3) {
                         completion(this->mBridge.handleMessageFromUiAsVar(args[0].toString(), args[1], args[2]));
                    } else {
                        completion(juce::var::undefined());
                    }
                })
                .withNativeFunction("ping", (juce::WebBrowserComponent::NativeFunction) [](const juce::Array<juce::var>& args, juce::WebBrowserComponent::NativeFunctionCompletion completion) {
                    completion(juce::var("pong"));
                })
                .withUserScript(R"(
                    (function() {
                        const setupBridge = () => {
                            if (window.__JUCE__ && window.__JUCE__.backend && !window.omegaNativeCall) {
                                window.__JUCE__.backend.omegaNativeCall = function(type, id, payload) {
                                    return new Promise((resolve) => {
                                        const token = window.__JUCE__.backend.addEventListener("__juce__complete", (data) => {
                                            if (data && data.promiseId === id) {
                                                window.__JUCE__.backend.removeEventListener(token);
                                                resolve(data.result);
                                            }
                                        });
                                        window.__JUCE__.backend.emitEvent("__juce__invoke", { name: "omegaNativeCall", params: [type, id, payload], resultId: id });
                                    });
                                };
                                window.omegaNativeCall = window.__JUCE__.backend.omegaNativeCall;
                                console.log("[BRIDGE] JUCE 8 Native Shim Injected");
                            }
                        };
                        // Run immediately AND on events to be sure
                        setupBridge();
                        document.addEventListener('DOMContentLoaded', setupBridge);
                        window.addEventListener('load', setupBridge);
                    })();
                )")
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
            mBridge.setOnLoadCallback([this](const Core::Preset::OmegaPreset&) {
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
