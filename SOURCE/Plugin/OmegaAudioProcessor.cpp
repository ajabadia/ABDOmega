#include "OmegaAudioProcessor.h"
#include "../UI/OmegaMainEditor.h"
#include "../Core/Preset/JunoFactory.h"
#include "../Core/ParameterMetadata.h"

namespace Omega::Plugin {

    OmegaAudioProcessor::OmegaAudioProcessor() 
        : AudioProcessor(BusesProperties().withOutput("Output", juce::AudioChannelSet::stereo(), true)),
          mValidator(mCatalog),
          mPresetRepository("d:/desarrollos/ABDOmega/Resources/Presets"),
          mApvts(*this, nullptr, "PARAMETERS", createParameterLayout()),
          mUiBridge(*this, mCurrentPreset, mCatalog, mPresetRepository, mApvts)
    {
        // Link Bridge load callback
        mUiBridge.setOnLoadCallback([this](const Core::Preset::OmegaPreset& p) { this->loadPreset(p); });

        // Initialize Parameter Cache
        mParamCache.cutoff = mApvts.getRawParameterValue("LAYERAMAINCUTOFF");
        mParamCache.resonance = mApvts.getRawParameterValue("LAYERAMAINRESONANCE");
        mParamCache.chorusMode = mApvts.getRawParameterValue("LAYERACHORUSMODE");
        mParamCache.hpfPos = mApvts.getRawParameterValue("LAYERAMAINHPF");
        mParamCache.vcaMode = mApvts.getRawParameterValue("LAYERAMAINVCAMODE");
        mParamCache.drift = mApvts.getRawParameterValue("LAYERAMAINANALOGDRIFT");
        mParamCache.sawOn = mApvts.getRawParameterValue("LAYERAMAINSAWON");
        mParamCache.pulseOn = mApvts.getRawParameterValue("LAYERAMAINPULSEON");
        mParamCache.subLevel = mApvts.getRawParameterValue("LAYERASUBOSELEVEL");
        mParamCache.noiseLevel = mApvts.getRawParameterValue("LAYERANOISELEVEL");
        mParamCache.pwmMode = mApvts.getRawParameterValue("LAYERAPWMMODE");
        mParamCache.pwmAmount = mApvts.getRawParameterValue("LAYERAPWMAMOUNT");
        mParamCache.vcfEnvDepth = mApvts.getRawParameterValue("LAYERAVCFENVDEPTH");
        mParamCache.vcfLfoDepth = mApvts.getRawParameterValue("LAYERAVCFMODDEPTH");
        mParamCache.vcfKybd = mApvts.getRawParameterValue("LAYERAVCFKYBD");
        mParamCache.vcfEnvPol = mApvts.getRawParameterValue("LAYERAVCFENVPOL");
        mParamCache.dcoLfoDepth = mApvts.getRawParameterValue("LAYERADCOMODDEPTH");
        mParamCache.jpDetune = mApvts.getRawParameterValue("LAYERAMAINJPDETUNE");
        mParamCache.jpFilterMode = mApvts.getRawParameterValue("LAYERAMAINJPFILTERMODE");
        mParamCache.korgHpCutoff = mApvts.getRawParameterValue("LAYERAKORGHPFDCUTOFF");
        mParamCache.korgHpRes = mApvts.getRawParameterValue("LAYERAKORGHPFRESONANCE");
        mParamCache.korgGrit = mApvts.getRawParameterValue("LAYERAKORGGRIT");
        
        // --- Space Echo Cache ---
        mParamCache.spaceEchoEnabled = mApvts.getRawParameterValue("LAYERAFXSPACEENABLE");
        mParamCache.spaceEchoSpeed = mApvts.getRawParameterValue("LAYERAFXSPACESPEED");
        mParamCache.spaceEchoIntensity = mApvts.getRawParameterValue("LAYERAFXSPACEINTENSITY");
        mParamCache.spaceEchoEchoVol = mApvts.getRawParameterValue("LAYERAFXSPACEECHOVOL");
        mParamCache.spaceEchoReverbVol = mApvts.getRawParameterValue("LAYERAFXSPACEREVERBVOL");
        mParamCache.spaceEchoMode = mApvts.getRawParameterValue("LAYERAFXSPACEMODE");
        mParamCache.spaceEchoWow = mApvts.getRawParameterValue("LAYERAFXSPACEWOW");
        mParamCache.spaceEchoDrive = mApvts.getRawParameterValue("LAYERAFXSPACEDRIVE");

        // Carga inicial del preset de factoría
        loadPreset(Core::Preset::JunoFactory::createJunoBasicPad());
    }

    void OmegaAudioProcessor::prepareToPlay(double sampleRate, int samplesPerBlock) {
        mEngine.prepare(sampleRate, samplesPerBlock);
    }

    void OmegaAudioProcessor::releaseResources() {}

    void OmegaAudioProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) {
        juce::ScopedNoDenormals noDenormals;
        
        // Limpiar canales extra
        for (auto i = getTotalNumInputChannels(); i < getTotalNumOutputChannels(); ++i)
            buffer.clear(i, 0, buffer.getNumSamples());

        // Actualizar parámetros en tiempo real
        updateParameters();

        // 0. Inyectar MIDI desde la UI
        {
            const juce::ScopedLock sl(mUiMidiLock);
            if (!mUiMidiQueue.isEmpty()) {
                midiMessages.addEvents(mUiMidiQueue, 0, buffer.getNumSamples(), 0);
                mUiMidiQueue.clear();
            }
        }

        // 1. Traducir MIDI a OmegaInput
        mInput.clear();
        mMidiAdapter.process(midiMessages, mInput);

        // 2. Renderizado del motor (ACE dynamic bridge)
        mEngine.renderNextBlock(buffer, mInput);
    }

    void OmegaAudioProcessor::updateParameters() noexcept {
        float cutoff = mParamCache.cutoff->load();
        float resonance = mParamCache.resonance->load();
        int chorusMode = (int)mParamCache.chorusMode->load();
        int hpfPos = (int)mParamCache.hpfPos->load();
        bool vcaGate = (int)mParamCache.vcaMode->load() == 1;
        float drift = mParamCache.drift->load();

        bool sawOn = mParamCache.sawOn->load() > 0.5f;
        bool pulseOn = mParamCache.pulseOn->load() > 0.5f;
        float subLevel = mParamCache.subLevel->load();
        float noiseLevel = mParamCache.noiseLevel->load();
        bool pwmModeLfo = (int)mParamCache.pwmMode->load() == 1;
        float pwmAmount = mParamCache.pwmAmount->load();

        float vcfEnvDepth = mParamCache.vcfEnvDepth->load();
        float vcfLfoDepth = mParamCache.vcfLfoDepth->load();
        float vcfKybd = mParamCache.vcfKybd->load();
        bool vcfInv = (int)mParamCache.vcfEnvPol->load() == 1;
        float dcoLfoDepth = mParamCache.dcoLfoDepth->load();
        
        float jpDetune = mParamCache.jpDetune->load();
        int jpFilterMode = (int)mParamCache.jpFilterMode->load();
        float korgHpCut = mParamCache.korgHpCutoff->load();
        float korgHpRes = mParamCache.korgHpRes->load();
        float korgGrit = mParamCache.korgGrit->load();

        // Pushing to Engine
        mEngine.setHpfPosition(hpfPos);
        mEngine.setVcaModeGate(vcaGate);
        mEngine.setPWMMode(pwmModeLfo);
        mEngine.setPWMAmount(pwmAmount);
        mEngine.setVcfEnvDepth(vcfEnvDepth);
        mEngine.setVcfLfoDepth(vcfLfoDepth);
        mEngine.setVcfKeyTracking(vcfKybd);
        mEngine.setVcfEnvPolarity(vcfInv);
        mEngine.setDcoLfoDepth(dcoLfoDepth);
        mEngine.setJpDetune(jpDetune);
        mEngine.setJpFilterMode(jpFilterMode);

        for (int v = 0; v < 16; ++v) {
            mEngine.setVoiceParams(v, cutoff, resonance, korgHpCut, korgHpRes, korgGrit);
            mEngine.setDriftAmount(v, drift); 
            mEngine.setSawEnabled(v, sawOn);
            mEngine.setPulseEnabled(v, pulseOn);
            mEngine.setSubLevel(v, subLevel);
            mEngine.setNoiseLevel(v, noiseLevel);
        }
        
        mEngine.setFxParams(chorusMode, 0.5f);

        // --- Space Echo Sync ---
        mEngine.setSpaceEchoEnabled(mParamCache.spaceEchoEnabled->load() > 0.5f);
        mEngine.setSpaceEchoParams({
            mParamCache.spaceEchoSpeed->load(),
            mParamCache.spaceEchoIntensity->load(),
            mParamCache.spaceEchoEchoVol->load(),
            mParamCache.spaceEchoReverbVol->load(),
            (int)mParamCache.spaceEchoMode->load(),
            mParamCache.spaceEchoWow->load(),
            mParamCache.spaceEchoDrive->load()
        });
    }

    void OmegaAudioProcessor::loadPreset(const Core::Preset::OmegaPreset& preset) {
        Core::Preset::OmegaPreset validatedPreset = preset;
        mValidator.validateAndRepairPreset(validatedPreset);
        
        mCurrentPreset = validatedPreset;

        // [Innovation]: Mapeo dinámico de ACE Components al motor activo
        // Para este MVP, forzamos VirtualAnalogEngine pero permitimos elegir filtros vía ACE IDs.
        for (const auto& layer : mCurrentPreset.layers) {
            // Oscillator Mapping
            if (!layer.voiceArch.oscillators.empty()) {
                if (layer.voiceArch.oscillators[0].componentId == "OSC-VA-004") {
                    for (int v = 0; v < 16; ++v)
                        mEngine.setOscillatorMode(v, DSP::Engines::Juno::VirtualAnalogEngine::OscillatorMode::JpSuperSaw);
                } else {
                    for (int v = 0; v < 16; ++v)
                        mEngine.setOscillatorMode(v, DSP::Engines::Juno::VirtualAnalogEngine::OscillatorMode::JunoDco);
                }
            }

            // Filter Mapping
            if (!layer.voiceArch.filters.empty()) {
                const auto& fid = layer.voiceArch.filters[0].componentId;
                if (fid == "FLT-VA-003") {
                    mEngine.setFilterType(DSP::Engines::Juno::VirtualAnalogEngine::FilterType::Korg35);
                } else if (fid == "FLT-VA-008") {
                    mEngine.setFilterType(DSP::Engines::Juno::VirtualAnalogEngine::FilterType::JP8080);
                } else {
                    mEngine.setFilterType(DSP::Engines::Juno::VirtualAnalogEngine::FilterType::JunoIR3109);
                }
            }

            // FX Mapping (Dynamic ACE)
            if (!layer.voiceArch.fxSlots.empty()) {
                const auto& fxId = layer.voiceArch.fxSlots[0].componentId;
                if (fxId == "FX-DL-002") {
                    mEngine.setSpaceEchoEnabled(true);
                } else {
                    mEngine.setSpaceEchoEnabled(false);
                }
            } else {
                mEngine.setSpaceEchoEnabled(false);
            }
        }
    }

    juce::AudioProcessorValueTreeState::ParameterLayout OmegaAudioProcessor::createParameterLayout() {
        std::vector<std::unique_ptr<juce::RangedAudioParameter>> params;
        
        auto& registry = Omega::Core::ParameterMetadataRegistry::getInstance();
        registry.initializeDefaults();

        for (auto const& [id, desc] : registry.getAllParameters()) {
            if (desc.unit == "Choice" || desc.unit == "Mode") {
                // Choice/Int parameters
                if (id == "LAYERACHORUSMODE") {
                    params.push_back(std::make_unique<juce::AudioParameterChoice>(
                        juce::ParameterID(id, 1), desc.name, juce::StringArray{"Off", "I", "II", "III"}, (int)desc.defaultValue));
                } else if (id == "LAYERAMAINHPF") {
                    params.push_back(std::make_unique<juce::AudioParameterChoice>(
                        juce::ParameterID(id, 1), desc.name, juce::StringArray{"0 (Bass Boost)", "1 (Bypass)", "2", "3"}, (int)desc.defaultValue));
                } else if (id == "LAYERAMAINVCAMODE") {
                    params.push_back(std::make_unique<juce::AudioParameterChoice>(
                        juce::ParameterID(id, 1), desc.name, juce::StringArray{"Env", "Gate"}, (int)desc.defaultValue));
                } else if (id == "LAYERAPWMMODE") {
                    params.push_back(std::make_unique<juce::AudioParameterChoice>(
                        juce::ParameterID(id, 1), desc.name, juce::StringArray{"Manual", "LFO"}, (int)desc.defaultValue));
                } else if (id == "LAYERAVCFENVPOL") {
                    params.push_back(std::make_unique<juce::AudioParameterChoice>(
                        juce::ParameterID(id, 1), desc.name, juce::StringArray{"Normal", "Inverted"}, (int)desc.defaultValue));
                } else if (id == "LAYERAMAINJPFILTERMODE") {
                    params.push_back(std::make_unique<juce::AudioParameterChoice>(
                        juce::ParameterID(id, 1), desc.name, juce::StringArray{"LP", "BP", "HP"}, (int)desc.defaultValue));
                } else if (id == "LAYERAFXSPACEMODE") {
                    params.push_back(std::make_unique<juce::AudioParameterInt>(
                        juce::ParameterID(id, 1), desc.name, (int)desc.minValue, (int)desc.maxValue, (int)desc.defaultValue));
                }
            } else if (desc.unit == "Bool") {
                params.push_back(std::make_unique<juce::AudioParameterBool>(
                    juce::ParameterID(id, 1), desc.name, desc.defaultValue > 0.5f));
            } else {
                // Float parameters
                params.push_back(std::make_unique<juce::AudioParameterFloat>(
                    juce::ParameterID(id, 1), desc.name, 
                    juce::NormalisableRange<float>(desc.minValue, desc.maxValue, 0.0f, desc.skew), desc.defaultValue));
            }
        }

        return { params.begin(), params.end() };
    }

    // --- JUCE Magic Impl ---
    juce::AudioProcessorEditor* OmegaAudioProcessor::createEditor() { 
        return new UI::OmegaMainEditor(*this, mUiBridge); 
    }
    
    bool OmegaAudioProcessor::hasEditor() const { return true; }
    const juce::String OmegaAudioProcessor::getName() const { return "OMEGA Synth"; }
    bool OmegaAudioProcessor::acceptsMidi() const { return true; }
    bool OmegaAudioProcessor::producesMidi() const { return false; }
    double OmegaAudioProcessor::getTailLengthSeconds() const { return 0.0; }
    int OmegaAudioProcessor::getNumPrograms() { return 1; }
    int OmegaAudioProcessor::getCurrentProgram() { return 0; }
    void OmegaAudioProcessor::setCurrentProgram(int index) {}
    const juce::String OmegaAudioProcessor::getProgramName(int index) { return {}; }
    void OmegaAudioProcessor::changeProgramName(int index, const juce::String& newName) {}
    void OmegaAudioProcessor::getStateInformation(juce::MemoryBlock& destData) {}
    void OmegaAudioProcessor::setStateInformation(const void* data, int sizeInBytes) {}

    void OmegaAudioProcessor::triggerNote(int midiNote, int velocity, bool isOn) {
        const juce::ScopedLock sl(mUiMidiLock);
        if (isOn)
            mUiMidiQueue.addEvent(juce::MidiMessage::noteOn(1, midiNote, (juce::uint8)velocity), 0);
        else
            mUiMidiQueue.addEvent(juce::MidiMessage::noteOff(1, midiNote, (juce::uint8)velocity), 0);
    }

} // namespace Omega::Plugin

/**
 * @brief Función de entrada requerida por JUCE para instanciar el plugin.
 * Deber estar fuera del namespace para ser visible por el wrapper de JUCE.
 */
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() {
    return new Omega::Plugin::OmegaAudioProcessor();
}
