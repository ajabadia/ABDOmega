# OMEGA ACE Metadata Audit Matrix (Era 6.3)

Este documento es una auditoría técnica exhaustiva de todos los metadatos definidos en el ecosistema ACE (Aseptic Config Entity). Cruza la realidad del código con la teoría de la documentación y las reglas del esquema.

> [!IMPORTANT]
> **Propósito**: Identificar desalineaciones entre el Motor DSP (C++), el Editor (Schema JSON) y la Especificación Técnica (MD).
> **Leyenda**:
> - ✅ **Implementado**: Existe, funciona y se usa.
> - ❌ **Faltante**: No definido ni procesado.
> - ⚠️ **Parcial / Desviado**: Nombres diferentes o lógica inconsistente.

---

## 1. Module Root Metadata (Identidad de Módulo)

| Parámetro | Tipo | Descripción | Omega Core | Doc Spec | Editor (Schema) | Nota |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | `string` | ID único (kebab/snake case) | ✅ | ✅ | ✅ | Authority central. |
| `name` | `string` | Nombre legible por humanos | ✅ | ✅ | ✅ | |
| `description`| `string` | Propósito y mini-docs | ✅ | ✅ | ✅ | |
| `version` | `string/int`| Versión del esquema / entidad | ⚠️ | ✅ | ✅ | Core usa `int`, Schema usa `string`. |
| `family` | `enum` | Categoría (OSCILLATOR, etc.) | ✅ | ✅ | ✅ | |
| `modelId` | `string` | Ref. Hardware o clase lógica | ✅ | ✅ | ✅ | |
| `implementationId`| `uint32` | Binding ID numérico para DSP | ✅ | ✅ | ✅ | |
| `engine` | `enum` | Motor (WASM / Modular) | ✅ | ✅ | ✅ | |
| `theme` | `enum` | Estética (aseptic, classic...) | ✅ | ✅ | ✅ | |
| `tags` | `array` | Etiquetas de clasificación | ❌ | ❌ | ✅ | **Falta en Core y Doc.** |
| `author` | `string` | Autor del módulo | ⚠️ | ❌ | ❌ | Solo en `ModuleManifest.h` (C++). |
| `category` | `string` | Alias de family | ⚠️ | ❌ | ❌ | Solo en `ModuleManifest.h` (C++). |

---

## 2. Global Layout & Physical Specs (Hints de Chasis)

| Parámetro | Tipo | Descripción | Omega Core | Doc Spec | Editor (Schema) | Nota |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| `layout` | `object` | Contenedor de propiedades físicas | ❌ | ❌ | ❌ | **Falta en todo Era 6.** |
| `hp` | `int` | Ancho sugerido en Horizontal Pitch | ❌ | ✅ | ❌ | |
| `rack` | `enum` | Ubicación sugerida (upper, lower) | ❌ | ❌ | ❌ | **Legado Era 5.2 perdido.** |

---

## 3. Registry Item Metadata (Parámetros y Puertos)

| Parámetro | Tipo | Descripción | Omega Core | Doc Spec | Editor (Schema) | Nota |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| `id` | `string` | ID de entidad (namespace.id) | ✅ | ✅ | ✅ | |
| `label` | `string` | Etiqueta para la UI | ✅ | ❌ | ✅ | **Falta en Doc Spec.** |
| `type` | `enum` | Tipo de dato (float, audio...) | ✅ | ✅ | ✅ | |
| `roles` | `array` | Roles (control, stream...) | ✅ | ✅ | ✅ | |
| `front` | `bool` | Visibilidad en panel frontal | ❌ | ❌ | ✅ | **Falta en Core y Doc.** |
| `back` | `bool` | Visibilidad en panel trasero | ❌ | ❌ | ✅ | **Falta en Core y Doc.** |
| `direction` | `enum` | Dirección (input/output) | ✅ | ⚠️ | ❌ | Core usa `direction`. Schema usa `roles`. |
| `range.min` | `number` | Valor mínimo | ✅ | ✅ | ✅ | |
| `range.max` | `number` | Valor máximo | ✅ | ✅ | ✅ | |
| `range.default`| `number` | Valor inicial | ✅ | ✅ | ✅ | |
| `default` | `number` | Valor inicial (standalone) | ✅ | ❌ | ❌ | Core lo busca también fuera de `range`. |
| `unit` | `string` | Unidad (Hz, dB, %, etc.) | ✅ | ✅ | ❌ | **Falta en Schema a nivel raíz.** |
| `precision` | `number` | Resolución DSP | ❌ | ✅ | ❌ | **Falta en Core y Schema.** |
| `ui_precision`| `number` | Resolución visual | ❌ | ✅ | ❌ | **Falta en Core y Schema.** |
| `modulable` | `bool` | ¿Es destino de modulación? | ✅ | ❌ | ❌ | Core lo tiene en struct. |

---

## 4. Presentation & View Policy (Hints de UI)

| Parámetro | Tipo | Descripción | Omega Core | Doc Spec | Editor (Schema) | Nota |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| `presentation` | `object` | Contenedor de visualización | ✅ | ✅ | ✅ | |
| `tab` | `string` | Hint de pestaña (MAIN, etc.) | ✅ | ✅ | ✅ | |
| `group` | `string` | Hint de grupo lógico | ✅ | ✅ | ✅ | |
| `order` | `int` | Prioridad en la lista | ✅ | ✅ | ✅ | |
| `cell` | `string` | ID de Celda Virtual | ❌ | ❌ | ✅ | **Diferencia conceptual.** |
| `ui.component`| `enum` | Tipo de control (knob, etc.) | ✅ | ✅ | ✅ | |
| `ui.variant` | `string` | Variante estética (A, B...) | ✅ | ✅ | ✅ | |
| `ui.size` | `enum` | Tamaño (mini, small...) | ✅ | ✅ | ✅ | |
| `attachments` | `array` | Sub-controles (LEDs, etc.) | ✅ | ✅ | ✅ | |
| `att.color` | `string` | Color del elemento (orange, etc.)| ❌ | ❌ | ❌ | **Legado Era 5.2 perdido.** |
| `att.bind` | `string` | Vínculo de datos (self, etc.) | ❌ | ❌ | ❌ | **Legado Era 5.2 perdido.** |

---

## Resumen de Desviaciones Críticas

1. **La "Gran Omisión" (Core/Doc)**: `tags`, `front` y `back` son requeridos por el editor pero el motor DSP los ignora totalmente al parsear. Riesgo de pérdida de metadatos al cargar.
2. **Conflicto de Nomenclatura**: Omega Core usa `direction: input` mientras que el Schema prefiere `roles: ["input"]`. Debemos unificar en `roles`.
3. **Atributos de Ingeniería**: El Schema Tool ignora `unit`, `precision` y `ui_precision`, campos vitales para el rigor técnico del editor.
4. **Standalone Default**: El core permite `default` en la raíz del objeto de registro, pero el esquema obliga a meterlo en `range`.

---
*Auditoría generada por Antigravity Era 6 Alpha*
