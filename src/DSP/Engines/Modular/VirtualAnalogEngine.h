#pragma once

#include <array>
#include <cmath>
#include <algorithm>
#include <atomic>
#include <string>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>

#include "../ISynthesisEngine.h"
#include "OmegaModularVoice.h"
#include "../../../Core/Modulation/ModulationTelemetryHub.h"
#include "../../../Core/Modulation/ModulationTelemetryIndex.h"
#include "../../../Core/Util/PerformanceMonitor.h"
#include "../../../Core/Input/OmegaInput.h"
#include "../../../Core/Input/ModSource.h"
#include "../../../Core/Service/EngineConfig.h"
#include "../../../Core/Service/SystemSettingsManager.h"

#include "../Roland/Juno/OscillatorPoolJunoDco.h"
#include "../Roland/Juno/FilterPoolJunoIr3109.h"
#include "../Korg/MS20/FilterPoolKorg35.h"
#include "../Roland/JP/OscillatorPoolJp8080.h"
#include "../Roland/JP/FilterPoolJp8080.h"
#include "../Roland/JP/FilterPoolJpFormant.h"
#include "../Roland/Juno/ChorusPoolJuno.h"
#include "../../FX/Roland/RE201/SpaceEchoProcessor.h"
#include "../Korg/MS20/KorgMs20Esp.h"
#include "../Korg/Prophecy/OscillatorPoolProphecyPluck.h"
#include "../Korg/Prophecy/OscillatorPoolProphecyBrass.h"
#include "../Korg/Prophecy/OscillatorPoolProphecyReed.h"
#include "../Korg/Prophecy/OscillatorPoolProphecyVpm.h"
#include "../Korg/Prophecy/OscillatorPoolProphecyBowed.h"
#include "../Korg/Prophecy/OscillatorPoolProphecyNoiseComb.h"
#include "../Korg/Prophecy/OscillatorPoolProphecyEP.h"
#include "../Korg/Prophecy/OscillatorPoolProphecyOrgan.h"
#include "../Korg/Prophecy/OscillatorPoolProphecyWaveshaper.h"
#include "../Korg/Prophecy/FilterPoolResonantBank.h"
#include "../Korg/Prophecy/ProphecyArpeggiator.h"
#include "../../../Core/Modulation/ModulationRuntime.h"
#include "../../../Core/Modulation/MotionRecorder.h"
#include "../../../Core/Voice/CompiledVoicePlan.h"
#include "../../../Core/Voice/VoiceState.h"
#include "../../../Core/Voice/EngineVoiceRuntime.h"
#include "../../../Core/Voice/VoiceArchitectureCompiler.h"
#include "../../../Core/Voice/ParamIdRegistry.h"

namespace Omega::DSP::Engines::Modular {

    /**
     * @brief Refined Modular Engine Orchestrator.
     */
    class VirtualAnalogEngine : public ::Omega::DSP::Engines::ISynthesisEngine {
    public:
        VirtualAnalogEngine(::Omega::Core::Service::SystemSettingsManager& settings) 
            : mSettings(settings),
              mPoolSet{mOscPool, mJunoFlt, mKorg35Flt, mJpOscPool}
        {
            ::Omega::Core::ParamIdRegistry::getInstance().preRegisterCommonIds();
            mChannelModStates.fill(0.0f);
        }

        void prepare(double sampleRate, int samplesPerBlock) override {
            mSampleRate = sampleRate;
            mOscPool.prepare(sampleRate);
            mJpOscPool.prepare(sampleRate);
            mJunoFlt.prepare(sampleRate);
            mKorg35Flt.prepare(sampleRate);
            mJpFilterPool.prepare(sampleRate);
            mChorusPool.prepare(sampleRate);
            mSpaceEcho.prepare(sampleRate);
            
            mBowedOsc.prepare(sampleRate);
            mPluckOsc.prepare(sampleRate);
            mBrassOsc.prepare(sampleRate);
            mReedOsc.prepare(sampleRate);
            mVpmOsc.prepare(sampleRate);
            mNoiseCombOsc.prepare(sampleRate);
            mResBankFlt.prepare(sampleRate);
            
            for (auto& v : mVoices) v.prepare(sampleRate, samplesPerBlock);
            mModRuntime.reset();
        }

        void reset() override {
            mModRuntime.reset();
            for (auto& v : mVoices) v.reset();
            for (auto& s : mVoiceStates) {
                for (auto& b : s.buses) b = 0.0f;
                s.isActive = false;
            }
        }

        void renderNextBlock(::juce::AudioBuffer<float>& buffer, const ::Omega::Core::Input::OmegaInput& input) noexcept override {
            if (mPendingConfigUpdate.load()) { applyConfigUpdate(); mPendingConfigUpdate.store(false); }
            
            // Sync voice count from settings
            mNumVoices = mSettings.getNumVoices();
            
            const int numSamples = buffer.getNumSamples();
            const int numChannels = buffer.getNumChannels();

            auto& hub = ::Omega::Core::Modulation::ModulationTelemetryHub::getInstance();
            
            for (int s = 0; s < numSamples; ++s) {
                // 1. Process Input Events (Sample-accurate or Block-start)
                // For simplicity and performance, we'll process events at the start of each block for now,
                // but OMEGA is designed for sample-accurate dispatch.
                if (s == 0) {
                    for (const auto& e : input) {
                        if (e.type == ::Omega::Core::Input::InputEventType::NoteOn) {
                            // Voice Allocation
                            int voiceIdx = -1;
                            // 1. Find free voice
                            for (int i = 0; i < mNumVoices; ++i) {
                                if (!mVoices[i].isActive()) { voiceIdx = i; break; }
                            }
                            // 2. Steal if none free (primitive)
                            if (voiceIdx == -1) voiceIdx = 0; 
                            
                            mVoiceNoteIds[voiceIdx] = e.data.noteOn.noteId;
                            mVoices[voiceIdx].handleNoteOn(e.data.noteOn.pitch, 440.0f * std::pow(2.0f, (e.data.noteOn.pitch - 69.0f) / 12.0f), e.data.noteOn.velocity);
                        }
                        else if (e.type == ::Omega::Core::Input::InputEventType::NoteOff) {
                            for (int i = 0; i < mNumVoices; ++i) {
                                if (mVoiceNoteIds[i] == e.data.noteOff.noteId) {
                                    mVoices[i].noteOff();
                                    mVoiceNoteIds[i] = -1;
                                }
                            }
                        }
                    }
                }

                mModRuntime.processBlock(1);
                float mixedL = 0.0f, mixedR = 0.0f;
                float totalDcoSum = 0.0f;
                const float blockLfoVal = mModRuntime.getSignalValue(0);

                for (int v = 0; v < mNumVoices; ++v) {
                    if (mVoices[v].isActive()) {
                        float vL = 0.0f, vR = 0.0f;
                        
                        // Use the new Modular Dispatcher (Batch 5)
                        if (mVoicePlan.isInitialised) {
                            ::Omega::Core::Voice::VoiceState& state = mVoiceStates[v];
                            state.isActive = mVoices[v].isActive();
                            state.ampEnvelope = mVoices[v].getAmpEnvelopeLevel();
                            
                            ::Omega::Core::Voice::TelemetrySnapshot voiceTelemetry;
                            ::Omega::Core::Voice::EngineVoiceRuntime::renderSample(
                                v, mVoicePlan, state, blockLfoVal, vL, vR, 
                                mPoolSet, voiceTelemetry);
                                
                            if (v == 0) {
                                totalDcoSum = voiceTelemetry.rawOsc;
                                // Capture filter tap if needed for standard VCF_Out index
                                hub.pushSignal((int)::Omega::Core::Modulation::TelemetryIndex::Audio_VCF_Out, voiceTelemetry.rawFilter);
                            }

                            mixedL += vL; mixedR += vR; 
                        } else {
                            // Legacy Fallback
                            float vDco = 0.0f;
                            auto& vc = mCurrentConfig.voices[v];
                            mVoices[v].renderNextBlock(vL, vR, vDco, v,
                                 blockLfoVal, vc.dcoLfoDepth, vc.vcfLfoDepth, vc.vcfEnvDepth, 
                                 vc.vcfEnvInverted, mVcaMainGain, vc.vcaGateMode, vc.cutoff, 
                                 vc.resonance, vc.filterType, FilterSlotMode::Standard, 
                                 1.0f, 0.0f, 0.0f, 0.0f, mChannelModStates,
                                 mOscPool, mJpOscPool, mJunoFlt, mKorg35Flt, mJpFilterPool, 
                                 mJpFormantFlt, mMs20Esp, mResBankFlt,
                                 mPluckOsc, mBrassOsc, mReedOsc, mVpmOsc, mNoiseCombOsc, 
                                 mJpFeedbackOsc, mJpDualOsc, mElectricPianoOsc, mOrganOsc, 
                                 mBowedOsc, mProphecyWaveshaper,
                                 mCurrentConfig.jpDetune, mCurrentConfig.jpSpread, mCurrentConfig.jpFilterMode, 
                                 vc.korgHpCutoff, vc.korgHpRes, vc.korgGrit, 1.0f, 0.0f, false, 0.0f, 0);
                            mixedL += vL; mixedR += vR; totalDcoSum += vDco;
                        }
                    }
                }
                
                // 3. Post-Voice FX (Chorus)
                if (mCurrentConfig.chorusEnabled) {
                    mChorusPool.setMode(mCurrentConfig.chorusMode);
                    mChorusPool.setMix(mCurrentConfig.chorusMix);
                    mChorusPool.process(mixedL, mixedR);
                }

                // 4. Space Echo RE-201
                if (mCurrentConfig.spaceEchoEnabled) {
                    mSpaceEchoParams.speed = mCurrentConfig.spaceEchoSpeed;
                    mSpaceEchoParams.intensity = mCurrentConfig.spaceEchoIntensity;
                    mSpaceEchoParams.echoVol = mCurrentConfig.spaceEchoEchoVol;
                    mSpaceEchoParams.reverbVol = mCurrentConfig.spaceEchoReverbVol;
                    mSpaceEchoParams.mode = mCurrentConfig.spaceEchoMode;
                    mSpaceEchoParams.wowFlutter = mCurrentConfig.spaceEchoWow;
                    mSpaceEchoParams.drive = mCurrentConfig.spaceEchoDrive;
                    
                    float echoL = mixedL, echoR = mixedR;
                    mSpaceEcho.process(echoL, echoR, mSpaceEchoParams);
                    mixedL = echoL; mixedR = echoR;
                }

                // 5. Master Gain
                float masterGain = std::pow(10.0f, mCurrentConfig.masterGainDb / 20.0f);
                mixedL *= masterGain; mixedR *= masterGain;

                // [Telemetry] Sub-sampled Audio Pushes (every 32 samples)
                if (s % 32 == 0) {
                    using namespace ::Omega::Core::Modulation;
                    hub.pushSignal((int)TelemetryIndex::Audio_DCO_Main, totalDcoSum);
                    hub.pushSignal((int)TelemetryIndex::Audio_Master_Out, mixedL); 
                }

                for (int c = 0; c < numChannels; ++c) buffer.setSample(c, s, (c == 0) ? mixedL : mixedR);
            }

            // [Telemetry] Modulation Signal Pushes (after block processing)
            for (int i = 0; i < 32; ++i) {
                hub.pushSignal(i, mModRuntime.getSignalValue(i));
            }
        }

        void noteOn(int voiceIndex, float freqHz) noexcept override { if (voiceIndex < 16) mVoices[voiceIndex].handleNoteOn(voiceIndex, freqHz, 0.8f); }
        void noteOff(int voiceIndex) noexcept override { if (voiceIndex < 16) mVoices[voiceIndex].noteOff(); }
        void getEnvelopeLevels(float& ampEnv, float& filterEnv) const noexcept override { ampEnv = 0.0f; filterEnv = 0.0f; }

        void setVcaGain(float gain) noexcept { mVcaMainGain = gain; }
        void pushConfigUpdate() noexcept { mPendingConfigUpdate.store(true); }
        
        void setVoicePlan(const ::Omega::Core::Voice::CompiledVoicePlan& plan) noexcept {
            mNextVoicePlan = plan;
            mPendingPlanUpdate.store(true);
        }

        void onOscillatorModesChanged() noexcept { pushConfigUpdate(); }
        void setConfigProvider(std::atomic<::Omega::Core::Service::EngineConfig*>* provider) noexcept { mConfigProvider = provider; }

    private:
        void applyConfigUpdate() noexcept {
            if (mPendingPlanUpdate.load()) {
                mVoicePlan = mNextVoicePlan;
                mPendingPlanUpdate.store(false);
            }

            if (!mConfigProvider) return;
            auto* cfg = mConfigProvider->load();
            if (!cfg) return;

            mCurrentConfig = *cfg;
            for (int i = 0; i < 16; ++i) {
                std::array<OscillatorMode, 4> modes;
                for (int m = 0; m < 4; m++) modes[m] = mCurrentConfig.voices[i].oscModes[m];
                mVoices[i].setOscillatorModes(modes, mCurrentConfig.voices[i].numActiveOscillators);
                mVoices[i].setAmpAdsr(mCurrentConfig.voices[i].attack, mCurrentConfig.voices[i].decay, mCurrentConfig.voices[i].sustain, mCurrentConfig.voices[i].release);
                mVoices[i].setJunoParams(mCurrentConfig.voices[i].sawOn, mCurrentConfig.voices[i].pulseOn, mCurrentConfig.voices[i].subLevel, 
                                        mCurrentConfig.voices[i].noiseLevel, mCurrentConfig.voices[i].pwmAmount, mCurrentConfig.voices[i].pwmModeLfo);
            }
        }

        double mSampleRate = 44100.0;
        ::Omega::DSP::Engines::Roland::Juno::OscillatorPoolJunoDco mOscPool;
        ::Omega::DSP::Engines::Roland::JP::OscillatorPoolJp8080 mJpOscPool;
        ::Omega::DSP::Engines::Roland::Juno::FilterPoolJunoIr3109 mJunoFlt;
        ::Omega::DSP::Engines::Korg::MS20::FilterPoolKorg35 mKorg35Flt;
        ::Omega::DSP::Engines::Roland::JP::FilterPoolJp8080 mJpFilterPool;
        ::Omega::DSP::Engines::Roland::JP::FilterPoolJpFormant mJpFormantFlt;
        ::Omega::DSP::Engines::Roland::Juno::ChorusPoolJuno mChorusPool;
        ::Omega::DSP::FX::Roland::RE201::SpaceEchoProcessor mSpaceEcho;
        ::Omega::DSP::FX::Roland::RE201::SpaceEchoProcessor::Params mSpaceEchoParams;
        ::Omega::Core::Modulation::ModulationRuntime mModRuntime;
        
        ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyPluck mPluckOsc;
        ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyBrass mBrassOsc;
        ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyReed mReedOsc;
        ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyVpm mVpmOsc;
        ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyBowed mBowedOsc;
        ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyNoiseComb mNoiseCombOsc;
        ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyEP mElectricPianoOsc;
        ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyOrgan mOrganOsc;
        ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyWaveshaper mProphecyWaveshaper;
        ::Omega::DSP::Engines::Korg::Prophecy::FilterPoolResonantBank mResBankFlt;
        ::Omega::DSP::Engines::Roland::JP::OscillatorPoolJpFeedback mJpFeedbackOsc;
        ::Omega::DSP::Engines::Roland::JP::OscillatorPoolJpDual mJpDualOsc;
        ::Omega::DSP::Engines::Korg::MS20::KorgMs20Esp mMs20Esp;

        std::array<int, 16> mVoiceNoteIds { -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1 };
        std::array<float, 64> mChannelModStates;
        std::array<OmegaModularVoiceFixed, 16> mVoices;
        
        // Voice Architecture 2.0 (Batch 4)
        ::Omega::Core::Voice::CompiledVoicePlan mVoicePlan;
        ::Omega::Core::Voice::CompiledVoicePlan mNextVoicePlan;
        std::array<::Omega::Core::Voice::VoiceState, 16> mVoiceStates;
        ::Omega::Core::Voice::DspPoolSet mPoolSet;
        std::atomic<bool> mPendingPlanUpdate { false };
        
        ::Omega::Core::Service::SystemSettingsManager& mSettings;
        int mNumVoices = 16;
        float mVcaMainGain = 0.8f;
        std::atomic<bool> mPendingConfigUpdate { false };
        std::atomic<::Omega::Core::Service::EngineConfig*>* mConfigProvider = nullptr;
        ::Omega::Core::Service::EngineConfig mCurrentConfig;
        ::Omega::Core::Util::PerformanceMonitor mPerfMonitor{"VirtualAnalogEngine"};
    };
}
