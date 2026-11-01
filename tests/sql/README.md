# Tests SQL

Pruebas de las migraciones de `supabase/migrations/` (y del seed de `supabase/demo/`) sobre
[PGlite](https://pglite.dev): Postgres compilado a WebAssembly, sin Docker ni conexión a Supabase.

```bash
npm run test:sql          # todos
npm run test:sql -- 07    # solo los archivos cuyo nombre contiene "07"
```

## Cómo funciona

- `harness.mjs` crea una base en memoria con stubs de Supabase (roles `anon`, `authenticated`,
  `service_role`, `auth.uid()`, `auth.role()` y `storage`) y aplica **todas** las migraciones en
  orden, cada archivo en una sola transacción, como el SQL Editor.
- `as(db, uid, sql)` ejecuta una consulta como ese usuario (RLS incluida); `as(db, null, …)` como
  visitante anónimo. Fuera de `as`, las consultas corren como el SQL Editor (sin JWT).
- `fixtures.mjs` carga un anfitrión, dos clientes, un admin y un espacio (09–18 h, mínimo 2 h).
- `run.mjs` corre cada `*.test.mjs` en su propio proceso y falla si alguno falla.

## Agregar una prueba

Crea `NN_tema.test.mjs` y usa `check(condición, "descripción")` o
`expectError(promesa, "regex del mensaje", "descripción")`. Cada migración nueva debería traer su
archivo de pruebas.

Diferencias con Supabase real: no hay GoTrue ni PostgREST, así que estas pruebas validan el SQL
(esquema, RLS, triggers y funciones), no la API HTTP.
