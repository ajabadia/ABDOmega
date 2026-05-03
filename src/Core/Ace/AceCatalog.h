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
        std::string bind;     
        std::string text;
        std::string variant;
        float offset = 0.0f;
    };

    /**
     * @brief Representación visual de un elemento en el rack.
     */
    struct UIItem {
        std::string bind;
        std::string type;
        std::string label;
        float x = 0;
        float y = 0;
        std::string tab;
        std::string container; // Era 7.2: Canonical container ID
        std::string group;     // Legacy Era 7.1
        std::string component;
        std::string variant;
        std::vector<Attachment> attachments;
    };

    /**
     * @brief Contenedor arquitectónico declarativo (Era 7.2).
     */
    struct LayoutContainer {
        std::string id;
        std::string label;
        float x = 0;
        float y = 0;
        std::string width;  // 'full', '1/2', '3/4', etc. o valor en px
        float height = 0;
        std::string variant;
        std::string tab;    // Era 7.2: Architectural Plane (Tab ID)
        int zIndex = 0;
        std::string labelPosition; // "top", "bottom", "inside-top", "inside-bottom"
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

        // Engine Compatibility (Era 6.3)
        bool front = true;
        bool back = true;
    };

    /**
     * @brief Información extendida de un componente ACE (Era 7 Industrial).
     */
    struct ComponentInfo {
        std::string id;
        std::string name;
        std::string description;
        std::string family;   
        std::string engine;   
        int version = 7;
        
        // Logical Registry
        std::vector<ParameterDef> parameters;
        std::vector<Modulation::PortDescriptor> ports;
        std::map<std::string, float> defaultParams; 

        // Engine Registry (Legacy Compatibility)
        std::string modelId;
        uint32_t implementationId = 0;
        
        // Era 7 UI Block
        std::string uiSkin;
        float uiWidth = 0;
        float uiHeight = 0;
        std::vector<UIItem> uiControls;
        std::vector<UIItem> uiJacks;
        std::vector<LayoutContainer> uiContainers; // Era 7.2
        int gridSnap = 5;                           // Era 7.2
        std::string manifestHash;                   // Era 7.2.3: SHA-256 Firmware Integrity

        // Extended Identity
        std::vector<std::string> tags;
        int hp = 0;
        std::string rack;
        std::string registryRole; // ERA 4 Governance
        std::string vendorId;     // ERA 4 Governance

        // Extra Resource Support (Era 7.1)
        std::string sourcePath;
        bool isPackaged = false;
        bool isCompliant = false;
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

        juce::var generateSchema() const;
        /**
         * @brief Genera un JSON con el contrato técnico de un componente específico.
         */
        juce::var exportComponentContract(const std::string& id) const;

        /**
         * @brief Exporta todos los contratos del catálogo a archivos .contract.json en el directorio especificado.
         */
        void exportAllContracts(const juce::File& outputDir) const;

        bool loadFromDirectory(const juce::File& directory);
        bool loadFromModulesDirectory(const juce::File& modulesDir);
        bool loadFromAcePack(const juce::File& acePackFile);

        /**
         * @brief Obtiene un stream de lectura para un recurso (imagen, skin, etc.) 
         * contenido dentro del paquete o directorio del componente.
         */
        std::unique_ptr<juce::InputStream> getResourceStream(const std::string& componentId, const std::string& resourcePath) const;

    private:
        bool loadFromArchive(juce::InputStream& archiveStream, const juce::String& sourceName, const juce::String& fullSourcePath);
        static UIItem parseEntryNode(const YAML::Node& entryNode, ComponentInfo& info);
        bool parseContractJson(const std::string& json, ComponentInfo& info);

        std::map<std::string, ComponentInfo> mComponents;
        std::map<std::string, std::string> mFallbacks;
    };

} // namespace Ace
} // namespace Core
} // namespace Omega
