import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProfileRatingStats } from "@/lib/queries/profiles";
import { listDiscoverDeck, listLikedSpaces } from "@/lib/queries/spaces";
import { formatCLP } from "@/lib/utils";
import { WORLDS } from "@/lib/world";
import { getWorld } from "@/lib/world-server";
import { DiscoverDeck } from "@/components/deck/discover-deck";
import { Avatar } from "@/components/ui/avatar";
import { RatingPill } from "@/components/ui/rating";

export const metadata: Metadata = { title: "Descubrir" };

const DECK_SIZE = 20;
const LIKED_SHOWN = 6;

export default async function DescubrirPage() {
  // El proxy ya protege la ruta; esto cubre una sesión que expiró entre medio.
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/descubrir");

  const world = await getWorld();
  const [deck, liked, stats] = await Promise.all([
    listDiscoverDeck(WORLDS[world].categories, DECK_SIZE),
    listLikedSpaces(user.id),
    getProfileRatingStats(user.id),
  ]);
  const name = user.profile.full_name ?? user.email ?? "Tú";
  const myRating = stats.as_client.avg;

  return (
    <div className="wrap">
      <div className="discover">
        <section>
          <p className="mono acc">{WORLDS[world].deck.kicker}</p>
          <h1 className="display h2 mt-2 mb-[22px]">Descubrir</h1>
          <DiscoverDeck cards={deck} world={world} me={{ name, rating: myRating, verified: user.profile.verified }} />
        </section>

        <aside className="grid content-start gap-[22px]">
          <Link className="panel li no-underline" href={`/u/${user.id}`}>
            <Avatar name={name} verified={user.profile.verified} />
            <div className="grow">
              <b>{name}</b>
              <RatingPill rating={myRating} count={stats.as_client.count || undefined} label="como cliente" />
            </div>
          </Link>
          <p className="dim text-sm">
            Los anfitriones te califican después de cada sesión. Si tu nota cumple lo que pide un espacio,{" "}
            {world === "av" ? "la toma buena" : "el Solo"} es reserva directa. Si no, tu reserva queda como solicitud.
          </p>
          <div>
            <div className="flex justify-between">
              <b>Tus me gusta</b>
              <Link href="/mis-reservas" className="dim text-[13px]">
                Ver todo
              </Link>
            </div>
            <div className="list mt-2.5">
              {liked.length ? (
                liked.slice(0, LIKED_SHOWN).map((space) => (
                  <Link key={space.id} className="li panel p-2.5 no-underline" href={`/espacios/${space.id}`}>
                    <div className="thumb size-11">
                      {space.images[0] && <Image src={space.images[0]} alt="" width={44} height={44} />}
                    </div>
                    <div className="grow">
                      <b className="text-sm">{space.title}</b>
                      <span className="dim block text-xs">{formatCLP(space.price_per_hour)} por hora</span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="dim rounded-[10px] border border-dashed border-[var(--line2)] p-3.5 text-sm">
                  Desliza a la derecha los espacios que te gusten y aparecerán aquí.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
