# 🗺️ Plan de Ejecución Detallado: OMEGA Phase 2

Este plan detalla los pasos técnicos necesarios para cerrar la brecha entre el diseño documental (`.finished`) y la implementación actual en `SOURCE`. Se organiza en Sprints técnicos independientes pero secuenciales.

---

## 🚀 Sprint 1: Dinamización del Catálogo ACE
**Objetivo:** Eliminar el hardcoding en `AceCatalog.h` y habilitar la carga desde recursos YAML.

1. **Infraestructura YAML:**
   - [ ] Integrar un parser ligero (ej: `juce::JSON` o `yaml-cpp`).
   - [ ] Implementar `Omega::Core::Ace::AceCatalog::loadFromResources(juce::File indexFile)`.
2. **Migración de Datos:**
   - [ ] Mover los registros de `registerDefaults()` a los archivos `.yaml` en `Resources/ace/`.
3. **Validación:**
   - [ ] Implementar un test unitario que verifique que el catálogo se vacía y se vuelve a llenar correctamente desde disco.

---

## 🎹 Sprint 2: Expresión Neutra (OmegaInput)
**Objetivo:** Desvincular el motor DSP de MIDI 1.0 y habilitar la base para MPE/MIDI 2.0.

1. **Capa de Entrada:**
   - [ ] Crear `SOURCE/Core/Input/OmegaInput.h` con structs para `NoteEvent`, `Pressure`, `Timbre`, `PitchBend`.
   - [ ] Implementar `SOURCE/Core/Input/Midi1InputAdapter.h` que traduzca `juce::MidiBuffer` a `OmegaInput`.
2. **Refactor de Motor:**
   - [ ] Actualizar `ISynthesisEngine::renderNextBlock` para aceptar `OmegaInput` en lugar de `juce::MidiBuffer`.
   - [ ] Modificar `VirtualAnalogEngine` para leer las expresiones polifónicas por voz desde `OmegaInput`.

---

## 🌐 Sprint 3: El Puente UI (OmegaUiBridge)
**Objetivo:** Implementar la infraestructura de comunicación JSON-RPC para la WebUI.

1. **Protocolo JSON v1:**
   - [ ] Crear `SOURCE/UI/OmegaUiBridge.h/cpp`.
   - [ ] Implementar handlers para: `getState`, `setParam`, `loadPreset`, `savePreset`.
2. **Integración en Processor:**
   - [ ] Añadir `OmegaUiBridge` como miembro de `OmegaAudioProcessor`.
   - [ ] Vincular el Bridge a `APVTS` para el reporte de cambios de parámetros en tiempo real.
3. **Mecanismo de Mensajería:**
   - [ ] Implementar las colas de mensajes (Thread-safe) para que la UI no bloquee el audio.

---

## 🎨 Sprint 4: Integración WebView (JUCE 8)
**Objetivo:** Cargar el front-end React/Vite dentro del plugin.

1. **Contenedor WebView:**
   - [ ] Crear `SOURCE/UI/OmegaWebViewComponent.h` usando `juce::WebBrowserComponent`.
   - [ ] Implementar `OmegaWebResourceProvider` para servir los archivos de `BinaryData`.
2. **Editor Nativo:**
   - [ ] Refactorizar `OmegaMainEditor` para que sea un contenedor ligero del `WebView`.
   - [ ] Inyectar el `OmegaUiBridge` en el `WebView` para cerrar el ciclo de mensajes.
3. **Draft Front-end:**
   - [ ] Montar el esqueleto de React con el hook `useOmegaParams` diseñado en `0004.txt.finished`.

---

## 📂 Sprint 5: Git-for-Sounds (Versioning)
**Objetivo:** Evolucionar `OmegaPreset` hacia un sistema de versiones controlado.

1. **Repositorio de Presets:**
   - [ ] Crear `SOURCE/Core/Preset/PresetRepository.h/cpp`.
   - [ ] Implementar lógica de "Snapshot" que asigne un SHA único a cada estado del `ValueTree`.
2. **Branching & History:**
   - [ ] Implementar `CommitLog` para navegar por el historial de cambios del preset.
   - [ ] Implementar `ComparePreset(sha1, sha2)` que genere un diff lógico (YAML diff).
3. **UI de Git:**
   - [ ] Exponer los comandos de Git (Commit, Checkout, Branch) a través del `OmegaUiBridge`.

---

## 📈 Resumen de Prioridades
1. **Prioridad 1:** Sprint 1 & 2 (Estabilidad del motor y entrada).
2. **Prioridad 2:** Sprint 3 & 4 (Habilitación de la nueva interfaz premium).
3. **Prioridad 3:** Sprint 5 (Funcionalidades avanzadas de workflow).
