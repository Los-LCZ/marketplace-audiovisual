import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePlaceName } from "../../src/lib/place-name.ts";

test("mayúscula inicial y sin espacios sobrantes", () => {
  assert.equal(normalizePlaceName("providencia"), "Providencia");
  assert.equal(normalizePlaceName("  las   condes "), "Las Condes");
  assert.equal(normalizePlaceName("SANTIAGO CENTRO"), "Santiago Centro");
});

test("respeta tildes y la ñ", () => {
  assert.equal(normalizePlaceName("ñuñoa"), "Ñuñoa");
  assert.equal(normalizePlaceName("ESTACIÓN CENTRAL"), "Estación Central");
});

test("artículos y preposiciones en minúscula salvo al inicio", () => {
  assert.equal(normalizePlaceName("san josé de maipo"), "San José de Maipo");
  assert.equal(normalizePlaceName("SAN PEDRO DE LA PAZ"), "San Pedro de la Paz");
  assert.equal(normalizePlaceName("la florida"), "La Florida");
  assert.equal(normalizePlaceName("lo barnechea"), "Lo Barnechea");
});

test("vacío queda vacío", () => {
  assert.equal(normalizePlaceName("   "), "");
});
