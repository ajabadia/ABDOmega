# OMEGA Era 6 UI Industrialization Roadmap

## Current Objective: Transition from "Patch-based" to "Architectural" Resiliency
Establish a robust, strictly-typed, and centralized UI framework that aligns with the "Aseptic" principles of OMEGA Build #500+.

---

## Phase 1: Structural Integrity (High Priority)

- [x] **Centralized Schema Normalization**: Move manifest synthesis (layout/items generation) to `SchemaStore.ts`.

- [x] **Formal Module Registry**: Implement `ui/ModuleRegistry.ts` to manage module class mapping.

### 1.3 Strict Typing Enforcement
- **Goal**: Achieve zero-lint/zero-error status in `ui/` directory.
- **Action**: Replace `any` and `@ts-ignore` with formal interfaces (`ModuleDescriptor`, `ModuleOptions`, `ModuleInstance`).

---

## Phase 2: Flow & Persistence Stabilization

### 2.1 Instance Identity Alignment [x]
- **Goal**: Standardize the use of `instanceId` (e.g., `osc_va_1`) across all UI layers.
- **Action**: Ensure `setParameter` always targets the unique instance path and the `RuntimeStore` correctly routes updates back.
- **Status**: Completed. Contract violations in `ModuleRenderer` and `script.js` resolved.

### 2.2 Telemetry Pipeline Hardening [x]
- **Goal**: Formalize automated telemetry pin subscription when a module is rendered.
- **Action**: Map `items` with `look: 'led' | 'meter'` directly to `subscribeTelemetry` calls.
- **Status**: Completed. `ModuleRenderer` now auto-subscribes during `init()`.

### 2.3 Delayed Refresh Issue [x]
- **Goal**: Resolve UI lag/missing modules when adding via browser.
- **Action**: 
    - Implement a render queue in `ModuleManager.ts` to prevent dropped state updates.
    - Consolidate `SchemaStore` to ensure latest contracts are always available.
- **Status**: Completed. UI now reactively catches up with backend state bursts.

---

## Phase 3: Industrial Features (Backlog)

- [x] **Selective Removal**: Implementation of module deletion from the rack via UI context menus.
- [x] **Rack Reordering**: Move modules left/right via the "RACK" tab in the Module Config modal.
- [x] **Visual Theme Persistence**: Save and restore theme overrides per module instance.

## [x] **Phase 4: OMEGA Manifest Designer (Editor)**
    - [x] Refactor existing editor to use SchemaStore.
    - [x] Enforce Era 6.3 validation.
    - [x] Add support for `disabled` and `readOnly` fields in the UI preview.
    - [x] Standardize normative families and roles.

### 4.1 Schema-Driven Form Generation
- **Goal**: Create a web-based (React/TS) tool to edit `.yaml` manifests.
- **Action**: Use `module-schema-6.json` as the source of truth for all fields and validations.

### 4.2 System Awareness & Intelligence
- **Goal**: Implement specialized handling for `system.*` pins.
- **Action**: 
    - Add IntelliSense for normative pins.
    - Enforce read-only status for "Host Injected" roles.
    - Flag legacy fields (`engine`, `direction`, `hp`) for migration to Era 6.3.

### 4.3 Direct Repo Integration [x]
- **Goal**: Allow the editor to scan `Resources/modules` and validate all manifests in bulk.
- **Action**:
    - [x] Implement File System Access API for directory scanning (via `scanRepo` IPC).
    - [x] Add "Repo Health" dashboard to the editor (`RepoDashboard.tsx`).
- **IMPORTANT**: Review [visión editor de manifiestos.md](file:///d:/desarrollos/ABDOmega/DOCUMENTACION/visi%C3%B3n%20editor%20de%20manifiestos.md#L14133) (VEM-1612) for detailed System Awareness specs.

---
## [x] **Phase 5: WASM Bridge Hardening**

### 5.1 System Pin Mapping for WASM [x]
- **Goal**: Allow WASM modules to access `system.audio.*` buffers natively.
- **Action**:
    - [x] Implement `omega_get_system_buffer` host import in `WasmHostInterface.cpp`.
    - [x] Update `WasmModuleService` to bind these imports to the global bus pool.

### 5.2 WASM Registry Sync [x]
- **Goal**: Automate registry generation for WASM modules via export scanning.
- **Action**:
    - [x] Integrate `wasm-objdump` or similar logic into the `WasmHeartbeat` component (Implemented via `handleAsepticHealing` upgrade).

---
## Phase 6: Era 7 Industrialization (In Progress)

### 6.1 PatchDocument & RuntimeCompiler (C++) [x]
- **Goal**: Establish the "Source of Truth" (SOT) and binary pipeline.
- **Action**:
    - [x] Implement `PatchDocument` as the unified state container.
    - [x] Create `RuntimeCompiler` for atomic, lock-free engine snapshots.
    - [x] Deploy `RuntimeStore` (reborn `EngineConfigManager`) for state arbitration.

### 6.2 Numeric Authority & Handshake (UI/RPC) [/]
- **Goal**: Eliminate "Bridge not ready" errors and string-lookup overhead.
- **Action**:
    - [x] Implement **Era 7 Handshake** (`ensureReady`) in `omega_rpc.ts`.
    - [x] Export canonical IDs to TypeScript (`schema_ids.ts`).
    - [/] Migrate all UI modules to the numeric `instanceId` + `paramId` contract.

### 6.3 Era 7 Manifest Designer Evolution
- **Goal**: Transform the editor into a synthesis IDE.
- **Action**:
    - [ ] Implement **Numeric Authority Linter**: Predict and display `ParamId` and `PortId`.
    - [ ] Add **Dry-run Compilation**: Simulate Era 7 snapshots directly in the editor workbench.
    - [ ] Automate **Contract Export**: Export `PatchIdentifiers.h` and `schema_ids.ts` on manifest save.

---

*Last Updated: 2026-04-30 - OMEGA Era 7 Development Cycle Initialized*
