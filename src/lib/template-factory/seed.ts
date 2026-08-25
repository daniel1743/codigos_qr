/**
 * Template Factory — Aleatoriedad determinista
 * PASS C · generator-v1
 *
 * Todo lo que "varía" en el generador pasa por aquí. No se usa Math.random()
 * en ninguna parte del pipeline: mismo seed + mismos parámetros => mismo
 * TemplateConfig, que es el requisito de reproducibilidad de PASS C.
 */

/** Hash de string a entero de 32 bits (FNV-1a). Estable entre ejecuciones. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * PRNG mulberry32: rápido, sin dependencias y con secuencia idéntica en
 * cualquier motor JS. Suficiente para selección de variantes (no criptográfico).
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fuente de aleatoriedad con nombre. Cada llamada consume la secuencia, así que
 * el orden de las llamadas dentro del generador forma parte del contrato
 * determinista: reordenarlas cambia la salida para un mismo seed.
 */
export class SeededRandom {
  private readonly next: () => number;
  private readonly initialSeed: number;
  private calls = 0;

  constructor(seed: string | number) {
    this.initialSeed = typeof seed === "number" ? seed >>> 0 : hashString(String(seed));
    this.next = mulberry32(this.initialSeed);
  }

  /** Semilla numérica efectiva, para trazabilidad en metadata. */
  get seedValue(): number {
    return this.initialSeed;
  }

  /** Cuántos valores se consumieron (útil para detectar drift del pipeline). */
  get consumed(): number {
    return this.calls;
  }

  /** Float en [0, 1). */
  float(): number {
    this.calls++;
    return this.next();
  }

  /** Entero en [min, max] inclusivo. */
  int(min: number, max: number): number {
    if (max < min) throw new Error(`SeededRandom.int: rango inválido (${min}..${max})`);
    return min + Math.floor(this.float() * (max - min + 1));
  }

  /** Elemento de un array no vacío. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("SeededRandom.pick: array vacío");
    return items[Math.floor(this.float() * items.length)]!;
  }

  /**
   * `count` elementos distintos, preservando el orden relativo del array de
   * origen. Se usa para elegir socials sin repetir plataforma.
   */
  pickMany<T>(items: readonly T[], count: number): T[] {
    if (count <= 0) return [];
    if (count >= items.length) return [...items];
    const indices = this.shuffle(items.map((_, index) => index)).slice(0, count);
    indices.sort((a, b) => a - b);
    return indices.map((index) => items[index]!);
  }

  /** Fisher-Yates sobre una copia; no muta la entrada. */
  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.float() * (i + 1));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
  }

  /** true con probabilidad `probability` (0..1). */
  bool(probability = 0.5): boolean {
    return this.float() < probability;
  }
}

/**
 * Deriva un sub-seed estable a partir de un seed base y una etiqueta.
 * Permite que cada plantilla de un batch tenga su propia secuencia sin que el
 * orden de generación afecte a las demás.
 */
export function deriveSeed(baseSeed: string | number, label: string): number {
  const base = typeof baseSeed === "number" ? baseSeed >>> 0 : hashString(String(baseSeed));
  return (base ^ hashString(label)) >>> 0;
}

/**
 * Hash determinista de un objeto serializable, con claves ordenadas.
 * Se usa para detectar duplicados exactos de config dentro de un batch.
 */
export function stableHash(value: unknown): string {
  const canonical = canonicalize(value);
  return hashString(canonical).toString(16).padStart(8, "0");
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`);
  return `{${entries.join(",")}}`;
}
