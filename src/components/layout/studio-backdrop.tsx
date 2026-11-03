/**
 * Fondo de cada mundo, fijo detrás del contenido: Audiovisual es un set fotográfico (VideoSet) con un velo azul
 * medianoche encima; Música, un estudio urbano con LED violeta (MusicStudio). Los dos están dibujados en SVG y se
 * sirven como archivos aparte desde /fondos/[file] (ver studio.css), así no pesan en el HTML de cada página.
 * Están ambos contenedores y el CSS muestra el del mundo activo, así el interruptor de mundos no recarga.
 */
export function StudioBackdrop() {
  return (
    <>
      <div className="backdrop backdrop-av" aria-hidden="true" />
      <div className="backdrop backdrop-mu" aria-hidden="true" />
    </>
  );
}
