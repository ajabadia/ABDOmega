# OMEGA Synthesizer Project

OMEGA is a state-of-the-art hybrid synthesizer platform designed by **ABD-IA**. It combines high-performance C++ DSP engines with a premium Web-based UI.

## 🚀 Overview
The project follow a "Modular-without-Cables" architecture, focusing on expressivity and ease of use through a standardized **Pack Macro** system.

### Tech Stack
- **Agnostic Core**: C++ Standard Library, `yaml-cpp`, `std::filesystem`.
- **DSP/Plugin Layer**: JUCE Framework (v8 compatible).
- **Architecture**: Decoupled, Protocol-agnostic (MIDI 1.0/2.0/MPE ready).

## 📂 Repository Structure
- `/SOURCE/DSP`: Core DSP algorithms (VA, Physical Models).
- `/SOURCE/Core`: Agnostic library (Ace, Modulation, Input Buffers).
- `/SOURCE/Plugin`: JUCE Processor and Bridge/Adapter layers.

## 🛠 Active Features
- **Agnostic Input Layer**: `OmegaInput` system provides a neutral event buffer, decoupling DSP from MIDI protocols.
- **ACE Core**: Dynamic component architecture (Catalog & Validator) fully integrated.
- **Juno High-Fidelity**: Emulación de hardware con cuantización de timer Intel 8253 (8MHz), modelo de drift analógico de 3 niveles y chorus BBD.
- **Modulation System**: Sample-accurate graph processing (Graph-to-Runtime) implemented.
- **Korg Prophecy & Z1 (MOSS)**: Modelos físicos de cuerda, metales, caña, VPM, **EP (Electric Piano)** y **Drawbar Organ**. Sistema de macros **Energy, Movement, Air y Expressivity** con Arpeggiador programable y LFOs de alta resolución.
- **Roland JP-8080 Elite**: Osciladores **Feedback** y **Supersaw**, **Cross-Modulation**, **JP-Formant Filter** y sistema de **Motion Control** integrado.
- **Korg MS-20**: Filtro Korg35 LP/HP, **External Signal Processor (ESP)** con seguimiento de pitch/env y envolvente **ENV1** con Delay/Hold.
- **Space Echo (RE-201)**: Emulación multi-cabezal con saturación de cinta magnética y reverb de muelles integrada en el rack modular.
- **OmegaUiBridge (JUCE 8 Native)**: Sistema de comunicación de alta fidelidad basado en **JSON-RPC v1** aprovechando las **promesas nativas** de JUCE 8. Ofrece sincronización bidireccional instantánea y asíncrona entre el motor C++ y la WebUI.
- **Modular WebUI**: Interfaz premium con rack dinámico (DCO, VCF, JP/KORG, FX), barra de navegación profesional, splash screen inteligente de 3 segundos y consola de depuración integrada.
- **Build System**: Estabilización mediante `build_auto.bat` (CMake/Ninja) con tracking automático de builds y despliegue del ejecutable Standalone.

---
*Built by ABD-IA*
