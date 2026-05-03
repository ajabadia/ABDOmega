# 🛠️ OMEGA Module Developer Guide (Era 7.2.3)

Bienvenido al ecosistema de desarrollo de **OMEGA**. Este documento proporciona las especificaciones técnicas necesarias para que ingenieros de terceros puedan desarrollar módulos (osciladores, filtros, utilidades) compatibles con el motor OMEGA sin necesidad de asistencia directa.

> [!IMPORTANT]
> Esta guía sigue el estándar de la **Era 7.2.3**, que introduce validación criptográfica, integridad estructural y el ciclo de vida de contratos JSON.

---

## 1. El Ecosistema Industrial OMEGA
Un módulo OMEGA es una entidad compuesta por tres capas de información que deben estar en sincronía absoluta:

1.  **Lógica (`module.wasm`)**: Binario WebAssembly que contiene el algoritmo DSP.
2.  **Arquitectura (`module.acemm`)**: Manifiesto YAML que define la interfaz visual, el chasis (contenedores) y la gobernanza.
3.  **Contrato (`module.contract.json`)**: Interfaz técnica que mapea los parámetros del WASM con la UI.

---

## 2. SDK Starter Kit (Referencia Rápida)
Ubicación: `Resources/sdk/starter_kit/`

El kit incluye un oscilador de sierra (Sawtooth) mínimo que sirve como plantilla:
*   `omega_sdk.h`: Cabecera C/C++ con las funciones del Host.
*   `minimal_osc.cpp`: Implementación de referencia.
*   `minimal_osc.acemm`: Diseño de panel industrial (4HP).

---

## 3. WASM ABI: Especificación de Funciones

### Funciones que TU MÓDULO debe Exportar (Exports)
Tu código debe usar `extern "C"` para evitar el mangling de nombres.

| Función | Firma | Descripción |
| :--- | :--- | :--- |
| `omega_get_contract` | `() -> i32` | Devuelve un puntero a una cadena JSON (el Contrato). |
| `omega_process` | `(float* buffer, int length) -> void` | Función de audio principal. |
| `omega_set_param` | `(int paramId, float value) -> void` | Recibe cambios desde la UI (0.0 a 1.0). |

### Funciones que el HOST proporciona (Imports)
Disponibles en `omega_sdk.h`.

| Función | Descripción |
| :--- | :--- |
| `omega_get_sample_rate` | Devuelve el sample rate actual (ej: 48000.0). |
| `omega_publish_telemetry` | Envía valores para visualizadores (LEDs, Scopes). |

---

## 4. Implementación de Referencia (C++)

```cpp
#include "omega_sdk.h"

float phase = 0.0f;
float frequency = 440.0f;

extern "C" {
    // Definición del Contrato
    const char* omega_get_contract() {
        return "{\"id\": \"my_osc\", \"parameters\": [{\"id\": \"freq\", \"role\": \"control\"}]}";
    }

    // Recepción de parámetros (0 a 1)
    void omega_set_param(int id, float val) {
        if (id == 0) frequency = 20.0f + (val * 1000.0f);
    }

    // Proceso de Audio
    void omega_process(float* buffer, int length) {
        float sr = omega_get_sample_rate();
        for (int i = 0; i < length; ++i) {
            buffer[i] = (phase * 2.0f - 1.0f); // Sawtooth
            phase += frequency / sr;
            if (phase >= 1.0f) phase -= 1.0f;
        }
    }
}
```

---

## 5. Compilación del Módulo
Para generar un binario compatible, debes compilar para el target `wasm32-unknown-unknown` o usar Emscripten.

**Ejemplo con Emscripten (emcc):**
```bash
emcc module.cpp -o module.wasm \
  -s EXPORTED_FUNCTIONS="['_omega_get_contract', '_omega_process', '_omega_set_param']" \
  -s ERROR_ON_UNDEFINED_SYMBOLS=0 \
  --no-entry
```

> [!WARNING]
> Es vital que las funciones exportadas coincidan exactamente con la lista anterior, incluyendo el prefijo de subrayado si el compilador lo requiere.

---

## 6. Gobernanza y Auditoría (ERA 4)
Para que el módulo sea aceptado por el motor en modo **Production**, el manifiesto debe incluir el rol de registro:

```yaml
metadata:
  name: Mi Modulo Pro
  governance:
    registry_role: "ENGINE_CORE" # o "FX_PROCESSOR", "UTIL_MOD"
    vendor_id: "com.tu-empresa"
```

---

## 7. Manejo de Eventos y MIDI
Para módulos que requieren interacción externa (ej: `midi_in`), OMEGA proporciona un callback de baja latencia para eventos MIDI.

### Exportación de Función MIDI
```cpp
extern "C" {
    EMSCRIPTEN_KEEPALIVE void omega_on_midi(uint8_t status, uint8_t d1, uint8_t d2) {
        // status: Byte de estado (Note On/Off, CC, etc.)
        // d1: Data 1 (Nota, Número de CC)
        // d2: Data 2 (Velocidad, Valor de CC)
        
        // Ejemplo: Publicar actividad a la UI
        omega_publish_telemetry(1.0f);
    }
}
```

### Puertos de Control (CV/Gate)
En el manifiesto `.acemm`, puedes definir puertos de salida que no son de audio para enviar señales de control (CV) a otros módulos:

```yaml
jacks:
  - id: gate_out
    bind: gate
    presentation:
      component: port
      variant: industrial
      attachments: [{ type: label, text: "GATE" }]
```

---

## 8. Depuración y Validación
El **Manifest Editor** de OMEGA proporciona herramientas de auditoría en tiempo real:
1.  **Binary Sync**: Verifica que el `.acemm` y el `.wasm` tengan IDs coincidentes.
2.  **Contract Bridge**: Valida que cada `bind` en la UI tenga un `parameter` correspondiente en el Contrato JSON.
3.  **Spatial Integrity**: Asegura que los componentes no "fuguen" fuera de los límites del rack.

---
*OMEGA — Engineering Standard V7.2.3 — Industrial Governance ERA 4 — Documented 2026-05-02*
