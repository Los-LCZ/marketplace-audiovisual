import Image from "next/image";
import Link from "next/link";
import { ArrowLeftRight, CalendarDays, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { listPublishedSpaces, type SpaceWithAmenities } from "@/lib/queries/spaces";
import { SPACE_CATEGORY_LABELS } from "@/lib/labels";
import { formatCLP } from "@/lib/utils";
import { CATEGORY_META, WORLDS, worldOf, type World } from "@/lib/world";
import { getWorld } from "@/lib/world-server";
import { currentTime, nextDays } from "@/lib/zoned-time";
import { CategoryIcon } from "@/components/ui/category-icon";
import { SpaceCard } from "@/components/spaces/space-card";
import { Viewfinder } from "@/components/home/viewfinder";
import { MixingConsole } from "@/components/home/mixing-console";
import { EarningsCalculator } from "@/components/home/earnings-calculator";
import type { HeroSpace } from "@/components/home/hero-types";

const FEATURED_COUNT = 6;

const COPY: Record<World, { kicker: string; title: string; lede: string; catsTitle: string; featuredLede: string; hostTitle: string }> = {
  av: {
    kicker: "Modo visor · encuadra tu próximo set",
    title: "Encuadra el espacio antes de rodar.",
    lede: "Mueve el puntero por el visor para enfocar, haz clic para fijar el foco y cambia de encuadre con las miniaturas. Sets, locaciones y estudios de foto por hora en Santiago.",
    catsTitle: "Modos de rodaje",
    featuredLede: "Los sets y locaciones mejor evaluados por productoras y fotógrafos.",
    hostTitle: "Tu set vacío también puede facturar.",
  },
  mu: {
    kicker: "Sala de control · un canal por espacio",
    title: "Súbele el volumen a tu próxima sesión.",
    lede: "Cada canal es una sala o estudio. Usa Solo para escucharlo en la pantalla, Mute para sacarlo y el Master para fijar tu precio máximo. Después dale Play a la búsqueda.",
    catsTitle: "Canales disponibles",
    featuredLede: "Las salas y estudios mejor evaluados por bandas y solistas.",
    hostTitle: "Tu sala en silencio también puede facturar.",
  },
};

function toHeroSpace(space: SpaceWithAmenities): HeroSpace {
  return {
    id: space.id,
    title: space.title,
    category: space.category,
    commune: space.commune,
    city: space.city,
    pricePerHour: space.price_per_hour,
    image: space.images[0] ?? null,
    tags: space.amenities.slice(0, 3).map((a) => a.name),
  };
}

// Mejor evaluados primero; sin reseñas, los más recientes (la query ya viene por fecha).
function byRating(a: SpaceWithAmenities, b: SpaceWithAmenities) {
  return (b.avg_rating ?? 0) - (a.avg_rating ?? 0) || b.review_count - a.review_count;
}

export default async function Home() {
  const world = await getWorld();
  const copy = COPY[world];
  const other: World = world === "av" ? "mu" : "av";

  // La portada trabaja con los últimos 50 espacios publicados (máximo por página de la query).
  const { spaces } = await listPublishedSpaces({ pageSize: 50 });
  const inWorld = spaces.filter((s) => worldOf(s.category) === world);
  const featured = [...inWorld].sort(byRating).slice(0, FEATURED_COUNT);
  const days = nextDays(currentTime().today, 14);
  const categoryOrder = [...WORLDS[world].categories, ...WORLDS[other].categories];

  return (
    <>
      <section className="hero wrap">
        <div className="hero-head">
          <div>
            <p className="mono acc">{copy.kicker}</p>
            <h1 className="display h1 mt-3">{copy.title}</h1>
          </div>
          <p className="lede">{copy.lede}</p>
        </div>
        {world === "av" ? (
          <Viewfinder key="av" spaces={inWorld.map(toHeroSpace)} days={days} />
        ) : (
          <MixingConsole key="mu" spaces={inWorld.map(toHeroSpace)} days={days} />
        )}
      </section>

      <section className="section wrap" aria-labelledby="cat-t">
        <div className="sec-head">
          <h2 className="display h2" id="cat-t">
            {copy.catsTitle}
          </h2>
          <Link className="btn btn-line btn-sm" href="/explorar">
            Ver catálogo
          </Link>
        </div>
        <div className="cats">
          {categoryOrder.map((category) => {
            const inCategory = spaces.filter((s) => s.category === category);
            const from = inCategory.length ? Math.min(...inCategory.map((s) => s.price_per_hour)) : null;
            const isOther = worldOf(category) !== world;
            return (
              <Link key={category} className={`cat panel ${isOther ? "other" : ""}`} href={`/explorar?category=${category}`}>
                <span className="mode">{CATEGORY_META[category].mode}</span>
                <span className="ico">
                  <CategoryIcon category={category} />
                </span>
                <b>{SPACE_CATEGORY_LABELS[category]}</b>
                <span className="dim text-[13px]">{CATEGORY_META[category].blurb}</span>
                <span className="dim mt-auto text-xs">
                  {from != null ? (
                    <>
                      {inCategory.length} {inCategory.length === 1 ? "espacio" : "espacios"} desde{" "}
                      <b className="acc">{formatCLP(from)}</b> por hora
                    </>
                  ) : (
                    "Próximamente"
                  )}
                  {isOther && ` · Mundo ${WORLDS[worldOf(category)].name}`}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section wrap" aria-labelledby="sides-t">
        <div className="sec-head">
          <div>
            <h2 className="display h2" id="sides-t">
              Reserva con confianza, califica de vuelta.
            </h2>
            <p className="lede">
              Ficha técnica completa antes de reservar, horarios en tiempo real y reseñas de quienes ya usaron cada
              espacio. Después de cada sesión, cuenta cómo te fue.
            </p>
          </div>
        </div>
        <div className="sides">
          <article className="side panel">
            <p className="mono acc">Si buscas espacio</p>
            <h3 className="display h3">Descubre y reserva por hora</h3>
            <div className="mini-deck" aria-hidden>
              {inWorld.slice(0, 3).map((s, i) => (
                <div
                  key={s.id}
                  className="mc"
                  style={{ transform: `rotate(${(i - 1) * 8}deg) translateX(${(i - 1) * 24}px)`, zIndex: i }}
                >
                  {s.images[0] && <Image src={s.images[0]} alt="" fill sizes="180px" className="object-cover" />}
                  <span>{s.title}</span>
                </div>
              ))}
            </div>
            <p className="dim text-sm">
              Filtra por equipamiento, comuna y precio, elige tu bloque en la línea de tiempo y la reserva queda
              confirmada al tiro.
            </p>
            <Link className="btn btn-acc" href="/explorar">
              Explorar espacios
            </Link>
          </article>
          <div className="bridge" aria-label="Calificación de ida y vuelta">
            <span className="rb">
              <span className="av sm" aria-hidden>
                ★
              </span>
              <span>
                <b>Clientes</b>
                <br />
                <span className="dim">reseñan el espacio</span>
              </span>
            </span>
            <span className="btn btn-acc btn-sm pointer-events-none rounded-full">
              <ArrowLeftRight aria-hidden />
            </span>
            <span className="rb">
              <span className="av sm" aria-hidden>
                ★
              </span>
              <span>
                <b>Anfitriones</b>
                <br />
                <span className="dim">completan la sesión</span>
              </span>
            </span>
            <p className="dim max-w-[22ch] text-xs">Solo quien reservó y usó el espacio puede reseñarlo.</p>
          </div>
          <article className="side panel">
            <p className="mono acc">Si tienes un espacio</p>
            <h3 className="display h3">Gestiona todo desde tu panel</h3>
            <ul className="list my-2.5">
              {[
                ["Reservas próximas", "Confirmadas y con horario bloqueado"],
                ["Por completar", "Marca la sesión y habilita la reseña"],
                ["Estado del espacio", "Publica, pausa o archiva cuando quieras"],
              ].map(([title, text], i) => (
                <li key={title} className="li panel" style={{ opacity: 1 - i * 0.22, background: "var(--bg)" }}>
                  <div className="grow">
                    <b>{title}</b>
                    <span className="dim text-xs">{text}</span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="dim text-sm">Recibes reservas por horas completas y ves el total de cada sesión.</p>
            <Link className="btn btn-line" href="/dashboard">
              Ir al panel de anfitrión
            </Link>
          </article>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section wrap" aria-labelledby="dest-t">
          <div className="sec-head">
            <div>
              <h2 className="display h2" id="dest-t">
                Espacios destacados
              </h2>
              <p className="lede">{copy.featuredLede}</p>
            </div>
            <Link className="btn btn-line btn-sm" href="/explorar">
              Ver todos
            </Link>
          </div>
          <div className="grid-cards">
            {featured.map((space) => (
              <SpaceCard key={space.id} space={space} />
            ))}
          </div>
        </section>
      )}

      <section className="section wrap" id="anfitriones" aria-labelledby="host-t">
        <div className="host-cta panel">
          <div>
            <h2 className="display h2" id="host-t">
              {copy.hostTitle}
            </h2>
            <p className="lede">
              Publica tu espacio y llena las horas que hoy quedan sin uso. Publicar es gratis: la tarifa de servicio la
              paga el cliente solo cuando hay una reserva.
            </p>
            <ul className="points">
              <li>
                <span className="ico">
                  <CalendarDays aria-hidden />
                </span>
                <span>
                  <b>Tú decides el precio</b>
                  <br />
                  <span className="dim text-sm">Fija tu precio por hora y el mínimo de horas por reserva.</span>
                </span>
              </li>
              <li>
                <span className="ico">
                  <SlidersHorizontal aria-hidden />
                </span>
                <span>
                  <b>Ficha técnica guiada</b>
                  <br />
                  <span className="dim text-sm">
                    Cargas tu equipamiento una vez y los clientes llegan sabiendo con qué van a trabajar.
                  </span>
                </span>
              </li>
              <li>
                <span className="ico">
                  <ShieldCheck aria-hidden />
                </span>
                <span>
                  <b>Reseñas verificadas</b>
                  <br />
                  <span className="dim text-sm">Solo reseñan clientes que completaron una sesión en tu espacio.</span>
                </span>
              </li>
            </ul>
            <div className="flex flex-wrap gap-2.5">
              <Link className="btn btn-acc btn-lg" href="/espacios/nuevo">
                Publicar mi espacio
              </Link>
              <Link className="btn btn-line btn-lg" href="/dashboard">
                Ver el panel
              </Link>
            </div>
          </div>
          <EarningsCalculator />
        </div>
      </section>
    </>
  );
}
