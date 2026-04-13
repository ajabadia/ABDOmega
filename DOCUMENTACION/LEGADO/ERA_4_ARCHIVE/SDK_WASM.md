# [OBSOLETO - REFERENCIA HISTÓRICA]
# OMEGA-WASM SDK Specification (v1.0.0)

This document defines the interface for developing OMEGA-compatible modules using **WebAssembly (WASM)**. 

---

## 🏗 Modular Architecture (VA 2.1.W)

In OMEGA, a WASM module is a "Guest" that runs inside the "Host" (OMEGA Engine). The host provides audio/CV buses and MIDI buffers, and the guest processes them.

### 🔌 Port Typing
Modules must declare their ports in their ACE Manifest (YAML).
- **Audio**: 32-bit float buffers (1 block = 32..256 samples).
- **CV**: Continuous control voltage (smoothed).
- **Gate**: Binary signal (0.0 or 1.0).
- **MIDI**: Byte-stream buffers (3-byte packets).

---

## 🛠 Guest Exports (Functions the Module provides)

| Function | Signature | Description |
| :--- | :--- | :--- |
| `omega_init` | `void()` | Called once when the module is instantiated. |
| `omega_process` | `void(int frames)` | The main DSP loop. Processes a block of samples. |
| `omega_on_midi` | `void(int byte1, int byte2, int byte3)` | Called when a MIDI message reaches the module. |
| `omega_on_param` | `void(int id, float value)` | Called when a UI parameter changes. |

---

## 📡 Host Imports (Functions OMEGA provides)

| Function | Signature | Description |
| :--- | :--- | :--- |
| `get_bus_ptr` | `float*(int bus_id)` | Returns memory address for a specific 16-bus slot. |
| `publish_telemetry` | `void(float val)` | Envía una señal al pin `activity` del módulo para feedback visual (LED). |
| `send_midi` | `void(int b1, int b2, int b3)` | Envía un mensaje MIDI al puerto `midi_data` del módulo. |

---

## 🚌 The 16-Bus Protocol

Each voice instance carries 16 buses. 
- **Read Access**: Modules can read from any bus targeted by a `CONNECTION` in the preset.
- **Write Access**: Each module is assigned a "Master Output Bus" (usually `nodeIndex % 16`).

---

## 🕒 Dynamic Timebase (Sample Rate)
**IMPORTANTE**: OMEGA es un sistema agnóstico a la frecuencia de muestreo.
- **PROHIBICIÓN**: No uses constantes como `44100` o `48000` en tus cálculos de filtros o envolventes.
- **RECOMENDACIÓN**: Captura el sample rate del Host. OMEGA lo proporciona como parámetro en el `omega_init` o mediante un parámetro de sistema dedicado. 

---

## 🎨 Identidad Visual (Código de Colores)
Al definir puertos en tu `manifest.yaml`, usa el color correspondiente al tipo de dato:

| Color | Aplicación |
| :--- | :--- |
| **Azul** | Audio / CV / DSP |
| **Amarillo** | MIDI / UMP |
| **Verde** | Listas / Selección |
| **Cian** | Parámetros GUI (perillas) |
| **Rojo** | Texto / Etiquetas |
| **Negro** | Boolean / Lógica |

---

- Use `panelClass` for custom CSS styling.

## 👁️ Control de Visibilidad (ACE Manifest)
Puedes controlar dónde aparece cada parámetro usando el campo opcional `visibility` dentro de la lista de `parameters`:

```yaml
parameters:
  - id: "mode"
    semantic: "list"
    visibility: ["back"]     # Solo en Configuration Tier (Default)
  - id: "filter_cutoff"
    semantic: "knob"
    visibility: ["front"]    # Solo en Performance Tier
  - id: "global_chan"
    semantic: "list"
    visibility: ["both"]     # Visible en ambos sitios
```

> [!NOTE]  
> **Semantic Bridge**: Si no se especifica `visibility`, OMEGA aplicará **Smart Visibility**: las listas e índices (`list`, `number`) irán a la pestaña **General** (Back) y las perillas al frontal (Rack) por defecto. Los puertos de configuración promovidos serán filtrados automáticamente de la pestaña de Patching.

---
> [!TIP]
> Use **Extism** or **WAMR** for the smallest footprint and fastest DSP performance. Keep your Wasm memory under 1MB per instance if possible.
