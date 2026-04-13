# ACE: Package Distribution Specification (Era 6)

## 1. Introducción

La especificación **ACEPACK** evoluciona en la **Era 6** para centrarse exclusivamente en la integridad y distribución de los recursos del sintetizador. Se elimina la dependencia de estrategias DSP rígidas (como WASM payload obligatorio) y se prioriza la compatibilidad del esquema y la declaración de recursos.

---

## 2. Estructura del Paquete (.acepack)

Un paquete OMEGA es un contenedor (directorio o archivo comprimido) que incluye:

### A. Manifest de Paquete (`package.yaml`)
Define la identidad y el contenido del paquete:
- `package_id`: Identificador único del proveedor/paquete.
- `version`: Versión semántica del paquete.
- `compatibility`: Versión mínima del motor OMEGA requerida.
- `modules`: Lista de punteros a los manifiestos de los módulos incluidos.

### B. Recursos Locales
- **Manifests**: Archivos `.yaml` (o `.acemm`) de definición de módulos.
- **Assets**: Carpeta `assets/` relativa al manifiesto del módulo.
  - El icono oficial debe residir en `assets/[id].png` (o `.svg`).
  - El skin del tema puede incluir archivos `.css` si el tema es `custom`.
- **Data**: Tablas de ondas (Wavetables), muestras (Samples) o curvas de respuesta.

---

## 3. Binarios y Provisión de Implementación

A diferencia de eras anteriores, la Era 6 no impone un formato binario único para el DSP. El motor OMEGA resuelve la implementación basándose en las capacidades del host:
- **Built-in Implementation**: El motor ya contiene el código para el `typeId` solicitado.
- **Dynamic Link**: Carga de librerías nativas (`.dll`, `.so`, `.dylib`) bajo demanda.
- **Sandboxed Runtime (WASM)**: Ejecución aislada para módulos de terceros que requieren seguridad.

---

## 4. Convenciones de Nomenclatura e IDs

Se mantiene la jerarquía semántica para evitar colisiones:
`vendor.package.module.entity`

Ejemplo: `omega.oscillators.osc_va.v_out`

---

## 5. Distribución y Auto-descubrimiento

El servicio **AceCatalog** escanea los directorios de paquetes configurados y registra automáticamente los esquemas encontrados. No se requiere registro manual en el código fuente del plugin para que un nuevo paquete sea visible en el navegador de módulos.

---
*OMEGA — Distribución de Paquetes Era 6*
