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
             : mBridge(bridge),
               mWebView(juce::WebBrowserComponent::Options{}
#if JUCE_USE_WIN_WEBVIEW2
                        .withBackend(juce::WebBrowserComponent::Options::Backend::webview2)                        .withWinWebView2Options(juce::WebBrowserComponent::Options::WinWebView2()
                            .withUserDataFolder(juce::File::getSpecialLocation(juce::File::tempDirectory)
                                .getChildFile("OmegaSynth_WebView2_V16_FINAL")))
                        .withNativeIntegrationEnabled(true)
                        .withInitialisationData("appName", "OMEGA Synth")
                        .withInitialisationData("version", "1.0.0")
                        .withInitialisationData("build", OMEGA_BUILD_VERSION)
                        .withInitialisationData("timestamp", OMEGA_BUILD_TIMESTAMP)
                        .withResourceProvider([this](const juce::String& url) -> std::optional<juce::WebBrowserComponent::Resource> {
                            juce::String path = url;
                            
                            // Robustly strip juce.localhost scheme and host
                            if (path.startsWith("https://juce.localhost/")) path = path.substring(23);
                            else if (path.startsWith("http://juce.localhost/")) path = path.substring(22);
                            else if (path.startsWith("/")) path = path.substring(1);

                            if (path.isEmpty() || path == "/") path = "index.html";

                            juce::File exeDir = juce::File::getSpecialLocation(juce::File::currentExecutableFile).getParentDirectory();
                            juce::File webUiDir = exeDir.getChildFile("WebUI");
                            if (!webUiDir.exists())
                                webUiDir = juce::File("d:\\desarrollos\\ABDOmega\\WebUI");

                            juce::File file = webUiDir.getChildFile(path.replace("/", "\\"));
                            
                            if (file.existsAsFile())
                            {
                                auto getMimeType = [](const juce::String& filename) {
                                    if (filename.endsWithIgnoreCase(".html")) return "text/html";
                                    if (filename.endsWithIgnoreCase(".css"))  return "text/css";
                                    if (filename.endsWithIgnoreCase(".js"))   return "application/javascript";
                                    if (filename.endsWithIgnoreCase(".png"))  return "image/png";
                                    if (filename.endsWithIgnoreCase(".svg"))  return "image/svg+xml";
                                    return "application/octet-stream";
                                };

                                juce::MemoryBlock mb;
                                file.loadFileAsData(mb);
                                
                                std::vector<std::byte> data(mb.getSize());
                                std::memcpy(data.data(), mb.getData(), mb.getSize());
                                
                                return juce::WebBrowserComponent::Resource {
                                    std::move(data),
                                    getMimeType(file.getFileName())
                                };
                            }
                            return std::nullopt;
                        })

                        .withNativeFunction ("emitEvent", [this] (const juce::Array<juce::var>& args, juce::WebBrowserComponent::NativeFunctionCompletion completion) {
                            if (args.size() >= 2 && args[0].toString() == "omegaMessage")
                            {
                                juce::String jsonStr = juce::JSON::toString (args[1], true);
                                juce::var response = mBridge.handleMessageFromUiAsVar (jsonStr);
                                completion (response);
                            }
                            else
                            {
                                completion (juce::var::undefined());
                            }
                        })
                        .withNativeFunction ("__juce__invoke", [this] (const juce::Array<juce::var>& args, juce::WebBrowserComponent::NativeFunctionCompletion completion) {
                            if (args.size() > 0)
                            {
                                juce::String jsonStr = juce::JSON::toString (args[0], true);
                                juce::String response = mBridge.handleMessageFromUi (jsonStr);
                                mWebView.evaluateJavascript ("window.handleOmegaMessage(" + response + ")", nullptr);
                                completion (juce::var (response));
                            }
                            else
                            {
                                completion (juce::var::undefined());
                            }
                        })
                        .withNativeFunction ("uiReady", [this] (const juce::Array<juce::var>& args, juce::WebBrowserComponent::NativeFunctionCompletion completion) {
                            juce::DynamicObject::Ptr msg = new juce::DynamicObject();
                            msg->setProperty ("type", "uiReady");
                            msg->setProperty ("requestId", args.size() > 0 ? args[0] : juce::var (0));
                            juce::var response = mBridge.handleMessageFromUiAsVar (juce::JSON::toString (juce::var (msg.get()), true));
                            completion (response);
                        })
                        .withNativeFunction ("getState", [this] (const juce::Array<juce::var>& args, juce::WebBrowserComponent::NativeFunctionCompletion completion) {
                            juce::DynamicObject::Ptr msg = new juce::DynamicObject();
                            msg->setProperty ("type", "getState");
                            msg->setProperty ("requestId", args.size() > 0 ? args[0] : juce::var (0));
                            juce::var response = mBridge.handleMessageFromUiAsVar (juce::JSON::toString (juce::var (msg.get()), true));
                            completion (response);
                        })
                        .withNativeFunction ("setParameter", [this] (const juce::Array<juce::var>& args, juce::WebBrowserComponent::NativeFunctionCompletion completion) {
                            if (args.size() >= 2) {
                                juce::DynamicObject::Ptr msg = new juce::DynamicObject();
                                msg->setProperty ("type", "setParam");
                                juce::DynamicObject::Ptr payload = new juce::DynamicObject();
                                payload->setProperty ("paramId", args[0].toString());
                                payload->setProperty ("value", args[1]);
                                msg->setProperty ("payload", juce::var (payload.get()));
                                mBridge.handleMessageFromUi (juce::JSON::toString (juce::var (msg.get()), true));
                            }
                            completion (juce::var ("ok"));
                        })
                        .withKeepPageLoadedWhenBrowserIsHidden()
#endif
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
 
