import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { SPACE_CATEGORIES, SPACE_CATEGORY_LABELS } from "@/lib/labels";
import { Logo } from "./navbar";

const YEAR = new Date().getFullYear();

export async function Footer() {
  const user = await getCurrentUser();

  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <Logo />
            <p className="dim mt-3.5 max-w-[34ch] text-sm">
              Estudios, salas de ensayo, sets y locaciones por hora en Santiago, con ficha técnica completa antes de
              reservar.
            </p>
          </div>
          <div>
            <h4>Explora</h4>
            <ul>
              {SPACE_CATEGORIES.map((c) => (
                <li key={c}>
                  <Link href={`/explorar?category=${c}`}>{SPACE_CATEGORY_LABELS[c]}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Anfitriones</h4>
            <ul>
              <li>
                <Link href="/espacios/nuevo">Publica tu espacio</Link>
              </li>
              <li>
                <Link href="/dashboard">Panel de anfitrión</Link>
              </li>
              <li>
                <Link href="/#anfitriones">Cómo se calcula tu pago</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Tu cuenta</h4>
            <ul>
              <li>
                <Link href="/mis-reservas">Mis sesiones</Link>
              </li>
              {user ? (
                <>
                  <li>
                    <Link href="/descubrir">Descubrir</Link>
                  </li>
                  <li>
                    <Link href={`/u/${user.id}`}>Mi perfil</Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link href="/login">Iniciar sesión</Link>
                  </li>
                  <li>
                    <Link href="/registro">Crear cuenta</Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© {YEAR} Señal. Hecho en Santiago de Chile.</span>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/terminos">Términos</Link>
            <Link href="/privacidad">Privacidad</Link>
            <Link href="/cancelaciones">Cancelaciones</Link>
          </nav>
          <span>Precios en pesos chilenos. Horarios en hora de Chile.</span>
        </div>
      </div>
    </footer>
  );
}
