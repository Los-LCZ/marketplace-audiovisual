import { test } from "node:test";
import assert from "node:assert/strict";
import { buildQuery, parseResult, geocode, geocodeSpace } from "../../src/lib/geocode.ts";

test("buildQuery arma 'dirección, comuna, ciudad, Chile' sin vacíos ni repetidos", () => {
  assert.equal(buildQuery(["Av. Providencia 1234", "Providencia", "Santiago"]), "Av. Providencia 1234, Providencia, Santiago, Chile");
  assert.equal(buildQuery(["  Calle   1 ", "", "santiago", "Santiago"]), "Calle 1, santiago, Chile");
  assert.equal(buildQuery(["Valparaíso", "Valparaíso"]), "Valparaíso, Chile");
});

test("parseResult toma el primer resultado y valida rangos", () => {
  assert.deepEqual(parseResult([{ lat: "-33.42", lon: "-70.61" }, { lat: "0", lon: "0" }]), { lat: -33.42, lng: -70.61 });
  assert.equal(parseResult([]), null);
  assert.equal(parseResult({ error: "x" }), null);
  assert.equal(parseResult([{ lat: "abc", lon: "1" }]), null);
  assert.equal(parseResult([{ lat: "95", lon: "1" }]), null);
});

const fakeFetch = (handler) => {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url: String(url), init, at: Date.now() });
    return handler(String(url));
  };
  fn.calls = calls;
  return fn;
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

test("geocode manda User-Agent propio, limita a Chile y espacia las peticiones ≥ 1 s", async () => {
  const f = fakeFetch(() => json([{ lat: "-33.4", lon: "-70.6" }]));
  const [a, b] = await Promise.all([geocode("Calle 1, Chile", {}, f), geocode("Calle 2, Chile", {}, f)]);
  assert.deepEqual(a, { lat: -33.4, lng: -70.6 });
  assert.deepEqual(b, { lat: -33.4, lng: -70.6 });
  assert.equal(f.calls.length, 2);
  const url = new URL(f.calls[0].url);
  assert.equal(url.searchParams.get("countrycodes"), "cl");
  assert.equal(url.searchParams.get("q"), "Calle 1, Chile");
  assert.match(f.calls[0].init.headers["User-Agent"], /senal/i);
  assert.ok(f.calls[1].at - f.calls[0].at >= 1000, "la segunda sale al menos 1 s después");
});

test("si Nominatim falla, geocodeSpace devuelve null y no lanza", async () => {
  const f = fakeFetch(() => json({ error: "down" }, 503));
  assert.deepEqual(await geocodeSpace({ address: "Calle 1", commune: "Providencia", city: "Santiago" }, {}, f), {
    lat: null,
    lng: null,
    commune_lat: null,
    commune_lng: null,
  });
  const boom = async () => {
    throw new Error("network");
  };
  assert.equal(await geocode("x", {}, boom), null);
});

test("geocodeSpace puede saltarse el punto exacto o la comuna", async () => {
  const f = fakeFetch((url) => json([{ lat: url.includes("Calle") ? "-1" : "-2", lon: "-3" }]));
  const r = await geocodeSpace({ address: "Calle 1", commune: "Ñuñoa", city: "Santiago" }, { exact: false }, f);
  assert.deepEqual(r, { lat: null, lng: null, commune_lat: -2, commune_lng: -3 });
  assert.equal(f.calls.length, 1);
  assert.equal(new URL(f.calls[0].url).searchParams.get("featureType"), "settlement", "la comuna se busca como localidad");
});
