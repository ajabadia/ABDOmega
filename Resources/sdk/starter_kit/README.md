# OMEGA SDK Starter Kit — Minimal Osc

Este kit contiene un ejemplo mínimo funcional para desarrollar un módulo de audio para OMEGA.

## Contenido
- `omega_sdk.h`: Cabecera con las funciones del Host API.
- `minimal_osc.cpp`: Implementación de un oscilador Sawtooth.
- `minimal_osc.acemm`: Manifiesto de la interfaz (Era 7.2.3).

## Instrucciones de Compilación
Para compilar este ejemplo usando Emscripten:

```bash
emcc minimal_osc.cpp -o minimal_osc.wasm \
  -O3 \
  -s STANDALONE_WASM \
  -s EXPORTED_FUNCTIONS="['_omega_process', '_omega_get_contract', '_omega_set_param']" \
  --no-entry
```

## Instalación
1. Copia el archivo `minimal_osc.wasm` y `minimal_osc.acemm` a una nueva carpeta dentro de `/Resources/modules/minimal_osc/`.
2. Reinicia el motor OMEGA.
3. El módulo aparecerá automáticamente en el catálogo ACE bajo la familia "oscillator".

---
*OMEGA — Engineering Standard V7.2.3 — Industrial Governance ERA 4*
