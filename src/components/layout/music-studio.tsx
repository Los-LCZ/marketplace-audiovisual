/**
 * Estudio urbano con LED violeta del mundo Música, dibujado en SVG: truss con cabezas móviles, marcos LED,
 * pantallas del DAW con clips y ondas, discos de platino, graffiti, monitores, consola, teclados en atriles y
 * alfombra de parches. El realismo sale de haces volumétricos con polvo y bruma, bloom en tres capas,
 * profundidad de campo en el muro del fondo, metales sombreados, reflejos en el concreto y grano.
 * El detalle repetitivo se genera con un aleatorio con semilla, así la escena sale igual en cada render.
 * Los colores salen de los tokens (clases `bd-*` en studio.css).
 */

function seeded(start: number) {
  let s = start;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const round = (n: number) => Math.round(n * 10) / 10;

const FRAMES = [
  "440,110 640,110 620,176 470,176",
  "690,104 910,104 898,182 702,182",
  "736,120 864,120 858,166 742,166",
  "960,110 1160,110 1130,176 980,176",
];
const HEADS = [305, 620, 980, 1295];
// Pie de cada haz en el piso: [derecha, izquierda]
const BEAM_FEET: Array<[number, number]> = [[540, 100], [780, 460], [1140, 820], [1500, 1060]];
const CLIP_TONES = ["neon", "acc", "ok", "hi", "rec"] as const;

function Dust({ rnd, x0, x1, count }: { rnd: () => number; x0: number; x1: number; count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const t = rnd();
        const half = 8 + 192 * t;
        return (
          <circle
            key={i}
            cx={round(x0 + (x1 - x0) * t + (rnd() - 0.5) * 2 * half)}
            cy={round(120 + 560 * t)}
            r={round(0.6 + rnd() * 1.5)}
            className="bd-dust"
            opacity={round(0.12 + rnd() * 0.45)}
          />
        );
      })}
    </>
  );
}

function Daw({ rnd, x, y, w, h }: { rnd: () => number; x: number; y: number; w: number; h: number }) {
  const lanes = 7;
  const lh = (h - 14) / lanes;
  const clips = [];
  for (let i = 0; i < lanes; i++) {
    const ly = y + 14 + i * lh;
    clips.push(<rect key={`l${i}`} x={x} y={round(ly)} width={w} height={round(lh - 1)} className={i % 2 ? "bd-lane alt" : "bd-lane"} />);
    let cx = x + 4 + rnd() * 20;
    while (cx < x + w - 20) {
      const cw = 20 + rnd() * 60;
      const tone = CLIP_TONES[Math.floor(rnd() * CLIP_TONES.length)];
      const ww = Math.min(cw, x + w - cx - 2);
      let d = `M${round(cx)} ${round(ly + lh / 2)}`;
      for (let k = 0; k <= ww; k += 3) d += `L${round(cx + k)} ${round(ly + lh / 2 + (rnd() - 0.5) * (lh - 8))}`;
      clips.push(
        <g key={`c${i}-${Math.round(cx)}`}>
          <rect x={round(cx)} y={round(ly + 2)} width={round(ww)} height={round(lh - 5)} rx="1.5" className={`bd-clip ${tone}`} />
          <path d={d} className="bd-wave" />
        </g>,
      );
      cx += cw + 6 + rnd() * 30;
    }
  }
  return (
    <>
      <rect x={x} y={y} width={w} height={h} className="bd-console" />
      <rect x={x} y={y} width={w} height="12" className="bd-lane bar" />
      {clips}
      <rect x={round(x + w * 0.42)} y={y} width="1.5" height={h} className="bd-playhead" />
    </>
  );
}

function Faders({ rnd, x, y, w, n }: { rnd: () => number; x: number; y: number; w: number; n: number }) {
  const step = w / n;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const fx = x + i * step + step / 2;
        const pos = 0.25 + rnd() * 0.5;
        const lvl = rnd();
        return (
          <g key={i}>
            <rect x={round(fx - 1)} y={y + 6} width="2" height="26" className="bd-ink" />
            <rect x={round(fx - 4)} y={round(y + 6 + pos * 20)} width="8" height="5" rx="1" fill="url(#mu-cap)" />
            <circle cx={round(fx)} cy={y + 2} r="1.6" className={lvl > 0.85 ? "bd-led rec" : lvl > 0.5 ? "bd-led acc" : "bd-led ok"} />
          </g>
        );
      })}
    </>
  );
}

function Keys({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const n = Math.floor(w / 11);
  const kw = w / n;
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <g key={i}>
          <rect x={round(x + i * kw)} y={y} width={round(kw - 1.2)} height={h} rx="1" fill="url(#mu-ivory)" />
          {[0, 1, 3, 4, 5].includes(i % 7) && (
            <rect x={round(x + i * kw + kw * 0.6)} y={y} width={round(kw * 0.65)} height={round(h * 0.6)} rx="1" className="bd-ink" />
          )}
        </g>
      ))}
    </>
  );
}

function Knobs({ rnd, x, y, cols, rows, gap }: { rnd: () => number; x: number; y: number; cols: number; rows: number; gap: number }) {
  const out = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const cx = x + i * gap;
      const cy = y + j * gap - i * 0.9;
      const a = rnd() * 6;
      out.push(
        <g key={`${i}-${j}`}>
          <circle cx={round(cx)} cy={round(cy)} r="5.5" fill="url(#mu-knob)" />
          <path d={`M${round(cx)} ${round(cy)}L${round(cx + Math.cos(a) * 4.5)} ${round(cy + Math.sin(a) * 4.5)}`} className="bd-pointer" />
        </g>,
      );
    }
  }
  return <>{out}</>;
}

function Head({ x, y, scale }: { x: number; y: number; scale: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-20" y="0" width="40" height="18" rx="4" fill="url(#mu-chrome)" className="bd-edge" />
      <path d="M-23 22V58M23 22V58M-23 22H23" stroke="url(#mu-chrome)" className="bd-yoke" />
      <rect x="-21" y="32" width="42" height="50" rx="13" fill="url(#mu-body)" className="bd-edge soft" />
      <circle cx="0" cy="70" r="14" fill="url(#mu-lens)" />
      <circle cx="-5" cy="65" r="3.5" className="bd-spec" />
    </g>
  );
}

function PlatinumRecord({ x, y, size }: { x: number; y: number; size: number }) {
  const c = size / 2;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={size} height={size} rx="3" fill="url(#mu-frame)" className="bd-edge" />
      <rect x="6" y="6" width={size - 12} height={size - 12} className="bd-console" />
      <circle cx={c} cy={c - 6} r={size * 0.32} fill="url(#mu-platinum)" />
      {[0.27, 0.22, 0.17].map((k) => (
        <circle key={k} cx={c} cy={c - 6} r={size * k} className="bd-groove" />
      ))}
      <circle cx={c} cy={c - 6} r={size * 0.09} className="bd-label" />
      <rect x={size * 0.22} y={size * 0.82} width={size * 0.56} height="5" rx="2" className="bd-plaque" />
      <polygon points={`6,6 ${size * 0.55},6 6,${size * 0.55}`} className="bd-glass" />
    </g>
  );
}

function Monitor({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="110" height="170" rx="10" fill="url(#mu-cab)" className="bd-edge strong" />
      <rect x="2" y="2" width="106" height="4" rx="2" className="bd-rimlight" />
      {[[46, 18], [114, 40]].map(([cy, rr]) => (
        <g key={cy}>
          <circle cx="55" cy={cy} r={rr + 4} className="bd-ink" />
          <circle cx="55" cy={cy} r={rr} fill="url(#mu-cone)" />
          <circle cx="55" cy={cy} r={rr * 0.72} className="bd-groove" />
          <circle cx="55" cy={cy} r={rr * 0.3} fill="url(#mu-cap)" />
          <ellipse cx={55 - rr * 0.35} cy={cy - rr * 0.4} rx={rr * 0.3} ry={rr * 0.15} className="bd-glass" />
        </g>
      ))}
      <circle cx="55" cy="160" r="2.5" className="bd-led ok" />
    </g>
  );
}

function Synths({ rnd, x, y, flip }: { rnd: () => number; x: number; y: number; flip?: boolean }) {
  return (
    <g transform={flip ? `translate(${x} ${y}) scale(-1 1)` : `translate(${x} ${y})`}>
      <ellipse cx="140" cy="352" rx="150" ry="14" fill="url(#mu-ao)" />
      <path d="M40 350L250 120M250 350L40 120" stroke="url(#mu-chrome)" className="bd-stand" />
      <polygon points="20,120 262,88 274,128 32,160" fill="url(#mu-body)" className="bd-edge" />
      <polygon points="20,120 262,88 263,92 21,124" className="bd-rimlight" />
      <g transform="skewY(-7.5) translate(0 6)">
        <Keys x={40} y={136} w={222} h={18} />
      </g>
      <polygon points="40,52 250,24 260,70 50,98" fill="url(#mu-body)" className="bd-edge" />
      <polygon points="40,52 250,24 251,28 41,56" className="bd-rimlight" />
      <g transform="skewY(-7.5)">
        <Knobs rnd={rnd} x={70} y={78} cols={10} rows={2} gap={18} />
        <rect x="190" y="40" width="44" height="14" className="bd-console" />
        <rect x="192" y="42" width="40" height="10" className="bd-display" />
      </g>
    </g>
  );
}

function Graffiti({ rnd, x, y, w, h, tones }: { rnd: () => number; x: number; y: number; w: number; h: number; tones: string[] }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx="3" className="bd-canvas" />
      {tones.map((tone, i) => {
        const yy = y + 50 + i * 52;
        const d = `M${x + 18} ${yy}C${x + w * 0.35} ${yy - 45} ${x + w * 0.55} ${yy + 40} ${x + w - 18} ${yy - 10}`;
        return (
          <g key={tone} className={`bd-graffiti ${tone}`}>
            <path d={d} className="spray" filter="url(#mu-b4)" />
            <path d={d} className="line" />
            <path d={d} className="shine" transform="translate(-2 -3)" />
            {[0, 1, 2].map((k) => (
              <path key={k} d={`M${round(x + 30 + rnd() * (w - 60))} ${yy + 4}v${round(10 + rnd() * 26)}`} className="drip" />
            ))}
          </g>
        );
      })}
    </>
  );
}

export function MusicStudio() {
  const rnd = seeded(21);
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMin slice" focusable="false">
      <defs>
        <radialGradient id="mu-wall" cx="0.5" cy="0.38" r="0.8">
          <stop offset="0" className="bd-stop-s2" />
          <stop offset="0.5" className="bd-stop-wall" />
          <stop offset="1" className="bd-stop-ink" />
        </radialGradient>
        <linearGradient id="mu-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="bd-stop-s3" />
          <stop offset="0.3" className="bd-stop-s1" />
          <stop offset="1" className="bd-stop-bg" />
        </linearGradient>
        <linearGradient id="mu-chrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="bd-stop-dim" />
          <stop offset="0.45" className="bd-stop-s1" />
          <stop offset="0.55" className="bd-stop-bg" />
          <stop offset="1" className="bd-stop-s3" />
        </linearGradient>
        <linearGradient id="mu-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="bd-stop-s3" />
          <stop offset="0.3" className="bd-stop-s1" />
          <stop offset="1" className="bd-stop-bg" />
        </linearGradient>
        <linearGradient id="mu-cab" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" className="bd-stop-s3" />
          <stop offset="0.2" className="bd-stop-s1" />
          <stop offset="0.8" className="bd-stop-bg" />
          <stop offset="1" className="bd-stop-s2" />
        </linearGradient>
        <linearGradient id="mu-frame" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="bd-stop-s3" />
          <stop offset="0.5" className="bd-stop-bg" />
          <stop offset="1" className="bd-stop-s2" />
        </linearGradient>
        <linearGradient id="mu-platinum" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="bd-stop-fg" />
          <stop offset="0.3" className="bd-stop-dim" />
          <stop offset="0.5" className="bd-stop-fg" />
          <stop offset="0.72" className="bd-stop-s3" />
          <stop offset="1" className="bd-stop-dim" />
        </linearGradient>
        <radialGradient id="mu-lens" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" className="bd-stop-fg" />
          <stop offset="0.35" className="bd-stop-hi" />
          <stop offset="0.7" className="bd-stop-neon" />
          <stop offset="1" className="bd-stop-s2" />
        </radialGradient>
        <radialGradient id="mu-cone" cx="0.45" cy="0.4" r="0.6">
          <stop offset="0" className="bd-stop-s3" />
          <stop offset="0.6" className="bd-stop-bg" />
          <stop offset="0.92" className="bd-stop-s2" />
          <stop offset="1" className="bd-stop-dim" />
        </radialGradient>
        <radialGradient id="mu-cap" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" className="bd-stop-fg" />
          <stop offset="0.6" className="bd-stop-dim" />
          <stop offset="1" className="bd-stop-s3" />
        </radialGradient>
        <radialGradient id="mu-knob" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" className="bd-stop-dim" />
          <stop offset="0.7" className="bd-stop-s1" />
          <stop offset="1" className="bd-stop-ink" />
        </radialGradient>
        <linearGradient id="mu-ivory" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="bd-stop-fg" />
          <stop offset="1" className="bd-stop-dim" />
        </linearGradient>
        <linearGradient id="mu-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="bd-stop-fg" stopOpacity="0.45" />
          <stop offset="0.2" className="bd-stop-neon" stopOpacity="0.3" />
          <stop offset="1" className="bd-stop-neon" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="mu-pool">
          <stop offset="0" className="bd-stop-neon" stopOpacity="0.55" />
          <stop offset="1" className="bd-stop-neon" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mu-pool-hot">
          <stop offset="0" className="bd-stop-fg" stopOpacity="0.8" />
          <stop offset="0.3" className="bd-stop-neon" stopOpacity="0.4" />
          <stop offset="1" className="bd-stop-neon" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mu-ao">
          <stop offset="0" className="bd-stop-ink" stopOpacity="0.75" />
          <stop offset="1" className="bd-stop-ink" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mu-vignette" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.5" className="bd-stop-ink" stopOpacity="0" />
          <stop offset="1" className="bd-stop-ink" stopOpacity="0.85" />
        </radialGradient>
        <linearGradient id="mu-refl-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="bd-stop-white" stopOpacity="0.9" />
          <stop offset="1" className="bd-stop-white" stopOpacity="0" />
        </linearGradient>
        <mask id="mu-refl-mask">
          <rect y="670" width="1600" height="230" fill="url(#mu-refl-fade)" />
        </mask>

        <pattern id="mu-truss" width="34" height="18" patternUnits="userSpaceOnUse">
          <path d="M0 0L17 18L34 0" className="bd-lattice" />
          <path d="M0 1L17 19" className="bd-lattice shine" />
        </pattern>
        <pattern id="mu-slats" width="52" height="10" patternUnits="userSpaceOnUse">
          <rect width="52" height="10" className="bd-slat" />
          <rect width="4" height="10" className="bd-slat-shade" />
          <rect x="4" width="2" height="10" className="bd-slat-light" />
        </pattern>
        <pattern id="mu-foam" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M0 0H28L14 14Z" className="bd-foam top" />
          <path d="M0 28H28L14 14Z" className="bd-foam bottom" />
          <path d="M0 0V28L14 14Z" className="bd-foam side" />
        </pattern>

        <filter id="mu-b2" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <filter id="mu-b4" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id="mu-b12" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <filter id="mu-b30" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="30" />
        </filter>
        <filter id="mu-dof" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="1.3" />
        </filter>
        {/* Ruido: solo canal alfa, coloreado con un token vía flood-color */}
        <filter id="mu-haze" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.0035 0.011" numOctaves="4" seed="7" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.8 0 0 0 -0.22" result="a" />
          <feFlood className="bd-flood-neon" />
          <feComposite in2="a" operator="in" />
        </filter>
        <filter id="mu-concrete" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.06" numOctaves="5" seed="3" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.3 0 0 0 -0.05" result="a" />
          <feFlood className="bd-flood-dim" />
          <feComposite in2="a" operator="in" />
        </filter>
        <filter id="mu-fabric" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="turbulence" baseFrequency="0.7 0.3" numOctaves="2" seed="11" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.55 0 0 0 0" result="a" />
          <feFlood className="bd-flood-ink" />
          <feComposite in2="a" operator="in" />
        </filter>
        <filter id="mu-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.18 0 0 0 0" result="a" />
          <feFlood className="bd-flood-fg" />
          <feComposite in2="a" operator="in" />
        </filter>
        <clipPath id="mu-floor-clip">
          <polygon points="0,800 250,670 1350,670 1600,800 1600,900 0,900" />
        </clipPath>
        <clipPath id="mu-rug-clip">
          <polygon points="300,800 1300,800 1370,890 230,890" />
        </clipPath>
      </defs>

      {/* Sala: muro de listones con la luz que cae de los LED y muros laterales de espuma, con profundidad de campo */}
      <rect width="1600" height="900" fill="url(#mu-wall)" />
      <g filter="url(#mu-dof)">
        <rect x="250" y="190" width="1100" height="480" fill="url(#mu-slats)" />
        <ellipse cx="800" cy="210" rx="520" ry="120" fill="url(#mu-pool)" opacity="0.7" />
        <polygon points="0,0 250,150 250,670 0,800" className="bd-sidewall" />
        <polygon points="1600,0 1350,150 1350,670 1600,800" className="bd-sidewall" />
        <polygon points="0,90 250,210 250,640 0,750" fill="url(#mu-foam)" opacity="0.7" />
        <polygon points="1600,90 1350,210 1350,640 1600,750" fill="url(#mu-foam)" opacity="0.7" />
        <g transform="skewY(18)">
          <Graffiti rnd={rnd} x={50} y={250} w={160} h={200} tones={["neon", "ok", "rec"]} />
        </g>
        <g transform="skewY(-18)">
          <Graffiti rnd={rnd} x={1390} y={770} w={160} h={200} tones={["ok", "rec", "neon"]} />
        </g>
        <PlatinumRecord x={310} y={290} size={124} />
        <PlatinumRecord x={1166} y={290} size={124} />
        <PlatinumRecord x={326} y={440} size={92} />
        <PlatinumRecord x={1182} y={440} size={92} />
      </g>

      {/* Piso de concreto pulido con textura y oclusión al pie del muro */}
      <polygon points="0,800 250,670 1350,670 1600,800 1600,900 0,900" fill="url(#mu-floor)" />
      <rect y="670" width="1600" height="230" filter="url(#mu-concrete)" clipPath="url(#mu-floor-clip)" opacity="0.6" />
      <ellipse cx="800" cy="676" rx="560" ry="14" fill="url(#mu-ao)" />

      {/* Haces de las cabezas móviles con polvo en suspensión y bruma */}
      <g filter="url(#mu-b12)">
        {HEADS.map((x, i) => (
          <polygon key={x} points={`${x - 9},104 ${x + 9},104 ${BEAM_FEET[i][0]},690 ${BEAM_FEET[i][1]},690`} fill="url(#mu-beam)" />
        ))}
      </g>
      {HEADS.map((x, i) => (
        <Dust key={x} rnd={rnd} x0={x} x1={(BEAM_FEET[i][0] + BEAM_FEET[i][1]) / 2} count={45} />
      ))}
      <rect width="1600" height="720" filter="url(#mu-haze)" opacity="0.55" />
      {BEAM_FEET.map(([a, b]) => (
        <ellipse key={a} cx={(a + b) / 2} cy="700" rx="200" ry="26" fill="url(#mu-pool)" opacity="0.7" />
      ))}

      {/* Pantallas del DAW: bisel, clips con ondas, reflejo del vidrio y luz sobre el muro */}
      <ellipse cx="800" cy="425" rx="360" ry="140" fill="url(#mu-pool)" filter="url(#mu-b30)" />
      {[536, 804].map((x) => (
        <g key={x}>
          <rect x={x} y="346" width="260" height="158" rx="6" className="bd-bezel" />
          <Daw rnd={rnd} x={x + 10} y={356} w={240} h={138} />
          <polygon points={`${x + 10},356 ${x + 130},356 ${x + 10},440`} className="bd-glass faint" />
          <rect x={x + 2} y="347" width="256" height="2" className="bd-rimlight" />
        </g>
      ))}

      {/* Truss metálico, cabezas móviles y marcos LED con bloom en tres capas */}
      <rect x="170" y="30" width="1260" height="18" fill="url(#mu-truss)" />
      <path d="M170 30H1430M170 48H1430" stroke="url(#mu-chrome)" className="bd-tube" />
      <rect x="360" y="226" width="880" height="16" fill="url(#mu-truss)" />
      <path d="M360 226H1240M360 242H1240" stroke="url(#mu-chrome)" className="bd-tube thin" />
      <ellipse cx="800" cy="140" rx="460" ry="80" fill="url(#mu-pool)" filter="url(#mu-b30)" opacity="0.8" />
      <g className="bd-ledframe wide" filter="url(#mu-b30)">
        {FRAMES.map((p) => <polygon key={p} points={p} />)}
      </g>
      <g className="bd-ledframe bloom" filter="url(#mu-b12)">
        {FRAMES.map((p) => <polygon key={p} points={p} />)}
      </g>
      <g className="bd-ledframe halo" filter="url(#mu-b2)">
        {FRAMES.map((p) => <polygon key={p} points={p} />)}
      </g>
      <g className="bd-ledframe core">
        {FRAMES.map((p) => <polygon key={p} points={p} />)}
      </g>
      {HEADS.map((x) => (
        <g key={x}>
          <circle cx={x} cy="92" r="40" fill="url(#mu-pool-hot)" filter="url(#mu-b12)" />
          <Head x={x} y={48} scale={0.7} />
        </g>
      ))}
      {[640, 960].map((x) => (
        <g key={x}>
          <circle cx={x} cy="292" r="30" fill="url(#mu-pool-hot)" filter="url(#mu-b12)" />
          <Head x={x} y={242} scale={0.62} />
        </g>
      ))}

      {/* Teclados y sintetizadores en atriles en X */}
      <Synths rnd={rnd} x={30} y={440} />
      <Synths rnd={rnd} x={1570} y={440} flip />

      {/* Monitores de estudio sobre pedestales */}
      <ellipse cx="455" cy="768" rx="70" ry="12" fill="url(#mu-ao)" />
      <ellipse cx="1145" cy="768" rx="70" ry="12" fill="url(#mu-ao)" />
      <path d="M455 560V762M425 764H485M1145 560V762M1115 764H1175" stroke="url(#mu-chrome)" className="bd-tube" />
      <Monitor x={400} y={400} />
      <Monitor x={1090} y={400} />

      {/* Escritorio: micrófonos en brazo, laptop, consola y tira LED */}
      <path d="M560 560Q600 480 690 506M1040 560Q1000 480 910 506" stroke="url(#mu-chrome)" className="bd-tube" />
      {[684, 876].map((x) => (
        <g key={x}>
          <rect x={x} y="490" width="42" height="22" rx="11" fill="url(#mu-cap)" />
          <path d={`M${x + 6} 494H${x + 36}M${x + 6} 501H${x + 36}M${x + 6} 508H${x + 36}`} className="bd-mesh" />
        </g>
      ))}
      <rect x="734" y="532" width="132" height="84" rx="5" className="bd-bezel" />
      <Daw rnd={rnd} x={742} y={540} w={116} h={66} />
      <path d="M724 616H876L884 624H716Z" fill="url(#mu-chrome)" />
      <ellipse cx="800" cy="668" rx="330" ry="16" fill="url(#mu-ao)" />
      <polygon points="520,612 1080,612 1112,664 488,664" fill="url(#mu-body)" className="bd-edge" />
      <polygon points="520,612 1080,612 1082,616 518,616" className="bd-rimlight strong" />
      {[556, 866].map((x) => (
        <g key={x}>
          <rect x={x} y="620" width="178" height="38" rx="3" className="bd-console framed" />
          <Faders rnd={rnd} x={x + 4} y={622} w={170} n={12} />
        </g>
      ))}
      <rect x="488" y="664" width="624" height="22" rx="11" className="bd-strip" filter="url(#mu-b12)" />
      <rect x="490" y="667" width="620" height="10" rx="5" className="bd-strip halo" filter="url(#mu-b2)" />
      <rect x="496" y="669" width="608" height="4" rx="2" className="bd-strip core" />
      <path d="M540 682L600 790M1060 682L1000 790" stroke="url(#mu-chrome)" className="bd-tube thick" />
      <path d="M600 790Q700 820 760 880M1000 790Q960 840 1010 900" className="bd-cable" />

      {/* Reflejo del LED, las pantallas y el escritorio en el concreto pulido, con caída */}
      <g mask="url(#mu-refl-mask)" clipPath="url(#mu-floor-clip)">
        <g transform="translate(0 1352) scale(1 -1)" filter="url(#mu-b12)" opacity="0.5">
          <rect x="490" y="667" width="620" height="10" rx="5" className="bd-strip halo" />
          <rect x="536" y="560" width="528" height="110" className="bd-reflect" />
          <polygon points="520,612 1080,612 1112,664 488,664" className="bd-ink shade" />
        </g>
        <ellipse cx="800" cy="720" rx="420" ry="60" fill="url(#mu-pool)" filter="url(#mu-b30)" />
      </g>

      {/* Alfombra de parches con textura de tela y borde en sombra */}
      <polygon points="300,800 1300,800 1370,890 230,890" className="bd-ink rug-shadow" filter="url(#mu-b4)" transform="translate(0 6)" />
      <g className="bd-rug">
        <polygon points="300,800 560,800 545,840 270,840" className="a" />
        <polygon points="560,800 800,800 795,840 545,840" className="b" />
        <polygon points="800,800 1050,800 1060,840 795,840" className="c" />
        <polygon points="1050,800 1300,800 1330,840 1060,840" className="b" />
        <polygon points="270,840 600,840 590,890 230,890" className="c" />
        <polygon points="600,840 900,840 905,890 590,890" className="a" />
        <polygon points="900,840 1330,840 1370,890 905,890" className="d" />
      </g>
      <rect x="230" y="800" width="1140" height="90" filter="url(#mu-fabric)" clipPath="url(#mu-rug-clip)" opacity="0.7" />
      <polygon points="300,800 1300,800 1370,890 230,890" fill="url(#mu-pool)" opacity="0.25" clipPath="url(#mu-rug-clip)" />

      {/* Cámara: viñeta, gradación violeta y grano */}
      <rect width="1600" height="900" fill="url(#mu-vignette)" />
      <rect width="1600" height="900" className="bd-grade" />
      <rect width="1600" height="900" filter="url(#mu-grain)" opacity="0.6" />
    </svg>
  );
}
