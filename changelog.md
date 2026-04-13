# 📝 OMEGA Changelog

Este archivo registra todos los cambios significativos, mejoras y correcciones del sintetizador OMEGA.

## [Build #421] - 2026-04-11
### OMEGA Era 5.2 - Radical Aseptic Consolidation

**Added:**
- **Control Cells Architecture**: Vertical stacking of attachments (LEDs, Displays) and main components across Rack and Modal.
- **Premium Telemetry**: High-fidelity 60Hz UI updates with filament-like LED decay effect for organic visual feedback.
- **Living YAML**: Persistence of dynamic HP scaling via `updateManifestHP` RPC call, allowing manifests to self-regulate.
- **Hybrid Displays**: Automatic context-based label/value formatting (e.g., "OMNI", "CH 01") in cell displays.

**Fixed:**
- **The Great Purge**: Removed all legacy Era 4 routing, jack fallbacks, and hardcoded logic from the UI engine.
- **Modal Sync**: Unified the visual and technical standard between the Front Rack and the Configuration Modal.
- **Hardcode Purge**: Eliminated remaining hardcoded system references in favor of the role-based YAML registry.

## [2.8.0] - 2026-04-11 (Build 420) - "Aseptic Essence Restoration"
### Added
- **OMEGA Essence Restoration (Phase 32)**:
    - **Technical Configuration Modal**: Re-implemented `isPair` logic for intelligent parameter grouping (e.g., dual-range controls).
    - **Visual Precision**: Restored signal-type badges (CV, MIDI, AUDIO) and `patch-param-row` styles in the Patching Sanctuary.
    - **Dynamic Metadata Discovery**: C++ `AceCatalog` now extracts and serves module descriptions directly from YAML manifests to the WebUI Browser.
- **Aseptic Hardcode Purge**:
    - Purged legacy `addStandardMidiSources` from `SemanticBrokerService.cpp`.
    - Modulation matrix is now 100% dynamic; `MIDI_IN` ports appear only when the module is explicitly loaded in the rack.
### Improved
- **Build System Stabilization**: Resolved WAMR linker errors (`wasm_trap_delete`) through environment sanitization and clean build orchestration.
- **UI Responsiveness**: Optimized `loadMetadata` triggers for zero-latency port updates.

## [2.7.0] - 2026-04-10 (Build 385) - "Semantic Bridge"
### Added
- **Smart Visibility (Semantic Bridge)**: Unified parameter and port discovery in UI.
- **Automatic Routing**: Parameters of type `list`, `number`, and `text` are now automatically routed to the **General** configuration tab.
- **Port Filtering**: Configuration-heavy ports (e.g., `midi_channel`) are promoted to the General tab and hidden from the Patching tab to ensure UI hygiene.
- **Project Governance**: Formalized standard in `docs/OMEGA_Vision.md` and `DOCUMENTACION/OFICIAL/ACE_SPEC_1_0.md`.


## [2.6.0] - 2026-04-09 (Build 363) - "Aseptic Rack Stabilization"
### Added
- **Metadata-Driven Rack Routing (Phase 27)**:
    - Implemented aseptic routing logic in `ModuleManager` that prioritizes manifest metadata over stale preset state.
    - Added global fallback to **Upper Rack** for all unclassified modules.
    - Established hierarchy: **State > Manifest > Semantic Fallback > Global Default (Upper)**.
- **Ultra-Clean UI Aesthetics**:
    - Purged all visual 'jack' (port) icons from the modular renderer for a minimalist professional look.
    - Synchronized `display-unit` selectors for robust horizontal alignment.
### Improved
- **Metadata Propagation**: Resolved a property leak in `resolveDescriptor` that was stripping `rack` and `panelClass` from ACE components.
- **Diagnostics**: Enhanced console logging for real-time routing source identification (`State` vs `Manifest`).
- **Vision Document**: Finalized Section 1.1 in `docs/OMEGA_Vision.md` detailing the rack routing algorithm.

## [2.5.0] - 2026-04-08 (Build 298) - "Patchbay Hub Evolution"
### Added
- **Global Patchbay Hub (Phase 24.F)**:
    - Decoupled the Patchbay Matrix from the physical rack, establishing it as a system-level utility.
    - Implemented a premium **Glassmorphism** aesthetic using `backdrop-filter` and semi-transparent layering.
    - Added a dedicated **[MATRIX]** trigger in the Top Navigation bar and **Edit** menu.
- **Aseptic Rack Guard**:
    - Implemented a structural filter in `ModuleManager` to prevent infrastructure components (Hub) from appearing in the synthesis rack.
- **Dynamic Slot Expansion**:
    - Resolved the "Matrix Full" bug when initializing the first mod slot in an empty matrix.
    - Enabled seamless 0-to-16 slot growth driven by user interaction.

## [2.4.0] - 2026-04-07 (Build 271) - "Aseptic Sync"
### Added
- **Patchbay Dynamic Slot Sync (Phase 24.E)**:
    - Implemented proactive slot-count synchronization in the WebUI. The Patchbay Hub now re-queries the engine limits every time it is toggled, ensuring instant parity with "Edit > Preferences" changes.
    - Added high-fidelity diagnostic logging to `SystemSettingsManager.cpp` to verify parameter persistence and boundary clamping.
- **Engine Traceability**:
    - Centralized `maxPatchbaySlots` verification in the C++ core to prevent desync between on-disk YAML and runtime ValueTree state.
### Improved
- **UI Responsiveness**: Optimized the `toggleWorkspace` flow to prevent stale rendering of the modulation grid.
- **Nomenclature Audit**: Completed 100% purge of legacy "Modulation Matrix" labels in favor of "Patchbay Hub".
### Added
- **Hyper-ACE Super-Modularity (Phase 23)**:
    - **Dynamic Manifest Discovery**: Expanded `AceCatalog` to support directory-based scanning of `.yaml` manifests. Modules are now fully decoupled from the binary core.
    - **Metadata-Driven UI**: Implemented a generic `ModuleRenderer` in the WebUI that interprets `uiLayout` (grid/columns/gap) and `style` metadata directly from the C++ backend.
    - **Juno DCO Manifest**: Migrated the flagship Juno DCO to a standalone manifest (`juno_dco.yaml`), proving the "Super-Modular" vision.
- **Nomenclature Migration**:
    - **Patchbay-Matrix**: Systemic renaming of the "Modulation Matrix" to "Patchbay-Matrix" across all layers (C++, RPC, TypeScript, YAML).
### Improved
- **RPC Protocol Expansion**: Updated `RpcModulationController` and `RpcPresetController` to serve complex UI metadata during component discovery.
- **ValueTree Flattening**: Refactored `RpcPresetController` to correctly handle the new `patchbayMatrix` semantic tag.

## [2.2.1] - 2026-04-06 (Build 270)
### Added
- **Aseptic Rack Identity (Phase 22)**:
    - **Aseptic Normalization**: Purged `OmegaPresetNormalizer` of all hardcoded auxiliary injections. The engine is now 100% data-driven.
    - **Auto-Heal Session State**: Added validation to `PresetService::deserializePreset` to drop corrupted empty states from standalone session restores.
    - **Manual Reset UI**: Added "New Preset" under FILE menu with confirmation prompt and custom naming support.
- **Structural Integrity**:
    - Removed legacy "empty lower rack" alarm from `module_manager.ts`. OMEGA now supports utility-only setups (Matrix + Trigger) without triggering emergency visuals.
### Improved
- **UI/Engine Synchronization**: Optimized `forceRepaint` calls to ensure perfect state parity during boot and manual resets.

## [2.1.0] - 2026-04-06
### Added
- **OMEGA 2.0 Modular Stabilization (Phase 18)**:
    - **Deep Interface Recovery**: Reconciled Core, Engine, and DSP layers with the 2.0 contract.
    - **Automated ACE Catalog Loading**: Implemented `loadFromDirectory` for component catalogs.
    - **State Management Hardening**: Added robust YAML serialization to `PresetService`.
    - **UI Bridge Sync**: Added `forceRepaint` to ensure instant UI/Engine state parity.
### Fixed
- **MSVC Regression Restoration**: Fixed `juce::MemoryBlock` API usage and namespace qualification errors.
- **Master FX Integration**: Sincronized `Delay` DSP with `juce::AudioBuffer` for the master signal path.

## [2.0.0] - 2026-04-02
### Added
- **OMEGA Semantic Era (Phase 17)**:
    - **Aseptic Modular Architecture**: Transitioned to a fully manifest-driven system where modules are self-describing and the engine is zero-coupled from the UI.
    - **Semantic Broker Service**: New central C++ registry that scans active presets to build a real-time inventory of module capabilities and ports.
    - **Module Manifests**: Implemented `ModuleManifest` contract for LFO, OSC, Filter, EG, and MIDI modules, declaring I/O ports and visual telemetry mapping.
    - **Semantic UI Probing**:
        - **Oscilloscope (Universal Probe)**: Dynamic discovery of all visualizable ports; no more hardcoded indices.
        - **MIDI Probe**: Precision monitoring of any MIDI-capable module output or global traffic.
        - **Mod Matrix (Hierarchical)**: Automatic grouping by module instance (e.g., LFO-1, LFO-2) for professional, organized routing.
    - **Governance**: Hardened agent skills (`zero-core-errors`, `documentation-manager`) to enforce the new "Social Contract of Manifests".

### Fixed
- **UI Consistency**: Eliminated "Ghost Modules" from selectors; the WebUI now strictly reflects the active DSP state.
- **Build Integrity (Build #162)**: Resolved redefinition and type conversion errors in the Semantic Broker and RPC controllers.

## [1.9.6] - 2026-04-01
### Added
- **Modulation Matrix 2.0 (Phase 4)**:
    - **32-Slot High-Fidelity Grid**: Expanded modulation routing from 16 to 32 slots with bipolar depth control.
    - **"Via" Secondary Modulation**: Implemented secondary depth modulation (e.g., LFO -> Cutoff controlled by ModWheel).
    - **Real-Time Matrix Compiler**: New graph-based compiler that translates Matrix slots into low-level DSP routes on preset load.
    - **Dynamic Metadata Resolution**: WebUI now fetches available modulation sources and targets dynamically from the engine via RPC.
    - **RpcModulationController**: Dedicated bridge for real-time matrix manipulation without audio interruptions.

## [1.9.5] - 2026-04-01
### Added
- **Modular ADSR Engine (Case 401)**: Implemented sample-accurate ADSR generator with POD-compatible state mapping for high-fidelity voice architecture integration.
- **Dynamic Source Filtering**: Standardized A/B source selectors to strictly display active synthesis/FX modules in the current preset.

### Fixed
- **Oscilloscope Stabilization (Build #142)**:
    - Resolved `ResizeObserver` loop errors by implementsing `requestAnimationFrame` throttled resize logic.
    - Corrected UI rendering regression (compressed line) by enforcing `flex: 1` and a `4:3` aspect ratio on the visualizer container.
    - Restored full modal synchronization with the "Advanced Wave Analyzer" using the existing static HTML definition.

## [1.9.4] - 2026-03-31
### Added
- **WebUI Architecture Hardening (Phase 13.5)**:
    - **Fully Declarative Rendering**: Purged all legacy fallback classes (`ModuleJuno`, `ModuleDelay`, etc.). The WebUI is now 100% data-driven via `module_descriptors.js`.
    - **TypeScript Foundation**: Transitioned core bridge infrastructure (`metadata_store.ts`, `module_renderer.ts`, `module_manager.ts`, `module_descriptors.ts`) to TypeScript with formal interface definitions.
    - **Single Source of Truth (SOT)**: C++ `ParameterMetadataRegistry` is now the absolute authority for UI ranges, labels, and types, served via RPC.
    - **Modular Layout Expansion**: Added universal descriptors for ADSR (EG-STANDARD-001), VCA (VCA-STANDARD-001), LFO (LFO-STANDARD-001) and Korg/Prophecy components.

### Improved
- **Build System Hygiene**: Consolidated build scripts into `build_auto.bat` and cleaned up repo-level `.gitignore` and legacy artifacts.
- **Verification Pipeline**: Established Build #95 as the stable production-ready baseline.

## [1.9.2] - 2026-03-31
### Added
- **Architectural Hardening Milestone (Build #91)**:
    - **Metadata SOT (Single Source of Truth)**: Expanded `ParameterMetadataRegistry` with rich descriptors (`valueType`, `uiControl`, `category`, `options`, `ccNumber`).
    - **Bridge Decomposition**: Refactored monolithic `OmegaUiBridge` into specialized controllers (`RpcPresetController`, `RpcTelemetryController`, `RpcSystemController`, `RpcMetadataController`, `RpcInputController`).
    - **Data-Driven Validation**: Refactored `AceValidator` to be engine-agnostic and driven by catalog families and preset engine metadata.
    - **Oscilloscope Restoration**: Fixed data contract mismatch in the telemetry stream by wrapping history buffers in structured objects (`{ history, latest }`).
    - **Schema Standardization**: Unified parameter naming between ValueTrees and DSP structs (e.g., `hpfPos` -> `hpfPosition`, `vcfKybd` -> `vcfKeyTracking`).

### Fixed
- **Build Regressions**: Resolved `yaml-cpp` include path issues and `juce::var` type conversion ambiguities during RPC refactoring.
- **Telemetry Loop**: Fixed syntax errors in `RpcTelemetryController` history fetch loop.
 
## [1.9.1] - 2026-03-30
### Added
- **Phase 11: Modular Core Stabilization**:
    - Standardized `voiceArch` identifier across C++, YAML and WebUI.
    - Implemented **Recursive Collection Flattening** in `OmegaUiBridge`, ensuring modular racks render correctly.
    - Automated metadata synchronization using `system_settings.yaml`.

## [1.7.0] - 2026-03-30
### Added
- **Smart Focus Diagnostic System (Phase 7)**:
    - Universal "Eye" icons (👁️) across all synthesis and FX modules.
    - Context-aware oscilloscope routing with visual `focus-flash` feedback.
    - Standardized `ModuleJunoBase` toolbar for consistent multi-module interaction patterns.
- **MIDI 2.0 Hybrid Support (Phase 10)**:
    - Integration of JUCE 8 `universal_midi_packets` (UMP) with runtime auto-detection.
    - High-resolution processing for 16-bit velocity and 32-bit controller values.
    - Native fallback to MIDI 1.0 byte-stream adapters for absolute backward compatibility.

### Fixed & Hardened
- **Ghost LFO Suppression**: Eliminated hardcoded 5Hz PWM modulation in `OscillatorPoolJunoDco.h`. PWM is now strictly parameter-driven.
- **DSP Signal Purity**:
    - Implemented hardware-style bypass for the Chorus module when set to "Off" (CPU-efficient).
    - Restricted "Resonance Compensation" to the Juno IR3109 filter model, preventing gain artifacts in other filter types.
- **UI/UX Refinement**:
    - Converted VCF tactical sliders to high-fidelity rotary knobs for a premium aesthetic.
    - Implemented "ON/BYPASS" toggle logic for the Delay module with real-time state sync.

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
- **Modular Envelopes (Case 401)**: Dynamic, sample-accurate ADSR state management integrated into the voice signal path.
- **Build System**: Stabilized via `build_auto.bat` (CMake/Ninja) with automatic build tracking (**Build #142**).
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
