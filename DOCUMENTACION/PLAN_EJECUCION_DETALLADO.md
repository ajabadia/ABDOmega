# 🗺️ Plan de Ejecución Detallado: OMEGA Phase 2

Este plan detalla los pasos técnicos necesarios para cerrar la brecha entre el diseño documental (`.finished`) y la implementación actual en `SOURCE`. Se organiza en Sprints técnicos independientes pero secuenciales.

---

## [/] Sprint 1: Dinamización del Catálogo ACE
**Objetivo:** Eliminar el hardcoding en `AceCatalog.h` y habilitar la carga desde recursos YAML.

1. **Infraestructura YAML:** [/]
   - [x] Integrar `yaml-cpp`.
   - [x] Implementar `AceCatalog::createFromResources(std::string path)`.
   - [ ] Eliminar fallback de `registerDefaults()` hardcoded.
2. **Migración de Datos:** [/]
   - [ ] Mover todos los registros de `registerDefaults()` a los archivos `.yaml` en `Resources/ace/`.
3. **Validación:** [ ]
   - [ ] Test unitario `TestAceCatalog` verificado con catálogo 100% dinámico.

---

## [/] Sprint 2: Expresión Neutra (OmegaInput)
**Objetivo:** Desvincular el motor DSP de MIDI 1.0 y habilitar la base para MPE/MIDI 2.0.

1. **Capa de Entrada:** [/]
   - [x] Crear `SOURCE/Core/Input/OmegaInput.h` con structs para eventos agnósticos.
   - [ ] Refactorizar `OmegaInput` para ser audio‑thread safe (buffer fijo/lock‑free).
   - [x] Implementar `SOURCE/Plugin/Midi1InputAdapter.h` como puente con JUCE.
2. **Refactor de Motor:** [/]
   - [x] Actualizar `ISynthesisEngine` y `VirtualAnalogEngine` para consumir `OmegaInput`.
   - [ ] Sincronizar herencia en voces para soporte MPE completo.

---

## [/] Sprint 3: KORG ERA (MS-20 & Prophecy)
**Objetivo:** Implementación de modelos de síntesis clásicos de los 90.

1. **MS-20 (Korg35):** [x]
   - [x] Filtro Sallen-Key TPT con lazo de saturación no lineal ("Grit").
2. **Prophecy (MOSS):** [/]
   - [x] Osciladores Brass, Wind, EP, Organ, Noise+Comb, Waveshaper y Arp implementados.
   - [ ] Integración final en `ProphecyEngine` y validación de parámetros ACE.
3. **Validación:** [ ]
   - [ ] Tests unitarios exhaustivos para cada modelo Prophecy.

---

## 🎹 Sprint 4: El Puente UI (OmegaUiBridge)
**Objetivo:** Implementar la infraestructura de comunicación JSON-RPC para la WebUI.

1. **Protocolo JSON v1:**
   - [ ] Crear `SOURCE/UI/OmegaUiBridge.h/cpp`.
   - [ ] Implementar handlers para: `getState`, `setParam`, `loadPreset`, `savePreset`.
2. **Integración en Processor:**
   - [ ] Vincular el Bridge a `APVTS` para el reporte de cambios de parámetros.

---

## 🎨 Sprint 5: Integración WebView (JUCE 8)
**Objetivo:** Cargar el front-end React/Vite dentro del plugin.

1. **Contenedor WebView:**
   - [ ] Crear `SOURCE/UI/OmegaWebViewComponent.h` usando `juce::WebBrowserComponent`.
2. **Editor Nativo:**
   - [ ] Refactorizar `OmegaMainEditor` para ser un contenedor ligero del `WebView`.

---

## 📂 Sprint 6: Versión de Presets (Git-for-Sounds)
**Objetivo:** Evolucionar `OmegaPreset` hacia un sistema de versiones controlado.

1. **Repositorio de Presets:** [ ]
   - [ ] Crear `SOURCE/Core/Preset/PresetRepository.h/cpp`.
2. **Branching & History:** [ ]
   - [ ] Implementar lógica de "Snapshot" (SHA único).

---

## 📈 Resumen de Prioridades
1. **En Revisión:** Sprint 1, 2 y 3 (Buscando paridad 100% entre diseño y código SOURCE).
2. **En Proceso:** Sprint 4 (OmegaUiBridge e infra de comunicación JSON‑RPC).
3. **Próximo:** Sprint 6 (Git-for-Sounds / OmegaPreset Facade) y Sprint 5 (WebView).
