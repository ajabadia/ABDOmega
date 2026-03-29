#pragma once

#include <array>
#include <cmath>
#include <algorithm>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>

#include "../Roland/Juno/JunoConstants.h"
#include "../ISynthesisEngine.h"
#include "../Roland/Juno/OscillatorPoolJunoDco.h"
#include "../Korg/MS20/FilterPoolKorg35.h"
#include "../Roland/Juno/FilterPoolJunoIr3109.h"
#include "../Roland/JP/OscillatorPoolJp8080.h"
#include "../Roland/JP/OscillatorPoolJpFeedback.h"
#include "../Roland/JP/OscillatorPoolJpDual.h"
#include "../Roland/JP/FilterPoolJp8080.h"
#include "../Roland/JP/FilterPoolJpFormant.h"
#include "../../../Core/Modulation/MotionRecorder.h"
#include "../Korg/Prophecy/OscillatorPoolProphecyPluck.h"
#include "../Korg/Prophecy/OscillatorPoolProphecyBrass.h"
#include "../Korg/Prophecy/OscillatorPoolProphecyReed.h"
#include "../Korg/Prophecy/OscillatorPoolProphecyVpm.h"
#include "../Korg/Prophecy/OscillatorPoolProphecyBowed.h"
#include "../Korg/Prophecy/ProphecyMacroContext.h"
#include "../Roland/Juno/ChorusPoolJuno.h"
#include "EnvelopeAdsrVA.h"
#include "../Korg/MS20/EnvelopeMs20.h"
#include "../../FX/Roland/RE201/SpaceEchoProcessor.h"
#include "../Korg/MS20/KorgMs20Esp.h"
#include "../Korg/Prophecy/OscillatorPoolProphecyNoiseComb.h"
#include "../Korg/Prophecy/OscillatorPoolProphecyEP.h"
#include "../Korg/Prophecy/OscillatorPoolProphecyOrgan.h"
#include "../Korg/Prophecy/OscillatorPoolProphecyWaveshaper.h"
#include "../Korg/Prophecy/ProphecyArpeggiator.h"
#include "../Korg/Prophecy/FilterPoolResonantBank.h"
#include "../../Core/Modulation/EnvelopeMultiStage.h"
#include "../../../Core/Modulation/ModulationRuntime.h"
#include "../../../Core/Service/EngineConfig.h"
#include "../../../Core/Input/OmegaInput.h"
#include "../../../Core/Input/ModSource.h"
#include "../../../Core/Modulation/ModulationTelemetryHub.h"
#include "../../../Core/Modulation/ModulationTelemetryIndex.h"
#include "../../../Core/Util/PerformanceMonitor.h"

namespace Omega::DSP::Engines::Modular {

    using namespace ::Omega::DSP::Engines::Roland::Juno::Constants;

    /**
     * @brief Motor de síntesis Virtual Analog estilo Juno / Modular ACE Refinado.
     */
    class VirtualAnalogEngine : public ::Omega::DSP::Engines::ISynthesisEngine {
    public:

        VirtualAnalogEngine() {
            mChannelModStates.fill(0.0f);
            for (int i = 0; i < 16; ++i) {
                mHpfFilters[i].setType(juce::dsp::FirstOrderTPTFilterType::highpass);
                mOscModes[i] = OscillatorMode::JunoDco;
                mActiveNotes[i] = -1;
            }
        }
        ~VirtualAnalogEngine() override = default;

        // --- Lifecycle ---
        void prepare(double sampleRate, int samplesPerBlock) override {
            log("prepare() Start");
            mSampleRate = sampleRate;
            log("mOscPool.prepare()");
            mOscPool.prepare(sampleRate);
            log("mJpOscPool.prepare()");
            mJpOscPool.prepare(sampleRate);
            log("mJunoFlt.prepare()");
            mJunoFlt.prepare(sampleRate);
            log("mKorg35Flt.prepare()");
            mKorg35Flt.prepare(sampleRate);
            log("mJpFilterPool.prepare()");
            mJpFilterPool.prepare(sampleRate);
            log("mChorusPool.prepare()");
            mChorusPool.prepare(sampleRate);
            log("mSpaceEcho.prepare()");
            mSpaceEcho.prepare(sampleRate);
            log("mMs20Envelopes[16].prepare()");
            for (auto& env : mMs20Envelopes) env.prepare(sampleRate);
            log("Prophecy Oscillators.prepare()...");
            mBowedOsc.prepare(sampleRate);
            mPluckOsc.prepare(sampleRate);
            mBrassOsc.prepare(sampleRate);
            mReedOsc.prepare(sampleRate);
            mVpmOsc.prepare(sampleRate);
            log("Other Oscillators.prepare()...");
            mNoiseCombOsc.prepare(sampleRate);
            mResBankFlt.prepare(sampleRate);
            mMultiStageEnv.prepare(sampleRate);
            mJpFeedbackOsc.prepare(sampleRate);
            mJpDualOsc.prepare(sampleRate);
            mJpFormantFlt.prepare(sampleRate);
            
            log("Filters and Envelopes.prepare()...");
            juce::dsp::ProcessSpec spec { sampleRate, (::juce::uint32)samplesPerBlock, 1 };
            for (auto& f : mHpfFilters) f.prepare(spec);
            for (auto& f : mShelfFilters) {
                f.prepare(spec);
                f.coefficients = juce::dsp::IIR::Coefficients<float>::makeLowShelf(sampleRate, ::Omega::DSP::Engines::Roland::Juno::Constants::kShelfFreq, 0.707f, std::pow(10.0f, ::Omega::DSP::Engines::Roland::Juno::Constants::kShelfGainDb / 20.0f));
            }

            for (auto& env : mAmpEnvelopes) env.prepare(sampleRate);
            for (auto& env : mModEnvelopes) env.prepare(sampleRate);
            
            log("setupBasicModulation()");
            setupBasicModulation();
            mModRuntime.reset();
            log("prepare() End");
        }

        void reset() override {
            mModRuntime.reset();
            for (auto& f : mHpfFilters) f.reset();
            for (auto& f : mShelfFilters) f.reset();
            mJpOscPool.reset();
            mJpFilterPool.reset();
        }

        // --- Control ---
        void setFilterType(FilterType type) noexcept { mFilterType = type; }
        void setHpfPosition(int position) noexcept { mHpfPosition = position; updateHpfCoefficients(); }
        void setVcaModeGate(bool isGate) noexcept { mVcaGateMode = isGate; }
        void setDriftAmount(int voiceIndex, float amount) noexcept { mOscPool.setDriftAmount(voiceIndex, amount); }
        void setFxParams(int chorusMode, float mix = 0.5f) noexcept { mChorusPool.setMode(chorusMode); }
        
        void setSawEnabled(int voiceIndex, bool e) noexcept { mOscPool.setSawEnabled(voiceIndex, e); }
        void setPulseEnabled(int voiceIndex, bool e) noexcept { mOscPool.setPulseEnabled(voiceIndex, e); }
        void setSubLevel(int voiceIndex, float l) noexcept { mOscPool.setSubLevel(voiceIndex, l); mOscPool.setSubEnabled(voiceIndex, l > 0.001f); }
        void setNoiseLevel(int voiceIndex, float l) noexcept { mOscPool.setNoiseLevel(voiceIndex, l); mOscPool.setNoiseEnabled(voiceIndex, l > 0.001f); }
        
        void setPWMMode(bool lfoMode) noexcept { mPwmModeLfo = lfoMode; }
        void setPWMAmount(float amount) noexcept { mPwmAmount = amount; }
        
        void setVcfEnvDepth(float depth) noexcept { mVcfEnvDepth = depth; }
        void setVcfLfoDepth(float depth) noexcept { mVcfLfoDepth = depth; }
        void setVcfKeyTracking(float depth) noexcept { mVcfKeyTracking = depth; }
        void setVcfEnvPolarity(bool inverted) noexcept { mVcfEnvInverted = inverted; }
        void setDcoLfoDepth(float depth) noexcept { mDcoLfoDepth = depth; }
        
        void setVoiceParams(int voiceIndex, float lpCut, float lpRes, float hpCut, float hpRes, float grit) noexcept {
            mJunoFlt.setVoiceParams(voiceIndex, lpCut, lpRes);
            mKorg35Flt.setVoiceParams(voiceIndex, lpCut, lpRes, hpCut, hpRes, grit);
            mCurrentResonance = lpRes;
            mKorgHpCut = hpCut;
            mKorgHpRes = hpRes;
            mKorgGrit = grit;
        }

        void setOscillatorMode(int voiceIndex, OscillatorMode mode) noexcept { 
            if (voiceIndex < 16) mOscModes[voiceIndex] = mode; 
        }

        void setXModDepth(float depth) noexcept { mXModDepth = depth; }

        void setFilterSlotMode(FilterSlotMode mode) noexcept { mFilterSlotMode = mode; }
        
        void setVectorControl(float x, float y) noexcept {
            mProphecyMacros.vectorX = x;
            mProphecyMacros.vectorY = y;
        }
        
        void setJpDetune(float detune) noexcept { mJpDetune = detune; }
        void setJpSpread(float spread) noexcept { mJpSpread = spread; }
        void setJpFilterMode(int mode) noexcept { mJpFilterMode = mode; }
        
        void setSpaceEchoEnabled(bool e) noexcept { mSpaceEchoEnabled = e; }
        void setSpaceEchoParams(const ::Omega::DSP::FX::Roland::RE201::SpaceEchoProcessor::Params& params) noexcept {
            mSpaceEchoParams = params;
        }

        // --- New Modulators & Envelopes ---
        void setEnvelopeParams(float a, float d, float s, float r) noexcept {
            for (int v = 0; v < 16; ++v) {
                mAmpEnvelopes[v].setAttackMs(a);
                mAmpEnvelopes[v].setDecayMs(d);
                mAmpEnvelopes[v].setSustain(s);
                mAmpEnvelopes[v].setReleaseMs(r);
            }
        }

        void setLfoParams(float rate, int wave) noexcept {
            using namespace ::Omega::Core::Modulation;
            for (int i = 0; i < mModRuntime.kMaxNodes; ++i) {
                auto& node = mModRuntime.getRuntimeNode(i);
                if (node.outputIndex == (int)TelemetryIndex::Mod_LFO1 && node.type == 0) { // Node LFO1
                    node.state.lfo.increment = rate / (float)mSampleRate;
                    node.state.lfo.waveform = (uint8_t)wave;
                    break;
                }
            }
        }

        void setVcaGain(float gain) noexcept {
            mVcaMainGain = gain;
        }

        void pushConfigUpdate() noexcept {
            mPendingConfigUpdate.store(true);
        }

        // --- Audio Processing ---
        void renderNextBlock(::juce::AudioBuffer<float>& buffer, 
                             const ::Omega::Core::Input::OmegaInput& input) noexcept override {
            if (mPendingConfigUpdate.load()) {
                applyConfigUpdate();
                mPendingConfigUpdate.store(false);
            }
            ::Omega::Core::Util::PerformanceMonitor::ScopedTimer timer(mPerfMonitor);
            const int numSamples = buffer.getNumSamples();
            const int numChannels = buffer.getNumChannels();

            const auto& events = input;
            size_t nextEventIdx = 0;

            float espInput = 0.0f; 
            if (buffer.getNumChannels() > 0) espInput = buffer.getSample(0, 0); 
            
            auto espRes = mMs20Esp.process(espInput);
            mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::EspPitch)] = espRes.pitch;
            mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::EspEnvelope)] = espRes.envelope;
            mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::EspTrigger)] = espRes.trigger ? 1.0f : 0.0f;

            for (int s = 0; s < numSamples; ++s) {
                while (nextEventIdx < events.size() && events[nextEventIdx].sampleOffset <= s) {
                    processInputEvent(events[nextEventIdx++]);
                }

                mModRuntime.processBlock(1); 

                float mixedL = 0.0f;
                float mixedR = 0.0f;
                float oscSum = 0.0f;
                float vcfSum = 0.0f;

                if (mArpActive) {
                    mArpCounter++;
                    if (mArpCounter >= mArpIntervalSamples) {
                        mArpCounter = 0;
                        int vel = 100;
                        int note = mProphecyArp.nextNote(vel);
                        if (note >= 0) {
                            handleNoteOn(note, (float)note, (float)vel / 127.0f);
                        }
                    }
                }

                if (mMotionRecorder.isRecording()) {
                    mMotionRecorder.recordValue(mCurrentCutoff);
                }

                float filterDrive = 1.0f;
                float modSensitivity = 1.0f;
                float airNoise = 0.0f;
                float airHpf = 20.0f;
                float lfoRate, lfoDepth;
                
                ::Omega::DSP::Engines::Korg::Prophecy::ProphecyMacroContext::apply(mProphecyMacros, 
                    filterDrive, lfoRate, lfoDepth, airNoise, airHpf, modSensitivity);

                float lastActiveFreq = 440.0f;
                for (int v = 0; v < 16; ++v) {
                    if (mAmpEnvelopes[v].isActive()) {
                        using namespace ::Omega::Core::Modulation;
                        float lfoVal = mModRuntime.getSignalValue((int)TelemetryIndex::Mod_LFO1); 
                        float dcoLfo = lfoVal * mDcoLfoDepth;
                        float pitchMod = mModRuntime.getSignalValue(3) + dcoLfo; 
                        float pitchBend = mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::PitchBend)];
                        float voiceFreq = ::juce::MidiMessage::getMidiNoteInHertz(mActiveNotes[v] + (pitchBend * 2.0f) + (pitchMod / 1.0f));
                        lastActiveFreq = voiceFreq;
                        
                        float targetPWM = mPwmAmount;
                        if (mPwmModeLfo) targetPWM = 0.5f + (lfoVal * mPwmAmount * 0.5f);
                        mOscPool.setPWMAmount(v, targetPWM);

                        float oscL = 0.0f;
                        float oscR = 0.0f;
                        if (mOscModes[v] == OscillatorMode::JpSuperSaw) {
                            float pitchShift = std::pow(2.0f, pitchMod / 12.0f);
                            float freq = mJpBaseFreqs[v] * pitchShift;
                            mJpOscPool.processStereo(v, &oscL, &oscR, 1, freq, mJpDetune, mJpSpread, 1.0f);
                        } else if (mOscModes[v] == OscillatorMode::ProphecyPluck) {
                            oscL = mPluckOsc.process(v);
                            oscR = oscL;
                        } else if (mOscModes[v] == OscillatorMode::ProphecyBrass) {
                            float at = mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::ChannelPressure)];
                            float ribbon = mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::Ribbon)];
                            float pe1 = mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::PE1)];
                            float pe3 = mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::PE3)];
                            float pe5 = mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::PE5)];

                            auto myClamp = [](float x, float min, float max) { return (x < min) ? min : (x > max ? max : x); };
                            mBrassOsc.setVoiceParams(v, 
                                myClamp(0.5f + (ribbon * 0.4f) + (pe1 * 0.2f), 0.1f, 0.9f), 
                                myClamp(0.3f + (at * 0.7f) * (0.5f + pe5), 0.0f, 1.0f),     
                                myClamp(0.5f + pe3 * 0.4f, 0.0f, 1.0f),                    
                                0.1f);
                            oscL = mBrassOsc.process(v);
                            oscR = oscL;
                        } else if (mOscModes[v] == OscillatorMode::ProphecyReed) {
                            float at = mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::ChannelPressure)];
                            float pe3 = mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::PE3)];
                            mReedOsc.setVoiceParams(v, 0.5f, 0.3f + at * 0.5f, 1.0f + at * 0.2f + pe3 * 0.3f);
                            oscL = mReedOsc.process(v);
                            oscR = oscL;
                        } else if (mOscModes[v] == OscillatorMode::ProphecyVpm) {
                            float ribbon = mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::Ribbon)];
                            float pe3 = mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::PE3)];
                            mVpmOsc.setVoiceParams(v, 0.5f + ribbon * 1.5f + pe3 * 1.0f, 0.2f, 1.0f);
                            oscL = mVpmOsc.process(v);
                            oscR = oscL;
                        } else if (mOscModes[v] == OscillatorMode::ProphecyNoiseComb) {
                            float air = mProphecyMacros.air;
                            mNoiseCombOsc.setVoiceParams(v, 0.2f + air * 0.6f, 0.8f, 0.5f);
                            oscL = mNoiseCombOsc.process(v);
                            oscR = oscL;
                        } else if (mOscModes[v] == OscillatorMode::JpFeedback) {
                            float feedback = mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::PE3)];
                            float speed = mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::PE4)];
                            mJpFeedbackOsc.setVoiceParams(v, (float)voiceFreq, 0.4f + feedback * 0.5f, 0.2f + speed * 1.5f);
                            oscL = mJpFeedbackOsc.process(v);
                            oscR = oscL;
                        } else if (mOscModes[v] == OscillatorMode::JpDual) {
                            float xmod = mXModDepth; 
                            float mix = 0.5f; 
                            float freq2 = (float)voiceFreq * std::pow(2.0f, mJpOsc2Detune / 12.0f);
                            mJpDualOsc.setVoiceParams(v, (float)voiceFreq, freq2, xmod, mJpSync, mix);
                            oscL = mJpDualOsc.process(v);
                            oscR = oscL;
                        } else if (mOscModes[v] == OscillatorMode::ProphecyElectricPiano) {
                            oscL = mElectricPianoOsc.process(v);
                            oscR = oscL;
                        } else if (mOscModes[v] == OscillatorMode::ProphecyOrgan) {
                            oscL = mOrganOsc.process(v, (float)voiceFreq);
                            oscR = oscL;
                        } else if (mOscModes[v] == OscillatorMode::ProphecyBowed) {
                            float ribbon = mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::Ribbon)] * modSensitivity;
                            float at = mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::ChannelPressure)] * modSensitivity;
                            mBowedOsc.setVoiceParams(v, 
                                0.3f + at * 0.6f,   
                                0.2f + ribbon * 0.2f, 
                                0.4f + ribbon * 0.4f); 
                            oscL = mBowedOsc.process(v);
                            oscR = oscL;
                        } else {
                            oscL = mOscPool.process(v, lfoVal); 
                            oscR = oscL;
                        }
                        oscSum += oscL;

                        if (mOscModes[v] >= OscillatorMode::ProphecyPluck && mOscModes[v] <= OscillatorMode::ProphecyOrgan) {
                            Engines::Korg::Prophecy::OscillatorPoolProphecyWaveshaper::Params wp;
                            wp.drive = mProphecyMacros.energy * 2.0f;
                            wp.mix = mProphecyMacros.movement;
                            wp.mode = mProphecyWaveshaperMode;
                            oscL = mProphecyWaveshaper.process(v, oscL, wp);
                            oscR = oscL;
                        }

                        float noise = airNoise * (((float)rand() / RAND_MAX) * 2.0f - 1.0f);
                        oscL += noise;
                        oscR += noise;
                        
                        float envVal = mAmpEnvelopes[v].getNextSample(); 
                        float filterEnv = (mFilterType == FilterType::Korg35) ? mMs20Envelopes[v].getNextSample() : mModEnvelopes[v].getNextSample();
                        float cutoffMod = mModRuntime.getSignalValue(8) * modSensitivity; 
                        float nativeVcfMod = (lfoVal * mVcfLfoDepth) + (filterEnv * mVcfEnvDepth * (mVcfEnvInverted ? -1.0f : 1.0f));
                        
                        float finalCutoff = mCurrentCutoff + ((cutoffMod + nativeVcfMod) * 8000.0f);
                        float filteredL = 0.0f;
                        float filteredR = 0.0f;

                        if (mFilterSlotMode == FilterSlotMode::ResonantBank) {
                            mResBankFlt.setVoiceParams(v, finalCutoff, 1.0f + mProphecyMacros.movement * 0.5f, mCurrentResonance);
                            filteredL = mResBankFlt.process(v, oscL);
                            filteredR = filteredL;
                        } else if (mFilterType == FilterType::JunoIR3109) {
                            float pe1 = mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::PE1)];
                            mJunoFlt.setVoiceParams(v, finalCutoff + pe1 * 4000.0f, mCurrentResonance);
                            filteredL = mJunoFlt.process(v, oscL);
                            filteredR = filteredL;
                        } else if (mFilterType == FilterType::Korg35) {
                            float pe1 = mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::PE1)];
                            float pe3 = mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::PE3)];
                            float finalGrit = (mKorgGrit + pe3 * 2.0f) * filterDrive;
                            mKorg35Flt.setVoiceParams(v, finalCutoff + pe1 * 4000.0f, mCurrentResonance, mKorgHpCut, mKorgHpRes, finalGrit);
                            filteredL = mKorg35Flt.process(v, oscL);
                            filteredR = filteredL;
                        } else if (mFilterType == FilterType::JP8080) {
                            float pe1 = mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::PE1)];
                            float targetCutoff = finalCutoff + pe1 * 4000.0f;
                            filteredL = mJpFilterPool.process(v, oscL, targetCutoff, mCurrentResonance, mJpFilterMode);
                            if (mOscModes[v] == OscillatorMode::JpSuperSaw && mJpSpread > 0.001f) {
                                filteredR = mJpFilterPool.process(v, oscR, targetCutoff, mCurrentResonance, mJpFilterMode);
                            } else {
                                filteredR = filteredL;
                            }
                        } else if (mFilterType == FilterType::JPFormant) {
                            float vowelPos = mCurrentResonance; 
                            mJpFormantFlt.setVowel(v, vowelPos);
                            filteredL = mJpFormantFlt.process(v, oscL);
                            filteredR = filteredL;
                        }
                        vcfSum += (filteredL + filteredR) * 0.5f;

                        float hpfOutL = filteredL;
                        float hpfOutR = filteredR;
                        if (mHpfPosition >= 2) {
                            hpfOutL = mHpfFilters[v].processSample(0, hpfOutL);
                            hpfOutR = hpfOutL; 
                        } else if (mHpfPosition == 0) {
                            hpfOutL = mShelfFilters[v].processSample(hpfOutL);
                            hpfOutR = hpfOutL;
                        }
                        
                        float envGain = (mVcaGateMode ? 1.0f : envVal);
                        float finalGain = envGain * mVcaMainGain;
                        float resComp = 1.0f + (mCurrentResonance * mCurrentResonance * 0.5f);
                        mixedL += hpfOutL * finalGain * resComp;
                        mixedR += hpfOutR * finalGain * resComp;
                    }
                }

                float left = mixedL, right = mixedR;
                mChorusPool.process(left, right);

                if (mSpaceEchoEnabled) {
                    mSpaceEcho.process(&left, &right, 1, mSpaceEchoParams);
                }

                for (int c = 0; c < numChannels; ++c) {
                    if (s < buffer.getNumSamples()) buffer.setSample(c, s, (c == 0) ? left : right);
                }

                // Standardized Waveform Telemetry
                if (s % 32 == 0) { 
                   using namespace ::Omega::Core::Modulation;
                   auto& localHub = ModulationTelemetryHub::getInstance();
                   localHub.pushSignal((int)TelemetryIndex::Audio_Master_Out, (left + right) * 0.5f);
                   localHub.pushSignal((int)TelemetryIndex::Audio_DCO_Main,   oscSum);
                   localHub.pushSignal((int)TelemetryIndex::Audio_VCF_Out,    vcfSum / 16.0f); // Average of voices
                   localHub.pushSignal((int)TelemetryIndex::Audio_Bus_PreFX,  (mixedL + mixedR) * 0.5f);
                   localHub.pushSignal((int)TelemetryIndex::Mod_Pitch,        lastActiveFreq); 
                }
                }

                using namespace ::Omega::Core::Modulation;
                auto& telemetryHub = ModulationTelemetryHub::getInstance();
                auto const& modBuffers = mModRuntime.getBuffers();
                telemetryHub.update(modBuffers); // This handles 0-31 (MOD and input signals)
            }

        void getEnvelopeLevels(float& ampEnv, float& filterEnv) const noexcept override {
            ampEnv = 0.0f; filterEnv = 0.0f;
            int active = 0;
            for (int i = 0; i < 16; ++i) {
                if (mAmpEnvelopes[i].isActive()) { ampEnv += mAmpEnvelopes[i].getCurrentLevel(); active++; }
            }
            if (active > 0) ampEnv /= static_cast<float>(active);
        }

        void noteOn(int voiceIndex, float freqHz) noexcept override {
            if (voiceIndex < 16) {
                float pitch = 69.0f * 12.0f * std::log2(freqHz / 440.0f);
                handleNoteOn(voiceIndex, pitch, 0.8f);
            }
        }
        void noteOff(int voiceIndex) noexcept override {
            handleNoteOff(voiceIndex, 0.0f);
        }

        void setConfigProvider(std::atomic<::Omega::Core::Service::EngineConfig*>* provider) noexcept {
            mConfigProvider = provider;
        }

    private:
        static void log(const std::string& msg) {
            juce::File logFile = juce::File::getSpecialLocation(juce::File::currentExecutableFile).getSiblingFile("OMEGA_BOOT_LOG.txt");
            logFile.appendText("[" + juce::Time::getCurrentTime().toString(true, true) + "] Engine: " + msg + "\n");
        }

        double mSampleRate = 44100.0;
        ::Omega::DSP::Engines::Roland::Juno::OscillatorPoolJunoDco mOscPool;
        ::Omega::DSP::Engines::Roland::JP::OscillatorPoolJp8080 mJpOscPool;
        ::Omega::DSP::Engines::Roland::Juno::FilterPoolJunoIr3109 mJunoFlt;
        ::Omega::DSP::Engines::Korg::MS20::FilterPoolKorg35 mKorg35Flt;
        ::Omega::DSP::Engines::Roland::JP::FilterPoolJp8080 mJpFilterPool;
        ::Omega::DSP::Engines::Roland::JP::FilterPoolJpFormant mJpFormantFlt;
        ::Omega::DSP::Engines::Roland::Juno::ChorusPoolJuno mChorusPool;
        
        std::array<juce::dsp::FirstOrderTPTFilter<float>, 16> mHpfFilters;
        std::array<juce::dsp::IIR::Filter<float>, 16> mShelfFilters;

        std::array<::Omega::DSP::Engines::Modular::EnvelopeAdsrVA, 16> mAmpEnvelopes;
        std::array<::Omega::DSP::Engines::Modular::EnvelopeAdsrVA, 16> mModEnvelopes;
        std::array<::Omega::DSP::Engines::Korg::MS20::EnvelopeMs20, 16> mMs20Envelopes;
        ::Omega::Core::Modulation::ModulationRuntime mModRuntime;
        
        float mVcaMainGain = 0.8f;
        bool mVcaGateMode = false;
        FilterType mFilterType = FilterType::JunoIR3109;
        int mHpfPosition = 1;

        void setupBasicModulation() {
            using namespace ::Omega::Core::Modulation;
            mModRuntime.reset();
            
            ::Omega::Core::Modulation::RuntimeNode lfoNode;
            lfoNode.type = 0; // LFO
            lfoNode.outputIndex = (int)TelemetryIndex::Mod_LFO1;
            lfoNode.state.lfo.waveform = 0; // Sine
            lfoNode.state.lfo.phase = 0.0f;
            lfoNode.state.lfo.increment = 5.0f / (float)mSampleRate;
            mModRuntime.addRuntimeNode(lfoNode);
        }

        void processInputEvent(const ::Omega::Core::Input::InputEvent& e) {
            switch (e.type) {
                case ::Omega::Core::Input::InputEventType::NoteOn:
                    handleNoteOn(e.data.noteOn.noteId, e.data.noteOn.pitch, e.data.noteOn.velocity);
                    break;
                case ::Omega::Core::Input::InputEventType::NoteOff:
                    handleNoteOff(e.data.noteOff.noteId, e.data.noteOff.releaseVelocity);
                    break;
                case ::Omega::Core::Input::InputEventType::ChannelExpression:
                    handleChannelExpression(e.data.channel.source, e.data.channel.value);
                    break;
                case ::Omega::Core::Input::InputEventType::PerNoteExpression:
                    handlePerNoteExpression(e.data.perNote.noteId, e.data.perNote.source, e.data.perNote.value);
                    break;
            }
        }

        void handleNoteOn(int noteId, float pitch, float velocity) {
            int v = noteId % 16; 

            log("VOICE: NoteOn v=" + std::to_string(v) + " pitch=" + std::to_string(pitch) + " vel=" + std::to_string(velocity));
            
            float freqHz = 440.0f * std::pow(2.0f, (pitch - 69.0f) / 12.0f);
            mOscPool.setVoiceFrequency(v, freqHz);
            mJpBaseFreqs[v] = freqHz; 
            
            mPluckOsc.trigger(v, freqHz);
            mBrassOsc.trigger(v, freqHz);
            mReedOsc.trigger(v, freqHz);
            mVpmOsc.trigger(v, freqHz);
            mElectricPianoOsc.trigger(v, velocity, freqHz, 0.5f);
            mOrganOsc.trigger(v);

            mAmpEnvelopes[v].noteOn();
            mModEnvelopes[v].noteOn();
            mMs20Envelopes[v].noteOn();
            mActiveNotes[v] = noteId;
        }

        void handleNoteOff(int noteId, float /*releaseVelocity*/) {
            for (int v = 0; v < 16; ++v) {
                if (mActiveNotes[v] == noteId) {
                    mAmpEnvelopes[v].noteOff();
                    mModEnvelopes[v].noteOff();
                    mMs20Envelopes[v].noteOff();
                    mActiveNotes[v] = -1;
                }
            }
        }

        void handlePerNoteExpression(int noteId, ::Omega::Core::Input::ModSource source, float value) {
            // Simplified: apply to all matching notes
            for (int v = 0; v < 16; ++v) {
                if (mActiveNotes[v] == noteId) {
                    // Update per-note mod state if supported
                }
            }
        }

        void handleChannelExpression(::Omega::Core::Input::ModSource source, float value) {
            mChannelModStates[static_cast<int>(source)] = value;
            
            if (source == ::Omega::Core::Input::ModSource::Ribbon) {
                mProphecyMacros.movement = value;
            } else if (source == ::Omega::Core::Input::ModSource::VectorX) {
                mProphecyMacros.energy = value;
            } else if (source == ::Omega::Core::Input::ModSource::VectorY) {
                mProphecyMacros.air = value;
            }
        }

        void applyConfigUpdate() noexcept {
            if (mConfigProvider == nullptr) return;
            auto* config = mConfigProvider->load();
            if (config == nullptr) return;

            mFilterType = config->voices[0].filterType;
            mCurrentCutoff = config->voices[0].cutoff;
            mCurrentResonance = config->voices[0].resonance;
            mVcaMainGain = 1.0f; // TODO: Use masterGain if needed

            // Global/Shared params from first voice (standard for Juno mode)
            setVcfEnvDepth(config->voices[0].vcfEnvDepth);
            setVcfLfoDepth(config->voices[0].vcfLfoDepth);
            setVcfKeyTracking(config->voices[0].vcfKeyTracking);
            setVcfEnvPolarity(config->voices[0].vcfEnvInverted);
            setPWMMode(config->voices[0].pwmModeLfo);
            setPWMAmount(config->voices[0].pwmAmount);
            setLfoParams(config->voices[0].lfoRate, config->voices[0].lfoWave);
            setDcoLfoDepth(config->voices[0].dcoLfoDepth);

            mKorgHpCut = config->voices[0].korgHpCutoff;
            mKorgHpRes = config->voices[0].korgHpRes;
            mKorgGrit = config->voices[0].korgGrit;

            for (int i = 0; i < 16; ++i) {
                const auto& v = config->voices[i];
                mOscModes[i] = v.oscMode;
                
                // Actualizar parámetros de voz en tiempo real
                setVoiceParams(i, v.cutoff, v.resonance, mKorgHpCut, mKorgHpRes, mKorgGrit);
                
                // DCO Switches
                setSawEnabled(i, v.sawOn);
                setPulseEnabled(i, v.pulseOn);
                setSubLevel(i, v.subLevel);
                setNoiseLevel(i, v.noiseLevel);

                // Envelopes (Per voice)
                mAmpEnvelopes[i].setAttackMs(v.attack);
                mAmpEnvelopes[i].setDecayMs(v.decay);
                mAmpEnvelopes[i].setSustain(v.sustain);
                mAmpEnvelopes[i].setReleaseMs(v.release);

                mModEnvelopes[i].setAttackMs(v.attack);
                mModEnvelopes[i].setDecayMs(v.decay);
                mModEnvelopes[i].setSustain(v.sustain);
                mModEnvelopes[i].setReleaseMs(v.release);
            }
            
            mVcaMainGain = std::pow(10.0f, config->masterGainDb / 20.0f);
            mSpaceEchoEnabled = config->spaceEchoEnabled;
            mSpaceEchoParams.speed = config->spaceEchoSpeed;
            mSpaceEchoParams.intensity = config->spaceEchoIntensity;
            mSpaceEchoParams.echoVol = config->spaceEchoEchoVol;
            mSpaceEchoParams.reverbVol = config->spaceEchoReverbVol;
            mSpaceEchoParams.mode = config->spaceEchoMode;
            mSpaceEchoParams.wowFlutter = config->spaceEchoWow;
            mSpaceEchoParams.drive = config->spaceEchoDrive;

            mJpDetune = config->jpDetune;
            mJpSpread = config->jpSpread;
            mJpFilterMode = config->jpFilterMode;

            const auto& v = config->voices[0];
            mHpfPosition = v.hpfPosition;
            mVcaGateMode = v.vcaGateMode;
            updateHpfCoefficients();
            
            mChorusPool.setMode(config->chorusEnabled ? config->chorusMode : 0);
            mChorusPool.setMix(config->chorusMix);
        }

        void updateHpfCoefficients() {
            float freq = 10.0f;
            if (mHpfPosition == 2) freq = ::Omega::DSP::Engines::Roland::Juno::Constants::kFreqPos2;
            else if (mHpfPosition == 3) freq = ::Omega::DSP::Engines::Roland::Juno::Constants::kFreqPos3;
            if (mLastHpfFreq == freq) return;
            mLastHpfFreq = freq;
            for (auto& f : mHpfFilters) f.setCutoffFrequency(freq);
        }

        bool mArpActive = false;
        int mArpCounter = 0;
        int mArpIntervalSamples = 44100 / 8;

        float mDcoLfoDepth = 0.0f;
        float mVcfEnvDepth = 0.0f;
        float mVcfLfoDepth = 0.0f;
        float mVcfKeyTracking = 0.0f;
        bool mVcfEnvInverted = false;
        bool mPwmModeLfo = false;
        float mPwmAmount = 0.5f;

        float mLastHpfFreq = -1.0f;

        std::array<OscillatorMode, 16> mOscModes;
        std::array<float, 16> mJpBaseFreqs;
        float mJpDetune = 0.5f;
        float mJpSpread = 0.5f;
        int mJpFilterMode = 0; 
        std::array<int, 16> mActiveNotes;
        std::array<float, static_cast<int>(::Omega::Core::Input::ModSource::Count)> mChannelModStates;

        bool mSpaceEchoEnabled = false;
        ::Omega::DSP::FX::Roland::RE201::SpaceEchoProcessor::Params mSpaceEchoParams;
        ::Omega::DSP::FX::Roland::RE201::SpaceEchoProcessor mSpaceEcho;

        ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyPluck mPluckOsc;
        ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyBrass mBrassOsc;
        ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyReed mReedOsc;
        ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyVpm mVpmOsc;
        ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyBowed mBowedOsc;
        ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyNoiseComb mNoiseCombOsc;
        ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyEP mElectricPianoOsc;
        ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyOrgan mOrganOsc;
        ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyWaveshaper mProphecyWaveshaper;
        ::Omega::DSP::Engines::Korg::Prophecy::ProphecyArpeggiator mProphecyArp;
        ::Omega::DSP::Engines::Korg::Prophecy::FilterPoolResonantBank mResBankFlt;
        ::Omega::DSP::Core::Modulation::EnvelopeMultiStage mMultiStageEnv;
        ::Omega::DSP::Engines::Roland::JP::OscillatorPoolJpFeedback mJpFeedbackOsc;
        ::Omega::DSP::Engines::Roland::JP::OscillatorPoolJpDual mJpDualOsc;
        ::Omega::DSP::Engines::Korg::MS20::KorgMs20Esp mMs20Esp;
        
        FilterSlotMode mFilterSlotMode = FilterSlotMode::Standard;
        float mCurrentResonance = 0.0f;
        float mCurrentCutoff = 1000.0f; 
        float mKorgHpCut = 100.0f;
        float mKorgHpRes = 0.0f;
        float mKorgGrit = 1.0f;
        float mXModDepth = 0.0f;
        float mJpOsc2Detune = 0.0f; 
        bool mJpSync = false;
        ::Omega::DSP::Engines::Korg::Prophecy::ProphecyMacroContext::MacroState mProphecyMacros;
        ::Omega::Core::Modulation::MotionRecorder mMotionRecorder;
        ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyWaveshaper::Mode mProphecyWaveshaperMode = ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyWaveshaper::Fold;
        
        std::atomic<::Omega::Core::Service::EngineConfig*>* mConfigProvider = nullptr;
        std::atomic<bool> mPendingConfigUpdate { false };
        ::Omega::Core::Util::PerformanceMonitor mPerfMonitor{"VirtualAnalogEngine"};
    };

} // namespace Omega::DSP::Engines::Modular
