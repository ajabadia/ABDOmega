#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_core/juce_core.h>
#include "OmegaAudioProcessor.h"
#include "../UI/OmegaMainEditor.h"
#include "../Core/OmegaIdentifiers.h"
#include "../Core/ParameterMetadata.h"
#include "../Core/Providers/SemanticBrokerService.h"
#include "../Core/Providers/ModulationTelemetryHub.h"
#include "../Core/Providers/ParamBindingRegistry.h"
#include "../Core/Service/ISynthesisEngine.h"

namespace Omega {
namespace Plugin {

    OmegaAudioProcessor::OmegaAudioProcessor()
        : juce::AudioProcessor (juce::AudioProcessor::BusesProperties().withInput  ("Input",  juce::AudioChannelSet::stereo(), false)
                                                                       .withOutput ("Output", juce::AudioChannelSet::stereo(), true)),
          mCatalog (),
          mValidator (mCatalog),
          mSystemSettings (),
          mEngine (mSystemSettings),
          mApvts (*this, nullptr, "PARAMETERS", createParameterLayout()),
          mEngineConfig (mEngine, mCatalog),
          mUiBridge (this, mCatalog, mApvts, mSystemSettings)
    {
        mUiBridge.setOnLoadCallback([this]() { /* [Era 7] Patch refresh handled via Bridge/Config */ });

        juce::File exe = juce::File::getSpecialLocation(juce::File::currentExecutableFile);
        juce::File resourceDir = exe.getParentDirectory().getChildFile("Resources");

        int levelsSearched = 0;
        while (!resourceDir.exists() && levelsSearched < 15 && !exe.isRoot()) {
            exe = exe.getParentDirectory();
            resourceDir = exe.getChildFile("Resources");
            levelsSearched++;
        }

        if (resourceDir.exists()) {
            juce::File modulesDir = resourceDir.getChildFile("modules");
            mCatalog.loadFromModulesDirectory(modulesDir);

            juce::Array<juce::File> packs;
            modulesDir.findChildFiles(packs, juce::File::findFiles, false, "*.zip;*.acepack");
            for (const auto& pack : packs) {
                mCatalog.loadFromAcePack(pack);
            }

            Core::Service::SemanticBrokerService::getInstance().setCatalog(&mCatalog);
        }

        // Cache parameters (Era 7 Minimal Set)
        mParamCache.mainVcaGain = mApvts.getRawParameterValue("LAYERAMAINVCAGAIN");

        startTimer(30); 
    }

    OmegaAudioProcessor::~OmegaAudioProcessor() {
        stopTimer();
    }

    void OmegaAudioProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) {
        juce::ScopedNoDenormals noDenormals;
        
        // [Era 7] Pure Aseptic Rendering. 
        // All legacy FX pools (Delay, Space Echo) have been purged.
        mEngine.renderNextBlock(buffer);
    }

    void OmegaAudioProcessor::loadPatch(const Core::Model::PatchDocument& patch) {
        mEngineConfig.applyPatch(patch);
        mUiBridge.forceRepaint();
    }

    void OmegaAudioProcessor::saveCurrentPatch() {
        // [TODO] Serialize mEngineConfig.getPatchDocument() to disk.
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

    void OmegaAudioProcessor::prepareToPlay(double sr, int sb) { mEngine.prepare(sr, sb); }
    void OmegaAudioProcessor::releaseResources() {}
    void OmegaAudioProcessor::getStateInformation(juce::MemoryBlock& d) { /* Legacy serialization purged */ }
    void OmegaAudioProcessor::setStateInformation(const void* d, int s) { /* Legacy serialization purged */ }
    bool OmegaAudioProcessor::acceptsMidi() const { return true; }
    bool OmegaAudioProcessor::producesMidi() const { return false; }
    double OmegaAudioProcessor::getTailLengthSeconds() const { return 0.1; }
    int OmegaAudioProcessor::getNumPrograms() { return 1; }
    int OmegaAudioProcessor::getCurrentProgram() { return 0; }
    void OmegaAudioProcessor::setCurrentProgram(int) {}
    const juce::String OmegaAudioProcessor::getProgramName(int) { return ""; }
    void OmegaAudioProcessor::changeProgramName(int, const juce::String&) {}
    
    void OmegaAudioProcessor::timerCallback() { updateParameters(); }
    void OmegaAudioProcessor::updateParameters() noexcept {
        if (mParamCache.mainVcaGain) mEngineConfig.updateParameter(0, Core::Model::ParamId::Amplitude, mParamCache.mainVcaGain->load());
    }

} // namespace Plugin
} // namespace Omega

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() {
    return new Omega::Plugin::OmegaAudioProcessor();
}
