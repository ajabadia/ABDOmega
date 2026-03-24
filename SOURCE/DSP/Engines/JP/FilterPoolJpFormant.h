#pragma once

#include <cmath>
#include <array>
#include <vector>

namespace Omega::DSP::Engines::JP {

    /**
     * @brief JP-Formant Filter (Vocal Modulator).
     * Emulates the vocal/formant filter transitions of the JP-8080.
     * Uses parallel band-pass filters to create vowel structures.
     */
    class FilterPoolJpFormant {
    public:
        static constexpr int kMaxVoices = 16;
        static constexpr int kNumBands = 3; // F1, F2, F3 are usually enough for vowels

        struct Vowel {
            float f[kNumBands]; // Frequencies
            float q[kNumBands]; // Q factors
            float g[kNumBands]; // Gains
        };

        struct Biquad {
            float b0, b1, b2, a1, a2;
            float z1, z2;
            
            void setBandPass(float freq, float q, double sampleRate) {
                float w0 = 2.0f * 3.14159f * freq / (float)sampleRate;
                float alpha = std::sin(w0) / (2.0f * q);
                float cosW0 = std::cos(w0);
                
                b0 = alpha;
                b1 = 0.0f;
                b2 = -alpha;
                float a0 = 1.0f + alpha;
                a1 = -2.0f * cosW0;
                a2 = 1.0f - alpha;

                b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
            }

            inline float process(float in) {
                float out = b0 * in + b1 * z1 + b2 * z2 - a1 * z1 - a2 * z2;
                z2 = z1;
                z1 = out;
                return out;
            }
        };

        void prepare(double sampleRate) {
            mSampleRate = sampleRate;
            setupVowels();
        }

        void setVowel(int vIdx, float position) {
            if (vIdx >= kMaxVoices) return;
            mVowelPositions[vIdx] = position;
            updateFilterWeights(vIdx);
        }

        float process(int vIdx, float input) {
            if (vIdx >= kMaxVoices) return input;
            
            float out = 0.0f;
            auto& voiceFilters = mFilters[vIdx];
            for (int i = 0; i < kNumBands; ++i) {
                out += voiceFilters[i].process(input) * mGains[vIdx][i];
            }
            return out;
        }

    private:
        void setupVowels() {
            // Frequencies for A, E, I, O, U (approximate male)
            mVowels[0] = { {700, 1220, 2600}, {10, 10, 10}, {1.0, 0.5, 0.2} }; // A
            mVowels[1] = { {400, 1800, 2600}, {10, 10, 10}, {1.0, 0.5, 0.2} }; // E
            mVowels[2] = { {250, 2250, 3000}, {10, 10, 10}, {1.0, 0.5, 0.2} }; // I
            mVowels[3] = { {400, 800, 2600},  {10, 10, 10}, {1.0, 0.5, 0.2} }; // O
            mVowels[4] = { {250, 700, 2600},  {10, 10, 10}, {1.0, 0.5, 0.2} }; // U
        }

        void updateFilterWeights(int vIdx) {
            float p = mVowelPositions[vIdx] * 4.0f; // 0 to 4 range
            int i1 = (int)std::floor(p);
            int i2 = std::min(i1 + 1, 4);
            float f = p - (float)i1;

            for (int b = 0; b < kNumBands; ++b) {
                float freq = mVowels[i1].f[b] * (1.0f - f) + mVowels[i2].f[b] * f;
                float q = mVowels[i1].q[b] * (1.0f - f) + mVowels[i2].q[b] * f;
                mGains[vIdx][b] = mVowels[i1].g[b] * (1.0f - f) + mVowels[i2].g[b] * f;
                mFilters[vIdx][b].setBandPass(freq, q, mSampleRate);
            }
        }

        double mSampleRate = 44100.0;
        Vowel mVowels[5];
        float mVowelPositions[kMaxVoices];
        float mGains[kMaxVoices][kNumBands];
        std::array<std::array<Biquad, kNumBands>, kMaxVoices> mFilters{};
    };

} // namespace Omega::DSP::Engines::JP
