#pragma once

#include "OmegaPreset.h"

namespace Omega::Core::Preset {

    /**
     * @brief Factoría de presets para la familia JP-808X.
     */
    class JpFactory {
    public:
        static OmegaPreset createJpTrance() {
            OmegaPreset p;
            p.metadata.name = "JN-JP-808x Trance";
            p.metadata.author = "abdeneurolab";
            p.metadata.category = "Lead/Pad";
            p.metadata.tags = {"pad", "trance", "supersaw", "jp8000", "hybrid"};

            LayerParams layer;
            // Valores extraídos de DOCUMENTACION/0006.txt (L5714+)
            layer.mainCutoff = 5000.0f; // 4-6 kHz
            layer.mainResonance = 0.15f; // 0.10-0.20
            layer.ampAttack = 10.0f;    // 5-15 ms
            layer.ampDecay = 200.0f;   // 150-250 ms
            layer.ampSustain = 0.65f;  // 0.6-0.7
            layer.ampRelease = 220.0f;  // 180-260 ms

            // SuperSaw Config
            layer.voiceArch.oscillators.push_back({"OSC-VA-004", "Oscillator", {{"detune", 0.48f}, {"level", 1.0f}}});
            layer.voiceArch.filters.push_back({"FLT-VA-008", "Filter", {{"cutoff", 5000.0f}, {"resonance", 0.15f}, {"mode", 0.0f}}}); // LP24

            p.layers.push_back(layer);
            return p;
        }

        static OmegaPreset createJpSupersawPad() {
            OmegaPreset p;
            p.metadata.name = "ACE JP Supersaw Pad";
            p.metadata.author = "abdeneurolab";
            p.metadata.category = "Pad";
            p.metadata.tags = {"ambient", "supersaw", "jp8080"};

            LayerParams layer;
            // Valores extraídos de DOCUMENTACION/0006.txt (L5478+)
            layer.mainCutoff = 3200.0f;
            layer.mainResonance = 0.22f;
            layer.ampAttack = 60.0f;
            layer.ampDecay = 260.0f;
            layer.ampSustain = 0.80f;
            layer.ampRelease = 750.0f;

            layer.voiceArch.oscillators.push_back({"OSC-VA-004", "Oscillator", {{"detune", 0.40f}, {"level", 0.85f}}});
            layer.voiceArch.filters.push_back({"FLT-VA-008", "Filter", {{"cutoff", 3200.0f}, {"resonance", 0.22f}, {"mode", 0.0f}}});
            
            p.layers.push_back(layer);
            return p;
        }
    };

} // namespace Omega::Core::Preset
