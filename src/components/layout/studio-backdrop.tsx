import { MusicStudio } from "./music-studio";
import { VideoSet } from "./video-set";

/**
 * Fondo de cada mundo, fijo detrás del contenido: Audiovisual es un set fotográfico (VideoSet) con un velo azul
 * medianoche encima; Música, un estudio urbano con LED violeta (MusicStudio). Los dos están dibujados en SVG.
 * Se renderizan ambos y el CSS muestra el del mundo activo, así el interruptor de mundos no recarga.
 */
export function StudioBackdrop() {
  return (
    <>
      <div className="backdrop backdrop-av" aria-hidden="true">
        <VideoSet />
      </div>
      <div className="backdrop backdrop-mu" aria-hidden="true">
        <MusicStudio />
      </div>
    </>
  );
}
