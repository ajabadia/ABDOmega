# [OBSOLETO - REFERENCIA HISTÓRICA SOLAMENTE]
# [OBSOLETO - REFERENCIA HISTÓRICA]
# [OBSOLETO - REFERENCIA HISTÓRICA SOLAMENTE]
# OMEGA ACE-Spec 1.0 (Hyper-ACE Edition)

> [!CAUTION]
> TEMA OBSOLETO (ERA 4.1). ESTE DOCUMENTO YA NO ES VÁLIDO PARA LA ERA 5.2+.

Este documento define el estándar técnico oficial para la creación de módulos **Hyper-ACE** en el ecosistema OMEGA 2.3.0+. A diferencia del modelo estático anterior, Hyper-ACE permite una gobernanza total del rack mediante metadatos dinámicos.

## 📦 Anatomía de un Módulo ACE

Un módulo ACE se define mediante un archivo de manifiesto YAML que reside en el directorio de recursos del motor.

### 1. Metadatos de Identidad
Todo módulo debe poseer una identidad única y aséptica.

```yaml
id: "wavetable_pro"       # Identificador técnico único (snake_case)
name: "Wavetable Pro"   # Nombre comercial legible
family: "oscillator"    # Categoría (oscillator, filter, envelope, lfo, fx, util)
engine: "Wavetable"     # El motor DSP que lo implementa (WASM)
status: "active"        # active, experimental, deprecated
version: 1
```

### 2. Definición de Parámetros (`parameters`)
Los parámetros definidos aquí se registran automáticamente en el Rack y son direccionables vía RPC.

```yaml
parameters:
  - id: "wt.index"
    label: "Position"
    min: 0.0
    max: 1.0
    default: 0.5
    unit: "pos"
```

### 3. Objetivos de Modulación (`modulationTargets`)
Define qué parámetros del módulo son visibles en la **Patchbay-Matrix**.

```yaml
modulationTargets:
    label: "WT Position"
    unit: "wav"
```

### 4. Visibilidad y Clasificación Semántica (ERA 4.1)
El sistema implementa un "Smart Bridge" para distribuir automáticamente los controles en la UI:

| Propiedad | Valor | Destino por Defecto |
| :--- | :--- | :--- |
| **Tipo de Dato** | `list`, `number`, `text` | **General Tab** (Configuración) |
| **Tipo de Dato** | `cv`, `audio`, `midi`, `voltage` | **Patching Tab** (Conectividad) |
| **Atributo YAML** | `visibility: ["back", "both"]` | Fuerza presencia en **General** |
| **Atributo YAML** | `visibility: ["front"]` | Fuerza presencia en **Rack** |

> [!NOTE]
> Los controles de configuración movidos a la pestaña **General** serán filtrados de la pestaña **Patching** para mantener la higiene visual del sistema.
```

---

## 🎨 Especificación de UI (Hyper-ACE UI)

La sección `uiLayout` y `style` permite que el Rack genere la interfaz automáticamente.

### Estilos de Panel (`style`)
El sintetizador OMEGA provee temas visuales predefinidos. El módulo debe elegir uno:
- `juno-panel`: Estética clásica Roland (azul/rojo).
- `ms20-panel`: Estética Korg MS-20 (negro/metal).
- `generic-panel`: Diseño minimalista oscuro.
- `space-echo`: Estética Roland RE-201.

### Layout de Rejilla (`uiLayout`)
El layout usa una estructura de rejilla modular dividida en **columnas** (`items`).

```yaml
style: "juno-panel"
uiLayout:
  grid:
    columns: 2      # Número de columnas principales
    gap: "large"    # small, medium, large
    items:
      - type: "knob"
        id: "wt.index"
        label: "POSITION"
        variant: "juno-orange"  # juno-red, juno-orange, white-cap
      - type: "select"
        id: "wt.table"
        label: "TABLE"
        options: ["Serum", "Waldorf", "Mutable"]
```

---

## 🚦 Ciclo de Vida del Componente

1.  **Descubrimiento**: El motor escanea `Resources/modules/*/` al inicio buscando archivos `.yaml`.
2.  **Registro**: `AceCatalog` parsea los parámetros y layouts.
3.  **Instanciación**: Al cargar un preset, el Rack solicita la UI de cada instancia.
4.  **Renderizado**: La WebUI utiliza `ModuleRenderer` para interpretar el JSON derivado del manifiesto.

## 🛠️ Buenas Prácticas
- **Asepsia**: No asumas que la WebUI conoce tu módulo. Si no está en el manifiesto, no se mostrará.
- **Naming**: Usa minúsculas y puntos para IDs (`osc.1.detune`).
- **Performance**: Mantén los manifiestos ligeros. No incluyas lógica pesada en el `uiLayout`.

---
*Referencia SDK 1.0. Build 306+.*
