#include "WasmHostInterface.h"
#include "WasmModuleService.h"
#include "../../Engine/Voice/VoiceState.h"
#include "../../UI/RpcTelemetryController.h"

namespace {
    /**
     * @brief Host Import: get_bus_ptr
     * Returns a pointer to a specific bus in the current voice.
     */
    void* omega_get_bus_ptr(wasm_exec_env_t exec_env, int busIdx) {
        wasm_module_inst_t inst = wasm_runtime_get_module_inst(exec_env);
        // In OMEGA, we associate the instance with a VoiceState.
        // For now, we'll map the global bus pool.
        return nullptr; // Placeholder for real mapping
    }

    /**
     * @brief Host Import: publish_telemetry
     * [Era 4.1] Aseptic implementation.
     */
    void omega_publish_telemetry(wasm_exec_env_t exec_env, float val) {
        using namespace Omega::Core::Providers;
        
        // In OMEGA, we currently use a global ID for the active WASM block.
        // TODO: Map to specific instance ID in VA 2.2.
        std::string instanceId = "wasm_module"; 
        
        auto& registry = ModulationTelemetryRegistry::getInstance();
        auto& hub = ModulationTelemetryHub::getInstance();
        
        int slot = registry.registerPin(instanceId, "activity", TelemetryType::Discrete, "Activity");
        hub.pushSignal(slot, val);
    }

    /**
     * @brief Host Import: set_voice_freq
     */
    void omega_set_voice_freq(wasm_exec_env_t exec_env, float hz) {
        // TODO: Mapear a la instancia de VoiceState adecuada
    }

    /**
     * @brief Host Import: set_voice_gate
     */
    void omega_set_voice_gate(wasm_exec_env_t exec_env, float gate) {
        // TODO: Mapear a la instancia de VoiceState adecuada
    }

    /**
     * @brief Host Import: set_voice_vel
     */
    void omega_set_voice_vel(wasm_exec_env_t exec_env, float vel) {
        // TODO: Mapear a la instancia de VoiceState adecuada
    }

    /**
     * @brief Host Import: set_voice_at (Aftertouch)
     */
    void omega_set_voice_at(wasm_exec_env_t exec_env, float pressure) {
        // TODO: Mapear a la instancia de VoiceState adecuada
    }

    static NativeSymbol g_omega_native_symbols[] = {
        { "omega_get_bus_ptr", (void*)omega_get_bus_ptr, "(i)i", nullptr },
        { "omega_publish_telemetry", (void*)omega_publish_telemetry, "(f)", nullptr },
        { "omega_set_voice_freq", (void*)omega_set_voice_freq, "(f)", nullptr },
        { "omega_set_voice_gate", (void*)omega_set_voice_gate, "(f)", nullptr },
        { "omega_set_voice_vel", (void*)omega_set_voice_vel, "(f)", nullptr },
        { "omega_set_voice_at", (void*)omega_set_voice_at, "(f)", nullptr }
    };
}

extern "C" void omega_wasm_register_host_symbols() {
    wasm_runtime_register_natives("env", 
                                 g_omega_native_symbols, 
                                 sizeof(g_omega_native_symbols) / sizeof(NativeSymbol));
}

namespace Omega {
namespace Core {
namespace Wasm {

} // namespace Wasm
} // namespace Core
} // namespace Omega
