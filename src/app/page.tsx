import Image from "next/image";
import Link from "next/link";
import { ArrowLeftRight, CalendarDays, ShieldCheck, SlidersHorizontal } from "lucide-react";
import {
  getCategoryStats,
  listFeaturedSpaces,
  listPublishedSpaces,
  type SpaceWithAmenities,
} from "@/lib/queries/spaces";
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


export default async function Home() {
  const world = await getWorld();
  const copy = COPY[world];
  const other: World = world === "av" ? "mu" : "av";

  const categories = WORLDS[world].categories;
  // El Visor y la Consola muestran los mejor valorados del mundo activo. Destacados: los
  // marcados por un admin; si no hay, los mejor valorados.
  const [{ spaces: inWorld }, stats, featuredPicks] = await Promise.all([
    listPublishedSpaces({ categories, sort: "rating", pageSize: 24 }),
    getCategoryStats(),
    listFeaturedSpaces(categories, FEATURED_COUNT),
  ]);
  const featured: SpaceWithAmenities[] = featuredPicks.length ? featuredPicks : inWorld.slice(0, FEATURED_COUNT);
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
            const { space_count: count, min_price: from } = stats[category];
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
                  {count && from != null ? (
                    <>
                      {count} {count === 1 ? "espacio" : "espacios"} desde{" "}
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
              Desliza, haz match y califica de vuelta.
            </h2>
            <p className="lede">
              Los clientes descubren espacios deslizando y los anfitriones eligen a quién abrirle la puerta. Después de
              cada sesión, ambos se califican.
            </p>
          </div>
        </div>
        <div className="sides">
          <article className="side panel">
            <p className="mono acc">Si buscas espacio</p>
            <h3 className="display h3">Descubre deslizando</h3>
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
              {world === "av"
                ? "Desliza a la derecha para marcar la toma buena."
                : "Desliza a la derecha para dejar el canal en Solo."}{" "}
              Si tu nota como cliente cumple lo que pide el anfitrión, reservas al tiro.
            </p>
            <Link className="btn btn-acc" href="/descubrir">
              Ir a Descubrir
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
                <span className="dim">califican el espacio</span>
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
                <span className="dim">califican al cliente</span>
              </span>
            </span>
            <p className="dim max-w-[22ch] text-xs">A ciegas: nadie ve la nota del otro hasta enviar la suya.</p>
          </div>
          <article className="side panel">
            <p className="mono acc">Si tienes un espacio</p>
            <h3 className="display h3">Elige a quién abrirle la puerta</h3>
            <ul className="list my-2.5">
              {[
                ["Nota mínima", "Quien la cumple reserva al tiro"],
                ["Solicitudes", "Desliza para aceptar o rechazar al resto"],
                ["Califica a tus clientes", "Su nota la ven los demás anfitriones"],
              ].map(([title, text], i) => (
                <li key={title} className="li panel" style={{ opacity: 1 - i * 0.22, background: "var(--bg)" }}>
                  <div className="grow">
                    <b>{title}</b>
                    <span className="dim text-xs">{text}</span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="dim text-sm">Ves la nota y la última reseña de cada cliente antes de aceptarlo.</p>
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
