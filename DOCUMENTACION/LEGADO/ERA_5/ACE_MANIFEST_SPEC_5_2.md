# OMEGA ACE Manifest Specification (Era 5.2 - Aseptic Gold)

Esta especificación técnica define el estándar para la creación de manifiestos YAML en el ecosistema OMEGA Era 5.2+. El objetivo es garantizar el **Aseptismo Radical**, la **Telemetría Bilateral** y el **Auto-escalado Físico**.

## 1. Identidad de Módulo
Todo módulo debe declarar su identidad aséptica.
```yaml
id: "osc_va"              # ID Canónico (snake_case)
modelId: "ACE-OSC-VA-001" # ID de Modelo Industrial
implementationId: 101     # ID de despacho rápido en C++
version: "5.2.0"          # Versión del manifiesto
family: "Oscillator"      # Categoría del Navegador
```

## 2. Layout Físico (Living YAML)
El rack de OMEGA utiliza el estándar de **HP (Horizontal Pitch)**. El motor tiene autoridad para auto-actualizar este campo si el layout dinámico lo requiere.
```yaml
layout:
  hp: 8            # Ancho inicial en HP
  min_hp: 4        # Ancho mínimo permitido
  rack: "lower"    # Ubicación sugerida (upper, lower)
  columns: 2       # Número de columnas para Células de Control
```

## 3. Registro Unificado (Registry)
En la Era 5.2, desaparecen los bloques segregados. Todo (parámetros, señales, puertos) se define en un único `registry`.

### Roles de Entidad
El campo `roles` determina el comportamiento y renderizado automático:
- `control`: Elemento interactivo (Knob, Slider, Switch).
- `telemetry`: Fuente de datos visuales (LED, Meter, Display).
- `stream`: Flujo de señales constante (Audio, CV, MIDI).
- `input` / `output`: Define la dirección en el Santuario de Patching.

## 4. UI y Células de Control
OMEGA organiza la interfaz en **Células de Control** (apilamiento vertical).
```yaml
presentation:
  tab: "MAIN"         # Ubicación (MAIN o PATCHING)
  group: "PITCH"      # Agrupación semántica
  order: 1            # Orden dentro del grupo
  ui:
    component: "knob" # Tipo de control físico
    precision: 3      # Precisión DSP (decimales)
    attachments:      # Elementos secundarios vinculados
      - { type: "led", color: "orange", bind: "self" }
```

## 5. El Santuario de Patching
Cualquier entidad con dirección `output` o `input` aparecerá automáticamente en la pestaña **PATCHING** de la modal. Queda **ESTRICTAMENTE PROHIBIDO** renderizar conectores de tipo "Jack" en el panel frontal del rack (Pestaña MAIN).

## 6. Telemetría y Reactividad
- **Frecuencia**: El motor de OMEGA procesa telemetría visual a 60Hz.
- **Decay**: Los LEDs y Meters en la WebUI implementan un decaimiento visual orgánico mediante CSS transitions.

## 7. Estilo y Personalización (Themes)
OMEGA permite el desacoplamiento estético total de los módulos a través de "Skills de Visualización" o **Themes**.

### Metadato `theme`
Se declara en el raíz del manifiesto:
```yaml
theme: "industrial" # Opciones: industrial, default, etc.
```

### Jerarquía de Fallback (Vínculos de Estilo)
El sistema de renderizado sigue una cadena de herencia rígida para asegurar la operatividad:
1.  **Tema Específico**: Si el manifiesto declara un tema, se inyectan sus variables CSS y fuentes.
2.  **Tema General (Default)**: Si el tema carece de un elemento (ej: una fuente o color), hereda automáticamente del tema "asepsis" general.
3.  **Rack Estándar**: El chasis y el contenedor del rack son inmutables y proporcionan el marco físico para los módulos.

> [!NOTE]
> Cada tema puede (y debe) definir su propia **firma tipográfica** para otorgar personalidad única al módulo sin romper la alineación Eurorack de 3U.
