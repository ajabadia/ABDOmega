# ACE: Contract Runtime Specification (Era 6)

## 1. Tesis: Aseptic Contract Runtime

La **Era 6** marca el fin de la etapa transicional de OMEGA. El sistema evoluciona de un motor impulsado por metadatos de UI ("Metadata-driven Rack") a un **Runtime Contractual Aséptico**.

En este modelo, el backend es la autoridad operacional absoluta. La UI deja de ser una entidad que "interpreta" el sintetizador para convertirse en una consumidora de contratos publicados por el motor.

### Pilares de la Era 6:
- **Convergencia sobre Contratos**: Backend y UI ya no comparten "archivos de configuración", sino un **Esquema Operacional**.
- **Independencia de Vista**: El dominio formal del sintetizador es único; el Patching, el Inspector y el Rack son simplemente **vistas** diferentes del mismo grafo.
- **Aseptismo Radical**: Eliminación de cualquier lógica de presentación dentro del núcleo DSP o el registro de parámetros.

---

## 2. El Modelo de Cuatro Capas (SOT)

OMEGA mantiene su jerarquía de 4 capas, pero refuerza la dirección del flujo de verdad:

1.  **Core**: Definición de tipos y orquestación de servicios.
2.  **Engine**: Implementación de la arquitectura de voz y el grafo de señales.
3.  **DSP**: Unidades de procesamiento atómicas (filtros, osciladores, efectos).
4.  **Plugin/Bridge**: Superficie contractual que publica el estado al frontend.

---

## 3. Entidades del Runtime

El runtime de Era 6 se define mediante cuatro conceptos fundamentales:

### A. Schema (Estático/Declarativo)
El **Schema** describe qué *puede* ser el sintetizador. Incluye los tipos de módulos disponibles, la definición de parámetros, los roles de señal y las capacidades del sistema.
- El **Manifiesto .acemm** es la fuente primaria del Schema, pero no es el runtime vivo.

### B. Graph (Topología Activa)
El **Graph** describe qué *es* el sintetizador en este momento. Es el inventario de instancias de módulos activos, sus posiciones en el rack lógico y sus conexiones.

### C. RuntimeState (Estado Vivo)
El **RuntimeState** es el flujo de valores en tiempo real: valores de parámetros, telemetría de medidores y estado de la modulación.
- Se separa estrictamente del **Graph** para permitir actualizaciones de alta frecuencia sin reconstrucciones estructurales.

### D. Commands & Events (Protocolo)

Toda interacción se realiza mediante un bus de comandos nominales y eventos de alta fidelidad:
- **Mutaciones**: `setParameter` (requiere campo `target`), `addModule`, `loadPreset`.
- **Notificaciones**: `PARAM_CHANGE` (notificación de cambio de parámetro), `telemetryUpdate`, `onStateUpdate`.

### E. Universal Routing Authority

En la Era 6 Absolute, el **RpcCommandDispatcher** es el único punto de entrada para los mensajes de la UI. El bridge actúa exclusivamente como una pasarela aséptica que delega el enrutamiento a controladores de dominio especializados.

---

## 4. El Manifiesto (.acemm) como Fuente de Semántica

En la Era 6, el manifiesto aséptico deja de ser un "manual de instrucciones para el renderizador" y pasa a ser la **Declaración de Intenciones** del módulo.

- **Identidad**: IDs semánticos únicos (notación por puntos).
- **Registry**: Registro unificado de entidades con roles claros (`control`, `stream`, `telemetry`).
- **Hints Visuales**: El manifiesto proporciona sugerencias de presentación (`tab`, `group`, `order`), pero la **View Policy** final reside en el Workspace del frontend.

---

## 5. De Aseptismo de UI a Aseptismo de Runtime

- **Eliminación de Hardcodes**: Queda prohibido el uso de lógica condicional basada en nombres de módulos en el Bridge o la UI.
- **Contratos de Binding**: Todo binding es lógico. El mapeo `ID -> EngineAddress` es resuelto por el `ParameterMetadataRegistry`.

---
*OMEGA Era 6 — Aseptic Contract Runtime*
