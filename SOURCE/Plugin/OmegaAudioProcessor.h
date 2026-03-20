#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_utils/juce_audio_utils.h>
#include "../DSP/Engines/Juno/VirtualAnalogEngine.h"
#include "../Core/Preset/OmegaPreset.h"
#include "../Core/Ace/AceCatalog.h"
#include "../Core/Ace/AceValidator.h"
#include "Midi1InputAdapter.h"
#include "../Core/Input/OmegaInput.h"

namespace Omega::Plugin {

    /**
     * @brief Procesador Principal de OMEGA.
     * [Architecture]: Coordina el motor DSP, el sistema de presets ACE y el grafo de modulación.
     * [AudioThreadSafety]: Renderizado lock-free en processBlock.
     */
    class OmegaAudioProcessor : public juce::AudioProcessor {
    public:
        OmegaAudioProcessor();
        ~OmegaAudioProcessor() override = default;

        // --- JUCE Overrides ---
        void prepareToPlay(double sampleRate, int samplesPerBlock) override;
        void releaseResources() override;
        void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) override;

        juce::AudioProcessorEditor* createEditor() override;
        bool hasEditor() const override;

        const juce::String getName() const override;
        bool acceptsMidi() const override;
        bool producesMidi() const override;
        double getTailLengthSeconds() const override;

        int getNumPrograms() override;
        int getCurrentProgram() override;
        void setCurrentProgram(int index) override;
        const juce::String getProgramName(int index) override;
        void changeProgramName(int index, const juce::String& newName) override;

        void getStateInformation(juce::MemoryBlock& destData) override;
        void setStateInformation(const void* data, int sizeInBytes) override;

        // --- Omega Specific ---
        void loadPreset(const Core::Preset::OmegaPreset& preset);
        static juce::AudioProcessorValueTreeState::ParameterLayout createParameterLayout();

    private:
        void updateParameters() noexcept;

        // ACE System
        Core::Ace::AceCatalog mCatalog;
        Core::Ace::AceValidator mValidator;
        
        // Audio Engine & Input
        DSP::Engines::Juno::VirtualAnalogEngine mEngine;
        Core::Input::OmegaInput mInput;
        Core::Input::Midi1InputAdapter mMidiAdapter;
        
        // State
        juce::AudioProcessorValueTreeState mApvts;
        Core::Preset::OmegaPreset mCurrentPreset;

        // Parameter Cache (Lock-free access)
        struct ParamCache {
            std::atomic<float>* cutoff = nullptr;
            std::atomic<float>* resonance = nullptr;
            std::atomic<float>* chorusMode = nullptr;
            std::atomic<float>* hpfPos = nullptr;
            std::atomic<float>* vcaMode = nullptr;
            std::atomic<float>* drift = nullptr;
            std::atomic<float>* sawOn = nullptr;
            std::atomic<float>* pulseOn = nullptr;
            std::atomic<float>* subLevel = nullptr;
            std::atomic<float>* noiseLevel = nullptr;
            std::atomic<float>* pwmMode = nullptr;
            std::atomic<float>* pwmAmount = nullptr;
            std::atomic<float>* vcfEnvDepth = nullptr;
            std::atomic<float>* vcfLfoDepth = nullptr;
            std::atomic<float>* vcfKybd = nullptr;
            std::atomic<float>* vcfEnvPol = nullptr;
            std::atomic<float>* dcoLfoDepth = nullptr;
            std::atomic<float>* jpDetune = nullptr;
            std::atomic<float>* jpFilterMode = nullptr;
        } mParamCache;
        
        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(OmegaAudioProcessor)
    };

} // namespace Omega::Plugin
