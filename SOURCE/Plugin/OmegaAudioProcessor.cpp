#include "OmegaAudioProcessor.h"
#ifndef OMEGA_UNIT_TESTS
#include "../UI/OmegaMainEditor.h"
#endif
#include "../Core/Preset/JunoFactory.h"
#include "../Core/ParameterMetadata.h"
#include <set>
#include <string>
#include "../Core/Modulation/MidiMonitor.h"

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
          mPresetRepository("d:/desarrollos/ABDOmega/Resources/Presets"),
          mApvts(*this, nullptr, "PARAMETERS", createParameterLayout()),
          mEngineConfig(mEngine, mCatalog),
          mPresetService(mCatalog),
          mUiBridge(this, mCurrentPreset, mCatalog, &mPresetRepository, mApvts)
    {
        logToFile("OmegaAudioProcessor: Constructor Start");
        // ... (resto de inicialización de mParamCache)
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

        // 1. Traducir MIDI a OmegaInput
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
            {"LAYERAFXSPACEMODE", mParamCache.spaceEchoMode}
        }) {
            if (valuePtr != nullptr) {
                mEngineConfig.updateParameter(id, valuePtr->load());
            }
        }
    }

    void OmegaAudioProcessor::loadPreset(const Core::Preset::OmegaPreset& preset) {
        Core::Preset::OmegaPreset validatedPreset = preset;
        mValidator.validateAndRepairPreset(validatedPreset);
        
        mCurrentPreset = validatedPreset;

        // 1. Delegar configuración del motor a la fachada
        mEngineConfig.applyPreset(mCurrentPreset);

        // 2. SINCRONIZACION DE PARAMETROS (Build 64)
        // Notificar al APVTS para que la UI se actualice
        if (mCurrentPreset.getNumLayers() > 0) {
            auto layer = mCurrentPreset.getLayerTree(0);
            auto params = layer.getChildWithName(Core::Preset::IDs::params);
            
            auto setVal = [&](const juce::String& id, const juce::Identifier& prop) {
                if (auto* p = mApvts.getParameter(id)) {
                    float val = params.getProperty(prop);
                    p->setValueNotifyingHost(p->getNormalisableRange().convertTo0to1(val));
                }
            };

            setVal("LAYERAMAINCUTOFF", "cutoff");
            setVal("LAYERAMAINRESONANCE", "resonance");
            // ... resto de mapeado APVTS
        }
    }

    juce::AudioProcessorValueTreeState::ParameterLayout OmegaAudioProcessor::createParameterLayout() {
        logToFile("OmegaAudioProcessor: createParameterLayout START");
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
                } else if (id == "LAYERAFXSPACEMODE" || id == "LAYERAMAINLFOWAVE") {
                    params.push_back(std::make_unique<juce::AudioParameterInt>(
                        juce::ParameterID(id, 1), desc.name, (int)desc.minValue, (int)desc.maxValue, (int)desc.defaultValue));
                } else {
                    // Fallback para otros Choice/Mode
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
