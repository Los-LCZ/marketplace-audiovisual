import { test } from "node:test";
import assert from "node:assert/strict";
import { formatTimeRange } from "../../src/lib/utils.ts";

test("las horas salen en 24 h y en hora de Chile", () => {
  // 4-nov-2026: Chile está en UTC-3.
  assert.equal(formatTimeRange("2026-11-04T17:00:00Z", "2026-11-04T19:00:00Z"), "14:00 – 16:00");
  assert.equal(formatTimeRange("2026-11-05T01:00:00Z", "2026-11-05T03:00:00Z"), "22:00 – 00:00");
});
