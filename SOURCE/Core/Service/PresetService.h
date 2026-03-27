#pragma once

#include <string>
#include <vector>
#include <optional>
#include <juce_core/juce_core.h>
#include "../Preset/OmegaPreset.h"
#include "../Ace/AceCatalog.h"

namespace Omega {
namespace Core {
namespace Service {

    /**
     * @brief Servicio de gestión de Presets.
     * Maneja la carga, guardado y creación de presets OMEGA.
     */
    class PresetService {
    public:
        PresetService(Ace::AceCatalog& catalog) : mCatalog(catalog) {}

        /**
         * @brief Crea un preset por defecto para un motor específico.
         */
        Preset::OmegaPreset createDefault(const std::string& engineType) {
            if (engineType == "VirtualAnalog") {
                return Preset::OmegaPreset::createDefaultVirtualAnalog();
            }
            return Preset::OmegaPreset::createDefault();
        }

        /**
         * @brief Carga un preset desde un archivo YAML.
         */
        std::optional<Preset::OmegaPreset> loadFromFile(const std::string& filePath) {
            Preset::OmegaPreset p;
            if (p.loadFromYaml(filePath)) {
                return p;
            }
            return std::nullopt;
        }

        /**
         * @brief Guarda un preset en formato YAML.
         */
        bool saveToFile(const Preset::OmegaPreset& preset, const std::string& filePath) {
            return preset.saveToYaml(filePath);
        }

        /**
         * @brief Obtiene el catálogo ACE para validación o consulta de componentes.
         */
        Ace::AceCatalog& getCatalog() { return mCatalog; }

    private:
        Ace::AceCatalog& mCatalog;
    };

} // namespace Service
} // namespace Core
} // namespace Omega
