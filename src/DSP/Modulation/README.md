# OMEGA Modulation System

Este módulo implementa el sistema de ruteo de señales de audio-rate y control-rate mediante un grafo dirigido acíclico (DAG) que se compila para ejecución optimizada en tiempo real.

## Arquitectura

El sistema se divide en dos capas estrictas:

1.  **ModulationGraph (Message Thread)**: 
    - Capa lógica donde se definen nodos y conexiones.
    - Realiza la ordenación topológica (Algoritmo de Kahn).
    - Detecta ciclos ilegales.
    - Compila a un `ModulationRuntime`.

2.  **ModulationRuntime (Audio Thread)**:
    - Estructura plana y cache-friendly.
    - Ejecución secuencial determinista.
    - Cero alocaciones de memoria y cero bloqueos.

## Tipos de Nodos (NodeType)

- `LFO`: Generador de formas de onda periódicas.
- `Envelope`: Envolventes ADSR o multi-etapa.
- `MIDIInput`: Captura de Velocity, ModWheel, PitchBend.
- `Mix`: Sumador de señales con pesos.
- `Multiply`: Multiplicador de señales (útil para VCAs o profundidad de modulación).
- `Curve`: Remapeo de señal mediante funciones matemáticas (Exp/Log/S-Curve).
- `Sinks`: Nodos de destino (`VoicePitch`, `FilterCutoff`).

## Cómo añadir un nuevo Nodo

Para extender el sistema con un nuevo tipo de procesamiento:

1.  Añade el tipo en el enum `NodeType` en `ModulationGraph.h`.
2.  Define el estado necesario en la union `RuntimeNode::state` en `ModulationRuntime.h`.
3.  Implementa la lógica de procesado en `ModulationRuntime::processNode` (dentro del `switch`).
4.  (Opcional) Implementa el mapeo en `ModulationGraph::compile()` si el nodo requiere configuración especial desde la capa lógica.

## Thread Safety

- **NUNCA** modifiques el `ModulationGraph` desde el Audio Thread.
- El `ModulationRuntime` es **inmutable** una vez compilado. Si quieres cambiar la estructura, compila uno nuevo y cámbialo mediante un puntero atómico (o espera al siguiente bloque).
