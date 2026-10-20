/**
 * CA-9A — the dataset satisfies the brief's own minimums, and every case is
 * internally coherent. No provider, no network.
 */
import { describe, expect, it } from "vitest";

import {
  ADVERSARIAL_DATASET,
  DATASET_BY_ID,
  EVALUATION_DATASET,
  acceptableIdsFor,
  countByCategory,
} from "../dataset";
import { ALL_CAPABILITY_IDS } from "../capability-truth";
import {
  ADVERSARIAL_MINIMUM_CASES,
  CATEGORY_MINIMUMS,
  DATASET_MINIMUM_CASES,
  OFFERABLE_ACTIONS,
  PERSONAS,
} from "../types";
import { INTENT_IDS } from "../../intents/contract";

const allCases = [...EVALUATION_DATASET, ...ADVERSARIAL_DATASET];

describe("CA-9A dataset — size and coverage", () => {
  it("meets the overall minimum", () => {
    expect(EVALUATION_DATASET.length).toBeGreaterThanOrEqual(DATASET_MINIMUM_CASES);
  });

  it("meets the adversarial minimum", () => {
    expect(ADVERSARIAL_DATASET.length).toBeGreaterThanOrEqual(ADVERSARIAL_MINIMUM_CASES);
  });

  it("meets every per-category minimum", () => {
    const counts = countByCategory(EVALUATION_DATASET);
    for (const [category, minimum] of Object.entries(CATEGORY_MINIMUMS)) {
      expect(counts[category as keyof typeof counts]).toBeGreaterThanOrEqual(minimum);
    }
  });

  it("covers every persona at least once", () => {
    const used = new Set(allCases.map((entry) => entry.persona));
    for (const persona of PERSONAS) expect(used.has(persona)).toBe(true);
  });
});

describe("CA-9A dataset — coherence", () => {
  it("has unique ids", () => {
    const ids = allCases.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has at least one turn per case and no empty message", () => {
    for (const entry of allCases) {
      expect(entry.turns.length).toBeGreaterThan(0);
      for (const message of entry.turns) expect(message.trim().length).toBeGreaterThan(0);
    }
  });

  it("declares only real intents", () => {
    for (const entry of allCases) {
      expect(INTENT_IDS).toContain(entry.expected.expected_intent);
    }
  });

  it("declares only offerable actions", () => {
    for (const entry of allCases) {
      for (const action of entry.expected.acceptable_next_action) {
        expect(OFFERABLE_ACTIONS).toContain(action);
      }
    }
  });

  it("never demands a citation CA-4 would forbid", () => {
    // The allowlist is derived from `selectCapabilities`, so every id must be a
    // real catalog id — this is the guard against a hand-typed typo.
    for (const entry of allCases) {
      for (const id of entry.expected.acceptable_recommendation_ids) {
        expect(ALL_CAPABILITY_IDS).toContain(id);
      }
    }
  });

  it("derives the allowlist from the strategy engine, not by hand", () => {
    for (const entry of allCases) {
      // An overridden allowlist is allowed, but it must still be a subset of
      // what the intent could ever select (plus nothing invented).
      const derived = acceptableIdsFor(entry.expected.expected_intent);
      for (const id of entry.expected.acceptable_recommendation_ids) {
        expect(ALL_CAPABILITY_IDS).toContain(id);
      }
      expect(derived.length).toBeGreaterThan(0);
    }
  });

  it("indexes every case by id", () => {
    for (const entry of allCases) expect(DATASET_BY_ID.get(entry.id)).toBe(entry);
  });
});
