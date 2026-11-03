import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement as h, Fragment } from "react";
import { svgMarkup } from "../../src/lib/svg-markup.ts";

test("convierte props de React a atributos de SVG", () => {
  const svg = h(
    "svg",
    { viewBox: "0 0 10 10", preserveAspectRatio: "xMidYMid slice", focusable: "false" },
    h("rect", { className: "bd-a", strokeWidth: 2, stopOpacity: 0.5, clipPath: "url(#c)" }),
    h("feGaussianBlur", { stdDeviation: 3 }),
  );
  assert.equal(
    svgMarkup(svg),
    '<svg viewBox="0 0 10 10" preserveAspectRatio="xMidYMid slice" focusable="false">' +
      '<rect class="bd-a" stroke-width="2" stop-opacity="0.5" clip-path="url(#c)"/>' +
      '<feGaussianBlur stdDeviation="3"/></svg>',
  );
});

test("resuelve componentes, fragmentos y listas, y escapa el texto", () => {
  const Label = ({ n }) => h("text", { x: n }, `${n} & <más>`);
  const tree = h(Fragment, null, [1, 2].map((n) => h(Label, { key: n, n })), null, false);
  assert.equal(svgMarkup(tree), '<text x="1">1 &amp; &lt;más&gt;</text><text x="2">2 &amp; &lt;más&gt;</text>');
});

test("rechaza props que no se pueden escribir como atributo", () => {
  assert.throws(() => svgMarkup(h("rect", { style: { fill: "red" } })), /style/);
  assert.throws(() => svgMarkup(h("rect", { onClick: () => {} })), /onClick/);
});
