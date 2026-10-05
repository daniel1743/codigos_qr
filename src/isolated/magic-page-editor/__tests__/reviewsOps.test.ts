import { describe, expect, it } from "vitest";
import type { PageDoc } from "../types/editor";
import {
  REVIEWS_MAX,
  addReview,
  canAddReview,
  canDeleteReview,
  deleteReview,
  duplicateReview,
  parseReviewSlot,
  readReview,
  resolveReviewRating,
  reviewId,
  reviewsOrder,
  moveReview,
} from "../utils/reviewsOps";

const KEY = "reviews-abc";

function emptyDoc(): PageDoc {
  return { blocks: [], texts: {}, textStyles: {}, props: {}, removed: {} };
}

describe("reviewsOps", () => {
  it("starts with two reviews when the block has never been materialised", () => {
    expect(reviewsOrder(emptyDoc(), KEY)).toEqual(["0", "1"]);
    expect(canAddReview(emptyDoc(), KEY)).toBe(true);
  });

  it("adds reviews up to the maximum of six and never a seventh", () => {
    let doc = emptyDoc();
    for (let i = 0; i < 4; i += 1) doc = addReview(doc, KEY); // 2 → 6
    expect(reviewsOrder(doc, KEY)).toHaveLength(REVIEWS_MAX);
    expect(canAddReview(doc, KEY)).toBe(false);

    const seventh = addReview(doc, KEY);
    expect(reviewsOrder(seventh, KEY)).toHaveLength(REVIEWS_MAX);
    expect(seventh).toBe(doc); // no-op returns the same document
  });

  it("duplicates a review with its avatar, name, text and rating right after the original", () => {
    let doc = emptyDoc();
    doc = {
      ...doc,
      props: {
        ...doc.props,
        [reviewId(KEY, "0")]: { avatar: "a.jpg", name: "Ana", text: "Genial", rating: "4" },
      },
    };
    doc = duplicateReview(doc, KEY, "0");
    const order = reviewsOrder(doc, KEY);
    expect(order).toHaveLength(3);
    expect(order[0]).toBe("0");
    const clone = order[1]!;
    expect(clone).not.toBe("0");
    expect(doc.props[reviewId(KEY, clone)]).toMatchObject({
      avatar: "a.jpg",
      name: "Ana",
      text: "Genial",
      rating: "4",
    });
  });

  it("does not duplicate beyond the maximum of six", () => {
    let doc = emptyDoc();
    for (let i = 0; i < 4; i += 1) doc = addReview(doc, KEY); // 6
    const next = duplicateReview(doc, KEY, "0");
    expect(reviewsOrder(next, KEY)).toHaveLength(REVIEWS_MAX);
    expect(next).toBe(doc);
  });

  it("deletes a review but keeps at least one", () => {
    let doc = emptyDoc();
    doc = deleteReview(doc, KEY, "0");
    expect(reviewsOrder(doc, KEY)).toEqual(["1"]);
    expect(canDeleteReview(doc, KEY)).toBe(false);

    const same = deleteReview(doc, KEY, "1");
    expect(reviewsOrder(same, KEY)).toEqual(["1"]);
    expect(same).toBe(doc);
  });

  it("removes the stored data of a deleted review", () => {
    let doc = emptyDoc();
    doc = { ...doc, props: { ...doc.props, [reviewId(KEY, "0")]: { name: "Ana" } } };
    doc = deleteReview(doc, KEY, "0");
    expect(doc.props[reviewId(KEY, "0")]).toBeUndefined();
  });

  it("reorders reviews", () => {
    let doc = emptyDoc();
    doc = addReview(doc, KEY); // 0,1,2-x
    const order = reviewsOrder(doc, KEY);
    const moved = moveReview(doc, KEY, order[0]!, 1);
    expect(reviewsOrder(moved, KEY)[0]).toBe(order[1]);
    expect(reviewsOrder(moved, KEY)[1]).toBe(order[0]);
  });

  it("clamps the rating into the 1–5 range", () => {
    expect(resolveReviewRating(undefined)).toBe(5);
    expect(resolveReviewRating("0")).toBe(1);
    expect(resolveReviewRating("9")).toBe(5);
    expect(resolveReviewRating("3")).toBe(3);
    expect(resolveReviewRating("nope")).toBe(5);
  });

  it("parses review slot ids and ignores foreign ids", () => {
    expect(parseReviewSlot(KEY, reviewId(KEY, "3"))).toBe("3");
    expect(parseReviewSlot(KEY, "reviews-abc/item.0")).toBeNull();
    expect(parseReviewSlot(KEY, "something-else")).toBeNull();
  });

  it("reads the persisted review and falls back to the sample default", () => {
    const doc: PageDoc = {
      ...emptyDoc(),
      props: { [reviewId(KEY, "0")]: { avatar: "f.jpg", name: "Ana", text: "Genial", rating: "2" } },
    };
    const saved = readReview(doc, KEY, "0", 0);
    expect(saved).toMatchObject({ avatar: "f.jpg", name: "Ana", text: "Genial", rating: 2 });

    const fresh = readReview(doc, KEY, "1", 1);
    expect(fresh.avatar).toBe("");
    expect(fresh.name.length).toBeGreaterThan(0);
    expect(fresh.text.length).toBeGreaterThan(0);
    expect(fresh.rating).toBeGreaterThanOrEqual(1);
    expect(fresh.rating).toBeLessThanOrEqual(5);
  });
});
