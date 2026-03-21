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
     * @brief Modelo de Cuerda Frotada (Bowed String) tipo Korg Prophecy.
     * [ID]: OSC-PM-005 (MOSS Architecture)
     * [Tech]: Waveguide with non-linear Friction (Bow model).
     */
    class OscillatorPoolProphecyBowed {
    public:
        static constexpr int kMaxVoices = 16;
        static constexpr int kMaxDelaySize = 4096;

        struct VoiceState {
            std::vector<float> delayLine;
            int writeIdx = 0;
            float length = 100.0f;
            
            // Parámetros de modelado
            float bowPressure = 0.5f;
            float bowPosition = 0.2f; // Fracción de la cuerda (0.01 a 0.5)
            float bowVelocity = 0.5f;
            float vibrato = 0.0f;
            
            bool active = false;
            float filterZ1 = 0.0f; 
        };

        OscillatorPoolProphecyBowed() {
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

        void setVoiceParams(int voiceIndex, float pressure, float position, float velocity) noexcept {
            if (voiceIndex < kMaxVoices) {
                auto& v = mVoices[voiceIndex];
                v.bowPressure = std::max(0.01f, std::min(1.0f, pressure));
                v.bowPosition = std::max(0.01f, std::min(0.5f, position));
                v.bowVelocity = std::max(0.0f, std::min(1.0f, velocity));
            }
        }

        float process(int voiceIndex) noexcept {
            auto& v = mVoices[voiceIndex];
            if (!v.active) return 0.0f;

            // 1. Obtener señal del delay line (reflexión de la cuerda)
            int readIdx = (v.writeIdx - static_cast<int>(v.length) + kMaxDelaySize) % kMaxDelaySize;
            float delayedSignal = v.delayLine[readIdx];

            // 2. Modelo de Fricción (arco frotando la cuerda)
            // Diferencia de velocidad entre el arco y la cuerda
            float vDelta = v.bowVelocity - delayedSignal;
            
            // Función de fricción no lineal (basada en el modelo de Smith/Cook)
            // La fricción cae cuando la velocidad relativa aumenta (stick-slip)
            float friction = 0.0f;
            float vDeltaAbs = std::abs(vDelta);
            if (vDeltaAbs < 0.0001f) {
                friction = v.bowPressure; // Fricción estática
            } else {
                // Curva de fricción dinámica simplificada
                friction = v.bowPressure * (0.2f + 0.8f * std::exp(-4.0f * vDeltaAbs));
            }
            
            float excitation = vDelta * friction;

            // 3. Filtrado y Retroalimentación
            // Pérdidas en los extremos de la cuerda (Bridge/Nut)
            float bridgeFilter = 0.1f;
            float outVal = excitation + delayedSignal * 0.99f; 
            
            // Filtrado paso-bajo suave
            float filteredOut = outVal * (1.0f - bridgeFilter) + v.filterZ1 * bridgeFilter;
            v.filterZ1 = filteredOut;

            // Guardar en el delay line
            v.delayLine[v.writeIdx] = filteredOut;
            v.writeIdx = (v.writeIdx + 1) % kMaxDelaySize;

            return filteredOut * 0.5f;
        }

    private:
        double mSampleRate = 44100.0;
        std::array<VoiceState, kMaxVoices> mVoices;
    };

            } // namespace Korg
        } // namespace Engines
    } // namespace DSP
} // namespace Omega
