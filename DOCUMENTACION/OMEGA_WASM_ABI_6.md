# OMEGA WASM ABI Specification (Era 6.3)

This document defines the standard Host Imports and environment contract for OMEGA WebAssembly modules.

## 1. Environment Constants
WASM modules should use these values for processing logic:
- **Stack Size**: 128 KB
- **Heap Size**: 64 KB
- **Instruction Set**: MVP + Bulk Memory Operations

## 2. Host Imports (Namespace: "env")

### 2.1 Audio & Signal Buffers
Access global engine streams.
```cpp
// Returns a pointer to a host buffer.
// IDs: "system.audio.main_l", "system.audio.main_r", "system.audio.in_l", "system.audio.in_r"
void* omega_get_system_buffer(const char* systemId);
```

### 2.2 Voice Control
Manage the synthesis voice state.
```cpp
void omega_set_voice_freq(float hz);
void omega_set_voice_gate(float gate); // 0.0 to 1.0. (gate > 0.5 triggers NoteOn)
void omega_set_voice_vel(float velocity);
void omega_set_voice_at(float pressure); // Maps to Aftertouch (ModSignal[1])
```

### 2.3 Environment Metadata
```cpp
float omega_get_sample_rate();
int omega_get_block_size();
int omega_get_midi_protocol(); // 1 = MIDI 1.0, 2 = MIDI 2.0 (Planned)
```

### 2.4 Telemetry
```cpp
// Publishes a value to the OMEGA Telemetry Hub for the "activity" pin.
void omega_publish_telemetry(float value);
```

## 3. Required Exports

### 3.1 `omega_process`
The main audio rendering hook, called for every sample per voice.
```cpp
// buffer: Pointer to the local I/O buffer for this unit.
// length: Number of samples (usually 1 for sample-by-sample engines).
void omega_process(float* buffer, int length);
```

### 3.2 Parameter Setters (Optional)
Standardized naming for manifest-to-binary binding.
```cpp
// Each param 'id' in manifest registry maps to:
void ace_param_[id]_set(float value);
```

## 4. Manifest Integration
Modules must declare their dependencies on system buffers in the `registry` using the `system` role:

```yaml
registry:
  - id: system:audio_in
    type: audio
    roles: ["system", "input"]
    label: "Host Input"
```

---
*Standard: OMEGA-ABI-6.3-REV1*
