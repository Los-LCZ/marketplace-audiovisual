// Datos base: un anfitrión, dos clientes, un admin y un espacio publicado (09–18 h, mín. 2 h).
export const HOST = "11111111-1111-1111-1111-111111111111";
export const CLIENT = "22222222-2222-2222-2222-222222222222";
export const CLIENT2 = "33333333-3333-3333-3333-333333333333";
export const ADMIN = "44444444-4444-4444-4444-444444444444";
export const SPACE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

export async function seed(db) {
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${HOST}', 'host@test.cl', '{"full_name":"Ana Host","role":"host","phone":"+56911111111"}'),
      ('${CLIENT}', 'c1@test.cl', '{"full_name":"Carlos Cliente"}'),
      ('${CLIENT2}', 'c2@test.cl', '{"full_name":"Camila Cliente"}'),
      ('${ADMIN}', 'admin@test.cl', '{"full_name":"Admin"}');
    select set_config('request.jwt.claim.role', 'service_role', false);
    update public.profiles set role = 'admin' where id = '${ADMIN}';
    select set_config('request.jwt.claim.role', '', false);
    insert into public.spaces (id, host_id, title, category, address, city, commune, price_per_hour, min_hours, open_hour, close_hour)
    values ('${SPACE}', '${HOST}', 'Estudio Norte', 'recording_studio', 'Calle 1', 'Santiago', 'Providencia', 20000, 2, 9, 18);
  `);
}

// Fecha YYYY-MM-DD de Chile dentro de `days` días, y un timestamp a `hour`:00 hora de Chile.
export async function chileTs(db, days, hour) {
  const r = await db.query(
    `select (((now() at time zone 'America/Santiago')::date + $1::int) + make_interval(hours => $2::int)) at time zone 'America/Santiago' as ts`,
    [days, hour],
  );
  return r.rows[0].ts.toISOString();
}

export async function chileDate(db, days) {
  const r = await db.query(`select (((now() at time zone 'America/Santiago')::date + $1::int))::text as d`, [days]);
  return r.rows[0].d;
}
