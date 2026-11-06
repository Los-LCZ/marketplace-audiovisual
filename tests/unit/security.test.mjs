import { test } from "node:test";
import assert from "node:assert/strict";
import { contentSecurityPolicy, securityHeaders } from "../../src/lib/security-headers.ts";
import { RateLimiter, RATE_LIMITS } from "../../src/lib/rate-limit.ts";
import { detectImageMime, sniffImage } from "../../src/lib/file-signature.ts";
import { buildSecurityLogEntry, fingerprint } from "../../src/lib/security-log.ts";
import { authCookieOptions } from "../../src/lib/auth-cookies.ts";
import { isUuid } from "../../src/lib/uuid.ts";

const header = (headers, key) => headers.find((h) => h.key === key)?.value;

test("cabeceras de seguridad en producción", () => {
  const headers = securityHeaders(false);
  assert.equal(header(headers, "X-Content-Type-Options"), "nosniff");
  assert.equal(header(headers, "X-Frame-Options"), "DENY");
  assert.equal(header(headers, "Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.match(header(headers, "Strict-Transport-Security"), /max-age=63072000; includeSubDomains; preload/);
  assert.match(header(headers, "Permissions-Policy"), /camera=\(\)/);
  assert.equal(header(headers, "Cross-Origin-Opener-Policy"), "same-origin");
});

test("sin HSTS ni upgrade-insecure-requests sin HTTPS (dev o next start en localhost)", () => {
  assert.equal(header(securityHeaders(true), "Strict-Transport-Security"), undefined);
  const localProd = securityHeaders(false, false);
  assert.equal(header(localProd, "Strict-Transport-Security"), undefined);
  assert.doesNotMatch(header(localProd, "Content-Security-Policy"), /upgrade-insecure-requests/);
});

test("CSP: sin eval en producción, sin framing, sin plugins ni scripts externos", () => {
  const csp = contentSecurityPolicy(false);
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /base-uri 'self'/);
  assert.match(csp, /form-action 'self'/);
  assert.match(csp, /upgrade-insecure-requests/);
  const scriptSrc = csp.split("; ").find((d) => d.startsWith("script-src"));
  assert.doesNotMatch(scriptSrc, /https?:/, "script-src no debe permitir dominios externos");
  const connectSrc = csp.split("; ").find((d) => d.startsWith("connect-src"));
  assert.equal(connectSrc, "connect-src 'self' https://tiles.openfreemap.org");
});

test("CSP en desarrollo permite eval y websockets (HMR)", () => {
  const csp = contentSecurityPolicy(true);
  assert.match(csp, /'unsafe-eval'/);
  assert.match(csp, /connect-src [^;]*ws:/);
});

test("cookies de sesión: HttpOnly, SameSite=Lax y Secure en producción", () => {
  const prod = authCookieOptions(true);
  assert.equal(prod.httpOnly, true);
  assert.equal(prod.secure, true);
  assert.equal(prod.sameSite, "lax");
  assert.equal(prod.path, "/");
  assert.ok(prod.maxAge <= 7 * 24 * 60 * 60);
  assert.equal(authCookieOptions(false).secure, false);
});

test("rate limit: bloquea al superar el límite y libera al pasar la ventana", () => {
  let now = 0;
  const limiter = new RateLimiter(() => now);
  const rule = { limit: 3, windowMs: 60_000 };
  for (let i = 0; i < 3; i++) assert.equal(limiter.hit("ip:1", rule).ok, true);
  const blocked = limiter.hit("ip:1", rule);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.retryAfterSeconds, 60);
  assert.equal(limiter.hit("ip:2", rule).ok, true, "otra clave no se ve afectada");
  now = 60_000;
  assert.equal(limiter.hit("ip:1", rule).ok, true);
});

test("rate limit: simulación de fuerza bruta sobre el login", () => {
  const limiter = new RateLimiter(() => 0);
  const results = Array.from({ length: 50 }, () => limiter.hit("login:email:victima@x.cl", RATE_LIMITS.loginByEmail).ok);
  assert.equal(results.filter(Boolean).length, RATE_LIMITS.loginByEmail.limit);
});

test("rate limit: reset tras un login correcto", () => {
  const limiter = new RateLimiter(() => 0);
  const rule = { limit: 1, windowMs: 1000 };
  limiter.hit("k", rule);
  assert.equal(limiter.hit("k", rule).ok, false);
  limiter.reset("k");
  assert.equal(limiter.hit("k", rule).ok, true);
});

const bytes = (...values) => new Uint8Array([...values, ...new Array(32).fill(0)]);
const text = (s) => [...s].map((c) => c.charCodeAt(0));

test("archivos: detecta el tipo real por sus bytes", () => {
  assert.equal(detectImageMime(bytes(0xff, 0xd8, 0xff, 0xe0)), "image/jpeg");
  assert.equal(detectImageMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), "image/png");
  assert.equal(detectImageMime(bytes(...text("RIFF"), 0, 0, 0, 0, ...text("WEBP"))), "image/webp");
  assert.equal(detectImageMime(bytes(0, 0, 0, 0x1c, ...text("ftypavif"))), "image/avif");
});

test("archivos: rechaza HTML, SVG, GIF y ejecutables aunque digan ser imagen", async () => {
  for (const content of ["<html><script>alert(1)</script>", "<svg onload=alert(1)>", "GIF89a....", "MZ\x90\x00"]) {
    const file = new File([content], "foto.jpg", { type: "image/jpeg" });
    assert.equal(await sniffImage(file, ["image/jpeg", "image/png", "image/webp", "image/avif"]), null, content);
  }
});

test("archivos: respeta la lista de tipos permitidos (avatar sin AVIF)", async () => {
  const avif = new File([bytes(0, 0, 0, 0x1c, ...text("ftypavif"))], "a.avif", { type: "image/avif" });
  assert.equal(await sniffImage(avif, ["image/jpeg", "image/png", "image/webp"]), null);
  assert.equal(await sniffImage(avif, ["image/avif"]), "image/avif");
});

test("logs: no guardan secretos y anonimizan identificadores", () => {
  const entry = buildSecurityLogEntry(
    "login_failed",
    { email: fingerprint("Ana@Correo.cl"), password: "hunter2", access_token: "x", code: "pkce", errorCode: "invalid_credentials" },
    new Date("2026-11-06T00:00:00Z"),
  );
  assert.equal(entry.event, "login_failed");
  assert.equal(entry.level, "warn");
  assert.equal(entry.password, undefined);
  assert.equal(entry.access_token, undefined);
  assert.equal(entry.code, undefined);
  assert.equal(entry.errorCode, "invalid_credentials");
  assert.match(entry.email, /^[0-9a-f]{12}$/);
  assert.equal(fingerprint("ana@correo.cl"), fingerprint(" ANA@correo.cl "), "mismo hash sin importar mayúsculas");
  assert.doesNotMatch(JSON.stringify(entry), /hunter2|correo\.cl/);
});

test("ids: solo UUID válidos", () => {
  assert.equal(isUuid("de5ace00-0000-4000-8000-000000000001"), true);
  for (const bad of ["", "1", "abc", "de5ace00-0000-4000-8000-00000000000g", "' or 1=1 --", null, 42, ["x"]]) {
    assert.equal(isUuid(bad), false, String(bad));
  }
});
