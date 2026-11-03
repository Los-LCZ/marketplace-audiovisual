"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, CircleCheck, Lock, Music, RotateCcw } from "lucide-react";
import { likeSpace, passSpace, resetPasses, undoReaction } from "@/app/actions/reactions";
import type { DeckCard } from "@/lib/queries/spaces";
import { SPACE_CATEGORY_LABELS } from "@/lib/labels";
import { formatCLP, formatRating } from "@/lib/utils";
import { WORLDS, type World } from "@/lib/world";
import { applyWorld } from "@/components/layout/world-switch";
import { Avatar } from "@/components/ui/avatar";
import { useLayer } from "@/components/ui/layer";
import { RatingPill } from "@/components/ui/rating";
import { toast } from "@/components/ui/toaster";
import { SwipeDeck, type SwipeDir } from "@/components/deck/swipe-deck";

const MAX_TAGS = 3;
const pad = (n: number, size: number) => String(n).padStart(size, "0");

function CardFace({ card, photo, index, world }: { card: DeckCard; photo: number; index: number; world: World }) {
  const image = card.images[photo] ?? card.images[0];
  const min = card.host_min_client_rating;
  const n = index + 1;
  return (
    <>
      {image && <Image className="bgimg" src={image} alt="" fill sizes="400px" draggable={false} priority={index === 0} />}
      <div className="shade" />
      {card.images.length > 1 && (
        <div className="bars">
          {card.images.map((_, i) => (
            <b key={i} className={i === photo ? "on" : ""} />
          ))}
        </div>
      )}
      <div className="hud">
        {world === "av" ? (
          <>
            <span className="rec">
              <i />
              REC
            </span>
            <span>A001 C{pad(n, 3)}</span>
            <span>ISO 800 · f/2.8</span>
          </>
        ) : (
          <>
            <span>CH {pad(n, 2)}</span>
            <span>{card.category === "rehearsal_room" ? "LIVE ROOM" : "CONTROL ROOM"}</span>
            <span>-6 dB</span>
          </>
        )}
      </div>
      {world === "av" ? (
        <>
          <div className="vfc" />
          <div className="afbox" />
        </>
      ) : (
        <div className="meterbar">
          <div className="meter">
            <i style={{ ["--lvl" as string]: `${55 + ((n * 7) % 35)}%` }} />
          </div>
          <div className="meter">
            <i style={{ ["--lvl" as string]: `${50 + ((n * 11) % 40)}%` }} />
          </div>
        </div>
      )}
      <div className="info">
        <span className="mono" style={{ color: "rgba(255,255,255,.75)" }}>
          {SPACE_CATEGORY_LABELS[card.category]}
        </span>
        <div className="t">{card.title}</div>
        <span className="text-[13px] opacity-85">
          {card.neighborhood ? `${card.neighborhood}, ${card.commune}` : `${card.commune}, ${card.city}`}
        </span>
        {card.amenities.length > 0 && (
          <div className="tags">
            {card.amenities.slice(0, MAX_TAGS).map((a) => (
              <span key={a.id} className="tag">
                {a.name}
              </span>
            ))}
          </div>
        )}
        <div className="pr">
          <span>
            <b>{formatCLP(card.price_per_hour)}</b> <span className="text-[13px] opacity-70">por hora</span>
          </span>
          {card.host && (
            <span className="flex items-center gap-2 text-xs">
              <Avatar name={card.host.full_name} src={card.host.avatar_url} size="sm" verified={card.host.verified} />
              <span>
                {card.host.full_name?.split(" ")[0]}
                <br />
                {card.avg_rating != null ? `★ ${formatRating(card.avg_rating)}` : "Nuevo"}
              </span>
            </span>
          )}
        </div>
        <div className={`rulebox ${card.is_match ? "ok" : ""}`}>
          {card.is_match ? <CircleCheck aria-hidden /> : <Lock aria-hidden />}
          {card.is_match
            ? min != null
              ? `Reserva directa: pide ${formatRating(min)} y tienes ${formatRating(card.my_client_rating ?? 0)}`
              : "Reserva directa: el anfitrión acepta a cualquier cliente"
            : `Pide nota ${formatRating(min ?? 0)} como cliente: irá como solicitud`}
        </div>
      </div>
    </>
  );
}

function MatchOverlay({
  card,
  world,
  me,
  onClose,
}: {
  card: DeckCard;
  world: World;
  me: { name: string; avatarUrl: string | null; rating: number | null; verified: boolean };
  onClose: () => void;
}) {
  // Escape, Tab dentro del aviso y foco de vuelta al mazo al cerrar.
  const ref = useLayer(true, onClose);

  const hostName = card.host?.full_name ?? "El anfitrión";
  return createPortal(
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="match-title">
      <div className="match" ref={ref}>
        {world === "av" ? (
          <div className="clap" aria-hidden>
            <div className="top" />
            <div className="body">ESC 1 · TOMA 1</div>
          </div>
        ) : (
          <div className="sync-meters" aria-hidden>
            {[70, 85, 92, 100, 100, 92, 85, 70].map((lvl, i) => (
              <div key={i} className="meter">
                <i style={{ ["--lvl" as string]: `${lvl}%` }} />
              </div>
            ))}
          </div>
        )}
        <p className="mono acc">Tu nota cumple lo que pide {hostName.split(" ")[0]}</p>
        <h2 className="t" id="match-title">
          {WORLDS[world].deck.matchTitle}
        </h2>
        <div className="pair">
          <Avatar name={me.name} src={me.avatarUrl} size="xl" verified={me.verified} />
          <span className="plus">+</span>
          <Avatar name={hostName} src={card.host?.avatar_url} size="xl" verified={card.host?.verified} />
        </div>
        <div className="flex flex-wrap justify-center gap-2.5">
          <RatingPill rating={me.rating} label="como cliente" />
          <RatingPill rating={card.avg_rating} label="el espacio" />
        </div>
        <p className="dim">Puedes reservar {card.title} sin esperar aprobación.</p>
        <div className="mt-1.5 flex flex-wrap justify-center gap-2.5">
          <Link className="btn btn-acc btn-lg" href={`/espacios/${card.id}`} autoFocus>
            Elegir horario
          </Link>
          <button type="button" className="btn btn-soft btn-lg" onClick={onClose}>
            Seguir descubriendo
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Mazo de Descubrir: derecha = me gusta, izquierda = descarte, arriba = reservar ya. */
export function DiscoverDeck({
  cards,
  world,
  me,
}: {
  cards: DeckCard[];
  world: World;
  me: { name: string; avatarUrl: string | null; rating: number | null; verified: boolean };
}) {
  const router = useRouter();
  const [match, setMatch] = useState<DeckCard | null>(null);
  // Cambia al reiniciar los descartes: remonta el mazo para olvidar las tarjetas ya deslizadas.
  const [round, setRound] = useState(0);
  const [resetting, startReset] = useTransition();
  const copy = WORLDS[world].deck;
  const other: World = world === "av" ? "mu" : "av";
  const order = new Map(cards.map((c, i) => [c.id, i]));

  async function onSwipe(card: DeckCard, dir: SwipeDir) {
    const result = await (dir === "left" ? passSpace(card.id) : likeSpace(card.id));
    if (result && !result.ok) {
      toast("No se pudo guardar", result.error, "info");
      return false;
    }
    if (dir === "up") router.push(`/espacios/${card.id}`);
    else if (dir === "right") {
      if (card.is_match) setMatch(card);
      else toast("Guardado en tus me gusta", "Tu reserva irá como solicitud: el anfitrión debe aprobarla.", "info");
    }
    return true;
  }

  async function onUndo(card: DeckCard) {
    const result = await undoReaction(card.id);
    if (result && !result.ok) {
      toast("No se pudo deshacer", result.error, "info");
      return false;
    }
    return true;
  }

  function reset() {
    startReset(async () => {
      const result = await resetPasses(WORLDS[world].categories);
      if (!result?.ok) return toast("No se pudo reiniciar", result?.ok === false ? result.error : undefined, "info");
      const n = result.data?.count ?? 0;
      if (!n) return toast("No tienes descartes", "Los espacios que te gustaron siguen en tus me gusta.", "info");
      toast(n === 1 ? "Un espacio vuelve al mazo" : `${n} espacios vuelven al mazo`, undefined, "ok");
      setRound((r) => r + 1);
    });
  }

  const EmptyIcon = world === "av" ? Camera : Music;
  return (
    <>
      <SwipeDeck
        key={round}
        items={cards}
        itemKey={(c) => c.id}
        renderCard={(c, photo) => <CardFace card={c} photo={photo} index={order.get(c.id) ?? 0} world={world} />}
        photoCount={(c) => c.images.length}
        stamps={{ right: copy.stampLike, left: copy.stampPass, up: "RESERVA YA" }}
        labels={{ right: copy.like, left: copy.pass, up: "Reservar ya" }}
        rightIcon={world === "av" ? "heart" : "music"}
        onSwipe={onSwipe}
        onUndo={onUndo}
        hint="Arrastra la tarjeta, toca para ver más fotos o usa las flechas ← → ↑"
        empty={
          <div className="empty min-h-[420px] w-full max-w-[400px] content-center">
            <EmptyIcon className="size-8 text-[var(--acc)]" aria-hidden />
            <b className="display h3">Revisaste todo {WORLDS[world].name}</b>
            <p className="dim">Vuelve a ver lo que descartaste, mira tus matches o cambia de mundo.</p>
            <button type="button" className="btn btn-line" disabled={resetting} onClick={reset}>
              <RotateCcw aria-hidden />
              {resetting ? "Reiniciando..." : "Volver a ver todo"}
            </button>
            <button
              type="button"
              className="btn btn-acc"
              onClick={() => {
                applyWorld(other);
                router.refresh();
              }}
            >
              Ir a {WORLDS[other].name}
            </button>
            <Link className="btn btn-soft" href="/mis-reservas">
              Ver mis matches
            </Link>
          </div>
        }
      />
      {match && <MatchOverlay card={match} world={world} me={me} onClose={() => setMatch(null)} />}
    </>
  );
}
