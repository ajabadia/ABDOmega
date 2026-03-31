#pragma once

#include <array>
/** [BUILD_FORCE_70] Force re-scan of this header **/
#include <cmath>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>

#include "../Roland/Juno/JunoConstants.h"
#include "../Roland/Juno/OscillatorPoolJunoDco.h"
#include "../Roland/Juno/FilterPoolJunoIr3109.h"
#include "../Korg/MS20/FilterPoolKorg35.h"
#include "../Roland/JP/OscillatorPoolJp8080.h"
#include "../Roland/JP/OscillatorPoolJpFeedback.h"
#include "../Roland/JP/OscillatorPoolJpDual.h"
#include "../Roland/JP/FilterPoolJp8080.h"
#include "../Roland/JP/FilterPoolJpFormant.h"
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
#include "EnvelopeAdsrVA.h"
#include "../Korg/MS20/EnvelopeMs20.h"
#include "../Korg/MS20/KorgMs20Esp.h"
#include "../../../Core/Service/EngineConfig.h"
#include "../../../Core/Input/OmegaInput.h"
#include "../../../Core/Input/ModSource.h"

namespace Omega::DSP::Engines::Modular {

    /**
     * @brief Encapsulates all DSP logic and state for a single synthesizer voice.
     */
    struct OmegaModularVoiceFixed {
    public:
        OmegaModularVoiceFixed() {
            mActiveNote = -1;
            mOscModes.fill(OscillatorMode::None);
            mNumActiveOscillators = 0;
            mHpfFilter.setType(juce::dsp::FirstOrderTPTFilterType::highpass);
        }

        void prepare(double sampleRate, int samplesPerBlock) {
            mSampleRate = sampleRate;
            mAmpEnvelope.prepare(sampleRate);
            mModEnvelope.prepare(sampleRate);
            mMs20Envelope.prepare(sampleRate);

            juce::dsp::ProcessSpec spec { sampleRate, (juce::uint32)samplesPerBlock, 1 };
            mHpfFilter.prepare(spec);
            mShelfFilter.prepare(spec);
            
            // Explicitly qualified to avoid any macro mess
            const float shelfFreq = ::Omega::DSP::Engines::Roland::Juno::Constants::kShelfFreq;
            const float shelfGain = ::Omega::DSP::Engines::Roland::Juno::Constants::kShelfGainDb;
            mShelfFilter.coefficients = juce::dsp::IIR::Coefficients<float>::makeLowShelf(sampleRate, shelfFreq, 0.707f, std::pow(10.0f, shelfGain / 20.0f));
        }

        void reset() {
            mHpfFilter.reset(); mShelfFilter.reset();
            mAmpEnvelope.reset(); mModEnvelope.reset(); mMs20Envelope.reset();
        }

        void updateHpfCoefficients(int hpfPosition) {
            float freq = 10.0f;
            if (hpfPosition == 2) freq = ::Omega::DSP::Engines::Roland::Juno::Constants::kFreqPos2;
            else if (hpfPosition == 3) freq = ::Omega::DSP::Engines::Roland::Juno::Constants::kFreqPos3;
            mHpfFilter.setCutoffFrequency(freq);
        }

        void handleNoteOn(int noteId, float freqHz, float velocity) {
            mActiveNote = noteId; mBaseFrequency = freqHz; mVelocity = velocity;
            mAmpEnvelope.noteOn(); mModEnvelope.noteOn(); mMs20Envelope.noteOn();
            mPendingTrigger = true;
        }

        void noteOff() {
            mAmpEnvelope.noteOff(); mModEnvelope.noteOff(); mMs20Envelope.noteOff();
        }

        bool isActive() const noexcept { return mAmpEnvelope.isActive(); }
        int getActiveNote() const noexcept { return mActiveNote; }
        void clearActiveNote() noexcept { mActiveNote = -1; }

        void setOscillatorModes(const std::array<OscillatorMode, 4>& modes, int count) {
            mOscModes = modes; mNumActiveOscillators = count;
        }

        float getAmpEnvelopeLevel() const noexcept { return mAmpEnvelope.getCurrentLevel(); }
        float getModEnvelopeLevel() const noexcept { return mModEnvelope.getCurrentLevel(); }

        void setAmpAdsr(float a, float d, float s, float r) { mAmpEnvelope.setAttackMs(a); mAmpEnvelope.setDecayMs(d); mAmpEnvelope.setSustain(s); mAmpEnvelope.setReleaseMs(r); }
        void setModAdsr(float a, float d, float s, float r) { mModEnvelope.setAttackMs(a); mModEnvelope.setDecayMs(d); mModEnvelope.setSustain(s); mModEnvelope.setReleaseMs(r); }

        void setJunoParams(bool saw, bool pulse, float sub, float noise, float pwm, bool pwmModeLfo) {
            mSawOn = saw; mPulseOn = pulse; mSubLevel = sub; mNoiseLevel = noise; mPwmAmount = pwm; mPwmModeLfo = pwmModeLfo;
        }

        void renderNextBlock(float& mixedL, float& mixedR, float& dcoSum, int voiceIndex, float lfoVal, float dcoLfoDepth, float vcfLfoDepth, float vcfEnvDepth, bool vcfEnvInverted, float vcaMainGain, bool vcaGateMode, float currentCutoff, float currentResonance, FilterType filterType, FilterSlotMode filterSlotMode, float modSensitivity, float pitchMod, float pitchBend, float airNoise, const std::array<float, 64>& channelModStates,
                             ::Omega::DSP::Engines::Roland::Juno::OscillatorPoolJunoDco& junoOscPool, ::Omega::DSP::Engines::Roland::JP::OscillatorPoolJp8080& jpOscPool, ::Omega::DSP::Engines::Roland::Juno::FilterPoolJunoIr3109& junoFltPool, ::Omega::DSP::Engines::Korg::MS20::FilterPoolKorg35& korgFltPool, ::Omega::DSP::Engines::Roland::JP::FilterPoolJp8080& jpFilterPool, ::Omega::DSP::Engines::Roland::JP::FilterPoolJpFormant& jpFormantFlt, ::Omega::DSP::Engines::Korg::MS20::KorgMs20Esp& ms20Esp, ::Omega::DSP::Engines::Korg::Prophecy::FilterPoolResonantBank& resBankFlt,
                             ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyPluck& pluck, ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyBrass& brass, ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyReed& reed, ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyVpm& vpm, ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyNoiseComb& noiseComb, ::Omega::DSP::Engines::Roland::JP::OscillatorPoolJpFeedback& jpFeedback, ::Omega::DSP::Engines::Roland::JP::OscillatorPoolJpDual& jpDual, ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyEP& ep, ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyOrgan& organ, ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyBowed& bowed, ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyWaveshaper& waveshaper,
                             float jpDetune, float jpSpread, int jpFilterMode, float korgHpCut, float korgHpRes, float korgGrit, float filterDrive, float xModDepth, bool jpSync, float jpOsc2Detune, int prophecyWaveshaperMode)
        {
            if (!mAmpEnvelope.isActive()) { mixedL = 0.0f; mixedR = 0.0f; return; }

            double voiceFreq = mBaseFrequency * std::pow(2.0, ((pitchBend * 2.0) + (pitchMod / 1.0)) / 12.0);
            float oscL = 0.0f; float oscR = 0.0f; bool hasProphecy = false;

            for (int m = 0; m < mNumActiveOscillators; ++m) {
                float curL = 0.0f; float curR = 0.0f; auto mode = mOscModes[m];

                if (mPendingTrigger) {
                    if (mode == OscillatorMode::ProphecyPluck) pluck.trigger(voiceIndex, (float)voiceFreq);
                    else if (mode == OscillatorMode::ProphecyBrass) brass.trigger(voiceIndex, (float)voiceFreq);
                    else if (mode == OscillatorMode::ProphecyReed) reed.trigger(voiceIndex, (float)voiceFreq);
                    else if (mode == OscillatorMode::ProphecyVpm) vpm.trigger(voiceIndex, (float)voiceFreq);
                    else if (mode == OscillatorMode::ProphecyElectricPiano) ep.trigger(voiceIndex, mVelocity, (float)voiceFreq, 0.5f);
                    else if (mode == OscillatorMode::ProphecyOrgan) organ.trigger(voiceIndex);
                    else if (mode == OscillatorMode::ProphecyBowed) bowed.trigger(voiceIndex, (float)voiceFreq);
                    else if (mode == OscillatorMode::ProphecyNoiseComb) noiseComb.trigger(voiceIndex, (float)voiceFreq);
                    else if (mode == OscillatorMode::JunoDco || mode == OscillatorMode::KorgMs20Vco) {
                        junoOscPool.trigger(voiceIndex, (float)voiceFreq);
                    }
                }

                if (mode == OscillatorMode::JunoDco || mode == OscillatorMode::KorgMs20Vco) {
                    junoOscPool.setSawEnabled(voiceIndex, mSawOn);
                    junoOscPool.setPulseEnabled(voiceIndex, mPulseOn);
                    junoOscPool.setSubLevel(voiceIndex, mSubLevel);
                    junoOscPool.setSubEnabled(voiceIndex, mSubLevel > 0.01f);
                    junoOscPool.setNoiseLevel(voiceIndex, mNoiseLevel);
                    junoOscPool.setNoiseEnabled(voiceIndex, mNoiseLevel > 0.01f);
                    junoOscPool.setPWMAmount(voiceIndex, mPwmAmount);
                    junoOscPool.setVoiceFrequency(voiceIndex, (float)voiceFreq);
                    curL = junoOscPool.process(voiceIndex, lfoVal); curR = curL;
                } else if (mode == OscillatorMode::JpSuperSaw) {
                    jpOscPool.processStereo(voiceIndex, &curL, &curR, 1, (float)voiceFreq, jpDetune, jpSpread, 1.0f);
                } else if (mode == OscillatorMode::ProphecyPluck) {
                    curL = pluck.process(voiceIndex); curR = curL; hasProphecy = true;
                } else if (mode == OscillatorMode::ProphecyBrass) {
                    float at = channelModStates[static_cast<int>(::Omega::Core::Input::ModSource::ChannelPressure)];
                    brass.setVoiceParams(voiceIndex, 0.5f, 0.3f + at * 0.7f, 0.5f, 0.1f);
                    curL = brass.process(voiceIndex); curR = curL; hasProphecy = true;
                } else if (mode == OscillatorMode::ProphecyReed) {
                    curL = reed.process(voiceIndex); curR = curL; hasProphecy = true;
                } else if (mode == OscillatorMode::ProphecyVpm) {
                    curL = vpm.process(voiceIndex); curR = curL; hasProphecy = true;
                } else if (mode == OscillatorMode::JpFeedback) {
                    jpFeedback.setVoiceParams(voiceIndex, (float)voiceFreq, 0.5f, 1.0f);
                    curL = jpFeedback.process(voiceIndex); curR = curL;
                } else if (mode == OscillatorMode::JpDual) {
                    jpDual.setVoiceParams(voiceIndex, (float)voiceFreq, (float)voiceFreq, 0.0f, false, 0.5f);
                    curL = jpDual.process(voiceIndex); curR = curL;
                } else if (mode == OscillatorMode::ProphecyElectricPiano) {
                    curL = ep.process(voiceIndex); curR = curL; hasProphecy = true;
                } else if (mode == OscillatorMode::ProphecyOrgan) {
                    curL = organ.process(voiceIndex, (float)voiceFreq); curR = curL; hasProphecy = true;
                } else if (mode == OscillatorMode::ProphecyBowed) {
                    curL = bowed.process(voiceIndex); curR = curL; hasProphecy = true;
                } else if (mode == OscillatorMode::ProphecyNoiseComb) {
                    curL = noiseComb.process(voiceIndex); curR = curL; hasProphecy = true;
                }
                oscL += curL; oscR += curR;
            }
            mPendingTrigger = false;
            
            dcoSum = oscL; // [Telemetry Probe] Capture raw sum pre-filter

            if (hasProphecy) { oscL = waveshaper.process(voiceIndex, oscL, {}); oscR = oscL; }

            float noise = airNoise * (((float)rand() / RAND_MAX) * 2.0f - 1.0f);
            oscL += noise; oscR += noise;
            
            float envVal = mAmpEnvelope.getNextSample(); 
            float filterEnv = (filterType == FilterType::Korg35) ? mMs20Envelope.getNextSample() : mModEnvelope.getNextSample();
            float nativeVcfMod = (lfoVal * vcfLfoDepth) + (filterEnv * vcfEnvDepth * (vcfEnvInverted ? -1.0f : 1.0f));
            float finalCutoff = currentCutoff + (nativeVcfMod * 8000.0f);
            float filteredL = 0.0f; float filteredR = 0.0f;

            if (filterSlotMode == FilterSlotMode::ResonantBank) {
                resBankFlt.setVoiceParams(voiceIndex, finalCutoff, 1.0f, currentResonance);
                filteredL = resBankFlt.process(voiceIndex, oscL); filteredR = filteredL;
            } else if (filterType == FilterType::JunoIR3109) {
                junoFltPool.setVoiceParams(voiceIndex, finalCutoff, currentResonance);
                filteredL = junoFltPool.process(voiceIndex, oscL); filteredR = filteredL;
            } else if (filterType == FilterType::Korg35) {
                korgFltPool.setVoiceParams(voiceIndex, finalCutoff, currentResonance, korgHpCut, korgHpRes, korgGrit * filterDrive);
                filteredL = korgFltPool.process(voiceIndex, oscL); filteredR = filteredL;
            } else if (filterType == FilterType::JP8080) {
                filteredL = jpFilterPool.process(voiceIndex, oscL, finalCutoff, currentResonance, jpFilterMode);
                filteredR = filteredL;
            } else if (filterType == FilterType::JPFormant) {
                jpFormantFlt.setVowel(voiceIndex, currentResonance);
                filteredL = jpFormantFlt.process(voiceIndex, oscL); filteredR = filteredL;
            }

            float hpfOutL = mHpfFilter.processSample(0, filteredL);
            float hpfOutR = mHpfFilter.processSample(0, filteredR);
            hpfOutL = mShelfFilter.processSample(hpfOutL);
            hpfOutR = mShelfFilter.processSample(hpfOutR);
            
            float finalGain = (vcaGateMode ? 1.0f : envVal) * vcaMainGain;
            mixedL = hpfOutL * finalGain; mixedR = hpfOutR * finalGain;
        }

    private:
        double mSampleRate = 44100.0;
        int mActiveNote = -1;
        bool mPendingTrigger = false;
        float mBaseFrequency = 440.0f;
        float mVelocity = 0.0f;
        
        bool mSawOn = true, mPulseOn = false, mPwmModeLfo = false;
        float mSubLevel = 0.0f, mNoiseLevel = 0.0f, mPwmAmount = 0.5f;

        std::array<OscillatorMode, 4> mOscModes;
        int mNumActiveOscillators = 0;
        EnvelopeAdsrVA mAmpEnvelope;
        EnvelopeAdsrVA mModEnvelope;
        ::Omega::DSP::Engines::Korg::MS20::EnvelopeMs20 mMs20Envelope;
        juce::dsp::FirstOrderTPTFilter<float> mHpfFilter;
        juce::dsp::IIR::Filter<float> mShelfFilter;
    };
}
