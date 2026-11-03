import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import type { World } from "@/lib/world";
import { NavLinks, TabBar, type NavItem } from "./nav-links";
import { UserMenu } from "./user-menu";
import { WorldSwitch } from "./world-switch";

export function Logo() {
  return (
    <Link className="logo" href="/" aria-label="Señal, ir al inicio">
      <span className="logo-led" />
      SEÑAL
    </Link>
  );
}

// Barra superior + barra inferior móvil. Los links dependen de la sesión y del rol.
export async function Navbar({ world }: { world: World }) {
  const user = await getCurrentUser();
  const isHost = user?.profile.role === "host" || user?.profile.role === "admin";

  const desktop: NavItem[] = [
    { href: "/", label: "Inicio", icon: "compass" },
    { href: "/explorar", label: "Explorar", icon: "search" },
    { href: "/descubrir", label: "Descubrir", icon: "heart" },
  ];
  if (user) desktop.push({ href: "/mis-reservas", label: "Mis sesiones", icon: "calendar" });
  if (isHost) desktop.push({ href: "/dashboard", label: "Panel", icon: "dashboard" });

  const mobile: NavItem[] = [
    { href: "/", label: "Inicio", icon: "compass" },
    { href: "/explorar", label: "Explorar", icon: "search" },
    { href: "/descubrir", label: "Descubrir", icon: "heart" },
    user
      ? { href: "/mis-reservas", label: "Sesiones", icon: "calendar" }
      : { href: "/login", label: "Ingresar", icon: "user" },
  ];
  if (isHost) mobile.push({ href: "/dashboard", label: "Panel", icon: "dashboard" });

  const displayName = user?.profile.full_name || user?.email || "Mi cuenta";
  const roleLabel = isHost ? "Anfitrión" : "Cliente";

  return (
    <>
      <header className="topbar">
        <div className="wrap topbar-in">
          <Logo />
          <NavLinks items={desktop} />
          <div className="topbar-right">
            <WorldSwitch world={world} />
            {user ? (
              <UserMenu userId={user.id} name={displayName} avatarUrl={user.profile.avatar_url} email={user.email} roleLabel={roleLabel} isHost={isHost} />
            ) : (
              <>
                <Link className="btn btn-line btn-sm hidden sm:inline-flex" href="/login">
                  Ingresar
                </Link>
                <Link className="btn btn-acc btn-sm" href="/registro">
                  Crear cuenta
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <TabBar items={mobile} />
    </>
  );
}
