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
*   **Hot-Pluggable**: Se pueden añadir o registrar módulos sin necesidad de recompilar la aplicación central.
*   **Autodescubrimiento**: Al cargar un módulo, el Host lee su **Manifiesto** (Nombre, Versión, Tipo, Entradas/Salidas y Skin sugerida).

## 4. Interfaz Gráfica Declarativa (GUI Sets)
La UI es responsabilidad del **Módulo Central (Host)**, no del módulo individual.
*   **Manifiesto de UI**: El módulo declara qué controles necesita (Knobs, Sliders, Switches, LEDs) y sus etiquetas. No define posiciones exactas.
*   **Skins (GUI Sets)**: El módulo puede sugerir un set gráfico (Juno, JP8000, Space Echo). 
*   **Fallback Universal**: Si no hay un skin definido o disponible, el Host utiliza el **"Conjunto por Defecto"**.
*   **Sets Gráficos Asépticos**: Los activos visuales y el CSS son gestionados por el Host y son independientes de la lógica del módulo.

## 5. El Rack como Editor
El Módulo Central actúa como Host y como **Editor de Presets**:
*   **Gestión Dinámica**: Añadir, mover (estéticamente) y eliminar módulos en tiempo real.
*   **Persistencia Total**: Los presets guardan las rutas de los archivos de los módulos, sus posiciones en el rack y todo el cableado del Patchbay.
*   **Operaciones de Preset**: Carga, Guardado, Guardar como, y Eliminación.

## 6. Ejecución y Prioridades
Pendiente de definir un sistema de prioridades de ejecución para evitar colisiones cuando varios módulos compiten por el procesamiento, asegurando que el flujo de audio y control sea determinista.
