# DEVELOPMENT RULES (Era 6 — Aseptic Contract Runtime)

Estas reglas son de cumplimiento obligatorio para cualquier contribución al núcleo de OMEGA.

---

## 1. Real-Time Safety (DSP Layer)

1.  **Prohibición de Alocaciones**: Jamás uses `new`, `malloc` o cualquier operación que pueda bloquear el hilo de audio en el `processBlock`.
2.  **No Blocking**: Queda prohibido el uso de mutexes, locks o operaciones de I/O en la capa DSP.
3.  **Comunicación Asíncrona**: Usa estructuras `Lock-Free` (RingBuffers, Atoms) para transferir datos entre el hilo de audio y el hilo de UI/Mensajería.

---

## 2. Integridad Contractual (Era 6)

1.  **Autoridad del Backend**: El backend es la única autoridad operacional. La UI debe sincronizarse mediante el contrato publicado (`Schema`, `Graph`, `RuntimeState`).
2.  **Prohibición de Descriptores Hardcoded**: Queda prohibido añadir descriptores manuales en `moduledescriptors.js` para nuevos módulos. Todo módulo debe descubrirse dinámicamente a través del schema.
3.  **IDs Semánticos**: Usa siempre la notación de puntos (`vendor.package.module.entity`). Nunca uses índices mágicos o punteros directos persistidos.
4.  **Separación Schema vs State**: No mezcles metadatos de definición con valores de ejecución. El esquema es estático/semicambiante; el estado es un flujo continuo.

---

## 3. Arquitectura de Mando y Control

1.  **Patrón Command/Event**: La única vía para mutar el estado del motor desde la UI es a través de comandos nominales enviados al **RpcCommandDispatcher**. La UI nunca escribe directamente en la memoria del core.
2.  **Aseptismo de Controladores**: Todo controlador de dominio debe implementar el método `registerCommands(RpcCommandDispatcher& dispatcher)` para centralizar su lógica de enrutamiento.
3.  **Integridad de Notificaciones**: Los cambios en parámetros vivos deben notificar a la UI exclusivamente mediante el evento estándar `PARAM_CHANGE`.
4.  **Aseptismo Radical**: El código de renderizado no puede contener lógica condicional específica de un módulo. Si un módulo necesita una UI especial, esta debe definirse mediante un `Widget` registrado y referenciado en el esquema.
5.  **Zero-Coupling**: El núcleo DSP no debe saber nada de la existencia de una WebUI. La integración se realiza exclusivamente a través del `ParameterMetadataRegistry`.

---

## 4. Estándares de Código

1.  **TypeScript Supremacy**: Todo el código de frontend debe ser TypeScript estricto. No se permite código JS sin tipado.
2.  **C++ Moderno**: Usa estándares C++17/20. Prioriza el uso de RAII y contenedores seguros de JUCE/STL.
3.  **Documentación al día**: Cualquier cambio en el contrato de API debe reflejarse inmediatamente en la especificación ACE correspondiente.

---

## 5. Asepsia de Representación (UI Layout)

1.  **Foco en el Espacio de Trabajo**: La interfaz principal debe dedicarse exclusivamente a la visualización estructural y el flujo de señales (Sanctuary Hub).
2.  **Edición Desacoplada**: El ajuste detallado de parámetros y propiedades de entidad debe realizarse mediante **Sistemas de Capas (Modals)**. No se permite el desplazamiento de la interfaz principal por paneles laterales de edición estática.
3.  **Jerarquía de Información**: Las ayudas visuales (iconos, ilustraciones) deben ser contextuales. Prioriza la precisión técnica sobre la estética decorativa en vistas de ingeniería.

---
*Cualquier desviación de estas reglas requiere una revisión de arquitectura por parte del equipo core.*
