#include "WasmModuleService.h"
#include <fstream>
#include <iostream>

extern "C" void omega_wasm_register_host_symbols();

namespace Omega {
namespace Core {
namespace Wasm {

    WasmModuleService& WasmModuleService::getInstance() {
        static WasmModuleService instance;
        return instance;
    }

    WasmModuleService::WasmModuleService() {
        // Initialize WAMR Runtime
        RuntimeInitArgs init_args;
        memset(&init_args, 0, sizeof(RuntimeInitArgs));

        init_args.mem_alloc_type = Alloc_With_System_Allocator;
        
        if (!wasm_runtime_full_init(&init_args)) {
            std::cerr << "[WASM] Failed to initialize WAMR runtime." << std::endl;
        }

        // Register OMEGA Host Symbols (ABI)
        ::omega_wasm_register_host_symbols();
    }

    WasmModuleService::~WasmModuleService() {
        wasm_runtime_destroy();
    }

    bool WasmModuleService::loadModule(const std::string& manifestId, const std::string& path) {
        std::ifstream file(path, std::ios::binary | std::ios::ate);
        if (!file.is_open()) return false;

        std::streamsize size = file.tellg();
        file.seekg(0, std::ios::beg);

        std::vector<uint8_t> buffer(size);
        if (!file.read((char*)buffer.data(), size)) return false;

        char error_buf[128];
        m_module = wasm_runtime_load(buffer.data(), (uint32_t)size, error_buf, sizeof(error_buf));

        if (!m_module) {
            std::cerr << "[WASM] Load error: " << error_buf << std::endl;
            return false;
        }

        // Standard Instantiation for 32 voices
        for (int i = 0; i < 32; ++i) {
            m_instances[i] = wasm_runtime_instantiate(m_module, kStackSize, kHeapSize, error_buf, sizeof(error_buf));
            if (!m_instances[i]) {
                std::cerr << "[WASM] Instantiation error [" << i << "]: " << error_buf << std::endl;
            } else {
                m_execEnvs[i] = wasm_runtime_create_exec_env(m_instances[i], kStackSize);
            }
        }

        return true;
    }

    void WasmModuleService::process(int voiceIdx, int unitId, float* buffer, int length) {
        if (voiceIdx < 0 || voiceIdx >= 32 || !m_instances[voiceIdx]) return;

        wasm_function_inst_t func = wasm_runtime_lookup_function(m_instances[voiceIdx], "omega_process", "(*i)f");
        if (!func) return;

        // Zero-Copy Bridge: Map host buffer to guest memory space
        uint32_t argv[2];
        argv[0] = wasm_runtime_addr_native_to_app(m_instances[voiceIdx], buffer);
        argv[1] = (uint32_t)length;

        if (!wasm_runtime_call_wasm(m_execEnvs[voiceIdx], func, 2, argv)) {
            const char* exception = wasm_runtime_get_exception(m_instances[voiceIdx]);
            if (exception) std::cerr << "[WASM] Runtime Exception: " << exception << std::endl;
        }
    }

} // namespace Wasm
} // namespace Core
} // namespace Omega
