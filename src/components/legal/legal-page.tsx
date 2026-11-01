import type { ReactNode } from "react";

/** Fecha del borrador vigente de las tres páginas legales. */
export const LEGAL_UPDATED = "1 de noviembre de 2026";

export type LegalSection = { id: string; title: string; soon?: boolean; body: ReactNode };

/** Dato pendiente de completar por el equipo, visible en la página (p. ej. [RUT]). */
export function Ph({ children }: { children: string }) {
  return <mark className="ph">[{children}]</mark>;
}

/**
 * Página de lectura legal con el estilo Señal: aviso de borrador, índice lateral
 * fijo en desktop (plegable en móvil) y anclas por sección. `pending` lista los
 * marcadores que faltan completar antes de publicar la versión final.
 */
export function LegalPage({
  kicker,
  title,
  updated,
  intro,
  sections,
  pending,
}: {
  kicker: string;
  title: string;
  /** Fecha de la última actualización, ya formateada. */
  updated: string;
  intro: ReactNode;
  sections: LegalSection[];
  pending: string[];
}) {
  const toc = (
    <ol>
      {sections.map((s, i) => (
        <li key={s.id}>
          <a href={`#${s.id}`}>
            {i + 1}. {s.title}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="wrap">
      <div className="legal">
        <nav className="legal-toc" aria-label="Índice">
          <p className="mono dim">Contenido</p>
          {toc}
        </nav>

        <article className="legal-body">
          <p className="legal-draft mono">Borrador · última actualización: {updated}</p>
          <p className="mono acc mt-6">{kicker}</p>
          <h1 className="display h2 mt-2">{title}</h1>
          <div className="mt-5">{intro}</div>

          <details className="legal-toc-mobile mt-6">
            <summary>Contenido</summary>
            <nav aria-label="Índice">{toc}</nav>
          </details>

          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`}>
              <h2 id={`${s.id}-h`}>
                <a href={`#${s.id}`}>
                  {i + 1}. {s.title}
                </a>
                {s.soon && <span className="legal-soon">Próximamente</span>}
              </h2>
              {s.body}
            </section>
          ))}

          {pending.length > 0 && (
            <aside className="legal-todo" aria-label="Datos por completar">
              <b>Por completar antes de publicar la versión final</b>
              <ul>
                {pending.map((p) => (
                  <li key={p}>
                    <Ph>{p}</Ph>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </article>
      </div>
    </div>
  );
}
