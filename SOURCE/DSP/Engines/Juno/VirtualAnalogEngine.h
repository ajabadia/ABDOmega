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
#include "../JP/FilterPoolJp8080.h"
#include "ChorusPoolJuno.h"
#include "../../VA/EnvelopeAdsrVA.h"
#include "../../../Core/Modulation/ModulationRuntime.h"
#include "../ISynthesisEngine.h"
#include "../../../Core/Input/OmegaInput.h"

namespace Omega::DSP::Engines::Juno {

    using namespace Constants;

    /**
     * @brief Motor de síntesis Virtual Analog estilo Juno / Modular ACE Refinado.
     */
    class VirtualAnalogEngine : public ISynthesisEngine {
    public:
        enum class FilterType { JunoIR3109, Korg35, JP8080 };
        enum class OscillatorMode { JunoDco, JpSuperSaw };

        VirtualAnalogEngine() {
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
        
        void setVoiceParams(int voiceIndex, float cutoff, float resonance) noexcept {
            mJunoFlt.setVoiceParams(voiceIndex, cutoff, resonance);
            mKorg35Flt.setVoiceParams(voiceIndex, cutoff, resonance, 2.0f); // Default grit
            mCurrentResonance = resonance;
        }

        void setOscillatorMode(int voiceIndex, OscillatorMode mode) noexcept { 
            if (voiceIndex < 16) mOscModes[voiceIndex] = mode; 
        }
        
        void setJpDetune(float detune) noexcept { mJpDetune = detune; }
        void setJpFilterMode(int mode) noexcept { mJpFilterMode = mode; }

        // --- Audio Processing ---
        void renderNextBlock(::juce::AudioBuffer<float>& buffer, 
                             const ::Omega::Core::Input::OmegaInput& input) noexcept override {
            const int numSamples = buffer.getNumSamples();
            const int numChannels = buffer.getNumChannels();

            const auto& events = input.getEvents();
            size_t nextEventIdx = 0;

            for (int s = 0; s < numSamples; ++s) {
                while (nextEventIdx < events.size() && events[nextEventIdx].sampleOffset <= s) {
                    processInputEvent(events[nextEventIdx++]);
                }

                // Precision por sample para el MVP
                mModRuntime.processBlock(1); 

                float mixedOutput = 0.0f;
                for (int v = 0; v < 16; ++v) {
                    if (mAmpEnvelopes[v].isActive()) {
                        float lfoVal = mModRuntime.getSignalValue(10); 
                        float dcoLfo = lfoVal * mDcoLfoDepth;
                        float pitchMod = mModRuntime.getSignalValue(3) + dcoLfo; 
                        
                        float targetPWM = mPwmAmount;
                        if (mPwmModeLfo) targetPWM = 0.5f + (lfoVal * mPwmAmount * 0.5f);
                        mOscPool.setPWMAmount(v, targetPWM);

                        float oscOut = 0.0f;
                        if (mOscModes[v] == OscillatorMode::JpSuperSaw) {
                            float pitchShift = std::pow(2.0f, pitchMod / 12.0f);
                            mJpOscPool.process(v, &oscOut, 1, mJpBaseFreqs[v] * pitchShift, mJpDetune, 1.0f);
                        } else {
                            oscOut = mOscPool.process(v, lfoVal); 
                        }
                        
                        float envVal = mAmpEnvelopes[v].getNextSample(); 
                        float filterEnv = mModEnvelopes[v].getNextSample();
                        float cutoffMod = mModRuntime.getSignalValue(8); 
                        float nativeVcfMod = (lfoVal * mVcfLfoDepth) + (filterEnv * mVcfEnvDepth * (mVcfEnvInverted ? -1.0f : 1.0f));
                        
                        float finalCutoff = 800.0f + ((cutoffMod + nativeVcfMod) * 8000.0f);
                        float filtered = 0.0f;
                        if (mFilterType == FilterType::JunoIR3109) {
                            mJunoFlt.setVoiceParams(v, finalCutoff, mCurrentResonance); // Set params again for safety
                            filtered = mJunoFlt.process(v, oscOut);
                        } else if (mFilterType == FilterType::Korg35) {
                            mKorg35Flt.setVoiceParams(v, finalCutoff, mCurrentResonance, 2.0f); // Set params again for safety, with grit
                            filtered = mKorg35Flt.process(v, oscOut);
                        } else if (mFilterType == FilterType::JP8080) {
                            filtered = mJpFilterPool.process(v, oscOut, finalCutoff, mCurrentResonance, mJpFilterMode);
                        }

                        float hpfOut = filtered;
                        if (mHpfPosition >= 2) hpfOut = mHpfFilters[v].processSample(0, hpfOut);
                        else if (mHpfPosition == 0) hpfOut = mShelfFilters[v].processSample(hpfOut);

                        float gain = mVcaGateMode ? 1.0f : envVal;
                        float resComp = 1.0f + (mCurrentResonance * mCurrentResonance * 0.5f);
                        mixedOutput += hpfOut * gain * resComp;
                    }
                }

                float left = mixedOutput, right = mixedOutput;
                mChorusPool.process(left, right);

                for (int c = 0; c < numChannels; ++c) {
                    if (s < buffer.getNumSamples()) buffer.setSample(c, s, (c == 0) ? left : right);
                }
            }
        }

        void getEnvelopeLevels(float& ampEnv, float& filterEnv) const noexcept override {
            ampEnv = 0.0f; filterEnv = 0.0f;
            int active = 0;
            for (const auto& env : mAmpEnvelopes) {
                if (env.isActive()) { ampEnv += env.getCurrentLevel(); active++; }
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
            mAmpEnvelopes[v].noteOn();
            mModEnvelopes[v].noteOn();
            mActiveNotes[v] = noteId;
        }

        void handleNoteOff(int noteId, float /*releaseVelocity*/) {
            for (int v = 0; v < 16; ++v) {
                if (mActiveNotes[v] == noteId) {
                    mAmpEnvelopes[v].noteOff();
                    mModEnvelopes[v].noteOff();
                    mActiveNotes[v] = -1;
                }
            }
        }

        void handleChannelExpression(::Omega::Core::Input::ModSource source, float value) {
            // Mapeo a ModRuntime o parámetros
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
        ChorusPoolJuno mChorusPool;
        
        FilterType mFilterType = FilterType::JunoIR3109;
        int mHpfPosition = 1;
        bool mVcaGateMode = false;
        float mCurrentResonance = 0.0f;

        float mDcoLfoDepth = 0.0f;
        float mVcfEnvDepth = 0.0f;
        float mVcfLfoDepth = 0.0f;
        float mVcfKeyTracking = 0.0f;
        bool mVcfEnvInverted = false;
        bool mPwmModeLfo = false;
        float mPwmAmount = 0.5f;

        std::array<::juce::dsp::FirstOrderTPTFilter<float>, 16> mHpfFilters;
        std::array<::juce::dsp::IIR::Filter<float>, 16> mShelfFilters;

        std::array<VA::EnvelopeAdsrVA, 16> mAmpEnvelopes;
        std::array<VA::EnvelopeAdsrVA, 16> mModEnvelopes;
        ::Omega::Core::Modulation::ModulationRuntime mModRuntime;
        float mLastHpfFreq = -1.0f;

        std::array<OscillatorMode, 16> mOscModes;
        std::array<float, 16> mJpBaseFreqs;
        float mJpDetune = 0.5f;
        int mJpFilterMode = 0; 
        std::array<int, 16> mActiveNotes;
    };

} // namespace Omega::DSP::Engines::Juno
