/**
 * Fondo ilustrado de cada mundo, fijo detrás del contenido. Audiovisual es un set fotográfico
 * azul medianoche (truss con focos, octabox, softbox, beauty dish, cámara en pedestal y piso de
 * concreto). Música es un estudio urbano con LED violeta (truss con cabezas móviles, marcos LED,
 * pantallas del DAW, discos de platino, consola, teclados y alfombra de parches). Se dibujan los
 * dos y el CSS muestra el del mundo activo, así el interruptor de mundos no necesita recargar.
 * Los colores salen de los tokens (clases `bd-*` en studio.css).
 */
export function StudioBackdrop() {
  return (
    <>
      <svg className="backdrop backdrop-av" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="av-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="bd-stop-bg" />
            <stop offset="0.55" className="bd-stop-wall" />
            <stop offset="1" className="bd-stop-wall" />
          </linearGradient>
          <linearGradient id="av-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="bd-stop-s2" />
            <stop offset="1" className="bd-stop-bg" />
          </linearGradient>
          <radialGradient id="av-shine">
            <stop offset="0" className="bd-stop-fg" stopOpacity="0.1" />
            <stop offset="1" className="bd-stop-fg" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="av-beam" cx="0.5" cy="0" r="1">
            <stop offset="0" className="bd-stop-fg" stopOpacity="0.12" />
            <stop offset="1" className="bd-stop-fg" stopOpacity="0" />
          </radialGradient>
          <pattern id="av-truss" width="30" height="16" patternUnits="userSpaceOnUse">
            <path d="M0 0L15 16L30 0" className="bd-rig" />
          </pattern>
          <pattern id="av-dish-grid" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
            <path d="M0 0H14M0 0V14" className="bd-mesh" />
          </pattern>
          <filter id="av-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          {/* Foco fresnel colgado, apuntando hacia abajo */}
          <symbol id="av-spot" viewBox="0 0 40 60">
            <path d="M20 0V10" className="bd-rig" />
            <rect x="6" y="10" width="28" height="34" rx="5" className="bd-gear" />
            <ellipse cx="20" cy="46" rx="12" ry="5" className="bd-lamp" />
          </symbol>
          <symbol id="av-stand" viewBox="0 0 160 300">
            <path d="M80 0V240M80 240L10 296M80 240L150 296M80 240L80 296" className="bd-stand" />
          </symbol>
        </defs>

        {/* Sala: muro del fondo, muros laterales y piso de concreto pulido */}
        <rect width="1600" height="900" fill="url(#av-wall)" />
        <polygon points="0,0 250,70 250,640 0,770" className="bd-sidewall" />
        <polygon points="1600,0 1350,70 1350,640 1600,770" className="bd-sidewall" />
        <polygon points="0,770 250,640 1350,640 1600,770 1600,900 0,900" fill="url(#av-floor)" />
        <ellipse cx="800" cy="760" rx="560" ry="70" fill="url(#av-shine)" />
        {/* Tira de luz cálida al pie del muro */}
        <rect x="270" y="626" width="1060" height="16" rx="8" className="bd-rim" filter="url(#av-blur)" />

        {/* Truss cuadrado en perspectiva con focos colgados */}
        <rect x="250" y="34" width="1100" height="16" fill="url(#av-truss)" />
        <path d="M250 34H1350M250 50H1350" className="bd-rig" />
        <rect x="420" y="146" width="760" height="14" fill="url(#av-truss)" />
        <path d="M420 146H1180M420 160H1180M250 42L420 153M1350 42L1180 153M340 98H1260" className="bd-rig" />
        <polygon points="760,170 840,170 1000,620 600,620" fill="url(#av-beam)" />
        {[470, 620, 980, 1130].map((x) => (
          <use key={x} href="#av-spot" x={x - 16} y="160" width="32" height="48" />
        ))}
        {[330, 560, 1040, 1270].map((x) => (
          <use key={x} href="#av-spot" x={x - 20} y="50" width="40" height="60" />
        ))}
        <rect x="770" y="164" width="60" height="26" rx="4" className="bd-gear" />
        <rect x="776" y="186" width="48" height="8" rx="3" className="bd-lamp" />

        {/* Octabox a la izquierda */}
        <use href="#av-stand" x="210" y="450" width="160" height="300" />
        <g transform="rotate(-14 330 360)">
          <polygon points="268,210 392,210 480,298 480,422 392,510 268,510 180,422 180,298" className="bd-gear" />
          <polygon points="276,226 384,226 462,304 462,416 384,494 276,494 198,416 198,304" className="bd-face" />
        </g>

        {/* Softbox rectangular sobre pedestal con ruedas */}
        <path d="M600 560V700M560 712H640" className="bd-stand" />
        <circle cx="560" cy="716" r="7" className="bd-gear" />
        <circle cx="640" cy="716" r="7" className="bd-gear" />
        <polygon points="520,262 652,240 690,560 560,582" className="bd-gear" />
        <polygon points="532,276 642,258 676,548 570,566" className="bd-face" />

        {/* Cámara sobre pedestal en el centro del set */}
        <path d="M1000 470V720M950 730L1000 720L1050 730" className="bd-stand" />
        <circle cx="950" cy="736" r="7" className="bd-gear" />
        <circle cx="1050" cy="736" r="7" className="bd-gear" />
        <rect x="960" y="410" width="96" height="62" rx="8" className="bd-gear" />
        <rect x="982" y="396" width="34" height="16" rx="3" className="bd-gear" />
        <circle cx="940" cy="440" r="26" className="bd-gear" />
        <circle cx="940" cy="440" r="14" className="bd-lens" />

        {/* Beauty dish con grilla a la derecha */}
        <use href="#av-stand" x="1190" y="440" width="160" height="300" />
        <circle cx="1270" cy="330" r="128" className="bd-gear" />
        <circle cx="1270" cy="330" r="116" className="bd-dish" />
        <circle cx="1270" cy="330" r="116" fill="url(#av-dish-grid)" />
        <path d="M1440 200V700M1440 700L1400 730M1440 700L1480 730" className="bd-stand" />
      </svg>

      <svg className="backdrop backdrop-mu" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="mu-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="bd-stop-bg" />
            <stop offset="0.4" className="bd-stop-wall" />
            <stop offset="1" className="bd-stop-wall" />
          </linearGradient>
          <linearGradient id="mu-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="bd-stop-s2" />
            <stop offset="1" className="bd-stop-bg" />
          </linearGradient>
          <radialGradient id="mu-glow">
            <stop offset="0" className="bd-stop-acc" stopOpacity="0.4" />
            <stop offset="1" className="bd-stop-acc" stopOpacity="0" />
          </radialGradient>
          <pattern id="mu-truss" width="30" height="16" patternUnits="userSpaceOnUse">
            <path d="M0 0L15 16L30 0" className="bd-rig" />
          </pattern>
          {/* Paneles acústicos del muro */}
          <pattern id="mu-panels" width="104" height="500" patternUnits="userSpaceOnUse">
            <path d="M0 0V500" className="bd-seam" />
          </pattern>
          {/* Pistas del DAW en las pantallas */}
          <pattern id="mu-daw" width="18" height="120" patternUnits="userSpaceOnUse">
            <rect x="3" y="40" width="10" height="70" className="bd-bars" />
            <rect x="3" y="20" width="10" height="12" className="bd-bars dim" />
          </pattern>
          <pattern id="mu-keys" width="12" height="40" patternUnits="userSpaceOnUse">
            <rect x="1" y="0" width="10" height="40" className="bd-keys" />
          </pattern>
          <pattern id="mu-faders" width="20" height="30" patternUnits="userSpaceOnUse">
            <rect x="9" y="4" width="2" height="22" className="bd-track" />
            <rect x="5" y="12" width="10" height="5" rx="1" className="bd-cap" />
          </pattern>
          <filter id="mu-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="12" />
          </filter>
          {/* Cabeza móvil colgada del truss */}
          <symbol id="mu-head" viewBox="0 0 70 90">
            <rect x="15" y="0" width="40" height="18" rx="4" className="bd-gear" />
            <path d="M14 22V56M56 22V56M14 22H56" className="bd-stand thin" />
            <rect x="16" y="34" width="38" height="44" rx="10" className="bd-gear" />
            <circle cx="35" cy="66" r="12" className="bd-head" />
          </symbol>
          <symbol id="mu-disc" viewBox="0 0 120 120">
            <rect x="2" y="2" width="116" height="116" rx="4" className="bd-gear" />
            <circle cx="60" cy="54" r="38" className="bd-silver" />
            <circle cx="60" cy="54" r="10" className="bd-gear" />
            <rect x="24" y="100" width="72" height="6" rx="2" className="bd-silver" />
          </symbol>
          <symbol id="mu-synths" viewBox="0 0 260 340">
            <path d="M30 330L230 120M230 330L30 120" className="bd-stand" />
            <polygon points="20,120 240,92 250,124 30,152" className="bd-gear" />
            <polygon points="36,134 236,108 240,122 40,148" fill="url(#mu-keys)" />
            <polygon points="40,60 230,36 238,70 48,94" className="bd-gear" />
            <rect x="70" y="52" width="130" height="18" rx="3" fill="url(#mu-faders)" transform="rotate(-7 135 61)" />
          </symbol>
        </defs>

        {/* Sala: muro de paneles acústicos, muros laterales y piso */}
        <rect width="1600" height="900" fill="url(#mu-wall)" />
        <rect x="270" y="200" width="1060" height="470" fill="url(#mu-panels)" />
        <polygon points="0,0 270,160 270,670 0,800" className="bd-sidewall" />
        <polygon points="1600,0 1330,160 1330,670 1600,800" className="bd-sidewall" />
        <polygon points="0,800 270,670 1330,670 1600,800 1600,900 0,900" fill="url(#mu-floor)" />

        {/* Graffiti en los muros laterales */}
        <g className="bd-graffiti">
          <path d="M40 360C80 330 110 400 150 360S210 330 230 380" className="acc" />
          <path d="M50 420C90 400 130 460 170 420S220 410 240 440" className="rec" />
          <path d="M60 470L110 450L150 490L210 460" className="ok" />
          <path d="M1560 360C1520 330 1490 400 1450 360S1390 330 1370 380" className="acc" />
          <path d="M1550 420C1510 400 1470 460 1430 420S1380 410 1360 440" className="ok" />
          <path d="M1540 470L1490 450L1450 490L1390 460" className="rec" />
        </g>

        {/* Discos de platino enmarcados */}
        <use href="#mu-disc" x="340" y="300" width="110" height="110" />
        <use href="#mu-disc" x="1150" y="300" width="110" height="110" />
        <use href="#mu-disc" x="340" y="450" width="90" height="90" />
        <use href="#mu-disc" x="1170" y="450" width="90" height="90" />

        {/* Pantallas del DAW sobre el escritorio */}
        <rect x="560" y="360" width="236" height="140" rx="6" className="bd-screen" />
        <rect x="572" y="372" width="212" height="116" fill="url(#mu-daw)" />
        <rect x="804" y="360" width="236" height="140" rx="6" className="bd-screen" />
        <rect x="816" y="372" width="212" height="116" fill="url(#mu-daw)" />

        {/* Truss con cabezas móviles y marcos LED en el techo */}
        <rect x="180" y="30" width="1240" height="16" fill="url(#mu-truss)" />
        <path d="M180 30H1420M180 46H1420" className="bd-rig" />
        <rect x="380" y="220" width="840" height="14" fill="url(#mu-truss)" />
        <path d="M380 220H1220M380 234H1220" className="bd-rig" />
        <g filter="url(#mu-blur)">
          <polygon points="440,110 640,110 620,176 470,176" className="bd-ledframe" />
          <polygon points="690,104 910,104 898,182 702,182" className="bd-ledframe" />
          <polygon points="960,110 1160,110 1130,176 980,176" className="bd-ledframe" />
        </g>
        <polygon points="440,110 640,110 620,176 470,176" className="bd-ledframe" />
        <polygon points="690,104 910,104 898,182 702,182" className="bd-ledframe" />
        <polygon points="736,120 864,120 858,166 742,166" className="bd-ledframe" />
        <polygon points="960,110 1160,110 1130,176 980,176" className="bd-ledframe" />
        {[300, 620, 980, 1300].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy="140" rx="70" ry="60" fill="url(#mu-glow)" />
            <use href="#mu-head" x={x - 35} y="46" width="70" height="90" />
          </g>
        ))}
        {[640, 960].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy="290" rx="50" ry="40" fill="url(#mu-glow)" />
            <use href="#mu-head" x={x - 24} y="234" width="48" height="62" />
          </g>
        ))}

        {/* Teclados y sintetizadores en atriles */}
        <use href="#mu-synths" x="60" y="430" width="260" height="340" />
        <use href="#mu-synths" x="1280" y="430" width="260" height="340" transform="scale(-1 1) translate(-2820 0)" />

        {/* Escritorio con la consola, el laptop, los micrófonos y la tira LED */}
        <path d="M560 540Q600 470 690 500" className="bd-stand thin" />
        <rect x="684" y="490" width="34" height="16" rx="8" className="bd-gear" />
        <path d="M1040 540Q1000 470 910 500" className="bd-stand thin" />
        <rect x="882" y="490" width="34" height="16" rx="8" className="bd-gear" />
        <rect x="740" y="540" width="120" height="76" rx="4" className="bd-screen" />
        <rect x="750" y="550" width="100" height="56" fill="url(#mu-daw)" />
        <polygon points="530,612 1070,612 1100,660 500,660" className="bd-gear" />
        <rect x="560" y="618" width="170" height="30" fill="url(#mu-faders)" />
        <rect x="870" y="618" width="170" height="30" fill="url(#mu-faders)" />
        <rect x="506" y="668" width="588" height="6" rx="3" className="bd-rim" filter="url(#mu-blur)" />
        <rect x="506" y="668" width="588" height="4" rx="2" className="bd-rim" />
        <path d="M540 676L600 780M1060 676L1000 780M600 780H540M1000 780H1060" className="bd-stand" />

        {/* Alfombra de parches en el piso */}
        <polygon points="300,790 560,790 545,830 270,830" className="bd-rug a" />
        <polygon points="560,790 800,790 795,830 545,830" className="bd-rug b" />
        <polygon points="800,790 1050,790 1060,830 795,830" className="bd-rug c" />
        <polygon points="1050,790 1300,790 1330,830 1060,830" className="bd-rug b" />
        <polygon points="270,830 600,830 590,880 230,880" className="bd-rug c" />
        <polygon points="600,830 900,830 905,880 590,880" className="bd-rug a" />
        <polygon points="900,830 1330,830 1370,880 905,880" className="bd-rug d" />
      </svg>
    </>
  );
}
