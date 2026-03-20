#pragma once

#include <cmath>
#include <numbers>
#include <algorithm>
#include <array>

namespace Omega {
    namespace DSP {
        namespace Engines {
            namespace Korg {

    /**
     * @brief Filtro Korg MS-20 (KORG35).
     * [ID]: FLT-VA-003
     * [Fidelity]: 2-pole Low-Pass + 2-pole High-Pass en serie. Resonancia agresiva con saturación no lineal.
     * [AudioThreadSafety]: Optimizado para el audio thread.
     */
    class FilterPoolKorg35 {
    public:
        static constexpr int kMaxVoices = 16;

        struct VoiceState {
            float lp_z1 = 0.0f;
            float lp_z2 = 0.0f;
            float hp_z1 = 0.0f;
            float hp_z2 = 0.0f;
            float cutoff = 1000.0f;
            float resonance = 0.0f;
            float drive = 1.0f; // Multiplicador de saturación
        };

        void prepare(double sampleRate) noexcept {
            mSampleRate = sampleRate;
            for (auto& v : mVoices) {
                v.lp_z1 = v.lp_z2 = v.hp_z1 = v.hp_z2 = 0.0f;
            }
        }

        void setVoiceParams(int voiceIndex, float cutoff, float resonance, float drive = 1.0f) noexcept {
            if (voiceIndex < kMaxVoices) {
                mVoices[voiceIndex].cutoff = std::clamp(cutoff, 20.0f, 20000.0f);
                mVoices[voiceIndex].resonance = std::clamp(resonance, 0.0f, 2.0f); // MS-20 permite > 1.0 para caos
                mVoices[voiceIndex].drive = std::clamp(drive, 1.0f, 10.0f);
            }
        }

        float process(int voiceIndex, float input) noexcept {
            auto& v = mVoices[voiceIndex];
            
            // Coeficientes TPT
            float g = std::tan(std::numbers::pi_v<float> * v.cutoff / (float)mSampleRate);
            float R = 1.0f / (1.0f + g);
            
            // El MS-20 (Korg35) es un filtro Sallen-Key. 
            // La clave del "grit" es saturar la realimentación.
            
            // --- Low Pass Section (Sallen-Key TPT with Internal Saturation) ---
            // Y = (X - Z1)*g*R + Z1
            // Ref: Will Pirkle (Virtual Analog Filters)
            
            float lp_input = input * v.drive;
            
            // Feedback saturation (Korg magic)
            // En el MS-20 original, la resonancia añade una realimentación que pasa por diodos/transistores.
            float res_fb = v.resonance * v.lp_z2; // Usamos el estado anterior para el feedback
            float saturated_input = std::tanh(lp_input - res_fb);
            
            float v1 = (saturated_input - v.lp_z1) * g * R;
            float lp_out = v1 + v.lp_z1;
            v.lp_z1 = lp_out + v1;
            
            // Guardamos el estado para el feedback de resonancia
            v.lp_z2 = lp_out;

            // --- High Pass Section (In series, as in MS-20 hardware) ---
            float hp_v1 = (lp_out - v.hp_z1) * g * R;
            float hp_out = lp_out - (hp_v1 + v.hp_z2); // TPT HP variant
            v.hp_z1 = (hp_v1 + v.hp_z2) + hp_v1;
            v.hp_z2 = lp_out;

            // Saturación final asimétrica suave
            float final_out = hp_out;
            if (final_out > 0.0f) final_out = std::tanh(final_out);
            else final_out = std::tanh(final_out * 1.1f) * 0.9f; // Ligera asimetría
            
            return final_out;
        }

    private:
        double mSampleRate = 44100.0;
        std::array<VoiceState, kMaxVoices> mVoices;
    };

            } // namespace Korg
        } // namespace Engines
    } // namespace DSP
} // namespace Omega
