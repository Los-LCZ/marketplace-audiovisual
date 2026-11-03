import { test } from "node:test";
import assert from "node:assert/strict";
import { hideSpaceWarning } from "../../src/lib/hide-space.ts";

test("avisa al ocultar un espacio con reservas próximas", () => {
  assert.match(hideSpaceWarning("published", "draft", 1), /1 reserva próxima\. Seguirá vigente/);
  assert.match(hideSpaceWarning("published", "archived", 3), /3 reservas próximas\./);
  assert.match(hideSpaceWarning("draft", "archived", 2), /2 reservas próximas/);
});

test("no avisa si no oculta el espacio o no hay reservas próximas", () => {
  assert.equal(hideSpaceWarning("published", "draft", 0), null);
  assert.equal(hideSpaceWarning("draft", "published", 4), null);
  assert.equal(hideSpaceWarning("archived", "archived", 4), null);
});
