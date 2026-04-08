# OMEGA: Visión General del Proyecto

## 1. Arquitectura Central: El Rack Doble Asepto
OMEGA se basa en un sistema de rack doble diseñado para ser completamente agnóstico y modular:

*   **Rack Superior (Módulos Generales)**: Reservado para utilidades globales como MIDI Trigger, Convertidores MIDI a CV, Osciloscopios y Monitores. Pueden interactuar con el mundo exterior y con otros módulos.
*   **Rack Inferior (Módulos de Generación/Audio)**: Reservado para el núcleo de síntesis (Osciladores, Filtros, Envolventes, Efectos). 

## 2. El Patchbay / Mod Matrix 2.0
Es el "sistema nervioso" de OMEGA. 
*   **Decoupled Routing**: No existen conexiones fijas entre módulos. Un oscilador no se conecta a un filtro directamente; se conectan a través del Patchbay.
*   **Sin Magia**: El sistema no realiza conexiones automáticas. Todo cableado debe estar definido en el preset o ser realizado manualmente por el usuario.

## 3. Supermodularidad (Plugins WASM)
Cada módulo es un archivo independiente (`.wasm`) ubicado en `Resources/plugins/`.
*   **Descubrimiento Basado en Binarios**: El sistema valida la existencia física del archivo `.wasm` antes de registrar el módulo. Si no hay binario, el módulo no existe en el catálogo.
*   **Vinculación Dinámica de Metadatos**: Al detectar un binario, el Host vincula automáticamente su **Manifiesto YAML** (Nombre, Categoría, Parámetros) buscándolo en la carpeta de plugins o en el registro global `Resources/ace/`.
*   **Hot-Pluggable (Session Ready)**: Los módulos se cargan en memoria al inicio de la sesión para garantizar estabilidad y rendimiento ultra-rápido en la interfaz.

## 4. Registro y Exploración Integrada
OMEGA abandona los selectores de archivos tradicionales en favor de un **Module Registry** profesional:
*   **Navegación por Categorías**: Organización automática en OSC, FILTER, ENV, FX, UTILITY basándose en los metadatos del manifiesto.
*   **Panel de Detalles**: Cada módulo ofrece una descripción funcional, versión e iconos/ilustraciones para facilitar la selección.
*   **Inyección en Tiempo Real**: Los módulos se pueden añadir al rack dinámicamente mediante el menú "Add Module", integrándose instantáneamente en el grafo de procesamiento.

## 5. Interfaz Gráfica Declarativa (GUI Sets)
La UI es responsabilidad del **Módulo Central (Host)**, eliminando el acoplamiento visual:
*   **Filosofía Aséptica**: Se han eliminado tecnicismos como "Tabula Rasa" o "WASM" de la interfaz de cara al usuario, centrándose en términos puramente musicales y de flujo de señal.
*   **Manifiesto de UI**: El módulo declara qué controles necesita (Knobs, Sliders, Switches, LEDs) y sus etiquetas.
*   **Skins y Fallbacks**: El Host gestiona los sets gráficos (Juno, JP, etc.), garantizando que la interfaz siempre se sienta premium y coherente.

## 5. El Rack como Editor
El Módulo Central actúa como Host y como **Editor de Presets**:
*   **Gestión Dinámica**: Añadir, mover (estéticamente) y eliminar módulos en tiempo real.
*   **Persistencia Total**: Los presets guardan las rutas de los archivos de los módulos, sus posiciones en el rack y todo el cableado del Patchbay.
*   **Operaciones de Preset**: Carga, Guardado, Guardar como, y Eliminación.

## 6. Guía de Desarrollo de Módulos (Era 4)

El desarrollo de módulos en OMEGA se basa en la separación total de la lógica DSP (WASM) y la declaración de capacidades (YAML).

### 6.1 Estructura del Plugin
Para que un módulo sea "Session-Ready", debe estar presente en `Resources/plugins/`:
*   `nombre_modulo.wasm`: El binario compilado (C++/Rust/AssemblyScript).
*   `nombre_modulo.yaml`: El manifiesto que vincula el binario con el Host.

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
