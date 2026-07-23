import { useRef, useState, useEffect } from "react";
import { Cake, Heart, Gift } from "lucide-react";

export const OCCASIONS = {
  cumpleanos: {
    label: "Cumpleaños", emoji: "🎂", accent: "gold", icon: Cake,
    qrMessage: "¡Feliz cumpleaños! Escanea para tu sorpresa",
    suggestion: "Hoy celebramos un año más de ti. Espero que este día esté lleno de todo lo que te hace feliz.",
    dateLabel: "Fecha de cumpleaños",
  },
  aniversario: {
    label: "Aniversario", emoji: "💍", accent: "rose", icon: Heart,
    qrMessage: "Escanea y revive nuestra historia juntos",
    suggestion: "Otro año a tu lado, otra historia que sumamos a la nuestra.",
    dateLabel: "Fecha de aniversario",
  },
  sanvalentin: {
    label: "San Valentín", emoji: "❤️", accent: "rose", icon: Heart,
    qrMessage: "Un mensaje de amor te está esperando",
    suggestion: "Quiero que sepas cuánto significas para mí, hoy y siempre.",
    dateLabel: "Fecha especial",
  },
  especial: {
    label: "Mensaje especial", emoji: "✨", accent: "sage", icon: Gift,
    qrMessage: "Alguien preparó algo bonito para ti",
    suggestion: "Quería decirte algo que llevo tiempo pensando...",
    dateLabel: "Fecha (opcional)",
  },
};

export const ACCENTS = {
  gold: { hex: "C9973F", label: "Ámbar" },
  rose: { hex: "C46B79", label: "Rosa" },
  sage: { hex: "6B8F6B", label: "Salvia" },
};

export const BACKGROUNDS = {
  crema: { label: "Crema", css: "linear-gradient(160deg,#FDF8ED,#F7ECD6,#FDF8ED)" },
  rosa: { label: "Rosa suave", css: "linear-gradient(160deg,#FDEEF1,#FBDEE4,#FDEEF1)" },
  menta: { label: "Menta", css: "linear-gradient(160deg,#EAF6F0,#D9EFE1,#EAF6F0)" },
  lavanda: { label: "Lavanda", css: "linear-gradient(160deg,#F1EDFB,#E4DBF5,#F1EDFB)" },
};

export const FONTS = {
  fraunces: { label: "Fraunces", css: "'Fraunces', serif", italic: true },
  playfair: { label: "Playfair", css: "'Playfair Display', serif", italic: true },
  cormorant: { label: "Cormorant", css: "'Cormorant Garamond', serif", italic: true },
  dancing: { label: "Dancing Script", css: "'Dancing Script', cursive", italic: false },
  caveat: { label: "Caveat", css: "'Caveat', cursive", italic: false },
  quicksand: { label: "Quicksand", css: "'Quicksand', sans-serif", italic: false },
  poppins: { label: "Poppins", css: "'Poppins', sans-serif", italic: false },
  montserrat: { label: "Montserrat", css: "'Montserrat', sans-serif", italic: false },
};

export const TEXT_DARK = "#33294A";
export const TEXT_MUTED = "#8B80A6";
export const PANEL_BG = "#FFFFFF";
export const INPUT_BG = "#F5F0E6";
export const INPUT_BORDER = "#E3D9C6";
export const PAGE_BG = "#FBF7EF";

export function slugify(str) {
  return (
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 24) || "mensaje"
  );
}
export function extractYoutubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
export function formatDate(d) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}
export function yearsSince(d) {
  if (!d) return null;
  const date = new Date(d + "T00:00:00");
  const now = new Date();
  let years = now.getFullYear() - date.getFullYear();
  const passed = now.getMonth() > date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() >= date.getDate());
  if (!passed) years -= 1;
  return years;
}

export function StoryBlock({ children }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)", transition: "opacity .7s ease, transform .7s ease" }}>
      {children}
    </div>
  );
}

export const GOOGLE_FONTS_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,500&family=Playfair+Display:ital,wght@0,500;1,500&family=Cormorant+Garamond:ital,wght@0,500;1,500&family=Dancing+Script:wght@600;700&family=Caveat:wght@600;700&family=Quicksand:wght@500;600&family=Poppins:wght@500;600&family=Montserrat:wght@500;600&family=Space+Grotesk:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');";
