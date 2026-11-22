import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, MessageCircle, Play, Plus, QrCode, Sparkles, Star, Upload, X } from "lucide-react";
import { OCCASIONS, ACCENTS, BACKGROUNDS, FONTS, GOOGLE_FONTS_IMPORT } from "../lib/capsuleConfig";
import CapsuleStory from "../components/CapsuleStory";
import { getOrderByCode } from "../services/orders";
import { XMAS_DECOR_DATA_URL } from "../lib/xmasDecor";
import { STATS, WORKS, SHOW_DEMO_EXAMPLES, TESTIMONIALS, FAQ, SEASON_BANNERS } from "../lib/landingContent";

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "";
const CREATE_PATH = "/crear";

// Paleta y tipografías de la página principal
const INK = "#14102A";
const INK2 = "#221A44";
const VIOLET = "#8B7CFF";
const PINK = "#FF7AB6";
const GOLD = "#F3C969";
const BG = "#F6F4FF";
const MUTED = "#6B6485";
const BORDER = "rgba(20,16,42,0.09)";
const SANS = "'Plus Jakarta Sans', 'Space Grotesk', system-ui, sans-serif";
const SERIF = "'Fraunces', serif";
const wrap = "max-w-6xl mx-auto px-6";
const gradText = { background: `linear-gradient(90deg,#B3A8FF,${PINK},${GOLD})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent" };

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
/** Aparece suavemente al entrar en pantalla (solo opacidad y movimiento, muy liviano) */
function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const instant = typeof IntersectionObserver === "undefined" || (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  const [shown, setShown] = useState(Boolean(instant));
  useEffect(() => {
    if (shown || !ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); obs.disconnect(); } }, { threshold: 0.12 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [shown]);
  return (
    <div ref={ref} className={className} style={{ opacity: shown ? 1 : 0, transform: shown ? "none" : "translateY(20px)", transition: `opacity .6s ease ${delay}ms, transform .6s ease ${delay}ms` }}>
      {children}
    </div>
  );
}

function PhoneFrame({ children, width = 300, height = 600, style }) {
  return (
    <div className="relative overflow-hidden mx-auto" style={{ width, height, maxWidth: "100%", background: "#0E0A1C", border: "8px solid #2B2250", borderRadius: "2.6rem", boxShadow: "0 40px 80px -24px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)", ...style }}>
      <div className="absolute top-0 left-1/2 z-20" style={{ width: 110, height: 20, background: "#2B2250", borderRadius: "0 0 12px 12px", transform: "translateX(-50%)" }} />
      {children}
    </div>
  );
}

function Kicker({ children, dark }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1" style={{ fontSize: 12, fontWeight: 700, background: dark ? "rgba(255,255,255,0.08)" : "rgba(139,124,255,0.12)", color: dark ? "#D9D2FF" : "#5B49D6", border: `1px solid ${dark ? "rgba(255,255,255,0.16)" : "rgba(139,124,255,0.25)"}` }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: dark ? GOLD : VIOLET }} />
      {children}
    </span>
  );
}

function SectionHead({ kicker, title, sub }) {
  return (
    <div className="text-center mb-12">
      <Kicker>{kicker}</Kicker>
      <h2 className="mt-4" style={{ fontSize: "clamp(28px, 4vw, 42px)", lineHeight: 1.12, fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</h2>
      {sub && <p className="mx-auto mt-3" style={{ color: MUTED, fontSize: 16, maxWidth: 520, lineHeight: 1.6 }}>{sub}</p>}
    </div>
  );
}

function PrimaryButton({ onClick, children, small }) {
  return (
    <button onClick={onClick} className="inline-flex items-center justify-center gap-2 rounded-full" style={{ background: "linear-gradient(135deg,#FFE29A,#F3B947)", color: INK, fontWeight: 700, fontSize: small ? 13 : 15, padding: small ? "9px 18px" : "15px 28px", boxShadow: "0 14px 32px -12px rgba(243,185,71,0.6)" }}>
      {children} {!small && <ArrowRight size={16} />}
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
        <div className="w-full h-full flex flex-col items-center justify-center px-8 text-center" style={{ background: "#FFFDF8", color: "#33294A" }}>
          <span style={{ fontSize: 22 }} className="mb-1">{meta.emoji}</span>
          <p className="mb-4" style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 15 }}>{meta.qrMessage}</p>
          <div className="p-4 rounded-2xl mb-5" style={{ background: "#FBF7EF", border: "1px solid #E3D9C6", marginTop: isXmas ? 22 : 0 }}>
            <div className="relative" style={{ width: 170, height: 170 }}>
              <img src={qrUrl} alt="Código QR de ejemplo" width={170} height={170} className="rounded-lg" />
              {isXmas && <img src={XMAS_DECOR_DATA_URL} alt="" aria-hidden="true" style={{ position: "absolute", left: -17, top: -37, width: 204, height: 39, pointerEvents: "none" }} />}
            </div>
          </div>
          <button onClick={reveal} className="rounded-full flex items-center gap-2" style={{ background: `#${accentHex}`, color: "#FFF", fontWeight: 700, fontSize: 13, padding: "11px 22px" }}>
            <QrCode size={15} /> Toca para escanear
          </button>
          <p className="rv-mono mt-3" style={{ color: "#8B80A6", fontSize: 10 }}>mira cómo se revela una cápsula</p>
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

/* ───────────── Ventana para ver un ejemplo ───────────── */
function Modal({ item, onClose, onCreate }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-4" style={{ background: "rgba(10,6,24,0.84)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <button onClick={onClose} aria-label="Cerrar" className="absolute rounded-full flex items-center justify-center" style={{ top: 14, right: 14, width: 40, height: 40, background: "rgba(255,255,255,0.14)" }}>
        <X size={18} color="#FFF" />
      </button>

      <div onClick={(e) => e.stopPropagation()} style={{ width: item.type === "story" ? 340 : 460, maxWidth: "94vw" }}>
        {item.type === "story" ? (
          <PhoneFrame width={340} height={680} style={{ maxHeight: "74vh" }}>
            <CapsuleStory order={item.story} />
          </PhoneFrame>
        ) : (
          <div style={{ borderRadius: 24, overflow: "hidden", background: "#000" }}>
            {item.video ? (
              <video src={item.video} poster={item.image} controls playsInline style={{ width: "100%", maxHeight: "70vh", display: "block" }} />
            ) : (
              <img src={item.image} alt={item.title || "Ejemplo"} style={{ width: "100%", maxHeight: "70vh", objectFit: "contain", display: "block" }} />
            )}
          </div>
        )}
        {item.type === "media" && item.title && <p className="text-center mt-3" style={{ color: "#FFF", fontWeight: 600, fontSize: 14 }}>{item.title}</p>}
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <PrimaryButton onClick={() => onCreate(item.key)}>Crear uno así</PrimaryButton>
      </div>
    </div>
  );
}

/* ───────────── Secciones ───────────── */
function SeasonBanner({ banner, onCreate }) {
  if (!banner) return null;
  return (
    <div className="w-full text-center px-4 py-2" style={{ background: `linear-gradient(90deg,#6C57F5,#B65CE6,${PINK})`, color: "#FFF", fontSize: 13, fontWeight: 600 }}>
      <span>{banner.text}</span>
      <button onClick={() => onCreate(banner.occasion)} className="ml-3 rounded-full px-3 py-1" style={{ background: "rgba(255,255,255,0.2)", fontSize: 12, fontWeight: 700 }}>Crear el mío</button>
    </div>
  );
}

function Nav({ onCreate }) {
  const links = [["#como-funciona", "Cómo funciona"], ["#trabajos", "Trabajos"], ["#testimonios", "Testimonios"], ["#versiones", "Versiones"], ["#preguntas", "Preguntas"]];
  return (
    <header className="sticky top-0 z-30" style={{ background: "rgba(20,16,42,0.74)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <div className={`${wrap} flex items-center justify-between py-3`}>
        <a href="#inicio" className="flex items-center gap-2">
          <span className="flex items-center justify-center rounded-xl" style={{ width: 34, height: 34, background: `linear-gradient(135deg,${VIOLET},${PINK})` }}><Sparkles size={16} color="#FFF" /></span>
          <span style={{ color: "#FFF", fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>Revela</span>
        </a>
        <nav className="hidden md:flex items-center gap-7">
          {links.map(([href, label]) => <a key={href} href={href} style={{ color: "#C9C1EA", fontSize: 14, fontWeight: 500 }}>{label}</a>)}
        </nav>
        <PrimaryButton small onClick={() => onCreate()}>Crear mi QR</PrimaryButton>
      </div>
    </header>
  );
}

function FloatChip({ children, style, cls = "" }) {
  return (
    <div className={`rv-float hidden md:flex items-center gap-2 rounded-2xl px-3 py-2 ${cls}`} style={{ position: "absolute", zIndex: 5, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: "#FFF", fontSize: 13, fontWeight: 600, ...style }}>
      {children}
    </div>
  );
}

function Hero({ banner, onCreate }) {
  const demoKey = banner?.occasion && DEMOS[banner.occasion] && banner.occasion !== "especial" ? banner.occasion : "cumpleanos";
  return (
    <section id="inicio" style={{ background: `radial-gradient(900px 520px at 82% 8%, rgba(139,124,255,0.38), transparent 62%), radial-gradient(700px 480px at 6% 92%, rgba(255,122,182,0.22), transparent 60%), ${INK}`, borderRadius: "0 0 44px 44px", position: "relative", overflow: "hidden" }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)", backgroundSize: "24px 24px", pointerEvents: "none" }} />
      <Nav onCreate={onCreate} />
      <div className={`${wrap} relative pt-14 pb-20 grid md:grid-cols-2 gap-14 items-center`}>
        <div>
          <Kicker dark>Cápsulas digitales con QR</Kicker>
          <h1 className="mt-5" style={{ color: "#FFF", fontSize: "clamp(38px, 6vw, 66px)", lineHeight: 1.04, fontWeight: 800, letterSpacing: "-0.035em" }}>
            Regala un recuerdo que se <span style={{ ...gradText, fontFamily: SERIF, fontStyle: "italic", fontWeight: 600 }}>revela</span> con un QR
          </h1>
          <p className="mt-6" style={{ color: "#C9C1EA", fontSize: 18, lineHeight: 1.6, maxWidth: 500 }}>
            Sube tus fotos, tu mensaje y tu canción. Recibe un QR para imprimir, pegar en un regalo o compartir. Quien lo escanea vive la sorpresa.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-9">
            <PrimaryButton onClick={() => onCreate(banner?.occasion)}>Crear mi QR</PrimaryButton>
            <a href="#trabajos" className="inline-flex items-center gap-2 rounded-full" style={{ color: "#FFF", fontWeight: 600, fontSize: 15, padding: "14px 24px", border: "1px solid rgba(255,255,255,0.25)" }}>Ver ejemplos</a>
          </div>
          <p className="mt-4" style={{ fontSize: 13, color: "#9D94C4" }}>Se abre con la cámara del celular · Sin apps · Listo en minutos</p>
          <div className="flex flex-wrap gap-3 mt-10">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-2xl px-4 py-3" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <p style={{ color: "#FFF", fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>{s.value}</p>
                <p style={{ color: "#9D94C4", fontSize: 12 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div aria-hidden="true" style={{ position: "absolute", left: "50%", top: "50%", width: 460, height: 460, transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(139,124,255,0.45), rgba(255,122,182,0.12) 55%, transparent 70%)", pointerEvents: "none" }} />
          <FloatChip style={{ top: 30, left: 0 }}>{"\u{1F4F8}"} Tus fotos</FloatChip>
          <FloatChip cls="d2" style={{ top: 120, right: 0 }}>{"\u{1F3B5}"} Tu canción</FloatChip>
          <FloatChip cls="d3" style={{ bottom: 110, left: 0 }}>{"\u{1F3AC}"} Video (Pro)</FloatChip>
          <FloatChip style={{ bottom: 30, right: 10 }}>{"\u{1F48C}"} Tu mensaje</FloatChip>
          <div className="relative" style={{ zIndex: 2 }}><HeroDemo demoKey={demoKey} /></div>
        </div>
      </div>
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
    <section id="como-funciona" className="py-24" style={{ background: BG }}>
      <div className={wrap}>
        <Reveal><SectionHead kicker="Cómo funciona" title="Tres pasos y listo" /></Reveal>
        <div className="grid md:grid-cols-3 gap-5">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.title} delay={i * 90}>
                <div className="rounded-3xl p-7 h-full" style={{ background: "#FFF", border: `1px solid ${BORDER}`, boxShadow: "0 18px 40px -26px rgba(20,16,42,0.25)" }}>
                  <div className="flex items-center justify-between mb-6">
                    <span className="flex items-center justify-center rounded-2xl" style={{ width: 48, height: 48, background: `linear-gradient(135deg,${VIOLET},${PINK})` }}><Icon size={22} color="#FFF" /></span>
                    <span style={{ ...gradText, background: `linear-gradient(135deg,${VIOLET},${PINK})`, WebkitBackgroundClip: "text", backgroundClip: "text", fontSize: 44, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }}>0{i + 1}</span>
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>{s.title}</h3>
                  <p className="mt-2" style={{ color: MUTED, fontSize: 15, lineHeight: 1.65 }}>{s.text}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Works({ onOpen }) {
  const [orders, setOrders] = useState({}); // código -> pedido

  useEffect(() => {
    const codes = WORKS.filter((w) => w.code).map((w) => w.code);
    if (!codes.length) return;
    let off = false;
    Promise.allSettled(codes.map((code) => getOrderByCode(code))).then((results) => {
      if (off) return;
      const map = {};
      results.forEach((r, i) => { if (r.status === "fulfilled" && r.value) map[codes[i]] = r.value; });
      setOrders(map);
    });
    return () => { off = true; };
  }, []);

  const items = [];
  WORKS.forEach((w) => {
    if (w.code) {
      const order = orders[w.code];
      if (!order) return;
      const meta = OCCASIONS[order.occasion] || OCCASIONS.especial;
      items.push({
        id: w.code, cover: order.photos?.[0]?.url, bg: (BACKGROUNDS[order.background] || BACKGROUNDS.crema).css,
        emoji: meta.emoji, label: meta.label, title: w.title || meta.label, hasVideo: Boolean(order.video_url), cta: "Ver cápsula",
        open: () => ({ type: "story", key: order.occasion, story: toStory(order) }),
      });
    } else if (w.image) {
      const meta = OCCASIONS[w.occasion];
      items.push({
        id: w.image, cover: w.image, emoji: meta?.emoji || "\u2728", label: meta?.label || "Ejemplo", title: w.title || meta?.label || "",
        hasVideo: Boolean(w.video), cta: w.video ? "Ver video" : "Ver foto",
        open: () => ({ type: "media", key: w.occasion, title: w.title, image: w.image, video: w.video }),
      });
    }
  });
  if (SHOW_DEMO_EXAMPLES) {
    Object.keys(DEMOS).forEach((key) => {
      const meta = OCCASIONS[key];
      items.push({
        id: `demo-${key}`, cover: null, bg: BACKGROUNDS[DEMOS[key].background].css, emoji: meta.emoji, label: "Ejemplo", title: meta.label, hasVideo: false, cta: "Ver ejemplo",
        open: () => ({ type: "story", key, story: demoStory(key) }),
      });
    });
  }
  if (!items.length) return null;

  return (
    <section id="trabajos" className="py-24" style={{ background: "#FFF" }}>
      <div className={wrap}>
        <Reveal><SectionHead kicker="Trabajos" title="Así se ven nuestras cápsulas" sub="Toca cualquiera y vívela como si hubieras escaneado el QR." /></Reveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((it, i) => (
            <Reveal key={it.id} delay={(i % 4) * 70}>
              <button onClick={() => onOpen(it.open())} className="rv-card relative block w-full text-left overflow-hidden" style={{ height: 260, borderRadius: 28, background: it.cover ? `#1d1740 url("${it.cover}") center/cover` : it.bg, boxShadow: "0 20px 40px -26px rgba(20,16,42,0.45)" }}>
                {!it.cover && <span aria-hidden="true" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, paddingBottom: 56 }}>{it.emoji}</span>}
                <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,16,42,0) 38%, rgba(20,16,42,0.82) 100%)" }} />
                <span className="absolute rounded-full px-3 py-1" style={{ top: 12, left: 12, background: "rgba(255,255,255,0.9)", color: INK, fontSize: 11, fontWeight: 700 }}>{it.emoji} {it.label}</span>
                {it.hasVideo && <span className="absolute rounded-full flex items-center justify-center" style={{ top: 12, right: 12, width: 28, height: 28, background: "rgba(20,16,42,0.7)" }}><Play size={12} color="#FFF" fill="#FFF" /></span>}
                <span className="absolute" style={{ left: 16, right: 16, bottom: 14, color: "#FFF" }}>
                  <span className="block" style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>{it.title}</span>
                  <span className="block mt-1" style={{ fontSize: 12, color: "#E2DCFF" }}>{it.cta} →</span>
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  if (!TESTIMONIALS.length) return null;
  return (
    <section id="testimonios" className="py-24" style={{ background: BG }}>
      <div className={wrap}>
        <Reveal><SectionHead kicker="Testimonios" title="Lo que dicen quienes ya sorprendieron" /></Reveal>
        <div className="rv-tgrid">
          {TESTIMONIALS.map((t, i) => (
            <figure key={i} className="rounded-3xl p-6 flex flex-col" style={{ background: "#FFF", border: `1px solid ${BORDER}`, boxShadow: "0 18px 40px -26px rgba(20,16,42,0.25)" }}>
              {t.image && <img src={t.image} alt={`Mensaje de ${t.name}`} loading="lazy" className="rounded-2xl mb-4 w-full object-cover" style={{ maxHeight: 240 }} />}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1" aria-label={`${t.stars || 5} estrellas`}>
                  {Array.from({ length: t.stars || 5 }).map((_, n) => <Star key={n} size={16} color="#F5B73C" fill="#F5B73C" />)}
                </div>
                {t.sample && <span className="rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 700, background: BG, color: MUTED }}>Ejemplo</span>}
              </div>
              <span aria-hidden="true" style={{ ...gradText, background: `linear-gradient(135deg,${VIOLET},${PINK})`, WebkitBackgroundClip: "text", backgroundClip: "text", fontFamily: SERIF, fontSize: 54, lineHeight: 0.6, height: 28 }}>“</span>
              <blockquote style={{ fontSize: 16, lineHeight: 1.65, flex: 1 }}>{t.text}</blockquote>
              <figcaption className="mt-5 pt-4 flex items-center gap-3" style={{ borderTop: `1px solid ${BORDER}` }}>
                <span className="flex items-center justify-center rounded-full" style={{ width: 38, height: 38, background: `linear-gradient(135deg,${VIOLET},${PINK})`, color: "#FFF", fontSize: 15, fontWeight: 700 }}>{(t.name || "?").charAt(0).toUpperCase()}</span>
                <span>
                  <span className="block" style={{ fontSize: 14, fontWeight: 700 }}>{t.name}</span>
                  <span className="block" style={{ fontSize: 12, color: MUTED }}>{flagOf(t.country)} {OCCASIONS[t.occasion]?.label || ""}</span>
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
  const basic = ["Fotos con texto opcional", "Canción de YouTube o tu propio audio", "Mensaje principal y mensaje final", "Fecha especial y fondo a tu gusto", "QR listo para imprimir, en tu correo"];
  const pro = ["Todo lo de la Versión Básica", "Un video dentro de tu cápsula (hasta 30 segundos)", "El momento más emotivo, en movimiento"];
  return (
    <section id="versiones" className="py-24" style={{ background: "#FFF" }}>
      <div className={wrap}>
        <Reveal><SectionHead kicker="Versiones" title="Elige cómo quieres sorprender" /></Reveal>
        <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
          <Reveal>
            <div className="rounded-3xl p-7 h-full flex flex-col" style={{ background: BG, border: `1px solid ${BORDER}` }}>
              <h3 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>Versión Básica</h3>
              <p className="mt-1" style={{ color: MUTED, fontSize: 14 }}>Fotos, música y mensajes.</p>
              <ul className="flex flex-col gap-3 mt-6 flex-1">
                {basic.map((item) => (
                  <li key={item} className="flex items-start gap-3" style={{ fontSize: 15, lineHeight: 1.5 }}>
                    <span className="flex items-center justify-center rounded-full" style={{ width: 20, height: 20, background: "rgba(139,124,255,0.18)", flexShrink: 0, marginTop: 1 }}><Check size={12} color="#5B49D6" /></span>{item}
                  </li>
                ))}
              </ul>
              <button onClick={() => onCreate()} className="mt-7 rounded-full" style={{ background: INK, color: "#FFF", fontWeight: 700, fontSize: 15, padding: "14px 20px" }}>Crear mi QR</button>
            </div>
          </Reveal>
          <Reveal delay={90}>
            <div className="h-full" style={{ padding: 1.5, borderRadius: 26, background: `linear-gradient(135deg,${VIOLET},${PINK},${GOLD})` }}>
              <div className="rounded-3xl p-7 h-full flex flex-col" style={{ background: `linear-gradient(160deg,${INK2},${INK})`, color: "#FFF" }}>
                <div className="flex items-center justify-between">
                  <h3 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>Versión Pro</h3>
                  <span className="rounded-full px-3 py-1" style={{ fontSize: 11, fontWeight: 800, background: "linear-gradient(135deg,#FFE29A,#F3B947)", color: INK }}>La más completa</span>
                </div>
                <p className="mt-1" style={{ color: "#B9B0DD", fontSize: 14 }}>Todo lo anterior, más video.</p>
                <ul className="flex flex-col gap-3 mt-6 flex-1">
                  {pro.map((item) => (
                    <li key={item} className="flex items-start gap-3" style={{ fontSize: 15, lineHeight: 1.5 }}>
                      <span className="flex items-center justify-center rounded-full" style={{ width: 20, height: 20, background: "rgba(243,201,105,0.2)", flexShrink: 0, marginTop: 1 }}><Check size={12} color={GOLD} /></span>{item}
                    </li>
                  ))}
                </ul>
                <div className="mt-7"><PrimaryButton onClick={() => onCreate()}>Crear mi QR</PrimaryButton></div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="preguntas" className="py-24" style={{ background: BG }}>
      <div className="max-w-3xl mx-auto px-6">
        <Reveal><SectionHead kicker="Preguntas frecuentes" title="Todo lo que quizá te estés preguntando" /></Reveal>
        <div className="flex flex-col gap-3">
          {FAQ.map((item, i) => (
            <Reveal key={item.q} delay={(i % 4) * 50}>
              <details className="rv-faq rounded-2xl" style={{ background: "#FFF", border: `1px solid ${BORDER}` }}>
                <summary className="flex items-center justify-between gap-4 px-6 py-5" style={{ fontSize: 16, fontWeight: 700 }}>
                  {item.q}
                  <span className="rv-plus flex items-center justify-center rounded-full" style={{ width: 28, height: 28, background: BG, flexShrink: 0, transition: "transform .2s" }}><Plus size={16} color="#5B49D6" /></span>
                </summary>
                <p className="px-6 pb-5" style={{ color: MUTED, fontSize: 15, lineHeight: 1.7 }}>{item.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ banner, onCreate }) {
  return (
    <section className="py-24 px-6" style={{ background: "#FFF" }}>
      <Reveal>
        <div className="max-w-5xl mx-auto text-center relative overflow-hidden" style={{ borderRadius: 40, padding: "64px 24px", background: "linear-gradient(135deg,#5B45F0 0%,#A855E8 52%,#FF7AB6 100%)", color: "#FFF" }}>
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.16) 1px, transparent 1px)", backgroundSize: "22px 22px", pointerEvents: "none" }} />
          <div className="relative">
            <h2 style={{ fontSize: "clamp(28px, 4.5vw, 46px)", lineHeight: 1.1, fontWeight: 800, letterSpacing: "-0.025em" }}>¿Listo para sorprender a alguien?</h2>
            <p className="mx-auto mt-4" style={{ opacity: 0.9, fontSize: 17, maxWidth: 460, lineHeight: 1.55 }}>Arma tu cápsula en minutos y recibe tu QR por correo.</p>
            <div className="mt-8">
              <button onClick={() => onCreate(banner?.occasion)} className="inline-flex items-center gap-2 rounded-full" style={{ background: "#FFF", color: INK, fontWeight: 800, fontSize: 16, padding: "16px 32px", boxShadow: "0 18px 40px -14px rgba(20,16,42,0.55)" }}>
                Crear mi QR <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  const wa = waLink("Hola! Quiero información sobre Revela");
  return (
    <footer className="px-6 py-10" style={{ background: INK, color: "#9D94C4", fontSize: 13 }}>
      <div className={`${wrap} flex flex-col md:flex-row items-center justify-between gap-4 px-0`}>
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center rounded-lg" style={{ width: 28, height: 28, background: `linear-gradient(135deg,${VIOLET},${PINK})` }}><Sparkles size={14} color="#FFF" /></span>
          <span style={{ color: "#FFF", fontWeight: 800, fontSize: 16 }}>Revela</span>
          <span className="ml-2">Un QR, un momento.</span>
        </div>
        <div className="flex items-center gap-5">
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#preguntas">Preguntas</a>
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
        </div>
        <p style={{ opacity: 0.7 }}>© {new Date().getFullYear()} Revela</p>
      </div>
    </footer>
  );
}

function WhatsAppFab() {
  const href = waLink("Hola! Quiero información sobre Revela");
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Escríbenos por WhatsApp" className="fixed z-40 rounded-full flex items-center justify-center" style={{ right: 18, bottom: 18, width: 56, height: 56, background: "#25D366", boxShadow: "0 12px 28px -8px rgba(0,0,0,0.45)" }}>
      <MessageCircle size={27} color="#FFF" />
    </a>
  );
}

/* ───────────── Página ───────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const banner = useMemo(() => activeBanner(), []);
  const [modal, setModal] = useState(null);

  const goCreate = (occasion) => navigate(occasion && OCCASIONS[occasion] ? `${CREATE_PATH}?ocasion=${occasion}` : CREATE_PATH);

  return (
    <div className="w-full min-h-screen" style={{ background: BG, color: INK, fontFamily: SANS }}>
      <style>{`${GOOGLE_FONTS_IMPORT}
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        html { scroll-behavior: smooth; }
        section[id] { scroll-margin-top: 72px; }
        .rv-mono { font-family: 'IBM Plex Mono', monospace; }
        .rv-scroll::-webkit-scrollbar { width: 4px; }
        .rv-scroll::-webkit-scrollbar-thumb { background: #E3D9C6; border-radius: 4px; }
        .rv-card { transition: transform .25s ease, box-shadow .25s ease; }
        .rv-card:hover { transform: translateY(-5px); }
        .rv-float { animation: rv-float 6s ease-in-out infinite alternate; }
        .rv-float.d2 { animation-delay: -2s; } .rv-float.d3 { animation-delay: -4s; }
        @keyframes rv-float { from { transform: translateY(0); } to { transform: translateY(-10px); } }
        @keyframes rv-sweep { 0% { transform: translateY(-110%); } 100% { transform: translateY(110%); } }
        .rv-faq summary { list-style: none; cursor: pointer; }
        .rv-faq summary::-webkit-details-marker { display: none; }
        .rv-faq[open] .rv-plus { transform: rotate(45deg); }
        .rv-faq[open] { box-shadow: 0 18px 40px -28px rgba(20,16,42,0.35); }
        .rv-tgrid { display: flex; gap: 16px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 10px; }
        .rv-tgrid::-webkit-scrollbar { display: none; }
        .rv-tgrid > * { flex: 0 0 86%; scroll-snap-align: center; }
        @media (min-width: 768px) {
          .rv-tgrid { display: grid; grid-template-columns: repeat(3, 1fr); overflow: visible; gap: 20px; }
          .rv-tgrid > * { flex: none; }
        }
        @media (prefers-reduced-motion: reduce) { .rv-float { animation: none; } html { scroll-behavior: auto; } }
      `}</style>

      <SeasonBanner banner={banner} onCreate={goCreate} />
      <Hero banner={banner} onCreate={goCreate} />
      <HowItWorks />
      <Works onOpen={setModal} />
      <Testimonials />
      <Versions onCreate={goCreate} />
      <Faq />
      <FinalCta banner={banner} onCreate={goCreate} />
      <Footer />
      <WhatsAppFab />

      {modal && <Modal item={modal} onClose={() => setModal(null)} onCreate={goCreate} />}
    </div>
  );
}
