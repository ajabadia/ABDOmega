# ACE Meta-Engine Spec (Era 5.2) - "The Aseptic Constitution"

## 1. Filosofía de Diseño
La Era 5 consagra a OMEGA como un motor **Metadata-Driven**. El motor DSP y la WebUI son agnósticos; su comportamiento y apariencia se derivan exclusivamente del manifiesto YAML.

### Reglas Inviolables
- **Aseptismo del Rack**: Se prohíben los Jacks (conectores) en el frontal del rack. El ruteo es una actividad lógica profunda que ocurre exclusivamente en la pestaña **PATCHING** de la Modal.
- **Living YAML**: El sistema tiene autoridad para actualizar el campo `hp` del manifiesto si el layout dinámico requiere más ancho físico.
- **No-Defaults**: La dirección (`input`/`output`) y el tipo de dato deben definirse explícitamente para evitar ambigüedades.

## 2. Definición Física (Layout)

```yaml
layout:
  hp: 12                # Ancho actual (Auto-actualizado por el motor)
  min_hp: 8             # Ancho mínimo garantizado
  rack: "upper" | "lower" 
  # Alturas: upper = 3U (128.5mm), lower = 1U (44.45mm)
```

## 3. Registro de Entidades (Registry)

Un elemento del registro ya no es un "parámetro" o un "puerto", es una **Entidad Unificada**.

### Atributos Técnicos
- **id**: Identificador semántico único (Dotted notation recomendada).
- **type**: `float` | `int` | `bool` | `list` | `string`.
- **precision**: Entero (Ejem: `8`). Define la precisión del proceso DSP interno.
- **direction**: `input` | `output`.
- **roles**: Lista de capacidades (`control`, `stream`, `mod_target`, `expert`).

### Atributos de Presentación (UI)
- **tab**: Pestaña en la Modal (**MAIN**, **PATCHING**, **SETUP**, **MIDI**).
- **group**: Texto de cabecera para subagrupación visual.
- **order**: Posición relativa (0-N).
- **ui**:
    - **component**: `knob`, `slider`, `list`, `toggle`, `display`, `none`.
    - **ui_precision**: Precisión visual (Ejem: `2` para mostrar 0.00).
    - **break_after**: `true` (Fuerza salto de línea en el frontal del rack).
    - **attachments**: Lista de accesorios visuales (Ejem: led, mini-display).
    - **bind**: Canal de telemetría para attachments (Ejem: `lfo.pulse`).

## 4. Estructura de Células de Control
Los elementos en el frontal se organizan como "Células" que apilan sus accesorios verticalmente:
1. **Attachment Superior** (Ejem: LED de actividad).
2. **Componente Principal** (Ejem: Knob).
3. **Attachment Inferior** (Ejem: Display de valor formateado).

## 5. Diccionarios y Herencia
- **Lookups**: `import: "core.category.table"`.
- **Extends**: `extends: "core.element_base"`.
