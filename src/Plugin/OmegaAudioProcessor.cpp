#include "OmegaAudioProcessor.h"
#ifndef OMEGA_UNIT_TESTS
#include "../UI/OmegaMainEditor.h"
#endif
#include "../Core/Preset/JunoFactory.h"
#include "../Core/ParameterMetadata.h"
#include <set>
#include <string>
#include "../Core/Modulation/MidiMonitor.h"
#include "../Core/Input/Midi1InputAdapter.h"
#include "../Core/Input/Midi2InputAdapter.h"
#include "../Core/Modulation/ModulationTelemetryHub.h"
#include "../Core/Modulation/ModulationTelemetryIndex.h"
#include "../Core/Service/SemanticBrokerService.h"

namespace Omega::Plugin {
    
    static void logToFile(const std::string& msg) {
        static juce::CriticalSection gLogLock;
        const juce::ScopedLock sl(gLogLock);
        juce::File logFile = juce::File::getSpecialLocation(juce::File::currentExecutableFile).getSiblingFile("OMEGA_BOOT_LOG.txt");
        logFile.appendText("[" + juce::Time::getCurrentTime().toString(true, true) + "] " + msg + "\n");
    }

    // Helper to check and log null parameters
    static bool isNull(std::atomic<float>* p, const char* name) {
        if (p == nullptr) {
            static std::set<std::string> loggedOnce;
            std::string key(name);
            if (loggedOnce.find(key) == loggedOnce.end()) {
                logToFile("CRITICAL: Parameter NOT FOUND: " + key);
                loggedOnce.insert(key);
            }
            return true;
        }
        return false;
    }

    OmegaAudioProcessor::OmegaAudioProcessor() 
        : AudioProcessor(BusesProperties().withOutput("Output", juce::AudioChannelSet::stereo(), true)),
          mValidator(mCatalog),
          mSystemSettings(),
          mEngine(mSystemSettings),
          mPresetRepository("d:/desarrollos/ABDOmega/Resources/presets"),
          mApvts(*this, nullptr, "PARAMETERS", createParameterLayout()),
          mEngineConfig(mEngine, mCatalog),
          mPresetService(mCatalog),
          mUiBridge(this, mCurrentPreset, mCatalog, &mPresetRepository, mApvts, mSystemSettings)
    {
        logToFile("OmegaAudioProcessor: Constructor Start");
        
        juce::File resourceDir("d:/desarrollos/ABDOmega/Resources/ace");
        auto loadedCatalog = Core::Ace::AceCatalog::createFromResources(resourceDir.getFullPathName().toStdString());
        if (loadedCatalog) {
            for (auto const* info : loadedCatalog->getComponents()) {
                mCatalog.registerComponent(*info);
            }
            mCatalog.buildFallbacks();
            logToFile("OmegaAudioProcessor: ACE Catalog populated with " + std::to_string(mCatalog.getComponents().size()) + " components");
        } else {
            logToFile("CRITICAL: Failed to load ACE Catalog from " + resourceDir.getFullPathName().toStdString());
        }

        startTimer(2000); // 2 seconds watchdog
        mUiBridge.setOnLoadCallback([this](const Core::Preset::OmegaPreset& p) { this->loadPreset(p); });

        // Initialize Parameter Cache
        mParamCache.cutoff = mApvts.getRawParameterValue("layer.a.cutoff");
        mParamCache.resonance = mApvts.getRawParameterValue("layer.a.resonance");
        mParamCache.chorusMode = mApvts.getRawParameterValue("global.chorus.mode");
        mParamCache.hpfPos = mApvts.getRawParameterValue("layer.a.hpf.pos");
        mParamCache.vcaMode = mApvts.getRawParameterValue("layer.a.vca.mode");
        mParamCache.drift = mApvts.getRawParameterValue("layer.a.drift");
        mParamCache.sawOn = mApvts.getRawParameterValue("layer.a.osc.saw.on");
        mParamCache.pulseOn = mApvts.getRawParameterValue("layer.a.osc.pulse.on");
        mParamCache.subLevel = mApvts.getRawParameterValue("layer.a.osc.sub.level");
        mParamCache.noiseLevel = mApvts.getRawParameterValue("layer.a.osc.noise.level");
        mParamCache.pwmMode = mApvts.getRawParameterValue("layer.a.osc.pwm.mode");
        mParamCache.pwmAmount = mApvts.getRawParameterValue("layer.a.osc.pwm.amount");
        mParamCache.vcfEnvDepth = mApvts.getRawParameterValue("layer.a.vcf.env.depth");
        mParamCache.vcfLfoDepth = mApvts.getRawParameterValue("layer.a.vcf.lfo.depth");
        mParamCache.vcfKybd = mApvts.getRawParameterValue("layer.a.vcf.keytrack");
        mParamCache.vcfEnvPol = mApvts.getRawParameterValue("layer.a.vcf.env.inv");
        mParamCache.dcoLfoDepth = mApvts.getRawParameterValue("layer.a.dco.lfo.depth");
        mParamCache.jpDetune = mApvts.getRawParameterValue("layer.a.jp.detune");
        mParamCache.jpFilterMode = mApvts.getRawParameterValue("layer.a.jp.filter.mode");
        mParamCache.korgHpCutoff = mApvts.getRawParameterValue("layer.a.korg.hpf.cutoff");
        mParamCache.korgHpRes = mApvts.getRawParameterValue("layer.a.korg.hpf.res");
        mParamCache.korgGrit = mApvts.getRawParameterValue("layer.a.korg.grit");

        // --- ADSR / VCA / LFO Cache ---
        mParamCache.mainAttack = mApvts.getRawParameterValue("layer.a.env.attack");
        mParamCache.mainDecay = mApvts.getRawParameterValue("layer.a.env.decay");
        mParamCache.mainSustain = mApvts.getRawParameterValue("layer.a.env.sustain");
        mParamCache.mainRelease = mApvts.getRawParameterValue("layer.a.env.release");
        mParamCache.mainVcaGain = mApvts.getRawParameterValue("layer.a.vca.gain");
        mParamCache.mainLfoRate = mApvts.getRawParameterValue("layer.a.lfo.rate");
        mParamCache.mainLfoWave = mApvts.getRawParameterValue("layer.a.lfo.wave");
        
        // --- Space Echo Cache ---
        mParamCache.spaceEchoEnabled = mApvts.getRawParameterValue("layer.a.fx.space.enable");
        mParamCache.spaceEchoSpeed = mApvts.getRawParameterValue("layer.a.fx.space.speed");
        mParamCache.spaceEchoIntensity = mApvts.getRawParameterValue("layer.a.fx.space.intensity");
        mParamCache.spaceEchoEchoVol = mApvts.getRawParameterValue("layer.a.fx.space.echo.vol");
        mParamCache.spaceEchoReverbVol = mApvts.getRawParameterValue("layer.a.fx.space.rev.vol");
        mParamCache.spaceEchoMode = mApvts.getRawParameterValue("layer.a.fx.space.mode");
        mParamCache.spaceEchoWow = mApvts.getRawParameterValue("layer.a.fx.space.wow");
        mParamCache.spaceEchoDrive = mApvts.getRawParameterValue("layer.a.fx.space.drive");

        // --- Master Delay Cache ---
        mParamCache.delayEnabled = mApvts.getRawParameterValue("global.delay.enable");
        mParamCache.delayTime = mApvts.getRawParameterValue("global.delay.time");
        mParamCache.delayFeedback = mApvts.getRawParameterValue("global.delay.feedback");
        mParamCache.delayMix = mApvts.getRawParameterValue("global.delay.mix");

        // Carga inicial del preset de factoría
        logToFile("OmegaAudioProcessor: Loading initial preset (VERIFICATION)...");
        loadPreset(Core::Preset::JunoFactory::createVerificationPreset());
        logToFile("OmegaAudioProcessor: Constructor End");
    }

    OmegaAudioProcessor::~OmegaAudioProcessor() {
        logToFile("OmegaAudioProcessor: Destructor called");
    }

    void OmegaAudioProcessor::prepareToPlay(double sampleRate, int samplesPerBlock) {
        logToFile("OmegaAudioProcessor: prepareToPlay (SR: " + std::to_string(sampleRate) + ", Block: " + std::to_string(samplesPerBlock) + ")");
        // --- REESTABLECIDO EN BUILD 57 ---
        mEngine.prepare (sampleRate, samplesPerBlock);
        mMasterDelay.setSampleRate(sampleRate);
        
        logToFile("OmegaAudioProcessor: prepareToPlay END");
    }

    void OmegaAudioProcessor::releaseResources() {
        static std::atomic<bool> logged(false);
        if (!logged.exchange(true)) logToFile("OmegaAudioProcessor: releaseResources called");
    }

    void OmegaAudioProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) {
        static std::atomic<bool> firstBeat(true);
        if (firstBeat.exchange(false)) logToFile("OmegaAudioProcessor: processBlock FIRST BEAT");
        
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

        // 1. Unificar MIDI (UI + Hardware)
        mInput.clear();
        Core::Input::Midi1InputAdapter::process(midiMessages, mInput);
        
        // --- Monitor MIDI events for UI ---
        for (const auto metadata : midiMessages) {
            auto msg = metadata.getMessage();
            Core::Modulation::MidiMonitor::getInstance().pushEvent(msg);
        }

        if (!midiMessages.isEmpty()) {
            static int midiLogCounter = 0;
            if (midiLogCounter++ % 100 == 0) logToFile("AUDIO: processBlock MIDI EVENTS: " + std::to_string(midiMessages.getNumEvents()));
        }

        // 2. Renderizado del motor (ACE dynamic bridge)
        // --- REESTABLECIDO EN BUILD 57 ---
        mEngine.renderNextBlock(buffer, mInput);

        // 3. Post-FX: Master Delay
        if (mParamCache.delayEnabled && mParamCache.delayEnabled->load() > 0.5f) {
            float time = mParamCache.delayTime ? mParamCache.delayTime->load() : 0.5f;
            float feedback = mParamCache.delayFeedback ? mParamCache.delayFeedback->load() : 0.3f;
            float mix = mParamCache.delayMix ? mParamCache.delayMix->load() : 0.0f;
            
            mMasterDelay.process(buffer.getWritePointer(0), buffer.getWritePointer(1), 
                                  buffer.getNumSamples(), time, feedback, mix);
        }

        // 4. Capture Final Telemetry (Indices 40-47: Post-FX)
        if (buffer.getNumSamples() > 0) {
            using namespace ::Omega::Core::Modulation;
            auto& telemetry = ModulationTelemetryHub::getInstance();
            
            // Sub-sample to keep overhead low (every 32 samples)
            for (int s = 0; s < buffer.getNumSamples(); s += 32) {
                float finalL = buffer.getSample(0, s);
                float finalR = (buffer.getNumChannels() > 1) ? buffer.getSample(1, s) : finalL;
                telemetry.pushSignal((int)TelemetryIndex::Audio_Master_Out, (finalL + finalR) * 0.5f);
            }
        }

        // Sanity Check for silence
        float magnitude = buffer.getMagnitude(0, buffer.getNumSamples());
        if (magnitude > 0.0001f) {
            static int signalLogCounter = 0;
            if (signalLogCounter++ % 500 == 0) logToFile("AUDIO: Signal detected! Mag: " + std::to_string(magnitude));
        }
    }

    void OmegaAudioProcessor::timerCallback() {
        static std::atomic<bool> logged(false);
        if (!logged.exchange(true)) logToFile("WATCHDOG: Message Thread ALIVE");
    }

    void OmegaAudioProcessor::updateParameters() noexcept {
        for (auto const& [id, valuePtr] : {
            std::pair{"layer.a.cutoff", mParamCache.cutoff},
            {"layer.a.resonance", mParamCache.resonance},
            {"layer.a.env.attack", mParamCache.mainAttack},
            {"layer.a.env.decay", mParamCache.mainDecay},
            {"layer.a.env.sustain", mParamCache.mainSustain},
            {"layer.a.env.release", mParamCache.mainRelease},
            {"layer.a.osc.saw.on", mParamCache.sawOn},
            {"layer.a.osc.pulse.on", mParamCache.pulseOn},
            {"layer.a.osc.sub.level", mParamCache.subLevel},
            {"layer.a.vcf.lfo.depth", mParamCache.vcfLfoDepth},
            {"layer.a.vca.gain", mParamCache.mainVcaGain},
            {"layer.a.korg.grit", mParamCache.korgGrit},
            {"layer.a.korg.hpf.cutoff", mParamCache.korgHpCutoff},
            {"layer.a.korg.hpf.res", mParamCache.korgHpRes},
            {"global.chorus.mode", mParamCache.chorusMode},
            {"layer.a.hpf.pos", mParamCache.hpfPos},
            {"layer.a.vca.mode", mParamCache.vcaMode},
            {"layer.a.osc.pwm.mode", mParamCache.pwmMode},
            {"layer.a.osc.pwm.amount", mParamCache.pwmAmount},
            {"layer.a.vcf.env.depth", mParamCache.vcfEnvDepth},
            {"layer.a.vcf.keytrack", mParamCache.vcfKybd},
            {"layer.a.vcf.env.inv", mParamCache.vcfEnvPol},
            {"layer.a.dco.lfo.depth", mParamCache.dcoLfoDepth},
            {"layer.a.lfo.rate", mParamCache.mainLfoRate},
            {"layer.a.lfo.wave", mParamCache.mainLfoWave},
            {"layer.a.jp.detune", mParamCache.jpDetune},
            {"layer.a.fx.space.enable", mParamCache.spaceEchoEnabled},
            {"layer.a.fx.space.speed", mParamCache.spaceEchoSpeed},
            {"layer.a.fx.space.intensity", mParamCache.spaceEchoIntensity},
            {"layer.a.fx.space.echo.vol", mParamCache.spaceEchoEchoVol},
            {"layer.a.fx.space.rev.vol", mParamCache.spaceEchoReverbVol},
            {"layer.a.fx.space.mode", mParamCache.spaceEchoMode},
            {"global.delay.enable", mParamCache.delayEnabled},
            {"global.delay.time", mParamCache.delayTime},
            {"global.delay.feedback", mParamCache.delayFeedback},
            {"global.delay.mix", mParamCache.delayMix}
        }) {
            if (valuePtr != nullptr) {
                mEngineConfig.updateParameter(id, valuePtr->load());
            }
        }
    }

    void OmegaAudioProcessor::loadPreset(const Core::Preset::OmegaPreset& preset) {
        using IDs = Core::Identifiers;
        Core::Preset::OmegaPreset validatedPreset = preset;
        mValidator.validateAndRepairPreset(validatedPreset);
        
        mCurrentPreset = validatedPreset;

        // 1. Delegar configuración del motor a la fachada
        mEngineConfig.applyPreset(mCurrentPreset);

        // 2. SINCRONIZACION DE PARAMETROS (Build 110 - Metadata Driven)
        auto& registry = Core::ParameterMetadataRegistry::getInstance();
        auto globalParams = mCurrentPreset.getState().getChildWithName(IDs::params);
        auto layer0Params = mCurrentPreset.getNumLayers() > 0 ? 
            mCurrentPreset.getLayerTree(0).getChildWithName(IDs::params) : juce::ValueTree();

        for (auto const& [id, desc] : registry.getAllParameters()) {
            if (!desc.valueTreePropertyId.isValid()) continue;

            juce::ValueTree sourceTree;
            juce::String jId(id);
            if (jId.startsWith("global")) {
                sourceTree = globalParams;
            } else if (jId.startsWith("layer.a")) {
                sourceTree = layer0Params;
            }

            if (sourceTree.isValid() && sourceTree.hasProperty(desc.valueTreePropertyId)) {
                if (auto* p = mApvts.getParameter(id)) {
                    float val = sourceTree.getProperty(desc.valueTreePropertyId);
                    p->setValueNotifyingHost(p->getNormalisableRange().convertTo0to1(val));
                }
            }
        }
    }

    juce::AudioProcessorValueTreeState::ParameterLayout OmegaAudioProcessor::createParameterLayout() {
        logToFile("OmegaAudioProcessor: createParameterLayout START");
        std::vector<std::unique_ptr<juce::RangedAudioParameter>> params;
        
        auto& registry = Omega::Core::ParameterMetadataRegistry::getInstance();
        registry.initializeDefaults();

        for (auto const& [id, desc] : registry.getAllParameters()) {
            if (desc.valueType == Core::ParamValueType::Enum && !desc.options.empty()) {
                juce::StringArray labels;
                for (auto const& opt : desc.options) {
                    labels.add(opt.label);
                }
                params.push_back(std::make_unique<juce::AudioParameterChoice>(
                    juce::ParameterID(id, 1), desc.name, labels, (int)desc.defaultValue));
            } else if (desc.valueType == Core::ParamValueType::Boolean || desc.unit == "Bool") {
                params.push_back(std::make_unique<juce::AudioParameterBool>(
                    juce::ParameterID(id, 1), desc.name, desc.defaultValue > 0.5f));
            } else if (desc.valueType == Core::ParamValueType::Integer) {
                params.push_back(std::make_unique<juce::AudioParameterInt>(
                    juce::ParameterID(id, 1), desc.name, (int)desc.minValue, (int)desc.maxValue, (int)desc.defaultValue));
            } else {
                // Continuous / Float parameters
                params.push_back(std::make_unique<juce::AudioParameterFloat>(
                    juce::ParameterID(id, 1), desc.name, 
                    juce::NormalisableRange<float>(desc.minValue, desc.maxValue, desc.step, desc.skew), desc.defaultValue));
            }
        }

        logToFile("OmegaAudioProcessor: createParameterLayout END (" + std::to_string(params.size()) + " parameters)");
        return { params.begin(), params.end() };
    }

    // --- JUCE Magic Impl ---
    juce::AudioProcessorEditor* OmegaAudioProcessor::createEditor() { 
        logToFile("OmegaAudioProcessor: createEditor called");
#ifndef OMEGA_UNIT_TESTS
        return new UI::OmegaMainEditor(*this, mUiBridge); 
#else
        return nullptr;
#endif
    }
    
    bool OmegaAudioProcessor::hasEditor() const { 
        logToFile("OmegaAudioProcessor: hasEditor called");
        return true; 
    }
    const juce::String OmegaAudioProcessor::getName() const { 
        // Solo loguear una vez para no inundar
        static std::atomic<bool> logged(false);
        if (!logged.exchange(true)) logToFile("OmegaAudioProcessor: getName called");
        return "OMEGA Synth"; 
    }
    bool OmegaAudioProcessor::acceptsMidi() const { 
        static std::atomic<bool> logged(false);
        if (!logged.exchange(true)) logToFile("OmegaAudioProcessor: acceptsMidi called");
        return true; 
    }
    bool OmegaAudioProcessor::producesMidi() const { 
        static std::atomic<bool> logged(false);
        if (!logged.exchange(true)) logToFile("OmegaAudioProcessor: producesMidi called");
        return true; 
    }

    double OmegaAudioProcessor::getTailLengthSeconds() const { return 0.0; }
    int OmegaAudioProcessor::getNumPrograms() { return 1; }
    int OmegaAudioProcessor::getCurrentProgram() { return 0; }
    void OmegaAudioProcessor::setCurrentProgram(int index) {}
    const juce::String OmegaAudioProcessor::getProgramName(int index) { return "Default"; }
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
    static void (*logExt)(const std::string&) = [](const std::string& msg) {
        juce::File logFile = juce::File::getSpecialLocation(juce::File::currentExecutableFile).getSiblingFile("OMEGA_BOOT_LOG.txt");
        logFile.appendText("[" + juce::Time::getCurrentTime().toString(true, true) + "] createPluginFilter: " + msg + "\n");
    };

    logExt("Start");
    auto* p = new Omega::Plugin::OmegaAudioProcessor();
    logExt("End");
    return p;
}
