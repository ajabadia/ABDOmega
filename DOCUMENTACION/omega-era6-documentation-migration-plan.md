# OMEGA Era 6 — Plan de migración documental

## Objetivo

Este plan define cómo transformar la documentación existente de OMEGA hacia el marco **Era 6 — Aseptic Contract Runtime**.[cite:1][cite:2] El criterio rector no es solo modernizar el lenguaje, sino alinear todos los documentos con una arquitectura donde la verdad operacional se expresa mediante contratos explícitos (`Schema`, `Graph`, `RuntimeState`, `Commands`, `Events`) y no mediante una combinación transicional de manifests, descriptores estáticos, parsers de presentación y convenciones específicas de la WebUI de Era 5.2.[cite:1][cite:2]

La documentación actual sigue siendo valiosa porque ya consolida muchas bases correctas: Hyper-ACE, `AceCatalog`, `SemanticBrokerService`, `ParameterMetadataRegistry`, IDs semánticos, arquitectura de 4 capas y eliminación progresiva de hardcodes.[cite:1][cite:2] Lo que cambia en Era 6 es el encuadre: el manifiesto deja de presentarse como representación total del sistema y pasa a ser una fuente declarativa primaria dentro de un runtime contractual más amplio.[cite:1][cite:3][cite:4]

## Regla de migración global

Todo documento reescrito para Era 6 debe cumplir estas reglas de fondo:[cite:1][cite:2]

- Sustituir **metadata-driven UI** por **contract-driven runtime**.[cite:1][cite:2]
- Tratar el manifiesto como **fuente del schema**, no como única forma operacional del sistema.[cite:3][cite:4]
- Separar lo **semántico-estructural** de lo **visual o de workspace**.[cite:3][cite:4]
- Eliminar cualquier dependencia conceptual de contratos frontend legacy como `moduledescriptors.js`, `window.juce` o fallbacks de reconciliación estructural.[cite:1][cite:5]
- Mantener la doctrina de SOT, zero-coupling, IDs semánticos, 4 capas y real-time safety.[cite:1][cite:2][cite:5]

## Orden recomendado de reescritura

El orden correcto de migración documental es el siguiente porque va de lo más fundacional a lo más derivado:[cite:1][cite:2]

1. `ACE_META_ENGINE_ERA_5.md` → nuevo contrato base de Era 6.[cite:3]
2. `ACE_MANIFEST_SPEC_5_2-2.md` → nuevo schema spec.[cite:4]
3. `RULES-6.md` → reglas de desarrollo Era 6.[cite:5]
4. `README-4.md` → reposicionamiento narrativo del proyecto.[cite:6]
5. `ROADMAP-5.md` → cierre del roadmap histórico y apertura del nuevo roadmap.[cite:2]
6. `ACEPACK_SPEC-3.md` → packaging/distribución en clave Era 6.[cite:7]

## Archivo por archivo

## `ACE_META_ENGINE_ERA_5.md`

### Diagnóstico

Este documento es el mejor punto de partida conceptual porque ya formula a OMEGA como motor metadata-driven y define entidades unificadas, roles, layout, herencia y principios de asepsia.[cite:3] El problema es que todavía afirma que motor DSP y WebUI derivan “exclusivamente del manifiesto YAML”, y eso en Era 6 debe superarse en favor de una visión contractual donde el backend es la autoridad operacional agregada.[cite:3][cite:1]

### Qué conservar

- Filosofía Hyper-ACE y asepsia sistémica.[cite:3]
- Entidad unificada para parámetros, señales y puertos.[cite:3]
- IDs semánticos y roles.[cite:3]
- Diccionarios/lookups y herencia composicional.[cite:3]

### Qué eliminar o rebajar

- La tesis “el manifiesto lo gobierna todo”.[cite:3]
- La centralidad del rack físico como modelo absoluto del dominio.[cite:3]
- La mutación directa del manifiesto como representación natural del estado resuelto (`Living YAML` sobre `hp`) salvo casos explícitos de tooling o persistencia controlada.[cite:3]

### Qué introducir

- Definición formal de `Schema`, `Graph`, `RuntimeState`, `Commands`, `Events`.[cite:1]
- Separación entre **source declaration** y **resolved operational state**.[cite:1][cite:3]
- Política de autoridad: backend/bridge como publicación oficial del contrato consumido por la UI.[cite:1][cite:2]

### Resultado esperado

Renombrar este documento a **`ACE_CONTRACT_RUNTIME_SPEC_6.md`** y convertirlo en la constitución principal de Era 6.[cite:3][cite:1]

## `ACE_MANIFEST_SPEC_5_2-2.md`

### Diagnóstico

Este documento está bien estructurado y cubre identidad, layout, registry, roles, UI, patching, telemetría y theming.[cite:4] Su desalineación con Era 6 proviene de mezclar especificación semántica del módulo con política concreta de interfaz, incluyendo tabs MAIN/PATCHING, células de control, prohibición de jacks frontales y telemetría visual como si todo ello formara parte del contrato esencial del módulo.[cite:4]

### Qué conservar

- Identidad del módulo (`id`, `modelId`, `implementationId`, `family`, `version`).[cite:4]
- Registro unificado de entidades con roles.[cite:4]
- Puertos, direcciones y semántica de control/telemetría/stream.[cite:4]
- Hints de layout y presentación.[cite:4]

### Qué eliminar o mover

- El layout físico `HP` como centro doctrinal del módulo.[cite:4]
- Tabs rígidos MAIN/PATCHING como parte del estándar universal.[cite:4]
- Políticas concretas de render de una UI específica de Era 5.2.[cite:4]

### Qué introducir

- Distinción entre `ModuleSchema` y `ViewPolicy`.[cite:1][cite:4]
- `presentation` y `layout` como **hints declarativos**, no como obligación absoluta de una única UI.[cite:4]
- Campos explícitos para compatibilidad de schema, capacidades, widgets disponibles, telemetría declarada y bindings semánticos consumibles por `UiSchema`.[cite:1][cite:4]

### Resultado esperado

Renombrar a **`ACE_MODULE_SCHEMA_SPEC_6.md`** y convertirlo en la especificación declarativa de módulos, separada de cualquier política de workspace concreta.[cite:4][cite:1]

## `RULES-6.md`

### Diagnóstico

Este documento ya contiene varias reglas que siguen siendo totalmente válidas para Era 6, especialmente SOT, router-controller pattern, uso de metadata centralizada y reglas de tiempo real en DSP.[cite:5] La principal fricción está en que todavía acepta mecanismos transicionales del frontend, como la introducción de nuevos descriptores en `moduledescriptors.js` cuando un módulo encaja en `ModuleRenderer`.[cite:5]

### Qué conservar

- Prohibición de allocations y locks en audio thread.[cite:5]
- `ParameterMetadataRegistry` como única fuente de verdad.[cite:5]
- Regla de bridge como router y controladores especializados.[cite:5]
- Disciplina de separación entre lógica, bridge y render.[cite:5]

### Qué eliminar o corregir

- Toda norma que legitime descriptores estáticos como contrato principal del frontend.[cite:5][cite:1]
- Toda regla implícita que permita duplicación de semántica en WebUI.[cite:5][cite:1]

### Qué introducir

- Regla explícita: el frontend solo consume contratos de backend (`Schema`, `Graph`, `RuntimeState`).[cite:1]
- Regla explícita: toda mutación via `dispatchCommand` y toda sincronización via `Events`.[cite:1]
- Regla explícita: prohibido reconciliar múltiples autoridades de IDs, layout o tipos en frontend.[cite:1][cite:5]

### Resultado esperado

Mantener el nombre si quieres, pero idealmente evolucionarlo a **`DEVELOPMENT_RULES_ERA_6.md`**.[cite:5]

## `README-4.md`

### Diagnóstico

El README presenta bien la visión Hyper-ACE, el descubrimiento dinámico, Patchbay-Matrix y la arquitectura de capas.[cite:6] Su retraso respecto a Era 6 es narrativo: sigue describiendo OMEGA como un sintetizador con “premium Web-based UI” y “automatic rack generation from YAML metadata”, cuando el nuevo norte es un runtime contractual gobernado por backend.[cite:6][cite:1]

### Qué conservar

- Hyper-ACE como nombre y ADN arquitectónico.[cite:6]
- Arquitectura de capas, catálogo, descubrimiento, patching y synth families.[cite:6]
- Identidad semántica por IDs.[cite:6]

### Qué actualizar

- Sustituir “manifest-driven rendering” por “contract-driven runtime”.[cite:6][cite:1]
- Presentar `AceCatalog` y manifests como fuentes del schema.[cite:6][cite:1]
- Introducir el lenguaje `Schema`, `Graph`, `RuntimeState`, `Commands`, `Events` desde la portada del proyecto.[cite:1]

### Resultado esperado

Reescribir como README principal de Era 6 sin conservar el número de versión en el nombre de archivo.[cite:6]

## `ROADMAP-5.md`

### Diagnóstico

Este roadmap es valiosísimo como memoria operativa del proyecto y como registro de por qué OMEGA ha llegado a este punto.[cite:2] Además, ya contiene la mayoría de hitos que justifican Era 6: Semantic Era, metadata SOT, bridge decomposition, Semantic Broker, Hyper-ACE super-modularity, purga de hardcodes y consolidación aséptica.[cite:1][cite:2]

### Qué conservar

- Todo el historial de hitos completados hasta Era 5.2.[cite:2]
- Las decisiones ya marcadas como deprecated o desistidas, porque ayudan a acotar foco futuro.[cite:2]
- La narrativa de convergencia hacia modularidad, contratos y semántica unificada.[cite:1][cite:2]

### Qué hacer con él

- No borrarlo.[cite:2]
- Cerrarlo oficialmente como documento histórico de **Era 1–5.2**.[cite:2]
- Extraer de él un resumen de aprendizajes, deuda eliminada y principios consolidados.[cite:2]

### Qué introducir aparte

- Crear un nuevo **`ROADMAP_ERA_6.md`** centrado en contrato, runtime, frontend nuevo y retirada del legado.[cite:1][cite:2]
- Incluir exclusiones explícitas para no mezclar esta etapa con scripting, GPU, colaboración multiusuario o expansión horizontal no prioritaria.[cite:2]

### Resultado esperado

Mantener `ROADMAP-5.md` como legado y abrir roadmap nuevo, en lugar de parchear el mismo archivo hasta volverlo ambiguo.[cite:2]

## `ACEPACK_SPEC-3.md`

### Diagnóstico

Este documento conserva valor en naming, estructura modular, identidad del paquete y auto-descubrimiento.[cite:7] Lo que lo envejece es que arrastra supuestos de etapa anterior como `.wasm` como payload ejemplar, estilos visuales acoplados a temas cerrados, smart visibility basada en tiers front/back, y estrategias de implementación DSP que el roadmap ya no prioriza o incluso marca como fuera de foco.[cite:7][cite:2]

### Qué conservar

- Notación semántica por puntos.[cite:7]
- Identidad del paquete y estructura autosuficiente.[cite:7]
- Descubrimiento automático y cohesión de recursos.[cite:7]

### Qué eliminar o rebajar

- WASM como narrativa central del estándar.[cite:7]
- Estrategias antiguas como `Legacy Scripting` o despliegues que no forman parte del foco actual.[cite:7][cite:2]
- Reglas de visibilidad muy atadas a la UI de front/back de Era 4.x/5.x.[cite:7]

### Qué introducir

- Packaging desacoplado de la implementación DSP concreta.[cite:7]
- Compatibilidad de package con versiones de schema y contract runtime.[cite:1][cite:7]
- Recursos opcionales, assets, capabilities y providers de implementación nativa o externa como detalles secundarios, no como corazón de la spec.[cite:7]

### Resultado esperado

Renombrar a **`ACE_PACKAGE_DISTRIBUTION_SPEC_6.md`**.[cite:7]

## Nueva taxonomía documental propuesta

La colección documental Era 6 debería quedar organizada así:[cite:1][cite:2]

| Tipo | Archivo propuesto | Rol |
|---|---|---|
| Visión | `VISION_ERA_6.md` | Norte conceptual y alcance de la era.[cite:1] |
| Constitución técnica | `ACE_CONTRACT_RUNTIME_SPEC_6.md` | Definición de contratos y autoridad operacional.[cite:1][cite:3] |
| Spec de módulo | `ACE_MODULE_SCHEMA_SPEC_6.md` | Declaración semántica de módulos.[cite:4] |
| Packaging | `ACE_PACKAGE_DISTRIBUTION_SPEC_6.md` | Distribución, versionado y compatibilidad de paquetes.[cite:7] |
| Reglas | `DEVELOPMENT_RULES_ERA_6.md` | Normas de implementación y disciplina de capas.[cite:5] |
| README | `README.md` | Presentación pública actualizada del proyecto.[cite:6] |
| Roadmap actual | `ROADMAP_ERA_6.md` | Plan de ejecución de la nueva era.[cite:1][cite:2] |
| Roadmap histórico | `ROADMAP-5.md` | Memoria de Era 1–5.2.[cite:2] |

## Plan de trabajo práctico

### Sprint documental 1

- Reescribir `ACE_META_ENGINE_ERA_5.md` como `ACE_CONTRACT_RUNTIME_SPEC_6.md`.[cite:3][cite:1]
- Reescribir `ACE_MANIFEST_SPEC_5_2-2.md` como `ACE_MODULE_SCHEMA_SPEC_6.md`.[cite:4][cite:1]

### Sprint documental 2

- Actualizar `RULES-6.md` a `DEVELOPMENT_RULES_ERA_6.md`.[cite:5]
- Reescribir `README-4.md` como `README.md` de Era 6.[cite:6]

### Sprint documental 3

- Congelar `ROADMAP-5.md` como legado.[cite:2]
- Crear `ROADMAP_ERA_6.md` con fases nuevas.[cite:1][cite:2]
- Replantear `ACEPACK_SPEC-3.md` como `ACE_PACKAGE_DISTRIBUTION_SPEC_6.md`.[cite:7]

## Criterios de validación

La migración documental puede considerarse correcta cuando se cumplan estas condiciones:[cite:1][cite:2]

- Ningún documento principal presenta ya el manifiesto como totalidad operacional del sistema.[cite:3][cite:4]
- La UI queda definida como consumidora de contratos y no como autoridad semántica.[cite:1][cite:5]
- El vocabulario `Schema`, `Graph`, `RuntimeState`, `Commands`, `Events` aparece de forma consistente en la documentación fundacional.[cite:1]
- Se separan con claridad las specs semánticas de las políticas de presentación concretas.[cite:3][cite:4]
- La documentación histórica de Era 5.2 permanece accesible, pero no condiciona el diseño futuro.[cite:2]

## Recomendación final

La mejor estrategia no es corregir pequeños párrafos aquí y allá, sino hacer una **migración editorial intencional**.[cite:1][cite:2] OMEGA ya dispone de un cuerpo documental suficientemente rico como para no empezar de cero; lo correcto es usarlo como estrato histórico y extraer de él una biblioteca nueva, compacta y más limpia, diseñada explícitamente para Era 6.[cite:1][cite:2][cite:3][cite:4]
