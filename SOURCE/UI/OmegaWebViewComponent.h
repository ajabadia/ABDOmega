#pragma once

#include <juce_gui_extra/juce_gui_extra.h>
#include "../Core/BuildVersion.h"
#include "OmegaUiBridge.h"

namespace Omega {
    namespace UI {

    /**
     * @brief Contenedor para el WebView de OMEGA que utiliza OmegaUiBridge.
     * [Architecture]: Encapsula juce::WebBrowserComponent y actúa como "piel" para el "sistema nervioso".
     * [JUCE8]: Utiliza la nueva API de WebBrowserComponent::Options.
     */
    class OmegaWebViewComponent : public juce::Component {
    public:
        OmegaWebViewComponent(OmegaUiBridge& bridge)
             : mBridge(bridge),                mWebView(juce::WebBrowserComponent::Options{}
                        .withBackend(juce::WebBrowserComponent::Options::Backend::webview2)
                        .withWinWebView2Options(juce::WebBrowserComponent::Options::WinWebView2()
                            .withUserDataFolder(juce::File::getSpecialLocation(juce::File::tempDirectory)
                                .getChildFile("OmegaSynth_WebView2_V16_FINAL")))
                        .withNativeIntegrationEnabled(true)
                        .withInitialisationData("appName", "OMEGA Synth")
                        .withInitialisationData("version", "1.0.0")
                        .withInitialisationData("build", OMEGA_BUILD_VERSION)
                        .withInitialisationData("timestamp", OMEGA_BUILD_TIMESTAMP)
                        .withResourceProvider([this](const juce::String& url) -> std::optional<juce::WebBrowserComponent::Resource> {
                            juce::String path = url;
                            if (path.startsWith("https://juce.localhost/")) path = path.substring(23);
                            else if (path.startsWith("http://juce.localhost/")) path = path.substring(22);
                            else if (path.startsWith("/")) path = path.substring(1);
                            if (path.isEmpty() || path == "/") path = "index.html";

                            juce::File webUiDir("d:\\desarrollos\\ABDOmega\\WebUI");
                            juce::File file = webUiDir.getChildFile(path.replace("/", "\\"));
                            
                            if (file.existsAsFile())
                            {
                                auto getMimeType = [](const juce::String& filename) {
                                    if (filename.endsWithIgnoreCase(".html")) return "text/html";
                                    if (filename.endsWithIgnoreCase(".css"))  return "text/css";
                                    if (filename.endsWithIgnoreCase(".js"))   return "application/javascript";
                                    return "application/octet-stream";
                                };
                                juce::MemoryBlock mb;
                                file.loadFileAsData(mb);
                                std::vector<std::byte> data(mb.getSize());
                                std::memcpy(data.data(), mb.getData(), mb.getSize());
                                return juce::WebBrowserComponent::Resource { std::move(data), getMimeType(file.getFileName()) };
                            }
                            return std::nullopt;
                        })
                        .withNativeFunction ("emitEvent", [this] (const juce::Array<juce::var>& args, juce::WebBrowserComponent::NativeFunctionCompletion completion) {
                            if (args.size() >= 2 && args[0].toString() == "omegaMessage")
                                completion (mBridge.handleMessageFromUiAsVar (juce::JSON::toString (args[1], false)));
                            else
                                completion (juce::var::undefined());
                        })
                        .withNativeFunction ("getState", [this] (const juce::Array<juce::var>& args, juce::WebBrowserComponent::NativeFunctionCompletion completion) {
                            completion (mBridge.handleMessageFromUiAsVar ("{\"type\":\"getState\",\"requestId\":" + (args.size() > 0 ? args[0].toString() : "0") + "}"));
                        })
                        .withNativeFunction ("listPresets", [this] (const juce::Array<juce::var>& args, juce::WebBrowserComponent::NativeFunctionCompletion completion) {
                            completion (mBridge.handleMessageFromUiAsVar ("{\"type\":\"listPresets\",\"requestId\":" + (args.size() > 0 ? args[0].toString() : "0") + "}"));
                        })
                        .withKeepPageLoadedWhenBrowserIsHidden()
                )

        {
            addAndMakeVisible(mWebView);
            
            mBridge.setUiMessageCallback([this](const juce::String& json) {
#if JUCE_USE_WIN_WEBVIEW2
                mWebView.evaluateJavascript("window.handleOmegaMessage(" + json + ")", nullptr);
#endif
            });

            mWebView.goToURL(juce::WebBrowserComponent::getResourceProviderRoot());
        }

        void resized() override
        {
            mWebView.setBounds(getLocalBounds());
        }

    private:
        OmegaUiBridge& mBridge;
        juce::WebBrowserComponent mWebView;

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(OmegaWebViewComponent)
    };

    } // namespace UI
} // namespace Omega
 
