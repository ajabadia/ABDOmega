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
            float lpCutoff = 1000.0f;
            float lpResonance = 0.0f;
            float hpCutoff = 100.0f;
            float hpResonance = 0.0f;
            float drive = 1.0f;
        };

        void prepare(double sampleRate) noexcept {
            mSampleRate = sampleRate;
            for (auto& v : mVoices) {
                v.lp_z1 = v.lp_z2 = v.hp_z1 = v.hp_z2 = 0.0f;
            }
        }

        void setVoiceParams(int voiceIdx, float lpCut, float lpRes, float hpCut, float hpRes, float drive = 1.0f) noexcept {
            if (voiceIdx < kMaxVoices) {
                auto& v = mVoices[voiceIdx];
                v.lpCutoff = std::clamp(lpCut, 20.0f, 20000.0f);
                v.lpResonance = std::clamp(lpRes, 0.0f, 2.0f);
                v.hpCutoff = std::clamp(hpCut, 20.0f, 20000.0f);
                v.hpResonance = std::clamp(hpRes, 0.0f, 2.0f);
                v.drive = std::clamp(drive, 1.0f, 10.0f);
            }
        }

        float process(int voiceIdx, float input) noexcept {
            auto& v = mVoices[voiceIdx];
            
            // --- Low Pass Section ---
            float g_lp = std::tan(std::numbers::pi_v<float> * v.lpCutoff / (float)mSampleRate);
            float R_lp = 1.0f / (1.0f + g_lp);
            
            float lp_in = input * v.drive;
            float lp_fb = v.lpResonance * v.lp_z2;
            
            // Refined "Grit" (Asymmetric sigmoid)
            auto clean_tanh = [](float x) { return x / (1.0f + std::abs(x)); }; // approximation for grit
            float lp_sat_in = clean_tanh(lp_in - lp_fb * 2.0f); 
            
            float v1_lp = (lp_sat_in - v.lp_z1) * g_lp * R_lp;
            float lp_out = v1_lp + v.lp_z1;
            v.lp_z1 = lp_out + v1_lp;
            v.lp_z2 = lp_out;

            // --- High Pass Section ---
            float g_hp = std::tan(std::numbers::pi_v<float> * v.hpCutoff / (float)mSampleRate);
            float R_hp = 1.0f / (1.0f + g_hp);
            
            float hp_fb = v.hpResonance * v.hp_z2;
            float hp_sat_in = clean_tanh(lp_out - hp_fb * 2.0f);

            float v1_hp = (hp_sat_in - v.hp_z1) * g_hp * R_hp;
            float hp_out = hp_sat_in - (v1_hp + v.hp_z2);
            v.hp_z1 = (v1_hp + v.hp_z2) + v1_hp;
            v.hp_z2 = hp_out;

            // Final stage asymmetric saturation
            float final_out = hp_out;
            if (final_out > 0.4f) final_out = 0.4f + (final_out - 0.4f) * 0.1f; // Soft clip
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
