#include "JunoConstants.h"
#include <juce_audio_basics/juce_audio_basics.h>
#include <cstdint>
#include <cmath>
#include <algorithm>
#include <array>

namespace Omega {
    namespace DSP {
        namespace Engines {
            namespace Juno {

    using namespace Constants;

    /**
     * @brief Implementación de un Oscilador VA Juno DCO con fidelidad de hardware.
     * [Fidelity]: Emula la cuantización del timer Intel 8253 y deriva térmica.
     * [AudioThreadSafety]: Lock-free / Alloc-free.
     */
    class OscillatorPoolJunoDco {
    public:
        static constexpr int kMaxVoices = 16;

        struct VoiceState {
            double phase = 0.0;
            double targetFreq = 440.0;
            float pulseWidth = kPwmCenterDuty;
            float currentPWM = kPwmCenterDuty;
            
            // Drift state
            float staticSpreadCents = 0.0f;
            float globalDriftPhase = 0.0f;
            float voiceDriftPhase = 0.0f;
            float driftAmount = 0.1f;

            float subLevel = kSubAmpScale;
            float noiseLevel = 0.05f;
            bool sawEnabled = true;
            bool pulseEnabled = true;
            bool subEnabled = true;
            bool noiseEnabled = true;
            bool subFlipFlop = false;
            
            // Ring Mod state
            bool ringModEnabled = false;
        };

        void prepare(double sampleRate) noexcept {
            mSampleRate = sampleRate;
            mInvSampleRate = 1.0 / sampleRate;
            
            mRandom.setSeed(0x1234);
            for (auto& v : mVoices) {
                v.staticSpreadCents = (mRandom.nextFloat() * 2.0f - 1.0f) * kDcoDriftMaxSpreadCents;
                v.voiceDriftPhase = mRandom.nextFloat() * juce::MathConstants<float>::twoPi;
            }
        }

        void reset() noexcept {
            for (auto& v : mVoices) {
                v.phase = 0.0;
                v.subFlipFlop = mRandom.nextBool();
            }
        }

        void setVoiceFrequency(int voiceIndex, float freqHz) noexcept {
            if (voiceIndex < kMaxVoices) {
                mVoices[voiceIndex].targetFreq = freqHz;
            }
        }

        void setSawEnabled(int voiceIndex, bool enabled) noexcept {
            if (voiceIndex < kMaxVoices) mVoices[voiceIndex].sawEnabled = enabled;
        }

        void setPulseEnabled(int voiceIndex, bool enabled) noexcept {
            if (voiceIndex < kMaxVoices) mVoices[voiceIndex].pulseEnabled = enabled;
        }

        void setSubEnabled(int voiceIndex, bool enabled) noexcept {
            if (voiceIndex < kMaxVoices) mVoices[voiceIndex].subEnabled = enabled;
        }

        void setNoiseEnabled(int voiceIndex, bool enabled) noexcept {
            if (voiceIndex < kMaxVoices) mVoices[voiceIndex].noiseEnabled = enabled;
        }

        void setRingModEnabled(int voiceIndex, bool enabled) noexcept {
            if (voiceIndex < kMaxVoices) mVoices[voiceIndex].ringModEnabled = enabled;
        }

        void setSubLevel(int voiceIndex, float level) noexcept {
            if (voiceIndex < kMaxVoices) mVoices[voiceIndex].subLevel = level;
        }

        void setNoiseLevel(int voiceIndex, float level) noexcept {
            if (voiceIndex < kMaxVoices) mVoices[voiceIndex].noiseLevel = level;
        }

        void setPWMAmount(int voiceIndex, float amount) noexcept {
            if (voiceIndex < kMaxVoices) mVoices[voiceIndex].pulseWidth = amount;
        }

        void setDriftAmount(int voiceIndex, float amount) noexcept {
            if (voiceIndex < kMaxVoices) mVoices[voiceIndex].driftAmount = amount;
        }

        /**
         * @brief Renderiza el oscilador para una voz específica con cuantización de timer.
         */
        float process(int voiceIndex, float lfoValue = 0.0f) noexcept {
            auto& v = mVoices[voiceIndex];
            
            // 1. Calcular Drift Analógico
            v.voiceDriftPhase += juce::MathConstants<float>::twoPi * 0.02f * mInvSampleRate;
            if (v.voiceDriftPhase > juce::MathConstants<float>::twoPi) v.voiceDriftPhase -= juce::MathConstants<float>::twoPi;
            
            float voiceDrift = std::sin(v.voiceDriftPhase) * kDcoDriftMaxVoiceCents;
            float totalDriftCents = (v.staticSpreadCents + voiceDrift) * v.driftAmount;
            
            // 2. Aplicar Pitch Bend / LFO / Drift
            float freq = v.targetFreq * std::pow(2.0f, totalDriftCents / 1200.0f);
            
            // 3. CUANTIZACIÓN DEL TIMER INTEL 8253 (8MHz Clock)
            // En el hardware real, el DCO se basa en un contador de 16 bits.
            if (freq > 8.0f) {
                float ticks = kMasterClockHz / (freq * 256.0f);
                uint32_t quantizedTicks = static_cast<uint32_t>(ticks + 0.5f);
                freq = kMasterClockHz / (quantizedTicks * 256.0f);
            }

            double dt = freq * mInvSampleRate;

            // 4. PWM Modulation
            // lfoValue viene del ModGraph (enviado desde VirtualAnalogEngine)
            float pwmMod = lfoValue * 0.4f; // Profundidad de modulación PWM
            float targetPWM = kPwmCenterDuty + (v.pulseWidth - 0.5f + pwmMod) * 2.0f * (kPwmMaxDuty - kPwmCenterDuty);
            
            // Clamp manual para evitar aliasing masivo por duty cycles extremos
            if (targetPWM < 0.05f) targetPWM = 0.05f;
            if (targetPWM > 0.95f) targetPWM = 0.95f;
            
            v.currentPWM += (targetPWM - v.currentPWM) * kPwmSlewRateManual;

            // --- Render Waves ---
            float saw = (v.sawEnabled) ? renderSaw(v.phase, dt) : 0.0f;
            float pulse = (v.pulseEnabled) ? renderPulse(v.phase, dt, v.currentPWM) : 0.0f;
            
            // Sub-Osc (Squares con flip-flop toggle en phase wrap)
            float sub = (v.subEnabled) ? (v.subFlipFlop ? 1.0f : -1.0f) * v.subLevel : 0.0f;
            
            // Noise
            float noise = (v.noiseEnabled) ? (mRandom.nextFloat() * 2.0f - 1.0f) * v.noiseLevel : 0.0f;

            // Phase Update
            v.phase += dt;
            if (v.phase >= 1.0) {
                v.phase -= 1.0;
                v.subFlipFlop = !v.subFlipFlop; 
            }

            // Mix con Saturation suave (Mixer saturation)
            float out = (saw + pulse + sub + noise);
            
            // 5. Aplicar Ring Mod si está habilitado
            // Multiplicamos la salida por una onda cuadrada de VCO2 (aproximada para el pool)
            if (v.ringModEnabled) {
                float vco2 = (v.phase * 1.5 < 0.5) ? 1.0f : -1.0f;
                out *= vco2; 
            }

            if (std::abs(out) > kDcoMixerSaturationThreshold) {
                out = std::tanh(out * 1.1f);
            }

            return out * 0.5f;
        }

    private:
        double mSampleRate = 44100.0;
        double mInvSampleRate = 1.0 / 44100.0;
        std::array<VoiceState, kMaxVoices> mVoices;
        juce::Random mRandom;

        // --- Utilidades PolyBLEP ---
        float polyBlep(double t, double dt) const noexcept {
            if (t < dt) {
                double x = t / dt;
                return (float)(x + x - x * x - 1.0);
            } else if (t > 1.0 - dt) {
                double x = (t - 1.0) / dt;
                return (float)(x * x + x + x + 1.0);
            }
            return 0.0f;
        }

        float renderSaw(double phase, double dt) const noexcept {
            float raw = (float)(2.0 * phase - 1.0);
            return raw - polyBlep(phase, dt);
        }

        float renderPulse(double phase, double dt, float duty) const noexcept {
            double p2 = phase + (1.0 - duty);
            if (p2 >= 1.0) p2 -= 1.0;
            
            float raw = (phase < duty) ? 1.0f : -1.0f;
            return raw + polyBlep(phase, dt) - polyBlep(p2, dt);
        }
    };

            } // namespace Juno
        } // namespace Engines
    } // namespace DSP
} // namespace Omega
