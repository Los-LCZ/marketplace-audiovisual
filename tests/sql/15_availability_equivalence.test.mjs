// La versión en conjunto de get_available_space_ids debe dar exactamente lo mismo que
// la versión original con bucle (20261031110000), sobre datos aleatorios.
import { setup, check } from "./harness.mjs";
import { seed, HOST } from "./fixtures.mjs";

const db = await setup();
await seed(db);

// Referencia: el cuerpo original (bucle plpgsql), con otro nombre.
await db.exec(`
create function public.ref_available_space_ids(p_date date, p_categories public.space_category[] default null)
returns setof uuid language plpgsql stable security definer set search_path = '' as $$
declare
  v_space record; v_busy record; v_start timestamptz; v_end timestamptz; v_cursor timestamptz;
  v_need interval; v_ok boolean; v_next_hour timestamptz := date_trunc('hour', now()) + interval '1 hour';
begin
  for v_space in select s.id, s.min_hours, s.open_hour, s.close_hour from public.spaces s
    where s.status = 'published' and (p_categories is null or s.category = any (p_categories))
  loop
    v_start := (p_date + make_interval(hours => v_space.open_hour)) at time zone 'America/Santiago';
    v_end := (p_date + make_interval(hours => v_space.close_hour)) at time zone 'America/Santiago';
    v_start := greatest(v_start, v_next_hour);
    v_need := make_interval(hours => v_space.min_hours);
    v_cursor := v_start; v_ok := false;
    if v_end - v_start >= v_need then
      for v_busy in select greatest(b.start_time, v_start) as s, least(b.end_time, v_end) as e
        from public.bookings b where b.space_id = v_space.id and b.status in ('pending_payment', 'confirmed')
          and b.start_time < v_end and b.end_time > v_start order by b.start_time
      loop
        if v_busy.s - v_cursor >= v_need then v_ok := true; exit; end if;
        v_cursor := greatest(v_cursor, v_busy.e);
      end loop;
      if not v_ok and v_end - v_cursor >= v_need then v_ok := true; end if;
    end if;
    if v_ok then return next v_space.id; end if;
  end loop;
end; $$;`);

// Generador pseudoaleatorio con semilla fija (reproducible).
let seedN = 42;
const rnd = () => ((seedN = (seedN * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const CATS = ["recording_studio", "rehearsal_room", "filming_set", "photo_studio", "outdoor_location"];

await db.exec(`alter table public.bookings disable trigger bookings_compute_amounts;`);
for (let i = 0; i < 40; i++) {
  const open = Math.floor(rnd() * 12);
  const close = Math.min(24, open + 2 + Math.floor(rnd() * 12));
  const minH = 1 + Math.floor(rnd() * 4);
  const status = rnd() < 0.85 ? "published" : "draft";
  const { rows } = await db.query(
    `insert into public.spaces (host_id, title, category, address, city, commune, price_per_hour, min_hours, open_hour, close_hour, status)
     values ($1, $2, $3, 'x', 'Santiago', 'Ñuñoa', 10000, $4, $5, $6, $7) returning id`,
    [HOST, `Espacio ${i}`, pick(CATS), minH, open, close, status],
  );
  // Reservas en los próximos 4 días, con inicios en horas y medias horas, sin solaparse.
  let cursor = 0;
  const nBookings = Math.floor(rnd() * 6);
  for (let k = 0; k < nBookings; k++) {
    cursor += 0.5 * (1 + Math.floor(rnd() * 16));
    const len = 1 + Math.floor(rnd() * 4);
    const st = pick(["confirmed", "confirmed", "pending_payment", "requested", "cancelled"]);
    await db.query(
      `insert into public.bookings (space_id, client_id, start_time, end_time, total_hours, subtotal, platform_fee, total_amount, status)
       values ($1, $2, date_trunc('day', now()) + make_interval(mins => ($3::numeric * 60)::int),
               date_trunc('day', now()) + make_interval(mins => (($3::numeric + $4::numeric) * 60)::int), $4, 1, 0, 1, $5)`,
      [rows[0].id, "22222222-2222-2222-2222-222222222222", cursor, len, st],
    );
    cursor += len;
  }
}
await db.exec(`alter table public.bookings enable trigger bookings_compute_amounts;`);

let mismatches = 0;
let total = 0;
for (let day = 0; day <= 4; day++) {
  for (const cats of [null, "{recording_studio,rehearsal_room}", "{filming_set}"]) {
    const q = (fn) =>
      db.query(`select id from public.${fn}((((now() at time zone 'America/Santiago')::date) + $1::int), $2::public.space_category[]) id order by 1`, [day, cats]);
    const [a, b] = await Promise.all([q("get_available_space_ids"), q("ref_available_space_ids")]);
    total += b.rows.length;
    if (JSON.stringify(a.rows) !== JSON.stringify(b.rows)) {
      mismatches++;
      console.log(`  diferencia día +${day} ${cats}: nueva=${a.rows.length} ref=${b.rows.length}`);
    }
  }
}
check(mismatches === 0, `misma salida que la versión con bucle en 15 combinaciones (${total} espacios disponibles en total)`);
check(total > 0, "el escenario aleatorio tiene espacios disponibles (la prueba no es trivial)");
