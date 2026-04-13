# OMEGA Era 6 — Aseptic Contract Runtime

## Visión

OMEGA Era 6 plantea una evolución deliberada desde la WebUI dinámica y transicional de Era 5.2 hacia un sistema completamente contractual, aséptico y sin retrocompatibilidad frontend.[cite:1] La base conceptual ya existe en el proyecto actual: arquitectura Hyper-ACE, módulos autodocumentados mediante manifests, descubrimiento dinámico desde `AceCatalog`, inventario semántico desde `SemanticBrokerService`, y una política explícita de “zero-coupled from the UI”.[cite:1]

Era 6 no debe entenderse como otra iteración visual, sino como una redefinición de la frontera entre backend y frontend.[cite:1] El objetivo es que la UI deje de ser una aplicación específica que interpreta metadatos con capas heredadas y pase a ser un runtime genérico de instrumentos modulares gobernado por contratos formales.[cite:1]

## Diagnóstico heredado

Era 5.2 ha logrado una consolidación importante: purga de lógica legacy, renderizado genérico desde metadata, sincronización dinámica de patchbay, parser de presentación, descubrimiento de puertos y componentes, y expansión del modelo manifest-driven.[cite:1] Sin embargo, el bundle todavía muestra convivencia entre varias generaciones de arquitectura: `ModuleDescriptors` como red de seguridad, `window.juce` como shim de compatibilidad, globals como `window.metadataStore` y `window.moduleManager`, y múltiples rutas para resolver layout, catálogo, inventory y estado visual.[cite:1]

Esta situación no es un fracaso; al contrario, es la evidencia de una fase transicional exitosa.[cite:1] Precisamente por eso, la siguiente era puede permitirse abandonar la retrocompatibilidad y consolidar un único modelo operativo.[cite:1]

## Tesis central

La tesis de Era 6 es simple: **el sistema debe hablar en contratos, no en parches evolutivos**.[cite:1] La arquitectura oficial debe quedar reducida a cuatro dominios explícitos: `Schema`, `Graph`, `RuntimeState` y `Commands/Events`.[cite:1]

Con este cambio, el frontend deja de reconstruir significado desde `getMetadata`, `getModulationMetadata`, `listCatalog`, `getState`, fallbacks estáticos y parsing parcial de manifests.[cite:1] En su lugar, consume una visión unificada del instrumento, del patching y del estado vivo del sistema.[cite:1]

## Principios de Era 6

- **Sin retrocompatibilidad frontend.** La nueva WebUI solo consume contratos Era 6 y no incorpora shims ni rutas legacy.[cite:1]
- **Backend como autoridad absoluta.** Parámetros, puertos, telemetría, presentación, inventario y topología salen del backend.[cite:1]
- **Una única semántica.** Se elimina la duplicidad entre catálogo, inventory, descriptors y parsers parciales.[cite:1]
- **Render declarativo puro.** El frontend monta widgets y vistas; no contiene conocimiento especial por módulo.[cite:1]
- **Patching como grafo nativo.** Patchbay deja de ser subsistema accesorio y pasa a ser parte central del dominio.[cite:1]
- **Separación de estructura, estado y sesión.** El sistema distingue claramente qué existe, qué está activo y qué está seleccionado.[cite:1]
- **Aséptico significa contractual.** La asepsia deja de ser solo una cualidad visual y pasa a ser una propiedad arquitectónica.[cite:1]

## Alcance arquitectónico

La Era 6 debe conservar la jerarquía de cuatro capas ya consolidada en el proyecto —Engine, Core, DSP y Plugin— porque esa base ya ha sido estabilizada y documentada como arquitectura profesional del sistema.[cite:1] También conviene conservar `OmegaUiBridge` como punto de entrada nativo, junto con la separación por controladores RPC, el `ParameterMetadataRegistry` como fuente de verdad y el escaneo de manifests mediante `AceCatalog`.[cite:1]

Lo que sí cambia por completo es la superficie de integración con la WebUI.[cite:1] En lugar de múltiples endpoints de bajo nivel y múltiples rutas de interpretación, Era 6 debe exponer contratos agregados y explícitos para el runtime visual.[cite:1]

## Contratos núcleo

### Schema

`Schema` define qué existe en el sistema.[cite:1] Debe describir tipos de módulo, parámetros, puertos, telemetría, widgets, paneles, tabs, grupos y reglas de presentación, integrando en una sola entidad lo que hoy está repartido entre manifests YAML, `uiLayout`, metadata RPC, parser de presentación y descriptores estáticos.[cite:1]

### Graph

`Graph` define qué está instanciado y cómo se conecta.[cite:1] Debe representar racks, workspaces, instancias de módulos, orden, pertenencia a capa o rack, y conexiones activas del patching, evitando que el frontend reconstruya la estructura a partir de `layers`, `auxiliary`, `mainChain`, `voiceArch` o `voiceChain`.[cite:1]

### RuntimeState

`RuntimeState` define el estado vivo del instrumento.[cite:1] Aquí residen valores de parámetros, telemetría, estados de puertos, estados de módulo y cualquier dato mutable que cambie por interacción, automatización o audio-runtime.[cite:1]

### Commands y Events

`Commands` expresa la intención de cambio y `Events` expresa lo que el sistema ya ha cambiado.[cite:1] Esto formaliza y simplifica lo que hoy está repartido entre `setParam`, `menuAction`, `addModule`, `loadPreset`, `updatePatchbayMatrixSlot`, `onStateUpdate` y `onPatchbayMatrixUpdate`.[cite:1]

## API objetivo

La frontera Era 6 entre frontend y backend debería quedar reducida a una API pequeña y estable:[cite:1]

| Método | Propósito |
|---|---|
| `getUiSchema()` | Devuelve el contrato completo de tipos, widgets, presentación y semántica activa.[cite:1] |
| `getPatchGraph()` | Devuelve la topología instanciada del rack, workspaces y conexiones.[cite:1] |
| `getRuntimeState()` | Devuelve el estado vivo inicial del instrumento y la sesión técnica.[cite:1] |
| `dispatchCommand(command)` | Aplica mutaciones semánticas de alto nivel desde la UI.[cite:1] |
| `subscribeEvents()` | Emite actualizaciones incrementales de runtime, graph o sesión.[cite:1] |

Con esta reducción, el bridge sigue siendo potente, pero deja de exponer una “colección de utilidades RPC” para convertirse en una frontera coherente de producto.[cite:1]

## Arquitectura frontend Era 6

La WebUI nueva debe organizarse como runtime, no como acumulación de módulos y managers imperativos.[cite:1] La estructura recomendada es la siguiente:[cite:1]

| Capa | Responsabilidad |
|---|---|
| `transport` | RPC client, event stream y backend adapter.[cite:1] |
| `domain` | Tipos `Schema`, `Graph`, `RuntimeState`, `Commands`, `Events`.[cite:1] |
| `stores` | Estado cargado y observable del runtime: schema, graph, runtime y session.[cite:1] |
| `vm` | Builders y selectors que transforman contratos en view-models renderizables.[cite:1] |
| `rendering` | `PanelRenderer`, `WidgetRegistry`, layout engine y themes.[cite:1] |
| `features` | Rack, patchbay, browser, presets, inspector, preferences y service panels.[cite:1] |

Este diseño corta de raíz la mezcla actual entre bootstrap, globals, renderizado DOM, resolución de metadata y lógica de interacción concentrada en managers monolíticos.[cite:1]

## Qué se conserva

El trabajo previo que sí debe permanecer en Era 6 es el siguiente:[cite:1]

- Jerarquía de 4 capas del proyecto, ya consolidada en la documentación interna.[cite:1]
- `OmegaUiBridge` como punto de unión nativo con la WebUI.[cite:1]
- Descomposición por controladores RPC especializados, aunque internamente se agreguen detrás de contratos más altos.[cite:1]
- `ParameterMetadataRegistry` como única fuente de verdad para rangos, labels, tipos y opciones.[cite:1]
- `AceCatalog` y el sistema de manifests autodocumentados.[cite:1]
- `SemanticBrokerService` como base para inventario vivo y resolución semántica.[cite:1]
- El enfoque Patchbay-Matrix y su compilación dinámica de rutas de modulación.[cite:1]

## Qué se depreca

Era 6 debe declarar como legado y fuera del runtime principal todo lo siguiente:[cite:1]

- `window.juce` shim de compatibilidad sobre RPC.[cite:1]
- `ModuleDescriptors` como fallback general de layout y paneles.[cite:1]
- `ModuleManager` como reconstrucción total de estructura y renderizado.[cite:1]
- Resolución de identidad por `componentId`, `id`, `canonicalId` e `instanceId` en frontend.[cite:1]
- Cualquier boot path que mezcle inventario, metadata, layout y DOM imperativo en una sola capa.[cite:1]
- Modales o workspaces acoplados a lógica específica fuera del dominio común del graph.[cite:1]

## Significado real de “aséptico”

En Era 6, “aséptico” debe definirse con precisión: ausencia de conocimiento redundante, ausencia de duplicidad semántica, ausencia de fallbacks estructurales y ausencia de decisiones de negocio incrustadas en la UI.[cite:1] Un sistema aséptico no es simplemente minimalista en apariencia; es un sistema donde cada capa conoce solo lo indispensable y donde la verdad operacional no tiene rutas paralelas.[cite:1]

## Decisiones estratégicas

La decisión más importante de Era 6 es tratar la WebUI como un **runtime de instrumentos modulares** y no como una interfaz específica codificada alrededor de un subconjunto de módulos.[cite:1] Esta formulación está plenamente alineada con Hyper-ACE, con el catálogo manifest-driven, con el inventario semántico y con la política de eliminación de hardcodes que el proyecto ha seguido desde la Semantic Era y la consolidación 5.2.[cite:1]

La segunda decisión estratégica es asumir un **corte limpio de frontend**.[cite:1] El backend evoluciona, pero no se desecha; la UI sí se reinicia conceptualmente, porque su arquitectura actual revela varias capas históricas superpuestas que ya cumplieron su función transicional.[cite:1]

## Fases propuestas

### Fase 1 — Contrato oficial Era 6

Definir y congelar los tipos de `UiSchema`, `PatchGraph`, `RuntimeState`, `UiCommand` y `UiEvent`.[cite:1] Esta fase no debe centrarse en widgets ni en apariencia visual, sino en cerrar la semántica compartida del sistema.[cite:1]

### Fase 2 — Fachada backend agregada

Construir sobre el bridge actual una nueva fachada de alto nivel capaz de responder con `getUiSchema`, `getPatchGraph`, `getRuntimeState` y `dispatchCommand`.[cite:1] Internamente puede reutilizar controladores existentes, pero externamente debe comportarse como una API unificada.[cite:1]

### Fase 3 — WebUI paralela Era 6

Crear un frontend nuevo en paralelo, sin `window.juce`, sin descriptores fallback y sin dependencia del bootstrap heredado.[cite:1] Esta app debe arrancar exclusivamente desde los contratos formales del backend.[cite:1]

### Fase 4 — Runtime de widgets

Implementar `WidgetRegistry`, `PanelRenderer`, stores y builders de view-model para que cada módulo sea renderizado como una instancia declarativa de schema y state.[cite:1] Aquí debe desaparecer por completo cualquier conocimiento de familias concretas como condición especial del renderer.[cite:1]

### Fase 5 — Patching como workspace nativo

Reformular Patchbay-Matrix como vista del `Graph` y del `RuntimeState`, no como utilidad independiente conectada por rutas especiales.[cite:1] Esto convierte el patching en una propiedad natural del instrumento y no en una capa lateral de edición.[cite:1]

### Fase 6 — Corte del legado

Cuando la nueva UI cubra rack, widgets base, browser, patching, preset y telemetría con paridad funcional suficiente, el runtime Era 5.x debe quedar archivado como legado.[cite:1]

## Riesgos

El principal riesgo de Era 6 no es tecnológico sino semántico.[cite:1] Si `Schema`, `Graph` y `RuntimeState` vuelven a definirse desde varios sitios distintos, el sistema repetirá el problema actual bajo nombres nuevos.[cite:1]

El segundo riesgo es arrancar por la parte visual antes de fijar el contrato.[cite:1] El propio historial del proyecto demuestra que cuando la semántica se estabiliza, la UI se simplifica; cuando la semántica es ambigua, el frontend acumula managers, parsers y reconciliaciones.[cite:1]

## Exclusiones recomendadas

Para mantener el foco, Era 6 no debería mezclar este salto arquitectónico con ambiciones laterales como scripting, GPU, colaboración multiusuario o reescrituras profundas del DSP.[cite:1] El scope correcto es el runtime contractual del instrumento, no una ampliación horizontal del producto.[cite:1]

## Criterios de éxito

Era 6 puede considerarse lograda cuando se cumplan estas condiciones:[cite:1]

- Un módulo nuevo puede aparecer en la UI sin tocar código específico de frontend, siempre que el backend publique schema y graph válidos.[cite:1]
- La UI no necesita `ModuleDescriptors` ni clases específicas por familia para representar el rack.[cite:1]
- Patching, browser, inspector y paneles usan el mismo dominio subyacente.[cite:1]
- El bridge público queda reducido a una pequeña superficie contractual estable.[cite:1]
- La semántica de IDs, puertos, parámetros y widgets es única y no requiere reconciliación en frontend.[cite:1]
- El sistema es más simple de extender que de parchear.[cite:1]

## Síntesis final

OMEGA Era 6 debe formalizarse como **Aseptic Contract Runtime**.[cite:1] Conserva el corazón maduro del proyecto —capas Core/Engine/DSP/Plugin, manifests, metadata registry, semantic broker y bridge— y sustituye la superficie transicional por una arquitectura única, contractual y totalmente declarativa.[cite:1]

No se trata de otra limpieza incremental, sino de una nueva etapa donde la UI deja de ser heredera del pasado y pasa a ser expresión directa del dominio formal del sintetizador.[cite:1]
