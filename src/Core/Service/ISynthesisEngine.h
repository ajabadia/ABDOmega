#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include "../Input/OmegaInput.h"

namespace Omega {
namespace Core {
namespace Service {

    /**
     * @brief Master Synthesis Engine Interface (The Central Contract).
     * [Architecture]: Defined in Core/Service to unify the contract between 
     * DSP (Building blocks), Engine (Orchestration), and Plugin (Host).
     */
    class ISynthesisEngine {
    public:
        virtual ~ISynthesisEngine() = default;

        // Lifecycle
        virtual void prepare(double sampleRate, int samplesPerBlock) = 0;
        virtual void reset() = 0;

        // Audio Processing (Thread-Safe)
        virtual void renderNextBlock(::juce::AudioBuffer<float>& buffer, 
                                     const ::Omega::Core::Input::OmegaInput& input) noexcept = 0;

        // Control
        virtual void noteOn(int voiceIndex, float freqHz) noexcept = 0;
        virtual void noteOff(int voiceIndex) noexcept = 0;

        // Fidelity & Visualization
        virtual void getEnvelopeLevels(float& ampEnv, float& filterEnv) const noexcept = 0;
    };

} // namespace Service
} // namespace Core
} // namespace Omega
