"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Compass,
  Heart,
  LayoutDashboard,
  Plus,
  Search,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS };

const ICONS = {
  compass: Compass,
  heart: Heart,
  search: Search,
  calendar: CalendarDays,
  dashboard: LayoutDashboard,
  plus: Plus,
  user: UserRound,
} satisfies Record<string, LucideIcon>;

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

// Navegación principal de escritorio (.nav).
export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="nav" aria-label="Principal">
      {items.map((item) => (
        <Link key={item.href} href={item.href} aria-current={isActivePath(pathname, item.href) ? "page" : undefined}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

// Barra inferior de la app en móvil (.tabbar). Se oculta en la ficha, que tiene su propia barra de reserva.
export function TabBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  if (/^\/espacios\/(?!nuevo)[^/]+$/.test(pathname)) return null;

  return (
    <nav className="tabbar" aria-label="Navegación de la app">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        return (
          <Link key={item.href} href={item.href} aria-current={isActivePath(pathname, item.href) ? "page" : undefined}>
            <Icon aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
