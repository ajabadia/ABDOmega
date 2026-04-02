# OMEGA Synthesizer Project

OMEGA is a state-of-the-art hybrid synthesizer platform designed by **ABD-IA**. It combines high-performance C++ DSP engines with a premium Web-based UI.

## 🚀 Overview
The project follow a "Modular-without-Cables" architecture, focusing on expressivity and ease of use through a standardized **Pack Macro** system.

### Tech Stack
- **Agnostic Core**: C++ Standard Library, `yaml-cpp`, `std::filesystem`.
- **DSP/Plugin Layer**: JUCE Framework (v8 compatible).
- **Architecture**: Decoupled, Protocol-agnostic (**MIDI 1.0 / 2.0 UMP ready**).
- **Diagnostics**: Standardized **Smart Focus** (Universal Context-Aware Analysis).

## 📂 Repository Structure
- `/SOURCE/DSP`: Core DSP algorithms (VA, Physical Models).
- `/SOURCE/Core`: Agnostic library (Ace, Modulation, Input Buffers).
- `/SOURCE/Plugin`: JUCE Processor and Bridge/Adapter layers.
- `/SOURCE/Core/Service`: High-level facades (`EngineConfigManager`, `PresetService`).

## 🏗️ Architecture: The Service Layer Pattern
OMEGA has transitioned to a **Service-Oriented Architecture** to ensure long-term maintainability and JUCE-decoupling:

- **EngineConfigManager**: The architectural bridge that translates high-level parameters and `OmegaPreset` ValueTrees into low-level DSP execution.
- **PresetService**: A dedicated lifecycle manager for loading, saving, and versioning sounds, keeping file I/O out of the audio thread.
- **Real-Time Safety**: Core components (`OmegaInput`, `ModulationRuntime`) are strictly allocation-free and lock-free, guaranteed by our `PerformanceMonitor` instrumentation.
- **Universal Metadata**: A single source of truth in C++ serves ranges, units, and UI labels via JSON-RPC, ensuring 100% synchronization with the WebUI.

## 🛠 Active Features
- **VA/ACE MVP 0.1: Flagship Synthesis**:
    - **Atomic Snapshot Engine**: Real-time safe, lock-free preset switching via `EngineConfig` atomic swaps. High-resolution parameter reconciliation between the Service Layer and DSP core.
    - **Triple Flagship Presets**: Curated high-fidelity sounds including **Juno 106 Pad** (pure Roland chain), **MS-20 Aggressive Bass** (Korg-35 chain), and **Hybrid MS20-JP Pad** (multi-layer branding).
    - **ACE Catalog Expansion**: Integrated `OSC-VA-002` (Korg MS-20 VCO) with 100% `ValueTree`-based validation and automatic repair logic.
- **Agnostic Input Layer**: `OmegaInput` system provides a neutral event buffer, decoupling DSP from MIDI protocols.
- **Juno High-Fidelity**: Emulación de hardware con cuantización de timer Intel 8253 (8MHz), modelo de drift analógico de 3 niveles y chorus BBD.
- **Korg Prophecy & Z1 (MOSS)**: Modelos físicos de cuerda, metales, caña, VPM, **EP (Electric Piano)** e **Drawbar Organ**.
- **Roland JP-8080 Elite Suite**: Osciladores **Feedback** y **Supersaw**, **Cross-Modulation**, **JP-Formant Filter** y **Motion Control**.
- **Space Echo (RE-201)**: Emulación multi-cabezal con saturación de cinta magnética y reverb de muelles integrada en el rack modular.
- **Smart Focus Diagnostic**: Sistema universal de iconos de enfoque ("Eye") para ruteo instantáneo al osciloscopio desde cualquier módulo.
- **MIDI 2.0 Hybrid Input**: Soporte nativo para UMP en JUCE 8 con auto-detección de formato y procesamiento de alta resolución (16-bit velocity).
- **Modular Envelopes (Case 401)**: Dynamic, sample-accurate ADSR state management integrated into the voice signal path.
- **Modulation Matrix 2.0**:
    - **32-Slot Routing Grid**: High-fidelity modulation matrix with bipolar depth control and secondary "Via" modulation path.
    - **Live Graph Compiler**: Automated translation of matrix slots into low-level, lock-free DSP routes on preset load.
    - **Dynamic Metadata**: RPC-driven source/target resolution, keeping the UI in perfect sync with engine capabilities.
- **Build System**: Stabilized via `build_auto.bat` (CMake/Ninja) with automatic build tracking (**Build #142**).

---
*Built by ABD-IA*
