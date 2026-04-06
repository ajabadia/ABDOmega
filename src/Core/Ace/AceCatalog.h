#pragma once

#include <string>
#include <vector>
#include <map>
#include <memory>
#include <filesystem>
#include <juce_core/juce_core.h>

namespace Omega::Core::Ace {

    /**
     * @brief Definición de un parámetro de componente ACE.
     */
    struct ParameterDef {
        std::string id;
        std::string label;
        std::string unit;
        float min = 0.0f;
        float max = 1.0f;
        float defaultValue = 0.0f;
    };

    /**
     * @brief Definición de un objetivo de modulación.
     */
    struct ModTarget {
        std::string id;
        std::string label;
        std::string unit;
    };

    /**
     * @brief Información extendida de un componente ACE.
     */
    struct ComponentInfo {
        std::string id;
        std::string name;
        std::string family;   // Oscillator, Filter, Envelope, LFO, FX
        std::string engine;   // VirtualAnalog, etc.
        std::string modelId;
        std::string origin;
        std::string status;   // active, experimental, deprecated
        int version = 1;
        std::vector<std::string> tags;
        std::vector<ParameterDef> parameters;
        std::vector<ModTarget> modulationTargets;
        
        // Mantener compatibilidad con el código antiguo si es necesario
        std::map<std::string, float> defaultParams; 
    };

    /**
     * @brief Catálogo centralizado de componentes ACE disponibles.
     */
    class AceCatalog {
    public:
        AceCatalog();
        
        /**
         * @brief Crea una instancia cargando desde el directorio de recursos.
         */
        static std::unique_ptr<AceCatalog> createFromResources(const std::filesystem::path& resourcesDir);

        /**
         * @brief Carga todos los archivos JSON de componentes de un directorio.
         */
        bool loadFromDirectory(const juce::File& directory);

        void registerComponent(const ComponentInfo& info);
        const ComponentInfo* getComponent(const std::string& id) const;
        
        /**
         * @brief Lista componentes filtrados por familia y motor.
         */
        std::vector<const ComponentInfo*> listByFamilyAndEngine(const std::string& family, const std::string& engine) const;

        /**
         * @brief Retorna todos los componentes registrados.
         */
        std::vector<const ComponentInfo*> getComponents() const {
            std::vector<const ComponentInfo*> results;
            for (auto const& [id, info] : mComponents) results.push_back(&info);
            return results;
        }

        /**
         * @brief Retorna un ID de fallback basado en la familia y el engine.
         */
        std::string getFallbackId(const std::string& family, const std::string& engine) const;
        void buildFallbacks();

    private:
        void registerDefaults();
        
        static std::string makeFallbackKey(const std::string& family, const std::string& engine);

        std::map<std::string, ComponentInfo> mComponents;
        std::map<std::string, std::string> mFallbacks;
    };

} // namespace Omega::Core::Ace
