#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>
/** [BUILD_FORCE_120] Pure Aseptic Restoration of OMEGA Engine (Industrial Era 7.2.3). **/
#include <array>
#include <cmath>
#include <algorithm>
#include <atomic>
#include <string>

#include "../../Core/Service/ISynthesisEngine.h"
#include "OmegaAsepticVoice.h"
#include "../../Core/Providers/ModulationTelemetryHub.h"
#include "../../Core/Providers/ModulationTelemetryRegistry.h"
#include "../../Core/Util/PerformanceMonitor.h"
#include "../../Core/Model/PatchDocument.h"
#include "../../Core/Model/RuntimeSnapshot.h"
#include "../../Core/Providers/SystemSettingsManager.h"
#include "../../Core/Util/ParamIdRegistry.h"
#include "../Voice/VoiceState.h"
#include "../Modulation/ModulationRuntime.h"
#include "../../Core/Wasm/WasmModuleService.h"

namespace Omega {
namespace Engine {
namespace Modular {

    using namespace ::Omega::Core::Service;
    using namespace ::Omega::Core::Providers;

    /**
     * @brief Refined Modular Engine Orchestrator (Aseptic Era 7.2.3).
     * Decoupled from legacy hardware emulations (Roland, Korg, etc.).
     */
    class VirtualAnalogEngine : public ::Omega::Core::Service::ISynthesisEngine {
    public:
        VirtualAnalogEngine(::Omega::Core::Service::SystemSettingsManager& settings) 
            : mSettings(settings)
        {
            ::Omega::Core::ParamIdRegistry::getInstance().preRegisterCommonIds();
            mChannelModStates.fill(0.0f);
        }

        void prepare(double sampleRate, int samplesPerBlock) override {
            mSampleRate = sampleRate;
            
            auto& reg = ModulationTelemetryRegistry::getInstance();
            mSlotMaster = reg.registerPin("engine", "master_out", TelemetryType::Audio, "Final Out");
            mSlotActivity = reg.registerPin("engine", "activity", TelemetryType::Discrete, "Signal Activity");

            for (auto& v : mVoices) v.prepare(sampleRate, samplesPerBlock);
            mBlockSize = samplesPerBlock;
            mModRuntime.reset();
            
            mModRuntime.setSourceValue(::Omega::Core::Voice::CompiledSignalSpace::kSystemSampleRate, (float)mSampleRate);
            mModRuntime.setSourceValue(::Omega::Core::Voice::CompiledSignalSpace::kSystemBlockSize, (float)mBlockSize);

            ::Omega::Core::Wasm::WasmModuleService::getInstance().setEnvironment(mSampleRate, mBlockSize, 1);
        }

        void reset() override {
            mModRuntime.reset();
            for (auto& v : mVoices) v.reset();
            for (auto& s : mVoiceStates) {
                for (auto& b : s.buses) b = 0.0f;
                s.isActive = false;
            }
        }

        void renderNextBlock(::juce::AudioBuffer<float>& buffer) noexcept override {
            if (mPendingConfigUpdate.load()) { applyConfigUpdate(); mPendingConfigUpdate.store(false); }
            mNumVoices = mSettings.getNumVoices();
            
            const int numSamples = buffer.getNumSamples();
            const int numChannels = buffer.getNumChannels();
            auto& hub = ::Omega::Core::Providers::ModulationTelemetryHub::getInstance();
            
            for (int s = 0; s < numSamples; ++s) {
                mModRuntime.setSourceValue(::Omega::Core::Voice::CompiledSignalSpace::kSystemSampleRate, (float)mSampleRate);
                mModRuntime.setSourceValue(::Omega::Core::Voice::CompiledSignalSpace::kSystemBlockSize, (float)mBlockSize);

                mModRuntime.processBlock(1);
                float mixedL = 0.0f, mixedR = 0.0f;
                
                float inL = buffer.getSample(0, s);
                float inR = numChannels > 1 ? buffer.getSample(1, s) : inL;

                ::Omega::Core::Wasm::WasmModuleService::getInstance().bindSystemBuffers(&mixedL, &mixedR, &inL, &inR);
                
                const float blockLfoVal = mModRuntime.getSignalValue(0);

                for (int v = 0; v < mNumVoices; ++v) {
                    if (mVoices[v].isActive()) {
                        float vL = 0.0f, vR = 0.0f;
                        if (mVoicePlan.isInitialised) {
                            ::Omega::Core::Voice::VoiceState& state = mVoiceStates[v];
                            state.isActive = mVoices[v].isActive();
                            state.ampEnvelope = mVoices[v].getAmpEnvelopeLevel();
                            
                            ::Omega::Core::Wasm::WasmModuleService::getInstance().bindVoiceState(v, &state);

                            // [Era 7] Modular rendering is now purely voice-state driven
                            mVoices[v].renderSample(vL, vR, blockLfoVal, mCurrentSnapshot.voiceConfig);
                            
                            state.triggerRequested = false; 
                            mixedL += vL; mixedR += vR; 
                        }
                    }
                }
                
                float masterGain = std::pow(10.0f, mCurrentSnapshot.globalParams[0] / 20.0f);
                mixedL *= masterGain; mixedR *= masterGain;

                if (s % 32 == 0) {
                    hub.pushSignal(mSlotMaster, mixedL); 
                    hub.pushSignal(mSlotActivity, mVoiceStates[0].isActive ? 1.0f : 0.0f);
                }

                for (int c = 0; c < numChannels; ++c) buffer.setSample(c, s, (c == 0) ? mixedL : mixedR);
            }

            for (int i = 0; i < 32; ++i) {
                hub.pushSignal(i, mModRuntime.getSignalValue(i));
            }
        }

        void noteOn(int voiceIndex, float freqHz) noexcept override { 
            int vIdx = voiceIndex % 16;
            mVoices[vIdx].handleNoteOn((float)voiceIndex, freqHz, 0.8f); 
            mVoiceStates[vIdx].triggerRequested = true;
        }
        
        void noteOff(int voiceIndex) noexcept override { 
            int vIdx = voiceIndex % 16;
            mVoices[vIdx].noteOff(); 
        }
        
        void getEnvelopeLevels(float& ampEnv, float& filterEnv) const noexcept override { ampEnv = 0.0f; filterEnv = 0.0f; }

        void pushConfigUpdate() noexcept { mPendingConfigUpdate.store(true); }
        void setVoicePlan(const ::Omega::Core::Voice::CompiledVoicePlan& plan) noexcept {
            mNextVoicePlan = plan;
            mPendingPlanUpdate.store(true);
        }

        void setConfigProvider(std::atomic<::Omega::Core::Model::RuntimeSnapshot*>* provider) noexcept { mConfigProvider = provider; }

    private:
        void applyConfigUpdate() noexcept {
            if (!mConfigProvider) return;
            auto* snapshot = mConfigProvider->load();
            if (!snapshot || !snapshot->isValid) return;

            mCurrentSnapshot = *snapshot;
            mVoicePlan = mCurrentSnapshot.voicePlan;
        }

        double mSampleRate = 44100.0;
        int mBlockSize = 256;
        ::Omega::Engine::Modulation::ModulationRuntime mModRuntime;
        
        std::array<int, 16> mVoiceNoteIds { -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1 };
        std::array<float, 64> mChannelModStates;
        std::array<Omega::Engine::Modular::OmegaAsepticVoice, 16> mVoices;
        
        ::Omega::Core::Voice::CompiledVoicePlan mVoicePlan;
        ::Omega::Core::Voice::CompiledVoicePlan mNextVoicePlan;
        std::array<::Omega::Core::Voice::VoiceState, 16> mVoiceStates;
        std::atomic<bool> mPendingPlanUpdate { false };
        
        ::Omega::Core::Service::SystemSettingsManager& mSettings;
        int mNumVoices = 16;
        std::atomic<bool> mPendingConfigUpdate { false };
        std::atomic<::Omega::Core::Model::RuntimeSnapshot*>* mConfigProvider = nullptr;
        ::Omega::Core::Model::RuntimeSnapshot mCurrentSnapshot;
        ::Omega::Core::Util::PerformanceMonitor mPerfMonitor{"VirtualAnalogEngine"};

        int mSlotMaster = -1;
        int mSlotActivity = -1;
    };
} // namespace Modular
} // namespace Engine
} // namespace Omega
