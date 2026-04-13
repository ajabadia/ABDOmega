[ ] VEM-001 estoy intentando arreglar problemas de compilado. MIentras tanto, tengo una idea que me ronda la cabeza, quiero ver qué te parece. Te cuento.

[x] VEM-002 Veo que preparar los yaml de los módulos es un poco delicado y al final la documentación no la veo clara.
Quería hacer un software para editar estos archivos concretos. Incluso si lo vemos mejor, le podríamos cambiar la extensión para no confundirlos con otros yaml.
la idea es que pueda crear un nuevo archivo o cargar uno existente y ver sus datos y poderlos editar de forma gráfica.
Debería usar el mismo motor (usar el mismo código fuente base) que usa Omega, para que siempre esté alineado y no haya que estar pendientes de mantener dos partes diferentes y evitar olvidos o que en una parte se usen unos metadatos y en la otra se hayan cambiado y no la otra no se haya enterado.
la idea es que los metadatos y sus tipos se obtengan dinámicamente del código fuente (o cómo se decida, pero solo una fuente de la verdad).
por ejemplo, si es un metadato tipo string, que aparezca un campo de texto, si es numérico, un número, si es rango, dos campos desde y hasta (texto o número según proceda). Si es un dato tipo puerto, definir si es de entrada, de salida, si va al frontal a la parte trasera si muestra etiqueta en el frontal, si muestra sus datos en el frontal (frecuencia, valor,...) o se oculta, si es un knob, un slider, qué variación se usa,...
No he entrado al detalle de todo, solo quiero saber qué te parece, qué dificultad tendría, etc. si es necesario cambiar partes de omega, se cambian


[ ] VEM-003 La idea es muy buena y encaja totalmente con cómo está planteada la Era 6: un editor de manifiestos/schema dedicado, con una sola fuente de verdad y UI guiada por tipos.

[x] VEM-004 Qué problema resuelve
Los manifests son delicados, con muchos campos y roles (registry, roles, presentation, etc.), y ahora mismo dependen de recordar la spec.

[x] VEM-005 Un editor específico reduce errores de sintaxis, ids mal escritos, roles incoherentes y hints visuales raros.

[ ] VEM-006 Cambiar extensión a algo como .ace.yml o .ace-module.yml ayuda a distinguirlos de otros YAML generales.

[ ] VEM-007 Dificultad y piezas clave
Fuente única de semántica

[ ] VEM-008 En Era 6, la fuente primaria del schema es el manifiesto YAML, no el código C++.

[x] VEM-009 Tu editor puede apoyarse en la ACE_MODULE_SCHEMA_SPEC_6 para saber qué campos, tipos y roles hay (type: int|float|bool|string|list|audio|cv, roles: control, stream, input, output, mod_source, mod_target, telemetry, expert…).

[x] VEM-010 Opcionalmente, puedes generar un JSON Schema o un meta-YAML a partir de esa spec y que tanto OMEGA como el editor lo lean.

[ ] VEM-011 Extracción dinámica de metadatos
Opciones para “mismo motor”:

[ ] VEM-012 A) Reusar exactamente la librería que parsea manifests en OMEGA, exportada como pequeña lib (C++ o incluso generando un JSON Schema de referencia).

[x] VEM-013 B) Definir un JSON Schema formal de ModuleSchema y que:

[ ] VEM-014 OMEGA lo valide en runtime al cargar manifests.

[x] VEM-015 El editor lo use para:

[ ] VEM-016 Saber si un campo es string, number, enum/list.

[ ] VEM-017 Mostrar input correspondiente (text, number, dropdown, checkbox…).

[x] VEM-018 UI basada en tipos y roles
Con la spec actual puedes derivar casi todo lo que comentas:

[ ] VEM-019 Si type == string → input de texto.

[ ] VEM-020 Si type == int|float y hay range → inputs de número con min/max o sliders.

[ ] VEM-021 Si roles incluye input/output, audio/cv → lo representas como puerto, con flags de dirección.

[ ] VEM-022 Si roles incluye control → widget principal (knob/slider).

[ ] VEM-023 Si presentation.ui.component == "knob" → muestras knob, si es "slider", slider, etc.

attachments permite añadir displays/labels/leds alrededor del control.

[ ] VEM-024 Integración con la WebUI nueva

[x] VEM-025 La spec de WebUI dice que el frontend debe ser totalmente schema-driven, con SchemaStore cargando getUiSchema().

[ ] VEM-026 Tu editor podría incluso:

[ ] VEM-027 Mostrar una preview aproximada de cómo quedaría el módulo en el rack (usando el mismo ViewModelBuilder que la WebUI o una versión simplificada).

[x] VEM-028 Validar que tab, group, order, attachments son coherentes con las reglas de layout.

[ ] VEM-029 Cambios necesarios en OMEGA
Yo lo vería en tres pasos pequeños:

[ ] VEM-030 Formalizar schema en un tipo estable

[x] VEM-031 Añadir en OMEGA una estructura ModuleSchema clara (ya está en la spec, sería refinar implementación) y, si no existe, un endpoint o herramienta que lo escupa como JSON (ej: omega-schema-dump CLI).

[x] VEM-032 Así tu editor puede cargar ese JSON y saber exactamente qué campos se esperan y cómo se interpretan.

[ ] VEM-033 Validador compartido

[x] VEM-034 Extraer la validación de manifests a una librería aparte o a una pequeña herramienta que el editor use.

[x] VEM-035 Ideal: un esquema en JSON Schema + un validador en C++ y otro en TS que comparten el mismo fichero.

[ ] VEM-036 Extensiones y naming

[ ] VEM-037 Decidir extensión: por ejemplo .ace-module.yaml o .acemodule para manifests y .acepack.yaml para paquetes.

[ ] VEM-038 Ajustar AceCatalog para que escanee también estos nombres si aún no lo hace.

[ ] VEM-039 Complejidad global
Técnica: media.

[x] VEM-040 Parsear YAML y mapearlo a formularios es bastante directo con tu stack (TS/React).

[x] VEM-041 Lo más “fino” es acordar el JSON Schema / tipo compartido para no duplicar lógica.

[ ] VEM-042 Beneficio: alto.

[ ] VEM-043 Reduce errores en manifests.

[ ] VEM-044 Te da una herramienta para iterar módulos mucho más rápido.

[ ] VEM-045 Encaja perfecto con la filosofía de contrato declarativo de Era 6.

[x] VEM-046 ¿En qué tecnología te gustaría montar el editor, como proyecto aparte (Electron/web) o integrado en la propia WebUI como “Modo diseñador de módulos”?



[x] VEM-047 Para este caso lo más equilibrado es un editor web en React/TypeScript empaquetado con Electron (o Tauri) para tener también .exe/.app sin esfuerzo extra.

[x] VEM-048 Por qué web + Electron
UI muy rica y rápida de iterar: formularios dinámicos, previews de módulo, validaciones en vivo, todo muy natural con React.

[x] VEM-049 Portabilidad: misma base de código corre en navegador (modo “tool interna”) y en escritorio (Electron/Tauri).

[x] VEM-050 Integración con OMEGA:

[x] VEM-051 Puedes llamar a una CLI de OMEGA (o a una lib compilada a WASM) para validar manifests, si quieres reutilizar C++.

[x] VEM-052 Puedes abrir directamente directorios de paquetes .acepack y escribir los YAML con diálogos nativos.

[x] VEM-053 Flujo que veo
Capa de modelo:

[x] VEM-054 Cargas un manifest YAML → lo conviertes a un ModuleSchema tipado según ACE_MODULE_SCHEMA_SPEC_6.

[x] VEM-055 Lo validas contra un JSON Schema compartido con OMEGA.

[x] VEM-056 Capa de UI:

[x] VEM-057 Editor de propiedades generales (id, name, family, version).

[x] VEM-058 Tabla de registry donde cada fila es un parámetro/puerto/telemetry con:

[x] VEM-059 Tipo (int|float|bool|string|list|audio|cv).

[x] VEM-060 Roles (control, stream, input, output, mod_source, mod_target, telemetry, expert).

[x] VEM-061 Atributos (range, unit, precision, etc.).

[x] VEM-062 Panel de presentation:

[ ] VEM-063 Tab, group, order.

ui.component (knob, slider, display).

attachments (display, led, label) renderizados como una “control cell”.

[x] VEM-064 Capa de preview:

[x] VEM-065 Usas la misma filosofía que la WebUI nueva (SchemaStore + ViewModelBuilder) para renderizar un mock de cómo quedaría el módulo en el rack.

[x] VEM-066 Relación con OMEGA
Para no duplicar lógica:

[x] VEM-067 Define un JSON Schema de ModuleSchema sacado de la spec actual y haz que:

[x] VEM-068 OMEGA valide todos los manifests con ese schema al arrancar.

[x] VEM-069 El editor use ese mismo schema para:

[ ] VEM-070 Autogenerar parte de los formularios.

[x] VEM-071 Validar en caliente.

[x] VEM-072 Más adelante, si te interesa, puedes:

[ ] VEM-073 Exportar el ModuleSchema real que OMEGA construye en runtime (por ejemplo como comando dumpModuleSchema).

[ ] VEM-074 Hacer que el editor pueda conectarse a una instancia de OMEGA para ver cómo interpreta el manifest y detectar divergencias.

[x] VEM-075 Con esto tienes una idea bastante sólida: un editor schema-driven, compartiendo contrato con OMEGA, y sin casarte con un tipo de despliegue concreto (web + exe vienen “gratis”).

[x] VEM-076 ¿Te apetece que el siguiente paso sea definir juntos el JSON Schema base de ModuleSchema para que tanto OMEGA como el editor lo usen?


[x] VEM-077 Mantendría YAML para los manifests y añadiría un JSON Schema como contrato formal que ambos (OMEGA y el editor) compartan.

[ ] VEM-078 YAML vs JSON para tus manifests
YAML ya está asumido en la Era 6 para manifests y paquetes (package.yaml, manifests de módulos).

[ ] VEM-079 Tus manifests son ficheros de autoría humana, con listas, adjuntos, etc.; YAML es bastante cómodo de escribir a mano y de leer en diffs.

[ ] VEM-080 JSON encaja mejor para:

[x] VEM-081 Esquemas formales (JSON Schema).

[x] VEM-082 Intercambio por RPC (que ya es JSON y no queremos mezclar).

[ ] VEM-083 Cambiar todos los manifests a JSON a estas alturas te da poco beneficio real si vas a tener un editor que abstrae el formato.

[ ] VEM-084 Lo que sí haría es:

[x] VEM-085 Seguir con YAML en disco (*.ace-module.yaml, package.yaml).

[x] VEM-086 Definir un JSON Schema ModuleSchema que describa la estructura de esos YAML.

[x] VEM-087 Usar ese JSON Schema tanto:

[x] VEM-088 En OMEGA (validación al cargar manifests).

[ ] VEM-089 En el editor (para formularios y validación en caliente).

[ ] VEM-090 Bosquejo de JSON Schema ModuleSchema
Algo muy resumido, sólo para que veas la forma:

json
{
  "$id": "https://omega-synth.dev/schema/module-schema-6.json",
  "title": "Omega Module Schema (Era 6)",
  "type": "object",
  "required": ["id", "name", "version", "family", "registry"],
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "version": { "type": "string" },
    "family": {
      "type": "string",
      "enum": ["osc", "filter", "env", "io", "fx", "lfo", "misc"]
    },
    "registry": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "type"],
        "properties": {
          "id": { "type": "string" },
          "type": {
            "type": "string",
            "enum": ["int", "float", "bool", "string", "list", "audio", "cv"]
          },
          "roles": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": ["control", "stream", "input", "output", "mod_source", "mod_target", "telemetry", "expert"]
            }
          },
          "range": {
            "type": "object",
            "properties": {
              "min": { "type": "number" },
              "max": { "type": "number" },
              "default": { "type": "number" }
            }
          },
          "unit": { "type": "string" },
          "precision": { "type": "integer" },
          "ui_precision": { "type": "integer" },
          "stream": { "type": "boolean" },
          "presentation": {
            "type": "object",
            "properties": {
              "tab": { "type": "string" },
              "group": { "type": "string" },
              "order": { "type": "number" },
              "ui": {
                "type": "object",
                "properties": {
                  "component": {
                    "type": "string",
                    "enum": ["knob", "slider", "switch", "display", "hidden"]
                  }
                }
              },
              "attachments": {
                "type": "array",
                "items": {
                  "type": "object",
                  "required": ["type"],
                  "properties": {
                    "type": {
                      "type": "string",
                      "enum": ["display", "led", "label"]
                    },
                    "unit": { "type": "string" },
                    "role": { "type": "string" },
                    "position": { "type": "string" }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
Este schema:

[x] VEM-091 Traduciría de forma casi directa lo que ya está en ACE_MODULE_SCHEMA_SPEC_6.

[x] VEM-092 Te permite que el editor genere:

[ ] VEM-093 Inputs de texto para strings.

[ ] VEM-094 Números con min/max para range.

[ ] VEM-095 Checkboxes para roles.

[ ] VEM-096 Selects para family, type, component.

[x] VEM-097 Flujo práctico con YAML + JSON Schema
En disco: manifests siguen siendo YAML (más cómodos de leer/escribir), pero estructurados según este schema.

[ ] VEM-098 Editor:

[ ] VEM-099 Lee YAML → lo parsea a objeto JS.

[ ] VEM-100 Valida contra JSON Schema.

[ ] VEM-101 Mapea a formularios dinámicos.

[ ] VEM-102 Escribe YAML de vuelta (formateado).

[ ] VEM-103 OMEGA:

[ ] VEM-104 En el loader de manifests, usas el mismo JSON Schema para validar (puede ser vía lib C++ o herramienta externa que se ejecute en build/test).

[ ] VEM-105 Si te parece bien, el siguiente paso puede ser:

[ ] VEM-106 Ajustar/expandir juntos este JSON Schema para cubrir algún manifest real tuyo (osc, filtro, etc.) y dejarlo ya casi listo para implementar.


[ ] VEM-107 Te propongo un siguiente paso muy concreto y pequeño:

[ ] VEM-108 Cogemos un manifest real tuyo (por ejemplo, el de un oscilador simple).

[ ] VEM-109 Lo traducimos mentalmente a la estructura del JSON Schema que te he esbozado (id, family, registry, presentation…).

[ ] VEM-110 Ajustamos el schema para que cubra exactamente esos campos reales (añadir/quitar enums, propiedades opcionales).

[ ] VEM-111 Con eso tendrás:

[ ] VEM-112 Un module-schema-6.json muy cercano a la realidad.

[ ] VEM-113 Una base sólida para:

[ ] VEM-114 El loader de OMEGA (validación).

[ ] VEM-115 El editor gráfico (formularios dinámicos).

[ ] VEM-116 Si me pegas aquí un ejemplo de manifest (aunque sea recortado), te lo mapeo y te devuelvo el JSON Schema refinado.


[ ] VEM-117 Perfecto, con estos tres manifests podemos ajustar muy bien el esquema; que no sean “perfectos” es justo lo interesante.

[ ] VEM-118 Qué veo en tus YAML
Campos comunes: id, name, family, engine, implementationId/modelId, version, status, description.

layout: hp, rack, columns.

registry: cada entrada tiene variaciones:

[ ] VEM-119 Algunas sin type (se infiere por uso, pero en Era 6 sería mejor hacerlo explícito).

[x] VEM-120 Roles como control, mod_target, input, output, stream, telemetry.

direction: internal, input, output (esto en la spec de Era 6 se modela más bien con roles + type, pero podemos soportarlo como alias).

range, stream, presentation con tab, group, order, ui.component, y extras como variant, slider-v, toggle, etc.

[ ] VEM-121 Esto confirma que el JSON Schema tiene que ser un poco más permisivo (permitir engine, implementationId, modelId, layout, direction, algunos type adicionales como midi).

[ ] VEM-122 Propuesta de JSON Schema refinado (resumen)
Te pongo sólo la parte clave adaptada a lo que tienes:

json
{
  "$id": "https://omega-synth.dev/schema/module-schema-6.json",
  "title": "Omega Module Schema (Era 6)",
  "type": "object",
  "required": ["id", "name", "family", "version", "registry"],
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "family": { "type": "string" },
    "engine": { "type": "string" },
    "modelId": { "type": "string" },
    "implementationId": { "type": ["integer", "string"] },
    "status": { "type": "string" },
    "version": { "type": ["string", "integer"] },
    "description": { "type": "string" },
    "theme": { "type": "string" },
    "layout": {
      "type": "object",
      "properties": {
        "hp": { "type": "integer" },
        "rack": { "type": "string" },
        "columns": { "type": "integer" }
      }
    },
    "registry": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id"],
        "properties": {
          "id": { "type": "string" },
          "label": { "type": "string" },
          "type": {
            "type": "string",
            "enum": ["int", "float", "bool", "string", "list", "audio", "cv", "midi"],
            "default": "float"
          },
          "roles": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "control",
                "stream",
                "input",
                "output",
                "mod_source",
                "mod_target",
                "telemetry",
                "expert"
              ]
            }
          },
          "direction": {
            "type": "string",
            "enum": ["internal", "input", "output"]
          },
          "range": {
            "type": "object",
            "properties": {
              "min": { "type": "number" },
              "max": { "type": "number" },
              "default": { "type": "number" }
            }
          },
          "unit": { "type": "string" },
          "precision": { "type": "integer" },
          "ui_precision": { "type": "integer" },
          "stream": { "type": "boolean" },
          "presentation": {
            "type": "object",
            "properties": {
              "tab": { "type": "string" },
              "group": { "type": "string" },
              "order": { "type": ["integer", "number"] },
              "ui": {
                "type": "object",
                "properties": {
                  "component": {
                    "type": "string",
                    "enum": [
                      "knob",
                      "slider",
                      "slider-v",
                      "toggle",
                      "switch",
                      "display",
                      "led",
                      "hidden"
                    ]
                  },
                  "variant": { "type": "string" }
                }
              },
              "attachments": {
                "type": "array",
                "items": {
                  "type": "object",
                  "required": ["type"],
                  "properties": {
                    "type": { "type": "string" },
                    "unit": { "type": "string" },
                    "role": { "type": "string" },
                    "position": { "type": "string" }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "additionalProperties": false
}
Con esto:

osc_va.yaml, midi_in-2.yaml y test_probe-3.yaml son validables, y el editor puede detectar:

[ ] VEM-123 Falta de type en controles (te sugeriría float por defecto).

[ ] VEM-124 Roles incoherentes o faltantes.

presentation mal estructurado (por ejemplo, si falta tab/group/order).

[ ] VEM-125 Cómo lo usaría el editor
Paso 1: parsea YAML → objeto JS.

[x] VEM-126 Paso 2: valida contra este JSON Schema.

[ ] VEM-127 Si falta type, resaltas el campo y propones valores (float para gains, etc.).

[ ] VEM-128 Si un roles es vacío, sugieres control cuando hay range, o stream+output cuando type: audio y direction: output.

[ ] VEM-129 Paso 3: para cada entrada de registry, la UI del editor:

[ ] VEM-130 Usa type + range para decidir si muestra un knob, slider numérico, etc.

[ ] VEM-131 Usa roles + direction para marcar si es puerto de patching, param, telemetry.

[ ] VEM-132 Siguiente paso concreto
Si te parece bien:

[ ] VEM-133 Puedo derivarte a partir de aquí:

[ ] VEM-134 Una versión exacta de module-schema-6.json lista para meter en el repo.

[ ] VEM-135 Un ejemplo de cómo validar uno de estos YAML con una librería de JSON Schema en Node (lo que usará el editor) y, si quieres, un comando de build/test para OMEGA que haga lo mismo desde C++ o CLI.

[x] VEM-136 ¿Quieres que el próximo mensaje sea directamente el fichero module-schema-6.json completo listo para pegar en el proyecto?


el JSON Schema tiene que salir de la spec Era 6, no de cómo estén ahora tus YAML (que arrastran cosas de Era 5.x).

[x] VEM-137 Fuente de verdad que voy a usar
ACE_MODULE_SCHEMA_SPEC_6-2.md define explícitamente:

[ ] VEM-138 Identidad: id, name, version, family.

registry con id, type (int, float, bool, string, list, audio, cv), roles (control, stream, input, output, mod_source, mod_target, telemetry, expert).

[ ] VEM-139 Atributos: range, precision, ui_precision, unit, stream.

[ ] VEM-140 Hints visuales: presentation.tab, group, order, ui.component, attachments.

[ ] VEM-141 No voy a derivar reglas desde osc_va.yaml / midi_in-2.yaml / test_probe-3.yaml, sólo las usaré después para ver qué rompe el validador (que es justo lo que quieres: detectar resquicios de eras anteriores).

[ ] VEM-142 Qué haré en el siguiente mensaje
Te entregaré un module-schema-6.json completo basado únicamente en ACE_MODULE_SCHEMA_SPEC_6-2.md (más unos campos básicos de identidad/metadatos razonables, pero sin meter engine, implementationId, etc. salvo que la spec los mencione explícitamente).

[ ] VEM-143 Luego, como paso aparte, podremos:

[ ] VEM-144 Pasar tus manifests por ese schema.

[ ] VEM-145 Ver dónde se queja (campos extra, tipos mezclados, etc.).

[ ] VEM-146 Decidir si:

[ ] VEM-147 A) Ajustas los manifests a la Era 6 “pura”.

[ ] VEM-148 B) Versionas el schema (core Era 6 + extensiones legacy marcadas como opcionales).

[ ] VEM-149 Con eso mantienes clara la separación entre “lo que debería ser” (spec Era 6) y “lo que aún hay en disco” (manifests heredados).

[ ] VEM-150 ¿Te parece bien que el module-schema-6.json sea estrictamente Era 6 pura, aunque eso implique que ahora mismo casi todos tus YAML fallen la validación?


[ ] VEM-151 Tiene todo el sentido que desconfíes del .md: ahora mismo hay tres “verdades” mezcladas:

[x] VEM-152 Lo que dice la spec Era 5.2 (ACE_MANIFEST_SPEC_5_2).

[x] VEM-153 Lo que dice la spec Era 6 (ACE_MODULE_SCHEMA_SPEC_6).

[ ] VEM-154 Lo que realmente usa el código (core + UI), que seguro arrastra campos de Era 5 (engine, direction, theme, etc.).

[x] VEM-155 Para sacar un JSON Schema real hay que mirar al código, no sólo al .md. Lo que te propongo:

1. Acordar la metodología
En vez de “inventar” el schema, lo reconstruimos así:

[ ] VEM-156 Extraer de tu código:

[ ] VEM-157 La estructura que parsea manifests (tipos C++ o TS, si la hay).

[ ] VEM-158 El código que consume campos concretos en:

[ ] VEM-159 Core (registro de parámetros, patchbay, etc.).

[ ] VEM-160 WebUI actual (renderer, layout, themes).

[ ] VEM-161 A partir de eso, inferir la lista de campos realmente usados ahora:

[ ] VEM-162 Campos que el core necesita para operar.

[ ] VEM-163 Campos que la UI necesita para renderizar.

[x] VEM-164 Superponer eso con la spec Era 6:

[ ] VEM-165 Todo lo que coincida → va al schema “core” Era 6.

[ ] VEM-166 Lo que sólo exista en código legacy (ej. engine, implementationId, theme, direction) → lo marcamos como extensiones Legacy documentadas aparte.

[ ] VEM-167 Eso da como resultado:

module-schema-6-core.json (lo que quieres a futuro).

module-schema-6-legacy.json o un allOf que añade los campos heredados para que lo que hay hoy siga validando mientras migras.

2. Qué necesito de ti para anclarlo al código
Como aquí no tengo acceso directo a tus clases C++/TS, lo más eficiente es que en el siguiente paso me pases (en texto):

[ ] VEM-168 La definición de la estructura que usas para cargar manifests en el core ahora mismo (aunque esté fea / híbrida).

[ ] VEM-169 Si es C++: typedef/struct/class donde caen id, name, family, layout, registry, etc.

[x] VEM-170 Si es TS: interfaz o tipos usados para los manifests.

[ ] VEM-171 Opcional, pero ideal: algún trozo de código donde:

[ ] VEM-172 Se recorra registry para registrar parámetros/puertos.

[ ] VEM-173 Se use presentation en la UI actual para crear widgets.

[ ] VEM-174 Con eso:

[ ] VEM-175 Puedo alinear el JSON Schema con exactamente lo que el core conoce hoy (no con lo que yo creo que debería conocer).

[ ] VEM-176 Marcar claramente qué campos de Era 6 aún no usa nadie y cuáles son restos de Era 5.2.

3. Qué papel jugará el editor
Una vez tengamos ese schema “real”:

[ ] VEM-177 El editor puede trabajar inicialmente con el schema completo actual (core + legacy).

[ ] VEM-178 Luego, cuando vayas migrando manifests a Era 6 pura, simplemente:

[ ] VEM-179 Cambias el modo del editor a “Era 6 strict”.

[ ] VEM-180 O haces que marque en rojo los campos legacy (direction, engine, etc.) para que sepas que están pendientes de migrar.

[ ] VEM-181 Si te encaja este plan, el siguiente paso concreto sería que me pegues la struct / interfaz que usa ahora el loader de manifests, y sobre eso te devuelvo un primer JSON Schema que refleje cómo está de verdad el sistema hoy, sin maquillar las herencias de Era 5.


[x] VEM-182 Ahora sí podemos ver la “fuente de verdad real”: está en AceCatalog::parseComponentNode y en cómo SemanticBrokerService y RpcMetadataController consumen esos datos.

[ ] VEM-183 Qué campos usa hoy realmente el core
En AceCatalog::parseComponentNode se ve claro:

[ ] VEM-184 Raíz del manifest de módulo:

id → info.id.

name → info.name (fallback: id).

family → info.family (fallback: "Utility").

engine → info.engine (fallback: "Modular").

modelId → info.modelId (fallback: id).

implementationId → info.implementationId (uint32, fallback: 0).

version → info.version (int, fallback: 1).

registry → se recorre para parámetros/puertos.

[ ] VEM-185 Por cada entrada en registry:

id (obligatorio) y label (fallback: id).

direction (string: "input", "output", "internal", fallback "input").

default + range.min/range.max (números, con helpers safeAsFloat y defaults 0,1).

roles (array de strings):

[ ] VEM-186 Si contiene control o modtarget → se crea ParameterDef (parametrizable).

[ ] VEM-187 Si contiene output/stream/modsource → se marca como puerto (isPort).

[ ] VEM-188 Si contiene telemetry → se marca como telemeterizable.

type:

[ ] VEM-189 Si está, se mapea a ModulationModPortTypeAudio / MIDI / Gate / CV.

[ ] VEM-190 Si no está, CV por defecto.

[ ] VEM-191 Luego SemanticBrokerService convierte esos parameters y ports en inventario Era 6 (modulation metadata, etc.), y RpcMetadataController los expone por RPC.

[ ] VEM-192 Conclusión: el modelo vivo actual de manifest es esencialmente el de Era 5.2, pero ya se usa como fuente para la capa Era 6 (SemanticBrokerService, ModulationModuleManifest).

[ ] VEM-193 Cómo marcar claramente lo legacy y lo Era 6
Con esto, tiene sentido definir dos niveles de schema:

[ ] VEM-194 Schema “Runtime actual” (lo que el core parsea hoy)
Campos mínimos reales:

[ ] VEM-195 Raíz:

id, name, family, engine, modelId, implementationId, version.

[ ] VEM-196 Opcionalmente status, description, layout.hp, layout.rack, layout.columns (usado por UI/era 5.2, pero no por AceCatalog).

registry[]:

id, label, direction, roles[], type, range.min/max/default, stream, presentation.tab/group/order/ui.component/attachments.

[ ] VEM-197 Este schema debe reflejar exactamente lo que AceCatalog::parseComponentNode y la UI actual entienden, incluidas cosas como direction, engine, theme, etc.

[x] VEM-198 Schema “Era 6 core” (lo que quieres que sea a futuro)
Basado en ACE_MODULE_SCHEMA_SPEC_6:

[ ] VEM-199 Raíz: id, name, version, family.

registry[]:

id, type (int, float, bool, string, list, audio, cv).

roles (control, stream, input, output, mod_source, mod_target, telemetry, expert).

[ ] VEM-200 Atributos: range, precision, ui_precision, unit, stream.

presentation con tab, group, order, ui.component, attachments.

[ ] VEM-201 Aquí ya no aparece engine, implementationId, direction como campo separado (dirección se deriva de roles input/output).

[ ] VEM-202 Cómo lo aprovechará tu editor
El editor puede cargar el schema runtime actual para no romper nada: valida manifests según el motor real de hoy.

[ ] VEM-203 Además, puede cargar un segundo schema “Era 6 core” para marcar:

[x] VEM-204 Campos que sobran (legacy): engine, implementationId, direction explícito, cosas de Era 5.2.

[ ] VEM-205 Campos que faltan para Era 6 pura: type obligatorio, roles mod_source/mod_target bien usados, atributos extra, etc.

[ ] VEM-206 En la UI del editor puedes hacer:

“Modo compatibilidad”: sólo valida contra el schema runtime actual.

“Modo migración Era 6”: además marca deprecados y sugerencias para transformarlos.

[ ] VEM-207 Próximo paso concreto
Dado lo que se ve en el bundle, el JSON Schema “runtime actual” debe:

[ ] VEM-208 Incluir explícitamente los campos que AceCatalog lee (engine, implementationId, direction, roles, type, range, etc.).

[ ] VEM-209 Mantener type y roles muy cercanos a lo que define Era 6, porque el parsing ya usa type para ports y roles para decidir param vs port/telemetry.

[ ] VEM-210 Si te parece bien, en el siguiente mensaje te escribo un module-schema-runtime.json que:

[ ] VEM-211 Está alineado con AceCatalog::parseComponentNode.

[ ] VEM-212 Marca (en comentarios en el propio schema, o usando algo tipo x-legacy: true) campos que son claramente heredados de Era 5.2 (engine, implementationId, quizá direction).

[ ] VEM-213 ¿Te interesa que use ese enfoque de x-legacy dentro del JSON Schema para que el editor pueda colorear automáticamente los campos a deprecar?

[ ] VEM-214 La situación es un poco “tierra de nadie”, pero sí tiene salida si lo atacas iterativamente y con tooling, no a lo bruto.

[ ] VEM-215 Qué haría yo (orden práctico)
Congelar el modelo runtime actual en un schema “de facto”

[ ] VEM-216 Definir un module-schema-runtime.json que refleje exactamente lo que hace AceCatalog::parseComponentNode hoy (sin inventar Era 6).

[ ] VEM-217 Usarlo en:

[ ] VEM-218 Un test de validación para todos los manifests.

[ ] VEM-219 El editor nuevo, para que al menos garantices “no rompo lo que el core espera”.

[ ] VEM-220 Marcar legacy en ese schema, no en los .md

[ ] VEM-221 En el propio JSON Schema, añadir metadatos tipo x-legacy: true en propiedades como engine, implementationId, direction, campos Era 5.2 de UI, etc.

[ ] VEM-222 El editor puede:

[ ] VEM-223 Mostrar estos campos con un color/icono de “legacy”.

[ ] VEM-224 Sugerir alternativas Era 6 (por ejemplo, usar sólo roles input/output sin direction).

[ ] VEM-225 Migrar “uno por uno”, pero guiado por el editor

[ ] VEM-226 No hace falta refactorizar todo a Era 6 de golpe.

[ ] VEM-227 Para cada módulo:

[ ] VEM-228 Abrir en el editor.

[ ] VEM-229 Arreglar primero errores “runtime” (lo que ni siquiera cumple lo que el core entiende).

[ ] VEM-230 Luego ir eliminando/ajustando campos legacy que el editor marque, mientras añades los nuevos atributos Era 6 (type bien definido, roles completos, presentation coherente).

[ ] VEM-231 Sólo después, introducir un schema Era 6 puro

[ ] VEM-232 Cuando tengas unos cuantos módulos saneados, añades un module-schema-6-core.json más estricto.

[ ] VEM-233 Puedes tener tests separados:

schema-runtime debe pasar para todos.

schema-6-core sólo para los módulos ya migrados (lista blanca).

[ ] VEM-234 Por qué no estás “tan atrás” como parece
Tu parsing actual ya usa conceptos muy de Era 6:

roles para decidir param vs port/telemetry.

type para tipos de puerto.

[ ] VEM-235 Lo “feo” es sobre todo:

[ ] VEM-236 Campos de identidad/engine (Era 5.2) que quieres deprecar.

[ ] VEM-237 La mezcla de cosas de UI física (layout hp, columns, rack) con semántica.

[ ] VEM-238 Eso se puede ir limando módulo a módulo, pero con el apoyo del editor y del JSON Schema no es tan doloroso.

[ ] VEM-239 Qué te propongo como siguiente paso
Para desbloquearte sin meterte en un big bang:

[ ] VEM-240 En el siguiente mensaje te construyo un module-schema-runtime.json:

100% alineado con lo que lee AceCatalog hoy.

[ ] VEM-241 Con x-legacy: true en las propiedades que quieres ir matando.

[ ] VEM-242 Luego podemos pensar juntas dos cosas:

[ ] VEM-243 Cómo integras ese schema en un test CMake/CI que valide todos los manifests.

[ ] VEM-244 Cómo lo usa el editor para:

[ ] VEM-245 Mostrar campos reales.

[ ] VEM-246 Pintar en rojo/ámbar lo que es legacy.

[ ] VEM-247 Así avanzas por aquí sin bloquear la evolución a Era 6: el trabajo de limpieza que hagas ahora ya te sirve para el modelo futuro.

[ ] VEM-248 ¿Te parece bien que el siguiente mensaje sea directamente ese module-schema-runtime.json (aunque sea un poco largo) para que lo puedas pegar en el repo y empezar a jugar con validaciones?


[x] VEM-249 Te dejo una primera versión de module-schema-runtime.json alineada con lo que hace hoy AceCatalog::parseComponentNode, marcando campos claramente heredados con x-legacy: true.

module-schema-runtime.json
json
{
  "$id": "https://omega-synth.dev/schema/module-schema-runtime.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "OMEGA Module Manifest - Runtime Schema (Current Engine)",
  "type": "object",
  "required": ["id", "name", "family", "version", "registry"],
  "additionalProperties": true,
  "properties": {
    "id": {
      "type": "string",
      "description": "Canonical module ID (snakecase or dotted).",
      "examples": ["osc_va", "midi_in", "test_probe"]
    },
    "name": {
      "type": "string",
      "description": "Human readable name.",
      "examples": ["JUNO DCO", "MIDI IN", "PROBE"]
    },
    "family": {
      "type": "string",
      "description": "Functional family for browser / categorization.",
      "examples": ["Oscillator", "Utility", "Filter", "Env", "IO"]
    },

    "engine": {
      "type": "string",
      "description": "Execution engine family (Modular, etc).",
      "default": "Modular",
      "x-legacy": true
    },
    "modelId": {
      "type": "string",
      "description": "Industrial model identifier (Era 5.x).",
      "x-legacy": true
    },
    "implementationId": {
      "type": ["integer", "string"],
      "description": "Dispatch identifier for native implementations.",
      "default": 0,
      "x-legacy": true
    },
    "status": {
      "type": "string",
      "description": "Lifecycle state (active, bypass, loading...).",
      "x-legacy": true
    },
    "version": {
      "type": ["string", "integer"],
      "description": "Manifest/schema version as seen by AceCatalog.",
      "default": 1
    },
    "description": {
      "type": "string",
      "description": "Short text description for tools / browser."
    },
    "theme": {
      "type": "string",
      "description": "Visual theme (Era 5.2 UI concern).",
      "x-legacy": true
    },

    "layout": {
      "type": "object",
      "description": "Physical layout hints (hp, rack, columns). Mostly Era 5.2 UI.",
      "x-legacy": true,
      "properties": {
        "hp": {
          "type": "integer",
          "description": "Module width in HP; engine may auto-update (Living YAML)."
        },
        "minhp": {
          "type": "integer",
          "description": "Minimum HP width allowed.",
          "x-legacy": true
        },
        "rack": {
          "type": "string",
          "description": "Rack zone (upper/lower/...)."
        },
        "columns": {
          "type": "integer",
          "description": "Number of control columns."
        }
      },
      "additionalProperties": true
    },

    "registry": {
      "type": "array",
      "description": "Unified registry of parameters, ports and telemetry entities.",
      "items": {
        "type": "object",
        "required": ["id"],
        "additionalProperties": true,
        "properties": {
          "id": {
            "type": "string",
            "description": "Unique ID within the module (namespaces with dots allowed).",
            "examples": [
              "layer.a.osc.saw.on",
              "sig_in",
              "sig_out",
              "gain"
            ]
          },
          "label": {
            "type": "string",
            "description": "UI label for controls/ports (fallback: id)."
          },

          "type": {
            "type": "string",
            "description": "Data type for the entity. Used at least for port typing.",
            "enum": [
              "int",
              "float",
              "bool",
              "string",
              "list",
              "audio",
              "cv",
              "midi",
              "logic"
            ]
          },

          "roles": {
            "type": "array",
            "description": "Behavioral roles that drive parameter vs port vs telemetry wiring.",
            "items": {
              "type": "string",
              "enum": [
                "control",
                "stream",
                "input",
                "output",
                "mod_source",
                "mod_target",
                "telemetry",
                "expert"
              ]
            }
          },

          "direction": {
            "type": "string",
            "description": "Directional hint mainly from Era 5.2 (input/output/internal). Core still reads it.",
            "enum": ["input", "output", "internal"],
            "x-legacy": true
          },

          "range": {
            "type": "object",
            "description": "Numeric range for scalar parameters/ports.",
            "properties": {
              "min": { "type": "number" },
              "max": { "type": "number" },
              "default": { "type": "number" }
            }
          },
          "default": {
            "type": "number",
            "description": "Default value (legacy top-level, AceCatalog reads both default and range.default).",
            "x-legacy": true
          },

          "unit": {
            "type": "string",
            "description": "Unit for display (Hz, dB, ms, %, etc.)."
          },
          "precision": {
            "type": "integer",
            "description": "DSP resolution (Era 5.x).",
            "x-legacy": true
          },
          "ui_precision": {
            "type": "integer",
            "description": "UI display resolution.",
            "x-legacy": true
          },
          "stream": {
            "type": "boolean",
            "description": "If true, the pin requires high-fidelity telemetry streaming by default."
          },

          "import": {
            "type": "string",
            "description": "Legacy import hook (e.g., core.midi.channels).",
            "x-legacy": true
          },

          "midi": {
            "type": "object",
            "description": "Legacy MIDI mapping (cc, learnable, autobind).",
            "x-legacy": true,
            "properties": {
              "cc": { "type": ["integer", "string"] },
              "learnable": { "type": "boolean" },
              "autobind": { "type": "boolean" }
            },
            "additionalProperties": true
          },

          "presentation": {
            "type": "object",
            "description": "UI hints for rack layout and control cells.",
            "properties": {
              "tab": {
                "type": "string",
                "description": "Visual tab (MAIN, PATCHING, SETUP, etc.)."
              },
              "group": {
                "type": "string",
                "description": "Logical group header within the tab."
              },
              "order": {
                "type": ["integer", "number"],
                "description": "Relative ordering within group."
              },
              "ui": {
                "type": "object",
                "description": "Primary UI component hints.",
                "properties": {
                  "component": {
                    "type": "string",
                    "description": "UI component type.",
                    "enum": [
                      "knob",
                      "slider",
                      "slider-v",
                      "toggle",
                      "switch",
                      "display",
                      "led",
                      "list",
                      "hidden"
                    ]
                  },
                  "variant": {
                    "type": "string",
                    "description": "Visual variant (e.g., LED A/B, knob style…)."
                  }
                },
                "additionalProperties": true
              },
              "attachments": {
                "type": "array",
                "description": "Secondary visual attachments (display, led, label...).",
                "items": {
                  "type": "object",
                  "required": ["type"],
                  "properties": {
                    "type": {
                      "type": "string",
                      "description": "Attachment kind (display, led, label, etc.)."
                    },
                    "unit": {
                      "type": "string",
                      "description": "Unit for display attachments."
                    },
                    "label": {
                      "type": "string",
                      "description": "Label override for attachment."
                    },
                    "position": {
                      "type": "string",
                      "description": "Position hint (top, bottom, left, right...)."
                    },
                    "role": {
                      "type": "string",
                      "description": "Attachment-specific role (e.g., activity)."
                    },
                    "bind": {
                      "type": "string",
                      "description": "Legacy binding target (self.signal, etc.).",
                      "x-legacy": true
                    }
                  },
                  "additionalProperties": true
                }
              }
            },
            "additionalProperties": true
          }
        }
      }
    }
  }
}
Con esto puedes:

[ ] VEM-250 Validar todos los manifests actuales contra lo que realmente entiende el engine (no sólo la doc).

[ ] VEM-251 Usar x-legacy en el editor para:

[ ] VEM-252 Colorear los campos a deprecar.

[ ] VEM-253 Ir migrando módulo a módulo hacia un futuro module-schema-6-core.json más limpio.

[ ] VEM-254 ¿Te gustaría que el siguiente paso sea un pequeño script en Node/TypeScript que valide todos los .yaml de Resources/modules contra este schema y te liste qué falla en cada uno?


[ ] VEM-255 Te dejo un script sencillo en TypeScript (Node) usando ajv + yaml para validar todos los manifests contra module-schema-runtime.json.

1. Instalar dependencias
bash
npm install ajv ajv-formats yaml
# o pnpm / yarn según uses
2. Colocar el schema
Por ejemplo en:

text
tools/schema/module-schema-runtime.json
(con el contenido que te pasé antes).

3. Script tools/validate-manifests.ts
Ajusta la ruta base de manifests a donde los tengas (Resources/modules, etc.):

ts
import fs from 'fs'
import path from 'path'
import YAML from 'yaml'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'

const ROOT = path.resolve(__dirname, '..', '..') // ajusta si hace falta
const MANIFESTS_DIR = path.join(ROOT, 'Resources', 'modules') // cambia si tu ruta es otra
const SCHEMA_PATH = path.join(ROOT, 'tools', 'schema', 'module-schema-runtime.json')

function loadSchema() {
  const raw = fs.readFileSync(SCHEMA_PATH, 'utf8')
  return JSON.parse(raw)
}

function collectYamlFiles(dir: string): string[] {
  const result: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      result.push(...collectYamlFiles(full))
    } else if (e.isFile() && (e.name.endsWith('.yaml') || e.name.endsWith('.yml'))) {
      result.push(full)
    }
  }
  return result
}

function loadYaml(file: string): any {
  const text = fs.readFileSync(file, 'utf8')
  return YAML.parse(text)
}

async function main() {
  const schema = loadSchema()
  const ajv = new Ajv({ allErrors: true, strict: false })
  addFormats(ajv)

  const validate = ajv.compile(schema)

  const files = collectYamlFiles(MANIFESTS_DIR)
  let okCount = 0
  let failCount = 0

  for (const file of files) {
    let data: any
    try {
      data = loadYaml(file)
    } catch (e) {
      console.error(`✖ [YAML] Error parsing ${file}:`, (e as Error).message)
      failCount++
      continue
    }

    const valid = validate(data)
    if (!valid) {
      console.error(`✖ [SCHEMA] ${file}`)
      for (const err of validate.errors ?? []) {
        console.error(
          `   → ${err.instancePath || '(root)'} ${err.message} ` +
          (err.params ? JSON.stringify(err.params) : '')
        )
      }
      failCount++
    } else {
      console.log(`✔ ${file}`)
      okCount++
    }
  }

  console.log(`\nResumen: OK=${okCount}, FAIL=${failCount}`)

  if (failCount > 0) {
    process.exitCode = 1
  }
}

main().catch((e) => {
  console.error('Fatal error in validator:', e)
  process.exit(1)
})
4. Script en package.json
json
{
  "scripts": {
    "validate:manifests": "ts-node tools/validate-manifests.ts"
  }
}
(o compílalo a JS si prefieres).

[ ] VEM-256 Con esto tendrás un comando que te lista, manifest por manifest, qué rompe el schema runtime actual y te da una primera foto de cuánto “legacy raro” hay.

[ ] VEM-257 ¿Quieres que el siguiente paso sea definir cómo debería verse un manifest ya “limpio Era 6” para un módulo concreto (por ejemplo, el test_probe), a partir de lo que te devuelva este validador?


[ ] VEM-258 Entonces el plan sería:

[ ] VEM-259 Ejecutar el validador sobre tus manifests.

[ ] VEM-260 Ver qué se queja en test_probe (y compañía).

[ ] VEM-261 Sobre esa base, te preparo una versión “limpia Era 6” de test_probe:

[ ] VEM-262 Sin campos marcados x-legacy.

[ ] VEM-263 Con type y roles completos.

[ ] VEM-264 Con presentation coherente con la spec Era 6.

[ ] VEM-265 Cuando tengas a mano la salida del validador para test_probe (o si quieres pegamos aquí el contenido de test_probe-3.yaml enterito), te devuelvo directamente:

[ ] VEM-266 El YAML de test_probe reescrito en estilo Era 6.

[ ] VEM-267 Un pequeño diff conceptual (qué campos han desaparecido, qué se ha renombrado).


[ ] VEM-268 Podemos avanzar bastante sin ejecutar nada si fijamos decisiones de diseño para la Era 6. Te propongo tres piezas muy útiles para el futuro editor y para Omega:

1) Identidad y layout del módulo
Decidir qué campos quieres en la Era 6 “pura” para la raíz del manifest:

[ ] VEM-269 Campos que seguro quieres mantener:

id: ID canónico del tipo de módulo.

name: nombre legible.

version: versión del esquema (no del plugin).

family: categoría: osc, filter, env, io, utility, etc.

description: texto corto opcional.

[ ] VEM-270 Campos que podemos marcar como “metadata extra” (no core del schema):

author, tags, quizá origin o vendor.

[ ] VEM-271 Campos de layout físico:

[ ] VEM-272 ¿Quieres seguir teniendo layout.hp, layout.rack, layout.columns en el manifest, o preferirías que hp se derive al 100% de la densidad de controles como sugiere la spec Era 6?

[ ] VEM-273 Pregunta concreta:
¿Te gustaría que el manifest Era 6 siga declarando layout.hp y rack, o preferirías que esos datos vivan en otro lado (por ejemplo, en presets o en una “view policy” separada) y que el manifest sólo tenga semántica?

2) Semántica de type y roles (la parte más crítica)
Ahora mismo el core ya usa roles y type para decidir muchas cosas.

[ ] VEM-274 Sería bueno que definamos de forma explícita:

[ ] VEM-275 Conjunto cerrado de type:

[ ] VEM-276 Escalares: int, float, bool, string, list.

[ ] VEM-277 Señales: audio, cv.

[ ] VEM-278 ¿Quieres meter midi como tipo formal, o prefieres tratar el “MIDI stream” como algo aparte?

[ ] VEM-279 Conjunto cerrado de roles:

control: manipulable por usuario.

stream: flujo continuo (audio/cv/midi).

input / output: dirección lógica.

mod_source / mod_target: elegible para patchbay.

telemetry: sólo visualización (meters, leds).

expert: controles avanzados.

[ ] VEM-280 Y sobre todo, reglas claras:

[ ] VEM-281 Si roles contiene control → el editor debe tratarlo como parámetro (puede tener range, default, unit…).

[ ] VEM-282 Si roles contiene stream + input/output → es un puerto (con type audio/cv/midi).

[ ] VEM-283 Si roles contiene telemetry → se expone a telemetría pero no es controlable.

[ ] VEM-284 Si roles contiene mod_source → puede aparecer como source en getModulationMetadata.

[ ] VEM-285 Si roles contiene mod_target → puede ser target en patchbay.

[ ] VEM-286 Pregunta concreta:
¿Quieres que direction desaparezca y toda la dirección se derive sólo de roles input/output, o prefieres seguir teniendo direction como campo pero marcado “deprecated” en Era 6?

3) Estructura de presentation (lo que más usará el editor)
Aquí el .md de Era 6 ya da una forma razonable, y también coincide bastante con lo que tienes hoy:

[ ] VEM-287 Para cada entrada de registry:

presentation.tab: MAIN, PATCHING, SETUP, etc.

presentation.group: nombre de grupo.

presentation.order: número para ordenar.

presentation.ui.component:

[ ] VEM-288 Para Era 6, convendría cerrar el set mínimo: knob, slider_h, slider_v, switch, toggle, display, led, hidden, list.

presentation.attachments[]: tipo display, led, label con metadatos (unit, position, role).

[ ] VEM-289 Decisión útil para el editor:

[ ] VEM-290 ¿Quieres permitir “nombres libres” de tab (MAIN, PATCHING, SETUP, MIDI, etc.) como ahora, o prefieres fijar un enum corto (para que el editor los pinte con iconos / secciones estándar)?

[ ] VEM-291 ¿Quieres seguir soportando attachments genéricos, o prefieres limitar los tipos a una lista pequeña (display, led, label) para simplificar el editor y el renderer?

[ ] VEM-292 Si me respondes a estas tres cosas:

[ ] VEM-293 Mantener o no layout.hp/rack en el manifest.

[ ] VEM-294 Qué quieres hacer con direction vs roles input/output.

[ ] VEM-295 Si tab y attachments.type deberían ser libres o enumerados.

[ ] VEM-296 Con eso ya puedo proponerte:

[ ] VEM-297 Un “Era 6 core manifest shape” bien definido.

[ ] VEM-298 Cómo lo reflejamos en el JSON Schema, y qué constraints aplicará el editor.


[ ] VEM-299 Con tus respuestas queda bastante claro el modelo al que queremos llegar para Era 6.

1) Layout y posición del módulo
El manifest Era 6 debe ser puramente semántico: sin layout.hp, layout.rack, layout.columns como campos de verdad contractual.

[x] VEM-300 El ancho en HP se derivará de la densidad de controles y del layout resuelto por la WebUI (Dynamic HP), tal y como indica la spec Era 6.

[ ] VEM-301 Si hace falta conservar hints físicos, será en una view policy separada (otro YAML/JSON), no en el manifest de módulo.

2) Tipos y roles
Conjunto de tipos formales (Era 6 core):

[ ] VEM-302 Escalares: int, float, bool, string, list.

[ ] VEM-303 Señales: audio, cv.

[ ] VEM-304 Añadimos midi como tipo formal para puertos de flujo MIDI, porque el motor ya diferencia MIDI en la parte de ports y modulación.

[ ] VEM-305 Dirección:

direction desaparecerá del schema core; la dirección se deriva de roles:

input y/o output en roles son la única fuente de verdad.

[ ] VEM-306 Reglas explícitas:

control → parámetro manipulable.

stream + input/output → puerto de señal.

telemetry → fuente de visualización.

mod_source / mod_target → elegibles para patchbay, expuestos en getModulationMetadata.

3) Tabs y grupos
presentation.tab será un enum corto, no un string libre:

[ ] VEM-307 Por ejemplo: MAIN, PATCHING, SETUP, MIDI, ADVANCED.

[ ] VEM-308 El editor no permitirá escribirlo a mano, sólo elegir de una lista, que además podrá variar según el tipo de entidad si hace falta.

[x] VEM-309 Esto cuadra bien con la WebUI Era 6, que ya separa vistas (Rack, Patchbay, Inspector) y puede mapear tabs estándar a iconos/secciones fijas.

4) Attachments
attachments[].type será un set pequeño:

display, led, label (y quizá alguno más si de verdad hace falta: meter).

[ ] VEM-310 Nada de tipos genéricos arbitrarios a futuro; así el editor y el renderer saben exactamente qué UI se puede generar.

[x] VEM-311 Esto encaja con la idea de “control cells” de la spec: un componente principal con accesorios predecibles.

5) Implicaciones para el editor
El editor puede trabajar con dos modos:

[ ] VEM-312 Runtime actual (schema que ya definimos): para no romper nada existente y marcar legacy.

[ ] VEM-313 Era 6 core:

[ ] VEM-314 Sin layout.hp/rack.

[ ] VEM-315 Sin direction.

[ ] VEM-316 Con type y roles cerrados.

[ ] VEM-317 Con tab y attachments.type elegidos de listas.

[ ] VEM-318 Para terceros sin acceso a código:

[ ] VEM-319 El JSON Schema + el editor son la “contrato oficial”.

[x] VEM-320 La documentación en .md se vuelve explicativa, pero ya no es la única fuente de verdad.

[ ] VEM-321 Cuando quieras, el siguiente paso puede ser que te proponga el “shape” exacto del manifest Era 6 core (YAML de ejemplo + JSON Schema correspondiente) para un módulo sencillo como test_probe, siguiendo estas reglas.


[ ] VEM-322 Te propongo un “shape” Era 6 core aplicado a un módulo tipo test_probe y un JSON Schema que lo respalda, siguiendo las decisiones que acabas de fijar.

1) Ejemplo de manifest Era 6 core (YAML)
Versión limpia de test_probe, sin layout físico ni campos legacy:

text
id: "test_probe"
name: "Probe"
version: "6.0.0"
family: "utility"
description: "Minimal verification probe (Era 6 core schema)."

registry:
  # Control: gain
  - id: "gain"
    label: "GAIN"
    type: "float"
    roles: ["control", "mod_target"]
    range:
      min: 0.0
      max: 1.0
      default: 0.5
    unit: ""
    presentation:
      tab: "MAIN"
      group: "CONTROL"
      order: 1
      ui:
        component: "knob"
      attachments:
        - type: "label"
          position: "bottom"

  # Input port: audio in
  - id: "sig_in"
    label: "IN"
    type: "audio"
    roles: ["input", "stream"]
    presentation:
      tab: "PATCHING"
      group: "INPUTS"
      order: 1
      ui:
        component: "port"
      attachments:
        - type: "label"
          position: "bottom"

  # Output port: audio out + telemetry
  - id: "sig_out"
    label: "OUT"
    type: "audio"
    roles: ["output", "stream", "telemetry"]
    range:
      min: -1.0
      max: 1.0
      default: 0.0
    stream: true
    presentation:
      tab: "PATCHING"
      group: "OUTPUTS"
      order: 2
      ui:
        component: "port"
      attachments:
        - type: "label"
          position: "bottom"
        - type: "led"
          role: "activity"
Notas:

[ ] VEM-323 No hay engine, implementationId, layout.hp, rack, columns, ni direction.

[ ] VEM-324 La dirección se deriva de roles (input/output).

tab usa un conjunto finito (MAIN, PATCHING).

attachments.type está limitado a label y led.

[ ] VEM-325 Los puertos usan component: "port" como hint de UI genérico (el renderer puede mapearlo a la representación aseptica que toque en PATCHING).

2) JSON Schema Era 6 core (borrador sólido)
json
{
  "$id": "https://omega-synth.dev/schema/module-schema-6-core.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "OMEGA Module Schema - Era 6 Core",
  "type": "object",
  "required": ["id", "name", "version", "family", "registry"],
  "additionalProperties": false,
  "properties": {
    "id": {
      "type": "string",
      "description": "Canonical module type ID (snakecase or dotted)."
    },
    "name": {
      "type": "string",
      "description": "Human readable module name."
    },
    "version": {
      "type": "string",
      "description": "Schema version for this module type (semantic)."
    },
    "family": {
      "type": "string",
      "description": "Functional family/category.",
      "enum": ["osc", "filter", "env", "io", "utility", "fx", "lfo", "misc"]
    },
    "description": {
      "type": "string",
      "description": "Short description for documentation/browser."
    },
    "author": {
      "type": "string",
      "description": "Optional author/vendor string."
    },
    "tags": {
      "type": "array",
      "description": "Optional tags for search and tooling.",
      "items": { "type": "string" }
    },

    "registry": {
      "type": "array",
      "description": "Unified registry of parameters, ports and telemetry entities.",
      "items": {
        "type": "object",
        "required": ["id", "type", "roles"],
        "additionalProperties": false,
        "properties": {
          "id": {
            "type": "string",
            "description": "Unique ID within the module (namespaces with dots allowed)."
          },
          "label": {
            "type": "string",
            "description": "UI label; if omitted, UI may fall back to id."
          },

          "type": {
            "type": "string",
            "description": "Core data type.",
            "enum": [
              "int",
              "float",
              "bool",
              "string",
              "list",
              "audio",
              "cv",
              "midi"
            ]
          },

          "roles": {
            "type": "array",
            "description": "Behavioral roles that define semantics.",
            "minItems": 1,
            "items": {
              "type": "string",
              "enum": [
                "control",
                "stream",
                "input",
                "output",
                "mod_source",
                "mod_target",
                "telemetry",
                "expert"
              ]
            }
          },

          "range": {
            "type": "object",
            "description": "Numeric range for scalar parameters or normalized ports.",
            "additionalProperties": false,
            "properties": {
              "min": { "type": "number" },
              "max": { "type": "number" },
              "default": { "type": "number" }
            }
          },

          "unit": {
            "type": "string",
            "description": "Unit for display (Hz, dB, ms, %, etc.)."
          },

          "precision": {
            "type": "integer",
            "description": "DSP resolution for numeric types."
          },
          "ui_precision": {
            "type": "integer",
            "description": "UI display resolution for numeric types."
          },

          "stream": {
            "type": "boolean",
            "description": "If true, the entity is expected to have high-rate telemetry by default."
          },

          "presentation": {
            "type": "object",
            "description": "Visual hints for standard rack UI.",
            "additionalProperties": false,
            "properties": {
              "tab": {
                "type": "string",
                "description": "Visual tab for this entity.",
                "enum": ["MAIN", "PATCHING", "SETUP", "MIDI", "ADVANCED"]
              },
              "group": {
                "type": "string",
                "description": "Logical group header within the tab."
              },
              "order": {
                "type": ["integer", "number"],
                "description": "Relative ordering within group."
              },
              "ui": {
                "type": "object",
                "description": "Primary UI component hint.",
                "additionalProperties": false,
                "properties": {
                  "component": {
                    "type": "string",
                    "description": "UI component type.",
                    "enum": [
                      "knob",
                      "slider_h",
                      "slider_v",
                      "switch",
                      "toggle",
                      "display",
                      "led",
                      "port",
                      "hidden"
                    ]
                  }
                }
              },
              "attachments": {
                "type": "array",
                "description": "Secondary visual attachments for control cells.",
                "items": {
                  "type": "object",
                  "required": ["type"],
                  "additionalProperties": false,
                  "properties": {
                    "type": {
                      "type": "string",
                      "description": "Attachment kind.",
                      "enum": ["display", "led", "label"]
                    },
                    "unit": {
                      "type": "string",
                      "description": "Unit for display attachments."
                    },
                    "label": {
                      "type": "string",
                      "description": "Label override for the attachment."
                    },
                    "position": {
                      "type": "string",
                      "description": "Position hint relative to main control.",
                      "enum": ["top", "bottom", "left", "right"]
                    },
                    "role": {
                      "type": "string",
                      "description": "Attachment-specific role (e.g. activity)."
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
Este schema:

[ ] VEM-326 No incluye engine, implementationId, layout, direction ni campos claramente Era 5.2.

[ ] VEM-327 Cierra los tipos, roles, tabs y tipos de attachment a conjuntos pequeños, perfectos para el editor.

[ ] VEM-328 Es suficiente para que la WebUI Era 6 pueda montar:

[ ] VEM-329 Un rack estándar (MAIN).

[ ] VEM-330 Un santuario de patching (PATCHING).

[ ] VEM-331 Vistas de setup (SETUP) o MIDI si hace falta.

[ ] VEM-332 Cuando quieras, el siguiente paso puede ser:

[ ] VEM-333 Ver cómo un manifest real como osc_va se reescribiría en este formato Era 6 core, o

[ ] VEM-334 Empezar a bosquejar cómo el editor generaría formularios a partir de este JSON Schema (qué inputs muestra para cada campo).

[ ] VEM-335 La idea es que el editor lea este JSON Schema Era 6 y, a partir de él, genere formularios tipo “wizard” para la raíz y para cada entrada del registry.

1) Formulario de cabecera (root)
A partir de las propiedades root del schema (id, name, version, family, description, author, tags):

id (string): campo de texto, con validación de patrón (snakecase/dotted) si quieres.

name (string): texto.

version (string): texto con sugerencia de formato semver.

family (enum): combo desplegable con opciones fijas (osc, filter, env, io, utility, fx, lfo, misc).

description (string): textarea.

author (string): texto opcional.

tags (array de string): editor de chips/etiquetas (añadir/quitar tags).

[ ] VEM-336 El editor puede tener una vista tipo “Header” donde estos campos son un formulario simple.

2) Lista de entidades (registry)
Para registry el editor mostraría:

[ ] VEM-337 Una tabla/lista de filas, cada fila representando una entidad:

[ ] VEM-338 Columnas mínimas: id, label, type, roles, tab, group.

[ ] VEM-339 Controles principales:

[ ] VEM-340 Botón “Añadir entidad”.

[ ] VEM-341 Botón “Clonar entidad”.

[ ] VEM-342 Botón “Eliminar”.

[ ] VEM-343 Al seleccionar una fila, se abre un panel lateral o modal con el detalle de esa entidad.

3) Formulario de entidad (detalle de una entrada de registry)
Usando el schema de cada campo:

[ ] VEM-344 Campos básicos:

id (string): texto.

label (string): texto.

type (enum): combo (int, float, bool, string, list, audio, cv, midi).

roles (array enum): grupo de checkboxes:

control, stream, input, output, mod_source, mod_target, telemetry, expert.

[ ] VEM-345 Validaciones guiadas:

[ ] VEM-346 Si marcas input y output a la vez, destacar como caso raro.

[ ] VEM-347 Si type es audio/cv/midi y no marcas stream, sugerir marcarlo.

[ ] VEM-348 Campos numéricos y unidades:

range:

[ ] VEM-349 Mostrar tres campos numéricos: min, max, default.

unit:

[ ] VEM-350 Combo con valores frecuentes (Hz, dB, ms, %, etc.) + opción “custom”.

[ ] VEM-351 Telemetría:

stream:

[ ] VEM-352 Checkbox “Requiere telemetría de alta frecuencia”.

[ ] VEM-353 Presentación (presentation):

tab (enum): combo con valores fijos MAIN, PATCHING, SETUP, MIDI, ADVANCED.

group (string): texto.

order (number): numérico.

ui.component (enum):

[ ] VEM-354 Para tipos escalares y control: knob, slider_h, slider_v, switch, toggle, display, hidden.

[ ] VEM-355 Para stream+input/output: sugerir automáticamente port.

[ ] VEM-356 El editor puede filtrar opciones según type y roles:

[ ] VEM-357 Si es puerto (stream + input/output): mostrar sólo port.

[ ] VEM-358 Si es telemetry sin control: sugerir display o led.

[ ] VEM-359 Attachments:

attachments (array):

[ ] VEM-360 UI tipo lista de sub-items.

[ ] VEM-361 Cada attachment:

type (enum): display, led, label.

unit (string) – sólo visible si type display.

label (string).

position (enum): top, bottom, left, right.

role (string) – por ejemplo “activity”.

[ ] VEM-362 El editor puede mostrar una pequeña preview esquemática de la “control cell” (un knob con un display debajo, un led encima, etc.).

4) Reglas y ayudas inteligentes
Además de la generación directa desde el schema, el editor puede aplicar reglas:

[ ] VEM-363 Si roles contiene control pero no hay range → destacar y sugerir añadir rango.

[ ] VEM-364 Si roles contiene stream y type no es audio/cv/midi → aviso de posible inconsistencia.

[ ] VEM-365 Si roles contiene mod_source o mod_target → marcar visualmente que afectará al patchbay/matriz de modulación.

[ ] VEM-366 Si tab es PATCHING → sugerir que el ui.component sea port o hidden (aseptismo: no jacks frontales en MAIN).

5) Vista global y export
Vista “Resumen”:

[ ] VEM-367 Muestra una cuadrícula aprox. de cómo quedaría el módulo:

[ ] VEM-368 MAIN: controles distribuidos por group/order.

[ ] VEM-369 PATCHING: puertos de entrada/salida derivados de roles y presentation.

[ ] VEM-370 Botón “Exportar”:

[ ] VEM-371 Serializa el manifest a YAML según este schema.

[ ] VEM-372 Opcionalmente pasa el JSON resultante por el validador JSON Schema antes de guardarlo para garantizar que es Era 6 core.

[ ] VEM-373 Con este bosquejo ya se ve bastante claro cómo el editor puede ser casi totalmente schema-driven: las decisiones que has tomado (enums cerrados para type, roles, tab, component, attachments.type) son justo las que permiten autogenerar formularios robustos sin inventarse lógica a mano.

[ ] VEM-374 ¿Te gustaría que el próximo paso fuese concretar un pequeño “wireframe” textual de la UI del editor (cómo se organizan panes/pestañas) o prefieres que pasemos ya a ver cómo mapearía este manifest Era 6 a lo que espera el SemanticBrokerService / ModulationMetadata actual?


pero te voy a dar varias ideas.
Hay datos, en especial, los que son listas de valores, que para no tener que definir todos los datos de la lista se tendría que poder decir que se tomen los datos de una lista preconfigurada, por ejemplo, el listado de los 128 CC Midi bajo el estándar GM o los 16 canales midi + omni o las frecuencias de corte de un eq de 1/3 de octava,... (mira en el bundle porque esto se planteó y se llegó a hacer algo, pero puede que se haya perdido) y también se tendría que poder decir que se use la lista X pero que no se usen los valores y, z,.. por ejemplo, no usar el omni de la lista de canales midi.
también habría que poder decir que los controles (knobs, sliders) van en un grupo que se llama X y que van en un orden determinado.
al igual se tiene que poder decir que un knob o un slider muestra sus valores en HZ con n decimales, o en valores enteros o decimales con y decimales (independientemente de que internamente funcione con otros decimales) incluso mostrar una etiqueta por delante o por detras, por ejemplo, XXXX HZ o Hz: XXXX, o Channel XX o CH Chanel


[ ] VEM-375 Tiene todo el sentido, y además ya tenías medio camino hecho con cosas como import core.midi.channels y los attachments tipo display.

[ ] VEM-376 Listas preconfiguradas (lookups)
Tu ejemplo de midi2cv ya usa algo así:

midichan tiene import core.midi.channels para no tener que declarar a mano los 16 canales.

[ ] VEM-377 La idea Era 6 sería formalizar esto como un lookup:

text
- id: "midichan"
  label: "MIDI CHANNEL"
  type: "int"
  roles: ["control"]
  lookup:
    id: "core.midi.channels"
    exclude: ["omni"]   # opcional, para filtrar entradas
  presentation:
    tab: "MIDI"
    group: "CONNECTIVITY"
    order: 1
    ui:
      component: "list"
Donde:

lookup.id apunta a una tabla predefinida (p.ej. core.midi.channels, core.midi.cc, core.eq.1_3_oct_bands).

lookup.exclude permite quitar entradas concretas (“no usar OMNI”, “no usar CC0 y CC32”, etc.).

[ ] VEM-378 El editor:

[ ] VEM-379 Ofrece un combo de lookups conocidos.

[ ] VEM-380 Si eliges uno, te autocompleta la lista; si luego quieres “romper” el vínculo, puedes convertir a lista explícita.

[ ] VEM-381 Grupos, orden y layout lógico
Esto ya lo estás usando:

presentation.group y presentation.order en manifests como testprobe y midi2cv.

[ ] VEM-382 Era 6:

text
presentation:
  tab: "MAIN"
  group: "TUNING"
  order: 2
  ui:
    component: "knob"
group: el nombre de grupo (“TUNING”, “CONNECTIVITY”, “FILTER”, etc.).

order: número para ordenar los controles dentro del grupo.

[ ] VEM-383 El editor:

[ ] VEM-384 Ordena y distribuye los controls leyendo group y order.

[ ] VEM-385 No necesitas nada más en el manifest para layout físico: hp dinámico se deduce luego.

[ ] VEM-386 Formato de visualización (Hz, enteros, prefijos/sufijos)
En tus manifests ya aparece:

unit Hz, uiprecision 0/1/2 para cosas como cutofflow, gatefadein, etc.

[ ] VEM-387 Era 6 lo puede formalizar como:

text
- id: "cutoff"
  label: "CUTOFF"
  type: "float"
  roles: ["control", "mod_target"]
  range:
    min: 20.0
    max: 20000.0
    default: 1000.0
  unit: "Hz"
  precision: 4          # resolución interna
  ui_precision: 1       # decimales visibles
  presentation:
    tab: "MAIN"
    group: "FILTER"
    order: 1
    ui:
      component: "knob"
    attachments:
      - type: "display"
        position: "bottom"
        format:
          mode: "number"
          decimals: 1
          prefix: ""
          suffix: " Hz"
Para casos como “Channel XX” o “Hz: XXXX”, el format en el attachment:

mode: "number" o "integer" según quieras.

decimals: cuántos decimales mostrar.

prefix: Hz: , Channel , CH .

suffix: Hz, ch, etc.

[ ] VEM-388 El motor puede seguir trabajando con más decimales (precision alta), pero la UI sólo muestra lo que diga ui_precision/format.

[ ] VEM-389 Resumen de extensiones Era 6 sobre lo que ya tienes
Añadir a cada entrada de registry (opcional):

lookup.id y lookup.exclude para listas preconfiguradas (CC, canales, bandas EQ).

precision y ui_precision como ya usas.

[ ] VEM-390 En presentation.attachments[]:

[ ] VEM-391 Campo format con mode/decimals/prefix/suffix.

[ ] VEM-392 Con estas piezas, un tercero:

[ ] VEM-393 Elige grupos y orden con presentation.group/order.

[ ] VEM-394 Elige listas estándar con lookup.id sin repetir datos.

[ ] VEM-395 Decide exactamente cómo se ve el valor (Hz, enteros, prefijos/sufijos) sin tocar el código DSP.

[ ] VEM-396 ¿Te interesa que te escriba un mini bloque de JSON Schema Era 6 para lookup y attachments.format listo para pegar en el module-schema-6-core.json?

[ ] VEM-397 Añadiendo esto, tu schema Era 6 ya soporta lookups y formato de display.

[x] VEM-398 Bloque lookup para registry (JSON Schema)
Dentro de properties de cada entrada de registry en module-schema-6-core.json:

json
"lookup": {
  "type": "object",
  "description": "Referencia a una lista preconfigurada de opciones (MIDI CC, canales, bandas EQ, etc.).",
  "additionalProperties": false,
  "properties": {
    "id": {
      "type": "string",
      "description": "Identificador de la lista predefinida.",
      "enum": [
        "core.midi.channels",
        "core.midi.channels_no_omni",
        "core.midi.cc",
        "core.eq.1_3_oct_bands"
      ]
    },
    "exclude": {
      "type": "array",
      "description": "IDs o claves a excluir de la lista base.",
      "items": {
        "type": ["string", "number"]
      }
    }
  },
  "required": ["id"]
}
El editor puede usar lookup.id para poblar automáticamente la lista y aplicar exclude como filtro.

[ ] VEM-399 Bloque format para attachments (JSON Schema)
Dentro de properties de cada objeto de attachments.items.properties:

json
"format": {
  "type": "object",
  "description": "Opciones de formato para el valor mostrado en un attachment (display/label).",
  "additionalProperties": false,
  "properties": {
    "mode": {
      "type": "string",
      "description": "Modo de formateo del valor.",
      "enum": ["number", "integer", "string"]
    },
    "decimals": {
      "type": "integer",
      "description": "Número de decimales visibles para modo number.",
      "minimum": 0,
      "maximum": 6
    },
    "prefix": {
      "type": "string",
      "description": "Texto delante del valor (p.ej. 'Hz: ', 'CH ')."
    },
    "suffix": {
      "type": "string",
      "description": "Texto detrás del valor (p.ej. ' Hz', ' ch')."
    }
  }
}
Con esto puedes expresar:

suffix: " Hz" → XXXX Hz.

prefix: "Channel " y mode: "integer" → Channel 12.

[ ] VEM-400 ¿Quieres que el siguiente paso sea que te monte un README corto para terceros donde ya use estos campos (lookup, format, group/order) en uno o dos ejemplos completos de módulo?

[x] VEM-401 Aquí va un README corto, pensando en un tercero que sólo ve la documentación y el editor.

[ ] VEM-402 Introducción
Los módulos OMEGA Era 6 se describen mediante manifests YAML validados por un schema oficial.

[ ] VEM-403 El manifest define la semántica de controles, puertos y telemetría; la WebUI genera el layout dinámicamente.

[ ] VEM-404 Estructura básica de un módulo
Ejemplo mínimo:

text
id: "test_probe"
name: "Probe"
version: "6.0.0"
family: "utility"
description: "Minimal verification probe."

registry:
  # Control principal
  - id: "gain"
    label: "GAIN"
    type: "float"
    roles: ["control", "mod_target"]
    range:
      min: 0.0
      max: 1.0
      default: 0.5
    presentation:
      tab: "MAIN"
      group: "CONTROL"
      order: 1
      ui:
        component: "knob"

  # Puerto de entrada
  - id: "sig_in"
    label: "IN"
    type: "audio"
    roles: ["input", "stream"]
    presentation:
      tab: "PATCHING"
      group: "INPUTS"
      order: 1
      ui:
        component: "port"

  # Puerto de salida + telemetría
  - id: "sig_out"
    label: "OUT"
    type: "audio"
    roles: ["output", "stream", "telemetry"]
    stream: true
    range:
      min: -1.0
      max: 1.0
      default: 0.0
    presentation:
      tab: "PATCHING"
      group: "OUTPUTS"
      order: 2
      ui:
        component: "port"
      attachments:
        - type: "label"
          position: "bottom"
        - type: "led"
          role: "activity"
Puntos clave: tipos y roles determinan si algo es control, puerto o telemetría; tab/group/order determinan su posición lógica.

[ ] VEM-405 Tipos y roles
Tipos permitidos:

[ ] VEM-406 Escalares: int, float, bool, string, list.

[ ] VEM-407 Señales: audio, cv, midi.

[ ] VEM-408 Roles típicos:

control: parámetro ajustable por el usuario.

stream: flujo continuo (audio/cv/midi).

input / output: dirección lógica del puerto.

mod_source / mod_target: aparece en la patchbay como fuente o destino.

telemetry: sólo lectura para medidores/LEDs.

[ ] VEM-409 Ejemplos:

[ ] VEM-410 Knob de cutoff modulable:

text
type: "float"
roles: ["control", "mod_target"]
Puerto de audio de salida con telemetría:

text
type: "audio"
roles: ["output", "stream", "telemetry"]
Grupos, orden y tabs
La UI se organiza por pestañas y grupos.

presentation.tab: una de MAIN, PATCHING, SETUP, MIDI, ADVANCED.

presentation.group: nombre de grupo (“FILTER”, “TUNING”, etc.).

presentation.order: orden dentro del grupo.

[ ] VEM-411 Ejemplo:

text
presentation:
  tab: "MAIN"
  group: "FILTER"
  order: 2
  ui:
    component: "knob"
El editor te ofrece listas desplegables para tab y ordena los controles según group y order.

[ ] VEM-412 Listas preconfiguradas (lookups)
Para listas estándar (canales MIDI, CC, bandas EQ) puedes usar lookup sin definir todas las opciones manualmente.

[ ] VEM-413 Ejemplo: selector de canal MIDI sin OMNI:

text
- id: "midichan"
  label: "MIDI CHANNEL"
  type: "int"
  roles: ["control"]
  lookup:
    id: "core.midi.channels"
    exclude: ["omni"]
  presentation:
    tab: "MIDI"
    group: "CONNECTIVITY"
    order: 1
    ui:
      component: "list"
El motor de UI resolverá core.midi.channels a una lista de opciones estándar y aplicará exclude.

[ ] VEM-414 Formato de visualización (Hz, enteros, prefijos/sufijos)
Puedes separar la resolución interna del formato visual.

[ ] VEM-415 Ejemplo: cutoff en Hz con 1 decimal y sufijo:

text
- id: "cutoff"
  label: "CUTOFF"
  type: "float"
  roles: ["control", "mod_target"]
  range:
    min: 20.0
    max: 20000.0
    default: 1000.0
  unit: "Hz"
  precision: 4        # interno
  ui_precision: 1     # visible
  presentation:
    tab: "MAIN"
    group: "FILTER"
    order: 1
    ui:
      component: "knob"
    attachments:
      - type: "display"
        position: "bottom"
        format:
          mode: "number"
          decimals: 1
          prefix: ""
          suffix: " Hz"
Ejemplo: canal mostrado como CH 01:

text
- id: "channel"
  label: "CHANNEL"
  type: "int"
  roles: ["control"]
  range:
    min: 1
    max: 16
    default: 1
  presentation:
    tab: "MIDI"
    group: "CONNECTIVITY"
    order: 2
    ui:
      component: "knob"
    attachments:
      - type: "display"
        position: "bottom"
        format:
          mode: "integer"
          decimals: 0
          prefix: "CH "
          suffix: ""
Cómo se usa esto en el runtime
El manifest se valida contra el schema Era 6 core.

[ ] VEM-416 AceCatalog y SemanticBrokerService derivan parámetros, puertos y telemetría a partir de type, roles, range y lookup.

[ ] VEM-417 La WebUI genera el rack y el patchbay leyendo tab/group/order, ui.component, attachments y format.

[ ] VEM-418 Con sólo este YAML, un tercero puede definir cómo se ve y se comporta un módulo sin tocar C++.

[ ] VEM-419 ¿Quieres que a continuación te prepare un ejemplo completo de módulo MIDI-2-CV Era 6 que combine canales MIDI, CC y algún formato de display más elaborado, o prefieres que saltemos a cómo versionar y deprecar campos en la documentación para terceros?


[ ] VEM-420 Aquí tienes un ejemplo de módulo MIDI-2-CV Era 6 completo, usando lookups, grupos, formato de display y puertos listos para patchbay.

text
id: "midi2cv_e6"
name: "MIDI to CV"
version: "6.0.0"
family: "io"
description: "MIDI 1.x/2.0 to high‑resolution pitch CV and gate."

registry:
  #========================
  # TUNING & CONNECTIVITY
  #========================

  - id: "midichan"
    label: "MIDI CHANNEL"
    type: "int"
    roles: ["control"]
    lookup:
      id: "core.midi.channels"
      exclude: ["omni"]
    presentation:
      tab: "MIDI"
      group: "CONNECTIVITY"
      order: 1
      ui:
        component: "list"
      attachments:
        - type: "display"
          position: "bottom"
          format:
            mode: "integer"
            decimals: 0
            prefix: "CH "
            suffix: ""

  - id: "transpose"
    label: "TRANSPOSE"
    type: "int"
    roles: ["control", "mod_target"]
    range:
      min: -24
      max: 24
      default: 0
    unit: "st"
    precision: 0
    ui_precision: 0
    presentation:
      tab: "MAIN"
      group: "TUNING"
      order: 1
      ui:
        component: "knob"
      attachments:
        - type: "display"
          position: "bottom"
          format:
            mode: "integer"
            decimals: 0
            prefix: ""
            suffix: " st"

  - id: "bendrange"
    label: "BEND RANGE"
    type: "int"
    roles: ["control", "mod_target"]
    range:
      min: 0
      max: 24
      default: 2
    unit: "st"
    precision: 0
    ui_precision: 0
    presentation:
      tab: "MAIN"
      group: "TUNING"
      order: 2
      ui:
        component: "knob"
      attachments:
        - type: "display"
          position: "bottom"
          format:
            mode: "integer"
            decimals: 0
            prefix: ""
            suffix: " st"

  #========================
  # EXPRESSION (CC, WHEEL)
  #========================

  - id: "modwheel"
    label: "MOD WHEEL"
    type: "float"
    roles: ["control", "stream", "mod_source", "telemetry"]
    range:
      min: 0.0
      max: 1.0
      default: 0.0
    unit: ""
    precision: 4
    ui_precision: 2
    presentation:
      tab: "MAIN"
      group: "EXPRESSION"
      order: 1
      ui:
        component: "slider_h"
      attachments:
        - type: "display"
          position: "bottom"
          format:
            mode: "number"
            decimals: 2
            prefix: ""
            suffix: ""
        - type: "led"
          position: "top"
          role: "activity"

  - id: "expression_cc"
    label: "EXPRESSION CC"
    type: "int"
    roles: ["control"]
    lookup:
      id: "core.midi.cc"
      exclude: [0, 32]   # ejemplo: no usar Bank Select MSB/LSB
    presentation:
      tab: "MIDI"
      group: "EXPRESSION"
      order: 1
      ui:
        component: "list"
      attachments:
        - type: "label"
          position: "bottom"

  #========================
  # PATCHING (CV & GATE)
  #========================

  - id: "pitch_cv"
    label: "PITCH CV"
    type: "cv"
    roles: ["output", "stream", "mod_source", "telemetry"]
    range:
      min: -5.0
      max: 5.0
      default: 0.0
    unit: "V"
    precision: 5
    ui_precision: 2
    stream: true
    presentation:
      tab: "PATCHING"
      group: "OUTPUTS"
      order: 1
      ui:
        component: "port"
      attachments:
        - type: "display"
          position: "bottom"
          format:
            mode: "number"
            decimals: 2
            prefix: ""
            suffix: " V"

  - id: "gate_out"
    label: "GATE"
    type: "cv"
    roles: ["output", "stream", "telemetry"]
    range:
      min: 0.0
      max: 1.0
      default: 0.0
    unit: ""
    precision: 3
    ui_precision: 1
    stream: true
    presentation:
      tab: "PATCHING"
      group: "OUTPUTS"
      order: 2
      ui:
        component: "port"
      attachments:
        - type: "led"
          position: "top"
          role: "gate"

  #========================
  # SETUP / EXPERT
  #========================

  - id: "glide_time"
    label: "GLIDE"
    type: "float"
    roles: ["control", "expert", "mod_target"]
    range:
      min: 0.0
      max: 10.0
      default: 0.0
    unit: "s"
    precision: 4
    ui_precision: 1
    presentation:
      tab: "SETUP"
      group: "GLIDE"
      order: 1
      ui:
        component: "knob"
      attachments:
        - type: "display"
          position: "bottom"
          format:
            mode: "number"
            decimals: 1
            prefix: ""
            suffix: " s"
Con este manifest:

[ ] VEM-421 El editor puede ofrecer:

[ ] VEM-422 Listas de canales (core.midi.channels) y CC (core.midi.cc) sin que el autor defina 128 entradas.

[ ] VEM-423 Grupos claros: TUNING, EXPRESSION, OUTPUTS, GLIDE; tabs MAIN/MIDI/PATCHING/SETUP.

[ ] VEM-424 Displays con formatos como CH 01, 2.00 V, 0.5 s usando format.prefix/suffix/decimals.

[ ] VEM-425 El runtime obtiene:

[ ] VEM-426 Controles: midichan, transpose, bendrange, glide_time, etc., todos con rango y unidades bien definidas.

[ ] VEM-427 Mod sources: modwheel, pitch_cv (si lo quieres como fuente en patchbay).

[ ] VEM-428 Puertos de señal claros (pitch_cv, gate_out) listos para telemetría y patching.

[ ] VEM-429 ¿Quieres que el próximo paso sea derivar explícitamente de este manifest qué parámetros/puertos vería SemanticBrokerService (como si hiciéramos la tabla de inventory que devuelve getModulationMetadata)?


[ ] VEM-430 A partir del manifest MIDI-2-CV Era 6, se puede derivar qué vería el runtime como parámetros y puertos.

[ ] VEM-431 Parámetros (controls)
Siguiendo las reglas de AceCatalog/Era 6, cualquier entrada con roles que contenga control se convierte en parámetro con rango y valor por defecto.

id	label	min	max	default	unit	expert	mod_target
midichan	MIDI CHANNEL	1	16	(según lookup)	ch	no	no
transpose	TRANSPOSE	-24	24	0	st	no	sí
bendrange	BEND RANGE	0	24	2	st	no	sí
modwheel	MOD WHEEL	0.0	1.0	0.0		no	no
expression_cc	EXPRESSION CC	0	127	(lookup)		no	no
glide_time	GLIDE	0.0	10.0	0.0	s	sí	sí
mod_target en roles indica parámetros modulables (destinos de patchbay).

expert marca controles que podrían mostrarse solo en vistas avanzadas (SETUP).

[ ] VEM-432 Puertos de modulación / señal
Cualquier entrada con roles que incluya stream y input/output se convierte en puerto con tipo Audio/CV/MIDI y, opcionalmente, telemetría.

id	label	type	direction	stream	telemetry	mod_source
modwheel	MOD WHEEL	CV	output	sí	sí	sí
pitch_cv	PITCH CV	CV	output	sí	sí	sí
gate_out	GATE	CV	output	sí	sí	no
modwheel y pitch_cv serían candidates a mod_source en getModulationMetadata.sources.

gate_out expone telemetría (puede usarse en leds/oscilloscopio), pero no se marca como fuente de modulación.

[ ] VEM-433 Telemetría
Entradas con roles incluyendo telemetry y stream: true se registran como pines de telemetría de alta frecuencia.

modwheel, pitch_cv, gate_out → pins de telemetría:

modwheel: continuo 0..1.

pitch_cv: señal CV.

gate_out: puerta binaria.

[ ] VEM-434 Esto se refleja en el hub de telemetría que RpcTelemetryController expone a la WebUI.

[ ] VEM-435 Cómo lo vería getModulationMetadata
De forma esquemática, el inventario que devolvería para este módulo tendría:

sources:

modwheel (control/stream/mod_source).

pitch_cv (output/stream/mod_source).

targets:

transpose, bendrange, glide_time (control/mod_target).

inventory:

[ ] VEM-436 Entrada por módulo con:

instanceId (resuelto por el preset).

modelId ≈ midi2cv_e6.

ports según la tabla de puertos anterior.

[ ] VEM-437 ¿Te gustaría que el próximo paso sea elegir otro módulo (por ejemplo el osc_va del bundle) y bosquejar cómo quedaría su manifest reescrito a Era 6 siguiendo todo esto?


[x] VEM-438 La forma más limpia es tratar el schema como contrato y la documentación como vista de ese contrato.

[ ] VEM-439 Capas de versión
Versión del schema (Era 6):

module-schema-runtime.json: compatibilidad con motor actual, marca legacy con x-legacy.

module-schema-6-core.json: modelo nuevo, sin campos heredados.

[ ] VEM-440 Versión del manifest de módulo:

[ ] VEM-441 Campo version: "6.0.0" en el YAML, interpretado como “versión del tipo de módulo”.

[x] VEM-442 Versión de la doc:

[ ] VEM-443 En el README para terceros, indicar claramente a qué schema apunta: “Esta guía se refiere a module-schema-6-core.json v1.0”.

[ ] VEM-444 Deprecación en schema
En los schemas para runtime:

[ ] VEM-445 Campos heredados marcados así:

json
"direction": {
  "type": "string",
  "enum": ["input", "output", "internal"],
  "description": "Deprecated in Era 6; use roles input/output instead.",
  "x-legacy": true
}
El editor:

[ ] VEM-446 Los muestra atenuados o con un icono de “deprecated”.

[ ] VEM-447 No los ofrece en el modo Era 6 core (solo en modo “legacy/runtime”).

[x] VEM-448 De esta forma la documentación no tiene que repetir qué está deprecado: se apoya en las flags del schema.

[ ] VEM-449 Política de evolución para terceros
En la doc para autores de módulos:

[ ] VEM-450 Definir niveles de soporte:

“Soportado Era 6 core”: sólo campos del schema core.

“Soportado por compatibilidad”: campos marcados x-legacy en module-schema-runtime.json.

“No soportado”: cualquier campo fuera de los schemas.

[ ] VEM-451 Regla clara:

“Si tu módulo usa sólo Era 6 core, está garantizado en futuras versiones mayores.”

“Los campos marcados como x-legacy pueden dejar de tener efecto en versiones futuras.”

[ ] VEM-452 Ejemplo de sección de doc de deprecación
En el README para terceros podrías incluir algo como:

[ ] VEM-453 Campos heredados (deprecated)

direction: ya no se usa en Era 6; la dirección se deduce de roles input/output.

engine, implementationId, layout.hp, layout.columns: sólo relevantes para compatibilidad con presets antiguos; no deben usarse en nuevos módulos.

[ ] VEM-454 Cualquier campo marcado como x-legacy: true en los schemas está sujeto a eliminación futura.

[ ] VEM-455 Y también:

[ ] VEM-456 Para nuevos módulos, recomendamos:

[ ] VEM-457 Validar sólo contra module-schema-6-core.json.

[ ] VEM-458 No usar campos marcados x-legacy en el schema runtime.

[ ] VEM-459 Control del editor
En el editor puedes tener dos modos:

[ ] VEM-460 Modo “Legacy / Runtime”:

[ ] VEM-461 Carga module-schema-runtime.json.

[ ] VEM-462 Permite ver y editar campos legacy, pero los pinta como deprecados.

[ ] VEM-463 Modo “Era 6 Core (Recomendado)”:

[ ] VEM-464 Carga module-schema-6-core.json.

[ ] VEM-465 No muestra campos legacy; los manifests generados en este modo son “limpios” por definición.

[ ] VEM-466 En la doc para terceros, simplemente se les dice: “usa el modo Era 6 Core”. Así les blindas sin tener que explicar todos los matices del runtime actual.

[ ] VEM-467 ¿Quieres que te redacte un bloque de texto listo para pegar en la doc que explique estas reglas de versión/deprecación en tono “guía oficial para desarrolladores”?


[ ] VEM-468 Política de versiones y deprecación (para desarrolladores de módulos)
Esta sección describe cómo versionar manifests y qué campos se consideran heredados en OMEGA Era 6.

1. Schemas oficiales
OMEGA publica dos schemas JSON para manifests de módulo:

module-schema-6-core.json

[ ] VEM-469 Esquema recomendado para nuevos módulos.

[ ] VEM-470 Sólo incluye campos Era 6; no contiene propiedades heredadas de Era 5.x.

module-schema-runtime.json

[ ] VEM-471 Refleja exactamente lo que el motor actual entiende.

[ ] VEM-472 Incluye campos heredados marcados con x-legacy: true para compatibilidad.

[x] VEM-473 Al desarrollar nuevos módulos, valida siempre tus manifests contra module-schema-6-core.json.

2. Versión del módulo
Cada manifest debe declarar su versión:

text
version: "6.0.0"
Esta versión describe la evolución del propio módulo (cambios en parámetros, puertos, comportamiento).

[ ] VEM-474 No es la versión del schema: el schema se versiona aparte y lo gestiona la plataforma.

[ ] VEM-475 Se recomienda seguir un esquema similar a semver (major.minor.patch).

3. Campos heredados (deprecated)
El schema runtime marca explícitamente los campos heredados:

[ ] VEM-476 Cualquier propiedad con x-legacy: true se considera deprecated.

[ ] VEM-477 Ejemplos típicos:

direction (la dirección se deduce ahora de roles input/output).

engine, implementationId, layout.hp, layout.columns y otros detalles físicos.

[ ] VEM-478 Reglas para desarrolladores:

[ ] VEM-479 No uses campos marcados x-legacy en módulos nuevos.

[ ] VEM-480 Estos campos pueden dejar de tener efecto en futuras versiones del motor, aunque sigan presentes en manifests antiguos.

4. Modos del editor
El editor de manifests ofrece dos modos de trabajo:

[ ] VEM-481 Modo Era 6 Core (recomendado)

[ ] VEM-482 Opera únicamente con module-schema-6-core.json.

[ ] VEM-483 No muestra campos x-legacy.

[ ] VEM-484 Todos los manifests creados en este modo son compatibles a futuro por diseño.

[ ] VEM-485 Modo Runtime / Legacy

[ ] VEM-486 Opera con module-schema-runtime.json.

[x] VEM-487 Muestra campos heredados con un estilo visual diferenciado o icono de deprecación.

Útil para inspeccionar o migrar módulos antiguos, no para desarrollar nuevos diseños.

[ ] VEM-488 Como desarrollador externo, deberías utilizar siempre el modo Era 6 Core salvo que estés adaptando un módulo heredado.

5. Garantías de compatibilidad
Los manifests que sólo usan propiedades definidas en module-schema-6-core.json se consideran compatibles hacia delante: futuras versiones del motor mantendrán su semántica básica.

[ ] VEM-489 Los campos marcados x-legacy siguen soportados en la versión actual del motor para conservar presets y módulos antiguos, pero su significado puede degradarse o desaparecer en versiones mayores.

[ ] VEM-490 En caso de duda, consulta primero el schema Era 6 Core: es la fuente de verdad para nuevos módulos.


[ ] VEM-491 Una posible vista en ASCII para un módulo sencillo con varias opciones (MAIN + PATCHING + SETUP) podría ser así.

[ ] VEM-492 Layout general (tabs + panel)
text
+-------------------------------------------------------------+
| OMEGA RACK  | [MAIN] [PATCHING] [SETUP] [MIDI] [ADVANCED]  |
+-------------------------------------------------------------+
| MODULE: MIDI to CV (midi2cv_e6)                             |
+-------------------------------------------------------------+
| TAB: MAIN                                                   |
|                                                             |
|  [GROUP: TUNING]                                            |
|                                                             |
|   +---------------------+   +---------------------+         |
|   |  TRANSPOSE          |   |  BEND RANGE         |         |
|   |                     |   |                     |         |
|   |       (KNOB)        |   |       (KNOB)        |         |
|   |                     |   |                     |         |
|   |        -02 st       |   |         02 st       |         |
|   +---------------------+   +---------------------+         |
|                                                             |
|  [GROUP: EXPRESSION]                                        |
|                                                             |
|   MOD WHEEL: [====------]  0.45                             |
|               (SLIDER)   [●] activity LED                   |
|                                                             |
+-------------------------------------------------------------+
Misma sesión, tab PATCHING
text
+-------------------------------------------------------------+
| OMEGA RACK  | [MAIN] [PATCHING] [SETUP] [MIDI] [ADVANCED]  |
+-------------------------------------------------------------+
| MODULE: MIDI to CV (midi2cv_e6)                             |
+-------------------------------------------------------------+
| TAB: PATCHING                                               |
|                                                             |
|  [GROUP: INPUTS]                                            |
|                                                             |
|   IN:    ○──────────────────────────────                    |
|          (PORT - AUDIO IN)                                  |
|                                                             |
|  [GROUP: OUTPUTS]                                           |
|                                                             |
|   PITCH CV:  ●──────────────────────────►                   |
|              (PORT - CV OUT)    [ +0.12 V ]                 |
|                                                             |
|   GATE:      ●──────────────────────────►   [●] gate        |
|              (PORT - CV OUT)            (LED)               |
|                                                             |
+-------------------------------------------------------------+
Misma sesión, tab SETUP (expert)
text
+-------------------------------------------------------------+
| OMEGA RACK  | [MAIN] [PATCHING] [SETUP] [MIDI] [ADVANCED]  |
+-------------------------------------------------------------+
| MODULE: MIDI to CV (midi2cv_e6)                             |
+-------------------------------------------------------------+
| TAB: SETUP                                                  |
|                                                             |
|  [GROUP: GLIDE]                                             |
|                                                             |
|   +---------------------+                                   |
|   |  GLIDE              |                                   |
|   |                     |                                   |
|   |       (KNOB)        |                                   |
|   |                     |                                   |
|   |        0.5 s        |                                   |
|   +---------------------+                                   |
|                                                             |
+-------------------------------------------------------------+
Misma sesión, tab MIDI (listas/lookup)
text
+-------------------------------------------------------------+
| OMEGA RACK  | [MAIN] [PATCHING] [SETUP] [MIDI] [ADVANCED]  |
+-------------------------------------------------------------+
| MODULE: MIDI to CV (midi2cv_e6)                             |
+-------------------------------------------------------------+
| TAB: MIDI                                                   |
|                                                             |
|  [GROUP: CONNECTIVITY]                                     |
|                                                             |
|   MIDI CHANNEL:  [ CH 01 v ]                               |
|                                                             |
|  [GROUP: EXPRESSION]                                       |
|                                                             |
|   EXPRESSION CC: [ CC 11 - Expression v ]                  |
|                                                             |
+-------------------------------------------------------------+
Con esto ya tienes varias opciones en una sola maqueta: knobs con displays, sliders con LED, puertos de patching con displays y LEDs, controles expert en SETUP y listas basadas en lookup en la pestaña MIDI.


[ ] VEM-493 La duda es buena y sí, implica decidir una API de layout de “celdas” para el renderer, pero no hace falta complicarla mucho.

1) Pensar en “control cell” parametrizable
En Era 6 ya estás cerca: cada entrada del registry es una celda con:

[ ] VEM-494 Un control principal (ui.component: knob, slider, port).

[ ] VEM-495 Cero o más attachments (label, display, led).

[ ] VEM-496 Lo que falta es decirle al renderer cómo combinarlos:

[ ] VEM-497 Caso A: etiqueta arriba, knob en medio, display abajo.

[ ] VEM-498 Caso B: sólo etiqueta + knob (sin display).

[ ] VEM-499 Caso C: sólo knob + display (sin etiqueta).

[ ] VEM-500 Eso ya lo puedes expresar con lo que tienes:

text
presentation:
  ui:
    component: "knob"
  attachments:
    - type: "label"
      position: "top"
    - type: "display"
      position: "bottom"
Frente a:

text
presentation:
  ui:
    component: "knob"
  attachments:
    - type: "label"
      position: "top"
La variedad de formas sale de:

[ ] VEM-501 Qué attachments declaras (label, display, led).

[ ] VEM-502 Dónde los colocas (position: top/bottom/left/right).

[ ] VEM-503 El mismo knob puede verse de varias formas sin tocar el schema, sólo cambiando attachments.

2) Qué tendría que hacer el motor de render
Ahí sí hay que tocar un poco el renderer de OMEGA para que sea cell-based:

[ ] VEM-504 Para cada entrada del registry:

[ ] VEM-505 Crea un contenedor de celda (un pequeño Flexbox o grid).

[ ] VEM-506 Coloca dentro:

[ ] VEM-507 Componente principal (knob/slider/port).

[ ] VEM-508 Para cada attachment, según position:

top → fila superior.

bottom → fila inferior.

left/right → columnas laterales.

[ ] VEM-509 Ejemplo simple de layout interno de celda:

text
[ top attachments: labels / leds / displays en una fila ]
[ fila principal:  (left attachments)  KNOB  (right attachments) ]
[ bottom attachments: displays / labels ]
Con eso, tus dos casos concretos:

[ ] VEM-510 Etiqueta arriba + knob + valores abajo:

text
attachments:
  - type: "label"
    position: "top"
  - type: "display"
    position: "bottom"
Sólo cartel + knob:

text
attachments:
  - type: "label"
    position: "top"
El motor no necesita saber “modo A/B/C”: sólo respeta la lista de attachments y sus posiciones.

3) Qué no hace falta cambiar
El schema Era 6 ya te vale:

attachments.type limitado a label/display/led.

position enum top/bottom/left/right.

[ ] VEM-511 El editor también:

[ ] VEM-512 Solo tiene que permitir añadir/quitar attachments y elegir position.

[ ] VEM-513 Lo que cambia es la implementación concreta de la UI (TypeScript/CSS):

[ ] VEM-514 Ahora la UI debe tratar cada item de registry como una celda que compone varios subcomponentes, no como un knob suelto con un label “hardcoded”.

4) Cómo soportar variaciones sin skins
Si mañana quieres más variantes de la misma celda (p.ej. dos displays, uno arriba y otro abajo):

text
attachments:
  - type: "label"
    position: "top"
  - type: "display"
    position: "top"
    format:
      prefix: "Min "
  - type: "display"
    position: "bottom"
    format:
      prefix: "Max "
El renderer:

[ ] VEM-515 En la fila top apila label + display (puede ser en horizontal).

[ ] VEM-516 En la fila bottom coloca el otro display.

[x] VEM-517 Es decir, con sólo attachments + position ya puedes construir muchas combinaciones sin tocar el schema ni meter flags especiales.

5) Resumen práctico
Sí, hay que tocar el motor de renderizado:

[ ] VEM-518 Pasar de “un componente por control” a “celda con componente + attachments posicionados”.

[ ] VEM-519 No hace falta cambiar el modelo Era 6:

[ ] VEM-520 Lo que ya hemos definido (attachments + position) es justo la abstracción que necesitas.

[x] VEM-521 ¿Te gustaría que el siguiente paso fuese escribir un pequeño “contrato” en la doc de la WebUI que diga: “un control cell se compone así: orden de zonas, cómo se apilan attachments, etc.” para que quien toque el renderer tenga las reglas claras?


[ ] VEM-522 Contrato de “Control Cell” para la WebUI Era 6
Una control cell es la unidad mínima de UI generada a partir de una entrada de registry en el manifest.

[ ] VEM-523 Cada cell combina un control principal y cero o más attachments posicionados alrededor.

1) Zonas de la celda
La celda se divide en hasta 3 bandas verticales:

[ ] VEM-524 Zona top: attachments con position: "top" (labels, displays, leds).

[ ] VEM-525 Zona center:

[ ] VEM-526 Lado izquierdo: attachments con position: "left".

[ ] VEM-527 Centro: control principal (ui.component).

[ ] VEM-528 Lado derecho: attachments con position: "right".

[ ] VEM-529 Zona bottom: attachments con position: "bottom".

[ ] VEM-530 El renderer debe:

[ ] VEM-531 Crear un contenedor por cell.

[ ] VEM-532 Ordenar attachments según su position en estas zonas.

2) Control principal
El control principal siempre viene de:

text
presentation:
  ui:
    component: "knob" | "slider_h" | "slider_v" | "switch" | "toggle" | "display" | "led" | "port" | "hidden"
Se coloca en el centro de la zona center.

hidden implica que no se renderiza un control principal, sólo attachments.

3) Attachments
Cada attachment:

text
attachments:
  - type: "label" | "display" | "led"
    position: "top" | "bottom" | "left" | "right"
    role: "activity" | "gate" | ...
    format: { ... }        # sólo para display/label
Reglas:

type: "label": texto estático (normalmente label del control o texto custom).

type: "display": muestra el valor del control/puerto con format (decimales, prefijos, sufijos).

type: "led": indicador binario/actividad, se enlaza semánticamente via role (activity, gate).

[ ] VEM-533 El renderer:

[x] VEM-534 No decide combinaciones especiales; simplemente:

[ ] VEM-535 Agrupa por position.

[ ] VEM-536 Para cada zona, apila los attachments en horizontal o vertical según el diseño.

4) Ejemplos de composición
Etiqueta arriba, knob en medio, valor abajo:

text
presentation:
  ui:
    component: "knob"
  attachments:
    - type: "label"
      position: "top"
    - type: "display"
      position: "bottom"
      format:
        mode: "number"
        decimals: 1
        suffix: " Hz"
Sólo etiqueta + knob:

text
presentation:
  ui:
    component: "knob"
  attachments:
    - type: "label"
      position: "top"
Knob con LED de actividad a la derecha:

text
presentation:
  ui:
    component: "knob"
  attachments:
    - type: "led"
      position: "right"
      role: "activity"
5) Responsabilidades del renderer
Tratar cada entrada de registry como una cell autónoma.

[ ] VEM-537 Respetar estrictamente:

ui.component como control central.

attachments[].type y attachments[].position para colocar elementos auxiliares.

attachments[].format para displays (prefijo, sufijo, decimales).

[ ] VEM-538 No introducir lógica ad hoc de layout por módulo; la variación visual sale de los manifests.

[x] VEM-539 Con este contrato, cualquier variación que quieras (etiqueta arriba, display abajo, LED lateral, sólo knob, etc.) se consigue combinando attachments, sin cambiar el schema ni añadir flags especiales en el código.

[ ] VEM-540 Hay tres piezas que conviene dejar ya apuntadas para que todo encaje bien:

1) Tamaños y prioridades dentro de la cell
Para que el renderer no “adivine”:

[x] VEM-541 Definir prioridades implícitas:

[ ] VEM-542 El control principal siempre domina la zona center (knob más grande, slider ocupa ancho completo, port más compacto).

[ ] VEM-543 Attachments top/bottom usan tamaño de texto estándar; left/right se hacen compactos para no comer demasiado espacio vertical.

(Opcional) Campo simple de densidad por cell, si algún día quieres variaciones tipo “mini knob” vs “full-size”, por ejemplo:

text
presentation:
  density: "normal" # "mini" | "normal" | "large"
Esto ayudaría al renderer a decidir tamaños sin depender de skins.

2) Mapeo claro a datos (binding)
Para que terceros no tengan que pensar en wiring:

[ ] VEM-544 Regla:

display sin role → ligado al valor del propio control/puerto de la cell.

led sin role → ligado a telemetría principal de la cell (ej. gate, actividad).

[ ] VEM-545 Si algún día necesitas que un attachment muestre otra cosa (ej. otro parámetro), podrías añadir un campo bind semántico:

text
attachments:
  - type: "display"
    position: "bottom"
    bind: "self.value"   # default
Pero para Era 6 core, probablemente con defaults sensatos self.* te vale.

3) Comportamiento en grids/tablas
Has definido bien las celdas, falta solo recordar:

[ ] VEM-546 En MAIN:

[ ] VEM-547 Distribuir cells por group y order en una cuadrícula (p.ej. 3–4 columnas, auto-wrap).

[ ] VEM-548 En PATCHING:

[ ] VEM-549 Cells de tipo port pueden compactarse (por ejemplo sólo etiqueta y jack) para que patchbay sea limpia.

[ ] VEM-550 En SETUP:

[ ] VEM-551 Respetar roles: ["expert"] para poder ocultar/mostrar grupos avanzados.

[x] VEM-552 Con esto, el “contrato” de manifest → cell → layout está bastante cerrado y cualquier cosa que falte ya será detalle de implementación, no de modelo.

[ ] VEM-553 ¿Prefieres que sigamos afinando el schema (por ejemplo añadiendo ese density) o que cambiemos de frente y pensemos en cómo documentar todo esto en una página única tipo “OMEGA Era 6 Module Authoring Overview”?


[ ] VEM-554 Tiene sentido: el tamaño lo delegas al skin/tema vía variant, y el schema sólo describe semántica y estructura.

1) Tamaño vía variant en el skin
Podemos fijar esta convención:

text
presentation:
  ui:
    component: "knob"
    variant: "A"    # A=XL, B=L, C=M, D=XS (por ejemplo, definido en el skin)
El schema sólo exige que variant sea un string opcional.

[ ] VEM-555 Cada skin define:

[ ] VEM-556 Para component: "knob", qué significa variant: "A" | "B" | "C" | "D" en tamaños concretos.

[ ] VEM-557 Igual para slider_h, slider_v, port, etc.

[ ] VEM-558 Así tú controlas densidades visuales por tema sin tocar manifests ni schema.

[ ] VEM-559 En el ejemplo del ADSR:

[ ] VEM-560 Sliders de envolvente: component: "slider_v", variant: "C" (estrechos).

[ ] VEM-561 Cutoff/resonancia: component: "knob", variant: "A" (knobs grandes).

2) Columnas por sección/tab (layout lógico)
Totalmente compatible con Era 6:

[ ] VEM-562 Mantienes tab y group en el manifest.

[ ] VEM-563 Dejas que la política de layout de la WebUI defina:

[ ] VEM-564 Número de columnas por tab/grupo, por ejemplo:

[ ] VEM-565 MAIN: 3–4 columnas por defecto.

[ ] VEM-566 PATCHING: layout en una o dos columnas estrechas para jacks.

[ ] VEM-567 Un grupo con sliders verticales puede ocupar más filas pero menos columnas porque los sliders son estrechos.

[ ] VEM-568 En otras palabras:

[ ] VEM-569 El manifest dice:

“Estas celdas pertenecen al grupo FILTER en el tab MAIN, en orden 1..N”.

[ ] VEM-570 El renderer decide:

“Este grupo FILTER se reparte en N columnas, y cada cell ocupa 1 columna (sea knob grande o slider estrecho)”.

[ ] VEM-571 Si un ADSR con 4 sliders entra en una fila de 4 columnas, perfecto; cutoff+resonance como knobs grandes podrían ocupar 2 columnas cada uno en otro skin, y eso se controla en el tema, no en el manifest.

[ ] VEM-572 Si quisieras, a futuro podrías permitir que el skin defina reglas del tipo “grupo FILTER usa 2 columnas”, pero eso viviría en la capa de tema, no en el YAML del módulo.

[ ] VEM-573 ¿Te parece bien si en el schema dejamos ui.variant como string libre documentado como “señal para el skin” y no añadimos nada más formal sobre tamaño/columnas en esta fase?


[ ] VEM-574 Entonces lo dejamos así:

[ ] VEM-575 El schema Era 6 sólo fija:

presentation.ui.component: tipo de control (knob, slider_v, slider_h, port, etc.).

presentation.ui.variant: string libre que el skin interpretará como tamaño/estilo (A, B, C, D...).

presentation.tab / group / order: layout lógico por secciones.

attachments con position: top/center/bottom/left/right para construir la “cell”.

[ ] VEM-576 El skin/renderer decide:

[ ] VEM-577 Qué tamaño corresponde a cada variant de cada componente.

[ ] VEM-578 Cómo se traducen los grupos en columnas/filas según el tab (MAIN, PATCHING, etc.).

[ ] VEM-579 Eso mantiene el manifest totalmente semántico y hace que terceros sólo tengan que pensar en qué controles quieren y cómo se relacionan, no en tamaños físicos ni columnas concretas.

[x] VEM-580 ¿Te gustaría que en otra sesión aterricemos esto en la doc del skin/tema (p.ej. “Variant A = knob 48px, B = 32px…”) o prefieres seguir ahora con otra parte del runtime/UX?


[x] VEM-581 Para aterrizarlo en la doc de skins, podemos fijar un mini-“contrato” entre manifest y tema.

1) Contrato para ui.component + variant
Para cada component, el skin debe documentar qué hace cada variant que piensa soportar.

[ ] VEM-582 Ejemplo de tabla en la doc del tema:

component	variant	Tamaño sugerido	Uso típico
knob	A	XL (p.ej. 48–56 px)	Controles principales (cutoff)
knob	B	L (40–44 px)	Controles importantes secundarios
knob	C	M (32–36 px)	Controles estándar
knob	D	XS (24–28 px)	Controles densos / auxiliares
slider_v	A	Alto, ancho medio	ADSR destacado
slider_v	C	Alto, muy estrecho	Bancos de sliders densos
port	A	Jack normal	PATCHING por defecto
port	C	Jack compacto	Racks muy densos
Reglas:

[ ] VEM-583 Si el manifest no indica variant, el skin usa un default razonable (por tab y por tipo).

[ ] VEM-584 Si el manifest indica una variant desconocida, el skin cae al default pero puede loguear un warning (interno).

2) Política de columnas por tab (Tema)
En la doc del tema puedes fijar algo así:

[ ] VEM-585 MAIN:

[ ] VEM-586 Layout base: 3 columnas en desktop, 2 en pantallas medias.

[x] VEM-587 Cada grupo (presentation.group) se representa como bloque con título y sus cells dentro fluyendo por columnas.

[ ] VEM-588 PATCHING:

[ ] VEM-589 Layout base: 2 columnas (inputs a la izquierda, outputs a la derecha) o una banda con jacks alineados.

[ ] VEM-590 SETUP:

[ ] VEM-591 Layout base: 2 columnas, con opción de ocultar grupos expert.

[ ] VEM-592 El tema no lee nada extra del manifest para esto; sólo tab y group.

3) Cómo usa el skin position de attachments
La doc del skin debe decir cómo se mapean las zonas:

top: fila superior de la cell (labels, displays pequeños).

bottom: fila inferior (displays de valor, etiquetas adicionales).

left/right: iconos/leds compactos junto al control principal.

[ ] VEM-593 Ejemplo de regla:

[ ] VEM-594 Para knob:

top: label en tipografía pequeña.

bottom: display con valor formateado.

right: LED redondo o pequeño icono.

[ ] VEM-595 Para port:

top: label pequeña sobre el jack.

bottom: opcionalmente, valor o etiqueta larga (p.ej. “PITCH CV”).

[ ] VEM-596 Así el autor de módulo sabe que position tiene un resultado consistente visualmente entre skins.

4) Recomendaciones para autores de módulos (relacionadas con el tema)
En la doc “para terceros”, una pequeña guía:

[ ] VEM-597 Usa variant sólo cuando tengas una intención clara:

[ ] VEM-598 A para knobs “hero” (cutoff, master).

[ ] VEM-599 C/D para controles densos (ADSRs, matrices).

[ ] VEM-600 Evita depender de tamaños exactos: no asumas “48 px”; asume “más grande” o “más pequeño”.

[x] VEM-601 Para layouts especiales (un bloque de ADSR de 4 sliders), confía en que el skin colocará tus cuatro slider_v en la misma fila/columna según group y order.

[ ] VEM-602 Con esto, quedan bien separados:

[ ] VEM-603 Manifest: qué hay y cómo se relaciona.

[ ] VEM-604 Tema/skin: cómo se ve cada component + variant y cómo se distribuyen las celdas por tab/grupo/columnas.

[x] VEM-605 ¿Te interesa que el siguiente paso sea escribir un pequeño ejemplo de “spec de skin” (en markdown) para un tema por defecto, con valores concretos de tamaños y tipografías, para que puedas usarlo como referencia cuando construyas esa capa?

[x] VEM-606 Te dejo una spec muy simple para un tema “Default Aseptic” que puedes usar como referencia.

1) Componentes y variantes
text
Tema: Default Aseptic
Grid base: 8 px
Tipografía: Outfit / Inter, 10–12 px
Radio de bordes: 3–4 px
Knobs
variant	Diámetro aprox	Uso típico
A	52 px	Hero (cutoff, master)
B	44 px	Importantes
C	36 px	Estándar
D	28 px	Densos / auxiliares
Label top: 9–10 px, mayúsculas, tracking ligero.

[ ] VEM-607 Display bottom: 9 px mono o semimono, alineado al centro.

[ ] VEM-608 Sliders verticales (slider_v)
variant	Altura	Anchura	Uso
A	72 px	18 px	Envolventes sueltas
C	72 px	10 px	Bancos densos (ADSR)
Label top: centrado, 9 px.

[ ] VEM-609 Display bottom: 9 px, valor numérico.

[ ] VEM-610 Sliders horizontales (slider_h)
Altura: 18 px, ancho variable según columna.

[ ] VEM-611 Variant A/B/C puede mapear a distintos grosores de pista o tamaño del “thumb”.

[ ] VEM-612 Ports (port)
variant	Diámetro	Uso
A	12 px	Jack normal
C	9 px	Compacto
Label top: 9 px; puede ocultarse si hay muchas conexiones.

[ ] VEM-613 LED top/right: 6–8 px, mismo color que telemetría.

[ ] VEM-614 LEDs (led como componente principal)
Diámetro: 8–10 px según variant.

[ ] VEM-615 Se suelen usar en PATCHING/MONITOR o para status.

2) Layout por tab
MAIN
Columnas:

[ ] VEM-616 Desktop: 3 columnas de cells.

[ ] VEM-617 Pantalla media: 2 columnas.

[ ] VEM-618 Cada group:

[ ] VEM-619 Título (12 px) + grid interno de cells.

[ ] VEM-620 Cells:

knob A/B: ocupan una celda completa.

slider_v C: pueden apilarse 3–4 por fila (mismo grupo, órdenes consecutivos).

[ ] VEM-621 PATCHING
Layout:

2 columnas lógicas: INPUTS (izquierda), OUTPUTS (derecha).

[ ] VEM-622 En cada grupo:

[ ] VEM-623 Cada port es una cell compacta:

[ ] VEM-624 Label top, jack centrado, opcional display bottom si hay range relevante.

[ ] VEM-625 SETUP
Igual que MAIN pero:

[ ] VEM-626 Grupos con controles expert se pueden colapsar por defecto.

[ ] VEM-627 Se usa preferentemente variant C/D para knobs y sliders.

[ ] VEM-628 MIDI
Columnas: 2.

[ ] VEM-629 Controles tipo lista (component: "list") se renderizan como combo + label.

[ ] VEM-630 Displays bajo combos opcionales para mostrar código/nombre MIDI.

3) Uso de position en attachments
Para este tema, reglas básicas:

top:

[ ] VEM-631 Label principal (nombre del control).

[ ] VEM-632 Displays pequeños para valores discretos (ej. CH 01).

bottom:

[ ] VEM-633 Display de valor numérico (Hz, dB, s, etc.).

[ ] VEM-634 Etiquetas auxiliares (“Hz”, “dB”) si no van en suffix.

left:

[ ] VEM-635 LEDs muy pequeños o iconos (raro en knobs).

right:

[ ] VEM-636 LEDs de actividad (modwheel, gate).

[x] VEM-637 Ejemplo visual esperado de una cell de cutoff (knob B):

text
[CUTOFF]           (top label)
   (knob B)
[ 1.20 kHz ]       (bottom display)
ADSR de 4 sliders verticales (variant C) en MAIN:

text
[ENV] (group title)
[A]   [D]   [S]   [R]    (top labels)
| |   | |   | |   | |    (sliders C)
[ms]  [ms]  [%]   [ms]   (bottom units opcionales)
Con esta spec, el autor de módulo sólo necesita elegir component y, opcionalmente, variant; el tema se encarga de tamaños y columnas coherentes.

[ ] VEM-638 ¿Te gustaría que en algún momento definamos también una paleta de colores mínima (por roles: control, telemetría, error) para que todo el ecosistema se vea consistente?



[ ] VEM-639 Una paleta mínima por roles ayuda mucho a mantener coherencia entre skins.

[ ] VEM-640 Roles de color básicos
Control interactivo (knobs, sliders, listas).

[ ] VEM-641 Telemetría normal (niveles, actividad).

[ ] VEM-642 Estado de nota/gate.

[ ] VEM-643 Advertencias/errores.

[x] VEM-644 Fondo y bordes de módulos.

[ ] VEM-645 Paleta base (modo oscuro “Aseptic”)
text
Fondo rack       : #050505
Fondo módulo     : #101010
Panel interno    : #181818
Bordes suaves    : #222222
Texto principal  : #E0E0E0
Texto secundario : #A0A0A0
Texto desactivado: #606060
Controles
Knobs/sliders activos:

[ ] VEM-646 Pista/base: #333333

[ ] VEM-647 Thumb/filled: #E5A94F (accent cálido)

[ ] VEM-648 Controles “expert”:

[ ] VEM-649 Mismo color pero con opacidad reducida o texto secundario.

[ ] VEM-650 Telemetría
Nivel audio/CV:

[ ] VEM-651 Verde: #4CAF50 para valores medios.

[ ] VEM-652 Amarillo: #FFC107 para picos.

[ ] VEM-653 LED de actividad genérico:

[ ] VEM-654 Inactivo: #303030

[ ] VEM-655 Activo: #4CAF50 (OK) o #FFC107 (actividad notable).

[ ] VEM-656 Gate / Triggers
LED de gate:

[ ] VEM-657 Off: #202020

[ ] VEM-658 On: #FF5252 (rojo claro) o #FF7043 (naranja intenso) para destacar.

[ ] VEM-659 Warnings / errores
Advertencia suave:

[ ] VEM-660 Iconos o bordes: #FFC107

[ ] VEM-661 Error:

[ ] VEM-662 Iconos / texto corto: #FF5252

[ ] VEM-663 Mapeo en manifest (solo semántica)
El manifest no fija colores, pero sí roles:

attachments.type: "led" + role: "activity" → usa paleta de telemetría.

attachments.type: "led" + role: "gate" → usa paleta de gate.

[ ] VEM-664 Controles con roles: ["expert", ...] → el skin puede usar texto secundario / menor contraste.

[ ] VEM-665 Así, el contrato es:

[ ] VEM-666 El manifest etiqueta semánticamente (activity, gate, expert).

[x] VEM-667 El tema traduce esos roles a esta paleta, manteniendo aspecto consistente sin que el autor de módulo piense en hexes.

[ ] VEM-668 ¿Quieres que en otro momento bajemos esto un nivel más y planteemos tokens de diseño (variables CSS) concretos para estos colores y roles?


[ ] VEM-669 Podemos expresar la paleta como tokens reutilizables (p.ej. CSS variables o theme JSON).

1) Tokens de color por rol
css
:root {
  /* Fondo y estructura */
  --omega-bg-rack:        #050505;
  --omega-bg-module:      #101010;
  --omega-bg-panel:       #181818;
  --omega-border-soft:    #222222;

  /* Texto */
  --omega-text-primary:   #E0E0E0;
  --omega-text-secondary: #A0A0A0;
  --omega-text-muted:     #606060;

  /* Controles */
  --omega-control-track:  #333333;
  --omega-control-fill:   #E5A94F;  /* accent knobs/sliders */
  --omega-control-hover:  #FFCA6A;
  --omega-control-disabled: #555555;

  /* Telemetría */
  --omega-meter-low:      #4CAF50;
  --omega-meter-peak:     #FFC107;

  /* Gates / triggers */
  --omega-gate-off:       #202020;
  --omega-gate-on:        #FF7043;

  /* Estado */
  --omega-warning:        #FFC107;
  --omega-error:          #FF5252;
}
2) Mapeo a componentes
Knobs/sliders:

[ ] VEM-670 Pista: background-color: var(--omega-control-track);

[ ] VEM-671 Relleno/indicador: background-color: var(--omega-control-fill);

[ ] VEM-672 LEDs de actividad:

[ ] VEM-673 Inactivo: var(--omega-bg-panel);

[x] VEM-674 Activo (role: activity): var(--omega-meter-low);

[ ] VEM-675 LEDs de gate:

[ ] VEM-676 Inactivo: var(--omega-gate-off);

[ ] VEM-677 Activo: var(--omega-gate-on);

[ ] VEM-678 Texto:

[ ] VEM-679 Labels normales: var(--omega-text-primary);

[ ] VEM-680 Etiquetas expert/SETUP: var(--omega-text-secondary);

[ ] VEM-681 Con estos tokens puedes:

[ ] VEM-682 Cambiar de skin simplemente redefiniendo las variables.

[ ] VEM-683 Mantener el contrato semántico: el manifest sólo dice role: "activity" o role: "gate", y el tema resuelve el color usando estos tokens.

[ ] VEM-684 ¿Te apetece que en otra sesión empecemos a aterrizar ya parte de esto en código real (por ejemplo, un pequeño componente React/TS que renderice una control cell leyendo un manifest simplificado)?

[ ] VEM-685 Sí, hay que tocar OMEGA, pero la buena noticia es que la base de “control cells” ya está medio hecha.

[ ] VEM-686 Lo que ya tienes
“Control Cells Architecture – Vertical stacking of attachments LEDs, Displays and main components across Rack and Modal”.

[ ] VEM-687 UI 100% declarativa, sin hardcodes por módulo; ModuleRenderer interpreta metadata de manifests.

[ ] VEM-688 Semantic Bridge que ya agrupa parámetros/puertos y decide qué va a MAIN, PATCHING, etc.

[ ] VEM-689 O sea: la idea de “celda con main control + attachments” ya está en producción; ahora hay que refinarla para Era 6.

[x] VEM-690 Cambios concretos que habría que hacer
1) Schema y manifests (mínimo)
Añadir en el schema Era 6:

presentation.ui.component y presentation.ui.variant (string libre para tamaños/estilos).

attachments[].type (label|display|led) y attachments[].position (top|bottom|left|right).

attachments[].format para prefijo/sufijo/decimales.

lookup para listas predefinidas (canales MIDI, CC, bandas EQ) con exclude.

[ ] VEM-691 Tus manifests ya tienen algo de esto, pero hay que consolidarlo bajo module-schema-6-core.json.

2) WebUI / renderer (TypeScript)
En modulemanager.ts / modulerenderer.ts (o donde esté el renderer actual):

[ ] VEM-692 Cambiar el renderizado de parámetros a “control cells” explícitas:

[ ] VEM-693 Por cada entrada de registry:

[ ] VEM-694 Crear un contenedor de celda.

[ ] VEM-695 Renderizar el ui.component como control central (knob, slider, port…).

[ ] VEM-696 Recorrer attachments y colocarlos según position en zonas top/center/bottom/left/right.

[ ] VEM-697 Usar ui.variant sólo como hint para el tema (clase CSS o prop de tamaño), sin tocar el contrato C++.

[ ] VEM-698 Mantener el layout por tab y group, pero permitir que el skin decida columnas y tamaños (no fijar columnas por parámetro).

[ ] VEM-699 Esto alinea el renderer con lo que hemos definido como contrato de “control cell”.

3) Semantic Bridge / metadata
En SemanticBrokerService + RpcMetadataController:

[ ] VEM-700 Asegurarse de que para cada módulo Era 6 se expone:

[ ] VEM-701 Lista de parámetros con roles, range, unit, etc. (ya lo hace via ModuleManifest/registry).

[ ] VEM-702 Puertos con roles stream/input/output/telemetry, para que el patchbay y los LEDs sepan qué bind usar.

[ ] VEM-703 Añadir (si no está ya) los campos de presentation/attachments en el JSON que consume la WebUI.

[ ] VEM-704 No hay cambios de lógica, sólo ampliar el payload a la UI.

4) Skins / tema (CSS / theme JSON)
Introducir el mapa component + variant → tamaño/estilo como parte del tema (no del core).

[ ] VEM-705 Mapear roles visuales a tokens de color:

role: activity → color de telemetría.

role: gate → color de gate.

roles: ["expert", ...] → estilo “secondary” en texto.

[ ] VEM-706 Esto no afecta al motor, sólo a CSS/React.

[ ] VEM-707 En resumen: OMEGA ya va en la dirección correcta (control cells, manifests, Semantic Bridge); lo que falta es formalizar en el schema Era 6 los campos que hemos definido (ui.component/variant, attachments, lookup, format) y ajustar el renderer TS para tratar cada entrada del registry como una cell con subcomponentes posicionados.

[ ] VEM-708 ¿Te interesa que el siguiente paso sea que te haga una lista muy corta de ficheros concretos a tocar (uno en C++ y 2–3 en TS) a modo de checklist de implementación?


[ ] VEM-709 Lista corta y concreta, pensando en un primer sprint.

1) C++ / Core
src/Core/Ace/AceCatalog.h/.cpp

[ ] VEM-710 Confirmar que parsea y expone registry con presentation y attachments (si no, añadirlo para Era 6).

src/Core/Providers/SemanticBrokerService.*

[ ] VEM-711 Ampliar el inventario que sirve a la WebUI para incluir presentation.ui.component, presentation.ui.variant, attachments y lookup.

src/Core/ParameterMetadata.h (o equivalente de metadata UI)

[ ] VEM-712 Asegurar que los tipos/roles Era 6 (control, stream, telemetry, mod_source/target) salen limpios para el bridge.

2) WebUI / TypeScript
ui/modulemanager.ts

[ ] VEM-713 Punto central de renderizado de rack.

[ ] VEM-714 Cambiar a modelo de “control cells”: por cada entrada de registry, construir la cell completa (control + attachments).

ui/modulerenderer.ts (o archivo equivalente mencionado en el changelog)

[ ] VEM-715 Implementar el layout interno de la cell (zonas top/center/bottom/left/right) en función de attachments.position.

ui/metadataStore.ts (o similar)

[ ] VEM-716 Ajustar tipos TS para incluir los nuevos campos Era 6 (ui.component, ui.variant, attachments, lookup, format).

3) Schemas / Docs
Resources/DOCUMENTACION/module-schema-6-core.json

[ ] VEM-717 Añadir definiciones formales de:

presentation.ui.component / presentation.ui.variant.

attachments[].type / attachments[].position / attachments[].format.

lookup.id / lookup.exclude.

[x] VEM-718 DOCUMENTACION/RULESERA6.md

[x] VEM-719 Añadir referencia rápida al contrato de control cell y prohibición de lógica de layout específica por módulo.

[ ] VEM-720 Con ese checklist ya puedes abrir ramas muy concretas: primero schema+TS types, luego renderer TS, y por último exposición limpia desde SemanticBrokerService. ¿Prefieres empezar por la parte TS (renderer) o por el schema + C++ para que el contrato esté primero cerrado?


[ ] VEM-721 Empezar por el schema + contrato C++, y después la parte TS, suele ser más sólido.

[ ] VEM-722 Orden recomendado de implementación
Schema Era 6 + tipos C++

[ ] VEM-723 Cerrar module-schema-6-core.json con:

presentation.ui.component / presentation.ui.variant.

attachments[].type/position/format.

lookup.id / lookup.exclude.

[ ] VEM-724 Ajustar AceCatalog/modelos C++ para que esos campos estén disponibles en estructuras claras que luego el bridge pueda serializar.

[ ] VEM-725 Bridge / SemanticBrokerService

[ ] VEM-726 Extender el payload del broker:

[ ] VEM-727 Añadir estos campos Era 6 al JSON que llega a la WebUI (sin usarlos aún en el front).

[ ] VEM-728 Verificar con logs que, para un módulo de prueba, la UI recibe ya ui.component, variant, attachments, lookup, etc.

[ ] VEM-729 WebUI TypeScript (renderer y types)

[x] VEM-730 Actualizar tipos TS (metadata store / interfaces) para reflejar el nuevo contrato.

[ ] VEM-731 Refactor del renderer:

[ ] VEM-732 Implementar “control cells” usando esos campos.

[ ] VEM-733 Mantener un modo de compatibilidad para manifests viejos mientras migras.

[ ] VEM-734 Así te aseguras de que cualquier cambio en la UI está respaldado por un contrato estable y versionado en el core.

[ ] VEM-735 ¿Te encaja empezar concretamente por escribir una versión inicial de module-schema-6-core.json centrada sólo en registry + presentation + attachments, y dejamos fuera de momento todo lo de routing/ports avanzados?


[ ] VEM-736 Perfecto, entonces el siguiente paso “natural” es:

[ ] VEM-737 Definir un module-schema-6-core.json mínimo que cubra bien:

[ ] VEM-738 Nodo raíz del módulo (id, name, version, family…).

registry[] con:

id, label, type, roles, range/default, unit.

presentation.tab/group/order.

presentation.ui.component / presentation.ui.variant.

attachments[].type/position/format.

lookup.id / lookup.exclude.

[ ] VEM-739 Con eso ya puedes:

[ ] VEM-740 Validar manifests Era 6 “de verdad”.

[ ] VEM-741 Exponer un único contrato limpio al bridge y a la WebUI.

[ ] VEM-742 En cuanto quieras, lo escribimos juntos en JSON (versión inicial centrada sólo en registry + presentation), para que puedas pegarlo tal cual como primer borrador de module-schema-6-core.json.



[ ] VEM-743 Te dejo un module-schema-6-core.json mínimo, centrado en registry + presentation + attachments + lookup, listo para usar como borrador.

json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://omega/era6/module-schema-6-core.json",
  "title": "OMEGA Era 6 Module Manifest (Core)",
  "type": "object",
  "additionalProperties": false,

  "properties": {
    "id": {
      "type": "string",
      "description": "Identificador único del módulo (ej. io.midi.midi2cv_e6)."
    },
    "name": {
      "type": "string",
      "description": "Nombre legible del módulo."
    },
    "version": {
      "type": "string",
      "description": "Versión del módulo (semver recomendado, p.ej. 6.0.0)."
    },
    "family": {
      "type": "string",
      "description": "Familia funcional (oscillator, filter, envelope, io, utility, fx...)."
    },
    "description": {
      "type": "string",
      "description": "Descripción corta del módulo."
    },

    "registry": {
      "type": "array",
      "description": "Lista de parámetros, puertos y pines de telemetría declarados por el módulo.",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "id": {
            "type": "string",
            "description": "Identificador estable de la entrada (ej. cutoff, pitch_cv, midichan)."
          },
          "label": {
            "type": "string",
            "description": "Etiqueta legible a mostrar en la UI (ej. CUTOFF, MIDI CHANNEL)."
          },
          "type": {
            "type": "string",
            "description": "Tipo lógico del valor.",
            "enum": [
              "int",
              "float",
              "bool",
              "string",
              "list",
              "audio",
              "cv",
              "midi"
            ]
          },
          "roles": {
            "type": "array",
            "description": "Roles semánticos que definen el comportamiento.",
            "items": {
              "type": "string",
              "enum": [
                "control",
                "input",
                "output",
                "stream",
                "telemetry",
                "mod_source",
                "mod_target",
                "expert"
              ]
            }
          },
          "unit": {
            "type": "string",
            "description": "Unidad del valor (Hz, dB, st, s, V, %, etc.)."
          },
          "precision": {
            "type": "integer",
            "description": "Resolución interna (decimales o precisión de cómputo).",
            "minimum": 0,
            "maximum": 12
          },
          "ui_precision": {
            "type": "integer",
            "description": "Número de decimales visibles por defecto en la UI.",
            "minimum": 0,
            "maximum": 6
          },

          "range": {
            "type": "object",
            "description": "Rango de valores para tipos numéricos.",
            "additionalProperties": false,
            "properties": {
              "min": {
                "type": "number",
                "description": "Valor mínimo."
              },
              "max": {
                "type": "number",
                "description": "Valor máximo."
              },
              "default": {
                "type": [
                  "number",
                  "integer",
                  "boolean",
                  "string"
                ],
                "description": "Valor por defecto."
              }
            }
          },

          "lookup": {
            "type": "object",
            "description": "Referencia a una lista preconfigurada de opciones (MIDI CC, canales, bandas EQ, etc.).",
            "additionalProperties": false,
            "properties": {
              "id": {
                "type": "string",
                "description": "Identificador de la lista predefinida.",
                "examples": [
                  "core.midi.channels",
                  "core.midi.cc",
                  "core.eq.1_3_oct_bands"
                ]
              },
              "exclude": {
                "type": "array",
                "description": "IDs o claves a excluir de la lista base.",
                "items": {
                  "type": [
                    "string",
                    "number"
                  ]
                }
              }
            },
            "required": ["id"]
          },

          "presentation": {
            "type": "object",
            "description": "Información de presentación lógica para la WebUI.",
            "additionalProperties": false,
            "properties": {
              "tab": {
                "type": "string",
                "description": "Pestaña principal donde se muestra el control.",
                "enum": [
                  "MAIN",
                  "PATCHING",
                  "SETUP",
                  "MIDI",
                  "ADVANCED"
                ]
              },
              "group": {
                "type": "string",
                "description": "Nombre de grupo dentro de la pestaña (FILTER, TUNING, EXPRESSION, etc.)."
              },
              "order": {
                "type": "integer",
                "description": "Orden relativo dentro del grupo.",
                "minimum": 0
              },
              "ui": {
                "type": "object",
                "description": "Tipo de componente de UI principal.",
                "additionalProperties": false,
                "properties": {
                  "component": {
                    "type": "string",
                    "description": "Tipo de control principal.",
                    "enum": [
                      "knob",
                      "slider_h",
                      "slider_v",
                      "toggle",
                      "switch",
                      "list",
                      "display",
                      "led",
                      "port",
                      "hidden"
                    ]
                  },
                  "variant": {
                    "type": "string",
                    "description": "Identificador opcional de variante/tamaño para el tema (A, B, C, D...)."
                  }
                },
                "required": ["component"]
              },

              "attachments": {
                "type": "array",
                "description": "Elementos adicionales alrededor del control principal.",
                "items": {
                  "type": "object",
                  "additionalProperties": false,
                  "properties": {
                    "type": {
                      "type": "string",
                      "description": "Tipo de attachment.",
                      "enum": [
                        "label",
                        "display",
                        "led"
                      ]
                    },
                    "position": {
                      "type": "string",
                      "description": "Posición relativa en la control cell.",
                      "enum": [
                        "top",
                        "bottom",
                        "left",
                        "right"
                      ]
                    },
                    "role": {
                      "type": "string",
                      "description": "Rol semántico del attachment (activity, gate, etc.)."
                    },
                    "format": {
                      "type": "object",
                      "description": "Opciones de formato para displays/labels.",
                      "additionalProperties": false,
                      "properties": {
                        "mode": {
                          "type": "string",
                          "description": "Modo de formateo del valor.",
                          "enum": [
                            "number",
                            "integer",
                            "string"
                          ]
                        },
                        "decimals": {
                          "type": "integer",
                          "description": "Número de decimales visibles (modo number).",
                          "minimum": 0,
                          "maximum": 6
                        },
                        "prefix": {
                          "type": "string",
                          "description": "Texto delante del valor (ej. 'Hz: ', 'CH ')."
                        },
                        "suffix": {
                          "type": "string",
                          "description": "Texto detrás del valor (ej. ' Hz', ' st')."
                        }
                      }
                    }
                  },
                  "required": ["type", "position"]
                }
              }
            }
          }
        },
        "required": ["id", "label", "type", "roles", "presentation"]
      }
    }
  },

  "required": ["id", "name", "version", "family", "registry"]
}
Este borrador cubre ya:

registry con tipos, roles, rango y unidades.

presentation con tab/group/order y ui.component/variant.

attachments posicionados (para la “control cell”) y format para displays.

lookup para listas estándar (MIDI channels, CC, bandas EQ).

[ ] VEM-744 ¿Quieres que el próximo paso sea preparar un par de manifests de ejemplo (uno MIDI-2-CV y uno OSC) validados mentalmente contra este schema para ver si falta algún campo obvio?


[ ] VEM-745 Sí, habrá que evolucionar OMEGA, pero es una evolución incremental sobre cosas que ya tienes.

[ ] VEM-746 Qué ya soporta OMEGA
El changelog de Build 421 habla explícitamente de “Control Cells Architecture – vertical stacking of attachments LEDs, Displays and main components across Rack and Modal”.

[ ] VEM-747 Ya existe un ModuleRenderer genérico en la WebUI que interpreta metadata de manifests (uiLayout, grid, etc.) para pintar módulos de forma declarativa.

[ ] VEM-748 SemanticBrokerService ya construye un inventario dinámico de parámetros y puertos a partir de manifiestos YAML y lo sirve a la UI vía RPC.

[ ] VEM-749 Es decir, el concepto base de celda de control + attachments ya está implementado; ahora se trata de alinearlo con el contrato Era 6 que hemos definido (ui.component/variant, attachments con position, lookup, format).

[ ] VEM-750 Cambios necesarios
1) Schema / manifests
Consolidar en module-schema-6-core.json los campos que hemos ido usando:

presentation.ui.component y presentation.ui.variant para el tipo de control y su pista de tamaño/estilo.

presentation.attachments[].type/position/format para label/display/led con top/bottom/left/right y prefijo/sufijo/decimales.

lookup.id/lookup.exclude para listas estándar (canales MIDI, CC, bandas de EQ).

2) Capa core / bridge
AceCatalog/modelos de componente deben parsear y exponer esos campos de presentación/attachments/lookup desde los YAML, si no lo están ya.

[ ] VEM-751 SemanticBrokerService y el controlador RPC que sirve metadata deben incluir estos campos en el JSON que recibe la WebUI, manteniendo la política de no hardcodear nada.

3) WebUI / renderer
Refactorizar el renderer de módulos (TypeScript) para tratar cada entrada del registry como una control cell:

[ ] VEM-752 Componente principal según ui.component.

[ ] VEM-753 Attachments distribuidos en zonas top/center/bottom/left/right según position.

[ ] VEM-754 Usar variant sólo como hint para el tema/skin, que decide tamaños concretos.

[ ] VEM-755 Con estos ajustes, OMEGA pasa de la versión “5.2 control cells” que ya insinúa el changelog a la versión Era 6 formalizada que hemos ido diseñando.

[ ] VEM-756 ¿Te viene mejor atacar primero el schema + bridge C++ y después el renderer TS, o prefieres empezar directamente prototipando el nuevo renderer con un módulo de prueba y luego consolidar el contrato en C++?

o empezaría por el contrato (schema + core) y luego UI, para no ir a ciegas.

[ ] VEM-757 Paso 1: cerrar contrato Era 6 (lo que ya tenemos)
Ese module-schema-6-core.json mínimo que hemos escrito ya cubre lo esencial:

[ ] VEM-758 Root: id, name, version, family, description.

registry[] con:

type, roles, range, unit, precision, ui_precision.

presentation.tab/group/order/ui.component/ui.variant.

attachments[].type/position/role/format.

lookup.id/lookup.exclude.

[ ] VEM-759 Esto lo puedes guardar ya como fichero real y usarlo como referencia para manifests nuevos.

[ ] VEM-760 Paso 2: comprobar que falta/pulir algo con ejemplos
Antes de tocar código, validaría mentalmente dos manifests contra ese schema:

[ ] VEM-761 El MIDI‑2‑CV que hemos montado (ya encaja casi perfecto).

[ ] VEM-762 Un OSC VA sencillito (cutoff/resonancia/ADSR, algún jack), definiendo:

[ ] VEM-763 Knobs grandes vs controles densos usando ui.variant.

[ ] VEM-764 Sliders de ADSR con attachments arriba/abajo.

[ ] VEM-765 Si al plasmar ese segundo ves que echas en falta algo (p.ej. algún rol extra en roles, o algo para stream: true), se añade ahora al schema.

[ ] VEM-766 Paso 3: luego ya core + WebUI
Con el schema estabilizado:

[ ] VEM-767 Core/bridge:

[ ] VEM-768 Asegurar que AceCatalog y SemanticBrokerService leen y exponen esos campos (aunque inicialmente la WebUI no los use del todo).

[ ] VEM-769 WebUI:

[ ] VEM-770 Adaptar el renderer a “control cells” con ui.component + attachments y dejar al skin interpretar variant y layout.

[ ] VEM-771 Si quieres, lo siguiente que podemos hacer es escribir ese segundo manifest de ejemplo (OSC VA pequeño) ajustado al schema, para ver si aparece alguna carencia antes de que empieces a tocar C++/TS.

[ ] VEM-772 Tiene sentido hacer un OSC VA de prueba para tensionar el schema.

[ ] VEM-773 Ejemplo: OSC VA sencillo (Era 6, ajustado al schema)
text
id: "va.osc.simple"
name: "VA Oscillator"
version: "6.0.0"
family: "oscillator"
description: "Simple VA oscillator with waveform mix and basic filter."

registry:
  # ---------- MAIN: OSC CORE ----------

  - id: "wave_saw"
    label: "SAW"
    type: "float"
    roles: ["control", "mod_target"]
    unit: ""
    precision: 3
    ui_precision: 2
    range:
      min: 0.0
      max: 1.0
      default: 1.0
    presentation:
      tab: "MAIN"
      group: "WAVEFORM"
      order: 1
      ui:
        component: "knob"
        variant: "C"
      attachments:
        - type: "label"
          position: "top"
        - type: "display"
          position: "bottom"
          format:
            mode: "number"
            decimals: 2
            suffix: ""

  - id: "wave_pulse"
    label: "PULSE"
    type: "float"
    roles: ["control", "mod_target"]
    unit: ""
    precision: 3
    ui_precision: 2
    range:
      min: 0.0
      max: 1.0
      default: 0.5
    presentation:
      tab: "MAIN"
      group: "WAVEFORM"
      order: 2
      ui:
        component: "knob"
        variant: "C"
      attachments:
        - type: "label"
          position: "top"
        - type: "display"
          position: "bottom"
          format:
            mode: "number"
            decimals: 2

  - id: "wave_noise"
    label: "NOISE"
    type: "float"
    roles: ["control", "mod_target"]
    unit: ""
    precision: 3
    ui_precision: 2
    range:
      min: 0.0
      max: 1.0
      default: 0.0
    presentation:
      tab: "MAIN"
      group: "WAVEFORM"
      order: 3
      ui:
        component: "knob"
        variant: "C"
      attachments:
        - type: "label"
          position: "top"
        - type: "display"
          position: "bottom"
          format:
            mode: "number"
            decimals: 2

  # ---------- MAIN: FILTER LITE ----------

  - id: "cutoff"
    label: "CUTOFF"
    type: "float"
    roles: ["control", "mod_target"]
    unit: "Hz"
    precision: 4
    ui_precision: 1
    range:
      min: 20.0
      max: 20000.0
      default: 1000.0
    presentation:
      tab: "MAIN"
      group: "FILTER"
      order: 1
      ui:
        component: "knob"
        variant: "A"
      attachments:
        - type: "label"
          position: "top"
        - type: "display"
          position: "bottom"
          format:
            mode: "number"
            decimals: 1
            suffix: " Hz"

  - id: "resonance"
    label: "RESO"
    type: "float"
    roles: ["control", "mod_target"]
    unit: ""
    precision: 3
    ui_precision: 2
    range:
      min: 0.0
      max: 1.0
      default: 0.2
    presentation:
      tab: "MAIN"
      group: "FILTER"
      order: 2
      ui:
        component: "knob"
        variant: "B"
      attachments:
        - type: "label"
          position: "top"
        - type: "display"
          position: "bottom"
          format:
            mode: "number"
            decimals: 2

  # ---------- MAIN: AMP ENV (ADSR sliders) ----------

  - id: "env_attack"
    label: "A"
    type: "float"
    roles: ["control", "mod_target"]
    unit: "ms"
    precision: 4
    ui_precision: 1
    range:
      min: 0.1
      max: 5000.0
      default: 10.0
    presentation:
      tab: "MAIN"
      group: "ENV"
      order: 1
      ui:
        component: "slider_v"
        variant: "C"
      attachments:
        - type: "label"
          position: "top"
        - type: "display"
          position: "bottom"
          format:
            mode: "number"
            decimals: 1
            suffix: " ms"

  - id: "env_decay"
    label: "D"
    type: "float"
    roles: ["control", "mod_target"]
    unit: "ms"
    precision: 4
    ui_precision: 1
    range:
      min: 0.1
      max: 5000.0
      default: 100.0
    presentation:
      tab: "MAIN"
      group: "ENV"
      order: 2
      ui:
        component: "slider_v"
        variant: "C"
      attachments:
        - type: "label"
          position: "top"
        - type: "display"
          position: "bottom"
          format:
            mode: "number"
            decimals: 1
            suffix: " ms"

  - id: "env_sustain"
    label: "S"
    type: "float"
    roles: ["control", "mod_target"]
    unit: "%"
    precision: 3
    ui_precision: 0
    range:
      min: 0.0
      max: 1.0
      default: 0.7
    presentation:
      tab: "MAIN"
      group: "ENV"
      order: 3
      ui:
        component: "slider_v"
        variant: "C"
      attachments:
        - type: "label"
          position: "top"
        - type: "display"
          position: "bottom"
          format:
            mode: "number"
            decimals: 0
            suffix: " %"

  - id: "env_release"
    label: "R"
    type: "float"
    roles: ["control", "mod_target"]
    unit: "ms"
    precision: 4
    ui_precision: 1
    range:
      min: 0.1
      max: 5000.0
      default: 200.0
    presentation:
      tab: "MAIN"
      group: "ENV"
      order: 4
      ui:
        component: "slider_v"
        variant: "C"
      attachments:
        - type: "label"
          position: "top"
        - type: "display"
          position: "bottom"
          format:
            mode: "number"
            decimals: 1
            suffix: " ms"

  # ---------- PATCHING: OUTPUT ----------

  - id: "audio_out"
    label: "OUT"
    type: "audio"
    roles: ["output", "stream", "telemetry"]
    unit: ""
    precision: 4
    ui_precision: 2
    range:
      min: -1.0
      max: 1.0
      default: 0.0
    presentation:
      tab: "PATCHING"
      group: "OUTPUTS"
      order: 1
      ui:
        component: "port"
        variant: "A"
      attachments:
        - type: "label"
          position: "top"
        - type: "led"
          position: "right"
          role: "activity"
Este módulo:

[ ] VEM-774 Se ajusta al schema: usa type, roles, range, presentation.ui.component/variant, attachments y format.

[ ] VEM-775 Tensiona:

[ ] VEM-776 Knobs grandes (cutoff) vs knobs medios (reso) vs knobs densos (mix).

[ ] VEM-777 Sliders verticales de ENV con labels arriba y displays abajo.

[ ] VEM-778 Un port de salida con label + LED de actividad lateral.

[ ] VEM-779 No ha hecho falta añadir nada nuevo al schema, más allá de lo que ya definimos.

[ ] VEM-780 ¿Quieres que a partir de aquí derive explícitamente cómo se vería este OSC en la WebUI (en ASCII como antes) para validar que el modelo visual te encaja también para módulos de síntesis “de verdad”?


[ ] VEM-781 Quedaría algo así, con el schema Era 6 aplicado.

[ ] VEM-782 Tab MAIN
text
+-------------------------------------------------------------+
| OMEGA RACK  | [MAIN] [PATCHING] [SETUP] [MIDI] [ADVANCED]  |
+-------------------------------------------------------------+
| MODULE: VA Oscillator (va.osc.simple)                       |
+-------------------------------------------------------------+
| TAB: MAIN                                                   |
|                                                             |
|  [GROUP: WAVEFORM]                                          |
|                                                             |
|   +-----------+   +-----------+   +-----------+             |
|   |   SAW     |   |  PULSE    |   |  NOISE    |  (top)      |
|   |   (knob C)|   |  (knob C) |   |  (knob C) |  (center)   |
|   |    1.00   |   |   0.50    |   |   0.00    |  (bottom)   |
|   +-----------+   +-----------+   +-----------+             |
|                                                             |
|  [GROUP: FILTER]                                            |
|                                                             |
|   +-------------------+   +-------------------+             |
|   |     CUTOFF        |   |     RESO          |             |
|   |     (knob A)      |   |     (knob B)      |             |
|   |   1.00 kHz        |   |      0.20         |             |
|   +-------------------+   +-------------------+             |
|                                                             |
|  [GROUP: ENV]                                              |
|                                                             |
|   A        D        S        R                              |
|  (top)    (top)    (top)    (top)                           |
|   |        |        |        |                              |
|   |        |        |        |    (slider_v C, compactos)   |
|   |        |        |        |                              |
| 10.0 ms 100.0 ms  70 %   200.0 ms   (bottom displays)       |
|                                                             |
+-------------------------------------------------------------+
WAVEFORM: tres control cells con label top + knob C + display bottom.

[ ] VEM-783 FILTER: cutoff como knob grande (variant A) y reso como medio (B).

[ ] VEM-784 ENV: cuatro sliders verticales compactos (variant C) con etiqueta arriba y valor formateado abajo.

[ ] VEM-785 Tab PATCHING
text
+-------------------------------------------------------------+
| OMEGA RACK  | [MAIN] [PATCHING] [SETUP] [MIDI] [ADVANCED]  |
+-------------------------------------------------------------+
| MODULE: VA Oscillator (va.osc.simple)                       |
+-------------------------------------------------------------+
| TAB: PATCHING                                               |
|                                                             |
|  [GROUP: OUTPUTS]                                           |
|                                                             |
|   OUT                                                       |
|  (label top)                                                |
|   ●──────────────►   [●] activity                           |
|   (port A)             (led right, role: activity)          |
|                                                             |
+-------------------------------------------------------------+
audio_out se ve como una cell de jack con label arriba, port en el centro y LED a la derecha, enlazado a telemetría de actividad.

[ ] VEM-786 A nivel visual, esto ya es un módulo de síntesis “real” (osc + filtro + env + salida) y el modelo de control cell aguanta bien tanto knobs hero como bancos densos de sliders.

[ ] VEM-787 ¿Quieres que a continuación bajemos un nivel y listemos qué props concretas necesitaría un componente React ControlCell para renderizar justo esto (id, label, type, presentation, attachments…)?


[ ] VEM-788 La ControlCell puede ser básicamente un wrapper “tonto” de todo lo que ya tienes en el manifest + runtime.

[ ] VEM-789 Props núcleo de ControlCell
ts
type ControlCellProps = {
  // Identidad y binding
  id: string;              // registry.id
  instanceId: string;      // instancia de módulo
  type: 'int' | 'float' | 'bool' | 'string' | 'list' | 'audio' | 'cv'; [file:119]
  roles: string[];         // control, stream, output, telemetry, modtarget, etc. [file:119]

  // Semántica numérica
  range?: {
    min: number;
    max: number;
    default: number;
  };                       // registry.range [file:119]
  precision?: number;      // precision DSP
  uiPrecision?: number;    // uiprecision de display [file:119]
  unit?: string;           // Hz, dB, ms, %... [file:119]
  options?: {              // para listas
    value: number | string;
    label: string;
  }[];

  // Estado actual (viene del store)
  value?: number | string | boolean;
  telemetry?: number;      // para LED/activity, meters, etc. [file:117]

  // Hints de layout / view policy
  tab: string;             // MAIN, PATCHING, SETUP... [file:119]
  group: string;           // WAVEFORM, FILTER, ENV... [file:119]
  order: number;           // posición dentro del grupo [file:119]

  // UI principal
  ui: {
    component: 'knob' | 'slider_v' | 'slider_h' | 'port' | 'list' | 'toggle' | 'button';
    variant?: 'A' | 'B' | 'C';   // tamaño/densidad según tema [file:117]
  };

  // Attachments (control cell completa)
  attachments?: {
    type: 'label' | 'display' | 'led' | 'meter';
    position?: 'top' | 'bottom' | 'left' | 'right';
    role?: 'activity' | 'gate' | 'expert' | string;
    format?: {
      mode?: 'number' | 'text';
      decimals?: number;
      suffix?: string;
    };
  }[];                     // mapeo directo de presentation.ui.attachments [file:119]

  // Callbacks
  onChange?: (id: string, value: number | string | boolean) => void;
};
Con esto, el ControlCell sabe:

[ ] VEM-790 Qué dibujar como componente principal (knob A, slider_v C, port…).

[ ] VEM-791 Cómo apilar label, display y led en zonas top/bottom/left/right sin lógica ad hoc por módulo.

[ ] VEM-792 Cómo formatear el valor y cómo encender el LED desde la telemetría.

[ ] VEM-793 Mini tabla de ejemplo: SAW del VA
Campo	Valor para wave_saw
Campo	Valor para wave_saw
id	"wave_saw"
type	"float"
roles	["control","mod_target"]
range	{min:0,max:1,default:1}
ui.component	"knob"
ui.variant	"C"
attachments	label top, display bottom
unit	""
uiPrecision	2
¿Te parece bien que el siguiente paso sea bosquejar el JSX interno de ControlCell (cómo reparte top/main/info/bottom) para que puedas portarlo casi tal cual al renderer actual?


[ ] VEM-794 Sí, y lo bueno es que puedes alinearlo con lo que ya hace el modal de patch/params Era 6.

[ ] VEM-795 Bosquejo de JSX interno de ControlCell
tsx
import React from 'react';

export const ControlCell: React.FC<ControlCellProps> = (props) => {
  const {
    id,
    instanceId,
    type,
    roles,
    ui,
    attachments = [],
    value,
    telemetry,
    range,
    uiPrecision,
    unit,
    options,
    onChange,
  } = props;

  const precision = uiPrecision ?? 2;

  // Helpers
  const hasAttachment = (position: 'top' | 'bottom' | 'left' | 'right') =>
    attachments.some(a => (a.position ?? 'bottom') === position);

  const renderLed = (att: ControlCellProps['attachments'][number]) => {
    const active = (telemetry ?? 0) > 0.05; // umbral genérico [file:117]
    return (
      <div
        className={
          'cell-led ' +
          (att.role === 'activity' ? 'led-activity' : '') +
          (active ? ' active' : '')
        }
        data-source={`${instanceId}.${id}`}
      />
    );
  };

  const formatValue = (raw: any): string => {
    if (raw == null) return '---';
    if (typeof raw === 'boolean') return raw ? 'ON' : 'OFF';
    if (typeof raw === 'number') {
      const base = raw.toFixed(precision);
      return unit ? `${base} ${unit}` : base;
    }
    return String(raw);
  };

  const handleMainChange = (next: any) => {
    onChange?.(id, next);
  };

  // Main control (knob/slider/port/list...)
  const renderMain = () => {
    switch (ui.component) {
      case 'list':
        return (
          <select
            className={`selector-control variant-${ui.variant ?? 'C'}`}
            data-param={id}
            value={value as any}
            onChange={e => handleMainChange(e.target.value)}
          >
            {(options ?? []).map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );

      case 'slider_v':
      case 'slider_h': {
        const min = range?.min ?? 0;
        const max = range?.max ?? 1;
        const step = (max - min) / 100;
        return (
          <input
            type="range"
            className={`cell-slider ${ui.component} variant-${ui.variant ?? 'C'}`}
            data-param={id}
            min={min}
            max={max}
            step={step}
            value={value as any}
            onChange={e => handleMainChange(parseFloat(e.target.value))}
          />
        );
      }

      case 'port':
        return (
          <div
            className={`cell-port variant-${ui.variant ?? 'A'}`}
            data-port={id}
          />
        );

      case 'toggle':
        return (
          <button
            className={`cell-toggle variant-${ui.variant ?? 'C'} ${
              value ? 'on' : 'off'
            }`}
            data-param={id}
            onClick={() => handleMainChange(!value)}
          >
            {/* icono o pill */}
          </button>
        );

      case 'button':
        return (
          <button
            className={`cell-button variant-${ui.variant ?? 'C'}`}
            onClick={() => handleMainChange(true)}
          >
            {/* acción momentánea */}
          </button>
        );

      case 'knob':
      default:
        return (
          <div
            className={`knob-ring variant-${ui.variant ?? 'C'}`}
            data-param={id}
            // aquí engancharías el drag handler actual del rack [file:117]
          >
            <div className="knob">
              <div className="knob-marker" />
            </div>
          </div>
        );
    }
  };

  const renderAttachmentsAt = (position: 'top' | 'bottom' | 'left' | 'right') => {
    return attachments
      .filter(a => (a.position ?? 'bottom') === position)
      .map((att, idx) => {
        if (att.type === 'led') {
          return <React.Fragment key={idx}>{renderLed(att)}</React.Fragment>;
        }
        if (att.type === 'label') {
          return (
            <span key={idx} className="cell-label">
              {id.toUpperCase()}
            </span>
          );
        }
        if (att.type === 'display') {
          return (
            <div
              key={idx}
              className="cell-display"
              data-precision={precision}
            >
              {formatValue(value)}
            </div>
          );
        }
        return null;
      });
  };

  return (
    <div
      className={`control-cell variant-${ui.variant ?? 'C'}`}
      data-bind={`${instanceId}.${id}`}
    >
      {/* TOP attachments (p.ej. label o LED activity) */}
      {hasAttachment('top') && (
        <div className="cell-attachment-top">
          {renderAttachmentsAt('top')}
        </div>
      )}

      <div className="cell-body">
        {/* LEFT attachments (raro, pero soportado por schema Era 6) */}
        {hasAttachment('left') && (
          <div className="cell-attachment-left">
            {renderAttachmentsAt('left')}
          </div>
        )}

        <div className="cell-main">{renderMain()}</div>

        {/* RIGHT attachments (ej. LED de gate o actividad de puerto) */}
        {hasAttachment('right') && (
          <div className="cell-attachment-right">
            {renderAttachmentsAt('right')}
          </div>
        )}
      </div>

      {/* BOTTOM attachments: label + display como patrón por defecto */}
      <div className="cell-info">
        {hasAttachment('bottom')
          ? renderAttachmentsAt('bottom')
          : (
            <>
              <label className="cell-label">{id.toUpperCase()}</label>
              <div className="cell-display" data-precision={precision}>
                {formatValue(value)}
              </div>
            </>
          )}
      </div>
    </div>
  );
};
Esto se alinea con:

[ ] VEM-796 La estructura .control-cell → top / main / info / bottom que ya usa el modal de patch Era 6, incluidos cell-attachment-top, cell-main, cell-info, cell-display, led.

[ ] VEM-797 El modelo de attachments de schema 6 (type, position, role, format) para decidir layout sin lógica por módulo.

[ ] VEM-798 ¿Te interesa que el próximo paso sea escribir una pequeña función fromRegistryEntityToControlCellProps(entity, state) para que veas el mapping directo manifest → props?

[ ] VEM-799 Aquí va la función de mapping directa, pensando en el VA de prueba y en el runtime Era 6.

ts
// Tipos mínimos basados en schema Era 6 + runtime [file:119][file:117]
type RegistryEntity = {
  id: string;
  type: 'int' | 'float' | 'bool' | 'string' | 'list' | 'audio' | 'cv';
  roles?: string[];
  range?: { min?: number; max?: number; default?: number };
  precision?: number;
  uiprecision?: number;
  unit?: string;
  options?: { value: number | string; label: string }[];
  presentation?: {
    tab?: string;
    group?: string;
    order?: number;
    ui?: {
      component?: string;
      variant?: 'A' | 'B' | 'C';
      attachments?: {
        type: 'label' | 'display' | 'led' | 'meter';
        position?: 'top' | 'bottom' | 'left' | 'right';
        role?: string;
        format?: {
          mode?: 'number' | 'text';
          decimals?: number;
          suffix?: string;
        };
      }[];
    };
  };
};

type ModuleState = {
  params?: Record<string, number | string | boolean>;
  telemetry?: Record<string, number>;
};

function fromRegistryEntityToControlCellProps(
  entity: RegistryEntity,
  instanceId: string,
  state: ModuleState
): ControlCellProps {
  const id = entity.id;
  const roles = entity.roles ?? [];
  const tab = entity.presentation?.tab ?? 'MAIN';
  const group = entity.presentation?.group ?? 'DEFAULT';
  const order = entity.presentation?.order ?? 0;

  const uiComponent = entity.presentation?.ui?.component ?? 'knob';
  const uiVariant = entity.presentation?.ui?.variant ?? 'C';
  const attachments = entity.presentation?.ui?.attachments ?? [];

  const range = {
    min: entity.range?.min ?? 0,
    max: entity.range?.max ?? 1,
    default: entity.range?.default ?? 0,
  };

  const uiPrecision = entity.uiprecision ?? 2;
  const precision = entity.precision ?? 4;

  const unit = entity.unit;
  const options = entity.options;

  const value = state.params?.[id] ?? range.default;
  const telemetry = state.telemetry?.[id];

  return {
    id,
    instanceId,
    type: entity.type,
    roles,
    range,
    precision,
    uiPrecision,
    unit,
    options,
    value,
    telemetry,
    tab,
    group,
    order,
    ui: {
      component: uiComponent as ControlCellProps['ui']['component'],
      variant: uiVariant,
    },
    attachments,
    onChange: undefined, // se inyecta en el nivel superior (rack/ModuleRenderer) [file:117]
  };
}
Con esto, el flujo para el VA sería:

[ ] VEM-800 Cargas el manifest osc_va.yaml en AceCatalog, que ya te da registry normalizado.

[ ] VEM-801 El runtime te pasa state.params y state.telemetry por instancia.

[ ] VEM-802 El renderer hace:

ts
const cells = manifest.registry
  .filter(e => e.presentation?.tab === 'MAIN')
  .sort((a, b) => (a.presentation?.order ?? 0) - (b.presentation?.order ?? 0))
  .map(e => fromRegistryEntityToControlCellProps(e, instanceId, state));
y luego <ControlCell {...cell} onChange={handleParamChange} /> por cada una.

[ ] VEM-803 ¿Te gustaría que hagamos ahora un ejemplo concreto para wave_saw con un state de muestra y veas el objeto ControlCellProps resultante?

[ ] VEM-804 Para wave_saw del VA, con un estado de ejemplo, quedaría así.

1) Fragmento de manifest (ya lo tenías)
text
- id: "wave_saw"
  label: "SAW"
  type: "float"
  roles: ["control", "mod_target"]
  unit: ""
  precision: 3
  ui_precision: 2
  range:
    min: 0.0
    max: 1.0
    default: 1.0
  presentation:
    tab: "MAIN"
    group: "WAVEFORM"
    order: 1
    ui:
      component: "knob"
      variant: "C"
      attachments:
        - type: "label"
          position: "top"
        - type: "display"
          position: "bottom"
          format:
            mode: "number"
            decimals: 2
            suffix: ""
Esto encaja con los campos definidos en el schema Era 6: type, roles, range, uiprecision, presentation.ui.component, presentation.ui.attachments.

2) Estado de ejemplo
ts
const instanceId = 'inst-001';

const state: ModuleState = {
  params: {
    wave_saw: 0.75,
  },
  telemetry: {
    wave_saw: 0.12, // p.ej. actividad de modulación, si quisieras usarlo
  },
};
El runtime Era 6 ya expone params y telemetry por instancia de módulo hacia la WebUI.

3) Resultado de fromRegistryEntityToControlCellProps
Aplicando la función anterior a ese entity y state:

ts
const entity: RegistryEntity = /* el de arriba */;
const cell = fromRegistryEntityToControlCellProps(entity, instanceId, state);
Obtendrías algo así:

ts
const cell: ControlCellProps = {
  id: 'wave_saw',
  instanceId: 'inst-001',
  type: 'float',
  roles: ['control', 'mod_target'],

  range: {
    min: 0.0,
    max: 1.0,
    default: 1.0,
  },

  precision: 3,
  uiPrecision: 2,
  unit: '',
  options: undefined,

  value: 0.75,          // del state.params.wave_saw
  telemetry: 0.12,      // del state.telemetry.wave_saw (si lo usas)

  tab: 'MAIN',
  group: 'WAVEFORM',
  order: 1,

  ui: {
    component: 'knob',
    variant: 'C',
  },

  attachments: [
    { type: 'label', position: 'top' },
    {
      type: 'display',
      position: 'bottom',
      format: {
        mode: 'number',
        decimals: 2,
        suffix: '',
      },
    },
  ],

  onChange: undefined,  // lo inyecta el renderer de módulo
};
Con este objeto, ControlCell renderiza:

[ ] VEM-805 Zona superior: label “WAVE_SAW” (o el ID que decidas enseñar) como attachment label/top.

[ ] VEM-806 Zona central: knob C enlazado a wave_saw, con drag manejado como en tu rack actual.

[ ] VEM-807 Zona inferior: display con 0.75 formateado a 2 decimales, con sufijo vacío.

[ ] VEM-808 ¿Te apetece que el siguiente paso sea hacer lo mismo para audio_out y ver cómo el mapping produce una cell tipo jack con LED de actividad en PATCHING?


[ ] VEM-809 Perfecto, lo dejamos como cell de salida con LED pero sin jack explícito.

1) Fragmento de manifest ajustado para audio_out
text
- id: "audio_out"
  label: "OUT"
  type: "audio"
  roles: ["output", "stream", "telemetry"]
  unit: ""
  precision: 4
  ui_precision: 2
  range:
    min: -1.0
    max: 1.0
    default: 0.0
  presentation:
    tab: "PATCHING"
    group: "OUTPUTS"
    order: 1
    ui:
      component: "knob"      # placeholder visual, pero semántica de salida
      variant: "A"
      attachments:
        - type: "label"
          position: "top"
        - type: "led"
          position: "right"
          role: "activity"
        - type: "display"
          position: "bottom"
          format:
            mode: "number"
            decimals: 2
            suffix: ""
Esto sigue usando el modelo de attachments del schema 6 para LED y display, y evita jacks físicos en el frontal, tal como dicta el aseptismo de layout.

2) Estado de ejemplo
ts
const instanceId = 'inst-001';

const state: ModuleState = {
  params: {}, // no hay param controlable para audio_out
  telemetry: {
    audio_out: 0.42, // nivel de actividad de salida
  },
};
La telemetría de puertos ya se expone en el runtime/panel de oscilloscope y patchbay Era 6.

3) Resultado de mapping
ts
const entity: RegistryEntity = /* el de arriba */;
const cell = fromRegistryEntityToControlCellProps(entity, instanceId, state);
Quedaría algo así:

ts
const cell: ControlCellProps = {
  id: 'audio_out',
  instanceId: 'inst-001',
  type: 'audio',
  roles: ['output', 'stream', 'telemetry'],

  range: {
    min: -1.0,
    max: 1.0,
    default: 0.0,
  },

  precision: 4,
  uiPrecision: 2,
  unit: '',
  options: undefined,

  value: 0.0,          // cae al default, no es editable
  telemetry: 0.42,     // usado para el LED de actividad

  tab: 'PATCHING',
  group: 'OUTPUTS',
  order: 1,

  ui: {
    component: 'knob', // o un dummy visual específico de “meter cell”
    variant: 'A',
  },

  attachments: [
    { type: 'label', position: 'top' },
    { type: 'led', position: 'right', role: 'activity' },
    {
      type: 'display',
      position: 'bottom',
      format: {
        mode: 'number',
        decimals: 2,
        suffix: '',
      },
    },
  ],

  onChange: undefined,
};
Renderizado con ControlCell:

[ ] VEM-810 Top: label “AUDIO_OUT” u “OUT”.

[ ] VEM-811 Centro: placeholder (knob A o visual de salida) que no envía cambios.

[ ] VEM-812 Right: LED que se enciende con telemetry > umbral (0.42 en este ejemplo).

[ ] VEM-813 Bottom: display con 0.00 (o el último valor monitorizado, si más adelante decides reflejar nivel RMS/peak).

[ ] VEM-814 ¿Quieres que definamos una variante específica de componente (ui.component: "meter") para este tipo de cells de salida/entrada, en vez de reutilizar knob como placeholder?


[ ] VEM-815 Tiene sentido declararlo explícitamente como meter en el schema y en el renderer.

1) Cómo se vería en el manifest
text
- id: "audio_out"
  label: "OUT"
  type: "audio"
  roles: ["output", "stream", "telemetry"]
  precision: 4
  ui_precision: 2
  range:
    min: -1.0
    max: 1.0
    default: 0.0
  presentation:
    tab: "PATCHING"
    group: "OUTPUTS"
    order: 1
    ui:
      component: "meter"
      variant: "A"          # tamaño de la pill de salida
      attachments:
        - type: "label"
          position: "top"
        - type: "led"
          position: "right"
          role: "activity"
        - type: "display"
          position: "bottom"
          format:
            mode: "number"
            decimals: 2
            suffix: ""
component: "meter" encaja con la idea de hint visual de schema Era 6 sin forzar a la UI a un tipo concreto, pero permite al tema hacer algo distinto de un knob.

2) Extensión mínima de tipos y renderer
En ControlCellProps:

ts
ui: {
  component: 'knob' | 'slider_v' | 'slider_h' | 'port' | 'list' | 'toggle' | 'button' | 'meter';
  variant?: 'A' | 'B' | 'C';
};
Y en renderMain:

tsx
case 'meter':
  return (
    <div
      className={`cell-meter variant-${ui.variant ?? 'A'}`}
      data-source={`${instanceId}.${id}`}
    >
      <div className="cell-meter-bar" />
    </div>
  );
La barra se alimenta solamente de telemetry (no de value), igual que ya haces con los leds y visualizadores en Era 6: en updateRealtimeUI leerías state.telemetry[instanceId.id] y ajustarías ancho/color.

3) Resultado de mapping para audio_out
Con el mismo state de antes, fromRegistryEntityToControlCellProps pasa a devolver:

ts
ui: {
  component: 'meter',
  variant: 'A',
},
y el resto igual que antes (roles ["output","stream","telemetry"], telemetry: 0.42, attachments label+led+display).

[ ] VEM-816 ¿Quieres que detallemos cómo debería ser la lógica de updateRealtimeUI para un meter (mapear telemetría a altura/ancho normalizado 0..1), reutilizando lo que ya haces en el Oscilloscope/Probe?

[ ] VEM-817 La lógica puede ser muy parecida a cómo normalizas señales en el Oscilloscope, pero ultra simple: leer telemetría, normalizar 0..1 y actualizar estilo inline.

1) Normalización de telemetría para meter
Asumiendo:

entity.range.min/max marcan el rango esperado (p.ej. -1..1 o -60..0 dB).

state.telemetry[instanceId.id] te da el valor bruto por instancia y parámetro.

ts
function normalizeMeterValue(val: number, min: number, max: number): number {
  if (max === min) return 0;
  const clamped = Math.max(min, Math.min(max, val));
  return (clamped - min) / (max - min); // 0..1
}
2) Hook en updateRealtimeUI
En tu bucle actual de actualización de control cells en Era 6 ya haces algo tipo:

ts
this.viewport.querySelectorAll('.control-cell').forEach(cell => {
  const id = cell.getAttribute('data-bind'); // instance.param [file:117]
  if (!id) return;

  const [instanceId, paramId] = id.split('.');
  const val = window.runtimeStateStore.getValue(instanceId, paramId);
  const telemetry = window.runtimeStateStore.getTelemetry(instanceId, paramId); [file:117]

  // Knob, display, selector, LED... (ya existente)
  // ...

  // Meter
  const meter = cell.querySelector('.cell-meter-bar') as HTMLElement | null;
  if (meter) {
    // Podrías guardar metadata de rango en data-attrs al crear la cell
    const minAttr = meter.getAttribute('data-min');
    const maxAttr = meter.getAttribute('data-max');
    const min = minAttr != null ? parseFloat(minAttr) : -1;
    const max = maxAttr != null ? parseFloat(maxAttr) : 1;

    const t = typeof telemetry === 'number' ? telemetry : 0;
    const n = normalizeMeterValue(t, min, max);

    // Ejemplo: barra vertical que crece hacia arriba
    meter.style.transform = `scaleY(${n})`;
    meter.style.transformOrigin = 'bottom center';

    // Opcional: color según nivel
    if (n < 0.6) {
      meter.style.backgroundColor = 'var(--meter-low)';   // verde
    } else if (n < 0.9) {
      meter.style.backgroundColor = 'var(--meter-mid)';   // cian
    } else {
      meter.style.backgroundColor = 'var(--meter-hot)';   // naranja/rojo
    }
  }
});
La parte de lectura getTelemetry(instanceId.id) y umbral de actividad ya la usas en leds y osciloscopio, así que solo reaprovechas la misma fuente para el meter.

3) Datos de rango en la cell
Cuando construyes la ControlCell para meter, añade los data-attrs:

tsx
case 'meter':
  return (
    <div
      className={`cell-meter variant-${ui.variant ?? 'A'}`}
      data-source={`${instanceId}.${id}`}
    >
      <div
        className="cell-meter-bar"
        data-min={range?.min ?? -1}
        data-max={range?.max ?? 1}
      />
    </div>
  );
Así no tienes que reconsultar el manifest en tiempo de refresco; updateRealtimeUI solo tira del DOM y del store, como ya haces con knobs y displays.

[ ] VEM-818 ¿Te gustaría que el siguiente paso sea definir un pequeño set de clases CSS sugeridas para .cell-meter y .cell-meter-bar alineadas con tu skin actual (midi viewer / oscilloscope)?


[ ] VEM-819 Algo así encaja bien con el look actual de OMEGA (probe, oscilloscope, midi viewer).

[ ] VEM-820 CSS sugerido para meter
css
/* Contenedor de la cell (ya lo tienes) */
.control-cell .cell-meter {
  width: 20px;
  height: 40px;
  border-radius: 3px;
  border: 1px solid rgba(0, 242, 255, 0.4);
  background: linear-gradient(180deg, #050505 0%, #000000 100%);
  box-shadow:
    inset 0 0 6px rgba(0, 0, 0, 0.9),
    0 0 6px rgba(0, 242, 255, 0.2);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
}

/* Variante grande (A) para PATCHING / salidas principales */
.control-cell .cell-meter.variant-A {
  width: 24px;
  height: 50px;
}

/* Variante compacta (C) para vistas densas si la usas */
.control-cell .cell-meter.variant-C {
  width: 16px;
  height: 32px;
}

/* Barra interna animada por telemetría */
.control-cell .cell-meter-bar {
  width: 70%; /* margen lateral tipo pill */
  height: 0%; /* se escala con transform */
  background-color: var(--meter-low, #00f2ff);
  border-radius: 2px 2px 0 0;
  box-shadow: 0 0 6px rgba(0, 242, 255, 0.6);
  transform-origin: bottom center;
  transform: scaleY(0);
  transition:
    transform 0.05s linear,
    background-color 0.1s ease-out,
    box-shadow 0.1s ease-out;
}

/* Tonos sugeridos para niveles, en línea con oscilloscope/midi viewer */
:root {
  --meter-low:  #00f2ff; /* cian base */
  --meter-mid:  #00ffaa; /* cian-verde */
  --meter-hot:  #ff9a00; /* naranja caliente */
}

/* Opcional: estados de calor (si prefieres via clases en vez de inline) */
.control-cell .cell-meter-bar.level-low {
  background-color: var(--meter-low);
  box-shadow: 0 0 4px rgba(0, 242, 255, 0.5);
}

.control-cell .cell-meter-bar.level-mid {
  background-color: var(--meter-mid);
  box-shadow: 0 0 5px rgba(0, 255, 170, 0.7);
}

.control-cell .cell-meter-bar.level-hot {
  background-color: var(--meter-hot);
  box-shadow: 0 0 6px rgba(255, 154, 0, 0.9);
}
Esto mantiene:

[ ] VEM-821 Fondo oscuro con cian y glow como en oscilloscope/midi viewer.

[ ] VEM-822 Variantes A/C solo como cambios de tamaño (la semántica la da el schema).

[ ] VEM-823 ¿Te gustaría que juntemos todo en un mini “spec” de Output Cell (schema + props + JSX + CSS) para audio_out y lo dejes ya como patrón oficial de salidas?

[ ] VEM-824 Patrón completo de Output Cell para audio_out, listo para institucionalizarlo.

1) Schema Era 6 (manifest)
text
- id: "audio_out"
  label: "OUT"
  type: "audio"
  roles: ["output", "stream", "telemetry"]
  precision: 4
  ui_precision: 2
  range:
    min: -1.0
    max: 1.0
    default: 0.0
  presentation:
    tab: "PATCHING"
    group: "OUTPUTS"
    order: 1
    ui:
      component: "meter"
      variant: "A"
      attachments:
        - type: "label"
          position: "top"
        - type: "led"
          position: "right"
          role: "activity"
        - type: "display"
          position: "bottom"
          format:
            mode: "number"
            decimals: 2
            suffix: ""
Usa component: "meter" y attachments según la spec Era 6 (control cells con label, led y display).

2) Props resultantes (ControlCellProps)
ts
const cell: ControlCellProps = {
  id: 'audio_out',
  instanceId: 'inst-001',
  type: 'audio',
  roles: ['output', 'stream', 'telemetry'],
  range: { min: -1.0, max: 1.0, default: 0.0 },
  precision: 4,
  uiPrecision: 2,
  unit: '',
  options: undefined,
  value: 0.0,          // no editable; viene del default
  telemetry: 0.42,     // nivel actual de salida del runtime [file:117]
  tab: 'PATCHING',
  group: 'OUTPUTS',
  order: 1,
  ui: { component: 'meter', variant: 'A' },
  attachments: [
    { type: 'label', position: 'top' },
    { type: 'led', position: 'right', role: 'activity' },
    {
      type: 'display',
      position: 'bottom',
      format: { mode: 'number', decimals: 2, suffix: '' },
    },
  ],
  onChange: undefined,
};
Se obtiene directamente con fromRegistryEntityToControlCellProps(entity, instanceId, state).

3) JSX de ControlCell para Output Cell
tsx
case 'meter':
  return (
    <div
      className={`cell-meter variant-${ui.variant ?? 'A'}`}
      data-source={`${instanceId}.${id}`}
    >
      <div
        className="cell-meter-bar"
        data-min={range?.min ?? -1}
        data-max={range?.max ?? 1}
      />
    </div>
  );
Y attachments:

tsx
<div className="control-cell variant-A" data-bind={`${instanceId}.${id}`}>
  {/* TOP: label OUT */}
  <div className="cell-attachment-top">
    <span className="cell-label">OUT</span>
  </div>

  <div className="cell-body">
    <div className="cell-main">
      {/* meter principal */}
      {/* (el JSX anterior) */}
    </div>

    {/* RIGHT: LED activity */}
    <div className="cell-attachment-right">
      <div
        className="cell-led led-activity"
        data-source={`${instanceId}.${id}`}
      />
    </div>
  </div>

  {/* BOTTOM: display de nivel */}
  <div className="cell-info">
    <div className="cell-display" data-precision={2}>
      {value.toFixed(2)}
    </div>
  </div>
</div>
La estructura coincide con la jerarquía .control-cell → cell-attachment-top / cell-main / cell-info que ya usa el modal Era 6.

4) Lógica de updateRealtimeUI para meter
ts
function normalizeMeterValue(val: number, min: number, max: number): number {
  if (max === min) return 0;
  const clamped = Math.max(min, Math.min(max, val));
  return (clamped - min) / (max - min); // 0..1
}

function updateRealtimeUI(state: any) {
  document.querySelectorAll('.control-cell').forEach(cell => {
    const bind = cell.getAttribute('data-bind'); // inst.param [file:117]
    if (!bind) return;
    const [instanceId, paramId] = bind.split('.');
    const val = window.runtimeStateStore.getValue(instanceId, paramId);
    const telemetry = window.runtimeStateStore.getTelemetry(instanceId, paramId);

    // Display numérico
    const display = cell.querySelector('.cell-display') as HTMLElement | null;
    if (display && typeof val === 'number') {
      const precision = parseInt(display.getAttribute('data-precision') ?? '2', 10);
      display.innerText = val.toFixed(precision);
    }

    // LED de actividad
    const led = cell.querySelector('.cell-led') as HTMLElement | null;
    if (led && typeof telemetry === 'number') {
      led.classList.toggle('active', telemetry > 0.05);
    }

    // Meter
    const bar = cell.querySelector('.cell-meter-bar') as HTMLElement | null;
    if (bar && typeof telemetry === 'number') {
      const minAttr = bar.getAttribute('data-min');
      const maxAttr = bar.getAttribute('data-max');
      const min = minAttr != null ? parseFloat(minAttr) : -1;
      const max = maxAttr != null ? parseFloat(maxAttr) : 1;
      const n = normalizeMeterValue(telemetry, min, max);

      bar.style.transform = `scaleY(${n})`;
      bar.style.transformOrigin = 'bottom center';

      if (n < 0.6) {
        bar.style.backgroundColor = 'var(--meter-low)';
      } else if (n < 0.9) {
        bar.style.backgroundColor = 'var(--meter-mid)';
      } else {
        bar.style.backgroundColor = 'var(--meter-hot)';
      }
    }
  });
}
Reutiliza el mismo store de telemetría que oscilloscope y midi viewer en Era 6.

5) CSS de Output Cell (meter)
css
.control-cell .cell-meter {
  width: 24px;
  height: 50px;
  border-radius: 3px;
  border: 1px solid rgba(0, 242, 255, 0.4);
  background: linear-gradient(180deg, #050505 0%, #000000 100%);
  box-shadow:
    inset 0 0 6px rgba(0, 0, 0, 0.9),
    0 0 6px rgba(0, 242, 255, 0.2);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
}

.control-cell .cell-meter.variant-C {
  width: 16px;
  height: 32px;
}

.control-cell .cell-meter-bar {
  width: 70%;
  height: 0%;
  background-color: var(--meter-low, #00f2ff);
  border-radius: 2px 2px 0 0;
  box-shadow: 0 0 6px rgba(0, 242, 255, 0.6);
  transform-origin: bottom center;
  transform: scaleY(0);
  transition:
    transform 0.05s linear,
    background-color 0.1s ease-out,
    box-shadow 0.1s ease-out;
}

:root {
  --meter-low:  #00f2ff;
  --meter-mid:  #00ffaa;
  --meter-hot:  #ff9a00;
}
Esto mantiene el tono cian/neón y el glow coherente con el resto de la WebUI.

[ ] VEM-825 ¿Te gustaría que definamos el patrón equivalente para Input Cell (p.ej. audio_in o cv_in) usando también component: "meter" pero con un rol visual ligeramente distinto (color, etiqueta, etc.)?

[ ] VEM-826 Patrón gemelo para Input Cell usando también meter, diferenciando rol visual y color.

1) Schema Era 6 para Input Cell
Ejemplo audio_in:

text
- id: "audio_in"
  label: "IN"
  type: "audio"
  roles: ["input", "stream", "telemetry"]
  precision: 4
  ui_precision: 2
  range:
    min: -1.0
    max: 1.0
    default: 0.0
  presentation:
    tab: "PATCHING"
    group: "INPUTS"
    order: 1
    ui:
      component: "meter"
      variant: "A"
      attachments:
        - type: "label"
          position: "top"
        - type: "led"
          position: "right"
          role: "activity"
        - type: "display"
          position: "bottom"
          format:
            mode: "number"
            decimals: 2
            suffix: ""
La única diferencia semántica con output: roles incluye input en vez de output, y group: "INPUTS".

2) Props y JSX (simétricos a Output Cell)
Con fromRegistryEntityToControlCellProps obtienes:

ts
const cell: ControlCellProps = {
  id: 'audio_in',
  instanceId: 'inst-001',
  type: 'audio',
  roles: ['input', 'stream', 'telemetry'],
  range: { min: -1.0, max: 1.0, default: 0.0 },
  precision: 4,
  uiPrecision: 2,
  unit: '',
  value: 0.0,
  telemetry: 0.31,
  tab: 'PATCHING',
  group: 'INPUTS',
  order: 1,
  ui: { component: 'meter', variant: 'A' },
  attachments: [
    { type: 'label', position: 'top' },
    { type: 'led', position: 'right', role: 'activity' },
    {
      type: 'display',
      position: 'bottom',
      format: { mode: 'number', decimals: 2, suffix: '' },
    },
  ],
  onChange: undefined,
};
El JSX de meter es el mismo; la distinción visual la llevará el tema (CSS) por rol o grupo.

3) Diferenciación visual vía CSS
Puedes usar el rol input vs output o el group para colorear el marco:

css
/* Base meter (compartido) */
.control-cell .cell-meter {
  width: 24px;
  height: 50px;
  border-radius: 3px;
  background: linear-gradient(180deg, #050505 0%, #000000 100%);
  box-shadow:
    inset 0 0 6px rgba(0, 0, 0, 0.9),
    0 0 6px rgba(0, 242, 255, 0.2);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
}

/* Inputs: borde verde/cian (entrada) */
.control-cell[data-group="INPUTS"] .cell-meter {
  border: 1px solid rgba(0, 255, 170, 0.5); /* verde-cian */
}

/* Outputs: borde cian/naranja (salida) */
.control-cell[data-group="OUTPUTS"] .cell-meter {
  border: 1px solid rgba(0, 242, 255, 0.7); /* cian fuerte */
}

/* Barra interna compartida */
.control-cell .cell-meter-bar {
  width: 70%;
  height: 0%;
  background-color: var(--meter-low, #00f2ff);
  border-radius: 2px 2px 0 0;
  box-shadow: 0 0 6px rgba(0, 242, 255, 0.6);
  transform-origin: bottom center;
  transform: scaleY(0);
  transition:
    transform 0.05s linear,
    background-color 0.1s ease-out,
    box-shadow 0.1s ease-out;
}
Basta con que al crear la cell añadas data-group={group}:

tsx
<div
  className={`control-cell variant-${ui.variant ?? 'C'}`}
  data-bind={`${instanceId}.${id}`}
  data-group={group}
/>
La lógica de updateRealtimeUI es idéntica a la de Output Cell: normalizas telemetría 0..1 y actualizas transform y color en la barra.

[ ] VEM-827 ¿Quieres que hagamos un diagrama rápido en texto de cómo quedarían juntos INPUTS/OUTPUTS en la pestaña PATCHING con estas cells de meter?

[ ] VEM-828 En PATCHING quedaría algo así, con Inputs a la izquierda y Outputs a la derecha.

text
+-------------------------------------------------------------+
| OMEGA RACK  | [MAIN] [PATCHING] [SETUP] [MIDI] [ADVANCED]  |
+-------------------------------------------------------------+
| MODULE: VA Oscillator (va.osc.simple)                       |
+-------------------------------------------------------------+
| TAB: PATCHING                                               |
|                                                             |
|  [GROUP: INPUTS]                    [GROUP: OUTPUTS]        |
|                                                             |
|   IN                                OUT                     |
|  (label top, verde/cian)           (label top, cian)        |
|                                                             |
|   ┌───────────────┐               ┌───────────────┐         |
|   │   ▐▐▐▐▐▐▐▐    │               │      ▐▐▐▐▐▐▐▐ │         |
|   │   meter A     │               │      meter A  │         |
|   └───────────────┘               └───────────────┘         |
|       ●                                ●                    |
|     LED IN (right)                   LED OUT (right)        |
|                                                             |
|   0.31                              0.42                    |
| (display bottom)                 (display bottom)           |
|                                                             |
+-------------------------------------------------------------+
Ambos usan component: "meter" con barra vertical animada por telemetría normalizada 0..1.

[ ] VEM-829 El grupo INPUTS vs OUTPUTS se distingue por color de borde/fondo según CSS (data-group="INPUTS"/"OUTPUTS").

[ ] VEM-830 ¿Te gustaría que el siguiente paso sea aplicar este patrón a un módulo real de tu bundle (por ejemplo testprobe o midi_in) para dejar ya un manifest Era 6 definitivo de ejemplo?

[ ] VEM-831 Tomemos testprobe y lo expresamos en Era 6 con Input/Output Cells tipo meter.

1) Manifest Era 5.2 actual de testprobe
text
id: testprobe
PROBE Utility Modular 505 active 1 Minimal verification probe Era 6 Aseptic.
hp 6
columns 1
- id gain
  label GAIN
  roles control, modtarget
  direction internal
  range min 0, max 1, default 0.5
  presentation tab MAIN, group CONTROL, order 1, ui component knob
- id sigin
  label IN
  roles input, stream
  direction input
  type audio
  presentation tab PATCHING, group INPUTS, order 1
- id sigout
  label OUT
  roles output, stream, telemetry
  direction output
  type audio
  stream true
  presentation tab PATCHING, group OUTPUTS, order 2
Adaptado desde probeprobe.yaml.

2) Manifest Era 6 propuesto (schema completo)
text
id: "testprobe"
name: "PROBE"
version: "6.0.0"
family: "utility"
description: "Minimal verification probe Era 6 Aseptic."

hp: 6
columns: 1

registry:
  - id: "gain"
    label: "GAIN"
    type: "float"
    roles: ["control", "mod_target"]
    precision: 4
    ui_precision: 2
    range:
      min: 0.0
      max: 1.0
      default: 0.5
    presentation:
      tab: "MAIN"
      group: "CONTROL"
      order: 1
      ui:
        component: "knob"
        variant: "A"
        attachments:
          - type: "label"
            position: "top"
          - type: "display"
            position: "bottom"
            format:
              mode: "number"
              decimals: 2
              suffix: ""

  - id: "sigin"
    label: "IN"
    type: "audio"
    roles: ["input", "stream", "telemetry"]
    precision: 4
    ui_precision: 2
    range:
      min: -1.0
      max: 1.0
      default: 0.0
    presentation:
      tab: "PATCHING"
      group: "INPUTS"
      order: 1
      ui:
        component: "meter"
        variant: "A"
        attachments:
          - type: "label"
            position: "top"
          - type: "led"
            position: "right"
            role: "activity"
          - type: "display"
            position: "bottom"
            format:
              mode: "number"
              decimals: 2
              suffix: ""

  - id: "sigout"
    label: "OUT"
    type: "audio"
    roles: ["output", "stream", "telemetry"]
    precision: 4
    ui_precision: 2
    range:
      min: -1.0
      max: 1.0
      default: 0.0
    presentation:
      tab: "PATCHING"
      group: "OUTPUTS"
      order: 2
      ui:
        component: "meter"
        variant: "A"
        attachments:
          - type: "label"
            position: "top"
          - type: "led"
            position: "right"
            role: "activity"
          - type: "display"
            position: "bottom"
            format:
              mode: "number"
              decimals: 2
              suffix: ""
sigin pasa de simple port a Input Cell meter con roles ["input","stream","telemetry"].

sigout pasa a Output Cell meter simétrica, con roles ["output","stream","telemetry"].

3) Cómo se vería en PATCHING (texto)
text
[PATCHING]

[INPUTS]                    [OUTPUTS]

  IN                          OUT
 (label top, verde/cian)    (label top, cian)

  [ meter A ]               [ meter A ]
   │▐▐▐▐▐▐                  │▐▐▐▐▐▐▐▐

   ●                         ●
 LED IN (right)            LED OUT (right)

  0.12                      0.34
(display bottom)         (display bottom)
Todo esto usa exactamente el patrón de Input/Output Cell que acabamos de definir (component "meter", attachments label+led+display, y actualización vía telemetría normalizada 0..1).

[ ] VEM-832 ¿Quieres que hagamos ahora el mismo ejercicio para midiin (Input Cell solo en PATCHING, más un LED de actividad en MAIN)?

[ ] VEM-833 Para midiin encaja perfecto el patrón: LED en MAIN y Input Cell de tipo meter en PATCHING.

1) Manifest Era 5.2 actual (midiin.yaml)
text
id midiin
ACE-UTIL-MIDI-IN industrial MIDI IN 501 5.2.0 Utility
Canonical MIDI Input Bridge for the OMEGA Rack Era 5.2 Gold.
hp 4
rack upper
columns 1

- id activity
  label ACTIVITY
  roles telemetry
  direction internal
  presentation tab MAIN group STATUS order 1
  ui component led, variant A

- id mididata
  label MIDI DATA
  type midi
  direction output
  roles stream, output
  presentation tab PATCHING, group OUTPUTS, order 1
Adaptado desde inin.yaml.

2) Manifest Era 6 propuesto
text
id: "midi_in"
name: "MIDI IN"
version: "6.0.0"
family: "io"
description: "Canonical MIDI Input Bridge for the OMEGA Rack Era 6."

hp: 4
columns: 1

registry:
  # MAIN: LED de actividad global (igual que antes)
  - id: "activity"
    label: "ACTIVITY"
    type: "float"
    roles: ["telemetry"]
    precision: 4
    ui_precision: 2
    range:
      min: 0.0
      max: 1.0
      default: 0.0
    presentation:
      tab: "MAIN"
      group: "STATUS"
      order: 1
      ui:
        component: "led"
        variant: "A"
        attachments:
          - type: "label"
            position: "bottom"

  # PATCHING: Input Cell tipo meter para flujo MIDI
  - id: "mididata"
    label: "MIDI"
    type: "midi"
    roles: ["input", "stream", "telemetry"]
    precision: 0
    ui_precision: 0
    range:
      min: 0.0
      max: 1.0
      default: 0.0
    presentation:
      tab: "PATCHING"
      group: "INPUTS"
      order: 1
      ui:
        component: "meter"
        variant: "A"
        attachments:
          - type: "label"
            position: "top"
          - type: "led"
            position: "right"
            role: "activity"
          - type: "display"
            position: "bottom"
            format:
              mode: "number"
              decimals: 0
              suffix: ""        # podrías usar " ev/s" si defines tasa
activity sigue siendo un LED puro en MAIN, telemetría directa.

mididata se convierte en Input Cell meter en PATCHING, telemetría normalizada (0..1) derivada de actividad MIDI.

3) Cómo se vería en la WebUI
MAIN
text
[MAIN]

[STATUS]

  ACTIVITY
  (label bottom)

    ●
  (LED A, telemetría global MIDI)
PATCHING
text
[PATCHING]

[INPUTS]

  MIDI
 (label top)

  ┌───────────────┐
  │    ▐▐▐▐▐▐     │   (meter A, altura según tráfico MIDI)
  └───────────────┘
        ●
      LED activity (right)

      8
   (display bottom: p.ej. eventos/s normalizados)
A nivel de código:

[ ] VEM-834 ControlCell trata mididata igual que audio_in pero con type: "midi" y roles de input.

updateRealtimeUI lee telemetry para mididata, normaliza 0..1 y actualiza cell-meter-bar + LED, tal y como ya haces en oscilloscope/midi viewer.

[ ] VEM-835 ¿Quieres que el siguiente paso sea escribir un pequeño snippet de cómo normalizarías la telemetría MIDI (por ejemplo, número de eventos por ventana a 0..1) para alimentar este meter de mididata?

[ ] VEM-836 Puedes tratar la telemetría MIDI como “eventos por ventana” y luego normalizarla igual que audio, con un techo configurable.

1) Lado C/Engine: exponer eventos por ventana
Supongamos que ya cuentas eventos en una ventana deslizante (p.ej. 250 ms) y los publicas como telemetría cruda:

cpp
// pseudo-código C++ en RpcTelemetryController / MIDI bridge [file:117]
float MidiInputAdapter::getTrafficMetric() const {
    // eventos en los últimos N ms
    const int eventsInWindow = this->eventCounter.getLastWindowCount();
    // límite razonable: 64 eventos por ventana ~ ráfaga fuerte
    const float maxEvents = 64.0f;
    float val = static_cast<float>(eventsInWindow) / maxEvents;
    // clamp 0..1
    if (val < 0.0f) val = 0.0f;
    if (val > 1.0f) val = 1.0f;
    return val;
}
Ese val 0..1 lo dejas en telemetry["mididata"] para la instancia midi_in.

2) Lado WebUI: usar telemetría normalizada en el meter
En la UI solo consumes 0..1, igual que con audio:

ts
// runtimeStateStore interno (ya tienes algo similar) [file:117]
function getMidiTelemetry(instanceId: string, paramId: string): number {
  // valor 0..1 ya normalizado por el engine
  return window.runtimeStateStore.getTelemetry(instanceId, paramId) ?? 0;
}

// En updateRealtimeUI:
const bar = cell.querySelector('.cell-meter-bar') as HTMLElement | null;
if (bar && paramId === 'mididata') {
  const t = getMidiTelemetry(instanceId, paramId); // 0..1
  const n = Math.max(0, Math.min(1, t));

  bar.style.transform = `scaleY(${n})`;

  if (n < 0.3) {
    bar.style.backgroundColor = 'var(--meter-low)';   // tráfico bajo
  } else if (n < 0.7) {
    bar.style.backgroundColor = 'var(--meter-mid)';   // normal
  } else {
    bar.style.backgroundColor = 'var(--meter-hot)';   // flood / alto
  }
}
Si quisieras que el display inferior muestre algo más “musical” (p.ej. eventos/segundo), puedes derivarlo del mismo contador en el engine y formatearlo aparte, pero el meter visual solo necesita el 0..1 normalizado.

[ ] VEM-837 ¿Te interesa que definamos también un patrón similar de meter para una Input Cell CV (ej. cv_in) con rango -10..10 V normalizado a 0..1?


[ ] VEM-838 Para CV es el mismo patrón de Input Cell, cambiando tipo, rango y unidades.

[ ] VEM-839 Schema Era 6 para cv_in
text
- id: "cv_in"
  label: "CV IN"
  type: "cv"
  roles: ["input", "stream", "telemetry"]
  precision: 4
  ui_precision: 2
  unit: "V"
  range:
    min: -10.0
    max: 10.0
    default: 0.0
  presentation:
    tab: "PATCHING"
    group: "INPUTS"
    order: 2
    ui:
      component: "meter"
      variant: "A"
      attachments:
        - type: "label"
          position: "top"
        - type: "led"
          position: "right"
          role: "activity"
        - type: "display"
          position: "bottom"
          format:
            mode: "number"
            decimals: 1
            suffix: " V"
Esto usa type: "cv", rango -10..10 y unit: "V" según schema Era 6.

[ ] VEM-840 Normalización -10..10 V → 0..1
En el engine calculas la telemetría normalizada a partir del valor de CV:

cpp
// valCv en voltios, típicamente -10..10
float normalizeCvForTelemetry(float valCv) {
    const float minV = -10.0f;
    const float maxV =  10.0f;
    const float clamped = std::clamp(valCv, minV, maxV);
    return (clamped - minV) / (maxV - minV); // 0..1
}
Publicas ese 0..1 en telemetry["cv_in"] para la instancia.

[ ] VEM-841 Uso en la WebUI (meter + display)
El meter usa telemetry normalizada (0..1) exactamente igual que en audio/MIDI, vía scaleY(n).

[ ] VEM-842 El display puede usar la lectura en voltios (si el store también expone el valor analógico) o derivarla:

ts
// Si el store guarda valor en V en params:
const valV = window.runtimeStateStore.getValue(instanceId, 'cv_in'); // -10..10
display.innerText = `${valV.toFixed(1)} V`;
Visualmente en PATCHING:

text
[INPUTS]

  CV IN
 (label top)

  [ meter A ]   ●
    ▐▐▐▐▐       LED activity (right)

   -2.3 V
 (display bottom)
¿Quieres que apliquemos este patrón CV a algún módulo concreto de tu catálogo (p.ej. un futuro cv_in de utilidad) o lo dejamos como spec genérica para IO?

[ ] VEM-843 Yo lo dejaría ya como spec genérica de IO y a la vez esbozaría un módulo cv_in de utilidad para que tengas un ejemplo listo.

[ ] VEM-844 Spec genérica IO (CV / Audio / MIDI)
type: "audio" | "cv" | "midi". 

roles: siempre incluyen "stream" y "telemetry", más "input" o "output".

presentation.ui.component: "meter" para cualquier IO visualizable.

[ ] VEM-845 Attachments estándar:

label/top

led/right con role: "activity"

display/bottom con formato adecuado (Hz, dB, V, eventos/s…).

[ ] VEM-846 Ejemplo concreto: módulo cv_in de utilidad
text
id: "cv_in_util"
name: "CV INPUT"
version: "6.0.0"
family: "io"
description: "Utility CV input bridge for external modulation."

hp: 4
columns: 1

registry:
  - id: "cv_in"
    label: "CV IN"
    type: "cv"
    roles: ["input", "stream", "telemetry"]
    precision: 4
    ui_precision: 2
    unit: "V"
    range:
      min: -10.0
      max: 10.0
      default: 0.0
    presentation:
      tab: "PATCHING"
      group: "INPUTS"
      order: 1
      ui:
        component: "meter"
        variant: "A"
        attachments:
          - type: "label"
            position: "top"
          - type: "led"
            position: "right"
            role: "activity"
          - type: "display"
            position: "bottom"
            format:
              mode: "number"
              decimals: 1
              suffix: " V"
Con esto:

[ ] VEM-847 Cualquier IO nuevo (audio in/out, cv in/out, midi in/out) puede copiar el patrón cambiando solo type, roles, unit, range y group (INPUTS/OUTPUTS).

[ ] VEM-848 ¿Quieres que el próximo paso sea redactar una sección corta de la doc “ACE_MODULE_SCHEMA_SPEC_6” que formalice este patrón de IO meters para que quede como estándar escrito?


[ ] VEM-849 Quedaría algo así, encajado en el tono de la spec Era 6.

[ ] VEM-850 Sección propuesta: IO Meters
3.X IO Meters – Patrón Estándar para Entradas y Salidas
Los módulos de entrada y salida (audio, CV, MIDI) deben exponer sus puertos principales como entidades del registry con apoyo visual estándar mediante IO Meters.

[ ] VEM-851 Un IO Meter es una Control Cell declarada con:

type: "audio", "cv" o "midi".

roles: siempre incluyen al menos stream y telemetry, junto con input o output según corresponda.

range: define el dominio esperado del valor bruto publicado por el runtime (p.ej. -1.0..1.0 para audio, -10.0..10.0 para CV).

presentation.ui.component: "meter": indica que la representación recomendada es un medidor vertical u horizontal, no un control interactivo.

[ ] VEM-852 Ejemplo de salida de audio:

text
- id: "audio_out"
  label: "OUT"
  type: "audio"
  roles: ["output", "stream", "telemetry"]
  precision: 4
  ui_precision: 2
  range:
    min: -1.0
    max: 1.0
    default: 0.0
  presentation:
    tab: "PATCHING"
    group: "OUTPUTS"
    order: 1
    ui:
      component: "meter"
      variant: "A"
      attachments:
        - type: "label"
          position: "top"
        - type: "led"
          position: "right"
          role: "activity"
        - type: "display"
          position: "bottom"
          format:
            mode: "number"
            decimals: 2
            suffix: ""
El frontend debe interpretar component: "meter" como una recomendación para representar el valor de telemetría normalizado en el rango [0, 1] mediante una barra o similar. La normalización desde el dominio real (range.min..range.max) hasta [0, 1] se realiza en el runtime o en la capa de binding, no en el manifiesto.

[ ] VEM-853 La composición visual básica de un IO Meter es:

[ ] VEM-854 Label (attachments tipo label, normalmente en position: "top") para identificar el puerto.

[ ] VEM-855 LED de actividad (type: "led", role: "activity", típicamente position: "right") que refleja un umbral simple sobre la telemetría.

[ ] VEM-856 Display numérico (type: "display", position: "bottom", con format.decimals y format.suffix adecuados) que presenta el valor actual en unidades físicas (dB, V, etc.).

[ ] VEM-857 La UI puede diferenciar visualmente entradas y salidas usando roles (input vs output) o group ("INPUTS" vs "OUTPUTS") sin introducir lógica específica de módulo.

[ ] VEM-858 ¿Quieres que también esbocemos una micro sección paralela para “Control Cells” genéricas (knob/slider + label + display) para que IO Meters y controles compartan terminología en la doc?

[ ] VEM-859 Algo así mantienes la simetría con IO Meters en la doc.

[ ] VEM-860 Sección propuesta: Control Cells genéricas
3.Y Control Cells – Patrón Estándar de Parámetros
Toda entidad de tipo parámetro (roles que incluyan control) debe representarse como una Control Cell. Una Control Cell es una unidad visual autónoma que agrupa:

[ ] VEM-861 Un componente principal interactivo (knob, slider, lista, botón).

[ ] VEM-862 Uno o varios attachments (label, display, led) asociados a la misma entidad o a entidades relacionadas.

[ ] VEM-863 Las Control Cells se declaran mediante los campos del registry:

type: int, float, bool, string o list.

roles: siempre incluye control; puede combinarse con mod_target, expert, etc.

range: min, max, default definen el dominio numérico y el valor inicial.

precision: resolución DSP; ui_precision resolución de visualización.

presentation.tab, presentation.group, presentation.order: determinan su posición lógica en la interfaz.

presentation.ui.component: knob, slider_v, slider_h, list, toggle, button, etc.

presentation.ui.variant: pista de tamaño/densidad (p.ej. A, B, C), interpretada por el tema.

[ ] VEM-864 Ejemplo de Control Cell para un parámetro de corte de filtro:

text
- id: "cutoff"
  label: "CUTOFF"
  type: "float"
  roles: ["control", "mod_target"]
  unit: "Hz"
  precision: 4
  ui_precision: 1
  range:
    min: 20.0
    max: 20000.0
    default: 1000.0
  presentation:
    tab: "MAIN"
    group: "FILTER"
    order: 1
    ui:
      component: "knob"
      variant: "A"
      attachments:
        - type: "label"
          position: "top"
        - type: "display"
          position: "bottom"
          format:
            mode: "number"
            decimals: 1
            suffix: " Hz"
En el frontend, una Control Cell se compone típicamente de:

[ ] VEM-865 Zona superior con label (attachments tipo label, position: "top").

[ ] VEM-866 Zona central con el componente principal (component: "knob", "slider_v", etc.).

[ ] VEM-867 Zona inferior con un display (type: "display", position: "bottom") que presenta el valor actual formateado según ui_precision y format (modo, decimales, sufijo).

[ ] VEM-868 Adjuntos adicionales (type: "led", position: "top" o "right") pueden usarse para mostrar telemetría asociada (p.ej. actividad de modulación) sin introducir lógica de renderizado específica de módulo: la UI se limita a interpretar type, position, role y format declarados en el esquema.

[ ] VEM-869 ¿Quieres que preparemos ahora una tabla breve en la doc que resuma “Control Cell vs IO Meter” (campos clave, roles y casos de uso)?


[ ] VEM-870 Una tabla así encaja bien en la doc.

[ ] VEM-871 Control Cell vs IO Meter
Aspecto	Control Cell	IO Meter
Aspecto	Control Cell	IO Meter
Propósito	Parámetros manipulables por el usuario	Visualizar actividad de entradas/salidas
type	int, float, bool, string, list	audio, cv, midi
roles mínimos	Incluye control	Incluye stream y telemetry, más input/output
component	knob, slider_v, slider_h, list, etc.	Siempre meter
Interacción	Sí (cambia params)	No (solo lectura de telemetry)
range	Dominio de edición del parámetro	Dominio físico de la señal (dB, V, nivel, eventos)
ui_precision	Formato del display de valor	Formato del display informativo (nivel, V, etc.)
Attachments	Label/top, display/bottom, leds opcionales	Label/top, led/right (role: activity), display/bottom
Tabs típicas	MAIN, SETUP, ADVANCED	PATCHING (INPUTS/OUTPUTS)
Casos de uso	Cutoff, Gain, Attack, MIDI channel, toggles	Audio In/Out, CV In/Out, MIDI In/Out traffic
Ambas se declaran como entradas del registry y usan presentation.ui más attachments según la spec Era 6.

[ ] VEM-872 La diferencia clave es semántica: una Control Cell muta estado de parámetros, mientras que un IO Meter refleja estado de flujo/telemetría sin interacción directa.

[ ] VEM-873 ¿Quieres que añadamos un mini ejemplo combinado en la doc (un módulo con 1 Control Cell + 1 IO Meter) para ilustrar ambos patrones en un solo YAML?

[ ] VEM-874 Un ejemplo mínimo que combina ambos patrones en un solo módulo.

[ ] VEM-875 Ejemplo combinado: parámetro + IO Meter
text
id: "gain_probe"
name: "GAIN PROBE"
version: "6.0.0"
family: "utility"
description: "Simple gain control with output meter."

hp: 4
columns: 1

registry:
  # Control Cell: parámetro de ganancia
  - id: "gain"
    label: "GAIN"
    type: "float"
    roles: ["control", "mod_target"]
    unit: "dB"
    precision: 4
    ui_precision: 1
    range:
      min: -60.0
      max: 6.0
      default: 0.0
    presentation:
      tab: "MAIN"
      group: "CONTROL"
      order: 1
      ui:
        component: "knob"
        variant: "A"
        attachments:
          - type: "label"
            position: "top"
          - type: "display"
            position: "bottom"
            format:
              mode: "number"
              decimals: 1
              suffix: " dB"

  # IO Meter: salida de audio monitorizada
  - id: "audio_out"
    label: "OUT"
    type: "audio"
    roles: ["output", "stream", "telemetry"]
    precision: 4
    ui_precision: 2
    range:
      min: -1.0
      max: 1.0
      default: 0.0
    presentation:
      tab: "PATCHING"
      group: "OUTPUTS"
      order: 1
      ui:
        component: "meter"
        variant: "A"
        attachments:
          - type: "label"
            position: "top"
          - type: "led"
            position: "right"
            role: "activity"
          - type: "display"
            position: "bottom"
            format:
              mode: "number"
              decimals: 2
              suffix: ""
gain ejemplifica la Control Cell genérica (knob + label + display) en la pestaña MAIN.

audio_out ejemplifica el IO Meter de salida (meter + label + led + display) en PATCHING.

[ ] VEM-876 ¿Te gustaría que el siguiente paso sea escribir una breve nota en la doc indicando que los temas/skins pueden ignorar o reinterpretar component/variant según contexto (p.ej. vista compacta de mixer)?


[ ] VEM-877 Sí, esa nota ayuda a blindar la flexibilidad de la UI.

[ ] VEM-878 Nota propuesta sobre component y variant
Nota sobre temas y vistas compactas

[ ] VEM-879 Los campos presentation.ui.component y presentation.ui.variant son pistas de representación recomendadas para una UI de rack estándar, no mandatos rígidos. Un tema o vista especializada (p.ej. mezclador compacto, panel de resumen, mobile) puede reinterpretar o ignorar estos hints siempre que respete la semántica subyacente de la entidad.

[ ] VEM-880 Ejemplos válidos:

[ ] VEM-881 Renderizar un parámetro declarado como component: "knob" como slider horizontal en una vista de mixer, manteniendo el mismo rango y binding de parámetro.

[ ] VEM-882 Colapsar una Control Cell completa (knob + label + display) en una fila de tabla que muestre solo un slider y un valor numérico.

[ ] VEM-883 Representar un IO Meter (component: "meter") como una simple barra horizontal o un icono de nivel en vistas muy densas.
El contrato obligatorio reside en type, roles, range, unit y los attachments declarados; component/variant definen la política de visualización por defecto, pero la implementación concreta puede variar según el contexto de la UI sin violar la Era 6 Aseptic Contract Runtime.

[ ] VEM-884 ¿Quieres que ahora repasemos rápidamente todos los sitios del código TS donde ya usas look/component/variant para alinear nombres (component: "meter", variant: "A"|"B"|"C") y evitar divergencias?

[ ] VEM-885 Ya tienes varios usos de look/component/variant en la WebUI que conviene alinear con el nuevo contrato.

[ ] VEM-886 Sitios clave donde ya usas look/component/variant
1) Theme validator (debugtest)
En debugtest THEME VALIDATOR declaras items con look y variant (A, B, C) para knobs, displays, leds y jacks.

text
- id knoba, semantic scalar, look knob, variant A, label KNOB A
- id knobb, semantic scalar, look knob, variant B, label KNOB B
- id knobc, semantic scalar, look knob, variant C, label KNOB C
- id oleda, semantic list,  look display, variant A, label DISP A
- id leda,  semantic telemetry, look led,    variant A, color red
- id jacka, semantic port, look jack, portId ina, label AUDIO
Aquí look + variant ya funciona como equivalente a component + variant, así que:

[ ] VEM-887 Recomendación: converger la nomenclatura (internamente tratar look como component) y usar las mismas variantes A/B/C que en Era 6.

2) Era 5/5.2 ModulePatchModal (Control Cells)
En el modal Era 5.2 generas Control Cells con clases basadas en look y variant.

ts
// buildControlCell (Era 5.2)
const cell = document.createElement('div');
cell.className = 'control-cell';
// ...
const top = document.createElement('div');
top.className = 'cell-attachment-top';
if (entity.roles.includes('stream')) {
  const led = document.createElement('div');
  led.className = 'led led-orange';
  led.setAttribute('data-source', entity.id);
  top.appendChild(led);
}
// main
const main = document.createElement('div');
main.className = 'cell-main';
if (entity.presentation.ui?.control === 'list' && entity.options) {
  // select...
} else {
  // Default knob
  main.innerHTML = `<div class="knob-ring" data-param="${entity.id}">
    <div class="knob"><div class="knob-marker white"></div></div>
  </div>`;
}
Aquí usas control (string) en Era 5 en lugar de component, pero el patrón visual es el mismo.

[ ] VEM-888 Recomendación: mapear el antiguo presentation.ui.control/look a presentation.ui.component internamente y añadir el nuevo caso "meter" en el switch del renderer.

3) Era 6 ModulePatchModal (Aseptic)
En el modal Era 6 ya tienes un Unified Control Cell Generator que usa item.look/item.variant y zonas top/main/info/bottom.

ts
buildControlCell(item) {
  const cell = document.createElement('div');
  cell.className = 'control-cell';
  // TOP LED telemetry
  const top = document.createElement('div');
  top.className = 'cell-attachment-top';
  if (item.roles?.includes('stream')) {
    const led = document.createElement('div');
    led.className = 'led led-orange';
    led.setAttribute('data-source', id);
    top.appendChild(led);
  }
  cell.appendChild(top);

  // MAIN
  const main = document.createElement('div');
  main.className = 'cell-main';
  if (item.look === 'list' && item.options) {
    // selector
  } else {
    // knob por defecto
    main.innerHTML = `<div class="knob-ring" data-param="${id}">
      <div class="knob"><div class="knob-marker white"></div></div>
    </div>`;
  }
  cell.appendChild(main);

  // INFO (label + display)
  const info = document.createElement('div');
  info.className = 'cell-info';
  const label = document.createElement('label');
  label.className = 'cell-label';
  label.innerText = item.label || id.toUpperCase();
  info.appendChild(label);

  const display = document.createElement('div');
  display.className = 'cell-display';
  display.setAttribute('data-precision', item.uiprecision ?? 2);
  // ...
  info.appendChild(display);
  cell.appendChild(info);

  return cell;
}
Este es el sitio natural para introducir component: "meter" y variant: "A"|"B"|"C" con el nuevo switch que ya hemos bosquejado.

[ ] VEM-889 Recomendación: unificar nombres:

item.look → item.component

[ ] VEM-890 Mantener variant como está y documentar que A/B/C vienen del schema Era 6.

4) ModuleMidiToCv (Era 6 mini cells)
En el módulo ModuleMidiToCv ya generas mini control cells con knobs y leds usando entity.presentation?.ui?.component y attachments.

ts
const compType = entity.presentation?.ui?.component || 'knob';
const comp = document.createElement('div');
comp.className = `entity-control-mini control-${compType}`;
comp.innerHTML = `<div class="knob-mini-placeholder">...</div>`;
cell.appendChild(comp);
// ...
const hasLed = entity.presentation?.ui?.attachments?.some(a => a.type === 'led');
if (hasLed) {
  const led = document.createElement('div');
  led.className = 'mcv-led';
  led.id = `led-${this.options.instanceId}-${entity.id}`;
  cell.appendChild(led);
}
Aquí ya estás en la terminología correcta (component, attachments).

[ ] VEM-891 Recomendación: añadir el soporte a component: "meter" reutilizando la misma convención de clases (control-meter, variant-A) cuando uses el patrón IO Meter en módulos compactos.

[ ] VEM-892 En resumen:

[ ] VEM-893 Donde hoy usas look / control, alinear internamente con component y soportar el nuevo valor "meter" además de "knob", "slider_v", etc.

[ ] VEM-894 Mantener variant: "A"|"B"|"C" como llave de tamaño/estilo en todos los sitios (theme validator, ModulePatchModal, ModuleMidiToCv), usando los mismos nombres en el schema Era 6.

[ ] VEM-895 ¿Te gustaría que el siguiente paso sea escribir una pequeña función de compatibilidad normalizeUiDescriptor(entity) que convierta los viejos campos (look, control) a la nueva forma (presentation.ui.component), para que puedas soportar manifests 5.2 y 6 a la vez durante la transición?


puedes romper con todo lo previo y quedarte solo con Era 6.

[ ] VEM-896 Qué implica no dar compatibilidad
El loader/SchemaStore solo acepta manifests Era 6 (version: "6.x" y estructura nueva), sin rutas especiales para 5.2.

[ ] VEM-897 En la WebUI eliminas ramas que miren look, control o estructuras Era 5, y pasas a usar solo presentation.ui.component, variant y attachments.

[ ] VEM-898 Cualquier módulo antiguo debe migrarse a YAML Era 6 antes de ser visible; no hay fallback silencioso.

[ ] VEM-899 Si quieres, el próximo paso puede ser listar todos los “síntomas” que puedes buscar en el repo para detectar restos de Era 5 (campos, funciones, archivos) y así limpiar el código sin miedo.

[ ] VEM-900 Para purgar Era 5 sin miramientos, estos son los “olores” que puedes buscar y eliminar o migrar.

[ ] VEM-901 YAML / Manifests
Campos obsoletos:

ui component (sin presentation alrededor).

direction input/output/internal fuera de roles.

hp usado como layout fijo sin presentation rica.

look en lugar de presentation.ui.component.

semantic (scalar, list, telemetry…) como pseudo-tipo de UI.

[ ] VEM-902 Estructuras típicas de 5.2:

[ ] VEM-903 Bloques tipo PATCHING SANCTUARY en texto dentro del YAML.

[ ] VEM-904 Comentarios o títulos con Era 5.2, Gold Standard, Meta-Engine Adapter.

[ ] VEM-905 IDs sin versión clara o sin version: "6.x" en cabecera.

[ ] VEM-906 Señales de layout antiguo:

rack upper/lower sin view policy de tabs y groups.

columns usado como layout absoluto en vez de hint opcional.

[ ] VEM-907 TypeScript / WebUI
Uso de look o control en lugar de component:

[ ] VEM-908 Búsquedas a hacer: look , .look ===, ui?.control, presentation.ui?.control.

[ ] VEM-909 Control Cells Era 5:

[ ] VEM-910 Funciones con comentarios tipo ERA 5 STANDARD Unified Control Cell Generator.

[ ] VEM-911 Uso de Era5ManifestParser o clases con Era5 en el nombre.

[ ] VEM-912 Código que habla de PATCHING SANCTUARY en el modal.

[ ] VEM-913 Compatibilidad de manifests:

[ ] VEM-914 Parsers que detectan “era” o versión y ramifican (if (isEra5) ... else ...).

[ ] VEM-915 Cualquier uso de modulesEra5, legacy, era5Tab, etc.

[ ] VEM-916 UI específica de módulos antiguos:

[ ] VEM-917 Clases o archivos como ModuleJuno, ModuleJP, ModuleDelay cuando ya tienes ModuleRenderer genérico.

[ ] VEM-918 C++ / Core / Bridge
Rutas específicas Era 5:

[ ] VEM-919 Comentarios o enums con ERA5, Era 5.2, LEGACY.

[ ] VEM-920 Funciones de parsing de manifests que aceptan estructuras antiguas (p.ej. leen ui component plano).

[ ] VEM-921 Compatibilidad en Semantic/AceCatalog:

[ ] VEM-922 Código que detecta versión del manifest para aplicar “fallbacks” (p.ej. si no hay presentation, inventa defaults).

[ ] VEM-923 Cualquier mapeo de look/semantic a tipos de puerto, en vez de fiarse de type + roles.

[ ] VEM-924 Documentación / Reglas
Docs que mencionan la Era 5 como actual:

[ ] VEM-925 Secciones que traten ACE_MANIFEST_SPEC_5_2, ACE_META_ENGINE_ERA_5 como referencia primaria.

[ ] VEM-926 Reglas que permitan moduledescriptors.js hardcoded en lugar de contract Era 6 puro.

[ ] VEM-927 En limpio, para migrar:

[ ] VEM-928 En manifests: migrar todo a registry + presentation.ui.component/variant/attachments y borrar campos Era 5.

[ ] VEM-929 En TS: dejar solo paths que consuman el schema Era 6; cualquier referencia a look, Era5ManifestParser, o “sanctuary” se puede eliminar.

[ ] VEM-930 ¿Quieres que el siguiente paso sea una checklist concreta de “acciones de borrado/migración” (puntos ejecutables) basada en estos síntomas?


[ ] VEM-931 Checklist rápida, centrada en acciones ejecutables.

1) Manifests / YAML
Buscar en Resources/modules:

[ ] VEM-932 Eliminar/migrar cualquier manifest que no tenga version: "6.x".

[ ] VEM-933 Sustituir campos sueltos ui component por bloque presentation.ui.component.

[ ] VEM-934 Migrar direction input/output/internal a roles (input/output/stream/telemetry).

[ ] VEM-935 Eliminar usos de look y semantic en manifests; reemplazar por presentation.ui.component + type/roles.

[ ] VEM-936 Borrar o actualizar comentarios/textos que mencionen “Era 5.2”, “Gold Standard”, “Meta-Engine Adapter” para esos módulos.

[ ] VEM-937 Introducir patrones nuevos:

component: "meter" para IO (audio/cv/midi) con roles: ["input"/"output","stream","telemetry"].

[ ] VEM-938 Attachments estándar (label top, led right, display bottom) para IO Meters y Control Cells.

2) WebUI TS – Eliminación Era 5
En el código TS (uimodulemanager, moduledescriptors, ModulePatchModal, etc.):

[ ] VEM-939 Eliminar Era5ManifestParser y cualquier import/uso de él.

[ ] VEM-940 Borrar ramas if (isEra5), era5Tab, PATCHING SANCTUARY y similares.

[ ] VEM-941 Reemplazar toda referencia a entity.presentation.ui?.control o item.look por presentation.ui.component.

[ ] VEM-942 Añadir al switch de componentes el nuevo caso "meter" (ya bosquejado) y usar variant A/B/C desde el schema.

[ ] VEM-943 Asegurar que buildControlCell y equivalentes siempre leen:

component

variant

attachments (type, position, role, format)

[ ] VEM-944 Eliminar clases/archivos de módulos hardcoded (p.ej. ModuleJuno, ModuleDelay, etc.) si ya existen manifests Era 6 para ellos y usas ModuleRenderer.

3) WebUI TS – Alineación Era 6
En el Control Cell renderer (modal y rack):

[ ] VEM-945 Normalizar a la jerarquía: .control-cell → .cell-attachment-top / .cell-body / .cell-main / .cell-info / .cell-attachment-bottom.

[ ] VEM-946 Usar data-bind="instanceId.paramId" y data-group (INPUTS/OUTPUTS) para estilos de IO.

[ ] VEM-947 Implementar el render de:

component: "knob" | "slider_v" | "slider_h" | "list" | "toggle" | "button" | "meter".

[ ] VEM-948 Attachments label, display, led según position.

[ ] VEM-949 Actualizar updateRealtimeUI para:

[ ] VEM-950 Knobs: angle a partir de value.

[ ] VEM-951 Displays: formateo con ui_precision / attachments.format.

[ ] VEM-952 LEDs: umbral sobre telemetry.

[ ] VEM-953 Meters: scaleY con telemetría normalizada 0..1, usando data-min/data-max o valor ya normalizado.

4) Core / Bridge C++ – Solo Era 6
En AceCatalog / loaders de manifests:

[ ] VEM-954 Eliminar cualquier código que acepte formatos 5.x (campos huérfanos, estructuras especiales).

[ ] VEM-955 Enforzar presencia de campos Era 6 (registry, type, roles, presentation).

[ ] VEM-956 En SemanticBrokerService / RPC metadata:

[ ] VEM-957 Asegurar que solo sirve schemas Era 6 (no generar items a partir de estructuras antiguas).

[ ] VEM-958 Incluir siempre presentation.ui.component/variant/attachments en los metadatos hacia la WebUI.

5) Documentación / Reglas
Marcar explícitamente en ACE_MANIFEST_SPEC_5_2 y docs Era 5 que están deprecated y no soportados en runtime actual.

[ ] VEM-959 En ACE_MODULE_SCHEMA_SPEC_6:

[ ] VEM-960 Incluir las nuevas secciones de Control Cells e IO Meters que hemos redactado.

[ ] VEM-961 Añadir la nota sobre que component/variant son hints para el tema, no mandatos.

[ ] VEM-962 En RULESERA6.md:

[ ] VEM-963 Añadir una regla explícita “No manifests anteriores a Era 6 en producción; cualquier módulo nuevo debe declararse en schema Era 6”.

6) Verificación rápida
Grep global:

[ ] VEM-964 No debe quedar ningún Era5ManifestParser, ERA 5, era5-tab, PATCHING SANCTUARY.

[ ] VEM-965 No debe quedar ui component suelto ni look/semantic en manifests activos.

[ ] VEM-966 Smoke test:

[ ] VEM-967 Cargar un preset con testprobe, midi_in y el VA Oscillator y comprobar que:

[ ] VEM-968 En MAIN se ven Control Cells limpias.

[ ] VEM-969 En PATCHING se ven IO Meters de audio/MIDI/CV con label, led y display funcionando.

[ ] VEM-970 ¿Quieres que te ayude a convertir alguno de tus manifests concretos (por ejemplo midi2cv.yaml o oscva.yaml) a Era 6 siguiendo exactamente esta checklist?


[ ] VEM-971 Te dejo una versión ya “Era 6” para ambos, siguiendo todo lo que hemos definido.

oscva.yaml (JUNO DCO – Era 6)
text
id: "oscva"
name: "JUNO DCO"
family: "oscillator"
engine: "Modular"
modelId: "DCO-60"
version: "6.0.0"
status: "active"
description: "Authentic digitally controlled oscillator. Unifies Saw, Pulse, and Sub-oscillator sections."

layout:
  hp: 12
  rack: "lower"
  columns: 3

registry:
  - id: "layer.a.osc.saw.on"
    label: "SAW"
    type: "float"
    roles: ["control", "mod_target"]
    precision: 4
    ui_precision: 2
    range:
      min: 0.0
      max: 1.0
      default: 0.0
    presentation:
      tab: "MAIN"
      group: "WAVEFORM"
      order: 1
      ui:
        component: "knob"
        variant: "C"
        attachments:
          - type: "label"
            position: "top"
          - type: "display"
            position: "bottom"
            format:
              mode: "number"
              decimals: 2
              suffix: ""

  - id: "layer.a.osc.pulse.on"
    label: "PULSE"
    type: "float"
    roles: ["control", "mod_target"]
    precision: 4
    ui_precision: 2
    range:
      min: 0.0
      max: 1.0
      default: 1.0
    presentation:
      tab: "MAIN"
      group: "WAVEFORM"
      order: 2
      ui:
        component: "toggle"
        variant: "C"
        attachments:
          - type: "label"
            position: "top"
          - type: "display"
            position: "bottom"
            format:
              mode: "text"

  - id: "layer.a.osc.sub.level"
    label: "SUB"
    type: "float"
    roles: ["control", "mod_target"]
    precision: 4
    ui_precision: 2
    range:
      min: 0.0
      max: 1.0
      default: 0.5
    presentation:
      tab: "MAIN"
      group: "MIXER"
      order: 3
      ui:
        component: "slider_v"
        variant: "B"
        attachments:
          - type: "label"
            position: "top"
          - type: "display"
            position: "bottom"
            format:
              mode: "number"
              decimals: 2
              suffix: ""

  - id: "layer.a.osc.noise.level"
    label: "NOISE"
    type: "float"
    roles: ["control", "mod_target"]
    precision: 4
    ui_precision: 2
    range:
      min: 0.0
      max: 1.0
      default: 0.0
    presentation:
      tab: "MAIN"
      group: "MIXER"
      order: 4
      ui:
        component: "slider_v"
        variant: "B"
        attachments:
          - type: "label"
            position: "top"
          - type: "display"
            position: "bottom"
            format:
              mode: "number"
              decimals: 2
              suffix: ""

  - id: "layer.a.osc.lfo.depth"
    label: "LFO"
    type: "float"
    roles: ["control", "mod_target"]
    precision: 4
    ui_precision: 2
    range:
      min: 0.0
      max: 1.0
      default: 0.0
    presentation:
      tab: "MAIN"
      group: "MOD"
      order: 5
      ui:
        component: "knob"
        variant: "C"
        attachments:
          - type: "label"
            position: "top"
          - type: "display"
            position: "bottom"
            format:
              mode: "number"
              decimals: 2
              suffix: ""

  # IO Meter de salida
  - id: "vout"
    label: "OUT"
    type: "audio"
    roles: ["output", "stream", "telemetry"]
    precision: 4
    ui_precision: 2
    range:
      min: -1.0
      max: 1.0
      default: 0.0
    presentation:
      tab: "PATCHING"
      group: "OUTPUTS"
      order: 10
      ui:
        component: "meter"
        variant: "A"
        attachments:
          - type: "label"
            position: "top"
          - type: "led"
            position: "right"
            role: "activity"
          - type: "display"
            position: "bottom"
            format:
              mode: "number"
              decimals: 2
              suffix: ""
He añadido precision/ui_precision y el IO Meter vout con el patrón estándar (roles output, stream, telemetry, component meter, attachments label+led+display).

midi2cv.yaml (MIDI‑2‑CV – Era 6)
Partiendo del manifest 5.2 de midi2cv:

text
id: "midi2cv"
name: "MIDI-2-CV"
family: "utility"
engine: "Modular"
modelId: "ACE-MIDI-ADAPTER-ULTIMATE"
version: "6.0.0"
status: "active"
description: "Gold-standard MIDI-to-CV adapter. Converts MIDI to high-resolution CV/Gate."

layout:
  hp: 8
  rack: "upper"
  columns: 2

registry:
  # MAIN – CONNECTIVITY
  - id: "midichan"
    label: "MIDI CHANNEL"
    type: "int"
    roles: ["control"]
    precision: 0
    ui_precision: 0
    range:
      min: 1
      max: 16
      default: 1
    presentation:
      tab: "MAIN"
      group: "CONNECTIVITY"
      order: 1
      ui:
        component: "list"
        variant: "A"

  # MAIN – TUNING
  - id: "transpose"
    label: "TRANSPOSE"
    type: "int"
    roles: ["control"]
    precision: 0
    ui_precision: 0
    range:
      min: -24
      max: 24
      default: 0
    presentation:
      tab: "MAIN"
      group: "TUNING"
      order: 1
      ui:
        component: "knob"
        variant: "B"
        attachments:
          - type: "label"
            position: "top"
          - type: "display"
            position: "bottom"
            format:
              mode: "number"
              decimals: 0
              suffix: " st"

  - id: "bendrange"
    label: "BEND RANGE"
    type: "int"
    roles: ["control", "mod_target"]
    precision: 0
    ui_precision: 0
    range:
      min: 0
      max: 24
      default: 2
    presentation:
      tab: "MAIN"
      group: "TUNING"
      order: 2
      ui:
        component: "knob"
        variant: "B"
        attachments:
          - type: "label"
            position: "top"
          - type: "display"
            position: "bottom"
            format:
              mode: "number"
              decimals: 0
              suffix: " st"

  # MAIN – EXPRESSION
  - id: "modwheel"
    label: "MODULATION"
    type: "float"
    roles: ["control", "stream", "output"]
    precision: 8
    ui_precision: 2
    range:
      min: 0.0
      max: 1.0
      default: 0.0
    presentation:
      tab: "MAIN"
      group: "EXPRESSION"
      order: 1
      ui:
        component: "slider_h"
        variant: "B"
        attachments:
          - type: "label"
            position: "top"
          - type: "led"
            position: "top"
            role: "activity"
          - type: "display"
            position: "bottom"
            format:
              mode: "number"
              decimals: 2
              suffix: ""

  - id: "glidetime"
    label: "GLIDE"
    type: "float"
    roles: ["control", "mod_target"]
    precision: 4
    ui_precision: 1
    unit: "s"
    range:
      min: 0.0
      max: 10.0
      default: 0.0
    presentation:
      tab: "MAIN"
      group: "EXPRESSION"
      order: 2
      ui:
        component: "knob"
        variant: "B"
        attachments:
          - type: "label"
            position: "top"
          - type: "display"
            position: "bottom"
            format:
              mode: "number"
              decimals: 1
              suffix: " s"

  # PATCHING – IO METERS (sin jacks en frontal)
  - id: "pitchout"
    label: "PITCH CV"
    type: "cv"
    roles: ["output", "stream", "telemetry"]
    precision: 12
    ui_precision: 3
    unit: "V"
    range:
      min: -10.0
      max: 10.0
      default: 0.0
    presentation:
      tab: "PATCHING"
      group: "OUTPUTS"
      order: 1
      ui:
        component: "meter"
        variant: "A"
        attachments:
          - type: "label"
            position: "top"
          - type: "led"
            position: "right"
            role: "activity"
          - type: "display"
            position: "bottom"
            format:
              mode: "number"
              decimals: 2
              suffix: " V"

  - id: "gateout"
    label: "GATE"
    type: "bool"
    roles: ["output", "stream", "telemetry"]
    precision: 1
    ui_precision: 0
    range:
      min: 0
      max: 1
      default: 0
    presentation:
      tab: "PATCHING"
      group: "OUTPUTS"
      order: 2
      ui:
        component: "meter"
        variant: "A"
        attachments:
          - type: "label"
            position: "top"
          - type: "led"
            position: "right"
            role: "activity"
          - type: "display"
            position: "bottom"
            format:
              mode: "number"
              decimals: 0
              suffix: ""
He migrado el 5.2 original a:

version: "6.0.0".

[ ] VEM-972 Control Cells en MAIN (midichan, transpose, bendrange, modwheel, glidetime) con component/attachments Era 6.

[ ] VEM-973 IO Meters en PATCHING (pitchout CV y gateout bool) con component: "meter" y patrón de label+led+display.

[ ] VEM-974 ¿Quieres que también te escriba un pequeño diff conceptual (antes/después) para cada uno, para que puedas aplicar la misma transformación a otros manifests sin mirarlos tan de cerca?

[ ] VEM-975 Hay tres cosas grandes que deberíamos tener muy presentes si el editor de manifiestos va a convivir y afectar directamente a OMEGA.

1) El editor como “front-end” del contrato Era 6
Lo que el editor permita o no permita es, en la práctica, el subset de schema que realmente va a existir en producción.

[ ] VEM-976 Si el editor no entiende attachments, component: "meter", roles: ["stream","telemetry"], esos patrones tenderán a desaparecer o romperse, aunque estén en la spec.

[ ] VEM-977 Conviene que el editor trabaje exactamente con la misma estructura que consume SchemaStore/ModuleRenderer (layout + registry + presentation.ui).

[ ] VEM-978 Implicación concreta
El editor no debería tener “campos sueltos” tipo ui component, ni conceptos propios; debe editar el árbol Era 6 tal cual (id, type, roles, range, presentation.ui.component/variant/attachments…).

2) Validación fuerte y alineada con AceCatalog / runtime
AceCatalog ya parsea manifests y deriva parameters, ports, telemetry a partir de type y roles.

[ ] VEM-979 El editor debe usar las mismas reglas de validación que AceCatalog, no otra copia: si allí algo es inválido, aquí también.

[ ] VEM-980 Implicación concreta
Reglas mínimas en el editor:

type compatible con roles (p.ej. audio siempre con stream, IO siempre con input/output).

component compatible con type (no permitir meter en una string, etc.).

[ ] VEM-981 Rango coherente (min < max, default dentro del rango).

[ ] VEM-982 Idealmente, el editor delega validación a un pequeño “schema-engine” compartido (o genera el mismo JSON schema que usa AceCatalog).

3) Conciencia de UI real (preview/round‑trip con ModuleRenderer)
ModuleRenderer ya interpreta registry + presentation para pintar Control Cells e IO Meters en OMEGA.

[ ] VEM-983 Si el editor no tiene feedback visual, es muy fácil crear manifests “válidos” pero con layouts absurdos.

[ ] VEM-984 Implicación concreta
El editor debería poder:

[ ] VEM-985 Cargar un manifest y renderizar un preview con el mismo ModuleRenderer que usa la WebUI, aunque sea en modo embebido.

[ ] VEM-986 Editar propiedades y ver inmediatamente cómo cambia la cell: cambiar component de knob a slider_v, añadir un attachment: led, cambiar tab/group.

[ ] VEM-987 Idealmente, el editor y la WebUI comparten el mismo renderer (o al menos los mismos componentes React/TS que implementan Control Cells e IO Meters).

[ ] VEM-988 Si tuviera que priorizar para no complicarte la vida: ¿qué prefieres que ataquemos antes para el editor, el modelo de datos interno (cómo representas registry/presentation en la UI) o la parte de preview en vivo con el mismo ModuleRenderer de OMEGA?


[ ] VEM-989 La clave es tener un modelo de datos único, muy cercano al YAML, pero ya “resuelto” para la UI.

1) Tipos base en el editor
ts
type ValueType = 'int' | 'float' | 'bool' | 'string' | 'list' | 'audio' | 'cv' | 'midi';

type Role =
  | 'control'
  | 'mod_target'
  | 'input'
  | 'output'
  | 'stream'
  | 'telemetry'
  | 'expert';

type UiComponent =
  | 'knob'
  | 'slider_v'
  | 'slider_h'
  | 'list'
  | 'toggle'
  | 'button'
  | 'meter';

type UiVariant = 'A' | 'B' | 'C';

type AttachmentType = 'label' | 'display' | 'led';

type AttachmentPosition = 'top' | 'bottom' | 'left' | 'right';

interface AttachmentFormat {
  mode?: 'number' | 'text';
  decimals?: number;
  suffix?: string;
}

interface UiAttachment {
  type: AttachmentType;
  position?: AttachmentPosition;
  role?: string;          // p.ej. "activity"
  format?: AttachmentFormat;
}

interface UiPresentation {
  component: UiComponent;
  variant?: UiVariant;
  attachments?: UiAttachment[];
}

interface RangeDef {
  min?: number;
  max?: number;
  default?: number;
}

interface RegistryEntity {
  id: string;
  label?: string;
  type: ValueType;
  roles: Role[];
  unit?: string;
  precision?: number;
  ui_precision?: number;
  range?: RangeDef;
  options?: { value: number | string; label: string }[];

  presentation: {
    tab: string;
    group?: string;
    order?: number;
    ui: UiPresentation;
  };
}

interface ModuleManifest {
  id: string;
  name: string;
  family: string;
  engine: string;
  modelId: string;
  version: string;
  status: 'active' | 'draft';
  description?: string;
  layout?: {
    hp?: number;
    rack?: 'upper' | 'lower';
    columns?: number;
  };
  registry: RegistryEntity[];
}
Esto es básicamente el YAML Era 6 en TS, sin inventar estructuras nuevas.

2) Modelo “enriquecido” para la UI del editor
Para que el editor sea cómodo, puedes envolver RegistryEntity en un nodo con metadatos de UI:

ts
interface EditorEntityNode {
  id: string;                 // alias de entity.id
  entity: RegistryEntity;
  errors: string[];
  warnings: string[];
  // Posición en el editor (no en el rack)
  uiState: {
    isSelected: boolean;
    isDirty: boolean;
    // por si quieres drag & drop en un grid
    row?: number;
    column?: number;
  };
}

interface EditorManifestModel {
  manifest: ModuleManifest;
  entitiesById: Map<string, EditorEntityNode>;
  // índices para navegación rápida
  tabs: Map<
    string, // tab name
    {
      groups: Map<
        string, // group name
        EditorEntityNode[]
      >;
    }
  >;
}
La fuente de verdad sigue siendo manifest.registry; entitiesById y tabs son índices derivados para la UI.

errors/warnings se rellenan con la misma lógica de validación que usaría AceCatalog (tipo/roles/range/component coherentes).

3) Flujo típico en el editor
Cargas YAML → parse a ModuleManifest.

[ ] VEM-990 Construyes EditorManifestModel:

[ ] VEM-991 Creas EditorEntityNode por cada entrada del registry.

[ ] VEM-992 Rellenas tabs agrupando por presentation.tab y presentation.group.

[ ] VEM-993 La UI del editor trabaja siempre sobre EditorManifestModel:

[ ] VEM-994 Listas por pestaña/grupo basadas en los índices.

[ ] VEM-995 Formularios que editan entity (no copias).

[ ] VEM-996 Al guardar:

[ ] VEM-997 Serializas de vuelta EditorManifestModel.manifest → YAML.

[ ] VEM-998 Con esto, el editor y OMEGA comparten exactamente el mismo modelo de registry/presentation, y sólo añades una capa fina EditorEntityNode para selección, errores y organización interna.

[ ] VEM-999 ¿Quieres que baje un nivel más y proponga cómo se vería el formulario de edición de una RegistryEntity (secciones para tipo/roles, rango, UI, attachments) usando este modelo?

[ ] VEM-1000 Una RegistryEntity pide un formulario seccionado en 4 bloques: identidad, semántica, rango y UI.

1) Identidad básica
Campos:

[ ] VEM-1001 ID (read‑only o editable con validación única): entity.id.

[ ] VEM-1002 Label: entity.label.

[ ] VEM-1003 Descripción corta opcional (si decides añadirla a futuro).

[ ] VEM-1004 Controles:

[ ] VEM-1005 Text input para id.

[ ] VEM-1006 Text input para label.

[ ] VEM-1007 Validación rápida:

[ ] VEM-1008 ID no vacío, sin espacios, único en el manifest.

2) Semántica: tipo, roles, unidad
Campos:

[ ] VEM-1009 Tipo: entity.type (select con opciones ValueType).

[ ] VEM-1010 Roles: entity.roles (multi‑select con chips: control, mod_target, input, output, stream, telemetry, expert).

[ ] VEM-1011 Unidad: entity.unit (text input, opcional).

[ ] VEM-1012 Precisión DSP: entity.precision.

[ ] VEM-1013 Precisión UI: entity.ui_precision.

[ ] VEM-1014 Extras de validación:

[ ] VEM-1015 Si type es audio/cv/midi, sugerir roles que incluyan stream y input/output.

[ ] VEM-1016 Si incluye control, type debe ser escalar (int/float/bool/string/list).

3) Rango y opciones
Si type es numérico (int/float):

[ ] VEM-1017 Min: entity.range.min.

[ ] VEM-1018 Max: entity.range.max.

[ ] VEM-1019 Default: entity.range.default.

[ ] VEM-1020 Si type es list:

[ ] VEM-1021 Tabla editable para entity.options: filas { value, label }.

[ ] VEM-1022 Validación:

min < max, default dentro de [min, max].

[ ] VEM-1023 Para list, value únicos.

4) Presentación: tab / group / orden
Campos:

[ ] VEM-1024 Tab: entity.presentation.tab (select o free text + autosuggest).

[ ] VEM-1025 Group: entity.presentation.group.

[ ] VEM-1026 Order: entity.presentation.order (número).

[ ] VEM-1027 Esto alimenta directamente los índices de tabs/grupos y el orden de render en OMEGA.

5) UI principal (component / variant)
Campos:

[ ] VEM-1028 Component: entity.presentation.ui.component (select: knob, slider_v, slider_h, list, toggle, button, meter).

[ ] VEM-1029 Variant: entity.presentation.ui.variant (select: A, B, C).

[ ] VEM-1030 Ayudas:

[ ] VEM-1031 Si roles incluye input/output y stream/telemetry, sugerir component: "meter".

[ ] VEM-1032 Si type es bool, sugerir toggle.

6) Attachments (label / display / led)
Editor de lista:

[ ] VEM-1033 Lista de attachments con tipo, posición y propiedades extra.

[ ] VEM-1034 Para cada attachment:

[ ] VEM-1035 Tipo: type (label, display, led).

[ ] VEM-1036 Posición: position (top, bottom, left, right).

[ ] VEM-1037 Role (solo leds): role (p.ej. activity).

[ ] VEM-1038 Format (solo displays):

[ ] VEM-1039 Mode: mode (number / text).

[ ] VEM-1040 Decimales: decimals.

[ ] VEM-1041 Sufijo: suffix (p.ej. Hz, dB, V).

[ ] VEM-1042 Interacciones típicas:

[ ] VEM-1043 Botón “Añadir label top” → crea { type: 'label', position: 'top' }.

[ ] VEM-1044 Botón “Añadir display bottom” → crea { type: 'display', position: 'bottom', format: { mode: 'number', decimals: ui_precision, suffix: unit } }.

[ ] VEM-1045 Botón “Añadir led activity right” → { type: 'led', position: 'right', role: 'activity' }.

[ ] VEM-1046 Con este formulario:

[ ] VEM-1047 Todo lo que editas es directamente RegistryEntity, sin adaptadores raros.

[ ] VEM-1048 El editor puede renderizar un preview de Control Cell / IO Meter consumiendo este mismo objeto, igual que hace OMEGA.

[ ] VEM-1049 ¿Te interesaría que el siguiente paso sea diseñar la estructura de “plantillas” de entidad (presets de RegistryEntity tipo knob estándar, meter de salida, etc.) que el editor pueda insertar con un clic?


[ ] VEM-1050 Tendría sentido definir unas pocas “plantillas canónicas” parametrizables.

1) Tipo de dato para plantilla
ts
type EntityTemplateId =
  | 'control-knob'
  | 'control-slider-v'
  | 'control-toggle'
  | 'io-meter-audio-out'
  | 'io-meter-audio-in'
  | 'io-meter-cv-out'
  | 'io-meter-cv-in'
  | 'io-meter-midi-in';

interface EntityTemplate {
  id: EntityTemplateId;
  label: string;             // nombre en el editor
  description: string;
  defaults: Partial<RegistryEntity>;
}
El editor ofrecería un menú “Añadir desde plantilla” que crea un RegistryEntity fusionando defaults con un ID/label concretos.

2) Ejemplos de plantillas
Control básico – knob
ts
const CONTROL_KNOB_TEMPLATE: EntityTemplate = {
  id: 'control-knob',
  label: 'Control (Knob)',
  description: 'Parámetro escalar con knob y display numérico.',
  defaults: {
    type: 'float',
    roles: ['control'],
    precision: 4,
    ui_precision: 2,
    range: { min: 0, max: 1, default: 0 },
    presentation: {
      tab: 'MAIN',
      group: 'CONTROL',
      order: 0,
      ui: {
        component: 'knob',
        variant: 'C',
        attachments: [
          { type: 'label', position: 'top' },
          {
            type: 'display',
            position: 'bottom',
            format: { mode: 'number', decimals: 2, suffix: '' },
          },
        ],
      },
    },
  },
};
Control – slider vertical
ts
const CONTROL_SLIDER_V_TEMPLATE: EntityTemplate = {
  id: 'control-slider-v',
  label: 'Control (Slider V)',
  description: 'Parámetro escalar con slider vertical tipo mixer.',
  defaults: {
    type: 'float',
    roles: ['control'],
    precision: 4,
    ui_precision: 2,
    range: { min: 0, max: 1, default: 0 },
    presentation: {
      tab: 'MAIN',
      group: 'MIXER',
      order: 0,
      ui: {
        component: 'slider_v',
        variant: 'B',
        attachments: [
          { type: 'label', position: 'top' },
          {
            type: 'display',
            position: 'bottom',
            format: { mode: 'number', decimals: 2, suffix: '' },
          },
        ],
      },
    },
  },
};
IO Meter – audio OUT
ts
const IO_METER_AUDIO_OUT_TEMPLATE: EntityTemplate = {
  id: 'io-meter-audio-out',
  label: 'IO Meter (Audio OUT)',
  description: 'Salida de audio con medidor, LED y display.',
  defaults: {
    type: 'audio',
    roles: ['output', 'stream', 'telemetry'],
    precision: 4,
    ui_precision: 2,
    range: { min: -1.0, max: 1.0, default: 0.0 },
    presentation: {
      tab: 'PATCHING',
      group: 'OUTPUTS',
      order: 0,
      ui: {
        component: 'meter',
        variant: 'A',
        attachments: [
          { type: 'label', position: 'top' },
          { type: 'led', position: 'right', role: 'activity' },
          {
            type: 'display',
            position: 'bottom',
            format: { mode: 'number', decimals: 2, suffix: '' },
          },
        ],
      },
    },
  },
};
IO Meter – CV IN
ts
const IO_METER_CV_IN_TEMPLATE: EntityTemplate = {
  id: 'io-meter-cv-in',
  label: 'IO Meter (CV IN)',
  description: 'Entrada de CV -10..10 V con medidor y display en voltios.',
  defaults: {
    type: 'cv',
    roles: ['input', 'stream', 'telemetry'],
    precision: 4,
    ui_precision: 1,
    unit: 'V',
    range: { min: -10.0, max: 10.0, default: 0.0 },
    presentation: {
      tab: 'PATCHING',
      group: 'INPUTS',
      order: 0,
      ui: {
        component: 'meter',
        variant: 'A',
        attachments: [
          { type: 'label', position: 'top' },
          { type: 'led', position: 'right', role: 'activity' },
          {
            type: 'display',
            position: 'bottom',
            format: { mode: 'number', decimals: 1, suffix: ' V' },
          },
        ],
      },
    },
  },
};
IO Meter – MIDI IN
ts
const IO_METER_MIDI_IN_TEMPLATE: EntityTemplate = {
  id: 'io-meter-midi-in',
  label: 'IO Meter (MIDI IN)',
  description: 'Entrada MIDI con medidor de tráfico y LED.',
  defaults: {
    type: 'midi',
    roles: ['input', 'stream', 'telemetry'],
    precision: 0,
    ui_precision: 0,
    range: { min: 0.0, max: 1.0, default: 0.0 }, // tráfico normalizado
    presentation: {
      tab: 'PATCHING',
      group: 'INPUTS',
      order: 0,
      ui: {
        component: 'meter',
        variant: 'A',
        attachments: [
          { type: 'label', position: 'top' },
          { type: 'led', position: 'right', role: 'activity' },
          {
            type: 'display',
            position: 'bottom',
            format: { mode: 'number', decimals: 0, suffix: '' },
          },
        ],
      },
    },
  },
};
3) Uso en el editor
Cuando el usuario elige una plantilla:

ts
function createEntityFromTemplate(
  template: EntityTemplate,
  overrides: { id: string; label?: string; tab?: string; group?: string; order?: number }
): RegistryEntity {
  const base = template.defaults;

  return {
    id: overrides.id,
    label: overrides.label ?? base.label ?? overrides.id.toUpperCase(),
    type: base.type!,
    roles: base.roles ?? [],
    unit: base.unit,
    precision: base.precision,
    ui_precision: base.ui_precision,
    range: base.range,
    options: base.options,
    presentation: {
      tab: overrides.tab ?? base.presentation?.tab ?? 'MAIN',
      group: overrides.group ?? base.presentation?.group ?? 'CONTROL',
      order: overrides.order ?? base.presentation?.order ?? 0,
      ui: base.presentation!.ui,
    },
  };
}
Así el editor:

[ ] VEM-1051 Te ahorra repetir siempre la misma configuración de attachments, ranges típicos, roles de IO, etc.

[ ] VEM-1052 Sigue generando RegistryEntity 100% compatibles con OMEGA y el runtime Era 6.

[ ] VEM-1053 ¿Te gustaría que definamos también una plantilla específica para “Control Cell de afinación/tiempo” (ej. Hz, ms, s) con displays ya configurados con sufijos y rangos recomendados?


[ ] VEM-1054 Tiene sentido tener 2–3 plantillas “musicales” listas.

[ ] VEM-1055 Control de afinación (Hz)
ts
const CONTROL_TUNING_HZ_TEMPLATE: EntityTemplate = {
  id: 'control-tuning-hz',
  label: 'Control (Freq Hz)',
  description: 'Parámetro de frecuencia con rango 20–20k Hz.',
  defaults: {
    type: 'float',
    roles: ['control', 'mod_target'],
    unit: 'Hz',
    precision: 4,
    ui_precision: 1,
    range: { min: 20.0, max: 20000.0, default: 1000.0 },
    presentation: {
      tab: 'MAIN',
      group: 'FILTER',
      order: 0,
      ui: {
        component: 'knob',
        variant: 'A',
        attachments: [
          { type: 'label', position: 'top' },
          {
            type: 'display',
            position: 'bottom',
            format: { mode: 'number', decimals: 1, suffix: ' Hz' },
          },
        ],
      },
    },
  },
};
Control de tiempo (ms)
ts
const CONTROL_TIME_MS_TEMPLATE: EntityTemplate = {
  id: 'control-time-ms',
  label: 'Control (Time ms)',
  description: 'Parámetro de tiempo corto en milisegundos.',
  defaults: {
    type: 'float',
    roles: ['control', 'mod_target'],
    unit: 'ms',
    precision: 4,
    ui_precision: 1,
    range: { min: 0.0, max: 2000.0, default: 250.0 },
    presentation: {
      tab: 'MAIN',
      group: 'TIME',
      order: 0,
      ui: {
        component: 'knob',
        variant: 'B',
        attachments: [
          { type: 'label', position: 'top' },
          {
            type: 'display',
            position: 'bottom',
            format: { mode: 'number', decimals: 1, suffix: ' ms' },
          },
        ],
      },
    },
  },
};
Control de tiempo (s)
ts
const CONTROL_TIME_S_TEMPLATE: EntityTemplate = {
  id: 'control-time-s',
  label: 'Control (Time s)',
  description: 'Parámetro de tiempo largo en segundos (p.ej. release).',
  defaults: {
    type: 'float',
    roles: ['control', 'expert'],
    unit: 's',
    precision: 4,
    ui_precision: 2,
    range: { min: 0.0, max: 20.0, default: 1.0 },
    presentation: {
      tab: 'MAIN',
      group: 'ENVELOPE',
      order: 0,
      ui: {
        component: 'knob',
        variant: 'B',
        attachments: [
          { type: 'label', position: 'top' },
          {
            type: 'display',
            position: 'bottom',
            format: { mode: 'number', decimals: 2, suffix: ' s' },
          },
        ],
      },
    },
  },
};
Estas plantillas encajan con el modelo Era 6 (range, unit, precision, ui_precision, attachments con sufijos correctos) y las puede consumir OMEGA tal cual. ¿Quieres que agrupe todas las plantillas que hemos definido en una sola constante (ENTITY_TEMPLATES) para tener el catálogo completo del editor?


[ ] VEM-1056 Aquí tienes un catálogo compacto listo para usar en el editor.

ts
export const ENTITY_TEMPLATES: EntityTemplate[] = [
  // Controls genéricos
  {
    id: 'control-knob',
    label: 'Control (Knob)',
    description: 'Parámetro escalar con knob y display numérico.',
    defaults: {
      type: 'float',
      roles: ['control'],
      precision: 4,
      ui_precision: 2,
      range: { min: 0, max: 1, default: 0 },
      presentation: {
        tab: 'MAIN',
        group: 'CONTROL',
        order: 0,
        ui: {
          component: 'knob',
          variant: 'C',
          attachments: [
            { type: 'label', position: 'top' },
            {
              type: 'display',
              position: 'bottom',
              format: { mode: 'number', decimals: 2, suffix: '' },
            },
          ],
        },
      },
    },
  },
  {
    id: 'control-slider-v',
    label: 'Control (Slider V)',
    description: 'Parámetro escalar con slider vertical tipo mixer.',
    defaults: {
      type: 'float',
      roles: ['control'],
      precision: 4,
      ui_precision: 2,
      range: { min: 0, max: 1, default: 0 },
      presentation: {
        tab: 'MAIN',
        group: 'MIXER',
        order: 0,
        ui: {
          component: 'slider_v',
          variant: 'B',
          attachments: [
            { type: 'label', position: 'top' },
            {
              type: 'display',
              position: 'bottom',
              format: { mode: 'number', decimals: 2, suffix: '' },
            },
          ],
        },
      },
    },
  },

  // Control “musical” – afinación / tiempo
  {
    id: 'control-tuning-hz',
    label: 'Control (Freq Hz)',
    description: 'Parámetro de frecuencia con rango 20–20k Hz.',
    defaults: {
      type: 'float',
      roles: ['control', 'mod_target'],
      unit: 'Hz',
      precision: 4,
      ui_precision: 1,
      range: { min: 20.0, max: 20000.0, default: 1000.0 },
      presentation: {
        tab: 'MAIN',
        group: 'FILTER',
        order: 0,
        ui: {
          component: 'knob',
          variant: 'A',
          attachments: [
            { type: 'label', position: 'top' },
            {
              type: 'display',
              position: 'bottom',
              format: { mode: 'number', decimals: 1, suffix: ' Hz' },
            },
          ],
        },
      },
    },
  },
  {
    id: 'control-time-ms',
    label: 'Control (Time ms)',
    description: 'Parámetro de tiempo corto en milisegundos.',
    defaults: {
      type: 'float',
      roles: ['control', 'mod_target'],
      unit: 'ms',
      precision: 4,
      ui_precision: 1,
      range: { min: 0.0, max: 2000.0, default: 250.0 },
      presentation: {
        tab: 'MAIN',
        group: 'TIME',
        order: 0,
        ui: {
          component: 'knob',
          variant: 'B',
          attachments: [
            { type: 'label', position: 'top' },
            {
              type: 'display',
              position: 'bottom',
              format: { mode: 'number', decimals: 1, suffix: ' ms' },
            },
          ],
        },
      },
    },
  },
  {
    id: 'control-time-s',
    label: 'Control (Time s)',
    description: 'Parámetro de tiempo largo en segundos.',
    defaults: {
      type: 'float',
      roles: ['control', 'expert'],
      unit: 's',
      precision: 4,
      ui_precision: 2,
      range: { min: 0.0, max: 20.0, default: 1.0 },
      presentation: {
        tab: 'MAIN',
        group: 'ENVELOPE',
        order: 0,
        ui: {
          component: 'knob',
          variant: 'B',
          attachments: [
            { type: 'label', position: 'top' },
            {
              type: 'display',
              position: 'bottom',
              format: { mode: 'number', decimals: 2, suffix: ' s' },
            },
          ],
        },
      },
    },
  },

  // IO Meters
  {
    id: 'io-meter-audio-out',
    label: 'IO Meter (Audio OUT)',
    description: 'Salida de audio con medidor, LED y display.',
    defaults: {
      type: 'audio',
      roles: ['output', 'stream', 'telemetry'],
      precision: 4,
      ui_precision: 2,
      range: { min: -1.0, max: 1.0, default: 0.0 },
      presentation: {
        tab: 'PATCHING',
        group: 'OUTPUTS',
        order: 0,
        ui: {
          component: 'meter',
          variant: 'A',
          attachments: [
            { type: 'label', position: 'top' },
            { type: 'led', position: 'right', role: 'activity' },
            {
              type: 'display',
              position: 'bottom',
              format: { mode: 'number', decimals: 2, suffix: '' },
            },
          ],
        },
      },
    },
  },
  {
    id: 'io-meter-audio-in',
    label: 'IO Meter (Audio IN)',
    description: 'Entrada de audio con medidor, LED y display.',
    defaults: {
      type: 'audio',
      roles: ['input', 'stream', 'telemetry'],
      precision: 4,
      ui_precision: 2,
      range: { min: -1.0, max: 1.0, default: 0.0 },
      presentation: {
        tab: 'PATCHING',
        group: 'INPUTS',
        order: 0,
        ui: {
          component: 'meter',
          variant: 'A',
          attachments: [
            { type: 'label', position: 'top' },
            { type: 'led', position: 'right', role: 'activity' },
            {
              type: 'display',
              position: 'bottom',
              format: { mode: 'number', decimals: 2, suffix: '' },
            },
          ],
        },
      },
    },
  },
  {
    id: 'io-meter-cv-in',
    label: 'IO Meter (CV IN)',
    description: 'Entrada de CV -10..10 V con medidor y display.',
    defaults: {
      type: 'cv',
      roles: ['input', 'stream', 'telemetry'],
      unit: 'V',
      precision: 4,
      ui_precision: 1,
      range: { min: -10.0, max: 10.0, default: 0.0 },
      presentation: {
        tab: 'PATCHING',
        group: 'INPUTS',
        order: 0,
        ui: {
          component: 'meter',
          variant: 'A',
          attachments: [
            { type: 'label', position: 'top' },
            { type: 'led', position: 'right', role: 'activity' },
            {
              type: 'display',
              position: 'bottom',
              format: { mode: 'number', decimals: 1, suffix: ' V' },
            },
          ],
        },
      },
    },
  },
  {
    id: 'io-meter-cv-out',
    label: 'IO Meter (CV OUT)',
    description: 'Salida de CV -10..10 V con medidor y display.',
    defaults: {
      type: 'cv',
      roles: ['output', 'stream', 'telemetry'],
      unit: 'V',
      precision: 4,
      ui_precision: 1,
      range: { min: -10.0, max: 10.0, default: 0.0 },
      presentation: {
        tab: 'PATCHING',
        group: 'OUTPUTS',
        order: 0,
        ui: {
          component: 'meter',
          variant: 'A',
          attachments: [
            { type: 'label', position: 'top' },
            { type: 'led', position: 'right', role: 'activity' },
            {
              type: 'display',
              position: 'bottom',
              format: { mode: 'number', decimals: 1, suffix: ' V' },
            },
          ],
        },
      },
    },
  },
  {
    id: 'io-meter-midi-in',
    label: 'IO Meter (MIDI IN)',
    description: 'Entrada MIDI con medidor de tráfico y LED.',
    defaults: {
      type: 'midi',
      roles: ['input', 'stream', 'telemetry'],
      precision: 0,
      ui_precision: 0,
      range: { min: 0.0, max: 1.0, default: 0.0 },
      presentation: {
        tab: 'PATCHING',
        group: 'INPUTS',
        order: 0,
        ui: {
          component: 'meter',
          variant: 'A',
          attachments: [
            { type: 'label', position: 'top' },
            { type: 'led', position: 'right', role: 'activity' },
            {
              type: 'display',
              position: 'bottom',
              format: { mode: 'number', decimals: 0, suffix: '' },
            },
          ],
        },
      },
    },
  },
];
Con esto el editor ya tiene un catálogo de plantillas alineado con el schema Era 6 y los patrones de Control Cells/IO Meters que usa OMEGA. ¿Quieres que el próximo paso sea definir cómo se mostraría este catálogo en la UI (p. ej. panel lateral con categorías “Control” / “IO” / “Musical”)?


[ ] VEM-1057 Lo más directo es un panel lateral con categorías y fichas de plantilla.

1) Agrupar plantillas en categorías
A nivel de código:

ts
type TemplateCategoryId = 'control' | 'musical' | 'io';

interface TemplateCategory {
  id: TemplateCategoryId;
  label: string;
  templates: EntityTemplateId[];
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'control',
    label: 'Controls',
    templates: ['control-knob', 'control-slider-v'],
  },
  {
    id: 'musical',
    label: 'Musical',
    templates: ['control-tuning-hz', 'control-time-ms', 'control-time-s'],
  },
  {
    id: 'io',
    label: 'IO Meters',
    templates: [
      'io-meter-audio-in',
      'io-meter-audio-out',
      'io-meter-cv-in',
      'io-meter-cv-out',
      'io-meter-midi-in',
    ],
  },
];
El panel busca cada EntityTemplate por id en ENTITY_TEMPLATES y lo muestra bajo su categoría.

2) Estructura del panel lateral
Layout textual:

text
+--------------------------------------+
| Templates                            |
+--------------------------------------+
| Controls                             |
|  [Control (Knob)]          (+ Add)   |
|  [Control (Slider V)]      (+ Add)   |
|                                      |
| Musical                              |
|  [Control (Freq Hz)]       (+ Add)   |
|  [Control (Time ms)]       (+ Add)   |
|  [Control (Time s)]        (+ Add)   |
|                                      |
| IO Meters                            |
|  [Audio IN Meter]          (+ Add)   |
|  [Audio OUT Meter]         (+ Add)   |
|  [CV IN Meter]             (+ Add)   |
|  [CV OUT Meter]            (+ Add)   |
|  [MIDI IN Meter]           (+ Add)   |
+--------------------------------------+
Cada ficha:

[ ] VEM-1058 Muestra template.label.

[ ] VEM-1059 Tooltip o texto pequeño con description.

[ ] VEM-1060 Botón “+ Add” que abre un pequeño diálogo pidiendo al menos id y label (y opcionalmente tab/group).

3) Acción “Add from template”
Cuando el usuario pulsa “+ Add” en una ficha:

[ ] VEM-1061 Se muestra un diálogo mínimo:

[ ] VEM-1062 ID (obligatorio).

[ ] VEM-1063 Label (opcional, pre-rellenado con el label del template).

[ ] VEM-1064 Tab (default: MAIN o PATCHING según template.defaults.presentation.tab).

[ ] VEM-1065 Group (default: del template).

[ ] VEM-1066 Al confirmar, llamas a createEntityFromTemplate(template, overrides) y añades el RegistryEntity resultante al manifest.registry y al modelo EditorManifestModel.

[ ] VEM-1067 Esto mantiene al editor muy simple pero totalmente alineado con el schema Era 6 y con los patrones que OMEGA espera.

[ ] VEM-1068 ¿Quieres que el siguiente paso sea pensar en cómo sincronizar en caliente este editor con una instancia en ejecución de OMEGA (reload de manifests / AceCatalog) para ver cambios al vuelo?


[ ] VEM-1069 Lo ideal es un bucle muy corto: editar → guardar → AceCatalog recarga → WebUI se rehidrata.

1) Contrato de recarga en el backend
Necesitas dos piezas claras en OMEGA:

[ ] VEM-1070 Un comando RPC para recargar manifests desde disco, p.ej. COMMAND: RELOAD_MANIFESTS o RELOAD_MODULE <id>.

[ ] VEM-1071 AceCatalog debe:

[ ] VEM-1072 Volver a escanear Resources/modules.

[ ] VEM-1073 Reemplazar en caliente la entrada del módulo (sin tumbar el motor).

[ ] VEM-1074 Notificar a SemanticBroker / UiBridge de que hay nuevo catálogo (o que un componente concreto ha cambiado).

[ ] VEM-1075 Puedes colgarlo del RpcSystemController o de un nuevo RpcMetadataController nominal.

2) Flujo en el editor
Cuando guardas desde el editor:

[ ] VEM-1076 Serializas el ModuleManifest a YAML y lo escribes en la ruta de Resources/modules (la misma que escanea AceCatalog).

[ ] VEM-1077 Llamas vía bridge (desde la WebUI o una herramienta lateral) a un comando, por ejemplo:

json
{
  "type": "COMMAND",
  "target": "system.reloadManifest",
  "payload": { "moduleId": "oscva" }
}
El backend:

[ ] VEM-1078 Recarga ese manifest en AceCatalog.

[ ] VEM-1079 Reconstruye el descriptor del módulo.

[ ] VEM-1080 Emite una notificación hacia la UI, algo tipo:

json
{
  "type": "MANIFESTCHANGE",
  "target": "oscva"
}
3) Reacción en la WebUI / ModuleRenderer
Cuando la WebUI recibe MANIFESTCHANGE:

[ ] VEM-1081 Actualiza su cache de metadatos (lo que hoy te da SemanticBroker/AceCatalog).

[ ] VEM-1082 Fuerza un re-render del módulo afectado:

[ ] VEM-1083 Vuelve a llamar al renderer genérico para ese moduleInstanceId, usando el nuevo registry/presentation.

[ ] VEM-1084 Mantiene el estado (params, telemetry) tal como viene del motor; solo cambia layout y Control Cells.

[ ] VEM-1085 Esto encaja bien con la Era 6 (schema estático vs state dinámico).

4) Integración con el editor visual
Puedes hacer que el editor tenga dos modos:

[ ] VEM-1086 Modo “offline”: edita YAML sin tocar una instancia en ejecución.

[ ] VEM-1087 Modo “live”: al pulsar “Apply to running OMEGA”:

[ ] VEM-1088 Guarda el YAML.

[ ] VEM-1089 Dispara el comando reloadManifest al plugin host.

[ ] VEM-1090 Escucha el evento MANIFESTCHANGE para confirmar que el módulo se ha actualizado.

[ ] VEM-1091 En modo live, si tienes el preview del módulo incrustado (el mismo ModuleRenderer que la WebUI), verás el cambio tanto en el editor como en la instancia real.

5) Consideraciones de seguridad y estabilidad
No permitas recarga mientras el motor está en un estado crítico (p.ej. renderizando un test automatizado), o serialízalo desde el thread de mensaje para evitar race conditions.

[ ] VEM-1092 Si el nuevo manifest no pasa validación AceCatalog, el comando reloadManifest debe devolver error y la UI del editor mostrarlo (no sobreescribir el manifest activo con algo roto).

[ ] VEM-1093 ¿Te gustaría que detallemos la forma concreta del comando RPC reloadManifest (nombre, payload, respuestas) para implementarlo en OmegaUiBridge y el dispatcher?


[ ] VEM-1094 La forma más coherente con la Era 6 es un comando nominal sencillo.

1) Comando RPC propuesto
Nombre nominal:

system.reloadManifest (dominio system).

[ ] VEM-1095 Payload:

json
{
  "type": "COMMAND",
  "target": "system.reloadManifest",
  "payload": {
    "moduleId": "oscva"   // id del manifest/module
  },
  "requestId": "uuid-optional"
}
moduleId es el id del manifest (p.ej. oscva, midi2cv).

[ ] VEM-1096 Respuesta OK:

json
{
  "type": "RESPONSE",
  "requestId": "uuid-optional",
  "error": null,
  "payload": {
    "status": "ok",
    "reloaded": "oscva",
    "version": "6.0.0"
  }
}
Respuesta error (YAML roto, validación AceCatalog fallida):

json
{
  "type": "RESPONSE",
  "requestId": "uuid-optional",
  "error": {
    "code": "MANIFEST_INVALID",
    "message": "Failed to parse oscva.yaml: missing registry field."
  },
  "payload": null
}
2) Implementación en RpcSystemController
En C++:

cpp
// RpcSystemController.cpp (pseudo)
void RpcSystemController::registerCommands(RpcCommandDispatcher& dispatcher) {
    dispatcher.registerHandler("system.reloadManifest",
        [this](const juce::var& payload) { return this->handleReloadManifest(payload); });
}

juce::var RpcSystemController::handleReloadManifest(const juce::var& payload) {
    const auto* obj = payload.getDynamicObject();
    if (obj == nullptr) {
        return makeError("MANIFEST_INVALID_PAYLOAD", "Payload must be an object.");
    }

    const juce::String moduleId = obj->getProperty("moduleId").toString();
    if (moduleId.isEmpty()) {
        return makeError("MANIFEST_INVALID_PAYLOAD", "Missing moduleId.");
    }

    bool ok = AceCatalog::getInstance().reloadComponent(moduleId.toStdString());
    if (!ok) {
        return makeError("MANIFEST_INVALID", "Failed to reload manifest: " + moduleId);
    }

    // Notificar a SemanticBroker / UiBridge que el catálogo ha cambiado
    SemanticBrokerService::getInstance().refreshInventory();
    notifyManifestChanged(moduleId);

    juce::DynamicObject* out = new juce::DynamicObject();
    out->setProperty("status", "ok");
    out->setProperty("reloaded", moduleId);
    out->setProperty("version", 6); // o leer de AceCatalog
    return juce::var(out);
}
notifyManifestChanged podría emitir un evento:

json
{
  "type": "MANIFESTCHANGE",
  "target": "oscva"
}
que la WebUI y el editor escuchan.

3) Uso desde el editor
Tras guardar el YAML:

ts
async function applyToRunningOmega(moduleId: string) {
  const cmd = {
    type: 'COMMAND',
    target: 'system.reloadManifest',
    payload: { moduleId },
    requestId: crypto.randomUUID(),
  };

  const res = await omegaBridge.sendCommand(cmd); // tu wrapper actual
  if (res.error) {
    showError(res.error.message);
  } else {
    showToast(`Manifest ${moduleId} reloaded`);
  }
}
Con esto cierras el ciclo editor ↔ OMEGA sin añadir nada raro al contrato Era 6.

[ ] VEM-1097 ¿Quieres que pensemos ahora en una pequeña convención para nombrar los ficheros (oscva.yaml, midi2cv.yaml) para que el editor pueda mapear moduleId ↔ filePath sin heurísticas frágiles?


[ ] VEM-1098 Lo más robusto es fijar una convención 1:1 simple y declararla en la spec.

1) Convención propuesta id ↔ filename
Cada manifest vive en Resources/modules/<id>.yaml.

oscva → Resources/modules/oscva.yaml.

midi2cv → Resources/modules/midi2cv.yaml.

midi_in → Resources/modules/midi_in.yaml.

[ ] VEM-1099 Reglas:

[ ] VEM-1100 El campo manifest.id debe coincidir exactamente con el nombre de archivo (sin extensión).

[ ] VEM-1101 No hay subdirectorios “mágicos” por familia/engine; si quieres agrupar, mejor añadir metadatos (family, tags) y dejar el path plano.

[ ] VEM-1102 Esto hace trivial el mapping para el editor y para AceCatalog.

2) Impacto en AceCatalog
En AceCatalog::loadFromModulesDirectory ya escaneas .yaml y sacas id del contenido.

[ ] VEM-1103 Puedes añadir una verificación opcional:

[ ] VEM-1104 Si basename(file) != manifest.id, log de warning o error (según modo).

[ ] VEM-1105 Para el comando reloadComponent(moduleId):

[ ] VEM-1106 Formar directamente la ruta: modulesDir / (moduleId + ".yaml").

[ ] VEM-1107 Evitas buscar por todo el árbol.

3) Uso en el editor
El editor, para abrir/guardar:

[ ] VEM-1108 Sabe el moduleId (campo manifest.id).

[ ] VEM-1109 Construye el path: resourcesRoot/modules/${moduleId}.yaml.

[ ] VEM-1110 No necesita consultas extra al engine para saber “dónde está” el manifest de un módulo.

[ ] VEM-1111 Esto también simplifica el botón “Open in editor” en la WebUI:

[ ] VEM-1112 La WebUI ya conoce el moduleId de cada instancia (vía metadata/descriptor).

[ ] VEM-1113 Puede lanzar el editor con ese moduleId, y el editor sabe exactamente qué archivo tocar.

[ ] VEM-1114 ¿Te gustaría que definamos una pequeña sección en ACE_MODULE_SCHEMA_SPEC_6 explicando esta convención de nombres y el contrato 1:1 id↔filename↔moduleId?


[ ] VEM-1115 Podría ir como una subsección corta de “Identidad del módulo”.

[ ] VEM-1116 X.Y Identidad de manifiestos y convención de nombres
Cada módulo ACE de Era 6 se identifica de forma unívoca mediante el campo id del manifest. Para garantizar un mapeo directo entre el contrato declarativo y el sistema de archivos, se establece la siguiente convención:

[ ] VEM-1117 Cada manifest reside en Resources/modules/<id>.yaml.

[ ] VEM-1118 Ejemplos válidos:

id: "oscva" → Resources/modules/oscva.yaml

id: "midi2cv" → Resources/modules/midi2cv.yaml

id: "midi_in" → Resources/modules/midi_in.yaml

[ ] VEM-1119 Requisitos:

[ ] VEM-1120 El nombre del archivo (sin extensión) debe coincidir exactamente con id.

[ ] VEM-1121 El id debe ser único dentro del catálogo AceCatalog.

[ ] VEM-1122 El id es el mismo valor utilizado por el motor, el SemanticBroker y la WebUI para identificar el módulo (por ejemplo en comandos loadComponent, reloadManifest, etc.).

[ ] VEM-1123 Consecuencias prácticas:

[ ] VEM-1124 La herramienta de edición de manifests puede inferir la ruta a partir de id sin heurísticas adicionales.

[ ] VEM-1125 AceCatalog puede implementar reloadComponent(moduleId) localizando directamente modulesDir/<moduleId>.yaml.

[ ] VEM-1126 Cualquier desincronización (id distinto al nombre de archivo) debe considerarse un error de configuración y ser reportada en tiempo de carga.

[ ] VEM-1127 ¿Te interesa que a continuación definamos también una política breve para la forma del id (snake_case vs kebab-case, prefijos por familia, etc.) para mantener consistencia visual en el editor y en OMEGA?


[ ] VEM-1128 Definir una convención clara para id te ahorra ruido a largo plazo.

[ ] VEM-1129 Política propuesta para id de módulo
Formato:

id en snake_case minúsculas, sin espacios ni caracteres especiales.

[ ] VEM-1130 Permitidos: [a-z0-9_].

[ ] VEM-1131 Longitud recomendada: 3–32 caracteres.

[ ] VEM-1132 Ejemplos:

oscva

midi2cv

midi_in

cv_in_util

[ ] VEM-1133 Reglas opcionales por familia (recomendadas, no obligatorias):

[ ] VEM-1134 Osciladores: prefijo osc (p.ej. osc_va_juno).

[ ] VEM-1135 Filtros: prefijo vcf (vcf_ir3109).

[ ] VEM-1136 Utilidades IO: sufijo _in / _out (midi_in, cv_out).

[ ] VEM-1137 Validación:

[ ] VEM-1138 El editor y AceCatalog deben rechazar ids que no cumplan la regex ^[a-z0-9_]+$ o que colisionen con ids existentes.

[ ] VEM-1139 Impacto:

[ ] VEM-1140 Facilita la lectura de rutas (oscva.yaml, midi2cv.yaml) y llamadas a comandos (system.reloadManifest con moduleId).

[ ] VEM-1141 ¿Quieres que apliquemos esta convención a los ejemplos que ya hemos tocado (oscva, midi2cv, midi_in, cv_in_util) y dejemos esas cuatro entradas como “módulos de referencia” en la documentación?


[ ] VEM-1142 Podemos fijarlos explícitamente como ejemplos oficiales.

[ ] VEM-1143 Módulos de referencia propuestos
oscva – JUNO DCO Oscillator

id: oscva

[ ] VEM-1144 Archivo: Resources/modules/oscva.yaml

[ ] VEM-1145 Familia: oscillator

[ ] VEM-1146 Ejemplo de:

[ ] VEM-1147 Control Cells variadas (knob, slider_v, toggle).

[ ] VEM-1148 IO Meter de salida de audio (vout).

midi2cv – MIDI‑to‑CV Adapter

id: midi2cv

[ ] VEM-1149 Archivo: Resources/modules/midi2cv.yaml

[ ] VEM-1150 Familia: utility

[ ] VEM-1151 Ejemplo de:

[ ] VEM-1152 Control Cells de afinación/expresión (transpose, bendrange, glide).

[ ] VEM-1153 IO Meters de salida CV (pitchout) y gate (gateout).

midi_in – MIDI Input Bridge

id: midi_in

[ ] VEM-1154 Archivo: Resources/modules/midi_in.yaml

[ ] VEM-1155 Familia: io

[ ] VEM-1156 Ejemplo de:

[ ] VEM-1157 LED de actividad global en MAIN (activity).

[ ] VEM-1158 IO Meter de entrada MIDI en PATCHING (mididata).

cv_in_util – CV Input Utility

id: cv_in_util

[ ] VEM-1159 Archivo: Resources/modules/cv_in_util.yaml

[ ] VEM-1160 Familia: io

[ ] VEM-1161 Ejemplo de:

[ ] VEM-1162 IO Meter de entrada de CV -10..10 V con unidad V.

[ ] VEM-1163 Uso de type: "cv" y roles: ["input","stream","telemetry"].

[ ] VEM-1164 Estos cuatro pueden mencionarse en la doc como “Módulos de referencia Era 6” y usarse como presets de diseño tanto en OMEGA como en el editor.

[ ] VEM-1165 ¿Te gustaría que el siguiente paso sea esbozar cómo integrar el editor (aunque sea como app separada) dentro del flujo de desarrollo de OMEGA, por ejemplo con un comando Edit Manifest… en la WebUI que abra directamente el editor apuntando a uno de estos módulos?


[ ] VEM-1166 La integración puede ser muy ligera si tratas al editor como “herramienta externa con puente”.

1) Entrada en la WebUI: “Edit Manifest…”
En el menú contextual de cada módulo (o en el inspector):

[ ] VEM-1167 Opción: Edit Manifest….

[ ] VEM-1168 La WebUI ya conoce:

moduleId (p.ej. oscva).

[ ] VEM-1169 Si hay instancia activa y su índice.

[ ] VEM-1170 Comportamiento al hacer clic:

[ ] VEM-1171 En modo desarrollo, la WebUI llama a una función JS global expuesta por el host (standalone/plugin) o abre una URL del editor con query:

ts
openManifestEditor({ moduleId: 'oscva' });
// o
window.open(`http://localhost:7777/editor?moduleId=oscva`, '_blank');
2) Editor como app separada
Editor web (Next.js, Vite…) corriendo en http://localhost:7777:

[ ] VEM-1172 Al abrir /editor?moduleId=oscva:

[ ] VEM-1173 Resuelve el path Resources/modules/oscva.yaml usando una convención conocida o vía pequeño backend local.

[ ] VEM-1174 Carga el YAML, construye EditorManifestModel y muestra:

[ ] VEM-1175 Panel de entidades (lista por tab/group).

[ ] VEM-1176 Formulario de RegistryEntity.

[ ] VEM-1177 Panel de plantillas (ENTITY_TEMPLATES).

[ ] VEM-1178 Guardado:

“Save” escribe el YAML en disco.

“Save & Apply to OMEGA” escribe y envía el comando RPC system.reloadManifest con moduleId.

3) Bridge entre editor y OMEGA
Opciones:

[ ] VEM-1179 Editor llama directamente al bridge WebSocket/JSON-RPC que ya usa la WebUI (reutilizando OmegaUiBridge), o

[ ] VEM-1180 Un pequeño proxy HTTP local que traduce POST /rpc del editor a JSON-RPC hacia OMEGA.

[ ] VEM-1181 Operaciones mínimas que necesita el editor:

system.reloadManifest (ya definido).

[ ] VEM-1182 Opcional: metadata.getManifest(moduleId) para leer el manifest desde el engine en vez de desde disco, si quieres roundtrip perfecto.

4) Ciclo de trabajo típico
En OMEGA, cargas un preset con oscva.

[ ] VEM-1183 Menú del módulo → Edit Manifest….

[ ] VEM-1184 Se abre el editor en navegador externo, ya apuntando a oscva.

[ ] VEM-1185 Editas registry/presentation, añades un IO Meter, etc.

“Save & Apply to OMEGA”:

[ ] VEM-1186 Escribe oscva.yaml.

[ ] VEM-1187 Lanza system.reloadManifest con moduleId: "oscva".

[ ] VEM-1188 OMEGA recarga el manifest, SemanticBroker refresca inventario, WebUI recibe MANIFESTCHANGE y repinta el módulo con el nuevo layout.

[ ] VEM-1189 Así el editor afecta directamente a OMEGA, pero sigue siendo una app separada, fácil de desarrollar y versionar.

[ ] VEM-1190 ¿Prefieres que el editor se conecte directamente al bridge de OMEGA (JSON-RPC) o te resulta más cómodo meter un proxy HTTP local como capa intermedia?


[ ] VEM-1191 La manera más sólida de tener preview sin divergencias es no duplicar renderer: reutilizar exactamente el de OMEGA, idealmente arrancando el exe con un modo “preview” o “embed”.

1) Opciones de arquitectura para la previsualización
Opción A: Reutilizar el renderer web de OMEGA (recomendable)
OMEGA ya tiene un renderer de módulos 100% declarativo (ModuleRenderer + Control Cells + IO Meters).

[ ] VEM-1192 Lo ideal es extraer ese renderer a un paquete reutilizable (p.ej. @omega/ui-core) y usarlo tanto:

[ ] VEM-1193 En la WebUI embebida del plugin/standalone.

[ ] VEM-1194 En el editor de manifests (como dependencia NPM o paquete local).

[ ] VEM-1195 Ventajas:

[ ] VEM-1196 Cero divergencias: mismo código TS/React para pintar Control Cells/IO Meters.

[ ] VEM-1197 El editor sólo tiene que montar el componente ModuleRenderer pasando un ModuleManifest + “fake state” (o sin state).

[ ] VEM-1198 Inconvenientes:

[ ] VEM-1199 Requiere un mini refactor para aislar el renderer de la parte que habla con el bridge JUCE/WebView.

[x] VEM-1200 Opción B: Arrancar el exe de OMEGA en modo “preview”
El editor lanza el exe de OMEGA con flags tipo:

[x] VEM-1201 OmegaSynth.exe --manifest-preview oscva

[x] VEM-1202 O incluso con un flag que le pase un path de YAML temporal que el editor acaba de guardar.

[x] VEM-1203 OMEGA arranca en modo reducido:

[x] VEM-1204 Carga sólo ese módulo en un rack minimal.

[x] VEM-1205 Ignora audio/MIDI, o usa un motor simulado.

[x] VEM-1206 Ventajas:

[x] VEM-1207 La preview es literalmente OMEGA ejecutándose, sin ningún riesgo de desync.

[x] VEM-1208 Inconvenientes:

[x] VEM-1209 Más pesado (abre otra ventana, otro proceso).

[ ] VEM-1210 Menos cómodo para “inline preview” dentro de la app del editor.

2) Cómo se vería la opción A (paquete UI común)
Paso 1: Extraer renderer a paquete compartido
Crear p.ej. ui/core o paquete @omega/module-renderer con:

[ ] VEM-1211 Tipos: ModuleManifest, RegistryEntity, ControlCellProps.

[ ] VEM-1212 Componentes: ModuleRenderer, ControlCell.

[ ] VEM-1213 Lógica de layout (tabs/groups, vertical attachments).

[ ] VEM-1214 En la WebUI actual:

[ ] VEM-1215 En vez de tener el renderer embebido en uimodulemanager.ts, usas el paquete:

ts
import { ModuleRenderer } from '@omega/module-renderer';

<ModuleRenderer manifest={manifestFromEngine} state={runtimeState} />
En el editor:

[ ] VEM-1216 Usas el mismo paquete, pero pasas:

manifest={currentEditorManifest}

state={fakeState} (por ejemplo todos los value en default, sin telemetry).

[ ] VEM-1217 Así el preview es el mismo HTML/CSS que verá el usuario dentro de OMEGA.

[ ] VEM-1218 Paso 2: Cómo alimentar el preview en el editor
En el editor, cuando cambias una RegistryEntity:

[ ] VEM-1219 Actualizas el objeto ModuleManifest en memoria.

[ ] VEM-1220 React vuelve a renderizar <ModuleRenderer manifest={manifest} state={previewState} />.

previewState puede ser muy simple:

ts
type PreviewState = {
  params: Record<string, number | string | boolean>;
  telemetry: Record<string, number>;
};

const previewState: PreviewState = {
  params: Object.fromEntries(
    manifest.registry
      .filter(e => e.type === 'int' || e.type === 'float' || e.type === 'bool')
      .map(e => [e.id, e.range?.default ?? 0])
  ),
  telemetry: {},
};
Con eso ya ves el layout y los componentes correctos; no hace falta audio.

3) Cómo se vería la opción B (exe en modo preview)
Si prefieres no tocar el renderer, puedes:

[ ] VEM-1221 Añadir a OMEGA un modo:

bash
OmegaSynth.exe --preview-manifest oscva
# o
OmegaSynth.exe --preview-file "D:\...\Resources\modules\oscva.yaml"
Comportamiento:

[ ] VEM-1222 Lanza una ventana con un rack minimal que sólo contiene ese módulo.

[ ] VEM-1223 Desactiva audio o usa un motor dummy para que sea “ligero”.

[ ] VEM-1224 La WebUI interna sigue usando el ModuleRenderer existente.

[ ] VEM-1225 El editor:

[ ] VEM-1226 Tras guardar YAML, lanza (o re-lanza) el exe en ese modo.

[ ] VEM-1227 Dejas al usuario ver la ventana de OMEGA como “preview externa”.

[ ] VEM-1228 Compromiso intermedio:

[ ] VEM-1229 Podrías tener ambas cosas: un preview inline con renderer extraído, y un botón “Open in OMEGA…” que abre el exe en modo preview para ver comportamiento real.

4) Evitar duplicación: criterio
Para no terminar con dos UIs divergentes, yo marcaría estas reglas:

[ ] VEM-1230 Regla 1: Nunca re-implementar ControlCell en el editor; siempre usar el componente que usa OMEGA (opción A) o la instancia real de OMEGA (opción B).

[ ] VEM-1231 Regla 2: Los tipos de datos (ModuleManifest, RegistryEntity, presentation.ui) se definen en un sólo sitio (paquete compartido), y tanto la WebUI como el editor los importan.

[ ] VEM-1232 Regla 3: Cualquier cambio en el renderer debe considerarse “breaking” para el editor; idealmente, se desarrolla en tandem (mismo repo / monorepo).

[ ] VEM-1233 Si tienes que elegir un primer paso concreto, ¿te ves más inclinando a extraer el renderer a un paquete TS compartido (opción A) o a probar primero un modo --preview-manifest en el exe (opción B) para validar el flujo sin tocar el código de UI?


[ ] VEM-1234 Por qué primero un renderer compartido
Ya tienes una WebUI modularizada y en TypeScript, y Era 6 empuja justo a “UI declarativa basada en schema”.

[ ] VEM-1235 Extraer ModuleRenderer + ControlCell a un paquete compartido te da dos cosas a la vez:

[ ] VEM-1236 Preview perfecta en el editor.

[ ] VEM-1237 Menos acoplamiento entre WebUI y “chrome” del host (WebView, bridge, etc.).

[ ] VEM-1238 Es trabajo una vez, y luego todo lo que avance el renderer beneficia:

[ ] VEM-1239 OMEGA “normal”.

[ ] VEM-1240 El editor de manifests.

[ ] VEM-1241 Cualquier tooling futuro (p.ej. snapshot viewer, docs interactivas).

[ ] VEM-1242 Camino mínimo para esa opción
Identificar el renderer “puro” ya existente:

[ ] VEM-1243 El código que, dado registry + presentation + state, produce HTML/React de Control Cells e IO Meters.

[ ] VEM-1244 Extraerlo a un módulo interno, p.ej. ui/module-renderer:

[ ] VEM-1245 Define tipos compartidos (ModuleManifest, RegistryEntity, ControlCellProps).

[ ] VEM-1246 Expone algo tipo <ModuleRenderer manifest state />.

[ ] VEM-1247 En la WebUI:

[ ] VEM-1248 Sustituir el render inline por el <ModuleRenderer> de ese módulo.

[ ] VEM-1249 En el editor:

[ ] VEM-1250 Añadir esa dependencia.

[ ] VEM-1251 Montar el mismo <ModuleRenderer> en una pestaña de “Preview”, alimentándolo con:

manifest = lo que estás editando.

state = defaults (no hace falta audio real).

[ ] VEM-1252 Si luego quieres ir a la opción B (exe con --preview-manifest), ya llegas con los tipos y el renderer estructurados; será más fácil engancharlo.

[ ] VEM-1253 ¿Te encaja que el siguiente paso concreto sea localizar y aislar en tu código actual la mínima función/componente que hace de ModuleRenderer para que podamos bosquejar su API pública (“le doy manifest+state y me das UI”)?


[ ] VEM-1254 La buena noticia: ya tienes exactamente lo que necesitas para el preview, sólo hay que encapsularlo.

[ ] VEM-1255 Qué pieza hay que aislar
El renderer genérico está en ModuleRenderer.js y ya hace justo esto: dado un schema/manifest con layout.uiLayout.items y un registry, pinta las Control Cells, attachments, etc.

[ ] VEM-1256 ModuleManager lo usa indirectamente construyendo descriptor desde SchemaStore (window.schemaStore.getSchema(componentId)), y ModuleRenderer se encarga de:

[ ] VEM-1257 Normalizar el schema (normalizeDescriptor).

[ ] VEM-1258 Renderizar la grid (module-grid) según uiLayout.columns/gap.

[ ] VEM-1259 Construir cada cell con renderItem + buildControlCell usando entity = getRegistryEntity(id).

[ ] VEM-1260 Eso es exactamente lo que quieres montar dentro del editor.

[ ] VEM-1261 API pública que te interesa exponer
Yo lo envolvería en algo así (en TS, aunque ahora esté en JS):

ts
export interface ModuleDescriptor {
  id: string;
  version: string;
  layout: {
    hp?: number;
    uiLayout: {
      columns: number;
      gap: number;
    };
  };
  registry: RegistryEntity[];
  items: Array<{
    // lo que hoy llamas item/look/paramId/row/col/variant...
    look: 'knob' | 'slider-v' | 'slider-h' | 'toggle' | 'meter' | 'display' | 'select' | 'button';
    paramId?: string;
    source?: string;
    portId?: string;
    row: number;
    col: number;
    colSpan?: number;
    variant?: 'A' | 'B' | 'C';
    label?: string;
  }>;
}

export function renderModuleInto(
  container: HTMLElement,
  descriptor: ModuleDescriptor,
  values?: Record<string, number | string | boolean>
): ModuleRendererInstance;
Y que esa función sea un wrapper fino sobre la clase actual ModuleRenderer (la que está en ModuleRenderer.js).

[ ] VEM-1262 En OMEGA: descriptor lo sigues sacando de SchemaStore (como ahora).

[ ] VEM-1263 En el editor: descriptor lo construyes a partir del manifest y de la definición de layout/items que edite el usuario (o lo cargas desde el mismo YAML que usará SchemaStore).

[ ] VEM-1264 Cómo lo usaría el editor para el preview
El editor tiene el ModuleManifest que estás editando (con layout + registry).

[ ] VEM-1265 Cuando quieras previsualizar, construyes un ModuleDescriptor mínimo con:

id y version del manifest.

layout.uiLayout desde manifest.layout o desde un subcampo uiLayout.

registry = manifest.registry.

items = lo que defináis en el editor para colocar cada RegistryEntity en la grid (row/col/look/variant).

[ ] VEM-1266 Llamas:

ts
const descriptor = buildDescriptorFromManifest(manifest);
renderModuleInto(previewDiv, descriptor, buildDefaultValues(manifest));
donde buildDefaultValues pone cada control numérico en su range.default para que el preview tenga algo coherente.

[ ] VEM-1267 Así el editor no reimplementa nada: usa exactamente el mismo ModuleRenderer que OMEGA, sólo que con valores “fake”.

[ ] VEM-1268 Si prefieres arrancar el exe en vez de extraer código
La alternativa que comentas (arrancar el exe y que cargue directamente lo que se está definiendo) encaja bien como complemento:

[ ] VEM-1269 El editor guarda el YAML en Resources/modules/<id>.yaml.

[ ] VEM-1270 Lanza OmegaSynth.exe --preview-manifest <id> o usa RPC system.reloadManifest.

[ ] VEM-1271 La ventana de OMEGA muestra el módulo real; el editor usa esto como “preview avanzada”.

[ ] VEM-1272 Pero incluso en ese escenario, te sigue compensando exponer ModuleRenderer como función/módulo, porque:

[ ] VEM-1273 Evitas mantener dos renderers si algún día quieres un preview embebido.

[ ] VEM-1274 Toda la lógica de grid, variantes, attachments y bindings sigue centralizada.

[ ] VEM-1275 ¿Te gustaría que en la siguiente iteración te proponga literalmente el pequeño wrapper JS/TS que exporta renderModuleInto a partir del ModuleRenderer actual (para que puedas copiarlo casi tal cual)?


[ ] VEM-1276 Te propongo un wrapper en TS (puedes aflojar tipos o pasarlo a JS si quieres).

[ ] VEM-1277 Wrapper TS para renderModuleInto
Asumiendo que hoy tienes algo tipo ModuleRenderer que opera sobre un contenedor DOM, el wrapper puede ser así:

ts
// ui/module-renderer/index.ts

// Importa tu implementación actual (ajusta la ruta real)
import { ModuleRenderer } from './ModuleRenderer';

// Tipos compartidos mínimos (puedes sustituir por los tuyos reales)
export interface RegistryEntity {
  id: string;
  label?: string;
  type: string;
  roles: string[];
  unit?: string;
  precision?: number;
  ui_precision?: number;
  range?: {
    min?: number;
    max?: number;
    default?: number;
  };
  options?: { value: number | string; label: string }[];
  presentation?: any; // si aún no tienes tipado fino
}

export interface ModuleDescriptor {
  id: string;
  version?: string;
  layout?: {
    hp?: number;
    uiLayout?: {
      columns?: number;
      gap?: number;
    };
  };
  registry: RegistryEntity[];

  // Estructura que hoy ya usas en ModuleRenderer para los items de la grid
  items: Array<{
    look: string;          // knob, slider-v, toggle, meter…
    paramId?: string;
    source?: string;
    portId?: string;
    row: number;
    col: number;
    colSpan?: number;
    variant?: string;
    label?: string;
  }>;
}

export interface ModuleRendererInstance {
  destroy(): void;
  // añade aquí lo que exponga tu implementación actual (setValues, etc.)
}

// Valores runtime opcionales (para preview basta con esto)
export interface ModuleRuntimeState {
  values?: Record<string, number | string | boolean>;
  telemetry?: Record<string, number>;
}

export function renderModuleInto(
  container: HTMLElement,
  descriptor: ModuleDescriptor,
  state: ModuleRuntimeState = {}
): ModuleRendererInstance {
  // Limpia contenido previo del container
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  // Crea instancia de tu renderer actual
  const renderer = new ModuleRenderer({
    container,
    descriptor,
    values: state.values ?? {},
    telemetry: state.telemetry ?? {},
  });

  // Devuelve una interfaz finita para el editor / WebUI
  return {
    destroy() {
      if (typeof renderer.destroy === 'function') {
        renderer.destroy();
      } else {
        // fallback: limpiar DOM
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      }
    },
  };
}
En el editor, el uso típico sería:

ts
import { renderModuleInto, ModuleDescriptor } from '@omega/module-renderer';

let currentInstance: ModuleRendererInstance | null = null;

function updatePreview(manifest: ModuleManifest) {
  const descriptor: ModuleDescriptor = buildDescriptorFromManifest(manifest);
  const state = buildDefaultStateFromManifest(manifest);

  if (currentInstance) currentInstance.destroy();
  currentInstance = renderModuleInto(previewDiv, descriptor, state);
}
La parte que falta es buildDescriptorFromManifest(manifest), que es justo donde conectarás tu ModuleManifest Era 6 (registry/presentation/layout) con la estructura de items que entiende hoy ModuleRenderer.

[ ] VEM-1278 ¿Prefieres que lo siguiente que hagamos sea esbozar ese buildDescriptorFromManifest para el caso sencillo “una cell por RegistryEntity, en orden por tab/group/order”?


[ ] VEM-1279 Lo más simple: una cell por entidad, ordenada por tab/group/order y colocada en una grid básica.

ts
import { ModuleDescriptor, RegistryEntity } from '@omega/module-renderer';

interface ModuleManifest {
  id: string;
  version?: string;
  layout?: {
    hp?: number;
    columns?: number;
    gap?: number;
  };
  registry: RegistryEntity[];
}

function buildDescriptorFromManifest(manifest: ModuleManifest): ModuleDescriptor {
  const columns = manifest.layout?.columns ?? 4;
  const gap = manifest.layout?.gap ?? 8;

  // 1) Ordenar entidades por tab, group, order, id
  const sorted = [...manifest.registry].sort((a, b) => {
    const pa = a.presentation ?? {};
    const pb = b.presentation ?? {};

    const tabA = (pa.tab ?? 'MAIN') as string;
    const tabB = (pb.tab ?? 'MAIN') as string;
    if (tabA !== tabB) return tabA.localeCompare(tabB);

    const groupA = (pa.group ?? '') as string;
    const groupB = (pb.group ?? '') as string;
    if (groupA !== groupB) return groupA.localeCompare(groupB);

    const orderA = (pa.order ?? 0) as number;
    const orderB = (pb.order ?? 0) as number;
    if (orderA !== orderB) return orderA - orderB;

    return a.id.localeCompare(b.id);
  });

  // 2) Mapear type/presentation.ui.component -> look
  const items: ModuleDescriptor['items'] = [];
  let row = 0;
  let col = 0;

  for (const entity of sorted) {
    const ui = entity.presentation?.ui ?? {};
    const comp = (ui.component ?? 'knob') as string;

    const look = mapComponentToLook(entity, comp);

    items.push({
      look,
      paramId: entity.id,
      row,
      col,
      colSpan: 1,
      variant: ui.variant ?? 'A',
      label: entity.label ?? entity.id,
    });

    col++;
    if (col >= columns) {
      col = 0;
      row++;
    }
  }

  return {
    id: manifest.id,
    version: manifest.version,
    layout: {
      hp: manifest.layout?.hp,
      uiLayout: { columns, gap },
    },
    registry: manifest.registry,
    items,
  };
}

// Heurística simple para mapear a "look" actual del ModuleRenderer
function mapComponentToLook(entity: RegistryEntity, component: string): string {
  switch (component) {
    case 'knob':
      return 'knob';
    case 'slider_v':
      return 'slider-v';
    case 'slider_h':
      return 'slider-h';
    case 'toggle':
      return 'toggle';
    case 'button':
      return 'button';
    case 'list':
      return 'select';
    case 'meter':
      return 'meter';
    default:
      // fallback según type
      if (entity.type === 'bool') return 'toggle';
      if (entity.type === 'list') return 'select';
      return 'knob';
  }
}
Con esto, el editor puede:

[ ] VEM-1280 Tomar el ModuleManifest Era 6 que estás editando.

[ ] VEM-1281 Construir un ModuleDescriptor compatible con tu ModuleRenderer actual.

[ ] VEM-1282 Llamar a renderModuleInto(previewDiv, descriptor, state) y ver una grid sencilla con una cell por entidad, en el orden tab/group/order que definiste.

[ ] VEM-1283 ¿Quieres que el próximo paso sea añadir soporte a este buildDescriptorFromManifest para separar la preview por pestañas (MAIN, PATCHING, etc.) en lugar de mezclarlo todo en una sola grid?


[ ] VEM-1284 Lo puedes resolver generando un descriptor por tab y añadiendo una pequeña estructura de navegación.

1) Nuevo tipo con tabs
En vez de un sólo ModuleDescriptor, defines:

ts
export interface TabbedModuleDescriptor {
  id: string;
  version?: string;
  tabs: Array<{
    id: string;              // p.ej. 'MAIN', 'PATCHING'
    label: string;
    layout: {
      hp?: number;
      uiLayout: {
        columns: number;
        gap: number;
      };
    };
    registry: RegistryEntity[];
    items: ModuleDescriptor['items'];
  }>;
}
Tu ModuleRenderer actual puede seguir trabajando con ModuleDescriptor; el wrapper para el editor se encarga de elegir la tab activa y pasar sólo esa parte al renderer.

2) buildDescriptorFromManifest con tabs
ts
function buildTabbedDescriptorFromManifest(
  manifest: ModuleManifest
): TabbedModuleDescriptor {
  const baseColumns = manifest.layout?.columns ?? 4;
  const baseGap = manifest.layout?.gap ?? 8;

  // 1) Agrupar por tab
  const byTab = new Map<string, RegistryEntity[]>();

  for (const entity of manifest.registry) {
    const tab = (entity.presentation?.tab ?? 'MAIN') as string;
    const list = byTab.get(tab) ?? [];
    list.push(entity);
    byTab.set(tab, list);
  }

  const tabs: TabbedModuleDescriptor['tabs'] = [];

  for (const [tabId, entities] of byTab) {
    // 2) Ordenar por group/order/id dentro de cada tab
    const sorted = entities.sort((a, b) => {
      const pa = a.presentation ?? {};
      const pb = b.presentation ?? {};

      const groupA = (pa.group ?? '') as string;
      const groupB = (pb.group ?? '') as string;
      if (groupA !== groupB) return groupA.localeCompare(groupB);

      const orderA = (pa.order ?? 0) as number;
      const orderB = (pb.order ?? 0) as number;
      if (orderA !== orderB) return orderA - orderB;

      return a.id.localeCompare(b.id);
    });

    // 3) Construir items grid para esa tab
    const columns = baseColumns;
    const gap = baseGap;
    const items: ModuleDescriptor['items'] = [];
    let row = 0;
    let col = 0;

    for (const entity of sorted) {
      const ui = entity.presentation?.ui ?? {};
      const comp = (ui.component ?? 'knob') as string;
      const look = mapComponentToLook(entity, comp);

      items.push({
        look,
        paramId: entity.id,
        row,
        col,
        colSpan: 1,
        variant: ui.variant ?? 'A',
        label: entity.label ?? entity.id,
      });

      col++;
      if (col >= columns) {
        col = 0;
        row++;
      }
    }

    tabs.push({
      id: tabId,
      label: tabId,
      layout: {
        hp: manifest.layout?.hp,
        uiLayout: { columns, gap },
      },
      registry: entities,
      items,
    });
  }

  // Ordenar tabs por nombre (MAIN primero si quieres)
  tabs.sort((a, b) => {
    if (a.id === 'MAIN' && b.id !== 'MAIN') return -1;
    if (b.id === 'MAIN' && a.id !== 'MAIN') return 1;
    return a.id.localeCompare(b.id);
  });

  return {
    id: manifest.id,
    version: manifest.version,
    tabs,
  };
}
mapComponentToLook es la misma función que definimos antes.

3) Uso en el editor con un tab selector
En el editor:

ts
let currentInstance: ModuleRendererInstance | null = null;
let currentTabId = 'MAIN';

function updatePreview(manifest: ModuleManifest) {
  const tabbed = buildTabbedDescriptorFromManifest(manifest);
  const activeTab =
    tabbed.tabs.find(t => t.id === currentTabId) ?? tabbed.tabs[0];

  if (!activeTab) return;

  const descriptor: ModuleDescriptor = {
    id: `${tabbed.id}:${activeTab.id}`,
    version: tabbed.version,
    layout: activeTab.layout,
    registry: activeTab.registry,
    items: activeTab.items,
  };

  const state = buildDefaultStateFromManifest(manifest);

  if (currentInstance) currentInstance.destroy();
  currentInstance = renderModuleInto(previewDiv, descriptor, state);
}

// En la UI del editor, renderizas un selector de pestañas:
function onTabClick(tabId: string) {
  currentTabId = tabId;
  updatePreview(currentManifest);
}
Así el preview del editor refleja exactamente la separación en tabs MAIN, PATCHING, etc., igual que hará OMEGA cuando interprete el manifest.

[ ] VEM-1285 ¿Quieres que el siguiente paso sea añadir también un nivel de separación visual por group dentro de cada tab (p.ej. títulos “WAVEFORM”, “MIX”, “IO” en el preview)?


ara los groups lo mejor es no tocar ModuleRenderer, sino darle metadata y que éste pinte encabezados.

1) Extender items con información de group
Añade groupId y groupLabel a los items que generas:

ts
type GroupId = string;

interface GroupMeta {
  id: GroupId;
  label: string;
  order: number;
}

interface GroupedTab {
  id: string;
  label: string;
  layout: {
    hp?: number;
    uiLayout: { columns: number; gap: number };
  };
  groups: GroupMeta[];
  items: ModuleDescriptor['items'] & { groupId?: GroupId }[];
}
Modificar el bucle de construcción en buildTabbedDescriptorFromManifest:

ts
const groupMap = new Map<GroupId, GroupMeta>();

// ...dentro del for (const entity of sorted)...
const groupId = (entity.presentation?.group ?? '') as string;
if (!groupMap.has(groupId)) {
  groupMap.set(groupId, {
    id: groupId,
    label: groupId || 'UNGROUPED',
    order: entity.presentation?.order ?? 0,
  });
}

items.push({
  look,
  paramId: entity.id,
  row,
  col,
  colSpan: 1,
  variant: ui.variant ?? 'A',
  label: entity.label ?? entity.id,
  groupId,
});
Y al montar la tab:

ts
const groups = Array.from(groupMap.values()).sort(
  (a, b) => a.order - b.order || a.id.localeCompare(b.id)
);

tabs.push({
  id: tabId,
  label: tabId,
  layout: { hp: manifest.layout?.hp, uiLayout: { columns, gap } },
  groups,
  items,
});
2) Renderizado con headers por group
El ModuleRenderer actual sólo espera un ModuleDescriptor, así que el editor puede hacer un pequeño wrapper:

ts
function renderGroupedTabInto(
  container: HTMLElement,
  tab: GroupedTab,
  state: ModuleRuntimeState
): ModuleRendererInstance {
  // Limpia
  while (container.firstChild) container.removeChild(container.firstChild);

  const root = document.createElement('div');
  root.className = 'module-tab-root';
  container.appendChild(root);

  const instances: ModuleRendererInstance[] = [];

  for (const group of tab.groups) {
    const section = document.createElement('div');
    section.className = 'module-group-section';

    const header = document.createElement('div');
    header.className = 'module-group-header';
    header.textContent = group.label;
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'module-group-grid';
    section.appendChild(grid);

    const groupItems = tab.items.filter(i => i.groupId === group.id);

    const descriptor: ModuleDescriptor = {
      id: `${tab.id}:${group.id}`,
      layout: tab.layout,
      registry: tab.registry, // o sólo las entities de ese group
      items: groupItems,
    };

    const inst = renderModuleInto(grid, descriptor, state);
    instances.push(inst);

    root.appendChild(section);
  }

  return {
    destroy() {
      for (const inst of instances) inst.destroy();
      while (container.firstChild) container.removeChild(container.firstChild);
    },
  };
}
Y en el editor, en vez de llamar a renderModuleInto directamente, llamas a renderGroupedTabInto con la tab activa.

[ ] VEM-1286 Con esto, el preview te muestra:

[ ] VEM-1287 Pestañas MAIN, PATCHING…

[ ] VEM-1288 Dentro de cada una, bloques con encabezado group (“WAVEFORM”, “MIX”, “IO”…), y debajo la grid de Control Cells/IO Meters de ese group.

[ ] VEM-1289 ¿Te interesa que el próximo paso sea definir unas clases CSS mínimas (module-group-section, module-group-header, module-group-grid) para que el preview se parezca visualmente al rack de OMEGA?


e propongo un CSS mínimo, muy cercano a un rack limpio y legible.

css
/* Contenedor raíz de la pestaña */
.module-tab-root {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 10px;
  background: #111319;
}

/* Bloque de grupo */
.module-group-section {
  border-radius: 6px;
  padding: 6px 8px 8px 8px;
  background: linear-gradient(180deg, #171a22 0%, #10121a 100%);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.03),
              0 0 0 1px rgba(0, 0, 0, 0.7);
}

/* Cabecera de grupo: etiqueta tipo "WAVEFORM", "MIX"… */
.module-group-header {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8890a5;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  margin-bottom: 6px;
}

/* Grid interna donde se monta ModuleRenderer */
.module-group-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr)); /* ajusta a columns si quieres */
  gap: 6px 10px;
}

/* Opcional: ajustar tamaño de las celdas para parecerse al rack */
.module-group-grid .control-cell {
  min-width: 72px;
  max-width: 110px;
}

/* Fondo general del preview (contenedor superior) */
.manifest-preview-root {
  background: radial-gradient(circle at top, #202537 0, #080a0f 55%, #050608 100%);
  padding: 6px;
  border-radius: 8px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.02),
              0 12px 24px rgba(0, 0, 0, 0.6);
}
module-group-section y module-group-header te dan el look de “bloques” etiquetados por grupo.

module-group-grid es donde tu wrapper monta el ModuleRenderer de cada grupo; si quieres, puedes leer columns de la tab y generar el grid-template-columns dinámicamente en inline style.

[ ] VEM-1290 ¿Te gustaría que el siguiente paso sea decidir dónde encajar este preview dentro del layout del editor (p.ej. derecha formulario, abajo preview, o tabs “Schema / Preview”)?


s mejor usar directamente los estilos y temas de OMEGA: así garantizas que lo que ves en el editor es lo mismo que verá el usuario.

[ ] VEM-1291 Qué implica reutilizar los CSS/themes de OMEGA
El preview del editor debería cargar el mismo bundle de estilos que usa la WebUI de OMEGA (omega-ui.css, theme actual, variables de color).

[ ] VEM-1292 El ModuleRenderer que montas en el editor recibirá las mismas clases que en OMEGA (control-cell, variantes, etc.), y esos estilos ya vendrán definidos en el CSS de OMEGA.

[ ] VEM-1293 El editor sólo necesita añadir un marco mínimo (por ejemplo .manifest-preview-root), pero no redefinir estilos de celdas, grids o grupos si ya existen en el tema de OMEGA.

[ ] VEM-1294 Una forma práctica de hacerlo:

[ ] VEM-1295 Extraer el CSS de la WebUI a un paquete compartido (o un archivo importable) y que el editor lo importe también.

[ ] VEM-1296 Si ya tienes “skills”/temas (p.ej. variables CSS para neon, glassmorphism…), el editor sólo activa el mismo theme que usa el rack, sin reimplementarlo.

[ ] VEM-1297 Así evitas divergencias visuales y cada cambio de diseño en OMEGA se refleja automáticamente en el editor.

[ ] VEM-1298 ¿Tienes el CSS de la WebUI ya empaquetado como un único bundle (o módulo) que puedas importar en otra app, o ahora mismo está “pegado” a la app principal de OMEGA?

[ ] VEM-1299 Sí, tiene todo el sentido, y en tu bundle ya está preparado para poder hacerlo.

[ ] VEM-1300 En el bundle actual ya tienes renderer.js y varios .css de OMEGA (knobs, rack, overlay, browser, etc.) listos para reutilizar.

[ ] VEM-1301 La spec de WebUI Era 6 ya define que debe existir un WidgetRegistry y un PanelRenderer neutrales que consumen schema y se estilizan con esos CSS, sin hardcodes.

[ ] VEM-1302 Para el editor, el camino más limpio es:

[ ] VEM-1303 Importar el mismo renderer.js (tu ModuleRenderer consolidado) en la app del editor, tal y como hicimos en el wrapper renderModuleInto pero apuntando al bundle ya compilado.

[ ] VEM-1304 Importar los mismos .css que usas en OMEGA (rack, controls, overlay) como hojas globales del editor, de forma que las clases que emite renderer.js se vean idénticas.

[ ] VEM-1305 Mantener en el editor sólo una fina capa de layout externo (panel lateral, formulario, área de preview), sin redefinir estilos internos de las celdas.

[ ] VEM-1306 Así, cuando cambies el tema o los “skills” visuales de OMEGA y recompiles el bundle, el editor los hereda automáticamente al actualizar la dependencia.

[ ] VEM-1307 ¿Te va bien que el próximo paso lo centremos en algo muy concreto: cómo cargar renderer.js y los .css de OMEGA dentro de una app Vite/React del editor (paths relativos, tipo de import, etc.)?

[ ] VEM-1308 La forma concreta depende de dónde pongas el editor, pero la idea es esta.

1) Estructura mínima de proyecto
Suponiendo editor en ui/editor dentro del repo:

ui/modules/dist/renderer.js → bundle actual de OMEGA WebUI.

ui/modules/dist/*.css → los CSS de rack, controls, overlay, etc.

ui/editor → app Vite/React.

2) Importar renderer.js en Vite/React
En ui/editor/src/omegaRenderer.ts:

ts
// Asumiendo que copias o linkas el bundle a algo como:
import OmegaRendererBundle from '../vendor/renderer.js';

// Tipos mínimos
export interface OmegaRendererOptions {
  container: HTMLElement;
  descriptor: any;
  values?: Record<string, any>;
  telemetry?: Record<string, any>;
}

// El bundle suele exponer algo global tipo window.OmegaRenderer
declare global {
  interface Window {
    OmegaRenderer?: {
      create: (opts: OmegaRendererOptions) => { destroy(): void };
    };
  }
}

// Wrapper typed
export function createOmegaRenderer(opts: OmegaRendererOptions) {
  // Asegura que el bundle se evalúa (side‑effect import)
  // Si OmegaRendererBundle exporta algo, basta con importarlo arriba.
  if (!window.OmegaRenderer) {
    throw new Error('OmegaRenderer not initialized from bundle');
  }
  return window.OmegaRenderer!.create(opts);
}
Si tu renderer.js es un UMD/ESM que exporta directamente la función, mejor:

ts
// vendor/renderer.js exporta createRenderer(...)
import { createRenderer } from '../vendor/renderer.js';

export function createOmegaRenderer(opts: OmegaRendererOptions) {
  return createRenderer(opts);
}
La clave es: no reempacar lógica, sólo envolver lo que ya compila OMEGA.

3) Importar los CSS de OMEGA
En ui/editor/src/main.tsx (entry de Vite):

ts
// CSS propios del editor
import './styles/editor-shell.css';

// CSS del bundle de OMEGA (copiados o symlink)
import '../vendor/omega-rack.css';
import '../vendor/omega-controls.css';
import '../vendor/overlay.css';
import '../vendor/browser.css';
// y los demás .css relevantes del bundle
Vite los meterá como estilos globales, con las mismas clases que usa renderer.js.

4) Uso en un componente React de preview
tsx
// ui/editor/src/components/ManifestPreview.tsx
import { useEffect, useRef } from 'react';
import { createOmegaRenderer } from '../omegaRenderer';
import { buildDescriptorFromManifest } from '../descriptorBuilder';

export function ManifestPreview({ manifest }: { manifest: ModuleManifest }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<{ destroy(): void } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const descriptor = buildDescriptorFromManifest(manifest);
    const values = buildDefaultStateFromManifest(manifest);

    if (rendererRef.current) rendererRef.current.destroy();
    rendererRef.current = createOmegaRenderer({
      container: el,
      descriptor,
      values,
      telemetry: {},
    });

    return () => {
      if (rendererRef.current) rendererRef.current.destroy();
      rendererRef.current = null;
    };
  }, [manifest]);

  return <div className="manifest-preview-root" ref={containerRef} />;
}
Con esto:

renderer.js es exactamente el mismo bundle que usa OMEGA.

[ ] VEM-1309 Los .css son los mismos, con las mismas clases.

[ ] VEM-1310 El editor sólo construye descriptor desde el manifest y pasa un contenedor <div>.

[ ] VEM-1311 ¿Desde dónde te resulta más cómodo copiar o referenciar renderer.js y los .css en el editor: como symlink a ui/modules/dist dentro del repo, o como artefactos que generas en el build de OMEGA y luego consumes como NPM/local package?


[ ] VEM-1312 Para ti, con repo único y control total, empezaría con symlink/local path y luego evolucionaría a paquete.

[ ] VEM-1313 Opción recomendada ahora: symlink/local path
Mantienes el build de OMEGA donde está (ui/modules/dist/renderer.js + .css).

[ ] VEM-1314 En el editor (ui/editor), creas un directorio vendor con symlinks o rutas relativas:

ui/editor/vendor/renderer.js → ../modules/dist/renderer.js

ui/editor/vendor/omega-rack.css → ../modules/dist/rack.css

etc.

[ ] VEM-1315 Ventajas:

[ ] VEM-1316 Cero fricción: no necesitas publicar ni versionar un package extra.

[ ] VEM-1317 Cada vez que recompilas OMEGA (bundle WebUI), el editor ve automáticamente la nueva versión de renderer.js y los CSS.

[ ] VEM-1318 Más adelante, si esto se estabiliza y quieres aislarlo más:

[ ] VEM-1319 Extraes renderer.js + .d.ts + .css a un paquete interno tipo @omega/ui-renderer consumido por OMEGA y por el editor.

[ ] VEM-1320 ¿Te encaja que en el siguiente paso nos centremos en una sola pieza muy concreta: definir el contrato exacto de OmegaRenderer.create(opts) que te gustaría que exponga el bundle (para que el editor y la WebUI lo usen igual)?


[ ] VEM-1321 Propongo que el contrato de OmegaRenderer.create sea muy explícito pero mínimo, para que sirva igual en WebUI y en el editor.

[ ] VEM-1322 Firma propuesta
ts
type ModuleDescriptor = {
  id: string;                  // moduleId único
  kind: string;                // tipo de módulo (osc_va, filter_lp, etc.)
  schema: any;                 // fragmento de uiSchema relevante
  bindings: any;               // bindings de parámetros/slots
};

type ModuleValues = Record<string, number | string | boolean>;
type ModuleTelemetry = Record<string, number>;

type OmegaRendererCreateOptions = {
  container: HTMLElement;      // raíz donde pintar el panel
  descriptor: ModuleDescriptor;
  values: ModuleValues;        // estado actual de parámetros
  telemetry?: ModuleTelemetry; // meters, LEDs, etc.
  readOnly?: boolean;          // para editor: bloquear interacción real
  onChange?: (next: ModuleValues) => void;
  onCommand?: (cmd: UiCommand) => void; // bus de comandos UI
};

type OmegaRendererInstance = {
  update(partial: {
    values?: ModuleValues;
    telemetry?: ModuleTelemetry;
    descriptor?: ModuleDescriptor;
  }): void;
  destroy(): void;
};
Y el bundle expone:

ts
export function create(options: OmegaRendererCreateOptions): OmegaRendererInstance;
Con eso:

[ ] VEM-1323 OMEGA WebUI le pasa el descriptor real derivado de SchemaStore + GraphStore, y conecta onCommand al CommandBus central.

[ ] VEM-1324 El editor le pasa un descriptor sintético construido desde el manifest, puede simular values y telemetry, y usar readOnly para que no dispare comandos reales, o capturarlos con onCommand para debug.

[ ] VEM-1325 ¿Te encaja añadir también en el contrato un pequeño debugId?: string para que el renderer pueda marcar el panel con un atributo de test (data-omega-panel-id), útil para snapshots y tooling del editor?


[ ] VEM-1326 Perfecto, entonces lo dejamos así, muy explícito.

[ ] VEM-1327 Contrato final de OmegaRenderer.create
ts
export type ModuleDescriptor = {
  id: string;
  kind: string;
  schema: any;        // fragmento de uiSchema
  bindings: any;      // bindings a parámetros/slots
};

export type ModuleValues = Record<string, number | string | boolean>;
export type ModuleTelemetry = Record<string, number>;

export type UiCommand = {
  type: string;
  payload?: any;
};

export type OmegaRendererCreateOptions = {
  container: HTMLElement;
  descriptor: ModuleDescriptor;
  values: ModuleValues;
  telemetry?: ModuleTelemetry;
  readOnly?: boolean;
  debugId?: string;   // se refleja como data-omega-panel-id en el DOM
  onChange?: (next: ModuleValues) => void;
  onCommand?: (cmd: UiCommand) => void;
};

export type OmegaRendererInstance = {
  update(partial: {
    values?: ModuleValues;
    telemetry?: ModuleTelemetry;
    descriptor?: ModuleDescriptor;
  }): void;
  destroy(): void;
};

export function create(
  options: OmegaRendererCreateOptions
): OmegaRendererInstance;
Encaja con el pipeline SchemaStore + GraphStore + RuntimeStore descrito en la WebUI Era 6 (descriptor viene del Schema/Graph, values/telemetry del Runtime).

[ ] VEM-1328 Es suficientemente agnóstico para que el editor lo use con un descriptor sintético generado desde los manifests y sin CommandBus real.

debugId te permite localizar fácilmente el panel tanto desde el inspector como desde tests o tooling interno.

[ ] VEM-1329 ¿Quieres que te escriba el esqueleto de renderer.ts que implemente este contrato sobre tu PanelRenderer + WidgetRegistry actuales, listo para que lo pegues en ui/modules/src/renderer.ts?


[ ] VEM-1330 Te dejo un esqueleto directo, sin magia, para ui/modules/src/renderer.ts apoyado en tu PanelRenderer y WidgetRegistry tal y como los describe la spec de WebUI Era 6.

ts
// ui/modules/src/renderer.ts

// Tipos de contrato expuesto
export type ModuleDescriptor = {
  id: string;
  kind: string;
  schema: any;
  bindings: any;
};

export type ModuleValues = Record<string, number | string | boolean>;
export type ModuleTelemetry = Record<string, number>;

export type UiCommand = {
  type: string;
  payload?: any;
};

export type OmegaRendererCreateOptions = {
  container: HTMLElement;
  descriptor: ModuleDescriptor;
  values: ModuleValues;
  telemetry?: ModuleTelemetry;
  readOnly?: boolean;
  debugId?: string;
  onChange?: (next: ModuleValues) => void;
  onCommand?: (cmd: UiCommand) => void;
};

export type OmegaRendererInstance = {
  update(partial: {
    values?: ModuleValues;
    telemetry?: ModuleTelemetry;
    descriptor?: ModuleDescriptor;
  }): void;
  destroy(): void;
};

// Dependencias internas (ajusta rutas/nombres reales)
import { PanelRenderer } from './panel/PanelRenderer';
import { WidgetRegistry } from './widgets/WidgetRegistry';
import { buildModuleViewModel } from './vm/ModuleViewModelBuilder';

/**
 * Adaptador simple que conecta PanelRenderer + WidgetRegistry
 * al contrato OmegaRenderer.create(...)
 */
export function create(
  options: OmegaRendererCreateOptions
): OmegaRendererInstance {
  const {
    container,
    descriptor,
    values,
    telemetry,
    readOnly,
    debugId,
    onChange,
    onCommand,
  } = options;

  // Limpia el contenedor por si viene de un render anterior
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  if (debugId) {
    container.setAttribute('data-omega-panel-id', debugId);
  }

  // Estado interno mutable
  let currentDescriptor: ModuleDescriptor = descriptor;
  let currentValues: ModuleValues = { ...values };
  let currentTelemetry: ModuleTelemetry = { ...(telemetry || {}) };

  // Adaptador de comandos desde los widgets al exterior
  const commandBus = {
    emit(cmd: UiCommand) {
      if (onCommand) onCommand(cmd);
    },
  };

  // Adaptador de cambios de valor desde los widgets al exterior
  const valueSink = {
    patch(partial: Partial<ModuleValues>) {
      currentValues = { ...currentValues, ...partial };
      if (onChange) {
        onChange(currentValues);
      }
    },
  };

  // Construir ViewModel declarativo a partir del descriptor
  const viewModel = buildModuleViewModel({
    descriptor: currentDescriptor,
    values: currentValues,
    telemetry: currentTelemetry,
    readOnly: !!readOnly,
  });

  // Instanciar PanelRenderer + WidgetRegistry
  const widgetRegistry = new WidgetRegistry({
    commandBus,
    valueSink,
    readOnly: !!readOnly,
  });

  const panelRenderer = new PanelRenderer({
    container,
    viewModel,
    widgetRegistry,
  });

  panelRenderer.render();

  // API pública de actualización incremental
  function update(partial: {
    values?: ModuleValues;
    telemetry?: ModuleTelemetry;
    descriptor?: ModuleDescriptor;
  }) {
    if (partial.descriptor) {
      currentDescriptor = partial.descriptor;
    }
    if (partial.values) {
      currentValues = { ...currentValues, ...partial.values };
    }
    if (partial.telemetry) {
      currentTelemetry = { ...currentTelemetry, ...partial.telemetry };
    }

    const nextVm = buildModuleViewModel({
      descriptor: currentDescriptor,
      values: currentValues,
      telemetry: currentTelemetry,
      readOnly: !!readOnly,
    });

    panelRenderer.update(nextVm);
  }

  function destroy() {
    panelRenderer.destroy();
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }

  return { update, destroy };
}
La idea es que:

buildModuleViewModel encapsula exactamente el paso “Schema + Graph + Runtime → ModuleViewModel” descrito en la spec (aquí lo alimentas con tu descriptor + values + telemetry).

[ ] VEM-1331 PanelRenderer recibe siempre un ViewModel ya resuelto y se limita a pintar tabs, groups y widgets; WidgetRegistry mapea widgetId a controles concretos que emiten UiCommand y parches de valores.

[ ] VEM-1332 El editor sólo tiene que construir ModuleDescriptor y values y llamar a create(...); la WebUI hará lo mismo pero usando los stores reales.

[ ] VEM-1333 ¿Quieres que el siguiente paso sea esbozar también la signatura mínima esperada de buildModuleViewModel y del constructor de PanelRenderer/WidgetRegistry para que todo quede documentado en un solo sitio?


[ ] VEM-1334 Te dejo las signaturas mínimas para que todo encaje con el renderer.ts anterior.

[ ] VEM-1335 ViewModelBuilder
ts
// ui/modules/src/vm/ModuleViewModelBuilder.ts

import {
  ModuleDescriptor,
  ModuleValues,
  ModuleTelemetry,
} from '../renderer';

export type ModuleViewModel = {
  id: string;
  kind: string;
  title: string;
  layout: any;        // tabs, groups, orden de widgets
  widgets: any[];     // descripción declarativa de cada control
};

export type BuildModuleViewModelInput = {
  descriptor: ModuleDescriptor;
  values: ModuleValues;
  telemetry: ModuleTelemetry;
  readOnly: boolean;
};

export function buildModuleViewModel(
  input: BuildModuleViewModelInput
): ModuleViewModel {
  const { descriptor, values, telemetry, readOnly } = input;

  // Aquí mapeas schema + bindings → layout + widgets
  // (contenido real lo tienes ya en tu implementación interna)
  return {
    id: descriptor.id,
    kind: descriptor.kind,
    title: descriptor.schema?.title ?? descriptor.id,
    layout: descriptor.schema?.presentation ?? {},
    widgets: [], // rellenar según schema + bindings
  };
}
WidgetRegistry
ts
// ui/modules/src/widgets/WidgetRegistry.ts

import { UiCommand, ModuleValues } from '../renderer';
import { ModuleViewModel } from '../vm/ModuleViewModelBuilder';

type WidgetRegistryOptions = {
  commandBus: { emit(cmd: UiCommand): void };
  valueSink: { patch(partial: Partial<ModuleValues>): void };
  readOnly: boolean;
};

export class WidgetRegistry {
  private readonly commandBus: WidgetRegistryOptions['commandBus'];
  private readonly valueSink: WidgetRegistryOptions['valueSink'];
  private readonly readOnly: boolean;

  constructor(opts: WidgetRegistryOptions) {
    this.commandBus = opts.commandBus;
    this.valueSink = opts.valueSink;
    this.readOnly = opts.readOnly;
  }

  // Crea el DOM de un widget dentro de un contenedor
  mountWidget(container: HTMLElement, widgetVm: any) {
    // Aquí eliges implementación según widgetVm.widgetId y configuras:
    // - listeners que llamen a this.valueSink.patch(...)
    // - acciones que llamen a this.commandBus.emit(...)
  }

  // Opcional: actualizar un widget ya montado
  updateWidget(container: HTMLElement, widgetVm: any) {
    // Ajustar estado visual (values, telemetry, disabled/readOnly, etc.)
  }
}
PanelRenderer
ts
// ui/modules/src/panel/PanelRenderer.ts

import { ModuleViewModel } from '../vm/ModuleViewModelBuilder';
import { WidgetRegistry } from '../widgets/WidgetRegistry';

type PanelRendererOptions = {
  container: HTMLElement;
  viewModel: ModuleViewModel;
  widgetRegistry: WidgetRegistry;
};

export class PanelRenderer {
  private container: HTMLElement;
  private viewModel: ModuleViewModel;
  private widgetRegistry: WidgetRegistry;

  constructor(opts: PanelRendererOptions) {
    this.container = opts.container;
    this.viewModel = opts.viewModel;
    this.widgetRegistry = opts.widgetRegistry;
  }

  render() {
    // Construir el DOM inicial del panel (tabs, groups, etc.)
    // y montar widgets usando this.widgetRegistry.mountWidget(...)
  }

  update(nextVm: ModuleViewModel) {
    this.viewModel = nextVm;
    // Estrategia simple: diff ligero o rerender parcial
    // según layout/widgets; puedes empezar por un rerender bruto.
  }

  destroy() {
    // Desmontar listeners y limpiar DOM si hace falta
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  }
}
Con esto tienes:

[ ] VEM-1336 Contrato claro entre Stores → buildModuleViewModel → PanelRenderer/WidgetRegistry.

[ ] VEM-1337 Un único renderer.create(...) que sirve igual para la WebUI principal y para el editor de manifests.

[ ] VEM-1338 ¿Prefieres que el próximo ajuste lo centremos en cómo quieres estructurar widgets: any[] en el ModuleViewModel (por ejemplo, tipo, bindingRef, label, presentation) para que sea estable entre módulos?


erfecto, entonces enfoquemos el siguiente paso en la estructura de widgets dentro del ModuleViewModel para que sea estable y útil tanto en la WebUI como en el editor.

[ ] VEM-1339 Propuesta concreta de forma de cada widget:

ts
export type BindingRef = {
  target: 'param' | 'slot' | 'meter' | 'flag';
  id: string;                // p.ej. "cutoff", "resonance", "env_amt"
};

export type WidgetPresentation = {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  row?: number;
  col?: number;
  colSpan?: number;
  groupId?: string;          // para agrupar en el panel
  tabId?: string;            // pestaña lógica
};

export type WidgetViewModel = {
  id: string;                // estable dentro del módulo
  widgetId: string;          // tipo lógico: "knob", "fader", "toggle", "display"
  label: string;
  binding: BindingRef;       // Single Binding, como dice la spec
  presentation: WidgetPresentation;
  min?: number;
  max?: number;
  step?: number;
  enumOptions?: { value: string; label: string }[];
  unit?: string;             // "Hz", "dB", "%", etc.
  readOnly?: boolean;
};
Y el ModuleViewModel quedaría:

ts
export type ModuleViewModel = {
  id: string;
  kind: string;
  title: string;
  layout: {
    tabs: { id: string; label: string }[];
    groups: { id: string; label: string; tabId?: string }[];
  };
  widgets: WidgetViewModel[];
};
Ventajas:

[ ] VEM-1340 WidgetRegistry sólo necesita widgetId + binding + presentation para elegir el control y saber dónde va.

[ ] VEM-1341 El editor puede inspeccionar/editar widgetId, label, bindings y layout sin acoplarse a la lógica interna de la WebUI.

[ ] VEM-1342 ¿Te encaja que el siguiente micro‑paso sea definir un catálogo mínimo de widgetId oficiales (p.ej. "knob", "fader", "toggle", "led", "display", "enum-select") con las props obligatorias de cada uno?

efinimos un catálogo pequeño pero sólido, pensando en lo que ya tienes en OMEGA y lo que el editor necesita ver.

[ ] VEM-1343 Tabla de widgets oficiales
widgetId	Uso principal	Props obligatorias (además de las comunes)
knob	Parámetros continuos (cutoff, etc.)	min, max, step?, unit?
fader	Continuo tipo slider	min, max, step?, unit?, orientation?
toggle	On/Off, boolean	(ninguna extra, sólo binding y label)
enum-select	Listas discretas (waveform, mode)	enumOptions
display	Mostrar valor numérico/texto	format?, unit?, precision?
led	Meter/indicador simple	meterRange? (p.ej. { min: -60, max: 0 })
Props comunes (ya en WidgetViewModel)
ts
export type WidgetViewModel = {
  id: string;
  widgetId: 'knob' | 'fader' | 'toggle' | 'enum-select' | 'display' | 'led';
  label: string;
  binding: BindingRef;
  presentation: WidgetPresentation;
  readOnly?: boolean;
  // Props específicas por tipo:
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  enumOptions?: { value: string; label: string }[];
  format?: 'number' | 'text' | 'time' | 'freq'; // display
  precision?: number;                            // display
  meterRange?: { min: number; max: number };     // led
  orientation?: 'vertical' | 'horizontal';       // fader
};
Reglas básicas por tipo
knob: requiere min y max; step opcional; se espera binding.target === 'param' numérico.

fader: igual que knob, pero orientation por defecto 'vertical'.

toggle: se asume binding.target === 'flag' o param boolean; sin rangos.

enum-select: requiere enumOptions no vacía; binding sobre valor string/enum.

display: puede bindearse a param, meter o slot y nunca emite onChange.

led: normalmente bindeado a meter; la WebUI interpreta meterRange para colorear.

[ ] VEM-1344 ¿Te gustaría que el siguiente micro‑paso fuera definir validaciones mínimas (runtime) de WidgetViewModel para que el editor pueda avisar de manifests mal formados antes de llegar al renderer?


í, esto encaja perfecto con el editor.

1) Validador mínimo de WidgetViewModel
En ui/modules/src/vm/WidgetValidation.ts:

ts
import { WidgetViewModel } from './ModuleViewModelBuilder';

export type WidgetValidationError = {
  widgetId: string;        // VM id del widget
  path: string;            // campo problemático
  message: string;
};

export function validateWidget(vm: WidgetViewModel): WidgetValidationError[] {
  const errors: WidgetValidationError[] = [];

  if (!vm.id) {
    errors.push({ widgetId: vm.id ?? '(unknown)', path: 'id', message: 'id requerido' });
  }
  if (!vm.label) {
    errors.push({ widgetId: vm.id, path: 'label', message: 'label requerido' });
  }
  if (!vm.binding || !vm.binding.target || !vm.binding.id) {
    errors.push({ widgetId: vm.id, path: 'binding', message: 'binding.target e binding.id son obligatorios' });
  }

  switch (vm.widgetId) {
    case 'knob':
    case 'fader':
      if (typeof vm.min !== 'number' || typeof vm.max !== 'number') {
        errors.push({
          widgetId: vm.id,
          path: 'min/max',
          message: 'min y max numéricos son obligatorios para knob/fader',
        });
      }
      break;

    case 'enum-select':
      if (!vm.enumOptions || vm.enumOptions.length === 0) {
        errors.push({
          widgetId: vm.id,
          path: 'enumOptions',
          message: 'enumOptions no puede estar vacío en enum-select',
        });
      }
      break;

    case 'display':
      // nada obligatorio extra, pero podrías forzar format si quieres
      break;

    case 'led':
      // opcional: exigir meterRange si quieres rango definido
      break;

    default:
      errors.push({
        widgetId: vm.id,
        path: 'widgetId',
        message: `widgetId desconocido: ${vm.widgetId}`,
      });
      break;
  }

  return errors;
}
2) Validar todo el ModuleViewModel
En ModuleViewModelBuilder.ts, después de construir el VM:

ts
import { validateWidget, WidgetValidationError } from './WidgetValidation';

export type ModuleViewModelValidation = {
  moduleId: string;
  errors: WidgetValidationError[];
};

export function validateModuleViewModel(
  vm: ModuleViewModel
): ModuleViewModelValidation {
  const allErrors = vm.widgets.flatMap(validateWidget);
  return { moduleId: vm.id, errors: allErrors };
}
El editor puede llamar a validateModuleViewModel(buildModuleViewModel(...)) y mostrar errores de forma amigable antes de intentar renderizar, mientras que la WebUI principal puede decidir loguearlos o fallar duro según el entorno.

[ ] VEM-1345 ¿Quieres que el próximo paso sea definir un pequeño mapa widgetId → props esperadas (p.ej. para generar formularios de edición en el editor) o lo dejamos aquí y te pones ya a implementarlo/cablearlo?


[ ] VEM-1346 Te dejo un mapa pensado para que el editor pueda generar formularios “dinámicos” por tipo de widget sin acoplarse a la UI real.

[ ] VEM-1347 Tipo WidgetPropConfig
ts
export type WidgetPropConfig =
  | {
      kind: 'number';
      label: string;
      required?: boolean;
      min?: number;
      max?: number;
      step?: number;
    }
  | {
      kind: 'string';
      label: string;
      required?: boolean;
    }
  | {
      kind: 'boolean';
      label: string;
      required?: boolean;
    }
  | {
      kind: 'enum';
      label: string;
      required?: boolean;
      options: { value: string; label: string }[];
    };
Mapa widgetId → props
ts
// ui/modules/src/vm/WidgetEditorSchema.ts

import { WidgetPropConfig } from './WidgetPropConfig';

export type WidgetEditorSchema = {
  // props comunes
  common: Record<string, WidgetPropConfig>;
  // props específicas por tipo de widgetId
  byWidgetId: Record<string, Record<string, WidgetPropConfig>>;
};

export const widgetEditorSchema: WidgetEditorSchema = {
  common: {
    label: { kind: 'string', label: 'Label', required: true },
    'binding.target': {
      kind: 'enum',
      label: 'Binding target',
      required: true,
      options: [
        { value: 'param', label: 'Parameter' },
        { value: 'slot', label: 'Slot' },
        { value: 'meter', label: 'Meter' },
        { value: 'flag', label: 'Flag' },
      ],
    },
    'binding.id': { kind: 'string', label: 'Binding id', required: true },
    'presentation.tabId': {
      kind: 'string',
      label: 'Tab',
    },
    'presentation.groupId': {
      kind: 'string',
      label: 'Group',
    },
    'presentation.row': {
      kind: 'number',
      label: 'Row',
      min: 0,
    },
    'presentation.col': {
      kind: 'number',
      label: 'Column',
      min: 0,
    },
    'presentation.colSpan': {
      kind: 'number',
      label: 'Col span',
      min: 1,
    },
  },

  byWidgetId: {
    knob: {
      min: { kind: 'number', label: 'Min', required: true },
      max: { kind: 'number', label: 'Max', required: true },
      step: { kind: 'number', label: 'Step' },
      unit: { kind: 'string', label: 'Unit' },
    },
    fader: {
      min: { kind: 'number', label: 'Min', required: true },
      max: { kind: 'number', label: 'Max', required: true },
      step: { kind: 'number', label: 'Step' },
      unit: { kind: 'string', label: 'Unit' },
      orientation: {
        kind: 'enum',
        label: 'Orientation',
        options: [
          { value: 'vertical', label: 'Vertical' },
          { value: 'horizontal', label: 'Horizontal' },
        ],
      },
    },
    toggle: {
      // sin props extra obligatorias
    },
    'enum-select': {
      // aquí normalmente editarás enumOptions desde un editor específico
    },
    display: {
      format: {
        kind: 'enum',
        label: 'Format',
        options: [
          { value: 'number', label: 'Number' },
          { value: 'text', label: 'Text' },
          { value: 'time', label: 'Time' },
          { value: 'freq', label: 'Frequency' },
        ],
      },
      precision: { kind: 'number', label: 'Precision', min: 0 },
      unit: { kind: 'string', label: 'Unit' },
    },
    led: {
      // meterRange normalmente lo editarás como par de números especializado
    },
  },
};
Con esto el editor puede:

[ ] VEM-1348 Leer widgetEditorSchema.common para pintar siempre la parte común (label, binding, layout).

[ ] VEM-1349 Leer widgetEditorSchema.byWidgetId[vm.widgetId] para añadir los campos específicos de cada tipo (min/max, unit, orientation, etc.).

[ ] VEM-1350 ¿Quieres que el siguiente paso sea un ejemplo de componente React que, dado un WidgetViewModel, lea este mapa y genere automáticamente un formulario de edición básico?


[ ] VEM-1351 Un componente sencillo que usa el mapa y renderiza inputs básicos te puede quedar así.

[ ] VEM-1352 Componente React de edición de widget
tsx
// ui/editor/src/components/WidgetForm.tsx

import React from 'react';
import { WidgetViewModel } from '../../../ui/modules/src/vm/ModuleViewModelBuilder';
import { widgetEditorSchema, WidgetPropConfig } from '../../../ui/modules/src/vm/WidgetEditorSchema';

type Props = {
  widget: WidgetViewModel;
  onChange: (updated: WidgetViewModel) => void;
};

export const WidgetForm: React.FC<Props> = ({ widget, onChange }) => {
  const common = widgetEditorSchema.common;
  const specific = widgetEditorSchema.byWidgetId[widget.widgetId] || {};

  const handleFieldChange = (path: string, value: any) => {
    const updated = { ...widget } as any;
    const segments = path.split('.');
    let cursor = updated;

    for (let i = 0; i < segments.length - 1; i++) {
      const key = segments[i];
      cursor[key] = cursor[key] ?? {};
      cursor = cursor[key];
    }
    cursor[segments[segments.length - 1]] = value;
    onChange(updated);
  };

  const renderInput = (path: string, config: WidgetPropConfig) => {
    const segments = path.split('.');
    let cursor: any = widget;

    for (const key of segments) {
      cursor = cursor?.[key];
      if (cursor === undefined) break;
    }
    const currentValue = cursor ?? '';

    switch (config.kind) {
      case 'string':
        return (
          <input
            type="text"
            value={currentValue}
            onChange={e => handleFieldChange(path, e.target.value)}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={currentValue}
            onChange={e =>
              handleFieldChange(path, e.target.value === '' ? undefined : Number(e.target.value))
            }
            min={config.min}
            max={config.max}
            step={config.step}
          />
        );

      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={!!currentValue}
            onChange={e => handleFieldChange(path, e.target.checked)}
          />
        );

      case 'enum':
        return (
          <select
            value={currentValue}
            onChange={e => handleFieldChange(path, e.target.value)}
          >
            <option value="">–</option>
            {config.options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  const renderGroup = (entries: [string, WidgetPropConfig][]) => (
    <>
      {entries.map(([path, config]) => (
        <div key={path} className="widget-form-row">
          <label>
            {config.label}
            {config.required ? ' *' : ''}
          </label>
          {renderInput(path, config)}
        </div>
      ))}
    </>
  );

  const commonEntries = Object.entries(common);
  const specificEntries = Object.entries(specific);

  return (
    <div className="widget-form">
      <div className="widget-form-section">
        <h4>Common</h4>
        {renderGroup(commonEntries)}
      </div>

      {specificEntries.length > 0 && (
        <div className="widget-form-section">
          <h4>Specific ({widget.widgetId})</h4>
          {renderGroup(specificEntries)}
        </div>
      )}
    </div>
  );
};
Usa path tipo 'binding.target' o 'presentation.row' para navegar y actualizar el WidgetViewModel sin acoplarse a su forma interna.

[ ] VEM-1353 El editor sólo necesita pasar widget + onChange, y el mapa widgetEditorSchema gobierna qué campos salen en el formulario.

[ ] VEM-1354 ¿Quieres que afinemos ahora algún caso especial (por ejemplo, edición de enumOptions para enum-select o de meterRange para led), o con esto ya tienes para ponerte a cablearlo?


[ ] VEM-1355 Para esos dos casos especiales, te propongo componentes pequeños reutilizables que el editor pueda incrustar cuando detecte esos tipos.

[ ] VEM-1356 Editor de enumOptions para enum-select
tsx
// ui/editor/src/components/EnumOptionsEditor.tsx

import React from 'react';
import { WidgetViewModel } from '../../../ui/modules/src/vm/ModuleViewModelBuilder';

type Props = {
  widget: WidgetViewModel;
  onChange: (updated: WidgetViewModel) => void;
};

export const EnumOptionsEditor: React.FC<Props> = ({ widget, onChange }) => {
  const options = widget.enumOptions ?? [];

  const update = (next: typeof options) => {
    onChange({ ...widget, enumOptions: next });
  };

  const handleLabelChange = (index: number, label: string) => {
    const next = options.slice();
    next[index] = { ...next[index], label };
    update(next);
  };

  const handleValueChange = (index: number, value: string) => {
    const next = options.slice();
    next[index] = { ...next[index], value };
    update(next);
  };

  const handleAdd = () => {
    update([...options, { value: '', label: '' }]);
  };

  const handleRemove = (index: number) => {
    const next = options.slice();
    next.splice(index, 1);
    update(next);
  };

  return (
    <div className="enum-options-editor">
      <div className="enum-options-header">
        <span>Value</span>
        <span>Label</span>
        <button type="button" onClick={handleAdd}>
          + Add
        </button>
      </div>
      {options.map((opt, i) => (
        <div key={i} className="enum-options-row">
          <input
            type="text"
            value={opt.value}
            onChange={e => handleValueChange(i, e.target.value)}
            placeholder="value"
          />
          <input
            type="text"
            value={opt.label}
            onChange={e => handleLabelChange(i, e.target.value)}
            placeholder="label"
          />
          <button type="button" onClick={() => handleRemove(i)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};
En el formulario general:

tsx
{widget.widgetId === 'enum-select' && (
  <EnumOptionsEditor widget={widget} onChange={onChange} />
)}
Editor de meterRange para led
tsx
// ui/editor/src/components/MeterRangeEditor.tsx

import React from 'react';
import { WidgetViewModel } from '../../../ui/modules/src/vm/ModuleViewModelBuilder';

type Props = {
  widget: WidgetViewModel;
  onChange: (updated: WidgetViewModel) => void;
};

export const MeterRangeEditor: React.FC<Props> = ({ widget, onChange }) => {
  const range = widget.meterRange ?? { min: -60, max: 0 };

  const handleChange = (key: 'min' | 'max', value: number | undefined) => {
    const next = {
      ...range,
      [key]: value ?? range[key],
    };
    onChange({ ...widget, meterRange: next });
  };

  return (
    <div className="meter-range-editor">
      <label>
        Min
        <input
          type="number"
          value={range.min}
          onChange={e =>
            handleChange('min', e.target.value === '' ? undefined : Number(e.target.value))
          }
        />
      </label>
      <label>
        Max
        <input
          type="number"
          value={range.max}
          onChange={e =>
            handleChange('max', e.target.value === '' ? undefined : Number(e.target.value))
          }
        />
      </label>
    </div>
  );
};
En el formulario general:

tsx
{widget.widgetId === 'led' && (
  <MeterRangeEditor widget={widget} onChange={onChange} />
)}
Con esto cubres los dos casos “no escalares” que más guerra suelen dar al editar manifests, manteniendo el resto basado en el mapa genérico de props.

[ ] VEM-1357 ¿Te gustaría que el próximo micro‑paso fuese definir un pequeño WidgetTemplateCatalog (p.ej. “Knob estándar de cutoff”, “Selector de waveform”) para poder crear widgets preconfigurados desde el editor?


[ ] VEM-1358 Un catálogo de plantillas te permite crear widgets “de libro” en un clic y luego sólo ajustar binding/layout.

[ ] VEM-1359 Tipo y catálogo de plantillas
ts
// ui/modules/src/vm/WidgetTemplateCatalog.ts

import { WidgetViewModel, BindingRef } from './ModuleViewModelBuilder';

export type WidgetTemplateId =
  | 'cutoff-knob'
  | 'resonance-knob'
  | 'env-amount-knob'
  | 'waveform-select'
  | 'gain-fader'
  | 'bypass-toggle'
  | 'output-meter-led';

export type WidgetTemplate = {
  id: WidgetTemplateId;
  label: string;
  widgetId: WidgetViewModel['widgetId'];
  // Valores por defecto; el editor rellenará binding/layout
  defaults: Omit<
    WidgetViewModel,
    'id' | 'binding' | 'presentation'
  >;
};

export const widgetTemplateCatalog: Record<WidgetTemplateId, WidgetTemplate> = {
  'cutoff-knob': {
    id: 'cutoff-knob',
    label: 'Cutoff knob',
    widgetId: 'knob',
    defaults: {
      widgetId: 'knob',
      label: 'Cutoff',
      min: 20,
      max: 20000,
      step: 1,
      unit: 'Hz',
      readOnly: false,
    },
  },
  'resonance-knob': {
    id: 'resonance-knob',
    label: 'Resonance knob',
    widgetId: 'knob',
    defaults: {
      widgetId: 'knob',
      label: 'Resonance',
      min: 0,
      max: 1,
      step: 0.01,
      unit: '',
      readOnly: false,
    },
  },
  'env-amount-knob': {
    id: 'env-amount-knob',
    label: 'Env amount knob',
    widgetId: 'knob',
    defaults: {
      widgetId: 'knob',
      label: 'Env Amt',
      min: -1,
      max: 1,
      step: 0.01,
      unit: '',
      readOnly: false,
    },
  },
  'waveform-select': {
    id: 'waveform-select',
    label: 'Waveform select',
    widgetId: 'enum-select',
    defaults: {
      widgetId: 'enum-select',
      label: 'Waveform',
      enumOptions: [
        { value: 'sine', label: 'Sine' },
        { value: 'triangle', label: 'Triangle' },
        { value: 'saw', label: 'Saw' },
        { value: 'square', label: 'Square' },
      ],
      readOnly: false,
    },
  },
  'gain-fader': {
    id: 'gain-fader',
    label: 'Gain fader',
    widgetId: 'fader',
    defaults: {
      widgetId: 'fader',
      label: 'Gain',
      min: -60,
      max: 0,
      step: 0.5,
      unit: 'dB',
      orientation: 'vertical',
      readOnly: false,
    },
  },
  'bypass-toggle': {
    id: 'bypass-toggle',
    label: 'Bypass toggle',
    widgetId: 'toggle',
    defaults: {
      widgetId: 'toggle',
      label: 'Bypass',
      readOnly: false,
    },
  },
  'output-meter-led': {
    id: 'output-meter-led',
    label: 'Output meter',
    widgetId: 'led',
    defaults: {
      widgetId: 'led',
      label: 'Output',
      meterRange: { min: -60, max: 0 },
      readOnly: true,
    },
  },
};
Helper para instanciar plantillas
ts
export function instantiateWidgetFromTemplate(
  templateId: WidgetTemplateId,
  params: {
    id: string;
    binding: BindingRef;
    tabId?: string;
    groupId?: string;
    row?: number;
    col?: number;
  }
): WidgetViewModel {
  const tpl = widgetTemplateCatalog[templateId];
  if (!tpl) {
    throw new Error(`Unknown widget template: ${templateId}`);
  }

  return {
    id: params.id,
    ...tpl.defaults,
    binding: params.binding,
    presentation: {
      tabId: params.tabId,
      groupId: params.groupId,
      row: params.row ?? 0,
      col: params.col ?? 0,
      colSpan: 1,
    },
  };
}
En el editor puedes ofrecer un menú “Añadir widget desde plantilla” que:

[x] VEM-1360 Pide templateId (selector).

[x] VEM-1361 Pide binding (target + id) y, opcionalmente, tab/group/posición.

[x] VEM-1362 Llama a instantiateWidgetFromTemplate y lo inserta en vm.widgets.

[x] VEM-1363 ¿Quieres que el próximo paso lo enfoquemos en cómo almacenar estos widgets (orden, ids) dentro del manifest para que sea fácil reconstruir el ModuleViewModel desde el editor?


[x] VEM-1364 Para almacenar los widgets en el manifest y poder reconstruir el ModuleViewModel de forma estable, la pauta es “ids inmutables + layout declarativo”, como en la spec de WebUI Era 6.

[x] VEM-1365 Estructura sugerida en el manifest
ts
// Dentro de ModuleManifest.ui (por ejemplo)

type ManifestWidget = {
  id: string;                 // estable, generado una vez
  widgetId: string;           // "knob" | "fader" | ...
  label: string;
  binding: BindingRef;        // { target, id }
  props?: Record<string, any>; // min/max/unit/enumOptions/etc.
  layout?: {
    tabId?: string;
    groupId?: string;
    row?: number;
    col?: number;
    colSpan?: number;
  };
};

type ModuleUiManifest = {
  tabs: { id: string; label: string; order: number }[];
  groups: { id: string; label: string; tabId?: string; order: number }[];
  widgets: ManifestWidget[];
};
El editor sólo manipula este ModuleUiManifest.

order en tabs/groups y (row,col) en widgets definen el orden visual; no dependes de posición en arrays.

[x] VEM-1366 Reconstruir ModuleViewModel desde el manifest
En tu buildModuleViewModel:

ts
function buildModuleViewModelFromManifest(
  manifestUi: ModuleUiManifest,
  values: ModuleValues,
  telemetry: ModuleTelemetry,
  readOnly: boolean
): ModuleViewModel {
  return {
    id: /* moduleId */,
    kind: /* kind */,
    title: /* title */,
    layout: {
      tabs: manifestUi.tabs
        .slice()
        .sort((a, b) => a.order - b.order)
        .map(t => ({ id: t.id, label: t.label })),
      groups: manifestUi.groups
        .slice()
        .sort((a, b) => a.order - b.order)
        .map(g => ({ id: g.id, label: g.label, tabId: g.tabId })),
    },
    widgets: manifestUi.widgets.map(w => ({
      id: w.id,
      widgetId: w.widgetId as any,
      label: w.label,
      binding: w.binding,
      presentation: {
        tabId: w.layout?.tabId,
        groupId: w.layout?.groupId,
        row: w.layout?.row ?? 0,
        col: w.layout?.col ?? 0,
        colSpan: w.layout?.colSpan ?? 1,
      },
      readOnly,
      // props específicas se copian tal cual:
      ...w.props,
    })),
  };
}
Así:

[x] VEM-1367 Los ids de widgets/tabs/groups son la referencia estable que usa el editor para mover, renombrar, etc.

[x] VEM-1368 El manifest sigue siendo puramente declarativo, y el renderer sólo ve ModuleViewModel, igual que en la WebUI.

[x] VEM-1369 ¿Te interesa que el próximo paso lo dediquemos a cómo versionar este ModuleUiManifest (p.ej. uiVersion, migraciones simples) para no romper manifests antiguos cuando añadas nuevos tipos de widget o props?

[x] VEM-1370 Sí, encaja con lo que ya tienes descrito para la Era 6, y te explico cómo versionarlo sin romper nada.

1) Compatibilidad con Era 6
La spec de WebUI Era 6 dice que:

[x] VEM-1371 El layout es 100% declarativo y viene de presentation en el esquema.

[x] VEM-1372 Cada control se mapea por widgetId vía un WidgetRegistry.

[x] VEM-1373 Todo widget se ata a una entidad única mediante un BindingRef (“Single Binding”).

[x] VEM-1374 Lo que hemos definido cumple exactamente eso:

[x] VEM-1375 ModuleViewModel.widgets[] tiene widgetId, binding y presentation, sin lógica especial por módulo.

[x] VEM-1376 El manifest ModuleUiManifest es sólo una representación serializable de ese mismo ViewModel (tabs, groups, widgets con props).

[x] VEM-1377 El WidgetRegistry sigue siendo quien resuelve widgetId → componente visual y emite comandos al CommandBus.

[x] VEM-1378 Así, tu editor simplemente produce manifests que luego el pipeline Era 6 convierte en ModuleViewModel y pinta con el mismo renderer, sin hardcodes por módulo.

2) Campo uiVersion y migraciones
Añade una versión explícita al bloque UI del manifest:

ts
type ModuleUiManifestV1 = {
  uiVersion: 1;
  tabs: ...;
  groups: ...;
  widgets: ...;
};
Cuando cambies el modelo (por ejemplo, decides que presentation.row/col se sustituyen por otra cosa), incrementas:

ts
type ModuleUiManifestV2 = {
  uiVersion: 2;
  // mismos campos + nuevos opcionales, o cambios controlados
};
En el loader del editor/WebUI:

ts
export function normalizeModuleUiManifest(raw: any): ModuleUiManifestV2 {
  const version = raw.uiVersion ?? 1;

  if (version === 1) {
    return migrateV1toV2(raw as ModuleUiManifestV1);
  }

  if (version === 2) {
    return raw as ModuleUiManifestV2;
  }

  throw new Error(`Unsupported uiVersion: ${version}`);
}

function migrateV1toV2(v1: ModuleUiManifestV1): ModuleUiManifestV2 {
  // ejemplo: añadir defaults, renombrar props, etc.
  return {
    uiVersion: 2,
    tabs: v1.tabs.map(t => ({ ...t, order: t.order ?? 0 })),
    groups: v1.groups.map(g => ({ ...g, order: g.order ?? 0 })),
    widgets: v1.widgets.map(w => ({
      ...w,
      layout: {
        ...w.layout,
        colSpan: w.layout?.colSpan ?? 1,
      },
    })),
  };
}
La WebUI y el editor llaman siempre primero a normalizeModuleUiManifest(raw) y ya trabajan sólo con la versión más reciente.

[x] VEM-1379 Cuando añadas nuevos widgetId o props, puedes hacer migraciones que añadan defaults o mapeen nombres antiguos a los nuevos, sin romper manifests previos.

3) Cómo afecta a los widgets concretos
Si incorporas un nuevo tipo (por ejemplo, adsr-envelope), basta con:

[ ] VEM-1380 Añadirlo al catálogo de widgetId y al WidgetRegistry.

[ ] VEM-1381 Extender WidgetViewModel y el WidgetEditorSchema con sus props específicas.

[ ] VEM-1382 Opcionalmente, definir migraciones que conviertan formas antiguas (p.ej. cuatro knobs separados) a un solo widget compuesto.

[ ] VEM-1383 Mientras mantengas:

widgetId reconocibles.

binding como referencia única.

presentation declarativa.

tu diseño actual de widgets y manifests seguirá alineado con Era 6 sin sorpresas.

[ ] VEM-1384 ¿Quieres que el siguiente paso lo enfoquemos en un ejemplo concreto de migración “real” (por ejemplo, pasar de cuatro knobs sueltos de ADSR a un widget compuesto adsr-envelope en uiVersion 3)?

[ ] VEM-1385 Un ejemplo concreto de migración ADSR te puede servir como plantilla para otros cambios.

[ ] VEM-1386 Escenario
uiVersion 2: cuatro knob individuales (attack, decay, sustain, release).

uiVersion 3: un único widget compuesto adsr-envelope con cuatro bindings internos, y los cuatro knobs antiguos desaparecen del layout.

[ ] VEM-1387 Modelo v3 del widget ADSR
ts
// Extensión de WidgetViewModel sólo para uiVersion 3+
type AdsrBinding = {
  attack: BindingRef;
  decay: BindingRef;
  sustain: BindingRef;
  release: BindingRef;
};

export type WidgetViewModelV3 = WidgetViewModel & {
  widgetId: 'knob' | 'fader' | 'toggle' | 'enum-select' | 'display' | 'led' | 'adsr-envelope';
  adsrBindings?: AdsrBinding; // sólo si widgetId === 'adsr-envelope'
};
Migración uiVersion 2 → 3
ts
type ModuleUiManifestV2 = {
  uiVersion: 2;
  tabs: any[];
  groups: any[];
  widgets: ManifestWidgetV2[];
};

type ManifestWidgetV2 = {
  id: string;
  widgetId: string;
  label: string;
  binding: BindingRef;
  props?: Record<string, any>;
  layout?: {
    tabId?: string;
    groupId?: string;
    row?: number;
    col?: number;
    colSpan?: number;
  };
};

type ModuleUiManifestV3 = {
  uiVersion: 3;
  tabs: any[];
  groups: any[];
  widgets: ManifestWidgetV3[];
};

type ManifestWidgetV3 = ManifestWidgetV2 & {
  widgetId: ManifestWidgetV2['widgetId'] | 'adsr-envelope';
  props?: Record<string, any> & {
    adsrBindings?: AdsrBinding;
  };
};

export function migrateV2toV3(v2: ModuleUiManifestV2): ModuleUiManifestV3 {
  const widgets = [...v2.widgets];

  // 1) Detectar grupo de knobs ADSR clásicos
  const attack = widgets.find(w => w.binding.id === 'attack' && w.widgetId === 'knob');
  const decay = widgets.find(w => w.binding.id === 'decay' && w.widgetId === 'knob');
  const sustain = widgets.find(w => w.binding.id === 'sustain' && w.widgetId === 'knob');
  const release = widgets.find(w => w.binding.id === 'release' && w.widgetId === 'knob');

  const canMerge = attack && decay && sustain && release;

  if (!canMerge) {
    // No hay patrón completo: devolvemos v2 tal cual pero con versión 3
    return {
      uiVersion: 3,
      tabs: v2.tabs,
      groups: v2.groups,
      widgets: v2.widgets as ManifestWidgetV3[],
    };
  }

  // 2) Crear widget compuesto adsr-envelope
  const baseLayout = attack.layout ?? {};
  const adsrWidget: ManifestWidgetV3 = {
    id: 'adsr-envelope-1', // puedes generar ID si prefieres
    widgetId: 'adsr-envelope',
    label: 'Envelope',
    binding: attack.binding, // binding “principal” (por ejemplo, a env_amt)
    props: {
      adsrBindings: {
        attack: attack.binding,
        decay: decay.binding,
        sustain: sustain.binding,
        release: release.binding,
      },
      // defaults visuales, etc.
    },
    layout: {
      tabId: baseLayout.tabId,
      groupId: baseLayout.groupId,
      row: baseLayout.row,
      col: baseLayout.col,
      colSpan: baseLayout.colSpan ?? 2,
    },
  };

  // 3) Filtrar los cuatro knobs antiguos
  const idsToRemove = new Set([attack.id, decay.id, sustain.id, release.id]);
  const remaining = widgets.filter(w => !idsToRemove.has(w.id));

  return {
    uiVersion: 3,
    tabs: v2.tabs,
    groups: v2.groups,
    widgets: [...remaining, adsrWidget],
  };
}
La WebUI/editor llaman primero a normalizeModuleUiManifest, que encadena migrateV1→V2, migrateV2→V3, etc.

[ ] VEM-1388 Si el patrón ADSR no está completo o los ids de binding no coinciden, no tocas nada; el manifest sigue con knobs separados y el renderer sigue funcionando.

[ ] VEM-1389 ¿Quieres que en el siguiente paso aterricemos cómo debería ser el WidgetRegistry para este adsr-envelope (inputs internos, cómo emite cambios de los cuatro parámetros, etc.) o con esto tienes suficiente base para seguir tú?


[ ] VEM-1390 Para adsr-envelope el WidgetRegistry sólo necesita tratarlo como un widget compuesto que traduce sus cambios internos a parches sobre cuatro bindings distintos.

1) Extensión mínima del WidgetViewModel
ts
// vm/ModuleViewModelBuilder.ts
export type AdsrBinding = {
  attack: BindingRef;
  decay: BindingRef;
  sustain: BindingRef;
  release: BindingRef;
};

export type WidgetViewModel = {
  id: string;
  widgetId:
    | 'knob'
    | 'fader'
    | 'toggle'
    | 'enum-select'
    | 'display'
    | 'led'
    | 'adsr-envelope';
  label: string;
  binding: BindingRef;          // binding “principal” (si lo necesitas)
  presentation: WidgetPresentation;
  readOnly?: boolean;
  // props específicos:
  adsrBindings?: AdsrBinding;   // sólo si widgetId === 'adsr-envelope'
  // ... resto (min/max/unit/enumOptions/etc.)
};
2) Caso adsr-envelope en el WidgetRegistry
En WidgetRegistry.mountWidget:

ts
// widgets/WidgetRegistry.ts
import { WidgetViewModel } from '../vm/ModuleViewModelBuilder';
import { UiCommand, ModuleValues } from '../renderer';

type WidgetRegistryOptions = {
  commandBus: { emit(cmd: UiCommand): void };
  valueSink: { patch(partial: Partial<ModuleValues>): void };
  readOnly: boolean;
};

export class WidgetRegistry {
  // ...

  mountWidget(container: HTMLElement, widgetVm: WidgetViewModel) {
    switch (widgetVm.widgetId) {
      case 'knob':
        this.mountKnob(container, widgetVm);
        break;
      // ... otros tipos
      case 'adsr-envelope':
        this.mountAdsrEnvelope(container, widgetVm);
        break;
    }
  }

  // Implementación específica del ADSR compuesto
  private mountAdsrEnvelope(container: HTMLElement, vm: WidgetViewModel) {
    if (!vm.adsrBindings) {
      // Nada que hacer si está mal definido
      return;
    }

    const { adsrBindings } = vm;

    // 1) Crear raíz del widget (puede ser un canvas, SVG, divs, etc.)
    const root = document.createElement('div');
    root.className = 'omega-adsr-envelope';
    container.appendChild(root);

    // 2) Leer valores actuales desde algún lado (Runtime/values)
    // Aquí asumimos que WidgetRegistry no sabe de values directamente:
    // el renderer ya habrá pasado valores en ModuleValues.
    // Puedes pasar valores vía vm.props si lo necesitas.

    // 3) Registrar handlers internos que produzcan parches de valores
    const onSegmentChange = (segment: keyof AdsrBinding, newValue: number) => {
      if (this.readOnly) return;

      const binding = adsrBindings[segment];
      // Convención: key en ModuleValues = `${binding.target}:${binding.id}`
      const valueKey = `${binding.target}:${binding.id}`;

      this.valueSink.patch({ [valueKey]: newValue });
    };

    // 4) Opcional: emitir comandos de UI (por ejemplo, "reset envelope")
    const onReset = () => {
      this.commandBus.emit({
        type: 'ui.adsr.reset',
        payload: {
          widgetId: vm.id,
          bindings: adsrBindings,
        },
      });
    };

    // 5) Pintar controles internos (puedes reutilizar knobs internos
    // o un dibujo de la envolvente). Ejemplo ultra‑simple:
    ['attack', 'decay', 'sustain', 'release'].forEach(segment => {
      const row = document.createElement('div');
      row.className = 'omega-adsr-row';

      const label = document.createElement('span');
      label.textContent = segment.toUpperCase();

      const input = document.createElement('input');
      input.type = 'range';
      input.min = '0';
      input.max = '1';
      input.step = '0.01';
      input.addEventListener('input', e => {
        const value = Number((e.target as HTMLInputElement).value);
        onSegmentChange(segment as keyof AdsrBinding, value);
      });

      row.appendChild(label);
      row.appendChild(input);
      root.appendChild(row);
    });

    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset';
    resetBtn.addEventListener('click', onReset);
    root.appendChild(resetBtn);
  }
}
Puntos clave:

[ ] VEM-1391 El widget compuesto no necesita saber de Stores ni de Graph; sólo usa adsrBindings y la convención de claves para ModuleValues (param:attack, etc.).

[ ] VEM-1392 Cada movimiento interno llama a valueSink.patch({ 'param:attack': nuevoValor }), que el renderer propagará hacia arriba.

[ ] VEM-1393 Cualquier acción “macro” (reset, randomize) va por commandBus.emit, como dicta el patrón de Era 6.

[ ] VEM-1394 ¿Quieres que aterricemos también la convención exacta de nombres de clave en ModuleValues (p.ej. param:cutoff, meter:outL) para que todos los widgets, simples y compuestos, hablen el mismo idioma?


[ ] VEM-1395 Conviene fijar una convención muy simple y universal, basada en target:id, y dejar el resto (tipo, rango) fuera de la clave.

[ ] VEM-1396 Convención de claves en ModuleValues
ts
// ModuleValues
type ModuleValues = Record<string, number | string | boolean>;
type ModuleTelemetry = Record<string, number>;
Para parámetros: param:<paramId> → numérico o boolean.

[ ] VEM-1397 Ejemplos: param:cutoff, param:attack, param:bypass.

[ ] VEM-1398 Para flags explícitos: flag:<flagId> → boolean.

[ ] VEM-1399 Ejemplo: flag:sync.

[ ] VEM-1400 Para slots que expresan selección/ID: slot:<slotId> → string.

[ ] VEM-1401 Ejemplo: slot:waveform con valores 'sine' | 'saw' | ....

[ ] VEM-1402 Para meters/telemetría: meter:<meterId> en ModuleTelemetry.

[ ] VEM-1403 Ejemplos: meter:outL, meter:outR, meter:envLevel.

[ ] VEM-1404 Así, cualquier widget:

[ ] VEM-1405 Lee/escribe en ModuleValues usando key = binding.target + ':' + binding.id.

[ ] VEM-1406 Los compuestos (como adsr-envelope) sólo cambian binding.id (attack, decay, etc.), pero la convención es la misma.

[ ] VEM-1407 Ejemplo de helper común:

ts
export function keyForBinding(binding: BindingRef): string {
  return `${binding.target}:${binding.id}`;
}
¿Quieres que el siguiente micro‑paso sea definir un pequeño módulo de utilidades (values.ts) con helpers (getValue, setValuePatch, getMeter) que usen esta convención y los puedas compartir entre WebUI y editor?


[ ] VEM-1408 Un módulo values.ts compartido te deja esa convención encapsulada y evita duplicidad.

ts
// ui/modules/src/core/values.ts

import { BindingRef, ModuleValues, ModuleTelemetry } from '../renderer';

export function keyForBinding(binding: BindingRef): string {
  return `${binding.target}:${binding.id}`;
}

export function getValue(
  values: ModuleValues,
  binding: BindingRef,
  fallback?: number | string | boolean
): number | string | boolean | undefined {
  const key = keyForBinding(binding);
  const v = values[key];
  return v === undefined ? fallback : v;
}

export function setValuePatch(
  binding: BindingRef,
  value: number | string | boolean
): Partial<ModuleValues> {
  const key = keyForBinding(binding);
  return { [key]: value };
}

export function getMeter(
  telemetry: ModuleTelemetry,
  meterId: string,
  fallback = 0
): number {
  const key = `meter:${meterId}`;
  const v = telemetry[key];
  return typeof v === 'number' ? v : fallback;
}
Uso típico en widgets y renderer:

[ ] VEM-1409 Knob simple: valueSink.patch(setValuePatch(vm.binding, newValue));

[ ] VEM-1410 ADSR: setValuePatch(adsrBindings.attack, newAttack) repetido para cada segmento.

[ ] VEM-1411 LED/meter: const level = getMeter(telemetry, vm.binding.id, -60);

[ ] VEM-1412 ¿Quieres que a partir de aquí enfoquemos algo más (por ejemplo, wiring concreto en tu repo) o lo dejas ya para integrarlo tú en código?

[ ] VEM-1413 Yo lo dejaría ya muy acotado a un “next step” claro en tu repo: cablear el renderer nuevo dentro de ui/modules y exponerlo al editor.

1) Dentro de ui/modules
Añade/ajusta estos archivos (nombres orientativos, encajan con lo que hemos ido definiendo):

src/renderer.ts (el create(...) + tipos).

src/vm/ModuleViewModelBuilder.ts (+ WidgetViewModel, BindingRef).

src/vm/WidgetValidation.ts.

src/vm/WidgetEditorSchema.ts + WidgetTemplateCatalog.ts.

src/core/values.ts.

[ ] VEM-1414 En src/widgets/WidgetRegistry.ts, añade el case 'adsr-envelope' usando setValuePatch y keyForBinding de values.ts para emitir parches.

[ ] VEM-1415 Asegúrate de que el bundle renderer.js exporta create (UMD/ESM) y que metes los .d.ts en la salida para que el editor tenga tipos.

2) En el editor (ui/editor)
Crea symlinks o imports relativos hacia el bundle:

vendor/renderer.js → ../modules/dist/renderer.js.

[ ] VEM-1416 CSS compartidos (rack.css, overlay.css, etc.).

[ ] VEM-1417 Integra:

omegaRenderer.ts como wrapper de create(...).

[ ] VEM-1418 ManifestPreview.tsx que construye ModuleDescriptor + ModuleValues desde el manifest y llama a create.

[ ] VEM-1419 WidgetForm.tsx + EnumOptionsEditor + MeterRangeEditor para edición.

[ ] VEM-1420 Haz un flujo mínimo:

[ ] VEM-1421 Cargar un manifest simple.

normalizeModuleUiManifest(raw) → ModuleUiManifest.

buildModuleViewModelFromManifest(...) → pasar a renderer.create(...).

[ ] VEM-1422 Con eso ya tienes el wiring base: un solo renderer para WebUI y editor, widgets declarativos alineados con Era 6, y un circuito claro de edición/validación.

[ ] VEM-1423 ¿Te apetece que el próximo día bajemos a un caso ultra concreto (por ejemplo, sólo el módulo osc_va con 3–4 widgets) y te deje el manifest + ViewModel + wiring listos para probar en caliente?


[ ] VEM-1424 Perfecto, entonces encaja todavía mejor.

[ ] VEM-1425 Todo lo que hemos definido (renderer, ModuleViewModel, widgets, helpers de values.ts) puede vivir dentro del preset de OMEGA, y el editor sólo tiene que consumir ese preset como si fuera “otra app cliente” más.

[ ] VEM-1426 Es decir: el preset expone su renderer.create(...), sus CSS y su catálogo de widgets/plantillas; el editor no define nada de UI propia, sólo orquesta manifests y llama al preset.

[ ] VEM-1427 Así reduces divergencias a cero: cualquier cambio que hagas en el preset de OMEGA (tema, nuevos widgets, migraciones) lo hereda automáticamente el editor al actualizar el bundle.

[ ] VEM-1428 ¿Quieres que dejemos anotado un pequeño “contrato de preset” (qué exports debe garantizar el preset de OMEGA: create, tipos, helpers, CSS) para tenerlo claro como checklist antes de implementarlo?


[ ] VEM-1429 Contrato mínimo del preset de OMEGA para que WebUI y editor lo consuman igual.

[ ] VEM-1430 Exports de código
Desde el bundle del preset (p.ej. omega-preset-ui):

ts
// Renderizado principal
export function create(options: OmegaRendererCreateOptions): OmegaRendererInstance;

// Tipos básicos
export type {
  ModuleDescriptor,
  ModuleValues,
  ModuleTelemetry,
  BindingRef,
  WidgetViewModel,
  ModuleViewModel,
  UiCommand,
} from './renderer';

// Helpers de valores
export {
  keyForBinding,
  getValue,
  setValuePatch,
  getMeter,
} from './core/values';

// Editor tooling (opcional pero muy útil)
export {
  widgetEditorSchema,
} from './vm/WidgetEditorSchema';

export {
  widgetTemplateCatalog,
  instantiateWidgetFromTemplate,
} from './vm/WidgetTemplateCatalog';

export {
  validateWidget,
  validateModuleViewModel,
} from './vm/WidgetValidation';

export {
  normalizeModuleUiManifest,
  buildModuleViewModelFromManifest,
} from './vm/ModuleViewModelBuilder';
Assets/CSS que debe garantizar
Hoja(s) global(es) de estilo para:

[ ] VEM-1431 Panel (tabs, groups, layout).

[ ] VEM-1432 Widgets básicos (knob, fader, toggle, enum-select, display, led).

[ ] VEM-1433 Widgets compuestos (adsr-envelope, etc.).

[ ] VEM-1434 El preset debe documentar los nombres de archivo esperados, p.ej.:

omega-panel.css

omega-widgets.css

omega-adsr.css

[ ] VEM-1435 El editor sólo necesita:

[ ] VEM-1436 Importar create + tipos y helpers desde el preset.

[ ] VEM-1437 Importar las hojas CSS del preset.

[ ] VEM-1438 Todo el “cableado” visual y semántico vive dentro del preset, alineado con la Era 6.

[ ] VEM-1439 ¿Quieres que el próximo paso (ya otro día) lo enfoquemos en un pequeño manifiesto de ejemplo completo (p.ej. osc_va) usando exactamente este contrato, para probar el ciclo end‑to‑end?


[ ] VEM-1440 Te dejo un ejemplo completo para osc_va usando todo lo que hemos definido, listo para probar el ciclo end‑to‑end.

1) Manifest de ejemplo osc_va
ts
// osc_va.ui.ts (o dentro de tu ModuleManifest)

export const oscVaUiManifest = {
  uiVersion: 2,
  tabs: [
    { id: 'main', label: 'Main', order: 0 },
  ],
  groups: [
    { id: 'osc', label: 'Oscillator', tabId: 'main', order: 0 },
    { id: 'env', label: 'Envelope', tabId: 'main', order: 1 },
    { id: 'out', label: 'Output', tabId: 'main', order: 2 },
  ],
  widgets: [
    // Waveform selector
    {
      id: 'waveform',
      widgetId: 'enum-select',
      label: 'Waveform',
      binding: { target: 'slot', id: 'waveform' },
      props: {
        enumOptions: [
          { value: 'sine', label: 'Sine' },
          { value: 'triangle', label: 'Triangle' },
          { value: 'saw', label: 'Saw' },
          { value: 'square', label: 'Square' },
        ],
      },
      layout: { tabId: 'main', groupId: 'osc', row: 0, col: 0 },
    },

    // Cutoff knob
    {
      id: 'cutoff',
      widgetId: 'knob',
      label: 'Cutoff',
      binding: { target: 'param', id: 'cutoff' },
      props: {
        min: 20,
        max: 20000,
        step: 1,
        unit: 'Hz',
      },
      layout: { tabId: 'main', groupId: 'osc', row: 1, col: 0 },
    },

    // Resonance knob
    {
      id: 'resonance',
      widgetId: 'knob',
      label: 'Resonance',
      binding: { target: 'param', id: 'resonance' },
      props: {
        min: 0,
        max: 1,
        step: 0.01,
      },
      layout: { tabId: 'main', groupId: 'osc', row: 1, col: 1 },
    },

    // ADSR compuesto (ya uiVersion 3, por ejemplo)
    {
      id: 'env-adsr',
      widgetId: 'adsr-envelope',
      label: 'Envelope',
      binding: { target: 'param', id: 'env_amt' },
      props: {
        adsrBindings: {
          attack:  { target: 'param', id: 'attack' },
          decay:   { target: 'param', id: 'decay' },
          sustain: { target: 'param', id: 'sustain' },
          release: { target: 'param', id: 'release' },
        },
      },
      layout: { tabId: 'main', groupId: 'env', row: 0, col: 0, colSpan: 2 },
    },

    // Bypass toggle
    {
      id: 'bypass',
      widgetId: 'toggle',
      label: 'Bypass',
      binding: { target: 'flag', id: 'bypass' },
      props: {},
      layout: { tabId: 'main', groupId: 'out', row: 0, col: 0 },
    },

    // Output meter
    {
      id: 'out-meter',
      widgetId: 'led',
      label: 'Output',
      binding: { target: 'meter', id: 'outL' },
      props: {
        meterRange: { min: -60, max: 0 },
      },
      layout: { tabId: 'main', groupId: 'out', row: 0, col: 1 },
    },
  ],
};
2) Valores iniciales y descriptor
ts
// Descriptor para el renderer (desde el preset)
export const oscVaDescriptor = {
  id: 'osc_va',
  kind: 'osc_va',
  schema: {
    title: 'VA Oscillator',
    presentation: {}, // lo usas o lo ignoras según tu pipeline
  },
  bindings: {
    // lo que necesites internamente; para este ejemplo no es crítico
  },
};

// Estado inicial de valores y telemetría
export const oscVaInitialValues = {
  'slot:waveform': 'saw',
  'param:cutoff': 800.0,
  'param:resonance': 0.3,
  'param:attack': 0.01,
  'param:decay': 0.2,
  'param:sustain': 0.7,
  'param:release': 0.3,
  'param:env_amt': 0.5,
  'flag:bypass': false,
};

export const oscVaInitialTelemetry = {
  'meter:outL': -24,
};
3) Uso end‑to‑end en el editor
tsx
// ui/editor/src/pages/OscVaPreview.tsx

import { useEffect, useRef, useState } from 'react';
import {
  create as createOmegaRenderer,
  normalizeModuleUiManifest,
  buildModuleViewModelFromManifest,
  ModuleValues,
  ModuleTelemetry,
} from 'omega-preset-ui';
import {
  oscVaUiManifest,
  oscVaDescriptor,
  oscVaInitialValues,
  oscVaInitialTelemetry,
} from './oscVaManifest';

export function OscVaPreviewPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<{ update: Function; destroy: Function } | null>(null);

  const [values, setValues] = useState<ModuleValues>(oscVaInitialValues);
  const [telemetry] = useState<ModuleTelemetry>(oscVaInitialTelemetry);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const uiNormalized = normalizeModuleUiManifest(oscVaUiManifest);
    const vm = buildModuleViewModelFromManifest(
      uiNormalized,
      values,
      telemetry,
      false // readOnly
    );

    if (rendererRef.current) rendererRef.current.destroy();

    rendererRef.current = createOmegaRenderer({
      container,
      descriptor: oscVaDescriptor,
      values,
      telemetry,
      debugId: 'osc_va-preview',
      onChange: next => {
        setValues(next);
      },
      onCommand: cmd => {
        console.log('UiCommand', cmd);
      },
    });

    return () => {
      if (rendererRef.current) rendererRef.current.destroy();
      rendererRef.current = null;
    };
  }, []); // montaje inicial

  // Si quieres que cambios de values desde el editor rehagan el VM:
  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.update({ values });
  }, [values]);

  return <div ref={containerRef} style={{ width: 600, height: 400 }} />;
}
Con esto puedes probar:

[ ] VEM-1441 Que el preset de OMEGA (renderer + CSS) pinta osc_va igual en WebUI y en el editor.

[ ] VEM-1442 Que ModuleValues sigue la convención target:id y los widgets (incluido adsr-envelope) emiten parches correctos.

[ ] VEM-1443 Que el manifest es puramente declarativo y se traduce a ModuleViewModel vía el pipeline Era 6.

[ ] VEM-1444 ¿Quieres que afinemos algún detalle concreto de este ejemplo (p.ej. cómo quieres mapear exactamente osc_va.schema.presentation con el ModuleUiManifest), o con esto ya tienes una base suficiente para implementar y probar


[ ] VEM-1445 La clave es que ModuleUiManifest sea básicamente una “vista desplegada” de schema.presentation/registry.presentation como ya lo tienes en osc_va.yaml.

[ ] VEM-1446 De osc_va.schema/registry a ModuleUiManifest
En osc_va.yaml ya tienes, por cada entrada del registry, un bloque presentation con tab, group, order y el tipo de UI (ui.component). Eso lo puedes mapear así:

[ ] VEM-1447 Tabs del manifest: todos los presentation.tab únicos de los registros.

[ ] VEM-1448 Groups: pares únicos (tab, group).

[ ] VEM-1449 Widgets: uno por cada registro con roles compatibles (control, mod_target, etc.).

[ ] VEM-1450 Ejemplo directo a partir de tu YAML:

ts
function buildUiManifestFromSchema(schema: OscVaSchema): ModuleUiManifest {
  const regs = schema.registry;

  const tabIds = [...new Set(regs.map(r => r.presentation?.tab).filter(Boolean))];
  const tabs = tabIds.map((id, i) => ({
    id: id.toLowerCase(),
    label: id,
    order: i,
  }));

  const groupTuples = new Map<string, { id: string; label: string; tabId: string; order: number }>();

  regs.forEach(r => {
    const p = r.presentation;
    if (!p?.group || !p?.tab) return;
    const key = `${p.tab}/${p.group}`;
    if (!groupTuples.has(key)) {
      groupTuples.set(key, {
        id: p.group.toLowerCase(),
        label: p.group,
        tabId: p.tab.toLowerCase(),
        order: p.order ?? 0,
      });
    }
  });

  const groups = Array.from(groupTuples.values()).sort((a, b) => a.order - b.order);

  const widgets = regs
    .filter(r => r.roles?.includes('control'))
    .map(r => {
      const p = r.presentation;
      const ui = p?.ui?.component; // "knob" | "toggle" | "slider-v", etc.
      const widgetId =
        ui === 'knob'
          ? 'knob'
          : ui === 'toggle'
          ? 'toggle'
          : ui === 'slider-v'
          ? 'fader'
          : 'display';

      return {
        id: r.id, // puedes normalizar o mantener tal cual
        widgetId,
        label: r.label,
        binding: { target: 'param', id: r.id },
        props: {
          min: r.range?.min,
          max: r.range?.max,
          // step/unit si quieres derivarlos de otro sitio
        },
        layout: {
          tabId: p?.tab?.toLowerCase(),
          groupId: p?.group?.toLowerCase(),
          row: 0,
          col: (p?.order ?? 0) - 1, // ejemplo simple: order → col
        },
      };
    });

  return {
    uiVersion: 2,
    tabs,
    groups,
    widgets,
  };
}
schema/registry sigue siendo tu source of truth técnica (ranges, roles, ids largos tipo layer.a.osc.saw.on).

[ ] VEM-1451 ModuleUiManifest es una proyección UI-friendly que el editor puede modificar (cambiar label, mover de grupo, etc.) sin tocar el YAML base, o si lo prefieres, el editor podría escribir de vuelta a presentation del YAML usando el camino inverso.

[ ] VEM-1452 Con este mapping claro, el circuito queda:

[ ] VEM-1453 Backend/preset: expone osc_va.yaml (schema/registry) como siempre.

[ ] VEM-1454 Un paso de “UI compile” convierte schema.presentation → ModuleUiManifest.

normalizeModuleUiManifest + buildModuleViewModelFromManifest generan el ModuleViewModel.

[ ] VEM-1455 El renderer de Era 6 pinta usando PanelRenderer + WidgetRegistry.

[ ] VEM-1456 ¿Te interesa que definamos también el camino inverso (de manifest editado → actualizar presentation en el YAML / metadata), o de momento sólo lo vas a usar como manifest “derivado” sin sobrescribir el schema original


[ ] VEM-1457 El camino inverso es simétrico: usas el id del widget para localizar la entrada de registry y vuelcas los cambios de layout/widgetId al bloque presentation del YAML.

1) Supuestos de mapeo
Cada ManifestWidget.id coincide con registry[i].id en el YAML (layer.a.osc.saw.on, etc.).

presentation.tab y presentation.group se derivan de layout.tabId/groupId (en mayúsculas o con el naming que quieras).

presentation.order se deriva de la posición relativa dentro del grupo (por ejemplo, índice en el array).

2) Función de merge manifest → schema
ts
// Tipos simplificados
type RegistryEntry = {
  id: string;
  label: string;
  roles: string[];
  direction: string;
  range?: { min: number; max: number; default?: number };
  presentation?: {
    tab?: string;
    group?: string;
    order?: number;
    ui?: { component: string };
  };
};

type OscVaSchema = {
  id: string;
  name: string;
  layout: { hp: number; rack: string; columns: number };
  registry: RegistryEntry[];
};

type ModuleUiManifest = {
  uiVersion: number;
  tabs: { id: string; label: string; order: number }[];
  groups: { id: string; label: string; tabId?: string; order: number }[];
  widgets: ManifestWidget[];
};

type ManifestWidget = {
  id: string;
  widgetId: string;
  label: string;
  binding: { target: string; id: string };
  props?: Record<string, any>;
  layout?: {
    tabId?: string;
    groupId?: string;
    row?: number;
    col?: number;
    colSpan?: number;
  };
};
ts
export function applyUiManifestToSchema(
  schema: OscVaSchema,
  manifest: ModuleUiManifest
): OscVaSchema {
  // Índices auxiliares para tab/group
  const tabById = new Map(manifest.tabs.map(t => [t.id, t]));
  const groupById = new Map(manifest.groups.map(g => [g.id, g]));

  // Calculamos order por grupo a partir de widgets
  const widgetsByGroup = new Map<string, ManifestWidget[]>();
  manifest.widgets.forEach(w => {
    const gid = w.layout?.groupId;
    if (!gid) return;
    if (!widgetsByGroup.has(gid)) widgetsByGroup.set(gid, []);
    widgetsByGroup.get(gid)!.push(w);
  });

  widgetsByGroup.forEach(wlist => {
    wlist.sort((a, b) => (a.layout?.col ?? 0) - (b.layout?.col ?? 0));
  });

  const newRegistry = schema.registry.map(entry => {
    const w = manifest.widgets.find(mw => mw.id === entry.id);
    if (!w) {
      // No hay widget en el manifest para este registro: dejamos presentation tal cual
      return entry;
    }

    const layout = w.layout ?? {};
    const group = layout.groupId ? groupById.get(layout.groupId) : undefined;
    const tab = group?.tabId ? tabById.get(group.tabId) : undefined;

    // Order: índice dentro del grupo según lista ordenada
    let order: number | undefined = entry.presentation?.order;
    if (group) {
      const list = widgetsByGroup.get(group.id) ?? [];
      const idx = list.findIndex(x => x.id === w.id);
      if (idx >= 0) order = idx + 1;
    }

    // Mapear widgetId → ui.component
    let component = entry.presentation?.ui?.component;
    switch (w.widgetId) {
      case 'knob':
        component = 'knob';
        break;
      case 'fader':
        component = 'slider-v';
        break;
      case 'toggle':
        component = 'toggle';
        break;
      case 'enum-select':
        component = 'select';
        break;
      case 'display':
        component = 'display';
        break;
      case 'led':
        component = 'led';
        break;
      case 'adsr-envelope':
        component = 'adsr-envelope';
        break;
      default:
        component = component ?? 'display';
        break;
    }

    return {
      ...entry,
      label: w.label ?? entry.label,
      presentation: {
        ...(entry.presentation ?? {}),
        tab: tab?.label ?? entry.presentation?.tab,
        group: group?.label ?? entry.presentation?.group,
        order,
        ui: { component },
      },
    };
  });

  return {
    ...schema,
    registry: newRegistry,
  };
}
3) Flujo en el editor
Cargas osc_va.yaml en memoria y lo parseas a OscVaSchema.

[ ] VEM-1458 Generas ModuleUiManifest con buildUiManifestFromSchema(schema).

[ ] VEM-1459 El usuario edita tabs/groups/widgets en el editor.

[ ] VEM-1460 Al guardar, llamas a applyUiManifestToSchema(schema, manifestEditado) y vuelcas el YAML de vuelta a disco/repositorio.

[ ] VEM-1461 Así mantienes:

osc_va.yaml como fuente principal donde viven ids largos, ranges, roles, etc.

[ ] VEM-1462 ModuleUiManifest como proyección editable para layout y tipos de widget, totalmente compatible con el pipeline Era 6.

[ ] VEM-1463 ¿Te compensa que también anotemos una pequeña lista de “reglas de oro” para que el editor nunca rompa cosas sensibles del YAML (por ejemplo, no tocar roles, direction, range desde la UI de layout)?

[ ] VEM-1464 Te propongo unas reglas de oro claras para que el editor sea seguro con el YAML.

1) Campos que el editor SÍ puede tocar
presentation.tab: solo a través de tabs del ModuleUiManifest (renombrar, mover).

presentation.group: idem, vía groups del manifest.

presentation.order: derivado automáticamente del orden visual en el grupo.

presentation.ui.component: solo a través de widgetId (knob, fader, toggle, etc.).

label: el editor puede permitir renombrar la etiqueta visible del control.

[ ] VEM-1465 Solo estos campos deberían sincronizarse manifest → YAML.

2) Campos que el editor NO debe tocar
id de los registros (layer.a.osc.saw.on, etc.).

roles (control, output, mod_target, stream, etc.).

direction (internal, input, output).

type (audio, cv, gate, etc.).

range (min, max, default) salvo que tengas un editor especializado de parámetros técnicos.

[ ] VEM-1466 Cualquier metadato de engine (family, engine, modelId, etc.).

[ ] VEM-1467 En código: nunca sobrescribir esos campos desde el manifest, sólo leerlos.

3) Reglas sobre bindings y keys
ManifestWidget.binding.id debe coincidir con registry[i].id o con un alias claramente definido; el editor no debe cambiarlo salvo que tengas un flujo de “remap binding” consciente.

[ ] VEM-1468 La convención ModuleValues/ModuleTelemetry usa siempre target:id (param:cutoff, meter:outL), y los widgets compuestos siguen esa misma regla.

4) Reglas de estabilidad de IDs
tabs[].id, groups[].id y widgets[].id deben ser estables: el editor sólo los genera una vez y luego los reutiliza.

[ ] VEM-1469 Para mapping YAML ↔ manifest, la clave fuerte es registry.id ↔ ManifestWidget.id; si el usuario quiere “duplicar” un control, mejor crear un nuevo widget con un id distinto pero mismo binding (doble vista del mismo parámetro) que renombrar registry.id.

5) Reglas de migración/versionado
Cualquier cambio estructural grande (nuevo widgetId, nuevo bloque adsrBindings, etc.) debe ir acompañado de:

[ ] VEM-1470 Nuevo uiVersion en el manifest.

[ ] VEM-1471 Funciones de migración explícitas (migrateV2toV3, etc.) que no toquen nada fuera de presentation y label.

[ ] VEM-1472 Si una migración necesita modificar algo más profundo (por ejemplo, dividir un parámetro en dos), eso se hace en una herramienta distinta de “edición de layout”, no en el editor de UI.

[ ] VEM-1473 Con estas reglas, el editor se comporta como una capa de layout/UX sobre tu schema de engine, sin riesgo de cargarse la semántica DSP ni los contratos de backend.

[ ] VEM-1474 ¿Te gustaría que dejáramos estas reglas empaquetadas en un pequeño EDITOR_RULES.md dentro del preset para que queden documentadas para tu “yo futuro” y cualquier otra herramienta que consuma el mismo YAML?

[ ] VEM-1475 Aquí tienes un borrador directo para EDITOR_RULES.md dentro del preset.

[ ] VEM-1476 Editor de UI de OMEGA — Reglas de Uso
Estas reglas definen qué puede y qué no puede hacer el editor de UI sobre los schemas (*.yaml) y los manifests de UI.

1. Alcance del editor
El editor solo gestiona layout y presentación de controles.

[ ] VEM-1477 La semántica DSP (rangos, tipos, roles, conexiones) permanece en el YAML y no se toca desde la UI.

2. Campos editables en YAML (registry[].presentation + label)
El editor puede modificar:

presentation.tab (pestaña lógica).

presentation.group (grupo dentro de una pestaña).

presentation.order (orden dentro del grupo).

presentation.ui.component (tipo de widget visual, p.ej. knob, toggle, slider-v, etc.).

label (texto visible del control).

[ ] VEM-1478 Todo cambio se hace indirectamente a través del ModuleUiManifest.

3. Campos NO editables en YAML
El editor no debe modificar jamás:

registry[].id.

registry[].roles.

registry[].direction.

registry[].type.

registry[].range (min, max, default), salvo herramientas especializadas fuera del editor de layout.

[ ] VEM-1479 Metadatos de módulo: id, name, family, engine, modelId, etc.

[ ] VEM-1480 Estos campos solo se leen para construir manifests y ViewModels.

4. Relación YAML ↔ ModuleUiManifest
Cada registry[i].id se mapea a ModuleUiManifest.widgets[j].id.

[ ] VEM-1481 El manifest define:

tabs[] (id, label, order).

groups[] (id, label, tabId, order).

widgets[] (id, widgetId, label, binding, props, layout).

[ ] VEM-1482 El flujo es:

schema.registry[].presentation → ModuleUiManifest (buildUiManifestFromSchema).

[ ] VEM-1483 Edición en el editor sobre ModuleUiManifest.

[ ] VEM-1484 ModuleUiManifest → schema.registry[].presentation + label (applyUiManifestToSchema).

5. Convención de bindings y valores
Todo widget tiene un BindingRef con { target, id }.

[ ] VEM-1485 Las claves en ModuleValues y ModuleTelemetry siguen la convención:

[ ] VEM-1486 ModuleValues:

param:<id> para parámetros.

flag:<id> para flags booleanas.

slot:<id> para selecciones/IDs de slot.

[ ] VEM-1487 ModuleTelemetry:

meter:<id> para meters/LEDs.

[ ] VEM-1488 Widgets simples y compuestos (p.ej. adsr-envelope) usan siempre key = target + ':' + id.

6. Estabilidad de IDs
tabs[].id, groups[].id y widgets[].id deben ser estables: se generan una vez y luego no se cambian.

[ ] VEM-1489 La referencia fuerte entre YAML y manifest es registry.id ↔ widgets.id.

[ ] VEM-1490 Si se desea duplicar un control visual, se crea un nuevo widget apuntando al mismo binding, no se cambia registry.id.

7. Versionado y migraciones de UI
El bloque de UI del manifest lleva uiVersion (entero).

[ ] VEM-1491 Cualquier cambio estructural relevante (nuevo widgetId, nuevas props) implica:

[ ] VEM-1492 Incrementar uiVersion.

[ ] VEM-1493 Proveer funciones de migración (migrateVnToVn+1) que solo toquen:

tabs, groups, widgets (layout, widgetId, props de presentación).

[ ] VEM-1494 Nunca roles, direction, range, ni IDs del schema.

[ ] VEM-1495 La WebUI y el editor siempre pasan por normalizeModuleUiManifest(raw) antes de construir el ModuleViewModel.

8. Responsabilidades del preset de OMEGA
El preset debe exponer, como API estable:

create(options: OmegaRendererCreateOptions): OmegaRendererInstance.

[ ] VEM-1496 Tipos: ModuleDescriptor, ModuleValues, ModuleTelemetry, BindingRef, WidgetViewModel, ModuleViewModel, UiCommand.

[ ] VEM-1497 Helpers: keyForBinding, getValue, setValuePatch, getMeter.

[ ] VEM-1498 Tooling de editor: widgetEditorSchema, widgetTemplateCatalog, instantiateWidgetFromTemplate, validateModuleViewModel, buildModuleViewModelFromManifest, normalizeModuleUiManifest.

[ ] VEM-1499 Con estas reglas, cualquier herramienta (editor de manifests, WebUI, tests) puede manipular la UI de los módulos sin riesgo de romper los contratos de engine ni la “pureza Era 6”.

[ ] VEM-1500 ¿Quieres que a partir de aquí nos enfoquemos ya en un módulo concreto distinto de osc_va (por ejemplo, uno de filtro o de modulación) para reutilizar todo este esquema y comprobar que escala igual de bien?


[ ] VEM-1501 Para comprobar que escala, lo más directo es hacer un filtro sencillo tipo “VCF clásico” usando exactamente el mismo esquema.

[ ] VEM-1502 Ejemplo de manifest UI para filter_va
ts
export const filterVaUiManifest = {
  uiVersion: 2,
  tabs: [
    { id: 'main', label: 'Main', order: 0 },
  ],
  groups: [
    { id: 'filter', label: 'Filter', tabId: 'main', order: 0 },
    { id: 'env', label: 'Envelope', tabId: 'main', order: 1 },
    { id: 'mod', label: 'Modulation', tabId: 'main', order: 2 },
    { id: 'out', label: 'Output', tabId: 'main', order: 3 },
  ],
  widgets: [
    // Cutoff
    {
      id: 'cutoff',
      widgetId: 'knob',
      label: 'Cutoff',
      binding: { target: 'param', id: 'filter.cutoff' },
      props: { min: 20, max: 20000, step: 1, unit: 'Hz' },
      layout: { tabId: 'main', groupId: 'filter', row: 0, col: 0 },
    },
    // Resonance
    {
      id: 'resonance',
      widgetId: 'knob',
      label: 'Resonance',
      binding: { target: 'param', id: 'filter.resonance' },
      props: { min: 0, max: 1, step: 0.01 },
      layout: { tabId: 'main', groupId: 'filter', row: 0, col: 1 },
    },
    // Filter type
    {
      id: 'filter-type',
      widgetId: 'enum-select',
      label: 'Type',
      binding: { target: 'slot', id: 'filter.type' },
      props: {
        enumOptions: [
          { value: 'lp24', label: 'LP 24' },
          { value: 'lp12', label: 'LP 12' },
          { value: 'bp', label: 'BP' },
          { value: 'hp', label: 'HP' },
        ],
      },
      layout: { tabId: 'main', groupId: 'filter', row: 1, col: 0 },
    },
    // Env amount (knob)
    {
      id: 'env-amount',
      widgetId: 'knob',
      label: 'Env Amt',
      binding: { target: 'param', id: 'filter.env_amt' },
      props: { min: -1, max: 1, step: 0.01 },
      layout: { tabId: 'main', groupId: 'env', row: 0, col: 0 },
    },
    // ADSR compuesto
    {
      id: 'env-adsr',
      widgetId: 'adsr-envelope',
      label: 'Envelope',
      binding: { target: 'param', id: 'filter.env_amt' },
      props: {
        adsrBindings: {
          attack:  { target: 'param', id: 'filter.attack' },
          decay:   { target: 'param', id: 'filter.decay' },
          sustain: { target: 'param', id: 'filter.sustain' },
          release: { target: 'param', id: 'filter.release' },
        },
      },
      layout: { tabId: 'main', groupId: 'env', row: 1, col: 0, colSpan: 2 },
    },
    // LFO depth
    {
      id: 'lfo-depth',
      widgetId: 'knob',
      label: 'LFO Depth',
      binding: { target: 'param', id: 'filter.lfo_depth' },
      props: { min: 0, max: 1, step: 0.01 },
      layout: { tabId: 'main', groupId: 'mod', row: 0, col: 0 },
    },
    // LFO rate
    {
      id: 'lfo-rate',
      widgetId: 'knob',
      label: 'LFO Rate',
      binding: { target: 'param', id: 'filter.lfo_rate' },
      props: { min: 0.1, max: 20, step: 0.1, unit: 'Hz' },
      layout: { tabId: 'main', groupId: 'mod', row: 0, col: 1 },
    },
    // Keytrack
    {
      id: 'keytrack',
      widgetId: 'knob',
      label: 'Keytrack',
      binding: { target: 'param', id: 'filter.keytrack' },
      props: { min: 0, max: 1, step: 0.01 },
      layout: { tabId: 'main', groupId: 'mod', row: 1, col: 0 },
    },
    // Bypass
    {
      id: 'bypass',
      widgetId: 'toggle',
      label: 'Bypass',
      binding: { target: 'flag', id: 'filter.bypass' },
      props: {},
      layout: { tabId: 'main', groupId: 'out', row: 0, col: 0 },
    },
    // Output meter
    {
      id: 'out-meter',
      widgetId: 'led',
      label: 'Output',
      binding: { target: 'meter', id: 'filter.out' },
      props: { meterRange: { min: -60, max: 0 } },
      layout: { tabId: 'main', groupId: 'out', row: 0, col: 1 },
    },
  ],
};
Este módulo de filtro:

[ ] VEM-1503 Reutiliza los mismos tipos de widgets (knob, toggle, enum-select, led, adsr-envelope) y la misma convención target:id en bindings.

[ ] VEM-1504 Solo cambia ids de binding (filter.*) y el contenido semántico (tipo de filtro, LFO, keytrack), lo que demuestra que el esquema escala sin tocar el renderer ni el editor.

[ ] VEM-1505 ¿Quieres que derive a partir de aquí un filter_va.yaml de ejemplo en el mismo estilo que tu osc_va.yaml, para que veas el mapeo YAML ↔ manifest también en este módulo?


[ ] VEM-1506 Te lo dejo en el mismo estilo que osc_va.yaml, siguiendo los mismos campos y el mapeo con el manifest que acabamos de definir.

text
id: "filter_va"
name: "VA Filter"
family: "Filter"
engine: "Modular"
modelId: "VCF-Classic"
version: 1
status: "active"
description: "Classic resonant filter with envelope and LFO modulation."

layout:
  hp: 10
  rack: "lower"
  columns: 3

registry:
  # --- FILTER CORE ---

  - id: "filter.cutoff"
    label: "Cutoff"
    roles: ["control", "mod_target"]
    direction: "internal"
    range: { min: 20, max: 20000, default: 800 }
    presentation:
      tab: "MAIN"
      group: "FILTER"
      order: 1
      ui: { component: "knob" }

  - id: "filter.resonance"
    label: "Resonance"
    roles: ["control", "mod_target"]
    direction: "internal"
    range: { min: 0, max: 1, default: 0.3 }
    presentation:
      tab: "MAIN"
      group: "FILTER"
      order: 2
      ui: { component: "knob" }

  - id: "filter.type"
    label: "Type"
    roles: ["control"]
    direction: "internal"
    # enumeración se define a nivel de engine; aquí basta con presentarlo
    presentation:
      tab: "MAIN"
      group: "FILTER"
      order: 3
      ui: { component: "select" }

  # --- ENVELOPE ---

  - id: "filter.env_amt"
    label: "Env Amt"
    roles: ["control", "mod_target"]
    direction: "internal"
    range: { min: -1, max: 1, default: 0.5 }
    presentation:
      tab: "MAIN"
      group: "ENV"
      order: 1
      ui: { component: "knob" }

  - id: "filter.attack"
    label: "Attack"
    roles: ["control", "mod_target"]
    direction: "internal"
    range: { min: 0, max: 10, default: 0.01 }
    presentation:
      tab: "MAIN"
      group: "ENV"
      order: 2
      ui: { component: "knob" }

  - id: "filter.decay"
    label: "Decay"
    roles: ["control", "mod_target"]
    direction: "internal"
    range: { min: 0, max: 10, default: 0.2 }
    presentation:
      tab: "MAIN"
      group: "ENV"
      order: 3
      ui: { component: "knob" }

  - id: "filter.sustain"
    label: "Sustain"
    roles: ["control", "mod_target"]
    direction: "internal"
    range: { min: 0, max: 1, default: 0.7 }
    presentation:
      tab: "MAIN"
      group: "ENV"
      order: 4
      ui: { component: "knob" }

  - id: "filter.release"
    label: "Release"
    roles: ["control", "mod_target"]
    direction: "internal"
    range: { min: 0, max: 10, default: 0.3 }
    presentation:
      tab: "MAIN"
      group: "ENV"
      order: 5
      ui: { component: "knob" }

  # --- MODULATION ---

  - id: "filter.lfo_depth"
    label: "LFO Depth"
    roles: ["control", "mod_target"]
    direction: "internal"
    range: { min: 0, max: 1, default: 0 }
    presentation:
      tab: "MAIN"
      group: "MOD"
      order: 1
      ui: { component: "knob" }

  - id: "filter.lfo_rate"
    label: "LFO Rate"
    roles: ["control", "mod_target"]
    direction: "internal"
    range: { min: 0.1, max: 20, default: 2 }
    presentation:
      tab: "MAIN"
      group: "MOD"
      order: 2
      ui: { component: "knob" }

  - id: "filter.keytrack"
    label: "Keytrack"
    roles: ["control", "mod_target"]
    direction: "internal"
    range: { min: 0, max: 1, default: 0.5 }
    presentation:
      tab: "MAIN"
      group: "MOD"
      order: 3
      ui: { component: "knob" }

  # --- OUTPUT / BYPASS ---

  - id: "filter.bypass"
    label: "Bypass"
    roles: ["control"]
    direction: "internal"
    range: { min: 0, max: 1, default: 0 }
    presentation:
      tab: "MAIN"
      group: "OUTPUT"
      order: 1
      ui: { component: "toggle" }

  - id: "filter.out"
    label: "OUT"
    roles: ["output", "stream"]
    direction: "output"
    type: "audio"
    presentation:
      tab: "PATCHING"
      group: "OUTPUTS"
      order: 10
El mapeo manifest ↔ YAML es 1:1 en id y en presentation.tab/group/order/ui.component; el manifest añade layout más fino y props visuales (min/max, enumOptions, etc.) sin tocar roles, direction, range.

[ ] VEM-1507 Puedes generar filterVaUiManifest a partir de este YAML exactamente igual que hicimos con osc_va, y el renderer de la Era 6 lo tratará como otro módulo más sin hardcodes.

[ ] VEM-1508 ¿Te gustaría que, como último toque, te deje una pequeña función buildUiManifestFromFilterSchema(schema: OscVaSchema) ya adaptada a este filter_va.yaml para que puedas usarla tal cual en tu tooling?


[ ] VEM-1509 Aquí tienes una versión directa de buildUiManifestFromFilterSchema que sigue exactamente el estilo de filter_va.yaml y genera un ModuleUiManifest listo para tu renderer.

ts
// ui/tools/buildUiManifestFromFilterSchema.ts

type RegistryEntry = {
  id: string;
  label: string;
  roles: string[];
  direction: string;
  range?: { min: number; max: number; default?: number };
  presentation?: {
    tab?: string;
    group?: string;
    order?: number;
    ui?: { component?: string };
  };
};

type FilterSchema = {
  id: string;
  name: string;
  layout: { hp: number; rack: string; columns: number };
  registry: RegistryEntry[];
};

type BindingRef = { target: 'param' | 'slot' | 'meter' | 'flag'; id: string };

type ManifestWidget = {
  id: string;
  widgetId: string;
  label: string;
  binding: BindingRef;
  props?: Record<string, any>;
  layout?: {
    tabId?: string;
    groupId?: string;
    row?: number;
    col?: number;
    colSpan?: number;
  };
};

type ModuleUiManifest = {
  uiVersion: number;
  tabs: { id: string; label: string; order: number }[];
  groups: { id: string; label: string; tabId?: string; order: number }[];
  widgets: ManifestWidget[];
};

// helper para normalizar ids de tab/group
function normalizeId(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '_');
}

export function buildUiManifestFromFilterSchema(
  schema: FilterSchema
): ModuleUiManifest {
  const regs = schema.registry;

  // 1) Tabs a partir de presentation.tab
  const tabLabels = Array.from(
    new Set(regs.map(r => r.presentation?.tab).filter((t): t is string => !!t))
  );
  const tabs = tabLabels.map((label, idx) => ({
    id: normalizeId(label),
    label,
    order: idx,
  }));

  // 2) Groups a partir de (tab, group)
  const groupMap = new Map<
    string,
    { id: string; label: string; tabId: string; order: number }
  >();

  regs.forEach(r => {
    const p = r.presentation;
    if (!p?.tab || !p?.group) return;
    const key = `${p.tab}/${p.group}`;
    if (groupMap.has(key)) return;
    const tabId = normalizeId(p.tab);
    groupMap.set(key, {
      id: normalizeId(p.group),
      label: p.group,
      tabId,
      order: p.order ?? 0,
    });
  });

  const groups = Array.from(groupMap.values()).sort((a, b) => a.order - b.order);

  // 3) Widgets a partir de registros con roles "control" (y opcionales otros)
  const widgets: ManifestWidget[] = regs
    .filter(r => r.roles?.includes('control'))
    .map(r => {
      const p = r.presentation;
      const tabId = p?.tab ? normalizeId(p.tab) : 'main';
      const groupId = p?.group ? normalizeId(p.group) : undefined;

      // widgetId a partir de ui.component
      const comp = p?.ui?.component;
      let widgetId: string;
      switch (comp) {
        case 'knob':
          widgetId = 'knob';
          break;
        case 'toggle':
          widgetId = 'toggle';
          break;
        case 'slider-v':
          widgetId = 'fader';
          break;
        case 'select':
          widgetId = 'enum-select';
          break;
        case 'led':
          widgetId = 'led';
          break;
        default:
          widgetId = 'display';
          break;
      }

      // target a partir de roles/direction básicos
      let target: BindingRef['target'] = 'param';
      if (r.roles.includes('control')) {
        target = 'param';
      }
      if (r.roles.includes('output') || r.roles.includes('stream')) {
        target = 'meter'; // para cosas como filter.out
      }
      if (r.label.toLowerCase() === 'bypass') {
        target = 'flag';
      }

      const binding: BindingRef = { target, id: r.id };

      const props: Record<string, any> = {};
      if (r.range && widgetId === 'knob' || widgetId === 'fader') {
        props.min = r.range.min;
        props.max = r.range.max;
        // step/unit los puedes rellenar después según tu criterio
      }

      return {
        id: r.id,
        widgetId,
        label: r.label,
        binding,
        props,
        layout: {
          tabId,
          groupId,
          row: 0,
          col: (p?.order ?? 1) - 1,
        },
      };
    });

  return {
    uiVersion: 2,
    tabs,
    groups,
    widgets,
  };
}
Está adaptada al patrón de filter_va.yaml: lee presentation.tab/group/order/ui.component y genera tabs, groups y widgets con binding.target según roles y nombres (bypass → flag, outputs/stream → meter).

[ ] VEM-1510 Luego puedes pasar este manifest por tu pipeline (normalizeModuleUiManifest → buildModuleViewModelFromManifest → renderer.create) sin tocar nada más.

[ ] VEM-1511 ¿Te sirve así para empezar a enchufarlo en tu tooling de generación de manifests, o quieres que también añada algún tratamiento especial (por ejemplo, detección automática del bloque ADSR para luego migrarlo a adsr-envelope en uiVersion 3)?


[ ] VEM-1512 Te dejo el mismo builder con un tratamiento especial para ADSR, generando ya uiVersion 3 cuando detecta el patrón.

ts
// ui/tools/buildUiManifestFromFilterSchema.ts

type RegistryEntry = {
  id: string;
  label: string;
  roles: string[];
  direction: string;
  range?: { min: number; max: number; default?: number };
  presentation?: {
    tab?: string;
    group?: string;
    order?: number;
    ui?: { component?: string };
  };
};

type FilterSchema = {
  id: string;
  name: string;
  layout: { hp: number; rack: string; columns: number };
  registry: RegistryEntry[];
};

type BindingRef = { target: 'param' | 'slot' | 'meter' | 'flag'; id: string };

type ManifestWidget = {
  id: string;
  widgetId: string;
  label: string;
  binding: BindingRef;
  props?: Record<string, any>;
  layout?: {
    tabId?: string;
    groupId?: string;
    row?: number;
    col?: number;
    colSpan?: number;
  };
};

type ModuleUiManifest = {
  uiVersion: number;
  tabs: { id: string; label: string; order: number }[];
  groups: { id: string; label: string; tabId?: string; order: number }[];
  widgets: ManifestWidget[];
};

function normalizeId(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '_');
}

export function buildUiManifestFromFilterSchema(
  schema: FilterSchema
): ModuleUiManifest {
  const regs = schema.registry;

  // Tabs
  const tabLabels = Array.from(
    new Set(regs.map(r => r.presentation?.tab).filter((t): t is string => !!t))
  );
  const tabs = tabLabels.map((label, idx) => ({
    id: normalizeId(label),
    label,
    order: idx,
  }));

  // Groups
  const groupMap = new Map<
    string,
    { id: string; label: string; tabId: string; order: number }
  >();

  regs.forEach(r => {
    const p = r.presentation;
    if (!p?.tab || !p?.group) return;
    const key = `${p.tab}/${p.group}`;
    if (groupMap.has(key)) return;
    const tabId = normalizeId(p.tab);
    groupMap.set(key, {
      id: normalizeId(p.group),
      label: p.group,
      tabId,
      order: p.order ?? 0,
    });
  });

  const groups = Array.from(groupMap.values()).sort((a, b) => a.order - b.order);

  // Widgets base
  const baseWidgets: ManifestWidget[] = regs
    .filter(r => r.roles?.includes('control'))
    .map(r => {
      const p = r.presentation;
      const tabId = p?.tab ? normalizeId(p.tab) : 'main';
      const groupId = p?.group ? normalizeId(p.group) : undefined;

      const comp = p?.ui?.component;
      let widgetId: string;
      switch (comp) {
        case 'knob':
          widgetId = 'knob';
          break;
        case 'toggle':
          widgetId = 'toggle';
          break;
        case 'slider-v':
          widgetId = 'fader';
          break;
        case 'select':
          widgetId = 'enum-select';
          break;
        case 'led':
          widgetId = 'led';
          break;
        default:
          widgetId = 'display';
          break;
      }

      let target: BindingRef['target'] = 'param';
      if (r.roles.includes('output') || r.roles.includes('stream')) {
        target = 'meter';
      }
      if (r.label.toLowerCase() === 'bypass') {
        target = 'flag';
      }

      const binding: BindingRef = { target, id: r.id };

      const props: Record<string, any> = {};
      if ((widgetId === 'knob' || widgetId === 'fader') && r.range) {
        props.min = r.range.min;
        props.max = r.range.max;
      }

      return {
        id: r.id,
        widgetId,
        label: r.label,
        binding,
        props,
        layout: {
          tabId,
          groupId,
          row: 0,
          col: (p?.order ?? 1) - 1,
        },
      };
    });

  // Detección de ADSR clásico
  const attackId = 'filter.attack';
  const decayId = 'filter.decay';
  const sustainId = 'filter.sustain';
  const releaseId = 'filter.release';
  const envAmtId = 'filter.env_amt';

  const attack = baseWidgets.find(w => w.id === attackId && w.widgetId === 'knob');
  const decay = baseWidgets.find(w => w.id === decayId && w.widgetId === 'knob');
  const sustain = baseWidgets.find(w => w.id === sustainId && w.widgetId === 'knob');
  const release = baseWidgets.find(w => w.id === releaseId && w.widgetId === 'knob');
  const envAmt = baseWidgets.find(w => w.id === envAmtId);

  const canBuildAdsr =
    attack && decay && sustain && release && envAmt && envAmt.binding.target === 'param';

  let widgets: ManifestWidget[] = baseWidgets;
  let uiVersion = 2;

  if (canBuildAdsr) {
    uiVersion = 3;

    // layout base: mismo grupo/tab que attack
    const layoutBase = attack!.layout ?? {};
    const adsrWidget: ManifestWidget = {
      id: 'filter.env_adsr',
      widgetId: 'adsr-envelope',
      label: 'Envelope',
      binding: envAmt!.binding, // usar env_amt como binding principal
      props: {
        ...(envAmt!.props ?? {}),
        adsrBindings: {
          attack: attack!.binding,
          decay: decay!.binding,
          sustain: sustain!.binding,
          release: release!.binding,
        },
      },
      layout: {
        tabId: layoutBase.tabId,
        groupId: layoutBase.groupId,
        row: layoutBase.row ?? 0,
        col: layoutBase.col ?? 0,
        colSpan: 2,
      },
    };

    const idsToRemove = new Set([attackId, decayId, sustainId, releaseId]);
    widgets = baseWidgets.filter(w => !idsToRemove.has(w.id));
    widgets.push(adsrWidget);
  }

  return {
    uiVersion,
    tabs,
    groups,
    widgets,
  };
}
Si encuentra el patrón clásico (filter.attack/decay/sustain/release más filter.env_amt), genera directamente un widget adsr-envelope y pasa el manifest a uiVersion = 3.

[ ] VEM-1513 Si no lo encuentra, se queda en uiVersion = 2 con los cuatro knobs separados, sin romper nada.

[ ] VEM-1514 ¿Te parece suficiente este nivel de automatización para arrancar, o quieres que también meta alguna heurística extra (por ejemplo, detectar ADSR aunque los ids no sigan exactamente filter.*)?


[ ] VEM-1515 Para generalizar la detección de ADSR sin depender de filter.*, puedes usar heurísticas sobre el sufijo del id y el group.

[ ] VEM-1516 Heurística más flexible para ADSR
ts
type AdsrCandidate = {
  attack?: ManifestWidget;
  decay?: ManifestWidget;
  sustain?: ManifestWidget;
  release?: ManifestWidget;
  envAmt?: ManifestWidget;
};

function detectAdsrGroup(widgets: ManifestWidget[]): AdsrCandidate | null {
  // Agrupar por groupId
  const byGroup = new Map<string, ManifestWidget[]>();
  widgets.forEach(w => {
    const gid = w.layout?.groupId ?? '';
    if (!gid) return;
    if (!byGroup.has(gid)) byGroup.set(gid, []);
    byGroup.get(gid)!.push(w);
  });

  for (const [groupId, groupWidgets] of byGroup.entries()) {
    const lower = (s: string) => s.toLowerCase();

    const cand: AdsrCandidate = {};
    groupWidgets.forEach(w => {
      const id = lower(w.binding.id);
      const lbl = lower(w.label);
      const key = id + ' ' + lbl;

      if (key.includes('attack')) cand.attack = w;
      else if (key.includes('decay')) cand.decay = w;
      else if (key.includes('sustain')) cand.sustain = w;
      else if (key.includes('release')) cand.release = w;
      else if (key.includes('env') && key.includes('amt')) cand.envAmt = w;
    });

    const hasAll =
      cand.attack && cand.decay && cand.sustain && cand.release && cand.envAmt &&
      cand.envAmt.binding.target === 'param';

    if (hasAll) {
      return cand;
    }
  }

  return null;
}
Y en el buildUiManifestFromFilterSchema sustituyes la detección rígida:

ts
const baseWidgets = /* igual que antes */;

const adsr = detectAdsrGroup(baseWidgets);

let widgets: ManifestWidget[] = baseWidgets;
let uiVersion = 2;

if (adsr) {
  uiVersion = 3;

  const attack = adsr.attack!;
  const decay = adsr.decay!;
  const sustain = adsr.sustain!;
  const release = adsr.release!;
  const envAmt = adsr.envAmt!;

  const layoutBase = attack.layout ?? {};
  const adsrWidget: ManifestWidget = {
    id: `${envAmt.binding.id}.adsr`, // derivado del binding
    widgetId: 'adsr-envelope',
    label: 'Envelope',
    binding: envAmt.binding,
    props: {
      ...(envAmt.props ?? {}),
      adsrBindings: {
        attack: attack.binding,
        decay: decay.binding,
        sustain: sustain.binding,
        release: release.binding,
      },
    },
    layout: {
      tabId: layoutBase.tabId,
      groupId: layoutBase.groupId,
      row: layoutBase.row ?? 0,
      col: layoutBase.col ?? 0,
      colSpan: 2,
    },
  };

  const idsToRemove = new Set([
    attack.id,
    decay.id,
    sustain.id,
    release.id,
  ]);
  widgets = baseWidgets.filter(w => !idsToRemove.has(w.id));
  widgets.push(adsrWidget);
}
Con esto:

[ ] VEM-1517 Funciona aunque los ids sean layer.a.env.attack, vcf_env_decay, etc., siempre que contengan “attack/decay/sustain/release/env/amt” en id o label.

[ ] VEM-1518 Sigue respetando la convención Era 6, porque la unión en el widget compuesto es totalmente declarativa (adsrBindings con BindingRef).

[ ] VEM-1519 ¿Quieres que dejemos también preparados un par de tests unitarios (caso positivo y caso negativo) para esta heurística de ADSR?


[x] VEM-1520 Te dejo dos tests unitarios sencillos (caso positivo y negativo) usando Vitest, que ya lo tienes en el stack.

ts
// ui/tools/__tests__/detectAdsrGroup.test.ts
import { describe, it, expect } from 'vitest';
import { detectAdsrGroup } from '../buildUiManifestFromFilterSchema';

// Tipos mínimos para el test
type BindingRef = { target: 'param' | 'slot' | 'meter' | 'flag'; id: string };
type ManifestWidget = {
  id: string;
  widgetId: string;
  label: string;
  binding: BindingRef;
  props?: Record<string, any>;
  layout?: { tabId?: string; groupId?: string; row?: number; col?: number };
};

describe('detectAdsrGroup', () => {
  it('detecta correctamente un bloque ADSR completo en el mismo grupo', () => {
    const widgets: ManifestWidget[] = [
      {
        id: 'layer.a.env.attack',
        widgetId: 'knob',
        label: 'Attack',
        binding: { target: 'param', id: 'layer.a.env.attack' },
        layout: { tabId: 'main', groupId: 'env', row: 0, col: 0 },
      },
      {
        id: 'layer.a.env.decay',
        widgetId: 'knob',
        label: 'Decay',
        binding: { target: 'param', id: 'layer.a.env.decay' },
        layout: { tabId: 'main', groupId: 'env', row: 0, col: 1 },
      },
      {
        id: 'layer.a.env.sustain',
        widgetId: 'knob',
        label: 'Sustain',
        binding: { target: 'param', id: 'layer.a.env.sustain' },
        layout: { tabId: 'main', groupId: 'env', row: 0, col: 2 },
      },
      {
        id: 'layer.a.env.release',
        widgetId: 'knob',
        label: 'Release',
        binding: { target: 'param', id: 'layer.a.env.release' },
        layout: { tabId: 'main', groupId: 'env', row: 0, col: 3 },
      },
      {
        id: 'layer.a.env.amount',
        widgetId: 'knob',
        label: 'Env Amt',
        binding: { target: 'param', id: 'layer.a.env.amount' },
        layout: { tabId: 'main', groupId: 'env', row: 1, col: 0 },
      },
    ];

    const adsr = detectAdsrGroup(widgets as any);

    expect(adsr).not.toBeNull();
    expect(adsr!.attack!.binding.id).toContain('attack');
    expect(adsr!.decay!.binding.id).toContain('decay');
    expect(adsr!.sustain!.binding.id).toContain('sustain');
    expect(adsr!.release!.binding.id).toContain('release');
    expect(adsr!.envAmt!.binding.id).toContain('amount');
  });

  it('no detecta ADSR cuando falta algún segmento o están en grupos distintos', () => {
    const widgets: ManifestWidget[] = [
      {
        id: 'env.attack',
        widgetId: 'knob',
        label: 'Attack',
        binding: { target: 'param', id: 'env.attack' },
        layout: { tabId: 'main', groupId: 'env', row: 0, col: 0 },
      },
      {
        id: 'env.decay',
        widgetId: 'knob',
        label: 'Decay',
        binding: { target: 'param', id: 'env.decay' },
        layout: { tabId: 'main', groupId: 'env', row: 0, col: 1 },
      },
      // Falta sustain
      {
        id: 'env.release',
        widgetId: 'knob',
        label: 'Release',
        binding: { target: 'param', id: 'env.release' },
        layout: { tabId: 'main', groupId: 'env', row: 0, col: 3 },
      },
      {
        id: 'env.amount',
        widgetId: 'knob',
        label: 'Env Amt',
        binding: { target: 'param', id: 'env.amount' },
        layout: { tabId: 'main', groupId: 'env', row: 1, col: 0 },
      },
    ];

    const adsr = detectAdsrGroup(widgets as any);

    expect(adsr).toBeNull();
  });
});
El primer test valida la heurística positiva con ids tipo layer.a.env.attack y group env.

[x] VEM-1521 El segundo confirma que no hay falsos positivos cuando falta un segmento (no hay sustain).

[x] VEM-1522 ¿Te va bien así y ya sigues tú integrando todo esto en el preset y el editor, o quieres que hagamos un último paso con un pequeño script CLI que genere manifests desde YAML en batch?


[x] VEM-1523 Te dejo un CLI mínimo en Node/TS para generar manifests desde tus YAML (tipo osc_va.yaml, filter_va.yaml) en batch.

1) Script CLI en TypeScript
ts
// tools/generate-ui-manifests.ts
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { buildUiManifestFromFilterSchema } from '../ui/tools/buildUiManifestFromFilterSchema';
// si tienes builder genérico para osc_va, lo importas igual

type AnySchema = {
  id: string;
  family?: string;
  registry?: any[];
};

function readYaml(filePath: string): AnySchema {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return yaml.load(raw) as AnySchema;
}

function writeJson(filePath: string, data: any) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function generateManifestForFile(inputPath: string, outputDir: string) {
  const schema = readYaml(inputPath);
  if (!schema.registry) {
    console.warn(`Skipping ${inputPath}: no registry`);
    return;
  }

  // Enrutado simple por family o id
  let manifest: any;

  if (schema.family === 'Filter' || schema.id === 'filter_va') {
    manifest = buildUiManifestFromFilterSchema(schema as any);
  } else if (schema.family === 'Oscillator' || schema.id === 'osc_va') {
    // TODO: importar e invocar tu buildUiManifestFromOscSchema
    // manifest = buildUiManifestFromOscSchema(schema as any);
    console.warn(`No OSC builder wired yet for ${inputPath}, skipping`);
    return;
  } else {
    console.warn(`No UI builder registered for ${schema.id}, skipping`);
    return;
  }

  const baseName = path.basename(inputPath, path.extname(inputPath)); // filter_va
  const outPath = path.join(outputDir, `${baseName}.ui.json`);
  writeJson(outPath, manifest);
  console.log(`Generated UI manifest: ${outPath}`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node generate-ui-manifests.js <input-glob|dir> <outputDir>');
    process.exit(1);
  }

  const [inputRoot, outputDir] = args;

  const stat = fs.statSync(inputRoot);
  const yamlFiles: string[] = [];

  if (stat.isDirectory()) {
    // Recorrer el directorio recursivamente
    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.isFile() && full.endsWith('.yaml')) yamlFiles.push(full);
      }
    };
    walk(inputRoot);
  } else if (stat.isFile() && inputRoot.endsWith('.yaml')) {
    yamlFiles.push(inputRoot);
  } else {
    console.error('Input must be a dir or a .yaml file');
    process.exit(1);
  }

  yamlFiles.forEach(f => generateManifestForFile(f, outputDir));
}

main();
2) Configuración rápida
En tu package.json (del monorepo o del package de tooling):

json
{
  "scripts": {
    "gen:ui": "ts-node tools/generate-ui-manifests.ts ./schemas ./ui-manifests"
  },
  "devDependencies": {
    "ts-node": "^10.0.0",
    "typescript": "^5.0.0",
    "js-yaml": "^4.1.0"
  }
}
Asumiendo que tus YAML (osc_va.yaml, filter_va.yaml, etc.) viven en ./schemas.

[x] VEM-1524 El comando npm run gen:ui generará *.ui.json en ./ui-manifests usando el builder adecuado por family/id.

[x] VEM-1525 ¿Te sirve así como base, o quieres que también deje bosquejado cómo integrar este comando en tu pipeline de build (por ejemplo, que Vite/Webpack incluya automáticamente los .ui.json en el bundle del preset)?

[x] VEM-1526 La integración más simple es tratar los .ui.json como artefactos de build previos y hacer que el preset los importe estáticamente.

1) Hook de generación antes del build
En el package.json del preset OMEGA (el que publica el renderer):

json
{
  "scripts": {
    "prebuild": "ts-node tools/generate-ui-manifests.ts ./schemas ./src/generated/ui-manifests",
    "build": "vite build"
  }
}
prebuild genera src/generated/ui-manifests/*.ui.json a partir de tus YAML antes de que Vite compile nada.

[x] VEM-1527 Así siempre construyes con manifests frescos sin depender de pasos manuales.

2) Incluir los manifests en el bundle
Opción A: Import estático por módulo
En tu preset:

ts
// src/generated/ui-manifests/index.ts
import filterVa from './filter_va.ui.json';
import oscVa from './osc_va.ui.json';

export const uiManifests = {
  filter_va: filterVa,
  osc_va: oscVa,
};
Y luego:

ts
// src/preset.ts
export { uiManifests } from './generated/ui-manifests';
Vite incluirá esos JSON directamente en el bundle ESM/UMD.

[x] VEM-1528 Opción B: import.meta.glob (si quieres escalar sin tocar código)
ts
// src/generated/ui-manifests/index.ts
export const uiManifests = import.meta.glob('./*.ui.json', {
  eager: true,
  import: 'default',
}) as Record<string, any>;
La clave será algo como './filter_va.ui.json'; puedes normalizarla a filter_va al leer.

[x] VEM-1529 Esto te permite añadir nuevos YAML y manifests sin tener que editar el index a mano.

3) Exponerlos como parte del preset
En el entry del preset:

ts
// src/index.ts
export { create } from './renderer';
export { uiManifests } from './generated/ui-manifests';
El editor (o cualquier cliente) puede hacer:

ts
import { uiManifests } from 'omega-preset-ui';

const oscManifest = uiManifests['./osc_va.ui.json'] ?? uiManifests['osc_va'];
Según cómo lo normalices.

4) Integración con WebUI/editor
WebUI: al instanciar un módulo, puede mirar si hay un manifest en uiManifests[module.kind] y, si existe, usarlo para construir el ModuleViewModel (en vez de layout “hardcodeado”).

[x] VEM-1530 Editor: carga siempre desde uiManifests, permite editar, y opcionalmente guarda de vuelta a YAML (vía las funciones de merge que ya definimos).

5) Opcional: chequeo en CI
En tu pipeline de CI/CD:

[x] VEM-1531 Paso 1: npm run gen:ui.

[x] VEM-1532 Paso 2: npm test (incluyendo tests de builders/migraciones).

[x] VEM-1533 Paso 3: npm run build (Vite).

[x] VEM-1534 Así te aseguras de que los .ui.json están consistentes con los YAML antes de publicar el preset.

[x] VEM-1535 ¿Te interesa que dejemos también una pequeña convención de nombres para las rutas (./schemas/modules/*.yaml → ./src/generated/ui-manifests/modules/*.ui.json) para mantenerlo organizado cuando tengas muchos tipos de módulo?


[x] VEM-1536 La convención de rutas ayuda mucho cuando esto crezca.

1) Estructura sugerida de directorios
Schemas de módulos:

schemas/modules/osc/osc_va.yaml

schemas/modules/filter/filter_va.yaml

schemas/modules/mod/env_va.yaml, etc.

[x] VEM-1537 Manifests generados:

src/generated/ui-manifests/modules/osc/osc_va.ui.json

src/generated/ui-manifests/modules/filter/filter_va.ui.json

[x] VEM-1538 Regla: misma subcarpeta y nombre base, cambiando extensión .yaml → .ui.json.

2) Adaptar el CLI a esta convención
En el generate-ui-manifests.ts, al escribir:

ts
function generateManifestForFile(inputPath: string, outputRoot: string) {
  const schema = readYaml(inputPath);
  if (!schema.registry) {
    console.warn(`Skipping ${inputPath}: no registry`);
    return;
  }

  let manifest: any;

  if (schema.family === 'Filter') {
    manifest = buildUiManifestFromFilterSchema(schema as any);
  } else {
    // otros builders...
    return;
  }

  // Mantener la subruta relativa dentro de schemas
  const rel = path.relative('schemas', inputPath); // modules/filter/filter_va.yaml
  const relNoExt = rel.replace(/\.yaml$/i, '');    // modules/filter/filter_va

  const outPath = path.join(outputRoot, `${relNoExt}.ui.json`);
  writeJson(outPath, manifest);
  console.log(`Generated UI manifest: ${outPath}`);
}
Y llamas al CLI con:

json
"prebuild": "ts-node tools/generate-ui-manifests.ts ./schemas ./src/generated/ui-manifests"
3) Carga en el preset con import.meta.glob
ts
// src/generated/ui-manifests/index.ts
export const uiManifests = import.meta.glob(
  './modules/**/*.ui.json',
  { eager: true, import: 'default' }
) as Record<string, any>;

// Helper para clave normalizada
export function getUiManifest(moduleId: string) {
  // Espera ids tipo "osc_va", "filter_va"
  const pattern = `./modules/**/${moduleId}.ui.json`;
  const entries = Object.entries(uiManifests).filter(([k]) => {
    return k.endsWith(`/${moduleId}.ui.json`);
  });
  return entries[0]?.[1];
}
Así mantienes una jerarquía limpia por familia (osc, filter, mod, etc.) sin complicar el consumo: el cliente sólo pide getUiManifest('filter_va').

[x] VEM-1539 ¿Te parece bien dejarlo aquí y que el siguiente bloque ya lo enfoques tú en implementar/integrar, o quieres que bajemos a algún detalle concreto más (por ejemplo, naming de moduleId vs schema.id cuando no coincidan 1:1)?


[ ] VEM-1540 Para que no se te desmadre el naming, mejor fijar reglas claras entre schema.id (YAML) y moduleId/kind (runtime).

1) Regla general
Regla preferida: moduleId === schema.id.

[ ] VEM-1541 Si el YAML dice id: "filter_va", el módulo en el graph se llama kind: "filter_va".

[ ] VEM-1542 El manifest se genera como filter_va.ui.json y getUiManifest('filter_va') funciona directo.

[ ] VEM-1543 Mientras puedas, mantén esto; elimina una capa entera de traducción.

2) Cuando NO pueden coincidir
Hay casos típicos:

[ ] VEM-1544 Un mismo schema.id que se usa en varias variantes (p.ej. filter_va pero módulos filter_va_lp, filter_va_hp).

[ ] VEM-1545 Un engine compartido (schema.id = "dco_60") que se usa en presets distintos (osc_va, osc_va_sync, etc.).

[ ] VEM-1546 En esos casos define explícitamente:

ts
// ui/modules/src/core/schemaIndex.ts
export type SchemaIndexEntry = {
  schemaId: string;   // id del YAML
  moduleIds: string[]; // ids/kinds de módulos que usan ese schema
};

export const schemaIndex: SchemaIndexEntry[] = [
  {
    schemaId: 'filter_va',
    moduleIds: ['filter_va', 'filter_va_lp', 'filter_va_hp'],
  },
  {
    schemaId: 'osc_va',
    moduleIds: ['osc_va', 'osc_va_sync'],
  },
];
Y un helper para ir de un lado a otro:

ts
export function moduleIdFromSchemaId(schemaId: string): string {
  // el primero es el “principal”
  const entry = schemaIndex.find(e => e.schemaId === schemaId);
  return entry?.moduleIds[0] ?? schemaId;
}

export function schemaIdFromModuleId(moduleId: string): string {
  const entry = schemaIndex.find(e => e.moduleIds.includes(moduleId));
  return entry?.schemaId ?? moduleId;
}
El builder CLI usa schema.id para nombrar los .ui.json (filter_va.ui.json).

[ ] VEM-1547 En runtime, cuando tienes un module.kind = "filter_va_lp", llamas a schemaIdFromModuleId('filter_va_lp') → filter_va y luego getUiManifest('filter_va') para pintarlo igual.

3) Convención recomendada
schema.id: identifica el modelo DSP (engine/layout de parámetros).

module.kind / moduleId: identifica la variante de módulo en el graph (puede compartir schema).

[ ] VEM-1548 Los manifests de UI (*.ui.json) se nombran por schema.id, porque describen el layout de ese modelo; las variantes visuales van por encima (p.ej. otro skin, pero mismo manifest).

[ ] VEM-1549 Si algún día necesitas un layout distinto para una variante concreta, puedes:

[x] VEM-1550 Duplicar schema (filter_va_lp.yaml vs filter_va_hp.yaml) o

[x] VEM-1551 Añadir un sufijo explícito en el manifest (filter_va.lp.ui.json) y extender schemaIndex para mapear moduleId → manifestId en lugar de moduleId → schemaId.

[x] VEM-1552 Con estas reglas, el naming se mantiene predecible y no necesitas heurísticas mágicas para buscar manifests/schema por módulo.

[x] VEM-1553 ¿Te vale así o quieres que también te deje un mini ejemplo donde una variante (filter_va_lp) reusa el mismo filter_va.yaml pero carga un skin CSS diferente manteniendo el mismo manifest?

[x] VEM-1554 Caso: filter_va y filter_va_lp comparten schema + manifest, pero filter_va_lp usa un skin distinto.

1) Schema y manifest únicos
schemas/modules/filter/filter_va.yaml → schema.id = "filter_va".

src/generated/ui-manifests/modules/filter/filter_va.ui.json → manifest único para el modelo filter VA.

[x] VEM-1555 Ambos módulos (filter_va y filter_va_lp) usan esto.

2) Índice de variantes
ts
// ui/modules/src/core/schemaIndex.ts
export type VariantEntry = {
  schemaId: string;
  moduleId: string;    // kind en el graph
  skinClass?: string;  // CSS extra
};

export const variants: VariantEntry[] = [
  { schemaId: 'filter_va', moduleId: 'filter_va', skinClass: 'omega-filter-va' },
  { schemaId: 'filter_va', moduleId: 'filter_va_lp', skinClass: 'omega-filter-va-lp' },
];

export function resolveVariant(moduleId: string): VariantEntry {
  return variants.find(v => v.moduleId === moduleId) ?? {
    schemaId: moduleId,
    moduleId,
    skinClass: undefined,
  };
}
3) Uso en el renderer
ts
// en tu código de integración (WebUI/editor)
import { getUiManifest } from './generated/ui-manifests';
import { resolveVariant } from './core/schemaIndex';
import { create as createRenderer } from './renderer';

function mountModule(kind: string, container: HTMLElement) {
  const variant = resolveVariant(kind);
  const manifest = getUiManifest(variant.schemaId);

  // opcional: aplicar skin CSS al container
  if (variant.skinClass) {
    container.classList.add(variant.skinClass);
  }

  // construir descriptor y values según tu graph...
  const descriptor = { id: kind, kind, schema: {/* ... */}, bindings: {} };

  createRenderer({
    container,
    descriptor,
    values: {/* ... */},
    telemetry: {/* ... */},
    onChange: () => {},
    onCommand: () => {},
  });
}
filter_va y filter_va_lp comparten layout (manifest + schema) pero se diferencian visualmente por skinClass (por ejemplo, distintas clases CSS para color/tema).

[x] VEM-1556 No duplicas YAML ni manifests; sólo añades entradas en variants para las nuevas variantes de módulo.

[x] VEM-1557 ¿Quieres que dejemos también un pequeño ejemplo de CSS con las dos skins (omega-filter-va vs omega-filter-va-lp) para ver la separación práctica?


[x] VEM-1558 Te dejo un ejemplo muy simple con dos skins.

css
/* src/styles/omega-filter-va.css */

/* Skin base filter_va */
.omega-filter-va .omega-panel {
  background: radial-gradient(circle at top left, #1a1f2a, #05060a);
  border: 1px solid #333b4f;
  color: #e0e4f5;
}

.omega-filter-va .omega-group-title {
  color: #a7b3ff;
}

.omega-filter-va .omega-knob {
  --knob-fill: #4bc0ff;
  --knob-track: #10131c;
}

/* Skin variante LP */
.omega-filter-va-lp .omega-panel {
  background: radial-gradient(circle at top left, #1f211a, #050605);
  border: 1px solid #3f4f33;
  color: #f0f5e0;
}

.omega-filter-va-lp .omega-group-title {
  color: #d0ff91;
}

.omega-filter-va-lp .omega-knob {
  --knob-fill: #a4ff4b;
  --knob-track: #161c10;
}

/* Opcional: diferencias en leds/meters */
.omega-filter-va .omega-led-meter {
  --led-on: #4bc0ff;
  --led-off: #1a2430;
}

.omega-filter-va-lp .omega-led-meter {
  --led-on: #a4ff4b;
  --led-off: #202618;
}
El renderer sólo necesita envolver el panel en .omega-panel y knobs/leds en .omega-knob, .omega-led-meter, etc.; el skin se decide añadiendo .omega-filter-va o .omega-filter-va-lp al contenedor raíz.

[x] VEM-1559 Así filter_va y filter_va_lp comparten schema + manifest; la variante es puramente de estilo, sin tocar el pipeline Era 6.

[ ] VEM-1560 ¿Quieres que en algún momento aterricemos también una pequeña guía de nombres de clases CSS “oficiales” para los widgets (omega-knob, omega-fader, etc.) para mantener skins consistentes entre módulos?


[ ] VEM-1561 Te propongo un set pequeño y estable de clases CSS “oficiales” para todos los widgets, de forma que cualquier skin pueda apoyarse en ellas sin saber nada del módulo concreto.

[ ] VEM-1562 Prefijo y estructura base
Prefijo global: .omega-…

[ ] VEM-1563 Estructura típica:

[ ] VEM-1564 Contenedor de panel: .omega-panel

[ ] VEM-1565 Grupo: .omega-group, título .omega-group-title

[ ] VEM-1566 Widget genérico: .omega-widget + modificador de tipo (.omega-widget--knob, etc.)

[ ] VEM-1567 Clases por widget
Knob:

[ ] VEM-1568 Contenedor: .omega-widget.omega-widget--knob

[ ] VEM-1569 Elemento gráfico: .omega-knob

[ ] VEM-1570 Label: .omega-widget-label

[ ] VEM-1571 Value (si se muestra): .omega-widget-value

[ ] VEM-1572 Fader (slider):

[ ] VEM-1573 Contenedor: .omega-widget.omega-widget--fader

[ ] VEM-1574 Track: .omega-fader-track

[ ] VEM-1575 Thumb: .omega-fader-thumb

[ ] VEM-1576 Toggle:

[ ] VEM-1577 Contenedor: .omega-widget.omega-widget--toggle

[ ] VEM-1578 Switch: .omega-toggle

[ ] VEM-1579 Estado: .omega-toggle-indicator

[ ] VEM-1580 Enum-select:

[ ] VEM-1581 Contenedor: .omega-widget.omega-widget--enum-select

[ ] VEM-1582 Select nativo o custom: .omega-select

[ ] VEM-1583 Display:

[ ] VEM-1584 Contenedor: .omega-widget.omega-widget--display

[ ] VEM-1585 Texto/valor: .omega-display

[ ] VEM-1586 LED / meter:

[ ] VEM-1587 Contenedor: .omega-widget.omega-widget--led

[ ] VEM-1588 Barra o puntos: .omega-led-meter

[ ] VEM-1589 ADSR compuesto:

[ ] VEM-1590 Contenedor: .omega-widget.omega-widget--adsr-envelope

[ ] VEM-1591 Raíz gráfica: .omega-adsr-envelope

[ ] VEM-1592 Fila de segmento: .omega-adsr-row

[ ] VEM-1593 Label de segmento: .omega-adsr-segment-label

[ ] VEM-1594 Ejemplo mínimo de CSS base
css
.omega-panel {
  display: flex;
  flex-direction: column;
  padding: 8px;
}

.omega-group {
  margin-bottom: 8px;
}

.omega-group-title {
  font-size: 11px;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.omega-widget {
  font-size: 11px;
}

.omega-widget-label {
  display: block;
  margin-top: 4px;
  text-align: center;
}

/* Knob */
.omega-widget--knob .omega-knob {
  width: 32px;
  height: 32px;
}

/* Fader */
.omega-widget--fader .omega-fader-track {
  width: 8px;
  height: 64px;
}

/* Toggle */
.omega-widget--toggle .omega-toggle {
  width: 24px;
  height: 14px;
}

/* LED */
.omega-widget--led .omega-led-meter {
  height: 40px;
}
Con esto, cualquier skin sólo tiene que sobreescribir estas clases dentro de su wrapper (.omega-filter-va, .omega-filter-va-lp, etc.) y todos los módulos se mantendrán visualmente coherentes sin acoplarse a nombres ad‑hoc.

[ ] VEM-1595 ¿Te parece bien si dejamos aquí la parte de diseño y ya pasas a implementar, o quieres que en otra sesión aterricemos un módulo distinto (por ejemplo, uno de modulación compleja) usando exactamente estas clases y contrato?


[ ] VEM-1596 Para modulación compleja, un buen ejemplo es un módulo tipo “Mod Matrix” reducido, usando exactamente el contrato y las clases que hemos definido.

1) Schema YAML básico mod_matrix.yaml
text
id: "mod_matrix_4x4"
name: "Mod Matrix 4x4"
family: "Modulation"
engine: "Modular"
modelId: "MOD-MATRIX-4x4"
version: 1
status: "active"
description: "Four-slot modulation matrix with source, destination, amount and polarity."

layout:
  hp: 16
  rack: "upper"
  columns: 4

registry:
  # Slot 1
  - id: "mod.slot1.source"
    label: "SRC 1"
    roles: ["control"]
    direction: "internal"
    presentation: { tab: "MAIN", group: "SLOT 1", order: 1, ui: { component: "select" } }

  - id: "mod.slot1.dest"
    label: "DEST 1"
    roles: ["control"]
    direction: "internal"
    presentation: { tab: "MAIN", group: "SLOT 1", order: 2, ui: { component: "select" } }

  - id: "mod.slot1.amount"
    label: "AMT 1"
    roles: ["control", "mod_target"]
    direction: "internal"
    range: { min: -1, max: 1, default: 0 }
    presentation: { tab: "MAIN", group: "SLOT 1", order: 3, ui: { component: "slider-v" } }

  - id: "mod.slot1.enable"
    label: "ON 1"
    roles: ["control"]
    direction: "internal"
    range: { min: 0, max: 1, default: 0 }
    presentation: { tab: "MAIN", group: "SLOT 1", order: 4, ui: { component: "toggle" } }

  # Slots 2–4: mismo patrón cambiando slotN.*
Este YAML sigue la misma estructura que los anteriores: presentation.tab/group/order/ui.component, range sólo donde es continuo.

2) Manifest UI mod_matrix_4x4.ui.json (simplificado)
Builder genérico (similar al de filtro) dará algo así:

ts
export const modMatrixUiManifest = {
  uiVersion: 2,
  tabs: [
    { id: 'main', label: 'MAIN', order: 0 },
  ],
  groups: [
    { id: 'slot_1', label: 'SLOT 1', tabId: 'main', order: 0 },
    { id: 'slot_2', label: 'SLOT 2', tabId: 'main', order: 1 },
    { id: 'slot_3', label: 'SLOT 3', tabId: 'main', order: 2 },
    { id: 'slot_4', label: 'SLOT 4', tabId: 'main', order: 3 },
  ],
  widgets: [
    // Slot 1
    {
      id: 'mod.slot1.source',
      widgetId: 'enum-select',
      label: 'SRC 1',
      binding: { target: 'slot', id: 'mod.slot1.source' },
      props: {
        enumOptions: [
          { value: 'lfo1', label: 'LFO 1' },
          { value: 'lfo2', label: 'LFO 2' },
          { value: 'env1', label: 'ENV 1' },
          { value: 'vel', label: 'Velocity' },
        ],
      },
      layout: { tabId: 'main', groupId: 'slot_1', row: 0, col: 0 },
    },
    {
      id: 'mod.slot1.dest',
      widgetId: 'enum-select',
      label: 'DEST 1',
      binding: { target: 'slot', id: 'mod.slot1.dest' },
      props: {
        enumOptions: [
          { value: 'filter.cutoff', label: 'Cutoff' },
          { value: 'osc.pitch', label: 'Pitch' },
          { value: 'amp.level', label: 'Amp' },
        ],
      },
      layout: { tabId: 'main', groupId: 'slot_1', row: 0, col: 1 },
    },
    {
      id: 'mod.slot1.amount',
      widgetId: 'fader',
      label: 'AMT 1',
      binding: { target: 'param', id: 'mod.slot1.amount' },
      props: { min: -1, max: 1, step: 0.01, orientation: 'vertical' },
      layout: { tabId: 'main', groupId: 'slot_1', row: 0, col: 2 },
    },
    {
      id: 'mod.slot1.enable',
      widgetId: 'toggle',
      label: 'ON 1',
      binding: { target: 'flag', id: 'mod.slot1.enable' },
      props: {},
      layout: { tabId: 'main', groupId: 'slot_1', row: 0, col: 3 },
    },
    // Slots 2–4: igual con slot2.*, slot3.*, slot4.*
  ],
};
Todo sigue el contrato: BindingRef, widgetId, layout, convención target:id para ModuleValues.

3) Render con clases CSS oficiales
Tu PanelRenderer para estos widgets usará las clases que definimos:

[ ] VEM-1597 Panel: .omega-panel

[ ] VEM-1598 Grupo: .omega-group / .omega-group-title

[ ] VEM-1599 Widgets: .omega-widget omega-widget--enum-select, .omega-widget--fader, .omega-widget--toggle, etc.

[ ] VEM-1600 Ejemplo de montaje de un slot en HTML generado:

xml
<div class="omega-panel">
  <div class="omega-group">
    <div class="omega-group-title">SLOT 1</div>
    <div class="omega-widget omega-widget--enum-select">
      <select class="omega-select">...</select>
      <span class="omega-widget-label">SRC 1</span>
    </div>
    <div class="omega-widget omega-widget--enum-select">
      <select class="omega-select">...</select>
      <span class="omega-widget-label">DEST 1</span>
    </div>
    <div class="omega-widget omega-widget--fader">
      <div class="omega-fader-track">
        <div class="omega-fader-thumb"></div>
      </div>
      <span class="omega-widget-label">AMT 1</span>
    </div>
    <div class="omega-widget omega-widget--toggle">
      <div class="omega-toggle"></div>
      <span class="omega-widget-label">ON 1</span>
    </div>
  </div>
  <!-- SLOT 2–4 ... -->
</div>
Los skins (por módulo o por categoría “Modulation”) sólo tienen que apuntar a esas clases; el contrato Era 6 y el pipeline (schema → manifest → ViewModel → renderer) no cambian.

[ ] VEM-1601 ¿Te resulta suficiente este módulo de modulación como prueba de que el esquema escala, o quieres que en otra sesión bajemos a detalles específicos de interacción (por ejemplo, cómo reflejar visualmente rutas deshabilitadas o fuentes no disponibles en el enum)?


[ ] VEM-1602 Para modulación avanzada, basta con añadir unos flags y convenciones ligeras a tus ViewModels y CSS.

[ ] VEM-1603 Estados de opción en enum-select
Amplía WidgetViewModel para soportar opciones deshabilitadas u ocultas:

ts
export type EnumOptionVm = {
  value: string;
  label: string;
  disabled?: boolean;   // visible pero no seleccionable
  hidden?: boolean;     // no se muestra en el listado
};

export type WidgetViewModel = {
  // ...
  enumOptions?: EnumOptionVm[];
};
En WidgetRegistry:

tsx
// pseudocódigo TS/JSX
<select
  className="omega-select"
  value={currentValue}
  onChange={...}
>
  {vm.enumOptions
    ?.filter(o => !o.hidden)
    .map(opt => (
      <option
        key={opt.value}
        value={opt.value}
        disabled={opt.disabled}
      >
        {opt.label}
      </option>
    ))}
</select>
CSS para destacar deshabilitados:

css
.omega-select option:disabled {
  color: #666;
}
Estados de slot en la matriz de modulación
Añade flags al WidgetViewModel para reflejar disponibilidad:

ts
export type WidgetViewModel = {
  // ...
  disabled?: boolean;      // todo el widget inactivo
  warning?: string;        // aviso (p.ej. "Source not available")
  info?: string;           // tooltip informativo
};
En el render:

tsx
<div
  className={[
    'omega-widget',
    'omega-widget--enum-select',
    vm.disabled ? 'omega-widget--disabled' : '',
    vm.warning ? 'omega-widget--warning' : '',
  ].join(' ')}
>
  <select
    className="omega-select"
    disabled={vm.disabled}
    title={vm.info || vm.warning}
  >
    {/* opciones */}
  </select>
  <span className="omega-widget-label">{vm.label}</span>
</div>
CSS:

css
.omega-widget--disabled {
  opacity: 0.5;
  pointer-events: none;
}

.omega-widget--warning .omega-widget-label::after {
  content: ' ⚠';
  color: #ffb347;
}
Lógica para marcar fuentes/destinos no disponibles
En el ViewModelBuilder del módulo de modulación:

[ ] VEM-1604 Recibe también un contexto de disponibilidad (p.ej. fuentes/destinos presentes en el patch actual).

[ ] VEM-1605 Marca opciones y widgets según ese contexto.

[ ] VEM-1606 Ejemplo:

ts
type ModContext = {
  availableSources: string[];
  availableDestinations: string[];
};

function buildModMatrixVm(
  descriptor: ModuleDescriptor,
  values: ModuleValues,
  telemetry: ModuleTelemetry,
  readOnly: boolean,
  ctx: ModContext
): ModuleViewModel {
  // ... construir base

  vm.widgets = vm.widgets.map(w => {
    if (w.id.startsWith('mod.slot') && w.widgetId === 'enum-select') {
      const isSource = w.id.includes('.source');
      const allowed = isSource ? ctx.availableSources : ctx.availableDestinations;

      const enumOptions = (w.enumOptions ?? []).map(opt => ({
        ...opt,
        disabled: !allowed.includes(opt.value),
      }));

      const current = getValue(values, w.binding);
      const invalidSelection =
        typeof current === 'string' && !allowed.includes(current);

      return {
        ...w,
        enumOptions,
        disabled: readOnly,
        warning: invalidSelection ? 'Target not available' : undefined,
      };
    }

    return w;
  });

  return vm;
}
Así:

[ ] VEM-1607 Opciones no disponibles aparecen deshabilitadas; si el valor actual es inválido, el widget muestra un warning pero no revienta.

[ ] VEM-1608 No rompes el contrato Era 6: sigues usando WidgetViewModel + WidgetRegistry, sólo enriquecidos con flags de estado.

[ ] VEM-1609 ¿Te interesa que en otra sesión bajemos a cómo expresar estos estados (disabled/warning) también en los manifests (props) para que algunas restricciones vengan ya “de fábrica” desde el YAML?


[ ] VEM-1610 Puedes llevar parte de esos estados al nivel de schema/manifest codificando restricciones simples en props, sin meter lógica de runtime en el YAML.

1) Flags “de fábrica” en el manifest
Amplía ManifestWidget.props para admitir:

ts
type ManifestWidgetProps = {
  disabled?: boolean;      // siempre deshabilitado
  readOnly?: boolean;      // sólo lectura
  warningText?: string;    // aviso estático
  enumOptions?: {
    value: string;
    label: string;
    disabled?: boolean;    // opción nunca seleccionable
    hidden?: boolean;      // opción invisible
  }[];
  // ... resto (min, max, unit, etc.)
};
Ejemplo en mod_matrix_4x4.ui.json:

json
{
  "id": "mod.slot1.dest",
  "widgetId": "enum-select",
  "label": "DEST 1",
  "binding": { "target": "slot", "id": "mod.slot1.dest" },
  "props": {
    "enumOptions": [
      { "value": "filter.cutoff", "label": "Cutoff" },
      { "value": "osc.pitch", "label": "Pitch" },
      { "value": "amp.level", "label": "Amp", "disabled": true }
    ],
    "warningText": "Amp destination not available in this engine"
  },
  "layout": { "tabId": "main", "groupId": "slot_1", "row": 0, "col": 1 }
}
El ViewModelBuilder simplemente copia estos props al WidgetViewModel; el WidgetRegistry ya sabe leer disabled, hidden, warningText y pintar CSS acorde.

2) Notas en YAML sin lógica de UI
Si quieres que parte de esta info viva en el YAML, hazlo con un bloque de metadata sin mezclar presentación:

text
- id: "mod.slot1.dest"
  label: "DEST 1"
  roles: ["control"]
  direction: "internal"
  meta:
    ui:
      enumOptions:
        - value: "filter.cutoff"
          label: "Cutoff"
        - value: "osc.pitch"
          label: "Pitch"
        - value: "amp.level"
          label: "Amp"
          disabled: true
      warningText: "Amp destination not available in this engine"
  presentation:
    tab: "MAIN"
    group: "SLOT 1"
    order: 2
    ui: { component: "select" }
En el builder YAML → manifest:

ts
if (entry.meta?.ui?.enumOptions) {
  props.enumOptions = entry.meta.ui.enumOptions;
}
if (entry.meta?.ui?.warningText) {
  props.warningText = entry.meta.ui.warningText;
}
if (entry.meta?.ui?.disabled === true) {
  props.disabled = true;
}
Así mantienes el YAML como “source of truth” extendido, pero toda la lógica de cómo se pinta sigue en el preset Era 6.

[ ] VEM-1611 ¿Te interesa que en otra tanda bajemos a cómo priorizar estos flags “de fábrica” (manifest/meta) frente a estados dinámicos (runtime) cuando ambos existen, o con esto ya tienes base para jugar?