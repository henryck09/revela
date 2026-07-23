import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { getOrderByCode } from "../services/orders";
import { ACCENTS, FONTS, BACKGROUNDS, OCCASIONS, PAGE_BG, TEXT_DARK, TEXT_MUTED } from "../lib/capsuleConfig";
import CapsuleStory from "../components/CapsuleStory";

export default function RevealPage() {
  const { code } = useParams();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | scanning | revealed | error

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
    <div style={{ background: "#0E0A1C", minHeight: "100vh" }} className="w-full flex items-center justify-center py-6">
      <div className="relative overflow-hidden" style={{ width: 340, height: 680, maxWidth: "94vw", maxHeight: "90vh", background: "#0E0A1C", borderRadius: "2.5rem" }}>
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
