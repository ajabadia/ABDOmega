# OMEGA RPC Runtime Contract — Era 6

## Propósito

Este documento define el contrato **runtime** entre la WebUI y el backend C++/JUCE de OMEGA. Este contrato usa mensajes JSON transportados por `OmegaUiBridge` y despachados por `RpcCommandDispatcher`; no sustituye el uso de YAML para persistencia de presets o manifests.[file:45]

La separación correcta en OMEGA es: **YAML para definición/persistencia** y **JSON para mensajería viva de runtime**. El bridge procesa mensajes JSON, los enruta por dispatcher y publica también notificaciones espontáneas hacia la UI.[file:45]

## Principios

- El backend es la única autoridad operacional; la UI consume contrato publicado y nunca muta memoria del core directamente.
- El bridge es aséptico y delega el enrutado de comandos a **`RpcCommandDispatcher`**, que actúa como la pasarela universal.
- `setParameter` usa contrato nominal estricto con `payload.target` como identificador obligatorio.
- El sistema de notificaciones públicas ha sido estandarizado a **`PARAMCHANGE`** como nombre público de evento de parámetro.

## Sobre común de mensajes

Todas las respuestas RPC usan el mismo sobre estructural generado por los controladores base y por el dispatcher de errores.[file:45]

```json
{
  "type": "STRING",
  "requestId": "STRING | NUMBER | NULL",
  "error": "STRING | NULL",
  "payload": {}
}
```

### Campos

| Campo         | Tipo                     | Significado                                            |
| ------------- | ------------------------ | ------------------------------------------------------ |
| `type`      | string                   | Tipo público de la respuesta o evento.[file:45]       |
| `requestId` | string\| number \| null  | Correlación con la petición de la UI.[file:45]       |
| `error`     | string\| null            | Error textual, o `null` en éxito.[file:45]          |
| `payload`   | object\| array \| scalar | Carga útil específica del comando o evento.[file:45] |

## Canal request/response

La UI invoca comandos nominales como `getState`, `setParameter`, `getTelemetry`, `getModulationMetadata` o `uiReady`, y recibe respuestas tipadas con el mismo `requestId`.[file:45]

### Error canónico del dispatcher

Cuando el comando no existe, el dispatcher devuelve una respuesta de error con `type = "error"` y añade `originalType` para preservar trazabilidad semántica.[file:45]

```json
{
  "type": "error",
  "requestId": "req-404",
  "error": "Unknown command type foo",
  "originalType": "foo"
}
```

## Canal de eventos push

Además del flujo RPC, el bridge puede emitir notificaciones espontáneas a la UI. En el estado actual del código existen al menos `PARAMCHANGE`, `telemetryUpdate` y `onStateUpdate`.[file:45]

### Evento de cambio de parámetro

```json
{
  "type": "PARAMCHANGE",
  "id": "layer.a.filter.cutoff",
  "value": 0.73
}
```

Este evento lo emite `OmegaUiBridge::parameterChanged(...)` tras cualquier cambio en el APVTS. La UI debe sincronizar sus widgets basándose en el campo `id`.

### Evento de actualización completa de estado

```json
{
  "type": "onStateUpdate",
  "payload": {
    "preset": {},
    "params": {}
  }
}
```

Este evento se usa en `forceRepaint()` para empujar un snapshot completo de estado a la WebUI tras operaciones estructurales como cargas de preset.[file:45]

### Evento de telemetría push

```json
{
  "type": "telemetryUpdate",
  "tier": "discrete",
  "payload": {}
}
```

El bridge publica este evento periódicamente a 60 Hz, y marca `tier = "streaming"` cuando el frame incluye históricos de alta densidad; en el resto de frames usa `tier = "discrete"`.[file:45]

## Dominio State

El dominio **State** representa el estado observable de alto nivel del instrumento en tiempo real. En el contrato actual, este dominio se concentra en `getState` y `setParameter` a través de `RpcParameterController`.[file:45]

### `getState`

#### Request

```json
{
  "type": "getState",
  "requestId": "req-state-1",
  "payload": {}
}
```

#### Response

```json
{
  "type": "state",
  "requestId": "req-state-1",
  "error": null,
  "payload": {
    "preset": {
      "id": "era6-test-001",
      "name": "Nominal Preset",
      "author": "OMEGA Team"
    },
    "params": {
      "TESTPARAM": 0.4
    }
  }
}
```

### Semántica de `getState`

- `payload.preset` contiene metadatos ligeros del preset vivo (`id`, `name`, `author`).[file:45]
- `payload.params` es un mapa plano `parameterId -> normalizedValue` obtenido del APVTS.[file:45]
- `getState` no debe mezclar topología estructural profunda, inventario de modulación ni buffers de telemetría; esos dominios tienen endpoints propios.[file:45]

### `setParameter`

#### Request

```json
{
  "type": "setParameter",
  "requestId": "req-set-1",
  "payload": {
    "target": "layer.a.filter.cutoff",
    "value": 0.73
  }
}
```

#### Response de éxito

```json
{
  "type": "PARAMACK",
  "requestId": "req-set-1",
  "error": null,
  "payload": {
    "target": "layer.a.filter.cutoff",
    "value": 0.73
  }
}
```

#### Response de error

```json
{
  "type": "error",
  "requestId": "req-set-1",
  "error": "Parameter not found layer.a.filter.cutoff"
}
```

### Reglas normativas de `setParameter`

- `payload.target` es obligatorio; no existe fallback legacy a `payload.id`.[file:45]
- `payload.value` representa valor normalizado según el estándar del bridge actual.[file:45]
- Los protocolos legacy `setParam` y `menuAction` están explícitamente registrados para fallar con `CONTRACTVIOLATION` desde el dispatcher.[file:45]

## Dominio Telemetry

El dominio **Telemetry** expone señales observables de runtime para scopes, medidores, monitores y visualizadores. Este dominio se implementa en `RpcTelemetryController` y se complementa con envío push desde `OmegaUiBridge`.[file:45]

### `subscribeTelemetry`

#### Request

```json
{
  "type": "subscribeTelemetry",
  "requestId": "req-sub-1",
  "payload": {
    "pins": [
      "system.midimonitor",
      "lfo1.out",
      "filter1.out"
    ]
  }
}
```

#### Response

```json
{
  "type": "SUBSCRIBEACK",
  "requestId": "req-sub-1",
  "error": null,
  "payload": true
}
```

### `getTelemetry`

#### Request

```json
{
  "type": "getTelemetry",
  "requestId": "req-tel-1",
  "payload": {
    "pins": ["lfo1.out", "filter1.out"],
    "streaming": true
  }
}
```

#### Response

```json
{
  "type": "TELEMETRYDATA",
  "requestId": "req-tel-1",
  "error": null,
  "payload": {
    "lfo1.out": {
      "pk": 0.82,
      "v": 0.31,
      "h": [0.12, 0.18, 0.26]
    },
    "filter1.out": {
      "pk": 0.91,
      "v": 0.44,
      "h": [0.40, 0.42, 0.44]
    }
  }
}
```

### Semántica de muestras de telemetría

| Campo  | Significado                                                                                                          |
| ------ | -------------------------------------------------------------------------------------------------------------------- |
| `pk` | Pico con semántica peak/reset para el pin solicitado.[file:45]                                                      |
| `v`  | Último valor disponible (`latest`).[file:45]                                                                      |
| `h`  | History buffer; sólo aparece cuando se solicita streaming o el push actual pertenece a tier `streaming`.[file:45] |

### `getTelemetrySources`

#### Response

```json
{
  "type": "TELEMETRYSOURCES",
  "requestId": "req-src-1",
  "error": null,
  "payload": {
    "sources": [
      {
        "id": "system.midimonitor",
        "label": "MIDI Monitor",
        "type": 0
      }
    ]
  }
}
```

Este endpoint enumera fuentes activas conocidas por el registro de telemetría, incluyendo `system.midimonitor`, que el bridge registra explícitamente al inicializarse.[file:45]

### `getScopeState` / `setScopeState`

#### `getScopeState` response

```json
{
  "type": "SCOPESTATE",
  "requestId": "req-scope-1",
  "error": null,
  "payload": {}
}
```

#### `setScopeState` request

```json
{
  "type": "setScopeState",
  "requestId": "req-scope-2",
  "payload": {
    "mode": "oscilloscope",
    "pin": "filter1.out"
  }
}
```

#### `setScopeState` response

```json
{
  "type": "SCOPEACK",
  "requestId": "req-scope-2",
  "error": null,
  "payload": true
}
```

En el estado actual del código, `scopeState` se trata como un objeto opaco compartido entre bridge y controlador de telemetría; por tanto, la forma interna del payload debe considerarse versionada pero no rígidamente tipada en esta Era 6 inicial.[file:45]

### `getModConnections`

#### Response

```json
{
  "type": "MODCONNECTIONS",
  "requestId": "req-modcon-1",
  "error": null,
  "payload": []
}
```

El endpoint existe y forma parte del dominio de visualización, aunque en el código actual responde con un array vacío; se reserva como superficie pública futura para visualización explícita de conexiones activas.[file:45]

## Dominio Modulation

El dominio **Modulation** expone la topología pública relevante para la patchbay y permite editar slots sin acoplar la UI a detalles internos del motor. Este dominio se implementa en `RpcModulationController`.[file:45]

### `getModulationMetadata`

#### Request

```json
{
  "type": "getModulationMetadata",
  "requestId": "req-mod-1",
  "payload": {}
}
```

#### Response

```json
{
  "type": "MODMETADATAACK",
  "requestId": "req-mod-1",
  "error": null,
  "payload": {
    "sources": [
      {
        "id": "lfo1.out",
        "name": "lfo1 LFO Out",
        "label": "LFO Out",
        "type": "CV",
        "instance": "lfo1",
        "category": "LFO",
        "telemetryIndex": 12,
        "isInput": false
      }
    ],
    "targets": [
      {
        "id": "vcf1.cutoff",
        "name": "vcf1 Cutoff",
        "label": "Cutoff",
        "type": "CV",
        "instance": "vcf1",
        "category": "Filter",
        "telemetryIndex": 24,
        "isInput": true
      }
    ],
    "inventory": [
      {
        "instanceId": "lfo1",
        "category": "LFO",
        "status": "active",
        "ports": [
          {
            "id": "out",
            "label": "LFO Out",
            "type": "CV",
            "isInput": false,
            "defaultValue": 0.0,
            "options": []
          }
        ]
      }
    ]
  }
}
```

### Semántica de `getModulationMetadata`

- `sources` contiene sólo puertos de salida de módulos activos aptos para la patchbay global.[file:45]
- `targets` contiene sólo puertos de entrada de módulos activos aptos para la patchbay global.[file:45]
- `inventory` contiene la vista estructural completa por instancia, con puertos anidados útiles para modales y tooling más rico.[file:45]
- El inventario se reconstruye explícitamente antes de responder para garantizar sincronización con el rack y el preset vivos.[file:45]

### `updatePatchbayMatrixSlot`

#### Request

```json
{
  "type": "updatePatchbayMatrixSlot",
  "requestId": "req-patch-1",
  "payload": {
    "slot": 0,
    "key": "source",
    "value": "lfo1.out"
  }
}
```

#### Response

```json
{
  "type": "PATCHBAYUPDATEACK",
  "requestId": "req-patch-1",
  "error": null,
  "payload": true
}
```

### Claves válidas de slot

| `key`       | Tipo esperado | Efecto                                         |
| ------------- | ------------- | ---------------------------------------------- |
| `source`    | string        | Fuente del slot.[file:45]                      |
| `target`    | string        | Destino del slot.[file:45]                     |
| `amount`    | number        | Profundidad principal.[file:45]                |
| `via`       | string        | Modulador secundario.[file:45]                 |
| `viaAmount` | number        | Profundidad del modulador secundario.[file:45] |
| `active`    | boolean       | Activación explícita del slot.[file:45]      |

### Reglas normativas del patchbay

- `slot` debe estar dentro del rango válido; el código actual rechaza índices fuera de `0..64`.[file:45]
- Si se muta `source` o `target`, el slot puede autoactivarse cuando ambos quedan no vacíos.[file:45]
- La UI no debe inferir slots mágicos ni estructura hardcoded; debe derivar sus opciones de `getModulationMetadata`.[file:45]

## Dominio System y bootstrap

El bridge registra `uiReady` como comando nominal de bootstrap y responde con un acuse específico tras forzar repintado/sincronización inicial.[file:45]

### `uiReady`

#### Request

```json
{
  "type": "uiReady",
  "requestId": "req-ready-1",
  "payload": {}
}
```

#### Response

```json
{
  "type": "UIREADYACK",
  "requestId": "req-ready-1",
  "error": null,
  "payload": true
}
```

### `exit` y `newPreset`

Comandos nominales de ciclo de vida:

- **`exit`**: Cierra la aplicación/plugin. Devuelve `EXITACK`.
- **`newPreset`**: Reinicia el patch al estado inicial. Devuelve `NEWPRESETACK`.

### `serviceAction`

Utilizado para diagnósticos de hardware y calibración:

- **Request**: `{ "type": "serviceAction", "payload": { "action": "testVoice", "voice": 0 } }`
- **Response**: `SERVICE_ACK` con estado de la operación.

## Naming unificado del contrato

En la Era 6 Absolute, los nombres públicos siguen un estándar predecible:

- **Respuestas (ACKs)**: Generalmente en mayúsculas concatenadas (`PARAMACK`, `UIREADYACK`, `SAVEACK`).
- **Eventos Push**: En camelCase o directamente correlacionados con el bridge (`telemetryUpdate`, `onStateUpdate`, `PARAMCHANGE`).
- **Comandos**: En camelCase (`setParameter`, `getState`, `loadLibraryPreset`).

Este documento registra el **contrato tal como existe hoy**. Si en una futura Era 6.1 se desea normalización estética, el cambio debería versionarse explícitamente para no romper la WebUI.[file:45]

## Reglas de compatibilidad

- Los nombres públicos documentados aquí deben considerarse estables para la WebUI de Era 6.[file:45]
- Cualquier cambio incompatible en `type`, forma de `payload` o semántica de campos debe incrementar versión contractual explícita.[file:45]
- YAML sigue siendo el formato de persistencia y definición; este documento no redefine manifests ni presets serializados.[file:45]

## Recomendación de endurecimiento para Era 6.1

- Añadir `schemaVersion` a respuestas estructurales como `state`, `TELEMETRYDATA` y `MODMETADATAACK` para versionado explícito.[file:45]
- Formalizar `scopeState` como tipo estable si deja de ser opaco.[file:45]
- Definir un endpoint específico para estado estructural profundo si la UI necesita más que `preset + params`.[file:45]
- Mantener la separación estricta entre `Schema`, `State` y `Telemetry`, en coherencia con las reglas Era 6 del proyecto.[file:45]


## Addendum — Era 6.1 Hardening

Este addendum refuerza el contrato sin romper compatibilidad con la WebUI de Era 6.

### 1. Versionado explícito de respuestas estructurales

Las siguientes respuestas **DEBEN** incluir un campo `schemaVersion` en su `payload`:

- `state`
- `TELEMETRYDATA`
- `MODMETADATAACK`

Ejemplos actualizados:

```json
{
  "type": "state",
  "requestId": "req-state-1",
  "error": null,
  "payload": {
    "schemaVersion": "1.0",
    "preset": { "id": "era6-test-001", "name": "Nominal Preset", "author": "OMEGA Team" },
    "params": { "TESTPARAM": 0.4 }
  }
}
```

```json
{
  "type": "TELEMETRYDATA",
  "requestId": "req-tel-1",
  "error": null,
  "payload": {
    "schemaVersion": "1.0",
    "lfo1.out": { "pk": 0.82, "v": 0.31, "h": [0.12, 0.18, 0.26] }
  }
}
```

```json
{
  "type": "MODMETADATAACK",
  "requestId": "req-mod-1",
  "error": null,
  "payload": {
    "schemaVersion": "1.0",
    "sources": [ /* ... */ ],
    "targets": [ /* ... */ ],
    "inventory": [ /* ... */ ]
  }
}
```

Reglas:

- `schemaVersion` es una cadena semántica (`"1.0"`, `"1.1"`, `"2.0"`).
- La UI **DEBE** registrar advertencia si recibe una versión desconocida mayor que la soportada.
- El backend **NO DEBE** cambiar forma de payload sin incrementar `schemaVersion`.

### 2. Normalización de nombres de evento

Para coherencia interna, se fijan como nombres públicos normativos:

- Evento de parámetro: `PARAMCHANGE`
- Snapshot de estado: `onStateUpdate`
- Telemetría push: `telemetryUpdate`

Cualquier alias anterior (`PARAM_CHANGE`) queda **deprecado** y **NO DEBE** usarse en nuevas implementaciones.

### 3. Campos legacy deprecados

Los siguientes campos o comandos se consideran **legacy** y deben tratarse como violaciones contractuales en Era 6.1:

- `payload.paramId` en comandos de parámetro (`setParam`)
- `type: "setParam"` o `type: "menuAction"`
- Campo `id` en eventos de parámetro push

Reglas:

- El dispatcher **DEBE** responder con `type: "error"` y un mensaje que contenga `CONTRACTVIOLATION` cuando reciba estos comandos.
- La WebUI **NO DEBE** emitirlos en ningún contexto.

### 4. Estado estructural futuro

Se reserva el nombre de comando `getGraphState` para un endpoint futuro que exponga topología estructural profunda:

- `getGraphState` **NO DEBE** usarse en Era 6.1.
- Cualquier aparición actual debe considerarse experimental y no contractual.
