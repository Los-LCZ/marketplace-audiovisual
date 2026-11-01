"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, LayoutDashboard, LogOut, Plus, UserRound } from "lucide-react";
import { signout } from "@/app/auth/actions";
import { Avatar } from "@/components/ui/avatar";

const ITEM = "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted";

// Chip del usuario (.me) con menú: accesos según rol y cerrar sesión.
export function UserMenu({
  userId,
  name,
  avatarUrl,
  email,
  roleLabel,
  isHost,
}: {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  email?: string;
  roleLabel: string;
  isHost: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);

  // Cierra el menú al hacer clic fuera o presionar Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Menú de ${name}`}
        className="me !inline-flex bg-transparent text-left"
      >
        <Avatar name={name} src={avatarUrl} size="sm" />
        <span className="hidden sm:inline">
          <b className="block max-w-32 truncate">{name.split(" ")[0]}</b>
          <span className="dim">{roleLabel}</span>
        </span>
      </button>

      {open && (
        <div role="menu" className="panel absolute right-0 z-50 mt-2 w-64 p-2 shadow-2xl">
          <p className="truncate px-3 pt-1 font-semibold">{name}</p>
          {email && <p className="dim truncate px-3 pb-2 text-xs">{email}</p>}
          <Link role="menuitem" href={`/u/${userId}`} onClick={close} className={ITEM}>
            <UserRound className="size-4" aria-hidden /> Mi perfil
          </Link>
          <Link role="menuitem" href="/mis-reservas" onClick={close} className={ITEM}>
            <CalendarDays className="size-4" aria-hidden /> Mis sesiones
          </Link>
          {isHost && (
            <>
              <Link role="menuitem" href="/dashboard" onClick={close} className={ITEM}>
                <LayoutDashboard className="size-4" aria-hidden /> Panel de anfitrión
              </Link>
              <Link role="menuitem" href="/espacios/nuevo" onClick={close} className={ITEM}>
                <Plus className="size-4" aria-hidden /> Publicar espacio
              </Link>
            </>
          )}
          <form action={signout} className="mt-1 border-t border-[var(--line)] pt-1">
            <button type="submit" role="menuitem" className={ITEM}>
              <LogOut className="size-4" aria-hidden /> Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
