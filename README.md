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
- **Korg Prophecy (MOSS)**: Modelos físicos de cuerda, metales, caña, VPM y **Bowed String**. Sistema de macros **Energy, Movement, Air y Expressivity**.
- **Korg MS-20**: Filtro Korg35 LP/HP, **External Signal Processor (ESP)** con seguimiento de pitch/env y envolvente **ENV1** con Delay/Hold.
- **Space Echo (RE-201)**: Emulación multi-cabezal (3 heads) con saturación de cinta magnética, Wow & Flutter avanzado y tanque de reverb de muelles (3 springs).
- **Build System**: Stabilized environment isolation (NMake/v143) for reliable cross-IDE development.

---
*Built by ABD-IA*
