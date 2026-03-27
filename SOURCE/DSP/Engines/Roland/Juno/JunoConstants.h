#pragma once

namespace Omega::DSP::Engines::Roland::Juno::Constants {

    // DCO
    static constexpr float kMasterClockHz = 8000000.0f;
    static constexpr float kPwmCenterDuty = 0.5f;
    static constexpr float kPwmMaxDuty = 0.95f;
    static constexpr float kPwmSlewRateManual = 0.05f;
    static constexpr float kSubAmpScale = 0.6f;
    static constexpr float kDcoMixerSaturationThreshold = 0.95f;
    static constexpr float kDcoDriftMaxSpreadCents = 2.5f;
    static constexpr float kDcoDriftMaxVoiceCents = 1.2f;

    // VCF (Based on IR3109)
    static constexpr float kVcfResonanceComp = 1.4f;
    static constexpr float kVcfSelfOscThreshold = 0.98f;
    static constexpr float kVcfEnvScale = 8000.0f;

    // HPF
    static constexpr float kFreqPos2 = 80.0f;
    static constexpr float kFreqPos3 = 160.0f;
    static constexpr float kShelfFreq = 250.0f;
    static constexpr float kShelfGainDb = 6.0f;
    
} // namespace Omega::DSP::Engines::Roland::Juno::Constants
