/**
 * AceLint Service - Pedagogical Validation for OMEGA Era 6.1
 * Transforms technical JSON schema errors into human-readable sound engineering advice.
 */

export interface AceLintError {
  path: string;
  message: string;
  level: 'error' | 'warning' | 'suggestion';
  fix?: string;
}

export const translateAsepticError = (technicalError: any): AceLintError => {
  const path = technicalError.instancePath || 'root';
  const paramName = path.split('/').pop() || 'field';

  // 1. Mapeo de errores de esquema (AJV / JSON Schema)
  if (technicalError.keyword === 'pattern') {
    return {
      path,
      level: 'error',
      message: `El ID "${technicalError.data}" no es aséptico.`,
      fix: "Usa solo minúsculas, números y guiones bajos (ej: cutoff_frequency)."
    };
  }

  if (technicalError.keyword === 'minLength') {
    return {
      path,
      level: 'warning',
      message: `El campo ${paramName} es demasiado escueto.`,
      fix: "OMEGA requiere metadatos descriptivos para generar documentación técnica de calidad."
    };
  }

  if (technicalError.keyword === 'required') {
    return {
      path,
      level: 'error',
      message: `Falta información vital: [${technicalError.params.missingProperty}].`,
      fix: "Este campo es obligatorio para que el contrato de integración sea válido."
    };
  }

  // Error genérico por defecto
  return {
    path,
    level: 'error',
    message: technicalError.message || 'Error de contrato.',
    fix: 'Revisa la sintaxis del esquema Era 6.1.'
  };
};

/**
 * Heuristic Validations - Sound Design Best Practices
 */
export const runHeuristicChecks = (moduleData: any): AceLintError[] => {
  const errors: AceLintError[] = [];

  // 1. Validación de Descripción
  if (moduleData.description && moduleData.description.length < 20) {
    errors.push({
      path: '/description',
      level: 'warning',
      message: "Descripción poco pedagógica.",
      fix: "Añade detalles sobre cómo afecta este módulo al flujo de señal o control."
    });
  }

  // 2. Validación de Registry (Sound Design Logic)
  moduleData.registry.forEach((item: any, index: number) => {
    const itemPath = `/registry/${index}`;

    // Alertas de Rango
    if (item.type === 'float' && (!item.range || (item.range.min === 0 && item.range.max === 0))) {
        errors.push({
          path: `${itemPath}/range`,
          level: 'suggestion',
          message: `El parámetro "${item.label}" no tiene un rango útil.`,
          fix: "Para controles estándar, se recomienda 0.0 a 1.0."
        });
    }

    // Alertas de Audio vs Control
    if (item.type === 'audio' && !item.roles.includes('output') && !item.roles.includes('input')) {
        errors.push({
          path: `${itemPath}/roles`,
          level: 'warning',
          message: "Los streams de audio deben ser Input o Output.",
          fix: "Asegúrate de marcar el rol correcto para la integración del Patchbay."
        });
    }
  });

  return errors;
};
