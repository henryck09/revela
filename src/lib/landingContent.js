// ═════════════════════════════════════════════════════════════
//  CONTENIDO EDITABLE DE LA PÁGINA PRINCIPAL
//  Aquí pones tus testimonios y tus ejemplos. No hace falta tocar el diseño.
//  Después de editar: npm run build → git add . → git commit → git push
// ═════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// 1) CIFRAS (debajo del titular de la portada)
// ─────────────────────────────────────────────────────────────
export const STATS = [
  { value: "80+", label: "cápsulas creadas" },
  { value: "0 apps", label: "se abre con la cámara" },
  { value: "Minutos", label: "para armar la tuya" },
];

// ─────────────────────────────────────────────────────────────
// 2) TUS EJEMPLOS (sección "Trabajos")
//
// Hay dos formas de agregar un ejemplo:
//
// A) LA MÁS FÁCIL: el código de un pedido ya aprobado.
//    La galería toma su primera foto y, al tocarlo, se abre la cápsula completa
//    (con su música, su video y todo). No subes nada nuevo.
//      { code: "RV-2026-323394" }
//    Opcional: { code: "RV-2026-323394", title: "Cumpleaños de Ana" }
//    ⚠ Pide permiso al cliente antes: se verán sus fotos y su mensaje.
//
// B) UNA FOTO O UN VIDEO TUYO (por ejemplo, el QR pegado en un regalo):
//      { title: "QR en un ramo", occasion: "aniversario", image: "/ejemplos/ramo.jpg" }
//      { title: "Así reaccionó", occasion: "cumpleanos", image: "/ejemplos/ana.jpg", video: "/ejemplos/ana.mp4" }
//    Los archivos se guardan en la carpeta  public/ejemplos/  de tu proyecto.
//    Consejos: fotos de menos de 300 KB y videos cortos de menos de 8 MB.
//
// occasion puede ser: cumpleanos | aniversario | sanvalentin | navidad | especial
// ─────────────────────────────────────────────────────────────
export const WORKS = [
  // { code: "RV-2026-000000" },
];

// Mientras no tengas ejemplos propios, la galería muestra 5 ejemplos de demostración.
// Cuando ya tengas los tuyos, cámbialo a false para que solo se vean los tuyos.
export const SHOW_DEMO_EXAMPLES = true;

// ─────────────────────────────────────────────────────────────
// 3) TUS TESTIMONIOS (sección "Testimonios")
//
// Copia este bloque por cada testimonio y cámbiale los datos:
//   {
//     name: "María P.",                      // nombre (o solo la inicial del apellido)
//     country: "EC",                         // 2 letras: EC, CO, PE, MX, ES, US... (muestra la bandera)
//     occasion: "cumpleanos",                // cumpleanos | aniversario | sanvalentin | navidad | especial
//     stars: 5,                              // de 1 a 5
//     text: "Mi mamá lloró al verla...",     // el comentario tal cual te lo escribió
//     image: "/testimonios/maria.jpg",       // OPCIONAL: captura de WhatsApp (va en public/testimonios/)
//   },
//
// Los 3 de abajo son de relleno (tienen sample: true y muestran la etiqueta "Ejemplo").
// BÓRRALOS y pon los reales. Si dejas la lista vacía ([]), la sección se oculta sola.
// Para la captura: recórtala, tapa el número de teléfono, pide permiso y que pese menos de 200 KB.
// ─────────────────────────────────────────────────────────────
export const TESTIMONIALS = [
  { name: "Andrea Fernandes", country: "EC", stars: 5, occasion: "cumpleanos", text: "Armamos una cápsula con fotos de nuestros viajes, audios y una canción especial para nuestro aniversario. Cuando la abrimos juntos, la reacción fue increíble; se siente mucho más personal y duradero que un regalo tradicional.", sample: false },
  { name: "Pablo Jaramillo", country: "CO", stars: 5, occasion: "aniversario", text: "En menos de quince minutos tuve la página lista, con su código QR y todo organizado sin complicarme. Es súper intuitivo y el resultado se ve elegante desde el celular.", sample: false },
  { name: "Maria Silva", country: "ES", stars: 5, occasion: "navidad", text: "Lo usé para un detalle sorpresa y todos quedaron encantados revisando las fotos y mensajes en el mismo lugar. Es una forma distinta de guardar recuerdos que de verdad se vuelven a ver.", sample: false },
];

// ─────────────────────────────────────────────────────────────
// 4) PREGUNTAS FRECUENTES (puedes agregar, borrar o editar)
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// 5) BANNERS DE TEMPORADA (aparecen solos entre las fechas, formato "MM-DD")
//    occasion: la ocasión que se preselecciona al tocar el botón.
// ─────────────────────────────────────────────────────────────
export const SEASON_BANNERS = [
  { id: "navidad", from: "11-15", to: "12-26", occasion: "navidad", text: "\u{1F384} Especial Navidad: tu QR con árbol interactivo, nieve y adornos" },
  { id: "sanvalentin", from: "02-01", to: "02-14", occasion: "sanvalentin", text: "\u2764\uFE0F San Valentín: sorprende con un mensaje de amor que se revela" },
  { id: "madre", from: "05-01", to: "05-12", occasion: "especial", text: "\u{1F338} Día de la Madre: regálale un recuerdo que se revela con un QR" },
];
