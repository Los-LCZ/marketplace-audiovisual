import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidIsoDate } from "../../src/lib/iso-date.ts";

test("acepta fechas reales", () => {
  for (const d of ["2026-11-03", "2028-02-29", "2026-12-31", "2026-01-01"]) assert.equal(isValidIsoDate(d), true, d);
});

test("rechaza fechas inexistentes o mal formadas (E-04)", () => {
  for (const d of ["2026-02-30", "2026-13-01", "2027-02-29", "2026-00-10", "2026-11-31", "2026-1-1", "hoy", "", null, undefined]) {
    assert.equal(isValidIsoDate(d), false, String(d));
  }
});
