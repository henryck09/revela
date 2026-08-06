import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Check, Share2, Download } from "lucide-react";
import { getOrderByCode } from "../services/orders";
import { ACCENTS, FONTS, BACKGROUNDS, OCCASIONS, PAGE_BG, TEXT_DARK, TEXT_MUTED } from "../lib/capsuleConfig";
import { buildCapsulePdf } from "../lib/buildCapsulePdf";
import CapsuleStory from "../components/CapsuleStory";

export default function RevealPage() {
  const { code } = useParams();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | scanning | revealed | error
  const [saveState, setSaveState] = useState("idle"); // idle | working | done | error
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getOrderByCode(code)
      .then((data) => { if (!cancelled) { setOrder(data); setStatus("scanning"); } })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [code]);

  useEffect(() => {
    if (status === "scanning") {
      const t = setTimeout(() => setStatus("revealed"), 1200);
      return () => clearTimeout(t);
    }
  }, [status]);

  const extFrom = (url, fallback) => {
    const clean = (url || "").split("?")[0];
    const ext = clean.split(".").pop();
    return ext && ext.length <= 5 ? ext : fallback;
  };

  async function fetchAsFile(url, filename) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("respuesta no válida");
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type || "application/octet-stream" });
  }

  function downloadFile(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleSaveAll() {
    if (!order || saveState === "working") return;
    setSaveState("working");
    try {
      const meta = OCCASIONS[order.occasion] || OCCASIONS.especial;
      const accentHex = ACCENTS[order.accent]?.hex || ACCENTS.sage.hex;

      // 1. Arma el PDF con el mensaje, la fecha, las fotos y el cierre
      const pdfBlob = await buildCapsulePdf(order, meta, accentHex);
      const files = [new File([pdfBlob], `capsula-${order.order_code || "revela"}.pdf`, { type: "application/pdf" })];

      // 2. El video (si lo hay) se incluye aparte, en el mismo envío
      if (order.video_url) {
        files.push(await fetchAsFile(order.video_url, `video-${order.order_code || "revela"}.${extFrom(order.video_url, "mp4")}`));
      }

      if (navigator.share && navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({ files, title: "Mi cápsula Revela" });
      } else {
        files.forEach((f, i) => setTimeout(() => downloadFile(f), i * 350));
      }
      setSaveState("done");
    } catch (e) {
      if (e && e.name === "AbortError") {
        setSaveState("idle");
        return;
      }
      console.error("Error guardando la cápsula:", e);
      setSaveState("error");
    }
    setTimeout(() => setSaveState("idle"), 3500);
  }

  if (status === "loading") {
    return (
      <Centered>
        <Loader2 size={28} className="animate-spin" color={TEXT_MUTED} />
      </Centered>
    );
  }

  if (status === "error" || !order) {
    return (
      <Centered>
        <p style={{ color: TEXT_DARK, fontSize: 15 }}>No encontramos esta cápsula, o todavía no ha sido aprobada.</p>
      </Centered>
    );
  }

  const meta = OCCASIONS[order.occasion] || OCCASIONS.especial;
  const accentHex = ACCENTS[order.accent]?.hex || ACCENTS.sage.hex;
  const fontDef = FONTS[order.font] || FONTS.fraunces;
  const storyBg =
    order.background === "custom" && order.custom_background_url
      ? { backgroundImage: `linear-gradient(180deg, rgba(251,247,239,0.55), rgba(251,247,239,0.9)), url(${order.custom_background_url})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: BACKGROUNDS[order.background]?.css || BACKGROUNDS.crema.css };

  return (
    <div style={{ background: "#0E0A1C", minHeight: "100vh" }} className="w-full flex flex-col items-center justify-center py-6 gap-4">
      <div className="relative overflow-hidden" style={{ width: 340, height: 680, maxWidth: "94vw", maxHeight: "82vh", background: "#0E0A1C", borderRadius: "2.5rem" }}>
        {status === "scanning" && (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "#FFFDF8" }}>
            <p className="rv-mono uppercase" style={{ color: `#${accentHex}`, fontSize: 12, letterSpacing: "0.1em" }}>revelando...</p>
          </div>
        )}
        {status === "revealed" && (
          <CapsuleStory
            order={{
              emoji: meta.emoji,
              accentHex,
              fontDef,
              specialDate: order.special_date,
              occasion: order.occasion,
              mainText: order.main_text,
              youtubeUrl: order.youtube_url,
              youtubeStart: order.youtube_start,
              songUrl: order.song_url,
              photos: order.photos || [],
              videoUrl: order.video_url,
              closingText: order.closing_text,
              storyBg,
            }}
          />
        )}
      </div>

      {status === "revealed" && (
        <>
          <button
            onClick={handleSaveAll}
            disabled={saveState === "working"}
            className="rv-mono uppercase flex items-center gap-2 rounded-full disabled:opacity-60"
            style={{ background: `#${accentHex}`, color: "#FFFDF8", fontSize: 11, letterSpacing: "0.05em", padding: "11px 22px" }}
          >
            {saveState === "working" && <Loader2 size={14} className="animate-spin" />}
            {saveState === "done" && <Check size={14} />}
            {saveState === "idle" && (canNativeShare ? <Share2 size={14} /> : <Download size={14} />)}
            {saveState === "error" && <Download size={14} />}
            {saveState === "working" && "armando tu cápsula..."}
            {saveState === "done" && "¡guardada!"}
            {saveState === "error" && "hubo un error, intenta de nuevo"}
            {saveState === "idle" && (canNativeShare ? "guardar mi cápsula" : "descargar mi cápsula")}
          </button>
          <p className="rv-mono" style={{ color: "#9A8FBD", fontSize: 9.5, textAlign: "center", maxWidth: 280, padding: "0 16px" }}>
            {canNativeShare
              ? "Se genera un PDF con todo tu mensaje y fotos (y el video si lo hay) — elige \"Guardar en Archivos\" o \"Guardar en Fotos\" en el menú."
              : "Se descarga un PDF con todo tu mensaje y fotos, y el video si lo hay."}
          </p>
        </>
      )}
    </div>
  );
}

function Centered({ children }) {
  return (
    <div style={{ background: PAGE_BG, minHeight: "100vh" }} className="w-full flex items-center justify-center">
      {children}
    </div>
  );
}
