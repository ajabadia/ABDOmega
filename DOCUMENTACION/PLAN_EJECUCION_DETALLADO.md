# 🗺️ Plan de Ejecución Detallado: OMEGA Phase 2

Este plan detalla los pasos técnicos necesarios para cerrar la brecha entre el diseño documental (`.finished`) y la implementación actual en `SOURCE`. Se organiza en Sprints técnicos independientes pero secuenciales.

---

## ✅ Sprint 1: Dinamización del Catálogo ACE
**Objetivo:** Eliminar el hardcoding en `AceCatalog.h` y habilitar la carga desde recursos YAML.

1. **Infraestructura YAML:** [x]
   - [x] Integrar `yaml-cpp`.
   - [x] Implementar `AceCatalog::createFromResources(std::string path)`.
2. **Migración de Datos:** [x]
   - [x] Mover los registros de `registerDefaults()` a los archivos `.yaml` en `Resources/ace/`.
3. **Validación:** [x]
   - [x] Test unitario `TestAceCatalog` verificado con carga dinámica.

---

## ✅ Sprint 2: Expresión Neutra (OmegaInput)
**Objetivo:** Desvincular el motor DSP de MIDI 1.0 y habilitar la base para MPE/MIDI 2.0.

1. **Capa de Entrada:** [x]
   - [x] Crear `SOURCE/Core/Input/OmegaInput.h` con structs para eventos agnósticos.
   - [x] Implementar `SOURCE/Plugin/Midi1InputAdapter.h` como puente con JUCE.
2. **Refactor de Motor:** [x]
   - [x] Actualizar `ISynthesisEngine` y `VirtualAnalogEngine` para consumir `OmegaInput`.

---

## ✅ Sprint 3: KORG ERA (MS-20 & Prophecy)
**Objetivo:** Implementación de modelos de síntesis clásicos de los 90.

1. **MS-20 (Korg35):** [x]
   - [x] Filtro Sallen-Key TPT con lazo de saturación no lineal ("Grit").
2. **Prophecy (MOSS):** [x]
   - [x] Oscilador de modelado físico (*Digital Waveguide/Karplus-Strong*).
3. **Validación:** [x]
   - [x] 105 aserciones de test unitario pasadas correctamente.

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
1. **Completado:** Sprint 1, 2 y 3 (Motor, Entrada y Modelado Korg).
2. **En Proceso:** Sprint 4 (Infraestructura de comunicación con la UI).
3. **Próximo:** Sprint 5 (Visualización Premium con WebView).
