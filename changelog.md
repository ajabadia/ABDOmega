# 📝 OMEGA Changelog

Este archivo registra todos los cambios significativos, mejoras y correcciones del sintetizador OMEGA.
 
## [1.6.1] - 2026-03-27
### Fixed
- **ValueTree Serialization**: Resolved `std::string` type mismatches in `OmegaPreset` and implemented robust `juce::var` wrapping.
- **Linker Stability**: Fixed unresolved external symbols in `OmegaPreset` (`addLayer`) and `PresetRepository` (`getPresetPath`).
- **DSP Core Synchronization**: Corrected `VirtualAnalogEngine` inheritance from `ISynthesisEngine` and synchronized `renderNextBlock` signatures.
- **Bridge Reliability**: Fixed obsolete member access in `OmegaUiBridge` (migrated `id` to `getUuid()`).

### Improved
- **Configuration Engine**: Centralized `EngineConfig` and `VoiceConfig` structures to prevent redefinition errors and ensure atomic swap safety.
- **Header Integrity**: Standardized includes and guards across `omega_core` and `omega_dsp`.

## [1.6.0] - 2026-03-26
### Added
- **VA/ACE MVP 0.1 Milestone**:
    - **Atomic Snapshot Engine**: Implementation of `EngineConfig` and atomic swap mechanism for sample-accurate, lock-free preset switching.
    - **Flagship Presets**: Created `Juno_Pad.yaml`, `MS20_Bass.yaml`, and `Hybrid_Pad.yaml` using high-fidelity ACE components.
    - **Korg MS-20 Fidelity**: Added `OSC-VA-002` (VCO) to the ACE catalog.
- **Unified Validation Layer**:
    - `AceValidator` fully migrated to `juce::ValueTree` API for robust preset repair and fallback handling.

### Improved
- **Architectural Decoupling**: Segregated `EngineTypes.h` and `EngineConfig.h` to eliminate circular dependencies between the service and DSP layers.

## [1.5.0] - 2026-03-26
### Added
- **PerformanceMonitor Utility**: Lightweight, lock-free profiling for the audio thread using atomics and high-resolution ticks.
- **Service Layer Specification**: New official documentation in `DOCUMENTACION/OFICIAL/service_layer_spec.md`.
- **Instrumentation**: Benchmarking hooks in `VirtualAnalogEngine` and `ModulationRuntime` for real-time latency tracking.

### Improved
- **Architectural Decoupling (2-Week Surgical Plan)**:
    - **EngineConfigManager**: Centralized engine configuration and parameter mapping facade.
    - **PresetService**: Orchestrated preset lifecycle management, separating file I/O from the synthesis core.
    - **OmegaAudioProcessor Refactor**: Reduced plugin wrapper complexity by ~40% through service delegation.
- **Real-Time Safety & Performance**:
    - **Lock-Free Input**: `OmegaInput` now uses fixed-size event buffers, eliminating heap allocations in the process block.
    - **ValueTree Serialization**: `OmegaUiBridge` refactored to use the new `ValueTree`-based `OmegaPreset` API, ensuring consistent state across the stack.

## [1.4.1] - 2026-03-26

## [1.4.0] - 2026-03-24
### Added
- **Dual-Rack Modular Architecture (Phase 8)**:
    - Rediseño de la WebUI a un sistema de doble rack (Superior: utilidades, Inferior: síntesis).
    - Módulos auto-inyectables con estética estandarizada y acentos neón.
    - Área de trabajo expandida a **1600x750px** para visualización multimodular sin scroll.
- **MIDI Trigger Module (Phase 9)**:
    - Nuevo componente interactivo para disparo de notas MIDI desde la UI (Nota/Octava/Push).
    - Implementada cola MIDI thread-safe en el motor DSP para inyección síncrona en el `processBlock`.
- **Generic Modulation Telemetry**:
    - Implementación de `ModuleOscilloscope` basado en Canvas con soporte para polling dinámico vía RPC.
    - Soporte para visualización en tiempo real de LFOs y señales de control internas.

## [1.3.0] - 2026-03-24
### Added
- **Universal Metadata Architecture (Phase 6)**:
    - Implementación de `ParameterMetadataRegistry` en C++ como única fuente de verdad para descriptores de parámetros.
    - Nuevo handler RPC `getMetadata` para servir rangos, unidades y nombres dinámicamente a la WebUI.
    - Refactor de `OmegaAudioProcessor` y `Midi1InputAdapter` para consumir el registro centralizado.
- **Dynamic WebUI Configuration**:
    - Los módulos `ModuleJuno`, `ModuleJP`, `ModuleKorg` y `ModuleSpaceEcho` ahora son auto-configurables.
    - Inyección automática de límites (`min`, `max`, `step`) y etiquetas desde los metadatos del motor.
- **System Stability (Build #33)**:
    - Unificación de namespaces a `Omega`.
    - Resolución de conflictos en el bridge relacionados con `juce::Identifier` y `std::string`.
    - Garantizada la seguridad lock-free en el acceso a metadatos durante el processBlock.

## [1.2.1] - 2026-03-24
### Added
- **Visual Diagnostic Console**:
    - Primera línea de consola con **Build #** y **Timestamp** real del ejecutable.
    - Mapeo visual de **Bridge Keys** para depuración de funciones nativas expuestas.
    - Registro de **RAW Response** antes del procesamiento de JS.
- **Bridge Resilience (Mock Fallback)**:
    - Implementado sistema de **Mocks** en `omega_rpc.js` que se activa automáticamente si el puente devuelve `undefined`.
    - Garantizado que la UI de presets y estado inicial sea funcional incluso sin conexión estable con el motor.
- **RPC v2 Protocol**:
    - Implementación refinada con soporte para detección de puente y logs extendidos.

## [1.2.0] - 2026-03-24
### Added
- **JUCE 8 Bridge Modernization**:
    - Migración total de `evaluateJavascript` a **Native Functions with Completion Handlers** (Promises).
    - Eliminado el polling de callbacks; comunicación bidireccional instantánea y asíncrona.
- **Premium UI Enhancements**:
    - **Splash Screen Stabilization**: Introducida duración mínima de 3 segundos con fade-out al finalizar la sincronización del bridge.
    - **Top Menu Bar**: Estructura profesional con menús **FILE**, **EDIT** y **HELP**.
    - **About Modal**: Ventana informativa con estética "glassmorphism", créditos y metadata del sintetizador.
    - **Full Modular Rack**: El rack ahora carga por defecto el sintetizador completo (DCO, VCF, JP Filter, Korg VCF y Space Echo).
- **Git-for-Sounds (Sprint 6)**:
    - Integración de `Core::Preset::PresetRepository` en el `OmegaAudioProcessor`.
    - Sistema de versionado con **Snapshots**, **History** y **Checkout** funcional vía RPC.
    - Soporte para creación de ramas (Branching) y persistencia en formato YAML.
- **Integrated Preset Browser**:
    - Nuevo panel lateral en la WebUI para navegación de archivos de preset (`.yaml`).
    - Visualización dinámica de la línea de tiempo de versiones (History) para cada sonido.
    - Interfaz reactiva para guardar capturas (Snapshots) con autor y descripción.
- **System Stability**:
    - Handler de **Exit** robusto ejecutado en el **Message Thread** para cierre limpio de la aplicación Standalone.
    - Consola de debug conmutable (Show/Hide) integrada en el menú Help.

## [1.1.1] - 2026-03-22
### Added
- **OmegaUiBridge Refinement**:
    - Implementación completa del protocolo **JSON-RPC v1** para comunicación High-Fidelity.
    - Handlers robustos para `getState`, `setParam`, `listAceComponents`, `loadPreset` y `savePreset`.
    - Arquitectura desacoplada mediante **Callbacks** para la carga de presets en el `OmegaAudioProcessor`.
    - Sistema de notificaciones asíncronas para cambios de parámetros desde el motor DSP.
- **MS-20 ESP (External Signal Processor)**: Implementación completa con filtros Bandpass, Pitch Tracker y Envelope Follower.
- **MS-20 High-Fidelity**:
    - Envolvente **ENV1** con fases especializadas de **Delay** y **Hold**.
    - **Ring Modulation** entre VCO1 y VCO2.
    - **PWM Modulable** para el oscilador base.
- **Prophecy MOSS Part 2 (Z1 Territory)**: 
    - Modelos físicos de viento (**Brass/Reed**) refinados con no-linealidades cúbicas.
    - Nuevo oscilador **Noise + Resonant Comb** (`OSC-PM-009`) para texturas industriales.
    - Modelado físico de **Electric Piano** (`OSC-EP-001`) y **Organ** (`OSC-OR-001`).
    - **Multi-table Waveshapers** y **Variable Phase Modulation (VPM)**.
    - **Resonant Filter Bank** de 6 picos y **Envolventes Multi-etapa** de 5 niveles.
    - **Arpeggiador Prophecy** programable y **LFOs especializados** (Random Smooth/Step).
- **JP-8080 Elite Suite**:
    - **Feedback Oscillator** (`OSC-PM-010`): Sierra con realimentación de fase controlada por peine.
    - **Cross-Modulation (X-MOD)**: Ruteo de audio-rate entre osciladores para FM exponencial.
    - **JP-Formant Filter**: Modulador vocal basado en el banco de filtros del JP-8080.
    - **Motion Control**: Sistema de grabación y reproducción de gestos de parámetros a audio-rate.
- **Expression & Mapping**: Integración de **Vector Control** (X/Y) y **Ribbon** en el sistema de macros `ProphecyMacroContext`.
- **Space Echo RE-201 (FX-DL-002)**: Emulación de alta fidelidad con 3 cabezales de cinta (ratios 1.0 : 1.9 : 2.9), saturación magnética y spring reverb tank.

## [1.1.0] - 2026-03-20
### Improved
- **OmegaInput Layer**: Capa neutra de entrada MIDI separada del core de síntesis.
- **Build System**: Estabilización con NMake y aislamiento de dependencias v143.
- **Decoupling**: Reducción de la dependencia de JUCE en `omega_core`.

## [1.0.0] - 2026-03-18
### Added
- **Juno Engine**: Implementación fiel de DCO (con drift y timer jitter) y filtro IR3109.
- **JP-808X Family**: Supersaw optimizada y filtro JP.
- **Modulation Graph**: Sistema de ruteo de audio-rate basado en grafos (Toposort).
- **ACE Registry**: Catálogo modular de componentes emulados.
- **OmegaPreset**: Sistema de serialización YAML robusto.

---
*Mantenido automáticamente por el `documentation-manager` skill.*
