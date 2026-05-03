#pragma once

#include <vector>
#include <string>
#include <optional>
#include "PatchIdentifiers.h"

namespace Omega {
namespace Core {
namespace Model {

    /**
     * @brief Valor de un parámetro individual.
     */
    struct ParamValue {
        ParamId id;
        float value;
        uint32_t modulationBindingId { 0 }; // 0 = Sin modulación externa
    };

    /**
     * @brief Instancia de un módulo en el rack.
     */
    struct ModuleInstance {
        uint32_t instanceId;
        ModuleTypeId typeId;
        
        struct RackPosition {
            int16_t rack { 0 };
            int16_t slot { 0 };
            int16_t order { 0 };
        } position;

        std::vector<ParamValue> parameters;
        
        struct Flags {
            bool bypassed { false };
            bool muted { false };
            bool soloed { false };
        } flags;
    };

    /**
     * @brief Conexión entre dos puertos de módulos.
     */
    struct PatchConnection {
        uint32_t sourceModuleId;
        uint16_t sourcePortId;
        uint32_t targetModuleId;
        uint16_t targetPortId;
        ConnectionType type;
    };

    /**
     * @brief Metadatos del patch (Serialización y UI).
     */
    struct PatchMetadata {
        std::string uuid;
        std::string name;
        std::string author;
        uint64_t createdAt { 0 };
        uint64_t modifiedAt { 0 };
        std::vector<std::string> tags;
    };

    /**
     * @brief La Fuente de Verdad Única (SOT) de la Era 7.
     */
    struct PatchDocument {
        PatchMetadata metadata;
        
        // Global Settings
        float masterGainDb { 0.0f };
        int16_t globalTranspose { 0 };
        int16_t globalMidiChannel { 0 }; // 0 = Omni
        
        // El grafo de síntesis
        std::vector<ModuleInstance> modules;
        std::vector<PatchConnection> connections;
        
        // FX Globales tratados como módulos especiales o parámetros directos
        std::vector<ParamValue> globalFxParams;

        /**
         * @brief Busca un módulo por su ID de instancia.
         */
        const ModuleInstance* findModule(uint32_t instanceId) const {
            for (const auto& m : modules) {
                if (m.instanceId == instanceId) return &m;
            }
            return nullptr;
        }
    };

} // namespace Model
} // namespace Core
} // namespace Omega
