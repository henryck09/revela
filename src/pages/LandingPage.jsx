import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, ChevronDown, MessageCircle, QrCode, Sparkles, Star, Upload, X } from "lucide-react";
import {
  OCCASIONS, ACCENTS, BACKGROUNDS, FONTS, GOOGLE_FONTS_IMPORT,
  PAGE_BG, PANEL_BG, TEXT_DARK, TEXT_MUTED, INPUT_BG, INPUT_BORDER,
} from "../lib/capsuleConfig";
import CapsuleStory from "../components/CapsuleStory";
import { getOrderByCode } from "../services/orders";
import { XMAS_DECOR_DATA_URL } from "../lib/xmasDecor";
import { STATS, REAL_WORKS, TESTIMONIALS, FAQ, SEASON_BANNERS } from "../lib/landingContent";

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "";
const CREATE_PATH = "/crear";
const DEEP = "#30264D";
const GOLD = "#C9973F";
const wrap = "max-w-6xl mx-auto px-6";

const waLink = (text) => (WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}` : null);
const flagOf = (iso) => (iso && iso.length === 2 ? String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))) : "");

/* ───────────── Datos de demostración (cápsulas de ejemplo) ───────────── */
function svgPhoto(emoji, c1, c2) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='450' viewBox='0 0 600 450'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs>` +
    `<rect width='600' height='450' fill='url(#g)'/><text x='300' y='265' font-size='170' text-anchor='middle'>${emoji}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const DEMOS = {
  cumpleanos: {
    background: "crema", date: "1998-06-12",
    photos: [["\u{1F382}", "#FDE7B0", "#F4B860", "Un año más, mil motivos para celebrarte"], ["\u{1F388}", "#FBD3DC", "#E58AA0", "Los momentos que más recordamos"]],
  },
  aniversario: {
    background: "rosa", date: "2019-02-14",
    photos: [["\u{1F48D}", "#FBD3DC", "#E58AA0", "Donde empezó nuestra historia"], ["\u{1F495}", "#F6DDEB", "#C46B79", "Contigo, cada año mejor"]],
  },
  sanvalentin: {
    background: "rosa", date: "",
    photos: [["\u2764\uFE0F", "#FBD3DC", "#E5707F", "Todo lo que siento por ti"], ["\u{1F339}", "#F9D7DC", "#D9647A", "Hoy y siempre"]],
  },
  navidad: {
    background: "nieve", date: `${new Date().getFullYear()}-12-24`,
    photos: [["\u{1F384}", "#CFE8D9", "#5E9C7B", "La Navidad en familia"], ["\u{1F381}", "#F7D4D0", "#D86B63", "Sorpresas que se quedan en el corazón"]],
  },
  especial: {
    background: "menta", date: "",
    photos: [["\u2728", "#D9EFE1", "#7DB28F", "Algo especial para ti"], ["\u{1F4AB}", "#E4DBF5", "#A593D6", "Porque lo mereces"]],
  },
};

function toStory(order) {
  const meta = OCCASIONS[order.occasion] || OCCASIONS.especial;
  const accentHex = (ACCENTS[order.accent] || ACCENTS[meta.accent]).hex;
  const fontDef = FONTS[order.font] || FONTS.fraunces;
  const storyBg =
    order.background === "custom" && order.custom_background_url
      ? { backgroundImage: `linear-gradient(180deg, rgba(251,247,239,0.55), rgba(251,247,239,0.9)), url(${order.custom_background_url})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: (BACKGROUNDS[order.background] || BACKGROUNDS.crema).css };
  return {
    emoji: meta.emoji, accentHex, fontDef, storyBg,
    specialDate: order.special_date || "", occasion: order.occasion,
    mainText: order.main_text, youtubeUrl: order.youtube_url, youtubeStart: order.youtube_start || 0,
    songUrl: order.song_url, photos: order.photos || [], videoUrl: order.video_url, closingText: order.closing_text,
  };
}

function demoStory(key) {
  const meta = OCCASIONS[key];
  const demo = DEMOS[key];
  return toStory({
    occasion: key, accent: meta.accent, font: "fraunces", background: demo.background,
    special_date: demo.date, main_text: meta.suggestion,
    closing_text: "Gracias por ser parte de esta historia. Con cariño, siempre.",
    photos: demo.photos.map(([emoji, c1, c2, caption]) => ({ url: svgPhoto(emoji, c1, c2), caption })),
  });
}

function activeBanner(now = new Date()) {
  const md = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return SEASON_BANNERS.find((b) => md >= b.from && md <= b.to) || null;
}

/* ───────────── Piezas reutilizables ───────────── */
function PhoneFrame({ children, width = 300, height = 600, style }) {
  return (
    <div className="relative overflow-hidden mx-auto" style={{ width, height, maxWidth: "100%", background: "#0E0A1C", border: "8px solid #241D3F", borderRadius: "2.5rem", boxShadow: "0 30px 60px -20px rgba(0,0,0,0.5)", ...style }}>
      <div className="absolute top-0 left-1/2 z-20" style={{ width: 110, height: 20, background: "#241D3F", borderRadius: "0 0 12px 12px", transform: "translateX(-50%)" }} />
      {children}
    </div>
  );
}

function SectionHead({ kicker, title, sub }) {
  return (
    <div className="text-center mb-10">
      <p className="rv-mono uppercase mb-2" style={{ fontSize: 11, letterSpacing: "0.14em", color: GOLD }}>{kicker}</p>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 32, lineHeight: 1.15, fontWeight: 600 }}>{title}</h2>
      {sub && <p className="mx-auto mt-3" style={{ color: TEXT_MUTED, fontSize: 15, maxWidth: 520, lineHeight: 1.6 }}>{sub}</p>}
    </div>
  );
}

function CtaButton({ onClick, children, light }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-full"
      style={{ background: light ? "#FFF8E1" : DEEP, color: light ? DEEP : "#FFF", fontWeight: 600, fontSize: 15, padding: "14px 28px", boxShadow: "0 10px 24px -10px rgba(48,38,77,0.55)" }}
    >
      {children} <ArrowRight size={16} />
    </button>
  );
}

/* ───────────── Portada: demo interactiva dentro del celular ───────────── */
function HeroDemo({ demoKey }) {
  const [phase, setPhase] = useState("idle"); // idle | scanning | revealed
  const meta = OCCASIONS[demoKey];
  const accentHex = ACCENTS[meta.accent].hex;
  const isXmas = demoKey === "navidad";
  const qrColor = isXmas ? "8B0000" : accentHex;
  const story = useMemo(() => demoStory(demoKey), [demoKey]);
  const site = typeof window !== "undefined" ? window.location.origin : "";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(site)}&bgcolor=FFFFFF&color=${qrColor}`;

  function reveal() {
    setPhase("scanning");
    setTimeout(() => setPhase("revealed"), 1300);
  }

  return (
    <PhoneFrame>
      {phase === "idle" && (
        <div className="w-full h-full flex flex-col items-center justify-center px-8 text-center" style={{ background: "#FFFDF8" }}>
          <span style={{ fontSize: 22 }} className="mb-1">{meta.emoji}</span>
          <p className="mb-4" style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontSize: 15, color: TEXT_DARK }}>{meta.qrMessage}</p>
          <div className="p-4 rounded-2xl mb-5" style={{ background: "#FBF7EF", border: `1px solid ${INPUT_BORDER}`, marginTop: isXmas ? 22 : 0 }}>
            <div className="relative" style={{ width: 170, height: 170 }}>
              <img src={qrUrl} alt="Código QR de ejemplo" width={170} height={170} className="rounded-lg" />
              {isXmas && <img src={XMAS_DECOR_DATA_URL} alt="" aria-hidden="true" style={{ position: "absolute", left: -17, top: -37, width: 204, height: 39, pointerEvents: "none" }} />}
            </div>
          </div>
          <button onClick={reveal} className="rounded-full flex items-center gap-2" style={{ background: `#${accentHex}`, color: "#FFF", fontWeight: 600, fontSize: 13, padding: "10px 20px" }}>
            <QrCode size={15} /> Toca para escanear
          </button>
          <p className="rv-mono mt-3" style={{ color: TEXT_MUTED, fontSize: 10 }}>mira cómo se revela una cápsula</p>
        </div>
      )}
      {phase === "scanning" && (
        <div className="w-full h-full relative flex items-center justify-center overflow-hidden" style={{ background: "#FFFDF8" }}>
          <div className="absolute left-0 right-0" style={{ height: "40%", background: `linear-gradient(180deg, transparent, #${accentHex}33, transparent)`, animation: "rv-sweep 1.3s ease-in-out" }} />
          <p className="rv-mono uppercase" style={{ color: `#${accentHex}`, fontSize: 12, letterSpacing: "0.1em" }}>revelando...</p>
        </div>
      )}
      {phase === "revealed" && <CapsuleStory order={story} onBack={() => setPhase("idle")} />}
    </PhoneFrame>
  );
}

/* ───────────── Modal para ver una cápsula completa ───────────── */
function DemoModal({ item, onClose, onCreate }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 p-4" style={{ background: "rgba(14,10,28,0.8)" }} onClick={onClose}>
      <button onClick={onClose} aria-label="Cerrar" className="absolute rounded-full flex items-center justify-center" style={{ top: 14, right: 14, width: 38, height: 38, background: "rgba(255,255,255,0.14)" }}>
        <X size={18} color="#FFF" />
      </button>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 340, maxWidth: "94vw" }}>
        <PhoneFrame width={340} height={680} style={{ maxHeight: "74vh" }}>
          <CapsuleStory order={item.story} />
        </PhoneFrame>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <CtaButton light onClick={() => onCreate(item.key)}>Crear uno así</CtaButton>
      </div>
    </div>
  );
}

/* ───────────── Secciones ───────────── */
function SeasonBanner({ banner, onCreate }) {
  if (!banner) return null;
  return (
    <div className="w-full text-center px-4 py-2" style={{ background: DEEP, color: "#FFF8E1", fontSize: 13 }}>
      <span>{banner.text}</span>
      <button onClick={() => onCreate(banner.occasion)} className="ml-3 underline" style={{ color: "#F3D27A", fontWeight: 600 }}>Crear el mío</button>
    </div>
  );
}

function Nav({ onCreate }) {
  const links = [["#como-funciona", "Cómo funciona"], ["#trabajos", "Trabajos"], ["#testimonios", "Testimonios"], ["#versiones", "Versiones"], ["#preguntas", "Preguntas"]];
  return (
    <header className="sticky top-0 z-30" style={{ background: "rgba(251,247,239,0.92)", backdropFilter: "blur(8px)", borderBottom: `1px solid ${INPUT_BORDER}` }}>
      <div className={`${wrap} flex items-center justify-between py-3`}>
        <a href="#inicio" className="flex items-center gap-2">
          <span className="flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: `${GOLD}22`, border: `1px solid ${GOLD}66` }}><Sparkles size={15} color={GOLD} /></span>
          <span className="rv-mono uppercase" style={{ color: TEXT_DARK, fontSize: 13, letterSpacing: "0.12em" }}>Revela</span>
        </a>
        <nav className="hidden md:flex items-center gap-6">
          {links.map(([href, label]) => <a key={href} href={href} style={{ color: TEXT_MUTED, fontSize: 13 }}>{label}</a>)}
        </nav>
        <button onClick={() => onCreate()} className="rounded-full" style={{ background: DEEP, color: "#FFF", fontWeight: 600, fontSize: 13, padding: "9px 18px" }}>Crear mi QR</button>
      </div>
    </header>
  );
}

function Hero({ banner, onCreate }) {
  return (
    <section id="inicio" className={`${wrap} pt-12 pb-16 grid md:grid-cols-2 gap-12 items-center`}>
      <div>
        <p className="rv-mono uppercase mb-4" style={{ fontSize: 11, letterSpacing: "0.14em", color: GOLD }}>Cápsulas digitales con QR</p>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 44, lineHeight: 1.08, fontWeight: 600 }}>
          Regala un recuerdo que se <i>revela</i> con un QR
        </h1>
        <p className="mt-5" style={{ color: TEXT_MUTED, fontSize: 17, lineHeight: 1.6, maxWidth: 480 }}>
          Sube tus fotos, tu mensaje y tu canción. Recibe un QR para imprimir, pegar en un regalo o compartir. Quien lo escanea vive la sorpresa.
        </p>
        <div className="flex flex-wrap items-center gap-4 mt-8">
          <CtaButton onClick={() => onCreate(banner?.occasion)}>Crear mi QR</CtaButton>
          <a href="#trabajos" style={{ color: TEXT_DARK, fontSize: 14, fontWeight: 600, textDecoration: "underline" }}>Ver ejemplos</a>
        </div>
        <p className="rv-mono mt-4" style={{ fontSize: 11, color: TEXT_MUTED }}>Se abre con la cámara del celular · Sin apps · Listo en minutos</p>
        <div className="flex flex-wrap gap-x-8 gap-y-3 mt-10">
          {STATS.map((s) => (
            <div key={s.label}>
              <p style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, color: DEEP }}>{s.value}</p>
              <p style={{ fontSize: 12, color: TEXT_MUTED }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
      <HeroDemo demoKey={banner?.occasion && DEMOS[banner.occasion] && banner.occasion !== "especial" ? banner.occasion : "cumpleanos"} />
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: Upload, title: "Crea tu cápsula", text: "Elige la ocasión, sube tus fotos, escribe tu mensaje y agrega una canción. Ves cómo queda mientras lo armas." },
    { icon: MessageCircle, title: "Confirma por WhatsApp", text: "Al terminar te llevamos a WhatsApp para enviar tu comprobante. También recibes un link para ver cómo quedó." },
    { icon: QrCode, title: "Recibe tu QR", text: "Te llega a tu correo listo para imprimir, pegar en un regalo o compartir. Quien lo escanea revela tu sorpresa." },
  ];
  return (
    <section id="como-funciona" className="py-16" style={{ background: PANEL_BG, borderTop: `1px solid ${INPUT_BORDER}`, borderBottom: `1px solid ${INPUT_BORDER}` }}>
      <div className={wrap}>
        <SectionHead kicker="Cómo funciona" title="Tres pasos y listo" />
        <div className="grid md:grid-cols-3 gap-5">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="rounded-2xl p-6" style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}` }}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="rv-mono flex items-center justify-center rounded-full" style={{ width: 30, height: 30, background: DEEP, color: "#FFF", fontSize: 13 }}>{i + 1}</span>
                  <Icon size={20} color={GOLD} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600 }}>{s.title}</h3>
                <p className="mt-2" style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.6 }}>{s.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Works({ onOpen }) {
  const [real, setReal] = useState([]);

  useEffect(() => {
    if (!REAL_WORKS.length) return;
    let off = false;
    Promise.allSettled(REAL_WORKS.map((code) => getOrderByCode(code))).then((results) => {
      if (!off) setReal(results.filter((r) => r.status === "fulfilled" && r.value).map((r) => r.value));
    });
    return () => { off = true; };
  }, []);

  return (
    <section id="trabajos" className={`${wrap} py-16`}>
      <SectionHead kicker="Trabajos" title="Así se ven nuestras cápsulas" sub="Toca cualquiera y vívela como si hubieras escaneado el QR." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {real.map((order) => {
          const meta = OCCASIONS[order.occasion] || OCCASIONS.especial;
          const photo = order.photos?.[0]?.url;
          return (
            <button key={order.order_code} onClick={() => onOpen({ key: order.occasion, story: toStory(order) })} className="text-left rounded-2xl overflow-hidden" style={{ background: PANEL_BG, border: `1px solid ${INPUT_BORDER}` }}>
              <div style={{ height: 150, background: photo ? `url(${photo}) center/cover` : (BACKGROUNDS[order.background] || BACKGROUNDS.crema).css }} />
              <div className="p-3">
                <p className="rv-mono uppercase" style={{ fontSize: 9, letterSpacing: "0.08em", color: GOLD }}>Trabajo real</p>
                <p style={{ fontSize: 14, fontWeight: 600 }}>{meta.emoji} {meta.label}</p>
                <p className="mt-1" style={{ fontSize: 12, color: TEXT_MUTED }}>Ver cápsula →</p>
              </div>
            </button>
          );
        })}
        {Object.keys(DEMOS).map((key) => {
          const meta = OCCASIONS[key];
          return (
            <button key={key} onClick={() => onOpen({ key, story: demoStory(key) })} className="text-left rounded-2xl overflow-hidden" style={{ background: PANEL_BG, border: `1px solid ${INPUT_BORDER}` }}>
              <div className="flex items-center justify-center" style={{ height: 150, background: BACKGROUNDS[DEMOS[key].background].css, fontSize: 52 }}>{meta.emoji}</div>
              <div className="p-3">
                <p className="rv-mono uppercase" style={{ fontSize: 9, letterSpacing: "0.08em", color: TEXT_MUTED }}>Ejemplo</p>
                <p style={{ fontSize: 14, fontWeight: 600 }}>{meta.label}</p>
                <p className="mt-1" style={{ fontSize: 12, color: TEXT_MUTED }}>Ver ejemplo →</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Testimonials() {
  if (!TESTIMONIALS.length) return null;
  return (
    <section id="testimonios" className="py-16" style={{ background: PANEL_BG, borderTop: `1px solid ${INPUT_BORDER}`, borderBottom: `1px solid ${INPUT_BORDER}` }}>
      <div className={wrap}>
        <SectionHead kicker="Testimonios" title="Lo que dicen quienes ya sorprendieron" />
        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <figure key={i} className="rounded-2xl p-5 flex flex-col" style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}` }}>
              {t.image && <img src={t.image} alt={`Mensaje de ${t.name}`} loading="lazy" className="rounded-xl mb-3 w-full object-cover" style={{ maxHeight: 220 }} />}
              <div className="flex items-center gap-1 mb-3" aria-label={`${t.stars || 5} estrellas`}>
                {Array.from({ length: t.stars || 5 }).map((_, n) => <Star key={n} size={15} color={GOLD} fill={GOLD} />)}
                {t.sample && <span className="rv-mono ml-2 rounded-full px-2" style={{ fontSize: 9, background: "#FFF", border: `1px solid ${INPUT_BORDER}`, color: TEXT_MUTED }}>Ejemplo</span>}
              </div>
              <blockquote style={{ fontSize: 15, lineHeight: 1.6, flex: 1 }}>“{t.text}”</blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <span className="flex items-center justify-center rounded-full" style={{ width: 34, height: 34, background: DEEP, color: "#FFF", fontSize: 14, fontWeight: 600 }}>{(t.name || "?").charAt(0).toUpperCase()}</span>
                <span>
                  <span className="block" style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</span>
                  <span className="block" style={{ fontSize: 12, color: TEXT_MUTED }}>{flagOf(t.country)} {OCCASIONS[t.occasion]?.label || ""}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Versions({ onCreate }) {
  const plans = [
    { name: "Versión Básica", tag: null, items: ["Fotos con texto opcional", "Canción de YouTube o tu propio audio", "Mensaje principal y mensaje final", "Fecha especial y fondo a tu gusto", "QR listo para imprimir, en tu correo"] },
    { name: "Versión Pro", tag: "La más completa", items: ["Todo lo de la Versión Básica", "Un video dentro de tu cápsula (hasta 30 segundos)", "El momento más emotivo, en movimiento"] },
  ];
  return (
    <section id="versiones" className={`${wrap} py-16`}>
      <SectionHead kicker="Versiones" title="Elige cómo quieres sorprender" />
      <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
        {plans.map((p) => (
          <div key={p.name} className="rounded-2xl p-6 flex flex-col" style={{ background: p.tag ? DEEP : PANEL_BG, color: p.tag ? "#FFF8E1" : TEXT_DARK, border: `1px solid ${p.tag ? DEEP : INPUT_BORDER}` }}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600 }}>{p.name}</h3>
              {p.tag && <span className="rv-mono rounded-full px-3 py-1" style={{ fontSize: 10, background: "#F3D27A", color: DEEP }}>{p.tag}</span>}
            </div>
            <ul className="flex flex-col gap-2 flex-1">
              {p.items.map((item) => (
                <li key={item} className="flex items-start gap-2" style={{ fontSize: 14, lineHeight: 1.5 }}>
                  <Check size={16} color={p.tag ? "#F3D27A" : GOLD} style={{ flexShrink: 0, marginTop: 2 }} /> {item}
                </li>
              ))}
            </ul>
            <button onClick={() => onCreate()} className="mt-6 rounded-full" style={{ background: p.tag ? "#F3D27A" : DEEP, color: p.tag ? DEEP : "#FFF", fontWeight: 600, fontSize: 14, padding: "12px 20px" }}>
              Crear mi QR
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="preguntas" className="py-16" style={{ background: PANEL_BG, borderTop: `1px solid ${INPUT_BORDER}` }}>
      <div className="max-w-3xl mx-auto px-6">
        <SectionHead kicker="Preguntas frecuentes" title="Todo lo que quizá te estés preguntando" />
        <div className="flex flex-col gap-3">
          {FAQ.map((item) => (
            <details key={item.q} className="rv-faq rounded-xl" style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}` }}>
              <summary className="flex items-center justify-between gap-4 px-5 py-4" style={{ fontSize: 15, fontWeight: 600 }}>
                {item.q}
                <ChevronDown size={18} color={TEXT_MUTED} className="rv-chev" style={{ flexShrink: 0, transition: "transform .2s" }} />
              </summary>
              <p className="px-5 pb-4" style={{ color: TEXT_MUTED, fontSize: 14, lineHeight: 1.65 }}>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ banner, onCreate }) {
  return (
    <section className="py-16 px-6 text-center" style={{ background: DEEP, color: "#FFF8E1" }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 32, lineHeight: 1.15, fontWeight: 600 }}>¿Listo para sorprender a alguien?</h2>
      <p className="mx-auto mt-3" style={{ opacity: 0.8, fontSize: 15, maxWidth: 440 }}>Arma tu cápsula en minutos y recibe tu QR por correo.</p>
      <div className="mt-7"><CtaButton light onClick={() => onCreate(banner?.occasion)}>Crear mi QR</CtaButton></div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="px-6 py-8 text-center" style={{ background: "#241D3F", color: "#B9AFD6", fontSize: 12 }}>
      <p className="rv-mono uppercase" style={{ letterSpacing: "0.12em", color: "#F3D27A" }}>Revela</p>
      <p className="mt-2">Un QR, un momento.</p>
      <p className="mt-3" style={{ opacity: 0.7 }}>© {new Date().getFullYear()} Revela. Todos los derechos reservados.</p>
    </footer>
  );
}

function WhatsAppFab() {
  const href = waLink("Hola! Quiero información sobre Revela");
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Escríbenos por WhatsApp" className="fixed z-40 rounded-full flex items-center justify-center" style={{ right: 18, bottom: 18, width: 54, height: 54, background: "#25D366", boxShadow: "0 8px 20px -6px rgba(0,0,0,0.4)" }}>
      <MessageCircle size={26} color="#FFF" />
    </a>
  );
}

/* ───────────── Página ───────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const banner = useMemo(() => activeBanner(), []);
  const [modal, setModal] = useState(null); // { key, story }

  const goCreate = (occasion) => navigate(occasion && OCCASIONS[occasion] ? `${CREATE_PATH}?ocasion=${occasion}` : CREATE_PATH);

  return (
    <div className="w-full min-h-screen" style={{ background: PAGE_BG, color: TEXT_DARK, fontFamily: "'Space Grotesk', sans-serif" }}>
      <style>{`${GOOGLE_FONTS_IMPORT}
        html { scroll-behavior: smooth; }
        .rv-mono { font-family: 'IBM Plex Mono', monospace; }
        .rv-scroll::-webkit-scrollbar { width: 4px; }
        .rv-scroll::-webkit-scrollbar-thumb { background: #E3D9C6; border-radius: 4px; }
        .rv-faq summary { list-style: none; cursor: pointer; }
        .rv-faq summary::-webkit-details-marker { display: none; }
        .rv-faq[open] .rv-chev { transform: rotate(180deg); }
        @keyframes rv-sweep { 0% { transform: translateY(-110%); } 100% { transform: translateY(110%); } }
        @media (max-width: 767px) { #inicio h1 { font-size: 36px !important; } }
      `}</style>

      <SeasonBanner banner={banner} onCreate={goCreate} />
      <Nav onCreate={goCreate} />
      <Hero banner={banner} onCreate={goCreate} />
      <HowItWorks />
      <Works onOpen={setModal} />
      <Testimonials />
      <Versions onCreate={goCreate} />
      <Faq />
      <FinalCta banner={banner} onCreate={goCreate} />
      <Footer />
      <WhatsAppFab />

      {modal && <DemoModal item={modal} onClose={() => setModal(null)} onCreate={goCreate} />}
    </div>
  );
}
