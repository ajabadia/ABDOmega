#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_audio_utils/juce_audio_utils.h>
#include <juce_gui_basics/juce_gui_basics.h>
#include <atomic>
#include <memory>
/** [BUILD_FORCE_15] Absolute Aseptic Restoration of OMEGA Processor. **/
#include "../Engine/Modular/VirtualAnalogEngine.h"
#include "../Core/Preset/OmegaPreset.h"
#include "../Core/Preset/PresetRepository.h"
#include "../Core/Ace/AceCatalog.h"
#include "../Core/Ace/AceValidator.h"
#include "../Core/Input/OmegaInput.h"
#include "../Core/Input/Midi1InputAdapter.h"
#include "../Core/Providers/SystemSettingsManager.h"
#include "../Core/Providers/EngineConfigManager.h"
#include "../Core/Providers/PresetService.h"
#include "../UI/OmegaUiBridge.h"
#include "../DSP/FX/Delay.h"

namespace Omega::Plugin {

    /**
     * @brief Procesador Principal de OMEGA.
     * [Architecture]: Coordina el motor DSP, el sistema de presets ACE y el grafo de modulaciÃ³n.
     * [AudioThreadSafety]: Renderizado lock-free en processBlock.
     * [Identity]: Synchronized with Omega::Engine::Modular::VirtualAnalogEngine.
     */
    class OmegaAudioProcessor : public juce::AudioProcessor, private juce::Timer {
    public:
        OmegaAudioProcessor();
        ~OmegaAudioProcessor() override;

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

        // MIDI Triggering (Thread-safe)
        void triggerNote(int midiNote, int velocity, bool isOn);

    private:
        void timerCallback() override;
        void updateParameters() noexcept;

        // ACE System
        Core::Ace::AceCatalog mCatalog;
        Core::Ace::AceValidator mValidator;
        
        // Global Services
        Core::Service::SystemSettingsManager mSystemSettings;

        // Audio Engine & Input (Synchronized namespace)
        ::Omega::Engine::Modular::VirtualAnalogEngine mEngine;
        Core::Input::OmegaInput mInput;
        
        // State
        Core::Preset::OmegaPreset mCurrentPreset;
        Core::Preset::PresetRepository mPresetRepository;
        juce::AudioProcessorValueTreeState mApvts;
        // High-Level Facades
        Core::Service::EngineConfigManager mEngineConfig;
        Core::Service::PresetService mPresetService;
        UI::OmegaUiBridge mUiBridge;

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
            std::atomic<float>* korgHpCutoff = nullptr;
            std::atomic<float>* korgHpRes = nullptr;
            std::atomic<float>* korgGrit = nullptr;

            // ADSR
            std::atomic<float>* mainAttack = nullptr;
            std::atomic<float>* mainDecay = nullptr;
            std::atomic<float>* mainSustain = nullptr;
            std::atomic<float>* mainRelease = nullptr;

            // VCA
            std::atomic<float>* mainVcaGain = nullptr;

            // LFO
            std::atomic<float>* mainLfoRate = nullptr;
            std::atomic<float>* mainLfoWave = nullptr;

            // Space Echo
            std::atomic<float>* spaceEchoEnabled = nullptr;
            std::atomic<float>* spaceEchoSpeed = nullptr;
            std::atomic<float>* spaceEchoIntensity = nullptr;
            std::atomic<float>* spaceEchoEchoVol = nullptr;
            std::atomic<float>* spaceEchoReverbVol = nullptr;
            std::atomic<float>* spaceEchoMode = nullptr;
            std::atomic<float>* spaceEchoWow = nullptr;
            std::atomic<float>* spaceEchoDrive = nullptr;

            // Master Delay
            std::atomic<float>* delayEnabled = nullptr;
            std::atomic<float>* delayTime = nullptr;
            std::atomic<float>* delayFeedback = nullptr;
            std::atomic<float>* delayMix = nullptr;
        } mParamCache;

        DSP::FX::Delay mMasterDelay;

        juce::MidiBuffer mUiMidiQueue;
        juce::CriticalSection mUiMidiLock;
        
        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(OmegaAudioProcessor)
    };

} // namespace Omega::Plugin
