#pragma once

/**
 * JunoConstants.h
 * Valores sintonizados para la emulación de alta fidelidad de la familia Juno (ACE).
 * Basado en mediciones de hardware real (Intel 8253 Timer, MN3009 BBD).
 */
namespace Omega::DSP::Engines::Juno::Constants {

    // --- DCO & Timer (Intel 8253) ---
    constexpr float kMasterClockHz = 8000000.0f; // 8MHz
    constexpr float kDcoMixerSaturationThreshold = 0.65f;

    // --- Analog Drift (Cents) ---
    constexpr float kDcoDriftMaxSpreadCents = 2.0f;
    constexpr float kDcoDriftMaxGlobalCents = 0.5f;
    constexpr float kDcoDriftMaxVoiceCents = 0.3f;

    // --- PWM Logic ---
    constexpr float kPwmCenterDuty = 0.5f;
    constexpr float kPwmMaxDuty = 0.95f;
    constexpr float kPwmMinDuty = 0.05f;
    constexpr float kPwmOffThreshold = 0.98f;
    constexpr float kPwmSlewRateManual = 0.001f;
    constexpr float kPwmSlewRateLFO = 0.0005f;

    // --- Sub-Oscillator ---
    constexpr float kSubAmpScale = 0.707f; // -3dB compensation

    // --- Filter (IR3109) ---
    constexpr float kVcfMaxFreqHz = 20000.0f;
    constexpr float kVcfMinFreqHz = 10.0f;

    // --- HPF positions ---
    namespace HPF {
        constexpr float kFreqPos2 = 225.0f;
        constexpr float kFreqPos3 = 700.0f;
        constexpr float kShelfFreq = 70.0f;
        constexpr float kShelfGainDb = 3.0f;
    }

    // --- Chorus (MN3009 BBD) ---
    namespace Chorus {
        constexpr float kRateIMHz = 0.45f;
        constexpr float kRateIIMHz = 0.82f;
        constexpr float kDelayBaseMs = 15.0f;
        constexpr float kModDepthMs = 4.2f;
        constexpr float kHissLevelDb = -60.0f;
    }

    // --- ADSR Curves (Seconds) ---
    namespace Curves {
        constexpr float kAttackMin = 0.0015f;
        constexpr float kAttackMax = 3.0f;
        constexpr float kDecayMax = 12.0f;
        constexpr float kReleaseMax = 12.0f;
    }

} // namespace Omega::DSP::Engines::Juno::Constants
