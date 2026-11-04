import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Loader2, Clock } from "lucide-react";
import { supabase } from "../services/supabase";
import CapsuleStory from "../components/CapsuleStory";
import PreviewWatermark from "../components/PreviewWatermark";
import { OCCASIONS, ACCENTS, BACKGROUNDS, FONTS, PAGE_BG, TEXT_DARK, TEXT_MUTED, INPUT_BORDER } from "../lib/capsuleConfig";

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "";
const COUNTDOWN_SECONDS = 60; // 1 minuto (puedes cambiarlo a 600 para 10 min)

/**
 * Página pública /vista/:code — el cliente ve cómo quedó su cápsula (con marca
 * de agua) apenas hace el pedido, sin esperar a que se apruebe el pago.
 * Lee el pedido con la función SQL get_order_preview, que NO devuelve datos
 * personales (nombre, correo, WhatsApp, precio). Cuando el pedido se aprueba,
 * este mismo link redirige solo a la cápsula real (/m/:code).
 */
export default function PreviewPage() {
  const { code } = useParams();
  const [state, setState] = useState({ loading: true, order: null });
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    let off = false;
    supabase.rpc("get_order_preview", { p_code: (code || "").trim() }).then(({ data, error }) => {
      if (!off) setState({ loading: false, order: error ? null : data });
    });
    return () => { off = true; };
  }, [code]);

  // Lógica del contador persistente por pedido
  useEffect(() => {
    if (!state.order || state.order.payment_status === "APROBADO") return;

    const storageKey = `rv_timer_${state.order.order_code}`;
    let endTime = localStorage.getItem(storageKey);

    if (!endTime) {
      endTime = Date.now() + COUNTDOWN_SECONDS * 1000;
      localStorage.setItem(storageKey, endTime);
    } else {
      endTime = parseInt(endTime, 10);
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [state.order]);

  const { loading, order } = state;

  if (loading) {
    return <Screen><Loader2 className="animate-spin" size={24} color={TEXT_MUTED} /></Screen>;
  }
  if (!order) {
    return <Screen><Message title="No encontramos este pedido" text="Revisa que el link o el código estén completos. Si el problema sigue, escríbenos por WhatsApp." /></Screen>;
  }
  if (order.payment_status === "APROBADO") {
    return <Navigate to={`/m/${order.order_code}`} replace />;
  }
  if (order.payment_status === "RECHAZADO") {
    return <Screen><Message title="Este pedido no está disponible" text="Escríbenos por WhatsApp para ayudarte." /></Screen>;
  }

  const meta = OCCASIONS[order.occasion] || OCCASIONS.especial;
  const accentHex = (ACCENTS[order.accent] || ACCENTS[meta.accent]).hex;
  const fontDef = FONTS[order.font] || FONTS.fraunces;
  const storyBg =
    order.background === "custom" && order.custom_background_url
      ? {
          backgroundImage: `linear-gradient(180deg, rgba(251,247,239,0.55), rgba(251,247,239,0.9)), url(${order.custom_background_url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : { background: (BACKGROUNDS[order.background === "custom" ? "crema" : order.background] || BACKGROUNDS.crema).css };

  const waUrl = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Quiero confirmar el pago de mi cápsula ahora. Mi código es ${order.order_code}`)}`
    : null;

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const secs = String(timeLeft % 60).padStart(2, "0");
  const isUrgent = timeLeft <= 20;

  return (
    <Screen top>
      <div className="w-full text-center px-4 pt-4 pb-3" style={{ maxWidth: 420 }}>
        <div className="flex items-center justify-center gap-2">
          <p className="rv-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.1em", color: TEXT_MUTED }}>
            Vista previa · {order.order_code}
          </p>
          <span
            className="rv-mono inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
            style={{
              fontSize: 11,
              fontWeight: 600,
              background: isUrgent ? "#FEE2E2" : "#FEF3C7",
              color: isUrgent ? "#DC2626" : "#B45309",
              border: `1px solid ${isUrgent ? "#FCA5A5" : "#FDE68A"}`,
            }}
          >
            <Clock size={11} />
            {mins}:{secs}
          </span>
        </div>

        <p className="mt-1.5" style={{ fontSize: 12.5, color: TEXT_DARK, lineHeight: 1.5 }}>
          Así se verá tu cápsula.{" "}
          <strong style={{ color: isUrgent ? "#DC2626" : TEXT_DARK }}>
            {timeLeft > 0
              ? `Tienes ${mins}:${secs} antes de que sea eliminada.`
              : "¡Últimos segundos antes de que se elimine!"}
          </strong>{" "}
           ¡Págala ahora para activar tu versión final sin marca de agua en este mismo link!
        </p>

        {waUrl && (
          <a
            href={waUrl}
            className="inline-block mt-2.5 rounded-full shadow-sm transition-transform active:scale-95"
            style={{ background: `#${accentHex}`, color: "#FFF", fontWeight: 600, fontSize: 12, padding: "8px 18px" }}
          >
            Pagar ahora por WhatsApp
          </a>
        )}
      </div>

      <div className="relative overflow-hidden mx-auto mb-4" style={{ width: "100%", maxWidth: 420, height: "calc(100dvh - 175px)", minHeight: 480, border: `1px solid ${INPUT_BORDER}`, borderRadius: 24 }}>
        <CapsuleStory
          order={{
            emoji: meta.emoji,
            accentHex,
            fontDef,
            specialDate: order.special_date || "",
            occasion: order.occasion,
            mainText: order.main_text,
            youtubeUrl: order.youtube_url,
            youtubeStart: order.youtube_start || 0,
            songUrl: order.song_url,
            photos: order.photos || [],
            videoUrl: order.video_url,
            closingText: order.closing_text,
            storyBg,
          }}
        />
        <PreviewWatermark message="VISTA PREVIA · REALIZA EL PAGO" />
      </div>
    </Screen>
  );
}

function Screen({ children, top }) {
  return (
    <div style={{ background: PAGE_BG, minHeight: "100vh", color: TEXT_DARK, fontFamily: "'Space Grotesk', sans-serif" }} className={`w-full flex flex-col items-center ${top ? "" : "justify-center"}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,500&family=Playfair+Display:ital,wght@0,500;1,500&family=Cormorant+Garamond:ital,wght@0,500;1,500&family=Dancing+Script:wght@600;700&family=Caveat:wght@600;700&family=Quicksand:wght@500;700&family=Poppins:wght@500;600&family=Montserrat:wght@500;600&family=Space+Grotesk:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .rv-mono { font-family: 'IBM Plex Mono', monospace; }
        .rv-scroll::-webkit-scrollbar { width: 4px; }
        .rv-scroll::-webkit-scrollbar-thumb { background: #E3D9C6; border-radius: 4px; }
      `}</style>
      {children}
    </div>
  );
}

function Message({ title, text }) {
  return (
    <div className="text-center px-6" style={{ maxWidth: 360 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600 }}>{title}</h1>
      <p className="mt-2" style={{ fontSize: 13, color: TEXT_MUTED, lineHeight: 1.6 }}>{text}</p>
    </div>
  );
}