#pragma once

#include "../Model/PatchDocument.h"
#include "../Model/RuntimeSnapshot.h"
#include "../Ace/AceCatalog.h"

namespace Omega {
namespace Core {
namespace Compiler {

    /**
     * @brief El orquestador de compilación de la Era 7.
     * Transforma un PatchDocument (Intención) en un RuntimeSnapshot (Realidad DSP).
     */
    class RuntimeCompiler {
    public:
        /**
         * @brief Compila un documento completo a un snapshot de ejecución.
         * Realiza validación de tipos, ordenación topológica y resolución de rutas.
         */
        static ::Omega::Core::Model::RuntimeSnapshot compile(
            const ::Omega::Core::Model::PatchDocument& doc,
            const ::Omega::Core::Ace::AceCatalog& catalog);

    private:
        /**
         * @brief Resuelve la ID de implementación DSP para un tipo de módulo.
         */
        static uint32_t resolveImplementationId(::Omega::Core::Model::ModuleTypeId typeId);

        /**
         * @brief Genera el orden de ejecución para evitar latencia de un bloque en las conexiones.
         */
        static void sortExecutionOrder(::Omega::Core::Voice::CompiledVoicePlan& plan);
    };

} // namespace Compiler
} // namespace Core
} // namespace Omega
