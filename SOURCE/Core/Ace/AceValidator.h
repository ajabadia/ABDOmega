#pragma once

#include "AceCatalog.h"
#include "../../Core/Preset/OmegaPreset.h"
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
    };

    struct ValidationReport {
        ValidationStatus status { ValidationStatus::Ok };
        std::vector<ValidationIssue> issues;
    };

    /**
     * @brief Validador de consistencia para presets ACE.
     * [Logic]: Verifica que todos los componentId existan en el AceCatalog y aplica reparaciones/fallbacks.
     */
    class AceValidator {
    public:
        explicit AceValidator(const AceCatalog& c) : mCatalog(c) {}

        /**
         * @brief Valida un preset e intenta repararlo usando fallbacks si faltan componentes.
         */
        ValidationReport validateAndRepairPreset(Preset::OmegaPreset& preset) const;

    private:
        const AceCatalog& mCatalog;

        void validateLayer(Preset::Layer& layer, ValidationReport& report) const;
        void checkComponent(const std::string& scope,
                            std::string& componentId,
                            const std::string& family,
                            const std::string& engine,
                            ValidationReport& report) const;
    };

} // namespace Omega::Core::Ace
