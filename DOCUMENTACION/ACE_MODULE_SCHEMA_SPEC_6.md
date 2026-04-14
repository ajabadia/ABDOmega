# ACE: Module Schema Specification (Era 6)

## 1. Introducción: El Manifiesto como Esquema

En la **Era 6**, el manifiesto del módulo no es un manual de renderizado, sino una descripción formal de sus capacidades y semántica. Esta especificación separa la **Definición del Módulo** (Schema) de la **Política de Visualización** (View Policy). El formato oficial de intercambio es el **`.acemm`** (Aseptic Config Entity Master Manifest).

---

## 2. Capa 1: Module Schema Spec (Semántica Core)

La especificación semántica define las entidades que el backend publica y con las que el runtime puede interactuar.

### A. Identidad y Metadatos
- `id`: Identificador único del tipo de módulo (Kebab case).
- `name`: Nombre legible.
- `description`: Propósito del módulo y documentación corta (Obligatorio en Era 6.1).
- `version`: Versión del esquema.
- `family`: Categoría funcional en MAYÚSCULAS (`OSCILLATOR`, `FILTER`, `ENVELOPE`, `IO`, `FX`).

### B. Registry (Entidades Operacionales)
Todo parámetro, puerto o medidor debe declararse en el `registry`.
- `id`: ID único dentro del módulo (pueden usarse namespaces con puntos).
- `type`: `int`, `float`, `bool`, `string`, `list`, `audio`, `cv`.
- `roles`: Lista de etiquetas que definen el comportamiento (múltiples permitidos):
    - `control`: Entidad manipulable por el usuario.
    - `stream`: Flujo de datos continuo (Audio/CV).
    - `output` / `input`: Dirección de la señal.
    - `mod_source` / `mod_target`: Entidades elegibles para el Patchbay.
    - `telemetry`: Datos de visualización pasiva (Meters, LEDs).
    - `expert`: Entidades destinadas a configuración avanzada.

### C. Attributes (Binding)
- `range`: `{ min, max, default }`.
- `precision`: Resolución DSP.
- `ui_precision`: Resolución de visualización.
- `unit`: Unidad de medida (Hz, dB, ms, %, etc.).
- `stream`: `true` si el pin requiere telemetría de alta fidelidad (Streaming/History) por defecto.

### D. Technical Identity DNA (Era 6.1)
Los siguientes campos son mandatorios para la correcta vinculación con el motor OMEGA y la gestión de flotas:
- `modelId`: Identificador del "hardware" lógico o clase de referencia (ej. `ACE-VCO-60`).
- `implementationId`: ID numérico único usado para el binding de parámetros y ruteo interno en el motor.
- `engine`: Tipo de motor de ejecución (`WASM` para asépticos, `Modular` para legacy).
- `theme`: Estética visual sugerida (`aseptic`, `industrial`, `classic`).
- `tags`: Array de etiquetas de clasificación para el navegador (ej. `["ACID", "FM", "VINTAGE"]`).

### E. Registry (Parámetros y Puertos)
Todo parámetro, puerto o medidor debe declararse en el `registry`.
- `id`: ID único dentro del módulo (pueden usarse namespaces con puntos).
- `label`: Etiqueta legible para la UI (Obligatorio en Era 6.2).
- `type`: `int`, `float`, `bool`, `string`, `list`, `audio`, `cv`, `midi`, `gate`.
- `roles`: Lista de etiquetas que definen el comportamiento (múltiples permitidos):
    - `control`: Entidad manipulable por el usuario.
    - `stream`: Flujo de datos continuo (Audio/CV).
    - `output` / `input`: Dirección de la señal.
    - `mod_source` / `mod_target`: Entidades elegibles para el Patchbay.
    - `telemetry`: Datos de visualización pasiva (Meters, LEDs).
    - `expert`: Entidades destinadas a configuración avanzada.
- `front`: `boolean`. Si es `true`, la entidad es candidata a renderizarse en el panel frontal.
- `back`: `boolean`. Si es `true`, aparece en la vista de ingeniería / trasera.

### F. Attributes & Engineering Specs
- `range`: `{ min, max, default }`.
- `default`: Valor por defecto (alternativa a `range.default`).
- `precision`: Resolución DSP (decimales significativos).
- `ui_precision`: Resolución de visualización en la UI.
- `unit`: Unidad de medida (Hz, dB, ms, %, etc.).

---

## 3. Capa 2: Physical Layout & View Policy

El esquema incluye pistas sobre la ocupación física y sugerencias de representación.

### A. Layout Hints (Chasis)
- `layout.hp`: Ancho sugerido en unidades HP (Horizontal Pitch).
- `layout.rack`: Ubicación sugerida en el chasis (`upper`, `lower`).

### B. Zonificación (Agrupación)
Se elimina la noción de pestañas fijas en el core. Se usan hints para agrupar:
- `tab`: Identificador de la categoría de visualización (ej: `MAIN`, `PATCHING`, `SETUP`).
- `group`: Agrupación lógica dentro de la pestaña.
- `order`: Prioridad de visualización.

### B. Attachments (Control Cells)
Un componente visual puede tener "adjuntos" que operan sobre la misma entidad o entidades relacionadas:
```yaml
id: "freq"
roles: ["control", "mod_target"]
presentation:
  ui: { component: "knob" }
  attachments:
    - { type: "display", unit: "Hz" }
    - { type: "led", role: "activity" }
    - { type: "label", position: "bottom" }
```
Esto permite al renderer construir **"Control Cells"** complejas (ej: un Knob rodeado de un medidor y un valor numérico) sin código imperativo.

### C. Static Assets
El manifiesto define la ubicación de los recursos visuales propios:
- `assets.icon`: Icono personalizado (si es null, el sistema usa el fallback de `family`).
- `assets.image`: Imagen representativa de la carátula o rostro del módulo (Ruta canónica: `assets/[id].png`).

---

## 4. El Ciclo de Vida del ViewModel

El frontend debe transformar el `Registry` en un modelo visual resolviendo:
1. **Normalización**: Unir atributos del esquema con el estado actual.
2. **Jerarquía**: Organizar por `tab` -> `group` -> `order`.
3. **Distribución**: Asignar espacio en HP (Horizontal Pitch) según la densidad de controles.
4. **Binding**: Ligar cada widget a su canal (`param`, `telemetry` o `port`).

---

## 5. Aseptismo de Layout

- **Prohibición de Jacks Físicos**: Los puertos de entrada/salida no se dibujan en el panel principal ("Aseptismo Radical"). Se gestionan exclusivamente en la pestaña de `PATCHING` o mediante menús contextuales de modulación.
- **Dynamic HP**: El ancho del módulo en el rack (`hp`) se deriva de la densidad de controles y el layout resuelto, no es necesariamente un valor estático en el manifiesto.

---
*OMEGA — Documento de Referencia de Esquema Era 6*
