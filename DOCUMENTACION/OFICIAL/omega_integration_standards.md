# OMEGA: Estándares de Arquitectura y Desarrollo (Source of Truth)

Este documento define las reglas de oro para la creación, refactorización e integración de cualquier componente dentro del ecosistema OMEGA. Cualquier módulo extraído de otros proyectos (como JUNiO 601) debe ser validado contra este estándar.

## 1. Filosofía de Diseño: "Skeuomorphic Hybrid"
OMEGA separa radicalmente la **Estética y Control** (WebUI + JS) de la **Generación y Procesamiento** (C++ + JUCE).
- **Control Invariable**: El motor DSP es agnóstico a la UI. Solo recibe "Snapshots" de configuración.
- **Telemetría Transparente**: El motor no envía datos a la UI; los publica en un `Hub` central y la UI los consume bajo demanda.

## 2. Mapa Definitivo de Namespaces
| Namespace | Responsabilidad | Ejemplo |
| :--- | :--- | :--- |
| `Omega::Core::Preset` | Estructuras de datos, Serialización (ValueTree), Versionado. | `OmegaPreset` |
| `Omega::Core::Service` | Fachadas y Gestores de Estado. | `EngineConfigManager` |
| `Omega::Core::Input` | MIDI, MPE, ModSources dinámicos. | `OmegaInput` |
| `Omega::Core::Modulation` | Lógica de ruteo, Telemetría y Grafos. | `ModulationTelemetryHub` |
| `Omega::DSP::Engines` | Motores de síntesis (Voice Management, Rendering). | `VirtualAnalogEngine` |
| `Omega::DSP::Core` | Bloques básicos (Osciladores, Filtros, Atuadores). | `OscillatorJunoDco` |
| `Omega::DSP::FX` | Procesadores de efectos globales o por voz. | `SpaceEchoProcessor` |
| `Omega::UI` | El puente RPC Native <-> Web. | `OmegaUiBridge` |

---

## 3. El Ciclo de Vida del Parámetro (Single Source of Truth)
Para que un knob en la WebUI afecte al sonido, debe seguir este camino sin saltarse escalones:

1. **WebUI**: El componente JS llama a `omegaRPC.setParam("ID", value)`.
2. **Bridge**: `OmegaUiBridge` recibe el JSON y llama a `mProcessor->setParameter(ID, value)`.
3. **Host/APVTS**: El procesador actualiza el `APVTS` de JUCE.
4. **ParamCache**: El audio thread lee el valor atómico del APVTS y lo guarda en `mParamCache` (lock-free).
5. **Update Loop**: En `updateParameters()`, se llama a `mEngineConfig.updateParameter(ID, value)`.
6. **Snapshot**: `EngineConfigManager` crea una copia inmutable y la intercambia atómicamente.
7. **DSP**: El motor aplica los cambios en el siguiente `renderNextBlock`.

## 4. Reglas Críticas del Audio Thread (C++ DSP)
- **Zero Allocations**: Prohibido usar `new`, `malloc` o `std::vector::push_back` en el loop de audio.
- **Zero STL Containers**: Evitar `std::map` o `std::string` en tiempo real. Usar `std::array` o buffers pre-asignados.
- **Zero Locks**: No usar `std::mutex`. Toda la comunicación debe ser vía `std::atomic` o `lock-free ringbuffers`.

## 5. Sistema de Telemetría (Real-time Feedback)
Los visualizadores (Osciloscopio, FFT, Medidores) consumen datos del `ModulationTelemetryHub`.
- **Audio Tap**: Señales de audio deben sub-murearse (típicamente 1 cada 32 muestras) antes de enviarse al Hub.
- **Mod Tap**: Señales de modulación (LFO, ENV) se envían una vez por bloque.
- **Indices**: Deben estar registrados en `ModulationTelemetryIndex.h`.

## 6. Integración de Nuevos Módulos (Guía de Refactorización)
Para traer un módulo de JUNiO 601 a OMEGA:
1. **Namespacing**: Renombrar de `ABD::` a `Omega::DSP::`.
2. **Desacoplamiento**: Quitar cualquier referencia a `Component` de JUCE o UI. El módulo debe ser puramente matemático/DSP.
3. **Config-Driven**: El módulo debe tener un método `applyConfig(const MyConfigStruct& conf)` que inicialice sus constantes.
4. **Precisión**: OMEGA opera internamente a 64-bit para control y 32-bit para audio. Asegurar la consistencia de tipos.

---
> [!TIP]
> **Consistencia en IDs**: Todos los IDs de parámetros deben ser en mayúsculas y seguir el formato `LAYER[X][MODULO][PARAM]` (ej: `LAYERAVCFRESONANCE`).

## 5. Comunicación RPC (WebUI)
- Los parámetros deben usar el prefijo de capa: `LAYER[A/B][MODULO][PARAM]` (ej: `LAYERAMAINCUTOFF`).
- El puente `OmegaUiBridge` es el único encargado de despachar comandos JSON a llamadas C++.

## 6. Procedimiento de Extracción (Checklist)
1. **Namespacing**: Envolver todo el código en `namespace Omega::DSP::...`.
2. **Headers**: Sustituir inclusiones locales por rutas relativas al core de OMEGA.
3. **Internal State**: Convertir parámetros directos en miembros de `VoiceConfig` (en `EngineConfig.h`).
4. **Mantenibilidad**: Eliminar dependencias de la UI original de JUNiO 601; OMEGA se encarga del renderizado Web.

---
**Tip**: Cuando pases este documento a otro hilo de chat, indica que el objetivo es "Alinear JUNiO 601 con la arquitectura OMEGA Refinada (Build 15)".
