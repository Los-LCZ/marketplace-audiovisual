import { test } from "node:test";
import assert from "node:assert/strict";
import { safeRedirectPath } from "../../src/lib/safe-redirect.ts";

const ORIGIN = "https://marketplace-audiovisual.vercel.app";

test("rechaza redirecciones a otros sitios (E-05)", () => {
  for (const next of [
    "/\\example.com",
    "//example.com",
    "https://example.com",
    "/%5Cexample.com",
    "/%5cexample.com",
    "/\t/example.com",
    "/%09/example.com",
    "/%2F%2Fexample.com",
    "javascript:alert(1)",
    "data:text/html,hola",
    "",
    "mis-reservas",
    "/%E0%A4%A",
  ]) {
    assert.equal(safeRedirectPath(next, ORIGIN), "/", JSON.stringify(next));
  }
  assert.equal(safeRedirectPath(null, ORIGIN), "/");
  assert.equal(safeRedirectPath(undefined, ORIGIN), "/");
});

test("conserva rutas internas con query y hash", () => {
  assert.equal(safeRedirectPath("/mis-reservas?x=1", ORIGIN), "/mis-reservas?x=1");
  assert.equal(safeRedirectPath("/espacios/abc#reseñas", ORIGIN), "/espacios/abc#rese%C3%B1as");
  assert.equal(safeRedirectPath("/recuperar/nueva", ORIGIN), "/recuperar/nueva");
  assert.equal(safeRedirectPath("/", ORIGIN), "/");
});
