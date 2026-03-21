#pragma once

#include <algorithm>
#include <cmath>

namespace Omega {
    namespace DSP {
        namespace Engines {
            namespace Korg {

    /**
     * @brief Contexto de gestión para los Macros Maestros del Prophecy.
     * [Macros]: Energy, Movement, Air, Expressivity.
     */
    class ProphecyMacroContext {
    public:
        struct MacroState {
            float energy = 0.5f;      // Macro 1: Drive, Cutoff
            float movement = 0.5f;    // Macro 2: LFO Speed, Depth
            float air = 0.5f;         // Macro 3: Noise, HPF
            float expressivity = 0.7f; // Macro 4: Global Mod Sensitivity
        };

        static void apply(MacroState& state, 
                          float& filterDrive, 
                          float& lfoRate, 
                          float& lfoDepth,
                          float& noiseMix,
                          float& hpfCutoff,
                          float& modSensitivity) noexcept 
        {
            // Macro 1: Energy (Curva 1.2 para "sweet spot")
            float energyCurve = std::pow(state.energy, 1.2f);
            filterDrive = 1.0f + energyCurve * 9.0f; // 1.0 a 10.0
            
            // Macro 2: Movement (LFO)
            lfoRate = 0.5f + state.movement * 14.5f; // 0.5 a 15Hz
            lfoDepth = 0.1f + state.movement * 0.9f;
            
            // Macro 3: Air (Frecuencias altas / Ruido)
            float airCurve = std::pow(state.air, 0.8f);
            noiseMix = airCurve * 0.4f;
            hpfCutoff = 20.0f + airCurve * 5000.0f;
            
            // Macro 4: Expressivity (Curva 1.3 para respuesta orgánica)
            modSensitivity = std::pow(state.expressivity, 1.3f);
        }
    };

            } // namespace Korg
        } // namespace Engines
    } // namespace DSP
} // namespace Omega
