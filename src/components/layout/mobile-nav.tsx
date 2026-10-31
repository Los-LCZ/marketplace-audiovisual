"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Menu, X } from "lucide-react";
import { signout } from "@/app/auth/actions";
import { buttonClasses } from "@/components/ui/button";
import { NavLinks, type NavItem } from "./nav-links";

export function MobileNav({
  items,
  user,
}: {
  items: NavItem[];
  user: { name: string; email?: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="ml-auto md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        className="flex size-10 items-center justify-center rounded-lg hover:bg-muted"
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </button>

      {open && (
        <div
          id="mobile-nav"
          className="absolute inset-x-0 top-16 border-b border-border bg-background px-4 pt-2 pb-4 shadow-lg"
        >
          <NavLinks items={items} vertical onNavigate={close} />
          <div className="mt-3 border-t border-border pt-3">
            {user ? (
              <>
                <p className="px-3 text-sm font-medium">{user.name}</p>
                {user.email && <p className="px-3 text-xs text-muted-foreground">{user.email}</p>}
                <form action={signout} className="mt-2">
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
                  >
                    <LogOut className="size-4" aria-hidden />
                    Cerrar sesión
                  </button>
                </form>
              </>
            ) : (
              <div className="flex gap-2">
                <Link href="/login" onClick={close} className={buttonClasses({ variant: "secondary", className: "flex-1" })}>
                  Iniciar sesión
                </Link>
                <Link href="/registro" onClick={close} className={buttonClasses({ className: "flex-1" })}>
                  Registrarse
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
