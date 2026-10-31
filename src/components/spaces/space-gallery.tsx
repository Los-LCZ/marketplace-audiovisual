"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";

/**
 * Galería de la ficha: foto principal + tira de miniaturas. En el mundo Audiovisual la
 * foto principal se ve dentro de un visor (HUD de cámara); en Música, como una foto simple.
 */
export function SpaceGallery({ images, title, world }: { images: string[]; title: string; world: "av" | "mu" }) {
  const [current, setCurrent] = useState(0);
  const src = images[current];

  return (
    <div className="gallery">
      <div className={`main ${world === "av" ? "vf cursor-default" : ""}`} style={world === "av" ? { aspectRatio: "16/9" } : undefined}>
        {src ? (
          <Image src={src} alt={`${title} — foto ${current + 1}`} fill priority sizes="(min-width: 1240px) 800px, 100vw" className="object-cover" />
        ) : (
          <div className="dim flex size-full items-center justify-center">
            <ImageOff className="size-10" aria-hidden />
            <span className="sr-only">Sin fotos</span>
          </div>
        )}
        {world === "av" && (
          <>
            <div className="vf-shade" />
            <div className="vf-grid" />
            <div className="vf-corners">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="vf-hud top">
              <span className="rec">
                <i />
                REC
              </span>
              <span>A001 C00{current + 1}</span>
              <span className="sp" />
              <span>
                {images.length ? current + 1 : 0}/{images.length}
              </span>
            </div>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="strip-th" role="group" aria-label="Fotos">
          {images.map((img, i) => (
            <button key={img} type="button" aria-pressed={i === current} aria-label={`Foto ${i + 1}`} onClick={() => setCurrent(i)}>
              <Image src={img} alt="" fill sizes="120px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
