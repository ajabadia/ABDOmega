# ACE: WebUI Architecture Specification (Era 6)

## 1. Introducción: Strangler Pattern

En la **Era 6**, la WebUI de OMEGA se rediseña como una aplicación puramente impulsada por esquemas (**Schema-driven**). El objetivo es reemplazar gradualmente la interfaz actual mediante un **Strangler Pattern**, levantando un nuevo núcleo paralelo que consuma contratos asépticos del backend.

---

## 2. Subsistemas de Datos

La arquitectura se divide en cuatro almacenes de datos (*Stores*) independientes para evitar la entropía de estados:

### A. SchemaStore
- **Responsabilidad**: Carga y cachea el contrato declarativo global (`getUiSchema()`).
- **Contenido**: Tipos de módulos, definiciones de parámetros, widgets disponibles y reglas de ruteo.
- **Propiedad**: Inmutable durante la sesión (lógica de solo lectura).

### B. GraphStore
- **Responsabilidad**: Mantiene la topología activa del sintetizador (`getPatchGraph()`).
- **Contenido**: Instancias de módulos, racks, capas y conexiones (bordes del grafo).
- **Actualización**: Reactivo ante cambios estructurales.

### C. RuntimeStore
- **Responsabilidad**: Flujo de datos de alta frecuencia.
- **Contenido**: Valores de parámetros, telemetría (meters, LEDs) y estado de modulación.
- **Aislamiento**: Separado del GraphStore para permitir actualizaciones a 60Hz sin reconstruir el DOM.

### D. SessionStore
- **Responsabilidad**: Estado efímero de la interfaz.
- **Contenido**: Selección de módulos, foco de controles, workspaces activos y paneles abiertos.

---

## 3. El Pipeline de Renderizado Declarativo

El flujo de visualización es unidireccional y se basa en la transformación de contratos:

1.  **ViewModelBuilder**: Toma el `Schema` y el `Graph` para construir un **ModuleViewModel**. Resuelve metadatos, etiquetas y layouts antes de llegar al renderer.
2.  **PanelRenderer**: Una pieza genérica que recibe un `ModuleViewModel` y crea la estructura del panel (Tabs, Groups).
3.  **WidgetRegistry**: Mapea el `widgetId` del esquema a un controlador visual interactivo (`Knob`, `Slider`, `Display`).
4.  **CommandBus**: Todo widget emite acciones a través de un bus único (`UiCommand`), eliminando llamadas directas a RPCs fragmentados.

---

## 4. Blueprint de Paquetes (Directorio `ui/`)

La nueva WebUI sigue esta organización modular:

```text
src/
  core/           # Stores de Schema, Graph y Runtime
  vm/             # ViewModelBuilder y selectores
  rendering/      # PanelRenderer y WidgetRegistry
  widgets/        # Implementaciones atómicas (Knob, Fader, etc.)
  features/       # Rack, Patchbay, Browser como módulos de UI
  transport/      # Adaptador de bridge, RPC y eventos
```

---

## 5. Criterios de "Pureza Era 6"

Un módulo front-end se considera conforme a la Era 6 si cumple:
- **Sin Hardcodes**: No existen `if (id == "OSC_VA")` en el código de renderizado.
- **Single Binding**: El widget se liga a una entidad mediante un `BindingRef` único.
- **Interacción por Comandos**: Ningún componente visual conoce el canal RPC; solo emite comandos al bus central.
- **Layout Declarativo**: La posición y agrupación se derivan al 100% de la propiedad `presentation` del esquema.

---
*OMEGA — WebUI Architecture Blueprint*
