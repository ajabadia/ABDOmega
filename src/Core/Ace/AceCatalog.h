#pragma once

#include <string>
#include <vector>
#include <map>
#include <memory>
#include <filesystem>
#include <juce_core/juce_core.h>
#include "../Modulation/ModuleManifest.h"

// Forward declaration of YAML nodes to keep headers clean
namespace YAML { class Node; }

namespace Omega {
namespace Core {
namespace Ace {

    /**
     * @brief Tipos de adjuntos visuales para celdas de control.
     */
    struct Attachment {
        std::string type;     // "label", "led", "display"
        std::string position; // "top", "bottom", "left", "right"
        std::string role;
        std::string unit;
        std::string color;    // ERA 6.3
        std::string bind;     // ERA 6.3
    };

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
        bool modulable = true;
        std::vector<Modulation::PortOption> options;

        // Metadata Era 6.2+ (Presentation & Engineering)
        std::string tab;
        std::string group;
        int order = 0;
        std::string uiComponent;
        std::string uiVariant;
        std::string uiSize;
        std::vector<Attachment> attachments;

        float precision = 0.0f;    // ERA 6.3
        float uiPrecision = 0.0f; // ERA 6.3
        bool front = true;        // ERA 6.3
        bool back = true;         // ERA 6.3
    };

    /**
     * @brief Información extendida de un componente ACE (Era 5.2 Purified).
     */
    struct ComponentInfo {
        std::string id;
        std::string name;
        std::string description;
        std::string family;   
        std::string engine;   
        std::string modelId;
        std::string theme;
        int version = 1;
        std::vector<ParameterDef> parameters;
        std::vector<Modulation::PortDescriptor> ports;
        
        uint32_t implementationId = 0; 
        std::map<std::string, float> defaultParams; 
        
        // Extended Identity (ERA 6.3)
        std::vector<std::string> tags;
        int hp = 0;
        std::string rack;
    };

    /**
     * @brief Catálogo centralizado de componentes ACE disponibles.
     */
    class AceCatalog {
    public:
        AceCatalog();
        
        static void parseComponentNode(const YAML::Node& c, ComponentInfo& info);
        static std::unique_ptr<AceCatalog> createFromResources(const std::filesystem::path& resourcesDir);

        void registerComponent(const ComponentInfo& info);
        const ComponentInfo* getComponent(const std::string& id) const;

        std::vector<const ComponentInfo*> listByFamilyAndEngine(const std::string& family, const std::string& engine) const;
        std::vector<const ComponentInfo*> getComponents() const;
        
        /**
         * @brief Busca componentes basándose en una consulta semántica.
         * Compara contra ID, Nombre, ModelID y Tags.
         */
        std::vector<const ComponentInfo*> findComponents(const std::string& query) const;

        std::string getFallbackId(const std::string& family, const std::string& engine) const;
        void buildFallbacks();

        bool loadFromDirectory(const juce::File& directory);
        bool loadFromModulesDirectory(const juce::File& modulesDir);

    private:
        std::map<std::string, ComponentInfo> mComponents;
        std::map<std::string, std::string> mFallbacks;
    };

} // namespace Ace
} // namespace Core
} // namespace Omega
