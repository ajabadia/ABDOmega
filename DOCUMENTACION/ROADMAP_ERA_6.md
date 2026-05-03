# OMEGA Roadmap: Era 6 (Phase 34+)

## Hito Actual: Aseptic Production Readiness (Absolute Certification)

La Era 6 ha culminado su fase de endurecimiento arquitectónico. OMEGA cuenta ahora con un **Universal Command Dispatcher** y un runtime 100% aséptico, garantizando la integridad absoluta entre el motor y la UI.

---

## Fase 34: Formalización Contractual [SUPERADA POR FASE SANITARIA]

*Esta fase de infraestructura temprana ha sido absorbida por el desarrollo del Manifest Editor y el RpcCommandDispatcher. La autoridad del esquema se ha trasladado al paradigma aséptico de la Era 6.3.*

## Fase 35: Aceptación de la Era 6 [SUPERADA POR FASE SANITARIA]

*La migración industrial de módulos core y la purga de descriptores hardcoded se ha completado satisfactoriamente durante las fases 38 y 40.*

---

## Fase 36: Expansión de Ecosistema (En curso)

- [x] **Soporte completo para paquetes externos .acepack** (Carga dinámica vía `AceCatalog`).
- [ ] Marketplace / Repositorio oficial de módulos de la comunidad (Planificación Era 7).
- [x] Entorno de pruebas para validación de contratos de terceros (Absorbido por **Aseptic Manifest Workbench**).
- [x] Certificación Aseptica: El motor C++ rechaza módulos no conformes (Implementado en **Fase 41**).

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

## Fase 37: Aseptic Manifest Workbench (Q2 2026 - COMPLETADO)

Transformación del editor técnico en un entorno de autoría semántica profesional.

### 1. Ergonomía de Autoría Semántica [COMPLETADO]
- [x] Implementación de **Navegación Estructural (Aseptic Outline)** con soporte inicial de IDs técnicos.
### FASE 4: Manifest Designer [ERA 6.3 INDUSTRIAL_READY]
*   **4.1 Generación de Formularios por Esquema [x]**
*   **4.2 System Awareness & Intelligence [x]**
    *   [x] IntelliSense para pins normativos.
    *   [x] Bloqueo de IDs reservados ("Host Injected").
    *   [x] Flags de legado para campos obsoletos.
*   **4.3 Industrial Repo Health [x]**
    *   [x] Herramienta **⚡ Auto-Heal** para migración masiva.
    *   [x] Dashboard de salud del repositorio.

### FASE 5: WASM Bridge [ERA 6.3 HARDENED]
*   **5.1 Soporte para Audio In (Host Buffers) [x]**
    *   [x] Mapeo de `system.audio.in_l/r` en WasmHostInterface.
*   **5.2 Control de Estado de Voz (Bidireccional) [x]**
    *   [x] APIs `set_voice_freq`, `set_voice_gate`, `set_voice_vel`.
    *   [x] Vinculación de `VoiceState` por instancia de voz.
*   **5.3 WASM Registry Sync [x]**
    *   [x] Escaneo de importaciones/exportaciones para auto-sanación.
- [x] Sincronización "Auto-Sync" con binarios WASM (**WasmHeartbeat**).
- [x] Protocolo de "Aseptic Healing" para reparación automática de manifiestos.

### 3. Visualización y Feedback [COMPLETADO]
- [x] **Arquitectura de Temas Atómica**: Migración de temas a una estructura modular.
- [x] **Live Viewport con Linter Visual**: Motor de reflexión CSS para validación de componentes.

---

## Fase 38: UX Mastering & Semantic Navigation (Q2 2026 - EN CURSO)

Refinamiento de la experiencia de usuario para autores de manifiestos.

### 1. El Árbol Semántico [COMPLETADO]
- [x] **Navegación Jerárquica**: Outline agrupado por búsqueda bajo demanda.
- [x] **Iconografía Contextual**: Identificación visual por componente (Knob, Slider, Port).
- [x] **Dirty State Management**: Indicadores de cambios sin guardar para guardado manual.

### 2. Paneles Contextuales e Inteligencia [COMPLETADO]
- [x] **Organización por Concern**: PropertyPanel con secciones colapsables (Identity, Contract, UI).
- [x] **Contextual Help Popups**: Explicaciones integradas para campos técnicos (roles, precision, lookups, layout).
- [x] **Templates de Intención**: Galería de arquitecturas pre-configuradas (`TemplateGallery.tsx`).

### 3. Ecosistema y Validación [COMPLETADO]
- [x] **Atomic Themes**: Despliegue de definiciones de componentes en temas industriales (Aseptic, Industrial).
- [x] **Patching Sanctuary**: Matriz de conexiones local funcional (`PatchingSanctuary.tsx`).


---

## Fase 39: ACE Metadata Absolute Alignment (Q2 2026 - COMPLETADO)

Sincronización total de la superficie de metadatos entre Motor, Esquema y UI.

### 1. Sincronización Arquitectónica [COMPLETADO]
- [x] **Alineamiento de Campos Universales**: Sincronización de `tags`, `layout` (hp/rack), `precision` (DSP/UI) y `visibility` (front/back).
- [x] **Cierre de Gaps UI**: Implementación en el PropertyPanel de campos para agrupación lógica (`group`), ordenación (`order`) y binding físico (`cell`).
- [x] **Certificación de la Verdad**: Generación de la `METADATA_AUDIT_MATRIX.md` auditando el código fuente al 100%.

### 2. Validación de Contrato 6.3 [COMPLETADO]
- [x] **Schema Authority 6.3**: Actualización del motor de generación (`omega-schema-tool`) y el `schema.json`.
- [x] **Referencia de Ingeniería**: Creación del `test_manifest_6.3.yaml` como estándar definitivo.

---

## Fase 40: Advanced Semantic Discovery & Enforcement (Q2 2026 - EN CURSO)

Explotación de los nuevos metadatos para navegación y visualización avanzada.

### 1. Aseptic Search (Buscador por Etiquetas) [COMPLETADO]
- [x] **Editor Implementation**: Integración de barra de búsqueda en el `AsepticOutline.tsx` con filtrado por `id`, `label`, `description`, `roles` y `tags`.
- [x] **Engine Integration**: Implementación del buscador semántico en el `AceCatalog` C++ (indexación unificada).

### 2. Visibilidad y Layout Avanzado [COMPLETADO]
- [x] **Engine Enforcement**: Implementación de la lógica C++ para propagar visibilidad aséptica (`front`/`back`) a través del `SemanticBrokerService`.
- [x] **Dual Panel Blueprint**: Implementación de modos "Operator" y "Engineering" en el Live Viewport del editor con filtrado físico de componentes.

### 3. Migración Industrial [COMPLETADO]
- [x] **Migration 6.3**: Actualización de los manifiestos core (`osc_va`, `midi_in`) al estándar de visibilidad aséptica Era 6.3.
- [x] **Extended Migration**: Industrialización de `midi_2_cv` y adaptadores de sistema completada (Abril 2026).

---

---

## Fase 41: Absolute Aseptic Deployment (Q2 2026 - COMPLETADO)

Despliegue de la lógica de visibilidad y descubrimiento en el runtime de producción.

### 1. Enforcement Programático [COMPLETADO]
- [x] Implementar el filtrado de parámetros en los renderizadores del Rack (Sustituido por poda en `SemanticBrokerService`).
- [x] Ocultación física de "Ghost Parameters" en todo el ecosistema de presets.
- [x] **Legislative Sheriff**: Auditoría de manifiestos en carga (`AceValidator`).

### 2. Orquestación Core [COMPLETADO]
- [x] Consolidación de `AceCatalog` como autoridad de carga de módulos WASM.
- [x] Sincronización Dinámica de Esquema: Centralización de la verdad en C++ (`generateSchema`).
- [x] Implementación de la carga de paquetes externos .acepack (Referenciado en **Fase 36**).

---

---

## Fase 42: Industrial Rack & Authoring Hardening (Q2 2026 - COMPLETADO)

Consolidación de la gestión estructural del rack y actualización industrial de herramientas de autoría.

### 1. Gobernanza de Rack [COMPLETADO]
- [x] **Rack Reordering**: Implementación de reordenación atómica para `auxiliary` y `mainChain` vía RPC (`moveModule`).
- [x] **Instance Autonomy**: Sistema de persistencia de temas visuales por instancia de módulo.
- [x] **Unified Rendering**: Centralización de la lógica de renderizado en el `ModuleManager` para racks híbridos.

### 2. Manifest Designer 6.3 Upgrade [COMPLETADO]
- [x] **Industrial Schema Sync**: Actualización a la autoridad de esquema Era 6.3.
- [x] **Extended Logic Support**: Soporte para roles `system`, `expert` y visibilidad `disabled`/`readOnly`.
- [x] **Authoring UX**: Refactor de familias normativas en minúsculas y alineamiento con el motor DSP.

### 3. Resource Aseptization [COMPLETADO]
- [x] **Global Schema Update**: Despliegue del `module-schema-6.3.json` en los recursos del sistema.
- [x] **Core Manifest Migration**: Actualización de los módulos base (`midi_in`, `osc_va`) al estándar 6.3.
- [x] **Preset Hardening**: Actualización de `factory_initial.yaml` para soportar racks híbridos.

---

## Fase 43: Repository Governance & WASM Interop (Q2 2026 - COMPLETADO)

Aseguramiento de la integridad del repositorio y expansión de la interoperabilidad de sistema para módulos binarios.

### 1. WASM System Bridge [COMPLETADO]
- [x] **Native System Injection**: Implementación de `omega_get_system_buffer` en el bridge C++/WAMR.
- [x] **Dynamic Binding**: Sincronización de acumuladores de audio globales con el runtime WASM.
- [x] **Parity with Modular**: Garantía de acceso a `system.audio.*` para módulos binarios.

### 2. Repository Health & Bulk Validation [COMPLETADO]
- [x] **Repo Scanning**: Implementación de escaneo recursivo de manifiestos vía IPC.
- [x] **Health Dashboard**: Nueva interfaz de auditoría masiva en el Manifest Designer.
- [x] **Bulk Contract Validation**: Validación masiva de manifiestos contra el esquema Era 6.3.
- [x] **Aseptic Healing 2.0**: Mejora del protocolo de sanación para reconocimiento proactivo de roles `system` y `expert`.

## Fase 44: Era 7 - Industrialization (Absolute Aseptic) [Q2 2026 - EN CURSO]

Transición definitiva al modelo "Document-Driven" para eliminar la deriva de estado y simplificar la comunicación binaria.

### 1. Núcleo Aseptizado (C++) [COMPLETADO]
- [x] **PatchDocument**: Implementación de la SOT única (Modules, Connections, Parameters).
- [x] **RuntimeCompiler**: Orquestador unificado de snapshots binarios para el motor de audio.
- [x] **Numeric Addressing**: Sustitución de strings mágicos por IDs binarios (ModuleTypeId, ParamId).
- [x] **Atomic Swapping**: Implementación de doble buffer para snapshots en el `RuntimeStore`.

### 2. Bridge & Handshake (UI/RPC) [EN CURSO]
- [x] **Era 7 Handshake**: El arranque de la UI ahora espera activamente al backend y recupera el documento inicial.
- [x] **Numeric Dispatch**: El `RpcCommandDispatcher` soporta direccionamiento por `instanceId` y `paramId`.
- [x] **TypeScript Contracts**: Exportación de Enums canónicos (`schema_ids.ts`) para paridad total.

### 3. Migración de Módulos [EN CURSO]
- [x] **Migración Piloto**: `ModuleMidiToCv` adaptado al modelo de documento.
- [ ] **Migración Masiva**: Portar el Rack completo y el Patchbay al nuevo contrato numérico.

---

*Última actualización: 2026-04-30 (Fase 44 Era 7 Industrialization Launch)*
