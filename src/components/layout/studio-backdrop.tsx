/**
 * Fondo ilustrado de cada mundo, fijo detrás del contenido: un set con ciclorama, softbox
 * y parrilla de focos (Audiovisual) y una sala de control con difusores, ventana a la sala
 * de toma, monitores y consola (Música). Se dibujan los dos y el CSS muestra el del mundo
 * activo, así el interruptor de mundos no necesita recargar. Los colores salen de los
 * tokens (clases `bd-*` en studio.css).
 */
export function StudioBackdrop() {
  return (
    <>
      <svg className="backdrop backdrop-av" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="av-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="bd-stop-s3" />
            <stop offset="1" className="bd-stop-bg" />
          </linearGradient>
          <radialGradient id="av-cyc" cx="0.5" cy="0.3" r="0.5">
            <stop offset="0" className="bd-stop-fg" stopOpacity="0.2" />
            <stop offset="1" className="bd-stop-fg" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="av-cone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="bd-stop-fg" stopOpacity="0.16" />
            <stop offset="1" className="bd-stop-fg" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="av-pool">
            <stop offset="0" className="bd-stop-acc" stopOpacity="0.22" />
            <stop offset="1" className="bd-stop-acc" stopOpacity="0" />
          </radialGradient>
          <pattern id="av-truss" width="36" height="18" patternUnits="userSpaceOnUse">
            <path d="M0 0L18 18L36 0" className="bd-rig" />
          </pattern>
          <filter id="av-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="16" />
          </filter>
          <symbol id="av-spot" viewBox="0 0 90 40">
            <rect x="1" y="3" width="66" height="34" rx="8" className="bd-gear" />
            <circle cx="72" cy="20" r="15" className="bd-lens" />
            <circle cx="12" cy="12" r="3" className="bd-led" />
          </symbol>
          <symbol id="av-tripod" viewBox="0 0 120 300">
            <path d="M60 0V250M60 250L4 298M60 250L116 298M60 250V298" className="bd-stand" />
          </symbol>
        </defs>

        <rect width="1600" height="900" fill="url(#av-wall)" />
        {/* Ciclorama: muro y curva infinita hacia el piso */}
        <path d="M360 170H1240V600C1240 690 1330 740 1460 760H140C270 740 360 690 360 600Z" fill="url(#av-cyc)" />
        <ellipse cx="800" cy="760" rx="620" ry="70" fill="url(#av-pool)" />

        {/* Parrilla con focos colgados */}
        <rect y="40" width="1600" height="18" fill="url(#av-truss)" />
        <path d="M0 40H1600M0 58H1600" className="bd-rig" />
        <path d="M600 58V92M1000 58V92M230 58V80M1370 58V80M1180 58V76" className="bd-rig" />
        <use href="#av-spot" x="190" y="80" width="90" height="40" transform="rotate(18 235 100)" />
        <use href="#av-spot" x="1325" y="80" width="90" height="40" transform="rotate(160 1370 100)" />
        <use href="#av-spot" x="1135" y="76" width="90" height="40" transform="rotate(140 1180 96)" />

        {/* Softbox cenital y su cono de luz */}
        <polygon points="560,126 1040,126 1240,600 360,600" fill="url(#av-cone)" filter="url(#av-blur)" />
        <rect x="560" y="92" width="480" height="34" rx="6" className="bd-softbox" filter="url(#av-blur)" />
        <rect x="560" y="92" width="480" height="34" rx="6" className="bd-softbox" />

        {/* Fresnel a la izquierda y octabox a la derecha, sobre trípodes */}
        <use href="#av-tripod" x="200" y="460" width="120" height="300" />
        <g transform="rotate(-12 260 470)">
          <rect x="220" y="440" width="84" height="56" rx="10" className="bd-gear" />
          <rect x="300" y="446" width="14" height="44" rx="3" className="bd-lens" />
        </g>
        <use href="#av-tripod" x="1280" y="430" width="120" height="330" />
        <polygon points="1302,338 1378,338 1432,392 1432,468 1378,522 1302,522 1248,468 1248,392" className="bd-gear" />
        <polygon points="1310,356 1370,356 1414,400 1414,460 1370,504 1310,504 1266,460 1266,400" className="bd-face" />
      </svg>

      <svg className="backdrop backdrop-mu" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="mu-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="bd-stop-s2" />
            <stop offset="1" className="bd-stop-bg" />
          </linearGradient>
          <radialGradient id="mu-glass" cx="0.5" cy="0.7" r="0.7">
            <stop offset="0" className="bd-stop-acc" stopOpacity="0.28" />
            <stop offset="1" className="bd-stop-acc" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mu-lamp">
            <stop offset="0" className="bd-stop-acc" stopOpacity="0.3" />
            <stop offset="1" className="bd-stop-acc" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="mu-desk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="bd-stop-s3" />
            <stop offset="1" className="bd-stop-bg" />
          </linearGradient>
          {/* Difusor tipo skyline: bloques de distinta profundidad */}
          <pattern id="mu-diffuser" width="120" height="120" patternUnits="userSpaceOnUse">
            <rect x="2" y="2" width="26" height="26" className="bd-panel" />
            <rect x="32" y="2" width="26" height="26" className="bd-panel deep" />
            <rect x="62" y="2" width="26" height="26" className="bd-panel" />
            <rect x="92" y="2" width="26" height="26" className="bd-panel deep" />
            <rect x="2" y="32" width="26" height="26" className="bd-panel deep" />
            <rect x="32" y="32" width="26" height="26" className="bd-panel" />
            <rect x="62" y="32" width="26" height="26" className="bd-panel deep" />
            <rect x="92" y="32" width="26" height="26" className="bd-panel" />
            <rect x="2" y="62" width="56" height="56" className="bd-panel" />
            <rect x="62" y="62" width="26" height="56" className="bd-panel deep" />
            <rect x="92" y="62" width="26" height="56" className="bd-panel" />
          </pattern>
          <pattern id="mu-faders" width="30" height="56" patternUnits="userSpaceOnUse">
            <rect x="14" y="6" width="2" height="44" className="bd-track" />
            <rect x="8" y="26" width="14" height="8" rx="2" className="bd-cap" />
            <circle cx="15" cy="2" r="1.6" className="bd-led" />
          </pattern>
          <filter id="mu-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="22" />
          </filter>
          <symbol id="mu-monitor" viewBox="0 0 120 180">
            <rect x="2" y="2" width="116" height="176" rx="12" className="bd-gear" />
            <circle cx="60" cy="48" r="16" className="bd-cone" />
            <circle cx="60" cy="118" r="38" className="bd-cone" />
            <circle cx="60" cy="118" r="12" className="bd-gear" />
          </symbol>
          <symbol id="mu-lampshade" viewBox="0 0 100 120">
            <path d="M50 0V70" className="bd-rig" />
            <path d="M26 104L38 70H62L74 104Z" className="bd-gear" />
            <rect x="34" y="104" width="32" height="4" rx="2" className="bd-bulb" />
          </symbol>
        </defs>

        <rect width="1600" height="900" fill="url(#mu-wall)" />
        <rect width="1600" height="560" fill="url(#mu-diffuser)" className="bd-diffuser" />

        {/* Ventana a la sala de toma, con un micrófono en su pedestal */}
        <rect x="470" y="150" width="660" height="300" rx="10" className="bd-window" />
        <rect x="470" y="150" width="660" height="300" rx="10" fill="url(#mu-glass)" />
        <path d="M800 250V440M800 440L760 450M800 440L840 450M800 250L860 228" className="bd-stand" />
        <rect x="852" y="206" width="22" height="44" rx="11" className="bd-gear" transform="rotate(-20 863 228)" />
        <rect x="470" y="150" width="660" height="300" rx="10" className="bd-frame" />

        {/* Lámparas colgantes de luz cálida */}
        <ellipse cx="300" cy="200" rx="160" ry="120" fill="url(#mu-lamp)" filter="url(#mu-blur)" />
        <ellipse cx="1300" cy="200" rx="160" ry="120" fill="url(#mu-lamp)" filter="url(#mu-blur)" />
        <use href="#mu-lampshade" x="250" y="0" width="100" height="120" />
        <use href="#mu-lampshade" x="1250" y="0" width="100" height="120" />

        {/* Monitores de campo cercano sobre pedestales */}
        <use href="#mu-monitor" x="250" y="330" width="120" height="180" />
        <use href="#mu-monitor" x="1230" y="330" width="120" height="180" />
        <path d="M310 510V640M1290 510V640" className="bd-stand" />

        {/* Consola en perspectiva con su puente de vúmetros */}
        <ellipse cx="800" cy="640" rx="560" ry="80" fill="url(#mu-lamp)" filter="url(#mu-blur)" />
        <polygon points="120,900 1480,900 1360,620 240,620" fill="url(#mu-desk)" className="bd-desk" />
        <polygon points="190,780 1410,780 1350,640 250,640" fill="url(#mu-faders)" />
        <rect x="560" y="584" width="480" height="36" rx="4" className="bd-gear" />
        <path d="M590 610V598M610 610V594M630 610V600M650 610V590M670 610V596M930 610V592M950 610V598M970 610V590M990 610V596M1010 610V600" className="bd-vu" />
      </svg>
    </>
  );
}
