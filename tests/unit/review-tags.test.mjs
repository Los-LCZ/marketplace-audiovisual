import { test } from "node:test";
import assert from "node:assert/strict";
import { isReviewTag, reviewTagsFor, REVIEW_COMPLIMENTS, REVIEW_ISSUES } from "../../src/lib/review-tags.ts";

test("cada tipo acepta sus elogios y los problemas comunes", () => {
  assert.ok(isReviewTag("space", "Gran acústica"));
  assert.ok(isReviewTag("client", "Puntual"));
  assert.ok(isReviewTag("space", "Llegó tarde"));
  assert.ok(isReviewTag("client", "Llegó tarde"));
});

test("rechaza etiquetas de otro tipo o fuera del vocabulario", () => {
  assert.ok(!isReviewTag("space", "Puntual"));
  assert.ok(!isReviewTag("client", "Gran acústica"));
  assert.ok(!isReviewTag("space", "acústica"));
});

test("sin duplicados y con largo válido (máx. 30)", () => {
  for (const target of Object.keys(REVIEW_COMPLIMENTS)) {
    const tags = reviewTagsFor(target);
    assert.equal(new Set(tags).size, tags.length);
    for (const t of tags) assert.ok(t.length <= 30, t);
  }
  assert.ok(REVIEW_ISSUES.length > 0);
});
