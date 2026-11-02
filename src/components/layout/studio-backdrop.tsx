import Image from "next/image";
// Foto de Alexander Dummer (unsplash.com/photos/aS4Duj2j7r4), Licencia de Unsplash: uso comercial libre.
import avSet from "@/assets/senal/av-set.webp";
import { MusicStudio } from "./music-studio";

/**
 * Fondo de cada mundo, fijo detrás del contenido: Audiovisual usa una foto real de un set con un velo azul
 * medianoche encima; Música, un estudio urbano con LED violeta dibujado en SVG (MusicStudio).
 * Se renderizan los dos y el CSS muestra el del mundo activo, así el interruptor de mundos no recarga;
 * la foto es lazy y no se descarga mientras su capa está oculta.
 */
export function StudioBackdrop() {
  return (
    <>
      <div className="backdrop backdrop-av" aria-hidden="true">
        <Image src={avSet} alt="" fill sizes="100vw" placeholder="blur" className="backdrop-photo" />
      </div>
      <div className="backdrop backdrop-mu" aria-hidden="true">
        <MusicStudio />
      </div>
    </>
  );
}
