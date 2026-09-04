/**
 * Marca de agua mínima para la vista previa del creador: solo un texto
 * claro repetido en diagonal, de baja opacidad, que deja ver el fondo /
 * las fotos debajo. Se usa SOLO en la simulación (CreatorPage), nunca en
 * la cápsula real que recibe el cliente que ya pagó (RevealPage).
 */
export default function PreviewWatermark({ message = "VISTA PREVIA · REALIZA EL PAGO" }) {
  const rows = 8;
  const tiles = [];
  for (let r = 0; r < rows; r++) {
    tiles.push({ top: `${r * 12 + 4}%`, left: r % 2 === 0 ? "-18%" : "-42%" });
  }

  return (
    <div className="absolute inset-0" style={{ pointerEvents: "none", zIndex: 40, overflow: "hidden" }}>
      {tiles.map((pos, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: pos.top,
            left: pos.left,
            transform: "rotate(-24deg)",
            whiteSpace: "nowrap",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#FFFFFF",
            opacity: 0.4,
            mixBlendMode: "overlay",
          }}
        >
          {`${message}  ·  `.repeat(4)}
        </span>
      ))}
    </div>
  );
}
