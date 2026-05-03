#pragma once

#include "AceCatalog.h"
#include <juce_data_structures/juce_data_structures.h>
#include <vector>
#include <string>

namespace Omega::Core::Ace {

    enum class ValidationStatus {
        Ok,
        Degraded,
        Invalid
    };

    struct ValidationIssue {
        ValidationStatus severity;
        std::string scope;   // e.g. "LayerA.Osc1"
        std::string code;    // e.g. "UnknownComponent"
        std::string message;
        juce::var metadata;  // Era 7.2.3: Architectural data (x, y, limits, etc.)
    };

    struct ValidationReport {
        ValidationStatus status { ValidationStatus::Ok };
        std::vector<ValidationIssue> issues;
    };

    /**
     * @brief Validador de consistencia para presets ACE.
     * Logic: Verifica que todos los componentId existan en el AceCatalog y aplica reparaciones/fallbacks.
     */
    class AceValidator {
    public:
        explicit AceValidator(const AceCatalog& c) : mCatalog(c) {}

        /**
         * ERA 6.3: Verifica presencia de flags de visibilidad y campos requeridos.
         */
        ValidationReport validateManifest(const ComponentInfo& info) const;

    private:
        const AceCatalog& mCatalog;
    };

} // namespace Omega::Core::Ace
