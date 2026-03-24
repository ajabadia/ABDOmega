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
            
            // Controller de Vector (MOD-PROP-001)
            float vectorX = 0.5f;     // CC16: X Axis
            float vectorY = 0.5f;     // CC17: Y Axis
        };

        static void apply(MacroState& state, 
                          float& filterDrive, 
                          float& lfoRate, 
                          float& lfoDepth,
                          float& noiseMix,
                          float& hpfCutoff,
                          float& modSensitivity) noexcept 
        {
            // Macro 1: Energy (Intensidad / Drive)
            float e = std::pow(state.energy, 1.2f);
            filterDrive = 1.0f + e * 9.0f;
            
            // Macro 2: Movement (Vibrato dinámico)
            lfoRate = 0.5f + state.movement * 14.5f;
            lfoDepth = 0.1f + state.movement * 0.9f;
            
            // Macro 3: Air (Brillo soplado / Ruido avanzado)
            float a = std::pow(state.air, 0.8f);
            noiseMix = a * 0.5f; // Mayor rango para Physical Models
            hpfCutoff = 20.0f + a * 6000.0f;
            
            // Macro 4: Expressivity (Sensibilidad a ModulationRuntime)
            modSensitivity = std::pow(state.expressivity, 1.4f);
        }

        static void applyVector(MacroState& state, float& mixAB, float& auxMod) noexcept
        {
            // El eje X suele controlar el balance entre Osciladores A y B
            mixAB = state.vectorX; 
            
            // El eje Y suele controlar un parámetro de "Timbre" o modulación auxiliar
            auxMod = std::pow(state.vectorY, 1.2f);
        }
    };

            } // namespace Korg
        } // namespace Engines
    } // namespace DSP
} // namespace Omega
