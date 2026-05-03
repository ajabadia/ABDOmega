# ACE Runtime Contract v1.0 - OMEGA Era 6

This document defines the normative contract for communication between the OMEGA Engine (C++) and the WebUI (JS) via the Aseptic RPC Bridge.

## 1. Commands (UI → Engine)

All commands MUST be issued via `RpcCommandDispatcher`. 

| Command | Payload Shape | Description |
| :--- | :--- | :--- |
| `setParameter` | `{ target: string, value: float }` | Mutates a parameter. MUST use `target`, NOT `id`. |
| `getState` | `{}` | Returns the full engine state. |
| `loadPreset` | `{ id: string }` or `{ ...state }` | Loads a preset. Nominal verb is `loadPreset`. |
| `getInventory` | `{}` | Returns available modules/components. |
| `getUiSchemas` | `{}` | Returns declarative UI descriptors. |
| `uiReady` | `{}` | Signals the UI is booted and ready for telemetry. |
| `subscribeTelemetry` | `{ pins: string[] }` | Registers interest in specific pins. |

## 2. Responses (Engine → UI)

All responses MUST include a `type` and the original `requestId`.

| Response Type | Payload Shape | Description |
| :--- | :--- | :--- |
| `state` | `{ params: {}, preset: {}, schemaVersion: "1.0" }` | Response to `getState`. `params` is current; `parameters` is future. |
| `PARAM_ACK` | `{ target: string, value: float }` | Confirmation of a parameter change. |
| `UISCHEMAS` | `{ schemas: [] }` | Response to `getUiSchemas`. |
| `INVENTORY` | `{ components: [], registry: [] }` | Response to `getInventory`. |
| `error` | `{ error: string }` | Generic error wrapper. |

## 3. Events / Push Notifications (Engine → UI)

Async events emitted from the engine.

| Notification | Payload Shape | JS Event (DOM) |
| :--- | :--- | :--- |
| `PARAM_CHANGE` | `{ target: string, value: float }` | `omega:PARAM_CHANGE` |
| `onStateUpdate` | `{ parameters: { ... } }` | `omega:onStateUpdate` |
| `telemetryUpdate` | `{ [pin]: value }` | `omega:telemetryUpdate` |

## 4. Constraint Enforcement

- **LEGACY TRAPS**: Any call to `setParam` or `menuAction` MUST return a `CONTRACTVIOLATION` error.
- **ASEPTIC ISOLATION**: Direct access to `window.juce` or `window.__JUCE__` is ILLEGAL. All calls MUST go through `omegaRPC` or `rpcCommandDispatcher`.
- **NAMING RIGOR**: Identifiers and types MUST match exactly (Case-Sensitive).

---
*Authorized for OMEGA Era 6 Certification.*
