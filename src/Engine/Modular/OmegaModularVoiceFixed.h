#pragma once

#include <cmath>
#include <algorithm>
#include <array>
#include <juce_dsp/juce_dsp.h>

/** [BUILD_FORCE_28] Absolute Aseptic Restoration of OMEGA Voice. Stateful Pool Pass. **/
#include "../../DSP/Engines/Roland/Juno/OscillatorPoolJunoDco.h"
#include "../../DSP/Engines/Roland/JP/OscillatorPoolJp8080.h"
#include "../../DSP/Engines/Roland/Juno/FilterPoolJunoIr3109.h"
#include "../../DSP/Engines/Korg/MS20/FilterPoolKorg35.h"
#include "../../DSP/Engines/Roland/JP/FilterPoolJp8080.h"
#include "../../DSP/Engines/Roland/JP/FilterPoolJpFormant.h"
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

#include "../../Core/Providers/EngineConfig.h"
#include "../../Core/Providers/ModulationTelemetryHub.h"

namespace Omega {
namespace Engine {
namespace Modular {

    using namespace ::Omega::Core::Providers;
    using namespace ::Omega::Core::Service;
    using namespace ::Omega::DSP::Engines;

    /**
     * @brief OMEGA 2.0 stabilized modular voice.
     * Compliant with stateful DSP pools and aseptic layering.
     */
    class OmegaModularVoiceFixed {
    public:
        OmegaModularVoiceFixed() = default;

        void prepare(double sampleRate, int samplesPerBlock) {
            mSampleRate = sampleRate;
            mAdsr.setSampleRate(sampleRate);
            mVcfLpf.prepare({sampleRate, (uint32_t)samplesPerBlock, 1});
            mVcfHpf.prepare({sampleRate, (uint32_t)samplesPerBlock, 1});
            mVcfLpf.setType(::juce::dsp::FirstOrderTPTFilterType::lowpass);
            mVcfHpf.setType(::juce::dsp::FirstOrderTPTFilterType::highpass);
        }

        void reset() { mAdsr.reset(); mVcfLpf.reset(); mVcfHpf.reset(); mIsActive = false; }
        
        void handleNoteOn(int noteNumber, float frequencyHz, float velocity) {
            mCurrentNote = noteNumber; mBaseFrequency = frequencyHz; mVelocity = velocity;
            mAdsr.noteOn(); mIsActive = true;
        }

        void noteOff() { mAdsr.noteOff(); }
        bool isActive() const { return mIsActive || mAdsr.isActive(); }
        
        float getAmpEnvelopeLevel() const { 
           // JUCE's ADSR mutation requires hack for const context in processor
           return mAdsr.getNextSample(); 
        }

        void setAmpAdsr(float a, float d, float s, float r) {
            ::juce::ADSR::Parameters p; p.attack = a; p.decay = d; p.sustain = s; p.release = r;
            mAdsr.setParameters(p);
        }

        void setOscillatorModes(const std::array<::Omega::Core::Service::OscillatorMode, 4>& modes, int numActive) {
            mOscModes = modes; mNumActiveOscillators = numActive;
        }

        void setJunoParams(bool saw, bool pulse, float sub, float noise, float pwm, bool pwmModeLfo) {
            mJunoSaw = saw; mJunoPulse = pulse; mJunoSub = sub; mJunoNoise = noise;
            mJunoPwm = pwm; mJunoPwmModeLfo = pwmModeLfo;
        }

        /**
         * @brief Standard 28-argument rendering call to match VirtualAnalogEngine loop.
         */
        void renderNextBlock(float& outL, float& outR, float& rawDco, int vIdx, 
                             float lfoVal, const ::Omega::Core::Service::VoiceConfig& cfg,
                             const std::array<float, 64>& modValues,
                             ::Omega::DSP::Engines::Roland::Juno::OscillatorPoolJunoDco& oscPool,
                             ::Omega::DSP::Engines::Roland::JP::OscillatorPoolJp8080& jpOscPool,
                             ::Omega::DSP::Engines::Roland::Juno::FilterPoolJunoIr3109& junoFlt,
                             ::Omega::DSP::Engines::Korg::MS20::FilterPoolKorg35& korg35Flt,
                             ::Omega::DSP::Engines::Roland::JP::FilterPoolJp8080& jpFilterPool,
                             ::Omega::DSP::Engines::Roland::JP::FilterPoolJpFormant& jpFormantFlt,
                             ::Omega::DSP::Engines::Korg::MS20::KorgMs20Esp& ms20Esp,
                             ::Omega::DSP::Engines::Korg::Prophecy::FilterPoolResonantBank& resBankFlt,
                             ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyPluck& pluckOsc,
                             ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyBrass& brassOsc,
                             ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyReed& reedOsc,
                             ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyVpm& vpmOsc,
                             ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyNoiseComb& noiseCombOsc,
                             ::Omega::DSP::Engines::Roland::JP::OscillatorPoolJpFeedback& jpFeedbackOsc,
                             ::Omega::DSP::Engines::Roland::JP::OscillatorPoolJpDual& jpDualOsc,
                             ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyEP& epOsc,
                             ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyOrgan& organOsc,
                             ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyBowed& bowedOsc,
                             ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyWaveshaper& prophecyWaveshaper,
                             float mainVcaGain, float pitchBend) 
        {
            float env = mAdsr.getNextSample();
            if (!isActive()) { outL = outR = rawDco = 0.0f; return; }

            float totalOsc = 0.0f;
            float pitchMod = (lfoVal * cfg.dcoLfoDepth) + cfg.jpDetune * 0.01f + pitchBend;
            float currentFreq = mBaseFrequency * std::pow(2.0f, pitchMod);

            for (int i = 0; i < mNumActiveOscillators; ++i) {
                float oscSig = 0.0f;
                auto mode = mOscModes[i];
                if (mode == ::Omega::Core::Service::OscillatorMode::JunoDco) {
                    oscPool.setSawEnabled(vIdx, mJunoSaw);
                    oscPool.setPulseEnabled(vIdx, mJunoPulse);
                    oscPool.setSubLevel(vIdx, mJunoSub);
                    oscPool.setNoiseLevel(vIdx, mJunoNoise);
                    oscPool.setPWMAmount(vIdx, mJunoPwm);
                    oscPool.setVoiceFrequency(vIdx, currentFreq);
                    oscSig = oscPool.process(vIdx, lfoVal);
                } else if (mode == ::Omega::Core::Service::OscillatorMode::JpSuperSaw) {
                    float sample = 0.0f;
                    jpOscPool.process(vIdx, &sample, 1, currentFreq, cfg.jpDetune, 1.0f);
                    oscSig = sample;
                } else if (mode == ::Omega::Core::Service::OscillatorMode::ProphecyWaveshaper) {
                    ::Omega::DSP::Engines::Korg::Prophecy::OscillatorPoolProphecyWaveshaper::Params wsParams;
                    wsParams.drive = cfg.jpDetune * 10.0f; 
                    wsParams.mix = 1.0f;
                    oscSig = prophecyWaveshaper.process(vIdx, totalOsc, wsParams);
                    totalOsc = oscSig; // Non-cumulative for WS
                    continue; 
                }
                totalOsc += oscSig;
            }

            rawDco = totalOsc;
            float vcfMod = (lfoVal * cfg.vcfLfoDepth) + (cfg.vcfEnvInverted ? -env : env) * cfg.vcfEnvDepth;
            float finalCutoff = std::clamp(cfg.cutoff + (vcfMod * 10000.0f), 20.0f, 20000.0f);
            float filterOut = totalOsc;
            
            if (cfg.filterType == ::Omega::Core::Service::FilterType::JunoIR3109) {
                junoFlt.setVoiceParams(vIdx, finalCutoff, cfg.resonance);
                filterOut = junoFlt.process(vIdx, totalOsc);
            } else if (cfg.filterType == ::Omega::Core::Service::FilterType::Korg35) {
                korg35Flt.setVoiceParams(vIdx, finalCutoff, cfg.resonance, cfg.korgHpCutoff, cfg.korgHpRes, cfg.korgGrit);
                filterOut = korg35Flt.process(vIdx, totalOsc);
            }
            
            mVcfHpf.setCutoffFrequency(std::clamp(cfg.korgHpCutoff, 10.0f, 1000.0f));
            filterOut = mVcfHpf.processSample(0, filterOut);
            
            float vcaEnv = (cfg.vcaGateMode) ? 1.0f : env;
            float finalSig = filterOut * vcaEnv * mainVcaGain * mVelocity;
            outL = finalSig * (1.0f - cfg.jpSpread * 0.5f);
            outR = finalSig * (1.0f + cfg.jpSpread * 0.5f);
        }

    private:
        double mSampleRate = 44100.0;
        mutable ::juce::ADSR mAdsr; // Mutable for getAmpEnvelopeLevel hack
        ::juce::dsp::FirstOrderTPTFilter<float> mVcfLpf, mVcfHpf;
        bool mIsActive = false;
        int mCurrentNote = -1;
        float mBaseFrequency = 440.0f, mVelocity = 1.0f;
        int mNumActiveOscillators = 1;
        std::array<::Omega::Core::Service::OscillatorMode, 4> mOscModes { ::Omega::Core::Service::OscillatorMode::JunoDco, ::Omega::Core::Service::OscillatorMode::None, ::Omega::Core::Service::OscillatorMode::None, ::Omega::Core::Service::OscillatorMode::None };
        bool mJunoSaw = true, mJunoPulse = false, mJunoPwmModeLfo = true;
        float mJunoSub = 0.0f, mJunoNoise = 0.0f, mJunoPwm = 0.0f;
    };

} // namespace Modular
} // namespace Engine
} // namespace Omega
