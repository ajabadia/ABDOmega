# OMEGA: Visión General del Proyecto

## 1. Arquitectura Central: El Rack Doble Asepto
OMEGA se basa en un sistema de rack doble diseñado para ser completamente agnóstico y modular:

*   **Rack Superior (Aux/Utility)**: Reservado para utilidades globales como MIDI Trigger, Convertidores MIDI a CV, Osciloscopios y Monitores.
*   **Rack Inferior (Main/Core)**: Reservado para el núcleo de síntesis (Osciladores, Filtros, Envolventes, Efectos).

### 1.1 Algoritmo de Ruteo Inteligente (Era 4.1)
Para mantener la asepsia del sistema, la posición de un módulo no está hardcodeada, sino que se determina mediante la siguiente jerarquía de prioridad:

1.  **Estado de Instancia**: Si el estado dinámico del preset define un rack específico, este tiene prioridad absoluta.
2.  **Metadato del Manifiesto**: Si el estado es indefinido, se consulta el campo `rack` en el archivo `.yaml` del módulo.
3.  **Fallback Semántico**: Si el manifiesto no especifica rack pero define `panelClass: "utility-panel"`, el sistema lo direccionará automáticamente al **Rack Inferior** (liberando espacio en el superior).
4.  **Default Global**: Cualquier módulo que no cumpla las condiciones anteriores se cargará en el **Rack Superior** (Aux/Utility) por defecto. El **Rack Inferior** queda reservado para el núcleo de generación y módulos que declaren explícitamente `rack: "lower"` o `rack: "main"`.

## 2. El Patchbay / Mod Matrix 2.0
Es el "sistema nervioso" de OMEGA. 
*   **Decoupled Routing**: No existen conexiones fijas entre módulos. Un oscilador no se conecta a un filtro directamente; se conectan a través del Patchbay.
*   **Sin Magia**: El sistema no realiza conexiones automáticas. Todo cableado debe estar definido en el preset o ser realizado manualmente por el usuario.

## 3. Supermodularidad (Arquitectura de Módulos Atómicos)
Cada módulo es un ciudadano independiente y soberano que reside en su propia subcarpeta dentro de `Resources/modules/`.
*   **Encapsulamiento Atómico**: La carpeta del módulo contiene todo lo necesario para su existencia: el binario (`.wasm`), su manifiesto (`.yaml`) y sus recursos locales (ilustraciones, tablas de datos).
*   **Descubrimiento Basado en Estructura**: El motor de OMEGA escanea el directorio de módulos y registra cada subcarpeta válida como un componente ACE. 
*   **Segregación de Deuda Técnica**: No se permiten archivos sueltos ni registros globales. Cualquier componente que no siga el estándar de Módulo Atómico será ignorado o movido a la carpeta `legacy/` para evitar colisiones con el núcleo de la Era 4.
*   **Hot-Pluggable (Session Ready)**: Los módulos se cargan en memoria al inicio de la sesión, garantizando que el parcheado sea instantáneo y libre de accesos a disco en tiempo de performance.

## 4. Registro y Exploración Integrada
OMEGA abandona los selectores de archivos tradicionales en favor de un **Module Registry** profesional:
*   **Navegación por Categorías**: Organización automática en OSC, FILTER, ENV, FX, UTILITY basándose en los metadatos del manifiesto.
*   **Panel de Detalles**: Cada módulo ofrece una descripción funcional, versión e iconos/ilustraciones para facilitar la selección.
*   **Inyección en Tiempo Real**: Los módulos se pueden añadir al rack dinámicamente mediante el menú "Add Module", integrándose instantáneamente en el grafo de procesamiento.

## 5. Arquitectura UI Semántica (Desacoplamiento Total)
OMEGA implementa una separación estricta entre la **intención funcional** del módulo y su **representación visual**, permitiendo que los temas (skins) decidan la ejecución estética final.

*   **Semántica (Qué hace)**: El módulo declara el tipo de interacción (ej. `list`, `scalar`, `toggle`, `port`, `telemetry`).
*   **Look (Cómo se ve)**: El módulo sugiere una intención visual (ej. `display`, `knob`, `slider`, `jack`, `led`). El tema elegido por el usuario decide cómo renderizar esa combinación.
*   **Filosofía de Resiliencia**: Si un tema no soporta un `look` específico, el sistema garantiza un fallback funcional (ej. un `list` con `look: display` revertirá a un `select` estándar si el tema es minimalista).

### 5.1 Catálogo Semántico de Controles (Era 4.1)
El sistema clasifica el hardware virtual por su **intento funcional**. Un módulo pide una función y una variante (A, B, C...); el tema decide la estética:

1.  **Entrada de Datos Contínuos**:
    *   `scalar` + `look: knob`: Perillas para parámetros precisos.
    *   `scalar` + `look: slider`: Deslizadores (Vertical/Horizontal) para envolventes o mezcla.
    *   `vector` + `look: joystick`: XY Pads para síntesis vectorial.
    *   `vector` + `look: wheel`: Benders y Mod Wheels.
2.  **Selectores e Interruptores**:
    *   `trigger` + `look: button`: Acciones momentáneas (Push Buttons).
    *   `toggle` + `look: switch`: Interruptores de palanca o deslizantes (On/Off).
    *   `list` + `look: display`: Pantallas digitales (LED, OLED, LCD) con navegación `< >`.
    *   `list` + `look: select`: Listas desplegables clásicas.
3.  **Visualización y Retroalimentación**:
    *   `telemetry` + `look: display`: Lecturas numéricas exactas.
    *   `telemetry` + `look: meter`: Vúmetros de señal o modulación.
    *   `telemetry` + `look: led`: Indicadores luminosos de estado.
    *   `monitor` + `look: scope`: Osciloscopios en tiempo real.
    *   `label`: Etiquetas de texto para organización.
4.  **Controles Especializados**:
    *   `keyboard`: Teclado virtual MIDI.
    *   `graph` + `look: adsr`: Visualizadores interactivos de curvas de envolvente.
    *   `panel` + `look: imagemap`: Fondos interactivos personalizados.

### 5.2 Sistema de Variantes (A, B, C...)
Los temas pueden exponer un **catálogo de piezas**. Un módulo puede solicitar `variant: "large"` o `variant: "A"`.
*   **Fallback Automático**: Si el tema no define la variante solicitada, el sistema utilizará automáticamente el diseño por defecto del tema para ese control. Sin errores, sin rupturas.

## 11. Arquitectura de Parcheo y Tipos de Datos (Patchbay 2.0)

Para evitar errores de ruteo y mejorar la claridad visual, OMEGA utiliza un sistema de códigos de color basado en el tipo de dato que transporta cada pin.

### 11.1 Tabla de Colores de Pins
| Color | Tipo de Dato | Aplicación Común |
| :--- | :--- | :--- |
| **Azul** | `voltage` (DSP) | Audio, LFOs, Modulación de alto rango |
| **Amarillo** | `midi` | Notas, Velocidad, CCs |
| **Verde** | `list` | Datos de selección de menús |
| **Cian** | `float` (GUI) | Posiciones de perillas y parámetros de control |
| **Rojo** | `text` | Etiquetas, Nombres de Presets |
| **Negro** | `bool` | Señales lógicas, Interruptores On/Off |

### 11.2 Reglas de Compatibilidad
*   **Incompatibilidad Directa**: No se pueden conectar pines de tipos distintos si causan colisiones de datos (ej. un pin **Amarillo/MIDI** no puede ir directo a un pin **Azul/Voltaje** sin un módulo conversor intermedio).
*   **Retroalimentación Visual**: El LED del jack emitirá un brillo con el color correspondiente al tipo de dato cuando la señal esté activa.

## 6. El Rack como Editor
El Módulo Central actúa como Host y como **Editor de Presets**:
*   **Gestión Dinámica**: Añadir, mover (estéticamente) y eliminar módulos en tiempo real.
*   **Persistencia Total**: Los presets guardan las rutas de los archivos de los módulos, sus posiciones en el rack y todo el cableado del Patchbay.
*   **Operaciones de Preset**: Carga, Guardado, Guardar como, y Eliminación.

## 6. Guía de Desarrollo de Módulos (Era 4)

El desarrollo de módulos en OMEGA se basa en la separación total de la lógica DSP (WASM) y la declaración de capacidades (YAML).

### 6.1 Estructura del Módulo Atómico
Para que un módulo sea reconocido por el sistema, debe seguir esta estructura de carpetas en `Resources/modules/`:

```
Resources/modules/
└── id_del_modulo/
    ├── id_del_modulo.wasm  <-- Binario DSP
    └── id_del_modulo.yaml  <-- Manifiesto ACE
```

### 6.2 Schema del Manifiesto ACE
Un manifiesto válido debe contener:
*   **Identidad**:
    *   `id`: Identificador único (suele coincidir con el nombre del archivo).
    *   `implementationId`: ID numérico para el despacho rápido en el motor C++.
    *   `family`: Categoría para el Module Browser (`OSC`, `FILTER`, `ENV`, `FX`, `LFO`, `UTILITY`).
*   **Documentación**:
    *   `description`: Texto explicativo que aparecerá en el navegador.
    *   `icon`: Identificador de icono aséptico (ej. `osc-va`, `filter-drp`).
*   **Contrato de Señales (Ports)**:
    *   `type`: `cv` (control), `midi` (datos), `gate` (disparo), `audio`.
    *   `direction`: `input` o `output`.
*   **Parámetros**:
    *   Definiciones de `min`, `max` y `default`. El Host genera automáticamente los controles UI basándose en estos rangos.

### 6.3 Ciclo de Procesamiento
1.  **Carga**: El Host descubre el binario y reserva memoria en el runtime WAMR.
2.  **Mapeo**: El Host vincula los puertos definidos en el YAML con los buffers de entrada/salida del motor WASM.
3.  **Ejecución**: El motor invoca la función `process()` del módulo a la frecuencia de muestreo del Host, garantizando latencia cero.

## 8. Jerarquía de Namespaces y Estructura de Código

OMEGA utiliza una jerarquía de namespaces estricta para garantizar que las capas de la aplicación permanezcan desacopladas (Arquitectura Aseptizada).

*   `Omega::Core`: El cerebro del sistema. Contiene el catálogo ACE, el motor de WASM, y la gestión de Presets. No tiene conocimiento de JUCE ni de la UI.
*   `Omega::Engine`: La sala de máquinas DSP. Contiene el `VoiceRuntime`, la compilación de arquitectura de voces y el motor de modulación. 
*   `Omega::UI`: La capa de mediación. Aquí residen los controladores RPC (`RpcPresetController`, etc.) y el bridge que traduce JSON a comandos internos.
*   `Omega::Plugin`: La piel del sistema. Es la única capa que interactúa directamente con el framework JUCE y la gestión de parámetros del DAW.
*   `Omega::DSP`: Primitivas de audio reutilizables (osciladores, filtros básicos) que son consumidas por el `Engine`.

### 8.1 Regla de Oro del Desacoplamiento
Ningún archivo dentro de `Core` o `Engine` debe incluir headers de `juce`. Toda interacción con el host o la interfaz debe ser mediada por la capa `UI` a través de interfaces deterministas.

## 9. Convenciones de Nomenclatura (Naming)

Para mantener la legibilidad y coherencia en un entorno políglota (C++, TypeScript, YAML), OMEGA sigue estas reglas:

### 9.1 Código C++ (Backend)
*   **Clases / Structs / Enums**: `PascalCase` (ej. `OmegaAudioProcessor`, `ComponentInfo`).
*   **Métodos / Funciones**: `camelCase` (ej. `loadFromPluginDirectory`).
*   **Miembros de Clase**: Prefijo `m` + `camelCase` (ej. `mCatalog`, `mEngine`).
*   **Variables Locales**: `camelCase` (ej. `wasmFile`, `anyFound`).
*   **Constantes / Macros**: `SCREAMING_SNAKE_CASE` (ej. `MAX_VOICES`).

### 9.2 Archivos y Recursos
*   **Headers/Sources C++**: `PascalCase` coincidiendo con la clase principal (`AceCatalog.h`).
*   **Módulos WASM y Manifiestos YAML**: `snake_case` (`midi_in.wasm`, `midi_2_cv.yaml`). Esto garantiza compatibilidad de red y sistemas de archivos.
*   **Identificadores (IDs)**: `snake_case` o `kebab-case` dependiendo del contexto ACE, pero preferiblemente `snake_case` para coincidir con nombres de archivo.

### 9.3 Interfaz (WebUI / RPC)
*   **Propiedades JSON**: Estrictamente `camelCase` (`modelId`, `panelClass`).
*   **Componentes React/Lit**: `PascalCase` (`ModuleBrowser`).
*   **Estilos CSS**: `kebab-case` (`.module-browser-modal`).

## 10. Identificadores Canónicos de Componentes (Era 4)

Esta sección define los IDs de componente **únicos e inamovibles** del sistema. Todo código C++, YAML o TypeScript debe usar exactamente estos identificadores — sin variantes, sin traducción en runtime.

### 10.1 Regla Fundamental
El ID de un componente **siempre** es `snake_case` y **siempre** coincide con el nombre del archivo `.wasm`/`.yaml` en `Resources/modules/` o `Resources/ace/`.

```
nombre_del_archivo.wasm  ==  nombre_del_archivo.yaml  ==  id: "nombre_del_archivo"
```

### 10.2 Catálogo de IDs Canónicos

| ID Canónico         | Nombre Visible       | Familia   | Ubicación              |
|---------------------|----------------------|-----------|------------------------|
| `patchbay_matrix`   | Patchbay Matrix      | System    | `Resources/ace/system.yaml` |
| `midi_in`           | MIDI Input           | Utility   | `Resources/ace/midi_in.yaml` |
| `midi_2_cv`         | MIDI to CV           | Utility   | `Resources/modules/midi_2_cv.yaml` |

### 10.3 IDs Prohibidos (Legacy — Era 2/3)

Los siguientes identificadores son **inválidos** y no deben usarse en ningún punto del código:

*   `PATCHBAY-MATRIX-001` → usar `patchbay_matrix`
*   `PATCHBAY-MATRIX` → usar `patchbay_matrix`
*   `MIDI-IN-001` → usar `midi_in`
*   `OSC-VA-001`, `FILTER-JUNO-001`, etc. → pendiente de definición en Era 4

### 10.4 Visibilidad de Sistema

Los componentes del núcleo del sistema (como `patchbay_matrix`) se declaran con `visible: false` en su manifiesto YAML. El `ModuleBrowser` filtra automáticamente estos componentes. La comprobación de exclusión en el rack usa la igualdad **estricta** (`componentId === "patchbay_matrix"`), no coincidencia parcial ni insensibilidad a mayúsculas.

### 10.5 Gestión de Ilustraciones de Módulo

Cada módulo puede tener una ilustración SVG asociada. La convención es **"cero configuración"**: no es necesario declarar la ruta en el YAML; si el archivo existe, se carga automáticamente.

#### Ubicación canónica
```
ui/assets/modules/{id}/illustration.svg
```

donde `{id}` es el ID canónico del módulo (snake_case). Ejemplos:

```
ui/assets/modules/midi_in/illustration.svg
ui/assets/modules/midi_2_cv/illustration.svg
ui/assets/modules/patchbay_matrix/illustration.svg
```

#### Descubrimiento automático
El `ModuleBrowser` construye la ruta dinámicamente a partir del ID del componente:
```typescript
const autoPath = `assets/modules/${id}/illustration.svg`;
```
No se requiere el campo `illustration` en el manifiesto YAML; si el archivo existe el WebView lo sirve. Si no existe, el navegador activa el `onerror` y muestra el **icono emoji de fallback** (definido por la familia del módulo: `osc-analog` → 🔊, `midi-util` → 🎹, etc.).

#### Servicio de assets
El servidor de recursos del WebView (JUCE `ResourceProvider`) sirve todos los archivos de `ui/` — incluyendo `ui/assets/` — como si fueran rutas relativas al `index.html`. Esto garantiza que las rutas relativas simples funcionen sin configuración adicional.

#### Formato recomendado
SVG minimalista, monocromático o dual-color, sobre fondo transparente. Tamaño de diseño: `64×64` o `128×128` px. Se escala mediante CSS (`object-fit: contain`).
