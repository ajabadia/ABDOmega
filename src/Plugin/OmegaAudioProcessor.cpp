#include <juce_audio_processors/juce_audio_processors.h>
#include "OmegaAudioProcessor.h"
#include "../UI/OmegaMainEditor.h"
#include "../Core/OmegaIdentifiers.h"
#include "../Core/ParameterMetadata.h"
#include "../Core/Providers/SemanticBrokerService.h"
#include "../Core/Providers/ModulationTelemetryHub.h"
#include "../Core/Providers/ParamBindingRegistry.h"
#include "../Engine/Voice/VoiceArchitectureCompiler.h"
#include "../Core/Service/ISynthesisEngine.h"
#include "../Core/Providers/PresetService.h"

namespace Omega {
namespace Plugin {

    OmegaAudioProcessor::OmegaAudioProcessor()
        : juce::AudioProcessor (juce::AudioProcessor::BusesProperties().withInput  ("Input",  juce::AudioChannelSet::stereo(), false)
                                                                       .withOutput ("Output", juce::AudioChannelSet::stereo(), true)),
          mCatalog (),
          mValidator (mCatalog),
          mSystemSettings (),
          mEngine (mSystemSettings),
          mInput (),
          mCurrentPreset (),
          mPresetRepository (),
          mApvts (*this, nullptr, "PARAMETERS", createParameterLayout()),
          mEngineConfig (mEngine, mCatalog),
          mPresetService (mCatalog),
          mUiBridge (this, mCurrentPreset, mCatalog, &mPresetRepository, mApvts, mSystemSettings)
    {
        // Deep Root Resource Discovery (Vision 2.1.2)
        juce::File exe = juce::File::getSpecialLocation(juce::File::currentExecutableFile);
        juce::File resourceDir = exe.getParentDirectory().getChildFile("Resources");
        
        // Upward search for Resources/ folder (up to 10 levels to reach root from deep build folders)
        int levelsSearched = 0;
        while (!resourceDir.exists() && levelsSearched < 10 && !exe.isRoot()) {
            exe = exe.getParentDirectory();
            resourceDir = exe.getChildFile("Resources");
            levelsSearched++;
        }

        if (resourceDir.exists()) {
            juce::Logger::writeToLog("ACE: Resources found at level " + juce::String(levelsSearched) + ": " + resourceDir.getFullPathName());
            if (mCatalog.loadFromDirectory(resourceDir)) {
                mCatalog.buildFallbacks();
                Core::Service::SemanticBrokerService::getInstance().setCatalog(&mCatalog);
            }
        } else {
            juce::Logger::writeToLog("CRITICAL: OMEGA Resources directory NOT FOUND after 10 levels of searching.");
        }

        loadPreset(Core::Preset::OmegaPreset::createMinimal());
        
        // [VISION 2.1.3/2.1.4/2.1.5]: Hardened Diagnostics
        int modCount = 0;
        if (mCurrentPreset.getNumLayers() > 0) {
            auto l0 = mCurrentPreset.getLayerTree(0);
            if (l0.isValid()) {
                auto arch = l0.getChildWithName(Core::Identifiers::voiceArch);
                if (arch.isValid()) modCount = arch.getNumChildren();
            }
        }
        juce::Logger::writeToLog("ACE: Initial Preset loaded. Modules in Layer 0: " + juce::String(modCount));
        
        startTimer(30); 
    }

    OmegaAudioProcessor::~OmegaAudioProcessor() {
        stopTimer();
    }

    void OmegaAudioProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) {
        juce::ScopedNoDenormals noDenormals;
        
        // 1. Convert JUCE MIDI to OMEGA Input Events (Aseptic 2.0 Refit)
        mInput.clear();
        for (const auto metadata : midiMessages) {
            auto msg = metadata.getMessage();
            ::Omega::Core::Input::InputEvent ev;
            ev.sampleOffset = metadata.samplePosition;
            
            if (msg.isNoteOn()) {
                ev.type = ::Omega::Core::Input::InputEventType::NoteOn;
                ev.data.noteOn.noteId = msg.getNoteNumber();
                ev.data.noteOn.pitch = (float)msg.getNoteNumber();
                ev.data.noteOn.velocity = msg.getFloatVelocity();
                mInput.addEvent(ev);
            } else if (msg.isNoteOff()) {
                ev.type = ::Omega::Core::Input::InputEventType::NoteOff;
                ev.data.noteOff.noteId = msg.getNoteNumber();
                ev.data.noteOff.releaseVelocity = msg.getFloatVelocity();
                mInput.addEvent(ev);
            }
            ::Omega::Core::Input::MidiMonitor::getInstance().pushEvent(msg);
        }
        midiMessages.clear();

        // 2. Render Engine (Absolute Interface Fulfillment)
        mEngine.renderNextBlock(buffer, mInput);
        
        // 3. Post-Process FX (Legacy / Placeholder)
        if (mParamCache.delayEnabled && mParamCache.delayEnabled->load() > 0.5f) {
            mMasterDelay.process(buffer);
        }
    }

    void OmegaAudioProcessor::loadPreset(const Core::Preset::OmegaPreset& preset) {
        mCurrentPreset = preset;
        mEngineConfig.applyPreset(mCurrentPreset);
        mUiBridge.forceRepaint();
    }

    juce::AudioProcessorValueTreeState::ParameterLayout OmegaAudioProcessor::createParameterLayout() {
        juce::AudioProcessorValueTreeState::ParameterLayout layout;
        auto& registry = Core::ParameterMetadataRegistry::getInstance();
        for (auto const& [id, desc] : registry.getAllParameters()) {
            layout.add(std::make_unique<juce::AudioParameterFloat>(juce::ParameterID(juce::String(id), 1), desc.name, juce::NormalisableRange<float>(desc.minValue, desc.maxValue), desc.defaultValue));
        }
        return layout;
    }

    juce::AudioProcessorEditor* OmegaAudioProcessor::createEditor() { return new UI::OmegaMainEditor (*this, mUiBridge); }
    bool OmegaAudioProcessor::hasEditor() const { return true; }
    const juce::String OmegaAudioProcessor::getName() const { return "ABD OMEGA 2.0"; }

    void OmegaAudioProcessor::triggerNote(int n, int v, bool on) {
        if (on) mEngine.noteOn(0, 440.0f * std::pow(2.0f, (n - 69.0f) / 12.0f));
        else mEngine.noteOff(0);
    }

    void OmegaAudioProcessor::prepareToPlay(double sr, int sb) { mEngine.prepare(sr, sb); mMasterDelay.prepare(sr); }
    void OmegaAudioProcessor::releaseResources() {}
    void OmegaAudioProcessor::getStateInformation(juce::MemoryBlock& d) { mPresetService.serializePreset(mCurrentPreset, d); }
    void OmegaAudioProcessor::setStateInformation(const void* d, int s) { loadPreset(mPresetService.deserializePreset(d, s)); }
    bool OmegaAudioProcessor::acceptsMidi() const { return true; }
    bool OmegaAudioProcessor::producesMidi() const { return false; }
    double OmegaAudioProcessor::getTailLengthSeconds() const { return 0.5; }
    int OmegaAudioProcessor::getNumPrograms() { return 1; }
    int OmegaAudioProcessor::getCurrentProgram() { return 0; }
    void OmegaAudioProcessor::setCurrentProgram(int) {}
    const juce::String OmegaAudioProcessor::getProgramName(int) { return ""; }
    void OmegaAudioProcessor::changeProgramName(int, const juce::String&) {}
    
    void OmegaAudioProcessor::timerCallback() { updateParameters(); }
    void OmegaAudioProcessor::updateParameters() noexcept {
        if (mParamCache.mainVcaGain) mEngineConfig.updateParameter("LAYERAMAINVCAGAIN", mParamCache.mainVcaGain->load());
    }

} // namespace Plugin
} // namespace Omega

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() {
    return new Omega::Plugin::OmegaAudioProcessor();
}
