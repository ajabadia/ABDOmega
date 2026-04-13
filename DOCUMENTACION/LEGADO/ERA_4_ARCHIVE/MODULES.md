> [!CAUTION]
> TEMA OBSOLETO (ERA 4.1). ESTE DOCUMENTO YA NO ES VÁLIDO PARA LA ERA 5.2+.

This document defines the **Social Contract of Manifests** for OMEGA Era 4.1. Every module added to the engine must provide an ACE Manifest within its atomic folder in `Resources/modules/`.

## 🧬 Port Types (v1.1)
- **AUDIO**: High-precision 32-bit float streams. (Color: **Blue**)
- **CV**: Continuous control voltage / Modulation. (Color: **Blue**)
- **GATE**: Binary trigger signals (0.0/1.0). (Color: **Black**)
- **MIDI**: Modular byte-buffers / UMP. (Color: **Yellow**)
- **LIST**: Selection indices / Options. (Color: **Green**) -> *Default: Configuration Tier*
- **FLOAT**: Continuous control / Knobs. (Color: **Cyan**) -> *Default: Performance Tier*
- **TEXT**: Label / String data. (Color: **Rojo**)

## 🏰 Arquitectura de Doble Capa (Dual-Tier)
Para mantener la ergonomía visual del rack, OMEGA implementa una separación lógica de parámetros:

### 1. Performance Tier (Front Panel)
Agrupa los controles críticos para la interpretación y el ruteo. Se definen en la sección `uiLayout` del manifiesto.
- Jacks de entrada/salida.
- Knobs y Sliders principales.
- LEDs de actividad.

### 2. Configuration Tier (Back Panel / General)
Agrupa los ajustes técnicos y calibraciones. Los parámetros se listan en esta capa basándose en la **Visibilidad Inteligente**:
- Cualquier parámetro de tipo `LIST` o `TEXT`.
- Cualquier parámetro omitido deliberadamente de la sección `uiLayout`.
- Parámetros marcados explícitamente con `visibility: ["back"]`.

---

## 🛠 Core Module Registry (WASM-Ready)

### [MIDI IN] External Bridge
- **Instance ID**: `midi_in`
- **Implementation**: Wasm-ready Bridge (#501)
- **Role**: Bridge between Hardware/DAW and the OMEGA MIDI Bus.
- **Ports**:
  | ID | Label | Type | Direction |
  | :--- | :--- | :--- | :--- |
  | `midi_data` | MIDI DATA | MIDI | Output |

### [M-CV] MIDI to CV Converter
- **Instance ID**: `midi_2_cv`
- **Implementation**: Wasm-ready DSP (#601)
- **Role**: Decodes MIDI status bytes into CV signals.
- **Ports**:
  | ID | Label | Type | Direction |
  | :--- | :--- | :--- | :--- |
  | `midi_in` | MIDI STREAM | MIDI | Input |
  | `pitch` | PITCH | CV | Output |
  | `gate` | GATE | Gate | Output |
  | `vel` | VELOCITY | CV | Output |

---

## 🚦 Contrato Social de Pins (Telemetría)
Para garantizar la coherencia visual automática, los módulos deben registrar estos pines estándar:
- `activity`: Pin discreto (Discrete) para el LED de estado. Obligatorio.
- `signal_main`: Pin de streaming para el osciloscopio.
- `cpu_load`: Pin de sistema para monitoreo de rendimiento.

---

## 🚀 OMEGA WASM SDK
Third-party developers should refer to [SDK_WASM.md](file:///d:/desarrollos/ABDOmega/DOCUMENTACION/OFICIAL/SDK_WASM.md) for binary interface specifications and host-imports.

---

## 🚦 Governance
Any new module added to OMEGA **must**:
1.  Provide an ACE Manifest in `Resources/modules/{id}/{id}.yaml`.
2.  Implement the standardized WASM-Bridge exports (init, process, on_midi).
3.  Respect the 16-Bus routing topology (Zero-Magic routing).

---
> [!IMPORTANT]
> Failure to implement a manifest and the WASM bridge will result in the module being "invisible" to the Patchbay and the Synthesis Engine.

---
---
*Last Updated: 2026-04-10 11:45 (Era 4.1.0 FINAL)*
