# OMEGA Roadmap: Era 6 (Phase 34+)

## Hito Actual: Aseptic Production Readiness (Absolute Certification)

La Era 6 ha culminado su fase de endurecimiento arquitectónico. OMEGA cuenta ahora con un **Universal Command Dispatcher** y un runtime 100% aséptico, garantizando la integridad absoluta entre el motor y la UI.

---

## Fase 34: Formalización Contractual (Q2 2026)

### 1. Alineación Documental [COMPLETADO]
- [x] Reencuadre de las especificaciones ACE bajo el paradigma de Contratos.
- [x] Migración de Skills operativas a Era 6.
- [x] Archivo del legado Era 5.2.

### 2. Esquema Operacional Unificado (Backend)
- [ ] Implementación de `getUiSchema()` en el bridge C++.
- [ ] Consolidación de `ParameterMetadataRegistry` como fuente única de verdad para el grafo.
- [ ] Publicación del `Graph` activo (instancias y racks) mediante el contrato de Era 6.

### 3. WebUI: Strangler Pattern
- [ ] Creación de la nueva arquitectura de WebUI paralela (Basada en contratas).
- [ ] Implementación del `ViewModelBuilder` declarativo.
- [ ] Desarrollo del `WidgetRegistry` (Desacoplamiento total de descriptores hardcoded).

---

## Fase 35: Aceptación de la Era 6 (Q3 2026)

### 1. Migración de Módulos Core
- [ ] Migración de `midi_2_cv` al nuevo pipeline 100% contractual.
- [ ] Migración de `osc_va` y filtros básicos.
- [ ] Eliminación progresiva de `moduledescriptors.js`.

### 2. Eliminación de Bridge Legacy
- [ ] Remoción de `window.juce` y de los shims de compatibilidad Era 4/5.
- [ ] Unificación del canal de Telemetría y Parámetros.

---

## Fase 36: Expansión de Ecosistema

- [ ] Soporte completo para paquetes externos `.acepack`.
- [ ] Marketplace / Repositorio oficial de módulos de la comunidad.
- [ ] Entorno de pruebas para validación de contratos de terceros.

---

## Fase Especial: Limpieza Quirúrgica (Q2 2026 - Sprint de Transición)

### Fase 1: Limpieza y Endurecimiento del Runtime [COMPLETADO]
- [x] Eliminación de `ModulePatchModal.legacy.ts` y del bundle Era 5.
- [x] Sustitución de fallbacks silenciosos por paneles de Error Contractual.
- [x] Purga de etiquetas "Era 5.2" en toda la superficie de la UI.

### Fase 2: Schema Authority & Aseptic Stores [COMPLETADO]
- [x] Implementación de `SchemaStore`, `InventoryStore` y `RuntimeStateStore`.
- [x] Refactorización de `ModuleRenderer` para eliminar la normalización de descriptores híbridos.
- [x] Eliminación de `MetadataStore` y purga de imports de Era 5.x.
- [x] Desmantelamiento de la "Sanctuary" local en favor de Autoridad Global de Matriz.

### Fase 3: Unified Dispatch & Final Aseptic Audit [COMPLETADO]
- [x] Implementar `RpcCommandDispatcher` para centralizar comandos de UI.
- [x] Bindings finales de telemetría al `RuntimeStateStore`.
- [x] Auditoría visual final: Purga total de iconografía de hardware legado.

---

*Última actualización: 2026-04-12 (Absolute Era 6 Certified)*
