#pragma once

#include <vector>
#include <algorithm>
#include <array>
#include <cmath>

namespace Omega {
    namespace DSP {
        namespace Engines {
            namespace Korg::Prophecy {

    /**
     * @brief Oscilador de Metal (Brass) tipo Korg Prophecy.
     * [ID]: OSC-PD-001 (Physical Device / MOSS)
     * [Tech]: Waveguide Physical Modeling / Lip Reed with Cubic Non-linearity.
     */
    class OscillatorPoolProphecyBrass {
    public:
        static constexpr int kMaxVoices = 16;
        static constexpr int kMaxDelaySize = 4096;

        struct VoiceState {
            std::vector<float> delayLine;
            int writeIdx = 0;
            float length = 100.0f;
            
            // Parámetros de modelado
            float lipTension = 0.5f;
            float pressure = 0.3f;
            float bellResonance = 0.5f;
            float noiseLevel = 0.1f;
            
            bool active = false;
            float filterZ1 = 0.0f; // Filtro de la campana (bell)
        };

        OscillatorPoolProphecyBrass() {
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
            
            // Limpiar buffer
            std::fill(v.delayLine.begin(), v.delayLine.end(), 0.0f);
        }

        void setVoiceParams(int voiceIndex, float lipTension, float pressure, float bell, float noise) noexcept {
            if (voiceIndex < kMaxVoices) {
                auto& v = mVoices[voiceIndex];
                v.lipTension = std::max(0.0f, std::min(1.0f, lipTension));
                v.pressure = std::max(0.0f, std::min(1.0f, pressure));
                v.bellResonance = std::max(0.0f, std::min(1.0f, bell));
                v.noiseLevel = std::max(0.0f, std::min(1.0f, noise));
            }
        }

        float process(int voiceIndex) noexcept {
            auto& v = mVoices[voiceIndex];
            if (!v.active) return 0.0f;

            // 1. Obtener señal retornada del tubo (reflexión)
            int readIdx = (v.writeIdx - static_cast<int>(v.length) + kMaxDelaySize) % kMaxDelaySize;
            float delayedSignal = v.delayLine[readIdx];

            // 2. Modelo de Labio (Lip Reed Excitation)
            // Diferencia de presión entre boca y tubo
            float deltaP = v.pressure - delayedSignal;
            
            // Función no lineal de transferencia del labio mejorada (Cubic + Tanh)
            // El labio se abre/cierra según la presión y la tensión, con saturación asimétrica
            float x = deltaP * (1.1f - v.lipTension);
            float x2 = x * x;
            float x3 = x2 * x;
            float lipOpening = x - (0.333f * x3); // Aproximación cúbica
            float excitation = std::tanh(lipOpening * 2.5f) * v.pressure;

            // Añadir un poco de ruido de soplido (breath noise)
            if (v.noiseLevel > 0.0f) {
                static uint32_t seed = 12345;
                seed = seed * 1664525 + 1013904223;
                float noise = ((float)(seed & 0x7FFFFF) / 0x7FFFFF) * 2.0f - 1.0f;
                excitation += noise * v.noiseLevel * 0.1f;
            }

            // 3. Reflexión en la campana (Bell / Low Pass)
            // La campana devuelve las frecuencias bajas y radia las altas
            float bellFilter = 0.8f - (v.bellResonance * 0.5f);
            float outVal = excitation + delayedSignal * 0.95f; 
            
            // Filtrado suave para simular la pérdida de energía
            float filteredOut = outVal * (1.0f - bellFilter) + v.filterZ1 * bellFilter;
            v.filterZ1 = filteredOut;

            // Guardar en el delay line (retroalimentación)
            v.delayLine[v.writeIdx] = filteredOut;
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
