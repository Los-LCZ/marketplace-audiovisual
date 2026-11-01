// Corre todos los tests SQL (tests/sql/*.test.mjs) en procesos separados, de a 4 en paralelo,
// y termina con código 1 si alguno falla. Uso: `npm run test:sql` (o `npm run test:sql -- 07` para
// filtrar por nombre).
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const filter = process.argv[2];
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".test.mjs") && (!filter || f.includes(filter)))
  .sort();
const CONCURRENCY = 4;

function run(file) {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, [join(dir, file)], { cwd: dir });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => {
      const lines = out.split(/\r?\n/);
      const passed = lines.filter((l) => l.startsWith("ok ")).length;
      const failed = lines.filter((l) => /^(FAIL|CRASH)/.test(l));
      resolveRun({ file, passed, failed, code, out });
    });
  });
}

const started = Date.now();
const results = [];
const queue = [...files];
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) results.push(await run(queue.shift()));
  }),
);

let total = 0;
let failures = 0;
for (const r of results.sort((a, b) => a.file.localeCompare(b.file))) {
  const ok = r.code === 0 && r.failed.length === 0 && r.passed > 0;
  total += r.passed;
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${r.file}  (${r.passed} ok${r.failed.length ? `, ${r.failed.length} fallas` : ""})`);
  for (const line of r.failed) console.log(`    ${line}`);
  if (!ok && !r.failed.length) console.log(r.out.split(/\r?\n/).slice(-15).map((l) => `    ${l}`).join("\n"));
}

const secs = ((Date.now() - started) / 1000).toFixed(1);
console.log(`\n${total} pruebas ok en ${results.length} archivos · ${failures} archivo(s) con fallas · ${secs}s`);
process.exit(failures ? 1 : 0);
