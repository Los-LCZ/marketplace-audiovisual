import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { buttonClasses } from "@/components/ui/button";
import { NavLinks, type NavItem } from "./nav-links";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";

export async function Navbar() {
  const user = await getCurrentUser();
  const isHost = user?.profile.role === "host" || user?.profile.role === "admin";

  const items: NavItem[] = [{ href: "/", label: "Explorar" }];
  if (user) items.push({ href: "/mis-reservas", label: "Mis reservas" });
  if (isHost) items.push({ href: "/dashboard", label: "Panel anfitrión" });

  const displayName = user?.profile.full_name || user?.email || "Mi cuenta";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Clapperboard className="size-6 text-primary" aria-hidden />
          <span>Estudios&nbsp;CL</span>
        </Link>

        <div className="hidden flex-1 md:flex">
          <NavLinks items={items} />
        </div>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {user ? (
            <UserMenu name={displayName} email={user.email} />
          ) : (
            <>
              <Link href="/login" className={buttonClasses({ variant: "ghost" })}>
                Iniciar sesión
              </Link>
              <Link href="/registro" className={buttonClasses()}>
                Registrarse
              </Link>
            </>
          )}
        </div>

        <MobileNav items={items} user={user ? { name: displayName, email: user.email } : null} />
      </nav>
    </header>
  );
}
