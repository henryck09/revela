import { useCallback, useRef, useState } from "react";

/**
 * Efectos del modo Navidad para la cápsula. Todo es CSS/SVG liviano (sin
 * librerías ni canvas), pensado para celulares de gama baja: pocas piezas,
 * solo animaciones de transform/opacity, y se calma solo si el usuario
 * tiene activado "reducir movimiento".
 */

/* ───────────── Nieve suave ───────────── */
const FLAKES = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37) % 100,
  size: 3 + ((i * 7) % 5),
  duration: 9 + ((i * 13) % 8),
  delay: -((i * 5) % 14),
  drift: (i % 2 ? 1 : -1) * (10 + ((i * 3) % 24)),
  opacity: 0.55 + ((i * 11) % 4) * 0.1,
}));

/** El contenedor padre debe ser `position: relative`. */
export function ChristmasSnow() {
  return (
    <div aria-hidden="true" className="rv-snow">
      <style>{`
        .rv-snow { position:absolute; inset:0; overflow:hidden; pointer-events:none; z-index:5; }
        .rv-flake { position:absolute; top:0; height:100%; width:var(--s); left:var(--l);
          animation: rv-fall var(--d) linear var(--dl) infinite; will-change: transform; }
        .rv-flake::before { content:""; display:block; width:100%; height:var(--s); border-radius:50%;
          background:#fff; box-shadow:0 0 3px 1px rgba(120,150,190,.55); }
        @keyframes rv-fall {
          0%   { transform: translate3d(0,-6%,0); opacity:0; }
          8%   { opacity:var(--o); }
          90%  { opacity:var(--o); }
          100% { transform: translate3d(var(--x),100%,0); opacity:0; }
        }
        @media (prefers-reduced-motion: reduce) { .rv-snow { display:none; } }
      `}</style>
      {FLAKES.map((f, i) => (
        <span
          key={i}
          className="rv-flake"
          style={{ "--l": `${f.left}%`, "--s": `${f.size}px`, "--d": `${f.duration}s`, "--dl": `${f.delay}s`, "--x": `${f.drift}px`, "--o": f.opacity }}
        />
      ))}
    </div>
  );
}

/* ───────────── Árbol interactivo ───────────── */
const BULBS = [
  [100, 70], [82, 92], [120, 90],
  [100, 112], [72, 130], [128, 128], [56, 146], [144, 144],
  [100, 152], [76, 172], [126, 170], [52, 192], [148, 190], [100, 192], [34, 203],
];
const PALETTE = ["#FF4D4D", "#FFD34D", "#4DA3FF", "#FFFFFF", "#FF8AD1", "#7CFF8A"];
const STAR = Array.from({ length: 10 }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 5;
  const r = i % 2 === 0 ? 15 : 6.5;
  return `${(100 + r * Math.cos(a)).toFixed(1)},${(30 + r * Math.sin(a)).toFixed(1)}`;
}).join(" ");

/** Toca el árbol: las luces se encienden en cadena. Toca otra vez: cambian de color. */
export function ChristmasTree({ accentHex }) {
  const [lit, setLit] = useState(false);
  const [shift, setShift] = useState(0);

  function handleTap() {
    if (!lit) setLit(true);
    else setShift((s) => s + 1);
  }

  return (
    <div className="flex flex-col items-center px-6 py-6">
      <style>{`
        .rv-tree { position:relative; width:200px; height:240px; }
        .rv-tree-glow { position:absolute; inset:-14px; border-radius:50%; opacity:0; transition:opacity .9s ease;
          background: radial-gradient(circle, rgba(255,211,77,.40), rgba(255,211,77,0) 68%); }
        .rv-tree.is-lit .rv-tree-glow { opacity:1; }
        .rv-bulb-core { transition: fill .35s ease; }
        .rv-bulb-halo { transition: fill .35s ease, opacity .35s ease; opacity:0; }
        .rv-tree.is-lit .rv-bulb-halo { opacity:.32; }
        .rv-tree.is-lit .rv-bulb-g { animation: rv-twinkle 1.7s ease-in-out infinite; }
        .rv-star-halo { opacity:0; transition: opacity .6s ease; }
        .rv-tree.is-lit .rv-star-halo { opacity:.38; animation: rv-twinkle 2.2s ease-in-out infinite; }
        @keyframes rv-twinkle { 0%,100% { opacity:1; } 50% { opacity:.5; } }
        .rv-tree-btn:active .rv-tree { transform: scale(.985); }
        @media (prefers-reduced-motion: reduce) {
          .rv-tree.is-lit .rv-bulb-g, .rv-tree.is-lit .rv-star-halo { animation:none; }
        }
      `}</style>

      <button
        type="button"
        onClick={handleTap}
        className="rv-tree-btn"
        aria-label={lit ? "Cambiar los colores de las luces del árbol" : "Encender las luces del árbol"}
        style={{ background: "none", border: 0, padding: 0, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
      >
        <div className={`rv-tree${lit ? " is-lit" : ""}`}>
          <div className="rv-tree-glow" />
          <svg viewBox="0 0 200 240" width="200" height="240" aria-hidden="true" style={{ position: "relative", display: "block" }}>
            <rect x="88" y="205" width="24" height="24" rx="3" fill="#7A4B2A" />
            <polygon points="100,108 178,208 22,208" fill="#0A5A3A" />
            <polygon points="100,70 162,150 38,150" fill="#0B6B45" />
            <polygon points="100,38 148,98 52,98" fill="#0F7B4F" />
            <circle className="rv-star-halo" cx="100" cy="30" r="24" fill="#FFD34D" />
            <polygon points={STAR} fill={lit ? "#FFD34D" : "#A9A98A"} style={{ transition: "fill .5s ease" }} />
            {BULBS.map(([x, y], i) => {
              const color = lit ? PALETTE[(i + shift) % PALETTE.length] : "#3B6A53";
              const delay = lit && shift === 0 ? `${i * 70}ms` : "0ms"; // se encienden en cadena
              return (
                <g key={i} className="rv-bulb-g" style={{ animationDelay: `${(i % 5) * 0.3}s` }}>
                  <circle className="rv-bulb-halo" cx={x} cy={y} r="10" style={{ fill: color, transitionDelay: delay }} />
                  <circle className="rv-bulb-core" cx={x} cy={y} r="5.5" style={{ fill: color, transitionDelay: delay }} />
                </g>
              );
            })}
          </svg>
        </div>
      </button>

      <p className="rv-mono text-center mt-3" style={{ fontSize: 11, color: `#${accentHex}` }}>
        {lit ? "¡Toca otra vez para cambiar los colores!" : "\u2728 Toca el árbol para encender las luces"}
      </p>
    </div>
  );
}

/* ───────────── Destellos donde toques ───────────── */
const GLYPHS = [
  ["\u2726", "#D4A017"], ["\u2744", "#7FB2E5"], ["\u2726", "#C41E3A"], ["\u2605", "#F0B429"],
  ["\u2726", "#2E8B57"], ["\u2744", "#9CC3EA"], ["\u2726", "#D4A017"],
];

/** Úsalo en el contenedor raíz: onClick={spawn}. Devuelve [destellos, spawn]. */
export function useTapSparkles() {
  const [bursts, setBursts] = useState([]);
  const idRef = useRef(0);
  const spawn = useCallback((e) => {
    if (!e.clientX && !e.clientY) return; // clic por teclado: sin posición
    const rect = e.currentTarget.getBoundingClientRect();
    const id = ++idRef.current;
    setBursts((b) => [...b.slice(-3), { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]); // máx. 4 a la vez
    setTimeout(() => setBursts((b) => b.filter((item) => item.id !== id)), 850);
  }, []);
  return [bursts, spawn];
}

export function SparkleLayer({ bursts }) {
  return (
    <div aria-hidden="true" className="rv-sparks">
      <style>{`
        .rv-sparks { position:absolute; inset:0; pointer-events:none; overflow:hidden; z-index:6; }
        .rv-burst { position:absolute; width:0; height:0; }
        .rv-spark { position:absolute; left:0; top:0; font-style:normal; font-size:17px; line-height:1;
          text-shadow:0 0 4px rgba(255,255,255,.95); animation: rv-spark .8s ease-out forwards; will-change: transform, opacity; }
        @keyframes rv-spark {
          0%   { transform: translate(-50%,-50%) scale(.3); opacity:1; }
          100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1.1); opacity:0; }
        }
        @media (prefers-reduced-motion: reduce) { .rv-sparks { display:none; } }
      `}</style>
      {bursts.map((b) => (
        <span key={b.id} className="rv-burst" style={{ left: b.x, top: b.y }}>
          {GLYPHS.map(([glyph, color], i) => {
            const angle = (i / GLYPHS.length) * 2 * Math.PI + b.id;
            const dist = 34 + (i % 3) * 11;
            return (
              <i key={i} className="rv-spark" style={{ color, "--dx": `${Math.cos(angle) * dist}px`, "--dy": `${Math.sin(angle) * dist}px`, animationDelay: `${i * 20}ms` }}>
                {glyph}
              </i>
            );
          })}
        </span>
      ))}
    </div>
  );
}
