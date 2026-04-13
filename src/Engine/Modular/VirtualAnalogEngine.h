#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>
/** [BUILD_FORCE_79] Absolute Aseptic Restoration of OMEGA Engine. Simplified Call Pass. **/
#include <array>
#include <cmath>
#include <algorithm>
#include <atomic>
#include <string>

#include "../../Core/Service/ISynthesisEngine.h"
#include "OmegaModularVoiceFixed.h"
#include "../../Core/Providers/ModulationTelemetryHub.h"
#include "../../Core/Providers/ModulationTelemetryRegistry.h"
#include "../../Core/Util/PerformanceMonitor.h"
#include "../../Core/Input/OmegaInput.h"
#include "../../Core/Input/ModSource.h"
#include "../../Core/Providers/EngineConfig.h"
#include "../../Core/Providers/SystemSettingsManager.h"

// Corrected DSP Paths (Pass 5.20)
#include "../../DSP/Engines/Roland/Juno/OscillatorPoolJunoDco.h"
#include "../../DSP/Engines/Roland/Juno/FilterPoolJunoIr3109.h"
#include "../../DSP/Engines/Korg/MS20/FilterPoolKorg35.h"
#include "../../DSP/Engines/Roland/JP/OscillatorPoolJp8080.h"
#include "../../DSP/Engines/Roland/JP/FilterPoolJp8080.h"
#include "../../DSP/Engines/Roland/JP/FilterPoolJpFormant.h"
#include "../../DSP/Engines/Roland/Juno/ChorusPoolJuno.h"
#include "../../DSP/FX/Roland/RE201/SpaceEchoProcessor.h"
#include "../../DSP/Engines/Korg/MS20/KorgMs20Esp.h"
#include "../../DSP/Engines/Korg/Prophecy/OscillatorPoolProphecyPluck.h"
#include "../../DSP/Engines/Korg/Prophecy/OscillatorPoolProphecyBrass.h"
#include "../../DSP/Engines/Korg/Prophecy/OscillatorPoolProphecyReed.h"
#include "../../DSP/Engines/Korg/Prophecy/OscillatorPoolProphecyVpm.h"
#include "../../DSP/Engines/Korg/Prophecy/OscillatorPoolProphecyBowed.h"
#include "../../DSP/Engines/Korg/Prophecy/OscillatorPoolProphecyNoiseComb.h"
#include "../../DSP/Engines/Korg/Prophecy/OscillatorPoolProphecyEP.h"
#include "../../DSP/Engines/Korg/Prophecy/OscillatorPoolProphecyOrgan.h"
#include "../../DSP/Engines/Korg/Prophecy/OscillatorPoolProphecyWaveshaper.h"
#include "../../DSP/Engines/Korg/Prophecy/FilterPoolResonantBank.h"
#include "../../DSP/Engines/Roland/JP/OscillatorPoolJpFeedback.h"
#include "../../DSP/Engines/Roland/JP/OscillatorPoolJpDual.h"

#include "../Modulation/ModulationRuntime.h"
#include "../Modulation/MotionRecorder.h"
#include "../../Core/Voice/CompiledVoicePlan.h"
#include "../Voice/VoiceState.h"
#include "../Voice/EngineVoiceRuntime.h"
#include "../Voice/VoiceArchitectureCompiler.h"
#include "../Voice/ParamIdRegistry.h"

namespace Omega {
namespace Engine {
namespace Modular {

    using namespace ::Omega::Core::Service;
    using namespace ::Omega::Core::Providers;
    using namespace ::Omega::DSP::Engines;

    /**
     * @brief Refined Modular Engine Orchestrator.
     * Absolute 4-Layer Compliant. Simplified argument passing.
     */
    class VirtualAnalogEngine : public ::Omega::Core::Service::ISynthesisEngine {
    public:
        VirtualAnalogEngine(::Omega::Core::Service::SystemSettingsManager& settings) 
            : mSettings(settings),
              mPoolSet{mOscPool, mJunoFlt, mKorg35Flt, mJpOscPool, mJpFilterPool}
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
            
            // [Era 4.1] Aseptic Telemetry Registration
            auto& reg = ModulationTelemetryRegistry::getInstance();
            mSlotVcf = reg.registerPin("engine", "vcf_out", TelemetryType::Audio, "VCF Out");
            mSlotDco = reg.registerPin("engine", "dco_main", TelemetryType::Audio, "DCO Main");
            mSlotMaster = reg.registerPin("engine", "master_out", TelemetryType::Audio, "Final Out");
            mSlotActivity = reg.registerPin("engine", "activity", TelemetryType::Discrete, "Signal Activity");

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
            mNumVoices = mSettings.getNumVoices();
            
            const int numSamples = buffer.getNumSamples();
            const int numChannels = buffer.getNumChannels();
            auto& hub = ::Omega::Core::Providers::ModulationTelemetryHub::getInstance();
            
            for (int s = 0; s < numSamples; ++s) {
                if (s == 0) {
                    for (const auto& e : input) {
                        if (e.type == ::Omega::Core::Input::InputEventType::NoteOn) {
                            int voiceIdx = -1;
                            for (int i = 0; i < mNumVoices; ++i) {
                                if (!mVoices[i].isActive()) { voiceIdx = i; break; }
                            }
                            if (voiceIdx == -1) voiceIdx = 0; 
                            
                            mVoiceNoteIds[voiceIdx] = e.data.noteOn.noteId;
                            float pitchHz = 440.0f * std::pow(2.0f, (e.data.noteOn.pitch - 69.0f) / 12.0f);
                            mVoices[voiceIdx].handleNoteOn(e.data.noteOn.pitch, pitchHz, e.data.noteOn.velocity);
                            mVoiceStates[voiceIdx].triggerRequested = true; 
                            
                            mModRuntime.setSourceValue(::Omega::Core::Voice::CompiledSignalSpace::kMidiToCvPitch, pitchHz);
                            mModRuntime.setSourceValue(::Omega::Core::Voice::CompiledSignalSpace::kMidiToCvVelocity, e.data.noteOn.velocity);
                            mModRuntime.setSourceValue(::Omega::Core::Voice::CompiledSignalSpace::kMidiToCvGate, 1.0f);
                        }
                        else if (e.type == ::Omega::Core::Input::InputEventType::NoteOff) {
                            for (int i = 0; i < mNumVoices; ++i) {
                                if (mVoiceNoteIds[i] == e.data.noteOff.noteId) {
                                    mVoices[i].noteOff();
                                    mVoiceNoteIds[i] = -1;
                                }
                            }
                            mModRuntime.setSourceValue(::Omega::Core::Voice::CompiledSignalSpace::kMidiToCvGate, 0.0f);
                        }
                        else if (e.type == ::Omega::Core::Input::InputEventType::RawMidi) {
                            // [ERA 5.2 GOLD] Transparent MIDI Hub Distribution
                            // Branch messages to all modular buses for real-time bridging.
                            for (int v = 0; v < mNumVoices; ++v) {
                                auto& mBus = mVoiceStates[v].modularMidi;
                                if (mBus.count < 16) {
                                    mBus.messages[mBus.count++] = { e.data.rawMidi.status, e.data.rawMidi.d1, e.data.rawMidi.d2 };
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
                        if (mVoicePlan.isInitialised) {
                            ::Omega::Core::Voice::VoiceState& state = mVoiceStates[v];
                            state.isActive = mVoices[v].isActive();
                            state.ampEnvelope = mVoices[v].getAmpEnvelopeLevel();
                            
                            ::Omega::Core::Voice::TelemetrySnapshot voiceTelemetry;
                            ::Omega::Core::Voice::EngineVoiceRuntime::renderSample(
                                v, mVoicePlan, state, blockLfoVal, vL, vR, 
                                mPoolSet, voiceTelemetry);
                            
                            state.triggerRequested = false; 
                            if (v == 0) {
                                totalDcoSum = voiceTelemetry.rawOsc;
                                hub.pushSignal(mSlotVcf, voiceTelemetry.rawFilter);
                            }
                            mixedL += vL; mixedR += vR; 
                        } else {
                            float vDco = 0.0f; auto& vc = mCurrentConfig.voices[v];
                            mVoices[v].renderNextBlock(vL, vR, vDco, v, blockLfoVal, vc, mChannelModStates, mOscPool, mJpOscPool, mJunoFlt, mKorg35Flt, mJpFilterPool, mJpFormantFlt, mMs20Esp, mResBankFlt, mPluckOsc, mBrassOsc, mReedOsc, mVpmOsc, mNoiseCombOsc, mJpFeedbackOsc, mJpDualOsc, mElectricPianoOsc, mOrganOsc, mBowedOsc, mProphecyWaveshaper, mVcaMainGain, 0.0f);
                            mixedL += vL; mixedR += vR; totalDcoSum += vDco;
                        }
                    }
                }
                
                if (mCurrentConfig.chorusEnabled) {
                    mChorusPool.setMode(mCurrentConfig.chorusMode);
                    mChorusPool.setMix(mCurrentConfig.chorusMix);
                    mChorusPool.process(mixedL, mixedR);
                }

                float masterGain = std::pow(10.0f, mCurrentConfig.masterGainDb / 20.0f);
                mixedL *= masterGain; mixedR *= masterGain;

                if (s % 32 == 0) {
                    hub.pushSignal(mSlotDco, totalDcoSum);
                    hub.pushSignal(mSlotMaster, mixedL); 
                    // [ERA 5.2 GOLD] Real MIDI Activity Telemetry (Aseptic LED)
                    hub.pushSignal(mSlotActivity, mVoiceStates[0].modularMidi.count > 0 ? 1.0f : 0.0f);
                }

                for (int c = 0; c < numChannels; ++c) buffer.setSample(c, s, (c == 0) ? mixedL : mixedR);
            }

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
        
        int getMaxPatchbaySlots() const noexcept { 
            return (int)mSettings.getSettingValue("maxPatchbaySlots"); 
        }

    private:
        void applyConfigUpdate() noexcept {
            if (mPendingPlanUpdate.load()) { mVoicePlan = mNextVoicePlan; mPendingPlanUpdate.store(false); }
            if (!mConfigProvider) return;
            auto* cfg = mConfigProvider->load();
            if (!cfg) return;
            mCurrentConfig = *cfg;
            for (int i = 0; i < mNumVoices; ++i) {
                std::array<::Omega::Core::Service::OscillatorMode, 4> modes;
                for (int m = 0; m < 4; m++) modes[m] = mCurrentConfig.voices[i].oscModes[m];
                mVoices[i].setOscillatorModes(modes, mCurrentConfig.voices[i].numActiveOscillators);
                mVoices[i].setAmpAdsr(mCurrentConfig.voices[i].attack, mCurrentConfig.voices[i].decay, mCurrentConfig.voices[i].sustain, mCurrentConfig.voices[i].release);
                mVoices[i].setJunoParams(mCurrentConfig.voices[i].sawOn, mCurrentConfig.voices[i].pulseOn, mCurrentConfig.voices[i].subLevel, mCurrentConfig.voices[i].noiseLevel, mCurrentConfig.voices[i].pwmAmount, mCurrentConfig.voices[i].pwmModeLfo);
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
        ::Omega::Engine::Modulation::ModulationRuntime mModRuntime;
        
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
        std::array<Omega::Engine::Modular::OmegaModularVoiceFixed, 16> mVoices;
        
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

        // Telemetry Cache Slots (Era 4.1 Logic)
        int mSlotVcf = -1;
        int mSlotDco = -1;
        int mSlotMaster = -1;
        int mSlotActivity = -1;
    };
} // namespace Modular
} // namespace Engine
} // namespace Omega
