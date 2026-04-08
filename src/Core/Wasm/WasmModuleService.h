#pragma once

#include <string>
#include <vector>
#include <memory>
#include <unordered_map>
#include "wasm_export.h"

namespace Omega {
namespace Core {
namespace Wasm {

    /**
     * @brief Singleton service for the WAMR (WebAssembly Micro Runtime).
     */
    class WasmModuleService {
    public:
        static WasmModuleService& getInstance();

        /**
         * @brief Loads a .wasm or .aot module from disk.
         */
        bool loadModule(const std::string& manifestId, const std::string& path);

        /**
         * @brief Executes the process function of a module instance.
         */
        void process(int voiceIdx, int unitId, float* buffer, int length);

    private:
        WasmModuleService();
        ~WasmModuleService();

        // Prevent copying
        WasmModuleService(const WasmModuleService&) = delete;
        WasmModuleService& operator=(const WasmModuleService&) = delete;

        // WAMR handles
        wasm_module_t m_module = nullptr;
        wasm_module_inst_t m_instances[32]; // Max 32 voices
        wasm_exec_env_t m_execEnvs[32];

        // Memory limits (VA 2.1.W Config)
        static constexpr uint32_t kStackSize = 128 * 1024; // 128KB as requested
        static constexpr uint32_t kHeapSize = 64 * 1024;
    };

} // namespace Wasm
} // namespace Core
} // namespace Omega
