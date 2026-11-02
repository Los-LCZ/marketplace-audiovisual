/**
 * Set fotográfico del mundo Audiovisual, dibujado en SVG a partir de una foto de referencia (Alexander Dummer,
 * Unsplash): cortinas, parrilla con barras rotuladas y focos, octabox cenital encendido, ciclorama de papel,
 * paneles con puerta y espejo, softboxes de espalda, flashes, disco reflector, cinta en el piso, bolso y cables.
 * En los bordes (lo que queda a los costados del contenido en pantallas anchas) hay tubos LED, un fresnel en
 * C-stand, un strip softbox, cámaras de cine sobre trípode, apple boxes y un slider, con luz cian que enmarca
 * la interfaz.
 * El realismo sale del bloom de las luces, el haz con polvo, la profundidad de campo en el fondo, las sombras
 * de contacto, la textura del concreto, los metales sombreados, la viñeta y el grano. Los pliegues y el polvo
 * se generan con un aleatorio con semilla. Los colores salen de los tokens (clases `bd-*` en studio.css).
 */

function seeded(start: number) {
  let s = start;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const round = (n: number) => Math.round(n * 10) / 10;

function Curtain({ rnd, id, x0, x1, y1, folds, tone }: { rnd: () => number; id: string; x0: number; x1: number; y1: number; folds: number; tone: "light" | "dark" }) {
  const w = (x1 - x0) / folds;
  return (
    <>
      <clipPath id={id}>
        <rect x={x0} width={x1 - x0} height={y1} />
      </clipPath>
      <rect x={x0} width={x1 - x0} height={y1} className={`bd-curtain ${tone}`} />
      <g clipPath={`url(#${id})`}>
        {Array.from({ length: folds }, (_, i) => (
          <rect key={i} x={round(x0 + i * w)} width={round(w + 1)} height={y1} fill={`url(#av-fold-${tone})`} opacity={round(0.5 + rnd() * 0.5)} />
        ))}
      </g>
    </>
  );
}

function Tape({ x0, y0, x1, y1, segs }: { x0: number; y0: number; x1: number; y1: number; segs: number }) {
  return (
    <>
      {Array.from({ length: segs }, (_, i) => {
        const a = i / segs;
        const b = (i + 0.55) / segs;
        return (
          <line
            key={i}
            x1={round(x0 + (x1 - x0) * a)}
            y1={round(y0 + (y1 - y0) * a)}
            x2={round(x0 + (x1 - x0) * b)}
            y2={round(y0 + (y1 - y0) * b)}
            strokeWidth={round(3 + 5 * a)}
            className={i % 2 ? "bd-tape white" : "bd-tape red"}
          />
        );
      })}
    </>
  );
}

function Tripod({ x, top, base, spread }: { x: number; top: number; base: number; spread: number }) {
  return (
    <>
      <ellipse cx={x} cy={base + 6} rx={spread * 1.3} ry={spread * 0.18} fill="url(#av-ao)" />
      <path
        d={`M${x} ${top}V${base - 40}M${x} ${base - 40}L${x - spread} ${base}M${x} ${base - 40}L${x + spread * 0.9} ${base - 6}M${x} ${base - 40}L${x + 8} ${base + 14}`}
        stroke="url(#av-metal)"
        className="bd-leg"
      />
      <path d={`M${x - 2} ${top}V${base - 40}`} className="bd-leg-shine" />
    </>
  );
}

function Dust({ rnd, count }: { rnd: () => number; count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const a = rnd() * Math.PI * 2;
        const d = Math.sqrt(rnd());
        return (
          <circle
            key={i}
            cx={round(990 + Math.cos(a) * 260 * d)}
            cy={round(600 + Math.sin(a) * 170 * d)}
            r={round(0.6 + rnd() * 1.6)}
            className="bd-dust"
            opacity={round(0.15 + rnd() * 0.5)}
          />
        );
      })}
    </>
  );
}

function RigLabel({ x, y, w, nums }: { x: number; y: number; w: number; nums: number[] }) {
  return (
    <>
      <rect x={x} y={y} width={w} height="30" className="bd-rig-bar" />
      {nums.map((n, i) => (
        <g key={i}>
          <rect x={x + 22 + i * (w / nums.length)} y={y + 8} width="14" height="14" className="bd-rig-chip" />
          <text x={x + 44 + i * (w / nums.length)} y={y + 21} className="bd-rig-num">
            {n}
          </text>
        </g>
      ))}
    </>
  );
}

function Cable({ d, width = 3 }: { d: string; width?: number }) {
  return (
    <>
      <path d={d} strokeWidth={width} className="bd-wire" />
      <path d={d} className="bd-wire-shine" transform="translate(0 -1)" />
    </>
  );
}

// Equipos de los bordes: en pantallas anchas quedan a los costados de la columna de contenido y la enmarcan.
// [x, alto, pie] de los tubos LED verticales
const TUBES: Array<[number, number, number]> = [[60, 150, 690], [1866, 130, 660]];
// [x, alto del cabezal, piso, apertura, mirando a la derecha] de las cámaras de cine sobre trípode
const CAMERAS: Array<[number, number, number, number, boolean]> = [[178, 640, 1010, 88, true], [1690, 620, 1000, 84, false]];

// Trípode de cámara: tres patas abiertas desde el cabezal, separador a media altura y sombra de contacto
function CameraTripod({ x, top, base, spread }: { x: number; top: number; base: number; spread: number }) {
  const mid = top + (base - top) * 0.72;
  const at = (dx: number) => x + dx * 0.72;
  return (
    <>
      <ellipse cx={x} cy={base + 8} rx={spread * 1.35} ry={spread * 0.2} fill="url(#av-ao)" />
      <path d={`M${x} ${top}L${x - spread} ${base}M${x} ${top}L${x + spread} ${base - 4}M${x} ${top}L${x + 10} ${base + 16}`} stroke="url(#av-metal)" className="bd-leg thick" />
      <path d={`M${at(-spread)} ${mid}L${at(spread)} ${mid - 3}M${at(-spread)} ${mid}L${at(10)} ${mid + 12}M${at(spread)} ${mid - 3}L${at(10)} ${mid + 12}`} className="bd-spreader" />
      <path d={`M${x - 1} ${top}L${x - spread - 1} ${base}`} className="bd-leg-shine" />
    </>
  );
}

// Cámara de cine con cabezal fluido, matte box, monitor y tally; se dibuja mirando a la derecha y se espeja
function CinemaCamera({ x, y, right }: { x: number; y: number; right: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${right ? 1 : -1} 1)`}>
      <path d="M-10 -6L-96 -34" className="bd-pan-bar" />
      <rect x="-20" y="-16" width="40" height="18" rx="4" className="bd-housing" />
      <rect x="-48" y="-72" width="104" height="58" rx="6" fill="url(#av-cam)" className="bd-cam-body" />
      <rect x="-40" y="-88" width="70" height="12" rx="5" className="bd-housing" />
      <rect x="56" y="-62" width="34" height="38" rx="4" fill="url(#av-cam)" className="bd-cam-body" />
      <rect x="90" y="-58" width="22" height="30" rx="3" className="bd-lens-ring" />
      <path d="M112 -66L144 -82V-4L112 -20Z" className="bd-housing" />
      <ellipse cx="116" cy="-43" rx="7" ry="13" className="bd-lens-glass" />
      <ellipse cx="114" cy="-48" rx="2.5" ry="4" className="bd-spec" />
      <rect x="-80" y="-104" width="40" height="28" rx="3" className="bd-housing" />
      <rect x="-76" y="-100" width="32" height="20" className="bd-cam-screen" />
      <path d="M-44 -90L-40 -78" className="bd-pan-bar thin" />
      <circle cx="40" cy="-64" r="3.5" className="bd-tally" />
    </g>
  );
}

function EdgeGear() {
  return (
    <g className="bd-edge-gear">
      {/* Tubos LED sobre trípode */}
      {TUBES.map(([x, top, bottom]) => (
        <g key={x}>
          <Tripod x={x + 9} top={bottom} base={bottom + 320} spread={55} />
          <rect x={x - 3} y={top - 6} width="24" height={bottom - top + 12} rx="12" className="bd-housing" />
          <rect x={x + 1} y={bottom - 40} width="16" height="22" rx="3" className="bd-strobe" />
        </g>
      ))}

      {/* Fresnel en C-stand (izquierda), apuntando al centro del set */}
      <Tripod x={255} top={420} base={1020} spread={70} />
      <path d="M255 430L322 394" stroke="url(#av-metal)" className="bd-leg" />
      <g transform="rotate(28 330 372)">
        <rect x="292" y="346" width="76" height="54" rx="8" className="bd-housing" />
        <rect x="300" y="336" width="8" height="74" className="bd-flag" />
        <rect x="352" y="336" width="8" height="74" className="bd-flag" />
        <circle cx="368" cy="373" r="20" fill="url(#av-panel)" />
      </g>

      {/* Apple boxes y saco de arena al pie (izquierda) */}
      <ellipse cx="300" cy="1064" rx="90" ry="12" fill="url(#av-ao)" />
      <rect x="230" y="1014" width="140" height="48" rx="3" fill="url(#av-ply)" className="bd-box" />
      <rect x="250" y="974" width="110" height="40" rx="3" fill="url(#av-ply)" className="bd-box" />
      <rect x="286" y="1030" width="48" height="12" rx="6" className="bd-box-hole" />
      <rect x="286" y="987" width="38" height="11" rx="5.5" className="bd-box-hole" />
      <path d="M72 1006C80 992 120 992 130 1006L134 1024C116 1032 84 1032 68 1024Z" className="bd-sandbag" />

      {/* Cámaras de cine sobre trípode, una en cada borde, apuntando al centro del set */}
      {CAMERAS.map(([x, top, base, spread, right]) => (
        <g key={x}>
          <CameraTripod x={x} top={top} base={base} spread={spread} />
          <CinemaCamera x={x} y={top} right={right} />
        </g>
      ))}

      {/* Strip softbox (derecha) */}
      <Tripod x={1745} top={670} base={1015} spread={70} />
      <g transform="rotate(-8 1742 460)">
        <rect x="1698" y="246" width="90" height="430" rx="6" className="bd-housing" />
        <rect x="1706" y="256" width="74" height="410" fill="url(#av-panel)" />
        <path d="M1730 256V666M1756 256V666" className="bd-grid" />
      </g>

      {/* Slider con cámara en el piso (derecha) */}
      <path d="M1600 1046L1920 996M1600 1062L1920 1012" stroke="url(#av-metal)" className="bd-leg" />
      <rect x="1690" y="994" width="70" height="20" rx="4" className="bd-housing" transform="rotate(-9 1725 1004)" />
      <rect x="1700" y="950" width="64" height="40" rx="6" className="bd-bag" transform="rotate(-9 1732 970)" />
      <circle cx="1690" cy="972" r="16" className="bd-housing" />
      <circle cx="1690" cy="972" r="8" className="bd-lens-glass" />
    </g>
  );
}

// Emisión de los equipos de borde: va sobre la viñeta para que no la apague
function EdgeGlow() {
  return (
    <g>
      {TUBES.map(([x, top, bottom]) => (
        <g key={x}>
          <rect x={x - 30} y={top - 30} width="78" height={bottom - top + 60} rx="39" className="bd-tube-bloom wide" filter="url(#av-b40)" />
          <rect x={x - 6} y={top - 8} width="30" height={bottom - top + 16} rx="15" className="bd-tube-bloom" filter="url(#av-b8)" />
          <rect x={x + 2} y={top} width="14" height={bottom - top} rx="7" className="bd-tube-core" />
          <ellipse cx={x + 9} cy="1030" rx="140" ry="22" className="bd-tube-bloom floor" filter="url(#av-b24)" />
        </g>
      ))}
      <g transform="rotate(-8 1742 460)">
        <rect x="1680" y="230" width="126" height="460" rx="30" className="bd-tube-bloom wide" filter="url(#av-b40)" />
      </g>
      <circle cx="342" cy="420" r="46" className="bd-tube-bloom" filter="url(#av-b24)" />
      {/* Brillo de los monitores y el tally de las cámaras */}
      {CAMERAS.map(([x, top, , , right]) => (
        <g key={x}>
          <rect x={right ? x - 80 : x + 40} y={top - 104} width="40" height="28" className="bd-tube-bloom" filter="url(#av-b8)" />
          <circle cx={right ? x + 40 : x - 40} cy={top - 64} r="10" className="bd-tally-bloom" filter="url(#av-b8)" />
        </g>
      ))}
      <circle cx="120" cy="104" r="40" className="bd-tube-bloom" filter="url(#av-b24)" />
      <circle cx="1800" cy="104" r="40" className="bd-tube-bloom" filter="url(#av-b24)" />
    </g>
  );
}

// [x, y, ancho, alto, giro] de los paneles LED del techo
const PANELS: Array<[number, number, number, number, number]> = [[700, 70, 52, 70, -18], [830, 88, 50, 66, -12], [1025, 78, 44, 72, 14], [1200, 82, 58, 60, 20]];
// [x, y, ancho, alto, tipo] de los focos colgados: aletas de aluminio o fresnel encendido
const SPOTS: Array<[number, number, number, number, "foil" | "fresnel"]> = [
  [575, 230, 70, 46, "foil"], [735, 245, 70, 50, "fresnel"], [1130, 285, 40, 40, "fresnel"],
  [1205, 290, 100, 46, "foil"], [1335, 295, 86, 46, "foil"], [1400, 130, 70, 70, "foil"],
];

export function VideoSet() {
  const rnd = seeded(7);
  return (
    <svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" focusable="false">
      <defs>
        <linearGradient id="av-fold-dark" x1="0" x2="1">
          <stop offset="0" className="bd-stop-ink" stopOpacity="0.7" />
          <stop offset="0.45" className="bd-stop-s3" stopOpacity="0.9" />
          <stop offset="0.6" className="bd-stop-navy-hi" stopOpacity="0.6" />
          <stop offset="1" className="bd-stop-ink" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="av-fold-light" x1="0" x2="1">
          <stop offset="0" className="bd-stop-dim-lo" />
          <stop offset="0.4" className="bd-stop-paper" />
          <stop offset="0.55" className="bd-stop-fg" />
          <stop offset="1" className="bd-stop-dim-lo" />
        </linearGradient>
        <linearGradient id="av-room" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="bd-stop-ink" />
          <stop offset="0.55" className="bd-stop-navy" />
          <stop offset="1" className="bd-stop-ink" />
        </linearGradient>
        <linearGradient id="av-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="bd-stop-dim-lo" />
          <stop offset="0.35" className="bd-stop-dim" />
          <stop offset="1" className="bd-stop-dim-hi" />
        </linearGradient>
        <radialGradient id="av-floor-fall" cx="0.5" cy="0.25" r="0.8">
          <stop offset="0" className="bd-stop-white" stopOpacity="0.35" />
          <stop offset="0.5" className="bd-stop-white" stopOpacity="0" />
          <stop offset="1" className="bd-stop-ink" stopOpacity="0.55" />
        </radialGradient>
        <linearGradient id="av-paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="bd-stop-paper" />
          <stop offset="0.35" className="bd-stop-white" />
          <stop offset="0.8" className="bd-stop-fg" />
          <stop offset="1" className="bd-stop-paper" />
        </linearGradient>
        <radialGradient id="av-paper-hot" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" className="bd-stop-white" />
          <stop offset="1" className="bd-stop-white" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="av-flat" x1="0" x2="1">
          <stop offset="0" className="bd-stop-paper" />
          <stop offset="1" className="bd-stop-fg" />
        </linearGradient>
        <linearGradient id="av-ply" x1="0" x2="1">
          <stop offset="0" className="bd-stop-wood-lo" />
          <stop offset="0.5" className="bd-stop-wood" />
          <stop offset="1" className="bd-stop-wood-hi" />
        </linearGradient>
        <linearGradient id="av-metal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" className="bd-stop-s2" />
          <stop offset="0.4" className="bd-stop-dim" />
          <stop offset="0.6" className="bd-stop-s3" />
          <stop offset="1" className="bd-stop-bg" />
        </linearGradient>
        <linearGradient id="av-pipe" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="bd-stop-dim-lo" />
          <stop offset="0.5" className="bd-stop-s2" />
          <stop offset="1" className="bd-stop-s3" />
        </linearGradient>
        <linearGradient id="av-foil" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="bd-stop-fg" />
          <stop offset="0.35" className="bd-stop-dim" />
          <stop offset="0.55" className="bd-stop-paper" />
          <stop offset="1" className="bd-stop-dim-lo" />
        </linearGradient>
        <linearGradient id="av-panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="bd-stop-white" />
          <stop offset="1" className="bd-stop-paper" />
        </linearGradient>
        <radialGradient id="av-octa" cx="0.45" cy="0.45" r="0.6">
          <stop offset="0" className="bd-stop-white" />
          <stop offset="0.75" className="bd-stop-fg" />
          <stop offset="1" className="bd-stop-paper" />
        </radialGradient>
        <linearGradient id="av-octa-back" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="bd-stop-s3" />
          <stop offset="0.5" className="bd-stop-ink" />
          <stop offset="1" className="bd-stop-s2" />
        </linearGradient>
        <radialGradient id="av-ao">
          <stop offset="0" className="bd-stop-ink" stopOpacity="0.65" />
          <stop offset="1" className="bd-stop-ink" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="av-bloom">
          <stop offset="0" className="bd-stop-glow" stopOpacity="0.9" />
          <stop offset="0.35" className="bd-stop-glow" stopOpacity="0.35" />
          <stop offset="1" className="bd-stop-glow" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="av-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="bd-stop-glow" stopOpacity="0.22" />
          <stop offset="1" className="bd-stop-glow" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="av-vignette" cx="0.5" cy="0.48" r="0.72">
          <stop offset="0.5" className="bd-stop-ink" stopOpacity="0" />
          <stop offset="1" className="bd-stop-ink" stopOpacity="0.85" />
        </radialGradient>
        <radialGradient id="av-disc" cx="0.4" cy="0.4" r="0.7">
          <stop offset="0" className="bd-stop-brass-hi" />
          <stop offset="0.6" className="bd-stop-brass" />
          <stop offset="1" className="bd-stop-brass-lo" />
        </radialGradient>
        <filter id="av-b8" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id="av-b24" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="24" />
        </filter>
        <filter id="av-b40" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="40" />
        </filter>
        <linearGradient id="av-cam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="bd-stop-s3" />
          <stop offset="0.35" className="bd-stop-s2" />
          <stop offset="1" className="bd-stop-ink" />
        </linearGradient>
        <linearGradient id="av-edge-l" x1="0" x2="1">
          <stop offset="0" className="bd-stop-acc" stopOpacity="0.22" />
          <stop offset="1" className="bd-stop-acc" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="av-edge-r" x1="1" x2="0">
          <stop offset="0" className="bd-stop-acc" stopOpacity="0.22" />
          <stop offset="1" className="bd-stop-acc" stopOpacity="0" />
        </linearGradient>
        <filter id="av-dof" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
        {/* Ruido: solo canal alfa, coloreado con un token vía flood-color */}
        <filter id="av-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.16 0 0 0 0" result="a" />
          <feFlood className="bd-flood-fg" />
          <feComposite in2="a" operator="in" />
        </filter>
        <filter id="av-concrete" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.045" numOctaves="5" seed="4" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.45 0 0 0 -0.1" result="a" />
          <feFlood className="bd-flood-ink" />
          <feComposite in2="a" operator="in" />
        </filter>
        <filter id="av-scuff" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="turbulence" baseFrequency="0.02 0.006" numOctaves="3" seed="9" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.22 0 0 0 -0.08" result="a" />
          <feFlood className="bd-flood-white" />
          <feComposite in2="a" operator="in" />
        </filter>
        <clipPath id="av-floor-clip">
          <polygon points="0,830 340,830 690,780 1290,780 1580,840 1920,840 1920,1080 0,1080" />
        </clipPath>
      </defs>

      {/* Sala oscura y cortinas: la de la izquierda translúcida, las del fondo azul noche */}
      <rect width="1920" height="1080" fill="url(#av-room)" />
      <g filter="url(#av-dof)">
        <Curtain rnd={rnd} id="av-curtain-a" x0={0} x1={168} y1={1000} folds={9} tone="light" />
        <Curtain rnd={rnd} id="av-curtain-b" x0={168} x1={345} y1={900} folds={8} tone="dark" />
        <Curtain rnd={rnd} id="av-curtain-c" x0={1575} x1={1920} y1={920} folds={14} tone="dark" />
      </g>
      <rect width="168" height="1000" fill="url(#av-vignette)" opacity="0.4" />

      {/* Bordes: luz cian que entra por los costados y haces de los focos del truss exterior */}
      <rect width="260" height="1080" fill="url(#av-edge-l)" />
      <rect x="1660" width="260" height="1080" fill="url(#av-edge-r)" />
      <polygon points="108,110 132,110 300,960 -60,960" fill="url(#av-beam)" filter="url(#av-b24)" />
      <polygon points="1788,110 1812,110 1980,960 1620,960" fill="url(#av-beam)" filter="url(#av-b24)" />
      <polygon points="350,400 380,430 820,980 560,1000" fill="url(#av-beam)" filter="url(#av-b24)" opacity="0.7" />

      {/* Parrilla del techo: rieles, barras rotuladas, paneles LED y focos */}
      <g filter="url(#av-dof)">
        {/* Truss exterior a todo el ancho, con un foco en cada extremo */}
        <path d="M0 40H1920M0 58H1920" stroke="url(#av-pipe)" className="bd-pipe thin" />
        {[120, 1800].map((x) => (
          <g key={x}>
            <path d={`M${x} 58V72`} className="bd-hanger" />
            <rect x={x - 26} y="72" width="52" height="34" rx="6" className="bd-housing" />
            <ellipse cx={x} cy="106" rx="16" ry="5" className="bd-lamp" />
          </g>
        ))}
        <path d="M330 214C600 196 1100 196 1480 214" stroke="url(#av-pipe)" className="bd-pipe thick" />
        <path d="M330 230H1470" stroke="url(#av-pipe)" className="bd-pipe" />
        <path d="M400 150C620 128 1000 120 1470 150" stroke="url(#av-pipe)" className="bd-pipe thin" />
        <RigLabel x={535} y={150} w={305} nums={[27, 26, 26, 25]} />
        <RigLabel x={1060} y={180} w={320} nums={[24, 23, 22, 21]} />
        <text x="800" y="140" className="bd-rig-num big">10</text>
        <text x="1160" y="166" className="bd-rig-num big">11</text>
        {PANELS.map(([x, y, w, h, a]) => (
          <g key={x}>
            <path d={`M${x + w / 2} 0V${y}`} className="bd-hanger" />
            <g transform={`rotate(${a} ${x + w / 2} ${y + h / 2})`}>
              <rect x={x} y={y} width={w} height={h} rx="3" className="bd-housing" />
              <rect x={x + 5} y={y + 5} width={w - 10} height={h - 10} fill="url(#av-panel)" />
            </g>
          </g>
        ))}
        {SPOTS.map(([x, y, w, h, kind]) =>
          kind === "foil" ? (
            <g key={x}>
              <polygon points={`${x},${y + h} ${x + w * 0.2},${y} ${x + w * 0.8},${y} ${x + w},${y + h}`} fill="url(#av-foil)" className="bd-foil" />
              <rect x={x + w * 0.3} y={y - 22} width={w * 0.4} height="24" rx="4" className="bd-housing" />
            </g>
          ) : (
            <g key={x}>
              <rect x={x} y={y} width={w} height={h} rx="5" className="bd-housing" />
              <circle cx={x + w / 2} cy={y + h} r={w * 0.22} className="bd-lamp" />
              <circle cx={x + w / 2} cy={y + h} r={w * 0.5} className="bd-lamp glow" filter="url(#av-b8)" />
            </g>
          ),
        )}
      </g>
      {[[725, 105], [855, 121], [1047, 114], [1229, 112]].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="70" fill="url(#av-bloom)" opacity="0.35" />
      ))}

      {/* Octabox cenital encendido, con su haz y polvo en suspensión */}
      <polygon points="905,410 1065,410 1290,780 690,780" fill="url(#av-beam)" filter="url(#av-b24)" />
      <circle cx="985" cy="355" r="260" fill="url(#av-bloom)" opacity="0.55" filter="url(#av-b24)" />
      <polygon points="905,296 1002,286 1082,308 1104,360 1072,412 962,428 890,402 868,350" className="bd-octa-rim" />
      <polygon points="912,304 1000,295 1074,315 1094,360 1065,404 964,418 897,395 878,350" fill="url(#av-octa)" />
      <circle cx="985" cy="355" r="150" className="bd-lamp hot" filter="url(#av-b24)" />
      <path d="M985 286V230" stroke="url(#av-pipe)" className="bd-pipe" />
      <Dust rnd={rnd} count={70} />

      {/* Paneles laterales: el blanco con puerta y el de terciado con espejo */}
      <polygon points="340,440 690,456 690,835 340,836" fill="url(#av-flat)" />
      <polygon points="528,520 690,520 690,812 528,810" fill="url(#av-ply)" opacity="0.85" />
      <rect x="540" y="532" width="150" height="270" className="bd-door" />
      <circle cx="562" cy="670" r="5" className="bd-knob" />
      <polygon points="1290,452 1576,432 1576,862 1290,800" fill="url(#av-ply)" />
      <rect x="1408" y="494" width="124" height="222" className="bd-mirror-frame" />
      <rect x="1420" y="508" width="100" height="196" className="bd-mirror" />
      <polygon points="1420,508 1470,508 1420,600" className="bd-glass" />
      <path d="M1570 432V862" className="bd-flat-edge" />

      {/* Ciclorama de papel: muro, curva y faldón sobre el piso */}
      <path d="M690 456H1290V770C1290 800 1320 830 1380 940H560C640 850 690 810 690 770Z" fill="url(#av-paper)" />
      <ellipse cx="990" cy="640" rx="330" ry="260" fill="url(#av-paper-hot)" opacity="0.75" />
      <path d="M690 456H1290" className="bd-paper-edge" />
      <path d="M690 770C690 810 640 850 560 940" className="bd-paper-edge soft" />

      {/* Piso de concreto: degradado, textura, rayones, caída de luz y cinta */}
      <g clipPath="url(#av-floor-clip)">
        <rect y="780" width="1920" height="300" fill="url(#av-floor)" />
        <rect y="780" width="1920" height="300" filter="url(#av-concrete)" />
        <rect y="780" width="1920" height="300" filter="url(#av-scuff)" />
        <path d="M560 940H1380L1420 1080H500Z" className="bd-paper-spill" />
        <ellipse cx="980" cy="960" rx="520" ry="110" className="bd-lamp pool" filter="url(#av-b24)" />
        <rect y="780" width="1920" height="300" fill="url(#av-floor-fall)" />
        <Tape x0={80} y0={1080} x1={560} y1={840} segs={26} />
        <Tape x0={1450} y0={880} x1={1860} y1={1080} segs={22} />
        <Tape x0={840} y0={1080} x1={905} y1={950} segs={8} />
        <Tape x0={1150} y0={1080} x1={1100} y1={960} segs={8} />
      </g>
      <ellipse cx="960" cy="808" rx="980" ry="26" fill="url(#av-ao)" opacity="0.7" />

      {/* Disco reflector dorado en el piso */}
      <ellipse cx="690" cy="880" rx="102" ry="24" fill="url(#av-ao)" />
      <ellipse cx="690" cy="872" rx="98" ry="22" fill="url(#av-disc)" className="bd-disc" />

      {/* Octabox negro de espalda (izquierda) con su flash */}
      <Tripod x={625} top={640} base={935} spread={92} />
      <g transform="rotate(-20 735 650)">
        <polygon points="690,505 785,505 840,560 845,690 790,790 690,800 640,700 640,565" fill="url(#av-octa-back)" className="bd-softbox-back" />
        <path d="M740 505L742 800M640 640L845 625M690 505L790 790M785 505L690 800" className="bd-seam" />
      </g>
      <rect x="590" y="608" width="66" height="36" rx="8" className="bd-strobe" />
      <rect x="596" y="612" width="54" height="6" rx="3" className="bd-strobe-shine" />
      <Cable d="M610 660C560 720 600 800 540 880S330 950 260 990" />

      {/* Paraguas octogonal negro (derecha), flash encendido y pies pequeños */}
      <Tripod x={1215} top={600} base={912} spread={85} />
      <polygon points="1112,500 1200,442 1300,452 1340,520 1330,600 1250,612 1150,600 1110,560" fill="url(#av-octa-back)" className="bd-softbox-back" />
      <path d="M1225 442L1230 612M1112 500L1330 600M1340 520L1150 600" className="bd-seam" />
      <circle cx="1318" cy="610" r="34" className="bd-lamp flash" />
      <circle cx="1318" cy="610" r="110" fill="url(#av-bloom)" filter="url(#av-b8)" />
      <Tripod x={1385} top={600} base={905} spread={70} />
      <path d="M1345 578L1425 572L1432 612L1350 610Z" className="bd-strobe light" />
      <rect x="1300" y="580" width="46" height="40" rx="6" className="bd-strobe lighter" />
      <Tripod x={1290} top={640} base={915} spread={60} />
      <Cable d="M1440 640C1460 760 1500 850 1560 930S1520 1040 1600 1060" />
      <Cable d="M1560 960C1520 990 1530 1030 1580 1040S1640 1000 1600 980" width={2.5} />

      {/* Bolso de cámara, bowls reflectores y bolsa en el piso */}
      <ellipse cx="1115" cy="1062" rx="110" ry="18" fill="url(#av-ao)" />
      <path d="M1045 900C1040 880 1060 868 1090 870L1170 878C1195 882 1205 900 1195 930L1190 1052C1150 1066 1080 1066 1042 1052Z" className="bd-bag" />
      <path d="M1060 880C1080 870 1150 874 1182 890L1172 905C1140 893 1085 890 1060 900Z" className="bd-bag-lining" />
      <path d="M1050 960H1192" className="bd-bag-seam" />
      {[[1229, 948, 990], [1270, 962, 1000]].map(([cx, cy, bottom]) => (
        <g key={cx}>
          <ellipse cx={cx} cy={cy} rx="24" ry="9" className="bd-bowl-rim" />
          <path d={`M${cx - 24} ${cy}L${cx - 15} ${bottom}H${cx + 15}L${cx + 24} ${cy}`} className="bd-bowl" />
        </g>
      ))}
      <path d="M1272 1020L1380 1000L1386 1024L1300 1040Z" className="bd-ink" />

      <EdgeGear />

      {/* Cámara: viñeta y grano; la emisión de los bordes va encima de la viñeta */}
      <rect width="1920" height="1080" fill="url(#av-vignette)" />
      <EdgeGlow />
      <rect width="1920" height="1080" filter="url(#av-grain)" opacity="0.7" />
    </svg>
  );
}
