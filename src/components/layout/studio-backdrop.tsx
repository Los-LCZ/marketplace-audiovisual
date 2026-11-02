import Image from "next/image";
// Foto de Alexander Dummer (unsplash.com/photos/aS4Duj2j7r4), Licencia de Unsplash: uso comercial libre.
import avSet from "@/assets/senal/av-set.webp";

/**
 * Fondo de cada mundo, fijo detrás del contenido. Audiovisual usa una foto real de un set
 * con un velo azul medianoche encima. Música es un estudio urbano con LED violeta dibujado en SVG:
 * truss con cabezas móviles, marcos LED, pantallas del DAW, discos de platino, graffiti, monitores,
 * consola, teclados y alfombra de parches, con haces volumétricos, bloom, reflejos y texturas.
 * Se renderizan los dos y el CSS muestra el del mundo activo, así el interruptor de mundos no
 * recarga; la foto es lazy y no se descarga mientras su capa está oculta. Los colores del SVG
 * salen de los tokens (clases `bd-*` en studio.css).
 */
export function StudioBackdrop() {
  return (
    <>
      <div className="backdrop backdrop-av" aria-hidden="true">
        <Image src={avSet} alt="" fill sizes="100vw" placeholder="blur" className="backdrop-photo" />
      </div>

      <div className="backdrop backdrop-mu" aria-hidden="true">
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMin slice" focusable="false">
          <defs>
            {/* Degradados: muro, piso, metal y luz */}
            <radialGradient id="mu-wall" cx="0.5" cy="0.35" r="0.8">
              <stop offset="0" className="bd-stop-s2" />
              <stop offset="0.5" className="bd-stop-wall" />
              <stop offset="1" className="bd-stop-bg" />
            </radialGradient>
            <linearGradient id="mu-floor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className="bd-stop-s3" />
              <stop offset="0.35" className="bd-stop-s1" />
              <stop offset="1" className="bd-stop-bg" />
            </linearGradient>
            <linearGradient id="mu-metal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className="bd-stop-dim" />
              <stop offset="0.5" className="bd-stop-bg" />
              <stop offset="1" className="bd-stop-s3" />
            </linearGradient>
            <linearGradient id="mu-cab" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" className="bd-stop-s3" />
              <stop offset="0.25" className="bd-stop-s1" />
              <stop offset="1" className="bd-stop-bg" />
            </linearGradient>
            <linearGradient id="mu-beam" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className="bd-stop-fg" stopOpacity="0.34" />
              <stop offset="0.25" className="bd-stop-acc" stopOpacity="0.26" />
              <stop offset="1" className="bd-stop-acc" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="mu-glass" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" className="bd-stop-fg" stopOpacity="0.22" />
              <stop offset="0.4" className="bd-stop-fg" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="mu-lens" cx="0.4" cy="0.35" r="0.7">
              <stop offset="0" className="bd-stop-fg" />
              <stop offset="0.45" className="bd-stop-acc" />
              <stop offset="1" className="bd-stop-s2" />
            </radialGradient>
            <radialGradient id="mu-disc" cx="0.4" cy="0.35" r="0.75">
              <stop offset="0" className="bd-stop-dim" />
              <stop offset="0.55" className="bd-stop-dim" />
              <stop offset="1" className="bd-stop-s3" />
            </radialGradient>
            <radialGradient id="mu-woofer" cx="0.5" cy="0.45" r="0.6">
              <stop offset="0" className="bd-stop-s3" />
              <stop offset="0.7" className="bd-stop-bg" />
              <stop offset="1" className="bd-stop-dim" />
            </radialGradient>
            <radialGradient id="mu-spill">
              <stop offset="0" className="bd-stop-acc" stopOpacity="0.5" />
              <stop offset="1" className="bd-stop-acc" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="mu-shadow">
              <stop offset="0" className="bd-stop-bg" stopOpacity="0.9" />
              <stop offset="1" className="bd-stop-bg" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="mu-vignette" cx="0.5" cy="0.45" r="0.75">
              <stop offset="0.55" className="bd-stop-bg" stopOpacity="0" />
              <stop offset="1" className="bd-stop-bg" stopOpacity="0.85" />
            </radialGradient>
  
            {/* Texturas */}
            <pattern id="mu-truss" width="34" height="18" patternUnits="userSpaceOnUse">
              <path d="M0 0L17 18L34 0" className="bd-lattice" />
            </pattern>
            <pattern id="mu-slats" width="52" height="10" patternUnits="userSpaceOnUse">
              <path d="M0 0V10" className="bd-slat-shade" />
              <path d="M3 0V10" className="bd-slat-light" />
            </pattern>
            <pattern id="mu-foam" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M0 0H28L14 14Z" className="bd-foam-light" />
              <path d="M0 28H28L14 14Z" className="bd-foam-dark" />
            </pattern>
            <pattern id="mu-daw" width="16" height="120" patternUnits="userSpaceOnUse">
              <rect x="2" y="30" width="11" height="80" className="bd-bars" />
              <rect x="2" y="12" width="11" height="12" className="bd-bars dim" />
            </pattern>
            <pattern id="mu-keys" width="12" height="40" patternUnits="userSpaceOnUse">
              <rect x="1" width="10" height="40" className="bd-keys" />
              <rect x="8" width="6" height="24" className="bd-keys-black" />
            </pattern>
            <pattern id="mu-faders" width="14" height="34" patternUnits="userSpaceOnUse">
              <rect x="6" y="4" width="2" height="26" className="bd-track" />
              <rect x="3" y="14" width="8" height="5" rx="1" className="bd-cap" />
              <circle cx="7" cy="1.5" r="1.3" className="bd-led-ok" />
            </pattern>
            <pattern id="mu-knobs" width="18" height="18" patternUnits="userSpaceOnUse">
              <circle cx="9" cy="9" r="5" className="bd-knob" />
            </pattern>
  
            {/* Filtros: desenfoques para bloom y difusión; ruido coloreado con tokens (flood-color) */}
            <filter id="mu-b3" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
            <filter id="mu-b12" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="12" />
            </filter>
            <filter id="mu-b30" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="30" />
            </filter>
            <filter id="mu-haze" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.0035 0.011" numOctaves="3" seed="7" />
              <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.75 0 0 0 -0.2" result="a" />
              <feFlood className="bd-flood-acc" />
              <feComposite in2="a" operator="in" />
            </filter>
            <filter id="mu-concrete" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.012 0.06" numOctaves="4" seed="3" />
              <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.35 0 0 0 -0.05" result="a" />
              <feFlood className="bd-flood-fg" />
              <feComposite in2="a" operator="in" />
            </filter>
            <filter id="mu-grain" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
              <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.22 0 0 0 0" result="a" />
              <feFlood className="bd-flood-fg" />
              <feComposite in2="a" operator="in" />
            </filter>
            <filter id="mu-fabric" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="turbulence" baseFrequency="0.6 0.25" numOctaves="2" seed="11" />
              <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.5 0 0 0 0" result="a" />
              <feFlood className="bd-flood-bg" />
              <feComposite in2="a" operator="in" />
            </filter>
  
            <clipPath id="mu-floor-clip">
              <polygon points="0,800 250,670 1350,670 1600,800 1600,900 0,900" />
            </clipPath>
            <clipPath id="mu-rug-clip">
              <polygon points="300,800 1300,800 1370,890 230,890" />
            </clipPath>
  
            {/* Piezas reutilizables */}
            <symbol id="mu-head" viewBox="0 0 60 92">
              <rect x="10" y="0" width="40" height="20" rx="4" fill="url(#mu-metal)" className="bd-edge" />
              <path d="M8 26V62M52 26V62M8 26H52" className="bd-yoke" />
              <rect x="9" y="34" width="42" height="50" rx="12" fill="url(#mu-cab)" className="bd-edge" />
              <circle cx="30" cy="72" r="14" fill="url(#mu-lens)" />
              <circle cx="25" cy="67" r="4" className="bd-spec" />
            </symbol>
            <symbol id="mu-record" viewBox="0 0 120 120">
              <rect x="2" y="2" width="116" height="116" rx="3" fill="url(#mu-cab)" className="bd-edge" />
              <rect x="8" y="8" width="104" height="104" className="bd-mat" />
              <circle cx="60" cy="54" r="38" fill="url(#mu-disc)" />
              <circle cx="60" cy="54" r="30" className="bd-grooves" />
              <circle cx="60" cy="54" r="21" className="bd-grooves" />
              <circle cx="60" cy="54" r="10" className="bd-label" />
              <rect x="26" y="98" width="68" height="6" rx="2" className="bd-plaque" />
              <rect x="8" y="8" width="104" height="104" fill="url(#mu-glass)" />
            </symbol>
            <symbol id="mu-monitor" viewBox="0 0 110 170">
              <rect x="2" y="2" width="106" height="166" rx="10" fill="url(#mu-cab)" className="bd-edge" />
              <circle cx="55" cy="46" r="17" fill="url(#mu-woofer)" className="bd-edge" />
              <circle cx="55" cy="46" r="5" className="bd-spec dim" />
              <circle cx="55" cy="114" r="38" fill="url(#mu-woofer)" className="bd-edge" />
              <circle cx="55" cy="114" r="13" className="bd-dustcap" />
              <circle cx="48" cy="106" r="5" className="bd-spec dim" />
              <rect x="46" y="156" width="18" height="4" rx="2" className="bd-power" />
            </symbol>
            <symbol id="mu-synths" viewBox="0 0 280 360">
              <path d="M40 350L250 120M250 350L40 120" className="bd-stand" />
              <polygon points="20,120 262,88 274,128 32,160" fill="url(#mu-cab)" className="bd-edge" />
              <polygon points="38,132 258,103 264,122 44,152" fill="url(#mu-keys)" />
              <polygon points="40,52 250,24 260,70 50,98" fill="url(#mu-cab)" className="bd-edge" />
              <polygon points="56,58 244,33 250,62 62,88" fill="url(#mu-knobs)" />
              <polygon points="40,52 250,24 252,30 42,58" className="bd-rimlight" />
            </symbol>
          </defs>
  
          {/* Sala: muro de listones acústicos, muros laterales con espuma, piso de concreto pulido */}
          <rect width="1600" height="900" fill="url(#mu-wall)" />
          <rect x="250" y="190" width="1100" height="480" fill="url(#mu-slats)" />
          <polygon points="0,0 250,150 250,670 0,800" className="bd-sidewall" />
          <polygon points="1600,0 1350,150 1350,670 1600,800" className="bd-sidewall" />
          <polygon points="0,90 250,210 250,640 0,750" fill="url(#mu-foam)" className="bd-foam" />
          <polygon points="1600,90 1350,210 1350,640 1600,750" fill="url(#mu-foam)" className="bd-foam" />
          <polygon points="0,800 250,670 1350,670 1600,800 1600,900 0,900" fill="url(#mu-floor)" />
          <rect y="670" width="1600" height="230" filter="url(#mu-concrete)" clipPath="url(#mu-floor-clip)" />
  
          {/* Haces volumétricos de las cabezas móviles, con bruma */}
          <g filter="url(#mu-b12)">
            <polygon points="296,104 314,104 540,690 100,690" fill="url(#mu-beam)" />
            <polygon points="611,104 629,104 780,690 460,690" fill="url(#mu-beam)" />
            <polygon points="971,104 989,104 1140,690 820,690" fill="url(#mu-beam)" />
            <polygon points="1286,104 1304,104 1500,690 1060,690" fill="url(#mu-beam)" />
          </g>
          <rect width="1600" height="720" filter="url(#mu-haze)" className="bd-haze" />
  
          {/* Graffiti sobre lienzos en los muros laterales */}
          <g transform="skewY(18)">
            <rect x="50" y="250" width="160" height="200" rx="3" fill="url(#mu-cab)" className="bd-edge" />
            <g className="bd-graffiti">
              <path d="M70 300C110 260 140 340 190 290" className="acc" />
              <path d="M70 360C110 330 150 390 195 350" className="ok" />
              <path d="M80 410L120 390L160 420L195 400" className="rec" />
            </g>
            <g className="bd-graffiti spray" filter="url(#mu-b3)">
              <path d="M70 300C110 260 140 340 190 290" className="acc" />
              <path d="M70 360C110 330 150 390 195 350" className="ok" />
            </g>
          </g>
          <g transform="skewY(-18)">
            <rect x="1390" y="770" width="160" height="200" rx="3" fill="url(#mu-cab)" className="bd-edge" />
            <g className="bd-graffiti">
              <path d="M1410 820C1450 780 1480 860 1530 810" className="ok" />
              <path d="M1410 880C1450 850 1490 910 1535 870" className="rec" />
              <path d="M1420 930L1460 910L1500 940L1535 920" className="acc" />
            </g>
            <g className="bd-graffiti spray" filter="url(#mu-b3)">
              <path d="M1410 820C1450 780 1480 860 1530 810" className="ok" />
              <path d="M1410 880C1450 850 1490 910 1535 870" className="rec" />
            </g>
          </g>
  
          {/* Discos de platino enmarcados */}
          <use href="#mu-record" x="310" y="290" width="124" height="124" />
          <use href="#mu-record" x="1166" y="290" width="124" height="124" />
          <use href="#mu-record" x="326" y="440" width="92" height="92" />
          <use href="#mu-record" x="1182" y="440" width="92" height="92" />
  
          {/* Pantallas del DAW: emisión, reflejo del vidrio y luz sobre el muro */}
          <ellipse cx="800" cy="425" rx="340" ry="130" fill="url(#mu-spill)" filter="url(#mu-b30)" />
          <rect x="536" y="346" width="260" height="158" rx="6" className="bd-bezel" />
          <rect x="548" y="358" width="236" height="134" className="bd-screen" />
          <rect x="548" y="358" width="236" height="134" fill="url(#mu-daw)" />
          <rect x="548" y="358" width="236" height="134" fill="url(#mu-glass)" />
          <rect x="804" y="346" width="260" height="158" rx="6" className="bd-bezel" />
          <rect x="816" y="358" width="236" height="134" className="bd-screen" />
          <rect x="816" y="358" width="236" height="134" fill="url(#mu-daw)" />
          <rect x="816" y="358" width="236" height="134" fill="url(#mu-glass)" />
  
          {/* Truss metálico, cabezas móviles y marcos LED con bloom */}
          <rect x="170" y="30" width="1260" height="18" fill="url(#mu-truss)" />
          <path d="M170 30H1430M170 48H1430" stroke="url(#mu-metal)" className="bd-tube" />
          <rect x="360" y="226" width="880" height="16" fill="url(#mu-truss)" />
          <path d="M360 226H1240M360 242H1240" stroke="url(#mu-metal)" className="bd-tube thin" />
          <g className="bd-ledframe bloom-wide" filter="url(#mu-b30)">
            <polygon points="440,110 640,110 620,176 470,176" />
            <polygon points="690,104 910,104 898,182 702,182" />
            <polygon points="960,110 1160,110 1130,176 980,176" />
          </g>
          <g className="bd-ledframe bloom" filter="url(#mu-b12)">
            <polygon points="440,110 640,110 620,176 470,176" />
            <polygon points="690,104 910,104 898,182 702,182" />
            <polygon points="736,120 864,120 858,166 742,166" />
            <polygon points="960,110 1160,110 1130,176 980,176" />
          </g>
          <g className="bd-ledframe core">
            <polygon points="440,110 640,110 620,176 470,176" />
            <polygon points="690,104 910,104 898,182 702,182" />
            <polygon points="736,120 864,120 858,166 742,166" />
            <polygon points="960,110 1160,110 1130,176 980,176" />
          </g>
          {/* Cabezas del truss delantero cortas, para que el lente quede sobre el texto del encabezado y no detrás */}
          {[305, 620, 980, 1295].map((x) => (
            <g key={x}>
              <circle cx={x} cy="92" r="34" fill="url(#mu-spill)" filter="url(#mu-b12)" />
              <use href="#mu-head" x={x - 21} y="48" width="42" height="64" />
            </g>
          ))}
          {[640, 960].map((x) => (
            <g key={x}>
              <circle cx={x} cy="290" r="30" fill="url(#mu-spill)" filter="url(#mu-b12)" />
              <use href="#mu-head" x={x - 20} y="242" width="40" height="61" />
            </g>
          ))}
  
          {/* Sombras de contacto en el piso */}
          <ellipse cx="170" cy="790" rx="150" ry="18" fill="url(#mu-shadow)" />
          <ellipse cx="1430" cy="790" rx="150" ry="18" fill="url(#mu-shadow)" />
          <ellipse cx="800" cy="792" rx="300" ry="22" fill="url(#mu-shadow)" />
          <ellipse cx="455" cy="768" rx="60" ry="10" fill="url(#mu-shadow)" />
          <ellipse cx="1145" cy="768" rx="60" ry="10" fill="url(#mu-shadow)" />
  
          {/* Teclados y sintetizadores en atriles en X */}
          <use href="#mu-synths" x="30" y="440" width="280" height="360" />
          <use href="#mu-synths" x="1290" y="440" width="280" height="360" transform="scale(-1 1) translate(-2860 0)" />
  
          {/* Monitores de estudio sobre pedestales a cada lado del escritorio */}
          <path d="M455 560V762M425 764H485M1145 560V762M1115 764H1175" stroke="url(#mu-metal)" className="bd-tube" />
          <use href="#mu-monitor" x="400" y="400" width="110" height="170" />
          <use href="#mu-monitor" x="1090" y="400" width="110" height="170" />
  
          {/* Escritorio: micrófonos en brazo, laptop, consola y tira LED */}
          <path d="M560 560Q600 480 690 506" stroke="url(#mu-metal)" className="bd-tube" />
          <rect x="684" y="492" width="40" height="20" rx="10" fill="url(#mu-cab)" className="bd-edge" />
          <path d="M1040 560Q1000 480 910 506" stroke="url(#mu-metal)" className="bd-tube" />
          <rect x="876" y="492" width="40" height="20" rx="10" fill="url(#mu-cab)" className="bd-edge" />
          <rect x="734" y="532" width="132" height="84" rx="5" className="bd-bezel" />
          <rect x="744" y="542" width="112" height="64" className="bd-screen" />
          <rect x="744" y="542" width="112" height="64" fill="url(#mu-daw)" />
          <rect x="744" y="542" width="112" height="64" fill="url(#mu-glass)" />
          <polygon points="520,612 1080,612 1112,664 488,664" fill="url(#mu-cab)" className="bd-edge" />
          <polygon points="520,612 1080,612 1083,617 517,617" className="bd-rimlight" />
          <rect x="556" y="620" width="178" height="36" rx="3" className="bd-console" />
          <rect x="562" y="622" width="166" height="34" fill="url(#mu-faders)" />
          <rect x="866" y="620" width="178" height="36" rx="3" className="bd-console" />
          <rect x="872" y="622" width="166" height="34" fill="url(#mu-faders)" />
          <rect x="488" y="666" width="624" height="16" rx="8" className="bd-strip" filter="url(#mu-b12)" />
          <rect x="496" y="670" width="608" height="5" rx="2.5" className="bd-strip core" />
          <path d="M540 680L600 790M1060 680L1000 790" stroke="url(#mu-metal)" className="bd-tube thick" />
  
          {/* Reflejo del LED y las pantallas en el concreto pulido */}
          <g clipPath="url(#mu-floor-clip)">
            <g transform="translate(0 1350) scale(1 -1)" className="bd-reflection" filter="url(#mu-b12)">
              <rect x="496" y="670" width="608" height="8" rx="4" className="bd-strip" />
              <rect x="548" y="560" width="504" height="100" className="bd-bars" />
            </g>
            <ellipse cx="800" cy="730" rx="360" ry="50" fill="url(#mu-spill)" filter="url(#mu-b30)" />
          </g>
  
          {/* Alfombra de parches con textura de tela */}
          <g className="bd-rug">
            <polygon points="300,800 560,800 545,840 270,840" className="a" />
            <polygon points="560,800 800,800 795,840 545,840" className="b" />
            <polygon points="800,800 1050,800 1060,840 795,840" className="c" />
            <polygon points="1050,800 1300,800 1330,840 1060,840" className="b" />
            <polygon points="270,840 600,840 590,890 230,890" className="c" />
            <polygon points="600,840 900,840 905,890 590,890" className="a" />
            <polygon points="900,840 1330,840 1370,890 905,890" className="d" />
          </g>
          <rect x="230" y="800" width="1140" height="90" filter="url(#mu-fabric)" clipPath="url(#mu-rug-clip)" />
  
          {/* Viñeta y grano de película */}
          <rect width="1600" height="900" fill="url(#mu-vignette)" />
          <rect width="1600" height="900" filter="url(#mu-grain)" className="bd-grain" />
        </svg>
      </div>
    </>
  );
}
