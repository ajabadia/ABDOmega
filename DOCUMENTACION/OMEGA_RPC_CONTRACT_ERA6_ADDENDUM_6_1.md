# OMEGA RPC Runtime Contract — Era 6.1 Hardening Addendum

Este addendum refuerza el contrato runtime definido en `OMEGA_RPC_CONTRACT_ERA6-5.md` sin romper la compatibilidad con la WebUI de Era 6. Se centra en versionado explícito, normalización de nombres públicos y reglas de deprecación controlada.

## Objetivos

- Congelar la forma pública de los payloads estructurales.
- Reducir drift entre Bridge, controladores RPC, tests y WebUI.
- Preparar una transición limpia hacia una WebUI con `SchemaStore`, `GraphStore`, `RuntimeStore` y `SessionStore` desacoplados.

## 1. Versionado explícito de respuestas estructurales

Las siguientes respuestas **MUST** incluir `payload.schemaVersion`:

- `state`
- `TELEMETRYDATA`
- `MODMETADATAACK`
- `onStateUpdate`
- `telemetryUpdate`

### Regla

`schemaVersion` es una cadena semántica (`"1.0"`, `"1.1"`, `"2.0"`). Cualquier cambio incompatible en la forma del payload **MUST** incrementar esta versión.

### Comportamiento de la UI

- Si la UI recibe una `schemaVersion` mayor que la soportada, **SHOULD** registrar warning.
- Si la diferencia rompe campos obligatorios, **MAY** degradar funcionalidad de forma segura.
- La UI **MUST NOT** asumir shape implícito cuando exista `schemaVersion` desconocida.

## 2. Normalización de nombres públicos

### Eventos push canónicos

Los nombres públicos normativos para Era 6.1 son:

- `PARAM_CHANGE`
- `onStateUpdate`
- `telemetryUpdate`

### Respuestas ACK canónicas

Se mantiene el patrón actual de respuestas tipadas:

- `PARAM_ACK`
- `UI_READY_ACK`
- `PATCHBAYUPDATEACK`
- `SUBSCRIBEACK`
- `SCOPEACK`

## 3. Campos y comandos deprecados

Los siguientes elementos quedan en estado **deprecated** y no deben emitirse desde implementaciones nuevas:

- `type: "setParam"`
- `type: "menuAction"`
- `payload.paramId` en mutaciones de parámetro
- `id` como identificador del evento de parámetro push
- `PARAMCHANGE` sin guion bajo

### Regla del backend

El dispatcher **MUST** devolver `type: "error"` y un mensaje con `CONTRACTVIOLATION` cuando reciba `setParam`, `menuAction` o payloads nominalmente inválidos.

### Regla de la WebUI

La WebUI **MUST NOT** emitir comandos deprecated. Durante transición, puede aceptar eventos legacy de entrada si se normalizan inmediatamente a los nombres canónicos.

## 4. Dominio State endurecido

`getState` y `onStateUpdate` **SHOULD** converger sobre un payload compartido:

```json
{
  "schemaVersion": "1.0",
  "preset": {
    "id": "era6-test-001",
    "name": "Nominal Preset",
    "author": "OMEGA Team"
  },
  "params": {
    "TESTPARAM": 0.4
  }
}
```

### Regla de compatibilidad

- `params` sigue siendo válido en Era 6.1.
- `parameters` puede introducirse como alias futuro, pero **MUST NOT** sustituir a `params` sin aumento explícito de versión contractual.

### Regla de Identidad Técnica
Cualquier mensaje que describa la topología del grafo **MUST** utilizar el `implementationId` definido en el manifiesto como clave de vinculación primaria cuando se opera bajo el motor aséptico.

## 5. Dominio Telemetry endurecido

`TELEMETRYDATA` y `telemetryUpdate` **SHOULD** usar el mismo shape base de frame.

```json
{
  "schemaVersion": "1.0",
  "lfo1.out": { "pk": 0.82, "v": 0.31, "h": [0.12, 0.18, 0.26] },
  "filter1.out": { "pk": 0.91, "v": 0.44, "h": [0.40, 0.42, 0.44] }
}
```

### Regla

- `pk` y `v` son opcionales por pin.
- `h` aparece sólo en frames streaming o cuando el pin lo requiera.
- La UI **MUST** tolerar frames parciales.

## 6. Dominio Modulation endurecido

`MODMETADATAACK` **MUST** incluir:

- `schemaVersion`
- `sources`
- `targets`
- `inventory`

`updatePatchbayMatrixSlot` mantiene las claves válidas:

- `source`
- `target`
- `amount`
- `via`
- `viaAmount`
- `active`

La UI **MUST NOT** inventar slots o claves fuera de este contrato.

## 7. Bootstrap y futuros endpoints

Se reserva el nombre `getGraphState` para una futura superficie pública estructural. En Era 6.1:

- `getGraphState` **MUST NOT** considerarse parte del contrato estable.
- `uiReady` sigue siendo el comando nominal de bootstrap.

## 8. Recomendación de implementación WebUI

La capa `transport/` debe normalizar todos los eventos entrantes al conjunto canónico y exponer tipos discriminados estables al resto de stores. `RuntimeStore` debe reaccionar a `PARAM_CHANGE`, `onStateUpdate` y `telemetryUpdate` sin conocer detalles del canal RPC subyacente.
