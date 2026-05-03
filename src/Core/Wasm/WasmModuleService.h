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
         * @brief Extrae el contrato JSON de un módulo sin cargarlo permanentemente en el motor.
         */
        std::string getModuleContract(const std::string& path);

        /**
         * @brief Executes the process function of a module instance.
         */
        void process(int voiceIdx, int unitId, float* buffer, int length);

        /**
         * @brief Dispatches a MIDI event to a module instance.
         */
        void dispatchMidi(int voiceIdx, uint8_t status, uint8_t d1, uint8_t d2);

        /**
         * @brief Updates environment metadata for WASM modules.
         */
        void setEnvironment(double sampleRate, int blockSize, int midiProtocol);
        
        /**
         * @brief Binds global system buffers for WASM host imports.
         */
        void bindSystemBuffers(float* outL, float* outR, float* inL = nullptr, float* inR = nullptr) {
            m_mainL = outL;
            m_mainR = outR;
            m_inL = inL;
            m_inR = inR;
        }

        /**
         * @brief Binds a specific voice state for host import mapping.
         */
        void bindVoiceState(int voiceIdx, void* state) {
            if (voiceIdx >= 0 && voiceIdx < 32) m_voiceStates[voiceIdx] = state;
        }

        void* getVoiceState(int voiceIdx) const {
            return (voiceIdx >= 0 && voiceIdx < 32) ? m_voiceStates[voiceIdx] : nullptr;
        }

        int findVoiceIdxByInst(wasm_module_inst_t inst) const {
            for (int i = 0; i < 32; ++i) if (m_instances[i] == inst) return i;
            return -1;
        }

        double getSampleRate() const { return m_sampleRate; }
        int getBlockSize() const { return m_blockSize; }
        int getMidiProtocol() const { return m_midiProtocol; }
        float* getMainL() const { return m_mainL; }
        float* getMainR() const { return m_mainR; }
        float* getInL() const { return m_inL; }
        float* getInR() const { return m_inR; }

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
        void* m_voiceStates[32];

        // Memory limits (VA 2.1.W Config)
        static constexpr uint32_t kStackSize = 128 * 1024; // 128KB as requested
        static constexpr uint32_t kHeapSize = 64 * 1024;

        double m_sampleRate = 44100.0;
        int m_blockSize = 256;
        int m_midiProtocol = 1;

        float* m_mainL = nullptr;
        float* m_mainR = nullptr;
        float* m_inL = nullptr;
        float* m_inR = nullptr;
    };

} // namespace Wasm
} // namespace Core
} // namespace Omega
