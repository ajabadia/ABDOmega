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
        PresetService(::Omega::Core::Ace::AceCatalog& catalog) : mCatalog(catalog) {}

        /**
         * @brief Crea un preset por defecto para un motor específico.
         */
        Preset::OmegaPreset createDefault(const std::string& engineType) {
            // [VISION 2.1.8]: Global Minimal Default to eliminate hardcoded bloat.
            return Preset::OmegaPreset::createMinimal();
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
        ::Omega::Core::Ace::AceCatalog& getCatalog() { return mCatalog; }

        /**
         * @brief Serializa un preset a un bloque de memoria (JUCE).
         */
        void serializePreset(const Preset::OmegaPreset& preset, juce::MemoryBlock& dest) {
            std::string yaml = preset.toYaml();
            dest.replaceWith(yaml.c_str(), yaml.length());
        }

        /**
         * @brief Deserializa un preset desde un bloque de memoria (JUCE).
         */
        Preset::OmegaPreset deserializePreset(const void* data, int size) {
            if (size > 0) {
                Preset::OmegaPreset p;
                std::string yaml((const char*)data, size);
                if (Preset::OmegaPreset::fromYaml(yaml, p)) {
                    // [VISION 2.1.8 - Auto-Heal] If the restored state is empty (e.g. from buggy past sessions), discard it.
                    if (p.getState().getNumChildren() > 0) {
                        return p;
                    }
                }
            }
            // Fallback to the strict minimal preset
            return Preset::OmegaPreset::createMinimal();
        }

    private:
        ::Omega::Core::Ace::AceCatalog& mCatalog;
    };

} // namespace Service
} // namespace Core
} // namespace Omega
