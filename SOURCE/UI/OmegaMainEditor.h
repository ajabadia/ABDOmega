#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include "OmegaWebViewComponent.h"
#include "../Plugin/OmegaAudioProcessor.h"

namespace Omega {
    namespace UI {

    /**
     * @brief Editor principal de OMEGA.
     * [Architecture]: Actúa como ventana de JUCE para el WebView.
     */
    class OmegaMainEditor : public juce::AudioProcessorEditor {
    public:
        OmegaMainEditor(Plugin::OmegaAudioProcessor& p, OmegaUiBridge& bridge)
            : AudioProcessorEditor(&p), mWebViewContainer(bridge)
        {
            addAndMakeVisible(mWebViewContainer);
            
            // Tamaño inicial del plugin
            setSize(1600, 750);
            setResizable(true, true);
        }

        void resized() override
        {
            mWebViewContainer.setBounds(getLocalBounds());
        }

        void paint(juce::Graphics& g) override
        {
            // Fondo oscuro premium mientras carga el WebView
            g.fillAll(juce::Colours::black);
        }

    private:
        OmegaWebViewComponent mWebViewContainer;

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(OmegaMainEditor)
    };

} // namespace UI
} // namespace Omega
