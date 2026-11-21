// ─────────────────────────────────────────────────────────────
// CONTENIDO EDITABLE DE LA PÁGINA PRINCIPAL
// Cambia aquí los textos, testimonios y trabajos sin tocar el diseño.
// ─────────────────────────────────────────────────────────────

// Cifras de confianza debajo de la portada. Edítalas con datos reales.
export const STATS = [
  { value: "80+", label: "cápsulas creadas" },
  { value: "Sin apps", label: "se abre con la cámara" },
  { value: "Minutos", label: "para armar la tuya" },
];

// Trabajos REALES para la galería: escribe aquí los códigos de pedidos APROBADOS.
// La galería muestra la primera foto de cada uno y, al tocarlo, se abre la cápsula completa.
// Pide permiso al cliente antes de mostrar su trabajo. Ejemplo: ["RV-2026-323394", "RV-2026-111222"]
export const REAL_WORKS = [];

// Testimonios. Copia el comentario tal cual te lo escribió el cliente.
//   country: código de 2 letras (EC, CO, PE, ES, US...) para mostrar la bandera
//   occasion: cumpleanos | aniversario | sanvalentin | navidad | especial
//   image (opcional): link o ruta de una captura de WhatsApp, ej. "/testimonios/maria.jpg" (en la carpeta public/)
// Los que tienen `sample: true` muestran una etiqueta "Ejemplo": quítala cuando pongas uno real.
// Si dejas la lista vacía ([]), la sección de testimonios se oculta sola.
export const TESTIMONIALS = [
  { name: "Nombre del cliente", country: "EC", stars: 5, occasion: "cumpleanos", text: "Aquí va el comentario real de un cliente. Pégalo tal cual te lo escribió por WhatsApp.", sample: true },
  { name: "Nombre del cliente", country: "CO", stars: 5, occasion: "aniversario", text: "Aquí va el comentario real de otro cliente. Mientras más natural, más convence.", sample: true },
  { name: "Nombre del cliente", country: "ES", stars: 5, occasion: "navidad", text: "Aquí va el tercer comentario. Si el cliente te mandó una captura, súbela con la opción image.", sample: true },
];

// Preguntas frecuentes (puedes agregar, borrar o editar).
export const FAQ = [
  {
    q: "¿Cómo se abre mi cápsula?",
    a: "Con la cámara del celular, igual que cualquier QR. Se abre en el navegador, sin descargar ninguna aplicación, y funciona en iPhone y Android.",
  },
  {
    q: "¿Qué diferencia hay entre la Versión Básica y la Pro?",
    a: "La Versión Básica incluye fotos con texto, canción, mensaje inicial y final, fecha especial y el fondo que elijas. La Versión Pro suma además un video dentro de tu cápsula.",
  },
  {
    q: "¿Puedo ver cómo queda antes de pagar?",
    a: "Sí. Mientras armas tu cápsula ves una simulación en vivo y, al confirmar tu pedido, recibes un link para ver cómo quedó.",
  },
  {
    q: "¿Cómo se paga y cuándo recibo mi QR?",
    a: "Al terminar tu pedido te llevamos a WhatsApp para enviar tu comprobante. En cuanto confirmamos el pago, te llega el QR a tu correo, listo para imprimir o compartir.",
  },
  {
    q: "¿Qué canción puedo poner?",
    a: "El link de una canción de YouTube (suenan los primeros 30 segundos desde el punto que elijas) o un audio propio en mp3.",
  },
  {
    q: "¿Puedo cambiar algo después de hacer el pedido?",
    a: "Sí. Escríbenos por WhatsApp y lo modificamos: fotos, textos, fondo, fecha o música.",
  },
  {
    q: "¿Dónde puedo poner el QR?",
    a: "Donde quieras: impreso en una tarjeta, pegado en un regalo, en un cuadro, en un ramo, o compartido como imagen por WhatsApp.",
  },
  {
    q: "¿Cuánto cuesta?",
    a: "Depende de la versión que elijas (Básica o Pro). Al terminar tu pedido te confirmamos el valor por WhatsApp.",
  },
];

// Banners de temporada: aparecen solos entre las fechas indicadas (formato "MM-DD", de cada año).
// occasion: la ocasión que se preselecciona al tocar el botón.
export const SEASON_BANNERS = [
  { id: "navidad", from: "11-15", to: "12-26", occasion: "navidad", text: "\u{1F384} Especial Navidad: tu QR con árbol interactivo, nieve y adornos" },
  { id: "sanvalentin", from: "02-01", to: "02-14", occasion: "sanvalentin", text: "\u2764\uFE0F San Valentín: sorprende con un mensaje de amor que se revela" },
  { id: "madre", from: "05-01", to: "05-12", occasion: "especial", text: "\u{1F338} Día de la Madre: regálale un recuerdo que se revela con un QR" },
];
