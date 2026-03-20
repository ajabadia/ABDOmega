#include "OmegaAudioProcessor.h"
#include "../Core/Preset/JunoFactory.h"

namespace Omega::Plugin {

    OmegaAudioProcessor::OmegaAudioProcessor() 
        : AudioProcessor(BusesProperties().withOutput("Output", juce::AudioChannelSet::stereo(), true)),
          mValidator(mCatalog),
          mApvts(*this, nullptr, "PARAMETERS", createParameterLayout())
    {
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
            mEngine.setVoiceParams(v, cutoff, resonance);
            mEngine.setDriftAmount(v, drift); 
            mEngine.setSawEnabled(v, sawOn);
            mEngine.setPulseEnabled(v, pulseOn);
            mEngine.setSubLevel(v, subLevel);
            mEngine.setNoiseLevel(v, noiseLevel);
        }
        
        mEngine.setFxParams(chorusMode, 0.5f);
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
        }
    }

    juce::AudioProcessorValueTreeState::ParameterLayout OmegaAudioProcessor::createParameterLayout() {
        std::vector<std::unique_ptr<juce::RangedAudioParameter>> params;
        
        params.push_back(std::make_unique<juce::AudioParameterFloat>(
            juce::ParameterID("LAYERAMAINCUTOFF", 1), "Cutoff", 
            juce::NormalisableRange<float>(20.0f, 20000.0f, 0.0f, 0.3f), 2000.0f));
        
        params.push_back(std::make_unique<juce::AudioParameterFloat>(
            juce::ParameterID("LAYERAMAINRESONANCE", 1), "Resonance", 0.0f, 1.0f, 0.1f));

        params.push_back(std::make_unique<juce::AudioParameterChoice>(
            juce::ParameterID("LAYERACHORUSMODE", 1), "Chorus Mode", 
            juce::StringArray{"Off", "I", "II", "III"}, 1));

        params.push_back(std::make_unique<juce::AudioParameterChoice>(
            juce::ParameterID("LAYERAMAINHPF", 1), "HPF Position", 
            juce::StringArray{"0 (Bass Boost)", "1 (Bypass)", "2", "3"}, 1));

        params.push_back(std::make_unique<juce::AudioParameterChoice>(
            juce::ParameterID("LAYERAMAINVCAMODE", 1), "VCA Mode", 
            juce::StringArray{"Env", "Gate"}, 0));

        params.push_back(std::make_unique<juce::AudioParameterFloat>(
            juce::ParameterID("LAYERAMAINANALOGDRIFT", 1), "Analog Drift", 0.0f, 1.0f, 0.1f));

        // --- Hardware Fidelity / Modular Params ---
        params.push_back(std::make_unique<juce::AudioParameterBool>(
            juce::ParameterID("LAYERAMAINSAWON", 1), "Saw On", true));
        params.push_back(std::make_unique<juce::AudioParameterBool>(
            juce::ParameterID("LAYERAMAINPULSEON", 1), "Pulse On", true));
        params.push_back(std::make_unique<juce::AudioParameterFloat>(
            juce::ParameterID("LAYERASUBOSELEVEL", 1), "Sub Level", 0.0f, 1.0f, 0.5f));
        params.push_back(std::make_unique<juce::AudioParameterFloat>(
            juce::ParameterID("LAYERANOISELEVEL", 1), "Noise Level", 0.0f, 1.0f, 0.05f));
        
        params.push_back(std::make_unique<juce::AudioParameterChoice>(
            juce::ParameterID("LAYERAPWMMODE", 1), "PWM Mode", juce::StringArray{"Manual", "LFO"}, 0));
        params.push_back(std::make_unique<juce::AudioParameterFloat>(
            juce::ParameterID("LAYERAPWMAMOUNT", 1), "PWM Amount/Width", 0.0f, 1.0f, 0.5f));

        params.push_back(std::make_unique<juce::AudioParameterFloat>(
            juce::ParameterID("LAYERAVCFENVDEPTH", 1), "VCF Env Depth", 0.0f, 1.0f, 0.5f));
        params.push_back(std::make_unique<juce::AudioParameterFloat>(
            juce::ParameterID("LAYERAVCFMODDEPTH", 1), "VCF LFO Depth", 0.0f, 1.0f, 0.0f));
        params.push_back(std::make_unique<juce::AudioParameterFloat>(
            juce::ParameterID("LAYERAVCFKYBD", 1), "VCF Keytrack", 0.0f, 1.0f, 0.5f));
        params.push_back(std::make_unique<juce::AudioParameterChoice>(
            juce::ParameterID("LAYERAVCFENVPOL", 1), "VCF Env Polarity", juce::StringArray{"Normal", "Inverted"}, 0));
        
        params.push_back(std::make_unique<juce::AudioParameterFloat>(
            juce::ParameterID("LAYERADCOMODDEPTH", 1), "DCO LFO Depth", 0.0f, 1.0f, 0.0f));

        // --- JP-808X Specific Params ---
        params.push_back(std::make_unique<juce::AudioParameterFloat>(
            juce::ParameterID("LAYERAMAINJPDETUNE", 1), "JP Detune", 0.0f, 1.0f, 0.5f));
        params.push_back(std::make_unique<juce::AudioParameterChoice>(
            juce::ParameterID("LAYERAMAINJPFILTERMODE", 1), "JP Filter Mode", 
            juce::StringArray{"LP", "BP", "HP"}, 0));

        return { params.begin(), params.end() };
    }

    // --- JUCE Magic Impl ---
    juce::AudioProcessorEditor* OmegaAudioProcessor::createEditor() { 
        return new juce::GenericAudioProcessorEditor(*this); 
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

} // namespace Omega::Plugin

/**
 * @brief Función de entrada requerida por JUCE para instanciar el plugin.
 * Deber estar fuera del namespace para ser visible por el wrapper de JUCE.
 */
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() {
    return new Omega::Plugin::OmegaAudioProcessor();
}
