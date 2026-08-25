/**
 * Template Factory — Scoring de QA
 * PASS C · generator-v1
 *
 * Módulo puro: recibe los resultados de cada chequeo y produce un score 0-100.
 * La ejecución real (render, viewports, screenshots) vive en el runner de
 * Playwright, porque necesita un navegador.
 *
 * REGLA: el score es ADVISORY. No autoriza publicación. La única vía a PUBLIC
 * sigue siendo la acción humana explícita en la biblioteca de PASS B.
 */

export interface QaCheckResults {
  schemaValid: boolean;
  rendererSuccess: boolean;
  noOverflow: boolean;
  buttonIntegrity: boolean;
  assetIntegrity: boolean;
  urlSafety: boolean;
  roundTrip: boolean;
}

/** Pesos definidos en la spec de PASS C. Suman 100. */
export const QA_WEIGHTS = {
  schemaValid: 25,
  rendererSuccess: 20,
  noOverflow: 15,
  buttonIntegrity: 10,
  assetIntegrity: 10,
  urlSafety: 10,
  roundTrip: 10,
} as const satisfies Record<keyof QaCheckResults, number>;

export type QaCheckName = keyof QaCheckResults;

export interface QaFinding {
  check: QaCheckName | "viewport" | "registry-parity" | "config-parity";
  severity: "error" | "warning" | "info";
  message: string;
  detail?: string;
}

export interface QaResult {
  /** 0-100 (entero). */
  score: number;
  /** 0.00-1.00, formato que persiste la columna `qa_score` de PASS B. */
  scoreNormalized: number;
  passed: QaCheckName[];
  failed: QaCheckName[];
  findings: QaFinding[];
  /** true solo si todos los chequeos bloqueantes pasaron. */
  blockingOk: boolean;
}

/**
 * Chequeos que impiden considerar la generación "exitosa".
 * Un template que falle uno de estos NO debe ingresar a la biblioteca como
 * GENERATED_PRIVATE exitoso: se registra como fallo de generación.
 */
export const BLOCKING_CHECKS: readonly QaCheckName[] = [
  "schemaValid",
  "rendererSuccess",
  "urlSafety",
];

export function computeQaScore(
  results: QaCheckResults,
  findings: QaFinding[] = [],
): QaResult {
  const names = Object.keys(QA_WEIGHTS) as QaCheckName[];
  const passed: QaCheckName[] = [];
  const failed: QaCheckName[] = [];
  let score = 0;

  for (const name of names) {
    if (results[name]) {
      score += QA_WEIGHTS[name];
      passed.push(name);
    } else {
      failed.push(name);
    }
  }

  const blockingOk = BLOCKING_CHECKS.every((check) => results[check]);

  const derivedFindings: QaFinding[] = failed.map((check) => ({
    check,
    severity: BLOCKING_CHECKS.includes(check) ? "error" : "warning",
    message: QA_CHECK_MESSAGES[check],
  }));

  return {
    score,
    scoreNormalized: Number((score / 100).toFixed(2)),
    passed,
    failed,
    findings: [...derivedFindings, ...findings],
    blockingOk,
  };
}

const QA_CHECK_MESSAGES: Record<QaCheckName, string> = {
  schemaValid: "El TemplateConfig no pasó la validación de esquema",
  rendererSuccess: "El renderer compartido no pudo renderizar el config",
  noOverflow: "Se detectó overflow horizontal en al menos un viewport",
  buttonIntegrity: "La cantidad u orden de botones renderizados no coincide con el config",
  assetIntegrity: "Una referencia de asset es inválida o no resolvió",
  urlSafety: "Se detectó una URL con protocolo no permitido",
  roundTrip: "El config no sobrevivió el round-trip sin pérdidas",
};

/** Viewports obligatorios de la spec. */
export const QA_VIEWPORTS = [
  { name: "320x700", width: 320, height: 700 },
  { name: "375x812", width: 375, height: 812 },
  { name: "390x844", width: 390, height: 844 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1280x800", width: 1280, height: 800 },
] as const;

/** Margen de tolerancia en px para overflow: absorbe redondeos subpíxel. */
export const OVERFLOW_TOLERANCE_PX = 2;
