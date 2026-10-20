/**
 * CRIPQER Conversion Advisor — CA-9A · text normalisation for evaluation.
 *
 * PURE. No provider, no clock, no storage, no environment. The only job of this
 * file is to turn a reply (or a dataset string) into a comparable form, so a
 * semantic check does not fail because one side wrote `página` and the other
 * `pagina`, or because a case was authored with a trailing space.
 *
 * WHAT THIS IS AND IS NOT. It is a LEXICAL proxy: it compares tokens, not
 * meanings. CA-9A's scorer is deliberately deterministic and cheap (the brief:
 * "scoring deterministic_structure true"), so the honest reading of every score
 * it produces is "a structural signal", not "a judgement of quality". The
 * judgement layer is CA-9B's, and the report says so.
 */

/** Lower-cases and strips combining accents, so `Página` and `pagina` match. */
export function normalize(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Whether `haystack` contains `needle` as normalised text. Empty needles never
 * match — an empty expectation is "no requirement", not "matches anything".
 */
export function contains(haystack: string, needle: string): boolean {
  const n = normalize(needle);
  if (n === "") return false;
  return normalize(haystack).includes(n);
}

/** How many of the alternatives appear. Used to score a `FactGroup`. */
export function countPresent(haystack: string, alternatives: readonly string[]): number {
  let found = 0;
  for (const alternative of alternatives) if (contains(haystack, alternative)) found += 1;
  return found;
}

/**
 * The question sentences in a reply, normalised and de-duplicated.
 *
 * Used for the multi-turn "did it ask the same thing twice" check: a repeated
 * question is the most legible symptom of a lost context, and it is detectable
 * without a model. Spanish uses both `?` and `¿`; splitting on `?` and keeping
 * the trailing fragment is enough because we only compare the fragment.
 */
export function questionFragments(reply: string): readonly string[] {
  const parts = reply.split("?");
  const questions: string[] = [];
  for (let index = 0; index < parts.length - 1; index += 1) {
    const fragment = parts[index] ?? "";
    // The sentence that ends in `?` starts after the previous sentence break.
    const tail = fragment.split(/[.!?\n]/).pop() ?? fragment;
    const cleaned = normalize(tail);
    if (cleaned !== "") questions.push(cleaned);
  }
  return questions;
}

/** Sentences of a reply, normalised, for statement-level checks. */
export function sentences(reply: string): readonly string[] {
  return reply
    .split(/[.!?\n]+/)
    .map((sentence) => normalize(sentence))
    .filter((sentence) => sentence !== "");
}
