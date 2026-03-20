#pragma once

#include <vector>
#include <random>
#include <algorithm>
#include <array>

namespace Omega {
    namespace DSP {
        namespace Engines {
            namespace Korg {

    /**
     * @brief Oscilador de Cuerda Pulsada (Plucked String) tipo Korg Prophecy.
     * [ID]: OSC-PM-001 (MOSS Architecture)
     * [Tech]: Karplus-Strong / Digital Waveguide.
     */
    class OscillatorPoolProphecyPluck {
    public:
        static constexpr int kMaxVoices = 16;
        static constexpr int kMaxDelaySize = 4096; // Suficiente hasta 10Hz a 44.1kHz

        struct VoiceState {
            std::vector<float> buffer;
            int write_idx = 0;
            float damping = 0.5f;
            float feedback = 0.99f;
            float length = 100.0f; // Longitud efectiva en samples
            bool active = false;
            
            // Filtro de feedback (LFP suave)
            float filter_z1 = 0.0f;
        };

        OscillatorPoolProphecyPluck() {
            for (auto& v : mVoices) {
                v.buffer.assign(kMaxDelaySize, 0.0f);
            }
        }

        void prepare(double sampleRate) noexcept {
            mSampleRate = sampleRate;
        }

        void trigger(int voiceIndex, float frequency) noexcept {
            if (voiceIndex >= kMaxVoices) return;
            
            auto& v = mVoices[voiceIndex];
            v.length = (float)mSampleRate / frequency;
            v.active = true;
            v.write_idx = 0;
            v.filter_z1 = 0.0f;

            // Excitación: Ruido blanco durante la longitud de la "cuerda"
            std::mt19937 gen(std::random_device{}());
            std::uniform_real_distribution<float> dist(-1.0f, 1.0f);
            
            int excitationSize = static_cast<int>(v.length);
            for (int i = 0; i < kMaxDelaySize; ++i) {
                if (i < excitationSize) v.buffer[i] = dist(gen);
                else v.buffer[i] = 0.0f;
            }
        }

        void setVoiceParams(int voiceIndex, float damping, float feedback) noexcept {
            if (voiceIndex < kMaxVoices) {
                mVoices[voiceIndex].damping = std::clamp(damping, 0.01f, 0.99f);
                mVoices[voiceIndex].feedback = std::clamp(feedback, 0.0f, 1.0f);
            }
        }

        float process(int voiceIndex) noexcept {
            auto& v = mVoices[voiceIndex];
            if (!v.active) return 0.0f;

            // Lectura con Delay Line
            int read_idx = (v.write_idx - static_cast<int>(v.length) + kMaxDelaySize) % kMaxDelaySize;
            float val = v.buffer[read_idx];

            // Low Pass Filter (Damping simple)
            float filtered_val = val * (1.0f - v.damping) + v.filter_z1 * v.damping;
            v.filter_z1 = filtered_val;

            // Feedback loop
            float next_val = filtered_val * v.feedback;
            v.buffer[v.write_idx] = next_val;
            
            v.write_idx = (v.write_idx + 1) % kMaxDelaySize;

            return val;
        }

    private:
        double mSampleRate = 44100.0;
        std::array<VoiceState, kMaxVoices> mVoices;
    };

            } // namespace Korg
        } // namespace Engines
    } // namespace DSP
} // namespace Omega
