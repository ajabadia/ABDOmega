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
        mParamCache.korgHpCutoff = mApvts.getRawParameterValue("LAYERAKORGHPFCUTOFF");
        mParamCache.korgHpRes = mApvts.getRawParameterValue("LAYERAKORGHPFRESONANCE");
        mParamCache.korgGrit = mApvts.getRawParameterValue("LAYERAKORGGRIT");

        // --- ADSR / VCA / LFO Cache ---
        mParamCache.mainAttack = mApvts.getRawParameterValue("LAYERAMAINATTACK");
        mParamCache.mainDecay = mApvts.getRawParameterValue("LAYERAMAINDECAY");
        mParamCache.mainSustain = mApvts.getRawParameterValue("LAYERAMAINSUSTAIN");
        mParamCache.mainRelease = mApvts.getRawParameterValue("LAYERAMAINRELEASE");
        mParamCache.mainVcaGain = mApvts.getRawParameterValue("LAYERAMAINVCAGAIN");
        mParamCache.mainLfoRate = mApvts.getRawParameterValue("LAYERAMAINLFORATE");
        mParamCache.mainLfoWave = mApvts.getRawParameterValue("LAYERAMAINLFOWAVE");
        
        // --- Space Echo Cache ---
        mParamCache.spaceEchoEnabled = mApvts.getRawParameterValue("LAYERAFXSPACEENABLE");
        mParamCache.spaceEchoSpeed = mApvts.getRawParameterValue("LAYERAFXSPACESPEED");
        mParamCache.spaceEchoIntensity = mApvts.getRawParameterValue("LAYERAFXSPACEINTENSITY");
        mParamCache.spaceEchoEchoVol = mApvts.getRawParameterValue("LAYERAFXSPACEECHOVOL");
        mParamCache.spaceEchoReverbVol = mApvts.getRawParameterValue("LAYERAFXSPACEREVERBVOL");
        mParamCache.spaceEchoMode = mApvts.getRawParameterValue("LAYERAFXSPACEMODE");
        mParamCache.spaceEchoWow = mApvts.getRawParameterValue("LAYERAFXSPACEWOW");
        mParamCache.spaceEchoDrive = mApvts.getRawParameterValue("LAYERAFXSPACEDRIVE");

        // --- Master Delay Cache ---
        mParamCache.delayEnabled = mApvts.getRawParameterValue("MASTERDELAYENABLED");
        mParamCache.delayTime = mApvts.getRawParameterValue("MASTERDELAYTIME");
        mParamCache.delayFeedback = mApvts.getRawParameterValue("MASTERDELAYFEEDBACK");
        mParamCache.delayMix = mApvts.getRawParameterValue("MASTERDELAYMIX");

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
            std::pair{"LAYERAMAINCUTOFF", mParamCache.cutoff},
            {"LAYERAMAINRESONANCE", mParamCache.resonance},
            {"LAYERAMAINATTACK", mParamCache.mainAttack},
            {"LAYERAMAINDECAY", mParamCache.mainDecay},
            {"LAYERAMAINSUSTAIN", mParamCache.mainSustain},
            {"LAYERAMAINRELEASE", mParamCache.mainRelease},
            {"LAYERAMAINSAWON", mParamCache.sawOn},
            {"LAYERAMAINPULSEON", mParamCache.pulseOn},
            {"LAYERASUBOSELEVEL", mParamCache.subLevel},
            {"LAYERAVCFMODDEPTH", mParamCache.vcfLfoDepth},
            {"LAYERAMAINVCAGAIN", mParamCache.mainVcaGain},
            {"LAYERAKORGGRIT", mParamCache.korgGrit},
            {"LAYERAKORGHPFCUTOFF", mParamCache.korgHpCutoff},
            {"LAYERAKORGHPFRESONANCE", mParamCache.korgHpRes},
            {"LAYERACHORUSMODE", mParamCache.chorusMode},
            {"LAYERAMAINHPF", mParamCache.hpfPos},
            {"LAYERAMAINVCAMODE", mParamCache.vcaMode},
            {"LAYERAPWMMODE", mParamCache.pwmMode},
            {"LAYERAPWMAMOUNT", mParamCache.pwmAmount},
            {"LAYERAVCFENVDEPTH", mParamCache.vcfEnvDepth},
            {"LAYERAVCFKYBD", mParamCache.vcfKybd},
            {"LAYERAVCFENVPOL", mParamCache.vcfEnvPol},
            {"LAYERADCOLFODEPTH", mParamCache.dcoLfoDepth},
            {"LAYERAMAINLFORATE", mParamCache.mainLfoRate},
            {"LAYERAMAINLFOWAVE", mParamCache.mainLfoWave},
            {"LAYERAMAINJPDETUNE", mParamCache.jpDetune},
            {"LAYERAFXSPACEENABLE", mParamCache.spaceEchoEnabled},
            {"LAYERAFXSPACESPEED", mParamCache.spaceEchoSpeed},
            {"LAYERAFXSPACEINTENSITY", mParamCache.spaceEchoIntensity},
            {"LAYERAFXSPACEECHOVOL", mParamCache.spaceEchoEchoVol},
            {"LAYERAFXSPACEREVERBVOL", mParamCache.spaceEchoReverbVol},
            {"LAYERAFXSPACEMODE", mParamCache.spaceEchoMode},
            {"MASTERDELAYENABLED", mParamCache.delayEnabled},
            {"MASTERDELAYTIME", mParamCache.delayTime},
            {"MASTERDELAYFEEDBACK", mParamCache.delayFeedback},
            {"MASTERDELAYMIX", mParamCache.delayMix}
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

        // 2. SINCRONIZACION DE PARAMETROS (Build 64)
        if (mCurrentPreset.getNumLayers() > 0) {
            auto layer = mCurrentPreset.getLayerTree(0);
            auto params = layer.getChildWithName(IDs::params);
            
            auto setVal = [&](const juce::String& apvtsId, const juce::Identifier& prop) {
                if (auto* p = mApvts.getParameter(apvtsId)) {
                    if (params.hasProperty(prop)) {
                        float val = params.getProperty(prop);
                        p->setValueNotifyingHost(p->getNormalisableRange().convertTo0to1(val));
                    }
                }
            };

            // Usar IDs centralizados para las propiedades del ValueTree
            setVal("LAYERAMAINCUTOFF", IDs::cutoff);
            setVal("LAYERAMAINRESONANCE", IDs::resonance);
            setVal("LAYERAMAINATTACK", IDs::attack);
            setVal("LAYERAMAINDECAY", IDs::decay);
            setVal("LAYERAMAINSUSTAIN", IDs::sustain);
            setVal("LAYERAMAINRELEASE", IDs::release);
            setVal("LAYERASUBOSELEVEL", IDs::subLevel);
            setVal("LAYERANOISELEVEL", IDs::noiseLevel);
            setVal("LAYERAMAINSAWON", IDs::sawOn);
            setVal("LAYERAMAINPULSEON", IDs::pulseOn);
            setVal("LAYERAMAINHPF", IDs::hpfPosition);
            setVal("LAYERAVCFENVDEPTH", IDs::vcfEnvDepth);
            setVal("LAYERAVCFKYBD", IDs::vcfKeyTracking);
            setVal("LAYERAVCFENVPOL", IDs::vcfEnvInverted);
            // ... (resto se irá moviendo al Bridge en Fase 5)
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
