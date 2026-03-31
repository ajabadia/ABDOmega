# 📜 OMEGA Development Rules

Este documento establece las normas técnicas y de arquitectura para el desarrollo del sintetizador OMEGA.

## 1. Real-Time Safety (DSP)
- **Prohibido**: Uso de `new`, `malloc` o cualquier reserva de memoria dinámica en el hilo de audio (`process` / `render`).
- **Prohibido**: Uso de `std::pow`, `std::exp`, `std::sin`, `std::log` dentro de bucles de proceso por muestra si no es mediante una aproximación rápida o tabla de búsqueda (Lookup Table).
- **Obligatorio**: Todos los componentes deben estar pre-alocados en el constructor o en `prepareToPlay`.

## 2. Arquitectura ACE (Architectural Component Emulation)
- Los componentes de hardware (osciladores, filtros, envolventes) deben seguir el patrón de registro ACE.
- Se prefiere la modularidad: un componente no debe conocer el estado del motor superior, solo recibir parámetros y señales de entrada.

## 3. Presets & Modulación
- Los presets deben serializarse en formato **YAML** siguiendo el esquema `OmegaPreset`.
- El sistema de modulación debe ser **Sample-Accurate** usando el `ModulationGraph`.

## 4. UI & RPC Architecture
- **Router-Controller Pattern**: The `OmegaUiBridge` must only act as a router. Any new UI logic must be implemented in a specialized `RpcBaseController` subclass.
- **Single Source of Truth**: All parameter metadata (ranges, defaults, units, enums) MUST be defined in `ParameterMetadataRegistry`.
- **DRY Policy**: Do not hardcode parameter ranges or labels in the WebUI. Use `getMetadata` and `RpcMetadataController` to fetch definitions from the C++ backend.
- **Declarative WebUI**: New modules should not be built with custom CSS/HTML if they fit the `ModuleRenderer` pattern. Define a descriptor in `module_descriptors.js` instead.

## 5. Documentación & Control de Versiones
- **Changelog**: Cada cambio relevante debe registrarse en `changelog.md` siguiendo el estándar "Keep a Changelog".
- **Roadmap**: El progreso debe reflejarse en `ROADMAP.md` indicando timestamps de finalización.
- **Commits**: Los mensajes de commit deben ser descriptivos del área funcional (ej: `Refine: MS-20 DSP`) y técnicos.

---
*Mantenido por el equipo de desarrollo ABD-IA.*
