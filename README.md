# OMEGA Synthesizer: Hyper-ACE Edition

OMEGA is a state-of-the-art hybrid synthesizer platform designed by **ABD-IA**. It combines high-performance C++ DSP engines with a premium Web-based UI.

## 🚀 Overview
The project follows a **Hyper-ACE (Aseptic Component Engine)** architecture, focusing on dynamic modularity, visual expressivity, and systemic consistency.

### Tech Stack
- **Agnostic Core**: C++20, `yaml-cpp`, `std::filesystem`.
- **DSP/Plugin Layer**: JUCE Framework (v8 compatible).
- **Frontend**: High-fidelity WebUI (manifest-driven rendering).
- **Communication**: JSON-RPC over Webview2 Bridge.

## 🏗️ Architecture: OMEGA Hyper-ACE (Phase 24)
OMEGA has transitioned to a fully **Dynamic, Manifesto-Driven Architecture**. No module or parameter is hardcoded; the system operates on the **ACE-Spec 1.0**:

- **Aseptic Identity**: Every module, parameter, and port uses a unique technical ID (e.g., `osc.1.detune`). This ensures persistent connections even during refactorings.
- **Dynamic Discovery**: The engine scans `Resources/ace/` for YAML manifests. The `AceCatalog` (Header-only) maps these to the live engine.
- **Patchbay-Matrix**: A centralized, high-fidelity routing hub that replaces the old modulation matrix. It supports dynamic slot counts and bipolar depth.
- **UI Governance**: Layouts (`uiLayout`) and styles (`style`) are defined in YAML manifests, allowing the rack to render new modules without C++ recompilation.
- **Aseptic Paths**: Unified resource resolution via `Environment::getResourcesDir()`.

## 📂 Repository Structure
- `/src/DSP`: Core DSP algorithms (VA, Physical Models).
- `/src/Core`: Agnostic library (Ace, Modulation, Patchbay).
- `/src/Plugin`: JUCE Processor and Bridge/Adapter layers.
- `/Resources/ace`: YAML manifests for all active components.

## 🛠 Active Features
- **Hyper-ACE Engine**:
    - **Dynamic Rendering**: Automatic rack generation from YAML metadata.
    - **Aseptic Hub**: Centralized parameter and ruteo management.
- **Flagship Synthesis Layer**:
    - **Juno High-Fidelity**: 8MHz timer quantization, 3-level analog drift, and BBD chorus.
    - **JP-8080 Elite**: Supersaw, Feedback oscillators, and JP-Formant filters.
    - **MS-20 Aggressive**: Korg-35 filter modeling and nonlinear saturation.
- **Patchbay-Matrix**:
    - **Dynamic Slots**: User-configurable routing grid (Edit > Preferences > Engine).
    - **Aseptic Mapping**: 100% ID-based resolution for sources and targets.
- **Smart Focus Diagnostic**: Universal "Eye" icons for instant oscilloscope routing.
- **Build System**: Stabilized via `build_auto.bat` (CMake/Ninja) with automatic build tracking.

---
*Built by ABD-IA*
