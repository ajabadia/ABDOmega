# OMEGA: ACEPACK Module Standard (v1.0)

Este documento define el estándar técnico para la creación de módulos en la **Era Hyper-ACE**. El objetivo es garantizar la interoperabilidad, el auto-descubrimiento y la coherencia visual en todo el ecosistema OMEGA.

## 🏛️ Estándar de Naming (Semántica Unificada)

Para evitar colisiones y permitir un enrutamiento aséptico, OMEGA usa una **Notación Semántica por Puntos** (`Dotted.Semantic.Notation`).

### 1. Namespaces de Código (C++)
- `Omega::Core`: Lógica de datos, presets y proveedores.
- `Omega::Engine`: Compilador de voces, grafos de modulación y runtime.
- `Omega::DSP`: Procesamiento de señal puro (Stateless).

### 2. Identificadores de Parámetros (RPC/ValueTree)
Formato: `familia.instancia.parámetro`
- Ejemplo: `osc.1.saw.level`
- Ejemplo: `filter.a.cutoff`
- Ejemplo: `delay.master.feedback`

### 3. Identificadores de Módulo (Bundle ID)
Formato: `snake_case` (Basado en el nombre de la carpeta)
- `osc_va` (Juno DCO)
- `flt_korg_035` (MS-20 Filter)

---

## 📦 Estructura del Módulo Atómico

Un módulo es una carpeta autosuficiente con la siguiente estructura:

```text
/Resources/modules/my_oscillator/
├── my_oscillator.yaml   # Manifiesto ACE (Metadatos + UI Layout)
├── my_oscillator.wasm   # Lógica DSP (WebAssembly)
└── assets/              # (Opcional) Iconos o recursos específicos
```

### El Manifiesto (`manifest.yaml`)
El manifiesto es la única fuente de verdad para el Rack.

```yaml
id: "osc_custom_01"
name: "Hyper-Saw 3000"
family: "oscillator"
engine: "VirtualAnalog"

# --- Definición de Puertos (Patchbay) ---
ports:
  - { id: "out", label: "MAIN OUT", type: "audio", dir: "output" }
  - { id: "pitch", label: "V/OCT", type: "cv", dir: "input" }

# --- Gobernanza Visual (Dynamic UI) ---
# Los módulos eligen su Identidad Visual de un catálogo de temas de OMEGA.
ui:
  style: "jp8000"      # jp8000, ms20, juno, moog, space-echo, generic
  grid: { columns: 2 }
  controls:
    - { id: "detune", type: "knob", label: "DETUNE", pos: [0, 0] }
    - { id: "spread", type: "knob", label: "SPREAD", pos: [0, 1] }
```

---

## 🎨 Protocolo de UI Dinámica

1.  **Diferenciación Visual**: Cada módulo mantiene su propia estética (JP vs Korg) mediante la propiedad `style`. 
2.  **Temas Centralizados**: OMEGA provee el CSS y los assets para cada estilo. El desarrollador de un módulo solo dice qué estilo quiere usar. 
3.  **Asepsia de Assets**: Un desarrollador de módulo no necesita incluir imágenes de knobs; simplemente pide un "knob" y el sistema le da el del estilo seleccionado. 
4.  **Coherencia Dinámica**: Si mejoramos la resolución de un knob del tema "Moog", todos los módulos que usen ese estilo se beneficiarán sin recompilar.

---

## 🚦 Visibilidad Inteligente (Smart Visibility)

En la Era 4.1, OMEGA automatiza el ruteo de controles basándose en su tipo de dato. Al diseñar un pack, ten en cuenta:
- **Default Back**: Los parámetros de tipo `list`, `number` y `text` se asignan automáticamente al **Configuration Tier** (Pestaña General).
- **Default Front**: Los parámetros continuos (`knob`, `slider`, `button`) permanecen en el **Performance Tier** (Rack).
- **Control Manual**: Usa el metadato `visibility: ["front", "back", "both"]` para anular esta lógica.

---

## ⚡ Implementación del DSP

### Estrategia Era 4.1
- **Built-in**: Módulos core integrados en el binario de OMEGA (C++ Nativo).
- **WASM Payload**: Lógica en **WebAssembly (WASM)**. Estándar oficial para módulos de terceros. Ofrece latencia cero y aislamiento de memoria.
- **External Binary (AOT)**: Binarios pre-compilados (C-ABI estable) para casos de extrema complejidad DSP en plataformas específicas.
- **Legacy Scripting**: Soporte opcional para **LuaJIT** en parches rápidos.

---
*Documento de Referencia de la Era Hyper-ACE.*
