#pragma once

#include <vector>
#include <algorithm>
#include <array>
#include <cmath>

namespace Omega {
    namespace DSP {
        namespace Engines {
            namespace Korg {

    /**
     * @brief Oscilador de Madera (Reed) tipo Korg Prophecy.
     * [ID]: OSC-PD-001 (Physical Device / MOSS)
     * [Tech]: Waveguide Physical Modeling / Woodwind Reed with Cubic Non-linearity.
     */
    class OscillatorPoolProphecyReed {
    public:
        static constexpr int kMaxVoices = 16;
        static constexpr int kMaxDelaySize = 4096;

        struct VoiceState {
            std::vector<float> delayLine;
            int writeIdx = 0;
            float length = 100.0f;
            
            // Parámetros de modelado
            float reedStiffness = 0.5f;
            float breathPressure = 0.3f;
            float toneHolePos = 1.0f; // Multiplicador de longitud
            
            bool active = false;
            float filterZ1 = 0.0f;
        };

        OscillatorPoolProphecyReed() {
            for (auto& v : mVoices) {
                v.delayLine.assign(kMaxDelaySize, 0.0f);
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
            v.writeIdx = 0;
            v.filterZ1 = 0.0f;
            
            std::fill(v.delayLine.begin(), v.delayLine.end(), 0.0f);
        }

        void setVoiceParams(int voiceIndex, float stiffness, float pressure, float toneHole) noexcept {
            if (voiceIndex < kMaxVoices) {
                auto& v = mVoices[voiceIndex];
                v.reedStiffness = std::max(0.05f, std::min(0.95f, stiffness));
                v.breathPressure = std::max(0.0f, std::min(1.0f, pressure));
                v.toneHolePos = std::max(0.5f, std::min(2.0f, toneHole));
            }
        }

        float process(int voiceIndex) noexcept {
            auto& v = mVoices[voiceIndex];
            if (!v.active) return 0.0f;

            // 1. Obtener señal retornada del tubo (reflexión)
            float currentLength = v.length * v.toneHolePos;
            int readIdx = (v.writeIdx - static_cast<int>(currentLength) + kMaxDelaySize) % kMaxDelaySize;
            float delayedSignal = v.delayLine[readIdx];

            // 2. Modelo de Lengüeta mejorada (Reed Table con no-linealidad)
            float deltaP = v.breathPressure - delayedSignal;
            
            // Función de cierre de la lengüeta mejorada (Reed Table)
            // Modelo no lineal que colapsa si la presión es excesiva (clipping dinámico)
            float x = deltaP * v.reedStiffness;
            float x2 = x * x;
            float reedSignal = deltaP * (1.0f - x + (0.5f * x2)); 
            
            // Soft clipping asimétrico para redondear el timbre tipo "reed"
            float excitation = std::tanh(reedSignal * 1.8f);

            // 3. Loop de feedback y filtrado de pérdidas (Damping)
            float damping = 0.7f;
            float outVal = excitation + delayedSignal * 0.98f;
            
            float filteredOut = outVal * (1.0f - damping) + v.filterZ1 * damping;
            v.filterZ1 = filteredOut;

            // Inversión de fase típica en tubos abiertos/cerrados
            v.delayLine[v.writeIdx] = -filteredOut; 
            v.writeIdx = (v.writeIdx + 1) % kMaxDelaySize;

            return filteredOut;
        }

    private:
        double mSampleRate = 44100.0;
        std::array<VoiceState, kMaxVoices> mVoices;
    };

            } // namespace Korg
        } // namespace Engines
    } // namespace DSP
} // namespace Omega
