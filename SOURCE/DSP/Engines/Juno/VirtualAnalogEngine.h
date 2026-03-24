#pragma once

#include <array>
#include <cmath>
#include <algorithm>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>

#include "JunoConstants.h"
#include "OscillatorPoolJunoDco.h"
#include "../Korg/FilterPoolKorg35.h"
#include "FilterPoolJunoIr3109.h"
#include "../JP/OscillatorPoolJp8080.h"
#include "../JP/OscillatorPoolJpFeedback.h"
#include "../JP/OscillatorPoolJpDual.h"
#include "../JP/FilterPoolJp8080.h"
#include "../JP/FilterPoolJpFormant.h"
#include "../../../Core/Modulation/MotionRecorder.h"
#include "../Korg/OscillatorPoolProphecyPluck.h"
#include "../Korg/OscillatorPoolProphecyBrass.h"
#include "../Korg/OscillatorPoolProphecyReed.h"
#include "../Korg/OscillatorPoolProphecyVpm.h"
#include "../Korg/OscillatorPoolProphecyBowed.h"
#include "../Korg/ProphecyMacroContext.h"
#include "ChorusPoolJuno.h"
#include "../../VA/EnvelopeAdsrVA.h"
#include "../../VA/EnvelopeMs20.h"
#include "../../FX/Korg/SpaceEchoProcessor.h"
#include "../Korg/KorgMs20Esp.h"
#include "../Korg/OscillatorPoolProphecyNoiseComb.h"
#include "../Korg/OscillatorPoolProphecyEP.h"
#include "../Korg/OscillatorPoolProphecyOrgan.h"
#include "../Korg/OscillatorPoolProphecyWaveshaper.h"
#include "../Korg/ProphecyArpeggiator.h"
#include "../Korg/FilterPoolResonantBank.h"
#include "../../Core/Modulation/EnvelopeMultiStage.h"
#include "../../Core/Modulation/ModulationRuntime.h"
#include "../ISynthesisEngine.h"
#include "../../../Core/Input/OmegaInput.h"

namespace Omega::DSP::Engines::Juno {

    using namespace Constants;

    /**
     * @brief Motor de síntesis Virtual Analog estilo Juno / Modular ACE Refinado.
     */
    class VirtualAnalogEngine : public ISynthesisEngine {
    public:
        enum class FilterType { JunoIR3109, Korg35, JP8080, JPFormant };
        enum class OscillatorMode { 
            JunoDco, 
            JpSuperSaw,
            ProphecyPluck,
            ProphecyBrass,
            ProphecyReed,
            ProphecyVpm,
            ProphecyBowed,
            ProphecyNoiseComb,
            ProphecyElectricPiano,
            ProphecyOrgan,
            JpFeedback,
            JpDual,
            Jp8080Supersaw = JpSuperSaw 
        };
        
        enum class FilterSlotMode {
            Standard,
            ResonantBank
        };

        VirtualAnalogEngine() {
            mChannelModStates.fill(0.0f);
            for (int i = 0; i < 16; ++i) {
                mHpfFilters[i].setType(::juce::dsp::FirstOrderTPTFilterType::highpass);
                mOscModes[i] = OscillatorMode::JunoDco;
                mActiveNotes[i] = -1;
            }
        }
        ~VirtualAnalogEngine() override = default;

        // --- Lifecycle ---
        void prepare(double sampleRate, int samplesPerBlock) override {
            mSampleRate = sampleRate;
            mOscPool.prepare(sampleRate);
            mJpOscPool.prepare(sampleRate);
            mJunoFlt.prepare(sampleRate);
            mKorg35Flt.prepare(sampleRate);
            mJpFilterPool.prepare(sampleRate);
            mChorusPool.prepare(sampleRate);
            mSpaceEcho.prepare(sampleRate);
            for (auto& env : mMs20Envelopes) env.prepare(sampleRate);
            mBowedOsc.prepare(sampleRate);
            
            mPluckOsc.prepare(sampleRate);
            mBrassOsc.prepare(sampleRate);
            mReedOsc.prepare(sampleRate);
            mVpmOsc.prepare(sampleRate);
            mNoiseCombOsc.prepare(sampleRate);
            mResBankFlt.prepare(sampleRate);
            mMultiStageEnv.prepare(sampleRate);
            mJpFeedbackOsc.prepare(sampleRate);
            mJpDualOsc.prepare(sampleRate);
            mJpFormantFlt.prepare(sampleRate);
            
            ::juce::dsp::ProcessSpec spec { sampleRate, (::juce::uint32)samplesPerBlock, 1 };
            for (auto& f : mHpfFilters) f.prepare(spec);
            for (auto& f : mShelfFilters) {
                f.prepare(spec);
                f.coefficients = ::juce::dsp::IIR::Coefficients<float>::makeLowShelf(sampleRate, HPF::kShelfFreq, 0.707f, std::pow(10.0f, HPF::kShelfGainDb / 20.0f));
            }

            for (auto& env : mAmpEnvelopes) env.prepare(sampleRate);
            for (auto& env : mModEnvelopes) env.prepare(sampleRate);
            mModRuntime.reset();
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
        void setSpaceEchoParams(const ::Omega::DSP::FX::SpaceEchoProcessor::Params& params) noexcept {
            mSpaceEchoParams = params;
        }

        // --- Audio Processing ---
        void renderNextBlock(::juce::AudioBuffer<float>& buffer, 
                             const ::Omega::Core::Input::OmegaInput& input) noexcept override {
            const int numSamples = buffer.getNumSamples();
            const int numChannels = buffer.getNumChannels();

            const auto& events = input.getEvents();
            size_t nextEventIdx = 0;

            // --- MS-20 ESP Processing (Global) ---
            // Usamos el input del buffer (si hay sidechain) o el promedio del bloque anterior
            // Para simplificar, procesamos el ESP con el input de audio si el engine está en modo 'Procesador'
            float espInput = 0.0f; 
            if (buffer.getNumChannels() > 0) espInput = buffer.getSample(0, 0); // Placeholder: usaría sidechain real
            
            auto espRes = mMs20Esp.process(espInput);
            mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::EspPitch)] = espRes.pitch;
            mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::EspEnvelope)] = espRes.envelope;
            mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::EspTrigger)] = espRes.trigger ? 1.0f : 0.0f;

            for (int s = 0; s < numSamples; ++s) {
                while (nextEventIdx < events.size() && events[nextEventIdx].sampleOffset <= s) {
                    processInputEvent(events[nextEventIdx++]);
                }

                // Precision por sample para el MVP
                mModRuntime.processBlock(1); 

                float mixedL = 0.0f;
                float mixedR = 0.0f;

                // 1. Tick Arpeggiator
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

                // 2. Motion Control
                if (mMotionRecorder.isRecording()) {
                    mMotionRecorder.recordValue(mCurrentCutoff);
                } else {
                    // Playback (simplified override for demonstration)
                    // float motionVal = mMotionRecorder.playValue();
                    // if (motionVal != 0.0f) mCurrentCutoff = motionVal;
                }
                // 1. Aplicar Macros del Prophecy si el perfil es activo
                // (Solo si estamos en un modo Prophecy o Korg)
                float filterDrive = 1.0f;
                float modSensitivity = 1.0f;
                float airNoise = 0.0f;
                float airHpf = 20.0f;
                float lfoRate, lfoDepth;
                
                Korg::ProphecyMacroContext::apply(mProphecyMacros, 
                    filterDrive, lfoRate, lfoDepth, airNoise, airHpf, modSensitivity);

                for (int v = 0; v < 16; ++v) {
                    if (mAmpEnvelopes[v].isActive()) {
                        // Apply movement (Macro 2) to LFO if in Prophecy mode
                        float effectiveLfoRate = (mOscModes[v] >= OscillatorMode::ProphecyPluck) ? lfoRate : 5.0f;
                        float lfoVal = mModRuntime.getSignalValue(10); // LFO1
                        float dcoLfo = lfoVal * mDcoLfoDepth;
                        float pitchMod = mModRuntime.getSignalValue(3) + dcoLfo; 
                        float pitchBend = mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::PitchBend)];
                        float voiceFreq = ::juce::MidiMessage::getMidiNoteInHertz(mActiveNotes[v] + (pitchBend * 2.0f) + (pitchMod / 1.0f));
                        
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
                            // PE Knobs & Expressivity Matrix
                            float at = mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::ChannelPressure)];
                            float ribbon = mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::Ribbon)];
                            float pe1 = mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::PE1)];
                            float pe3 = mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::PE3)];
                            float pe5 = mChannelModStates[static_cast<int>(::Omega::Core::Input::ModSource::PE5)];

                            auto myClamp = [](float x, float min, float max) { return (x < min) ? min : (x > max ? max : x); };
                            mBrassOsc.setVoiceParams(v, 
                                myClamp(0.5f + (ribbon * 0.4f) + (pe1 * 0.2f), 0.1f, 0.9f), // Lip Tension
                                myClamp(0.3f + (at * 0.7f) * (0.5f + pe5), 0.0f, 1.0f),     // Pressure
                                myClamp(0.5f + pe3 * 0.4f, 0.0f, 1.0f),                    // Bell
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
                            float xmod = mXModDepth; // Global or per-voice? Usually per-patch
                            float mix = 0.5f; // Add parameter later
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
                                0.3f + at * 0.6f,   // Pressure
                                0.2f + ribbon * 0.2f, // Position
                                0.4f + ribbon * 0.4f); // Velocity
                            oscL = mBowedOsc.process(v);
                            oscR = oscL;
                        } else {
                            oscL = mOscPool.process(v, lfoVal); 
                            oscR = oscL;
                        }

                        // Apply MOSS Waveshaper if in Prophecy mode
                        if (mOscModes[v] >= OscillatorMode::ProphecyPluck && mOscModes[v] <= OscillatorMode::ProphecyOrgan) {
                            Engines::Korg::OscillatorPoolProphecyWaveshaper::Params wp;
                            wp.drive = mProphecyMacros.energy * 2.0f;
                            wp.mix = mProphecyMacros.movement;
                            wp.mode = mProphecyWaveshaperMode;
                            oscL = mProphecyWaveshaper.process(v, oscL, wp);
                            oscR = oscL;
                        }

                        // Add Air (Noise) from Macro 3
                        float noise = airNoise * (((float)rand() / RAND_MAX) * 2.0f - 1.0f);
                        oscL += noise;
                        oscR += noise;
                        
                        float envVal = mAmpEnvelopes[v].getNextSample(); 
                        float filterEnv = (mFilterType == FilterType::Korg35) ? mMs20Envelopes[v].getNextSample() : mModEnvelopes[v].getNextSample();
                        float cutoffMod = mModRuntime.getSignalValue(8) * modSensitivity; 
                        float nativeVcfMod = (lfoVal * mVcfLfoDepth) + (filterEnv * mVcfEnvDepth * (mVcfEnvInverted ? -1.0f : 1.0f));
                        
                        float finalCutoff = 800.0f + ((cutoffMod + nativeVcfMod) * 8000.0f);
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
                            // Macro 1 (Energy) affects Grit
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
                            float vowelPos = mCurrentResonance; // Use Resonance knob for Vowel Pos
                            mJpFormantFlt.setVowel(v, vowelPos);
                            filteredL = mJpFormantFlt.process(v, oscL);
                            filteredR = filteredL;
                        }

                        float hpfOutL = filteredL;
                        float hpfOutR = filteredR;
                        if (mHpfPosition >= 2) {
                            hpfOutL = mHpfFilters[v].processSample(0, hpfOutL);
                            hpfOutR = hpfOutL; 
                        } else if (mHpfPosition == 0) {
                            hpfOutL = mShelfFilters[v].processSample(hpfOutL);
                            hpfOutR = hpfOutL;
                        }
                        
                        // Apply airHpf (Macro 3) - Simplificado si no hay filtros activos
                        if (airHpf > 100.0f) {
                            // Aplicar un filtrado HPF extra si se desea
                        }

                        float gain = (mVcaGateMode ? 1.0f : envVal);
                        float resComp = 1.0f + (mCurrentResonance * mCurrentResonance * 0.5f);
                        mixedL += hpfOutL * gain * resComp;
                        mixedR += hpfOutR * gain * resComp;
                    }
                }

                float left = mixedL, right = mixedR;
                mChorusPool.process(left, right);

                // FX-DL-002: Space Echo (RE-201)
                if (mSpaceEchoEnabled) {
                    mSpaceEcho.process(&left, &right, 1, mSpaceEchoParams);
                }

                for (int c = 0; c < numChannels; ++c) {
                    if (s < buffer.getNumSamples()) buffer.setSample(c, s, (c == 0) ? left : right);
                }
            }
        }

        void getEnvelopeLevels(float& ampEnv, float& filterEnv) const noexcept override {
            ampEnv = 0.0f; filterEnv = 0.0f;
            int active = 0;
            for (int i = 0; i < 16; ++i) {
                if (mAmpEnvelopes[i].isActive()) { ampEnv += mAmpEnvelopes[i].getCurrentLevel(); active++; }
            }
            if (active > 0) ampEnv /= static_cast<float>(active);
        }

        // ISynthesisEngine overrides (Legacy/Direct)
        void noteOn(int voiceIndex, float freqHz) noexcept override {
            if (voiceIndex < 16) {
                float pitch = 69.0f * 12.0f * std::log2(freqHz / 440.0f);
                handleNoteOn(voiceIndex, pitch, 0.8f);
            }
        }
        void noteOff(int voiceIndex) noexcept override {
            handleNoteOff(voiceIndex, 0.0f);
        }

    private:
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
            float freqHz = 440.0f * std::pow(2.0f, (pitch - 69.0f) / 12.0f);
            mOscPool.setVoiceFrequency(v, freqHz);
            mJpBaseFreqs[v] = freqHz; 
            
            // Trigger Prophecy pools
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

        void handleChannelExpression(::Omega::Core::Input::ModSource source, float value) {
            mChannelModStates[static_cast<int>(source)] = value;
            
            // OMEGA Prophecy Custom Mapping (Ribbon/Vector)
            if (source == ::Omega::Core::Input::ModSource::Ribbon) {
                mProphecyMacros.movement = value;
            } else if (source == ::Omega::Core::Input::ModSource::VectorX) {
                mProphecyMacros.energy = value;
            } else if (source == ::Omega::Core::Input::ModSource::VectorY) {
                mProphecyMacros.air = value;
            }
        }

        void handleController(int ccNumber, float value) {
            using Source = ::Omega::Core::Input::ModSource;
            if (ccNumber == 12) handleChannelExpression(Source::PE1, value);
            else if (ccNumber == 13) handleChannelExpression(Source::PE2, value);
            else if (ccNumber == 14) handleChannelExpression(Source::PE3, value);
            else if (ccNumber == 15) handleChannelExpression(Source::PE4, value);
            else if (ccNumber == 17) handleChannelExpression(Source::PE5, value);
            else if (ccNumber == 16) handleChannelExpression(Source::Ribbon, value);
            else if (ccNumber == 1)  handleChannelExpression(Source::ModWheel, value);
            else if (ccNumber == 11) handleChannelExpression(Source::Expression, value);
            else if (ccNumber == 2)  handleChannelExpression(Source::Breath, value);
        }

        void handlePerNoteExpression(int noteId, ::Omega::Core::Input::ModSource source, float value) {
            // MPE
        }

        void updateHpfCoefficients() {
            float freq = 10.0f;
            if (mHpfPosition == 2) freq = HPF::kFreqPos2;
            else if (mHpfPosition == 3) freq = HPF::kFreqPos3;
            if (mLastHpfFreq == freq) return;
            mLastHpfFreq = freq;
            for (auto& f : mHpfFilters) f.setCutoffFrequency(freq);
        }

        double mSampleRate = 44100.0;
        OscillatorPoolJunoDco mOscPool;
        Engines::JP::OscillatorPoolJp8080 mJpOscPool;
        Omega::DSP::Engines::Juno::FilterPoolJunoIr3109 mJunoFlt;
        Omega::DSP::Engines::Korg::FilterPoolKorg35 mKorg35Flt;
        Engines::JP::FilterPoolJp8080 mJpFilterPool;
        Engines::JP::FilterPoolJpFormant mJpFormantFlt;
        ChorusPoolJuno mChorusPool;
        
        // Prophecy Pools
        Engines::Korg::OscillatorPoolProphecyPluck mPluckOsc;
        Engines::Korg::OscillatorPoolProphecyBrass mBrassOsc;
        Engines::Korg::OscillatorPoolProphecyReed mReedOsc;
        Engines::Korg::OscillatorPoolProphecyVpm mVpmOsc;
        Engines::Korg::OscillatorPoolProphecyBowed mBowedOsc;
        Engines::Korg::OscillatorPoolProphecyNoiseComb mNoiseCombOsc;
        Engines::Korg::OscillatorPoolProphecyEP mElectricPianoOsc;
        Engines::Korg::OscillatorPoolProphecyOrgan mOrganOsc;
        Engines::Korg::OscillatorPoolProphecyWaveshaper mProphecyWaveshaper;
        Engines::Korg::ProphecyArpeggiator mProphecyArp;
        Engines::Korg::FilterPoolResonantBank mResBankFlt;
        ::Omega::DSP::Core::Modulation::EnvelopeMultiStage mMultiStageEnv;
        Engines::JP::OscillatorPoolJpFeedback mJpFeedbackOsc;
        Engines::JP::OscillatorPoolJpDual mJpDualOsc;
        Engines::Korg::KorgMs20Esp mMs20Esp;
        
        FilterSlotMode mFilterSlotMode = FilterSlotMode::Standard;
        
        FilterType mFilterType = FilterType::JunoIR3109;
        int mHpfPosition = 1;
        bool mVcaGateMode = false;
        float mCurrentResonance = 0.0f;
        float mCurrentCutoff = 1000.0f; // Added for Motion Recording bitrot
        float mKorgHpCut = 100.0f;
        float mKorgHpRes = 0.0f;
        float mKorgGrit = 1.0f;
        float mXModDepth = 0.0f;
        float mJpOsc2Detune = 0.0f; // in semitones
        bool mJpSync = false;
        Korg::ProphecyMacroContext::MacroState mProphecyMacros;
        ::Omega::Core::Modulation::MotionRecorder mMotionRecorder;
        Engines::Korg::OscillatorPoolProphecyWaveshaper::Mode mProphecyWaveshaperMode = Engines::Korg::OscillatorPoolProphecyWaveshaper::Fold;

        bool mArpActive = false;
        int mArpCounter = 0;
        int mArpIntervalSamples = 44100 / 8; // 8th notes at 120bpm approx

        float mDcoLfoDepth = 0.0f;
        float mVcfEnvDepth = 0.0f;
        float mVcfLfoDepth = 0.0f;
        float mVcfKeyTracking = 0.0f;
        bool mVcfEnvInverted = false;
        bool mPwmModeLfo = false;
        float mPwmAmount = 0.5f;

        std::array<::juce::dsp::FirstOrderTPTFilter<float>, 16> mHpfFilters;
        std::array<::juce::dsp::IIR::Filter<float>, 16> mShelfFilters;

        std::array<::Omega::DSP::VA::EnvelopeAdsrVA, 16> mAmpEnvelopes;
        std::array<::Omega::DSP::VA::EnvelopeAdsrVA, 16> mModEnvelopes;
        std::array<::Omega::DSP::VA::EnvelopeMs20, 16> mMs20Envelopes;
        ::Omega::Core::Modulation::ModulationRuntime mModRuntime;
        float mLastHpfFreq = -1.0f;

        std::array<OscillatorMode, 16> mOscModes;
        std::array<float, 16> mJpBaseFreqs;
        float mJpDetune = 0.5f;
        float mJpSpread = 0.5f;
        int mJpFilterMode = 0; 
        std::array<int, 16> mActiveNotes;
        std::array<float, static_cast<int>(::Omega::Core::Input::ModSource::Count)> mChannelModStates;

        // Space Echo (RE-201) State
        bool mSpaceEchoEnabled = false;
        ::Omega::DSP::FX::SpaceEchoProcessor::Params mSpaceEchoParams;
        ::Omega::DSP::FX::SpaceEchoProcessor mSpaceEcho;
    };

} // namespace Omega::DSP::Engines::Juno
