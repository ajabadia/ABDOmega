#pragma once

namespace Omega::DSP::Engines::Modular {

    enum class FilterType { JunoIR3109, Korg35, JP8080, JPFormant };
    
    enum class OscillatorMode { 
        JunoDco, 
        JpSuperSaw,
        ProphecyPluck,
        ProphecyBrass,
        ProphecyReed,
        ProphecyVpm,
        ProphecyBowed,
        ProphecyNoiseComb,
        ProphecyElectricPiano,
        ProphecyOrgan,
        JpFeedback,
        JpDual,
        KorgMs20Vco,
        Jp8080Supersaw = JpSuperSaw,
        None = 99
    };
    
    enum class FilterSlotMode {
        Standard,
        ResonantBank
    };

} // namespace Omega::DSP::Engines::Modular
