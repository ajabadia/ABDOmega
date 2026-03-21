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
     * [ID]: OSC-PM-003 (MOSS Architecture)
     * [Tech]: Waveguide Physical Modeling / Woodwind Reed.
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

            // 1. Obtener señal retornada del tubo
            float currentLength = v.length * v.toneHolePos;
            int readIdx = (v.writeIdx - static_cast<int>(currentLength) + kMaxDelaySize) % kMaxDelaySize;
            float delayedSignal = v.delayLine[readIdx];

            // 2. Modelo de Lengüeta (Reed)
            // La lengüeta es una válvula controlada por la diferencia de presión
            float deltaP = v.breathPressure - delayedSignal;
            
            // Función de cierre de la lengüeta (Reed Table)
            // Si deltaP es muy alto, la lengüeta se cierra (clipping)
            float reedSignal = deltaP * (1.0f - (deltaP * v.reedStiffness));
            
            // Soft clipping para redondear el timbre
            float excitation = std::tanh(reedSignal * 1.5f);

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
