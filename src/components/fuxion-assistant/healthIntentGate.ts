// Health Intent Gate for FuXion Assistant
// This file implements a deterministic local classifier that detects health‑related user intent
// and provides a short safety instruction when needed.

/**
 * Enum describing the health‑intent level detected in a user message.
 */
export type HealthIntentLevel = 'NONE' | 'MEDICAL_CONTEXT' | 'TREATMENT_REPLACEMENT';

/**
 * Normalizes a string for case‑insensitive, accent‑insensitive comparison.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

// -----------------------------------------------------------------------------
// Trigger vocabularies (examples from the task specification).  Keeping the lists
// short and deterministic guarantees no external dependencies.
// -----------------------------------------------------------------------------

const treatmentReplacementTriggers: string[] = [
  'esto cura',
  'me cura',
  'cura la',
  'cura el',
  'sirve como tratamiento',
  'es un tratamiento',
  'reemplaza el medicamento',
  'puedo dejar el medicamento',
  'puedo dejar mis pastillas',
  'puedo sustituir',
  'en vez de mi tratamiento',
  'reemplaza el tratamiento',
  'me trata la enfermedad',
];

const medicalContextTriggers: string[] = [
  // disease / condition
  'diabetes',
  'hipertension',
  'hipertensión',
  'cancer',
  'cáncer',
  'gastritis',
  'colitis',
  'higado graso',
  'hígado graso',
  'insuficiencia renal',
  'tiroides',
  'hipotiroidismo',
  'hipertiroidismo',
  // medication context
  'medicamento',
  'medicamentos',
  'pastillas',
  'recetado',
  'receta medica',
  'receta médica',
  'tomo metformina',
  'tomo remedios',
  // special population
  'embarazada',
  'embarazo',
  'lactancia',
  'amamantando',
  // contraindication / interaction
  'contraindicacion',
  'contraindicación',
  'puedo tomarlo si',
  'es seguro si',
  'interaccion',
  'interacción',
];

/**
 * Detects the health‑intent level of a user message.
 * The detection is deterministic: it scans for known trigger substrings.
 */
export function detectHealthIntent(message: string): HealthIntentLevel {
  const norm = normalize(message);

  // TREATMENT_REPLACEMENT has priority over MEDICAL_CONTEXT
  for (const phrase of treatmentReplacementTriggers) {
    if (norm.includes(phrase)) {
      return 'TREATMENT_REPLACEMENT';
    }
  }

  for (const phrase of medicalContextTriggers) {
    if (norm.includes(phrase)) {
      return 'MEDICAL_CONTEXT';
    }
  }

  return 'NONE';
}

/**
 * Returns a short safety instruction for the given intent level.
 * Returns null when no instruction is needed (intent === 'NONE').
 */
export function getHealthSafetyInstruction(level: HealthIntentLevel): string | null {
  switch (level) {
    case 'MEDICAL_CONTEXT':
      return (
        'Nota: este producto es un complemento nutricional y no debe ser usado como sustituto de diagnóstico médico, tratamiento prescrito o medicación. Consulte a un profesional de salud antes de cambiar su tratamiento.'
      );
    case 'TREATMENT_REPLACEMENT':
      return (
        'Nota: el producto no debe considerarse un tratamiento ni un sustituto de medicación o cuidado médico prescrito.'
      );
    case 'NONE':
    default:
      return null;
  }
}
