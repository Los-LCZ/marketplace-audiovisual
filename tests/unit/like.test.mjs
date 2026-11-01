import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeLike } from "../../src/lib/like.ts";

test("escapa comodines de LIKE (E-02)", () => {
  assert.equal(escapeLike("%"), "\\%");
  assert.equal(escapeLike("_"), "\\_");
  assert.equal(escapeLike("50%_off"), "50\\%\\_off");
  assert.equal(escapeLike("a\\b"), "a\\\\b");
});

test("quita el * de PostgREST y deja el resto igual", () => {
  assert.equal(escapeLike("*"), "");
  assert.equal(escapeLike("Ñuñoa"), "Ñuñoa");
  assert.equal(escapeLike("Santiago Centro"), "Santiago Centro");
});
