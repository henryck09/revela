import { useState, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import {
  QrCode, Upload, X, Sparkles, ImageIcon, Film,
  Calendar, Music2, Droplet, Type, Tag, User, Mail, Phone, Loader2, CheckCircle2,
} from "lucide-react";
import {
  OCCASIONS, ACCENTS, BACKGROUNDS, FONTS, TEXT_DARK, TEXT_MUTED, PANEL_BG,
  INPUT_BG, INPUT_BORDER, PAGE_BG, slugify, extractYoutubeId, yearsSince,
} from "../lib/capsuleConfig";
import CapsuleStory from "../components/CapsuleStory";
import { createOrder } from "../services/orders";
import { uploadPhotos, uploadFile } from "../services/mediaUpload";

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "";
const SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin;

// Límites de tamaño para no quedarnos sin espacio en el plan gratuito de Supabase (1 GB total)
const MAX_VIDEO_MB = 20;
const MAX_PHOTO_MB = 8;
const MAX_SONG_MB = 8;
const mb = (bytes) => bytes / (1024 * 1024);

export default function CreatorPage() {
  const [occasion, setOccasion] = useState("especial");
  const [accent, setAccent] = useState(OCCASIONS.especial.accent);
  const [background, setBackground] = useState("crema");
  const [customImage, setCustomImage] = useState(null); // { file, url }
  const [font, setFont] = useState("fraunces");
  const [mainText, setMainText] = useState(OCCASIONS.especial.suggestion);
  const [closingText, setClosingText] = useState("Gracias por ser parte de esta historia. Con cariño, siempre.");
  const [photoCount, setPhotoCount] = useState(2);
  const [photos, setPhotos] = useState([]); // { id, file, url, caption }
  const [video, setVideo] = useState(null); // { file, url }
  const [videoWarning, setVideoWarning] = useState("");
  const [specialDate, setSpecialDate] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeStart, setYoutubeStart] = useState(0);
  const [song, setSong] = useState(null); // { file, url }
  const [scanning, setScanning] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // Datos de contacto del cliente
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderDone, setOrderDone] = useState(null); // guarda el pedido creado

  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const songInputRef = useRef(null);

  const meta = OCCASIONS[occasion];
  const accentHex = ACCENTS[accent].hex;
  const fontDef = FONTS[font];
  const slug = useMemo(() => slugify(mainText.slice(0, 24) || meta.label), [mainText, meta.label]);
  const youtubeId = useMemo(() => extractYoutubeId(youtubeUrl), [youtubeUrl]);
  const years = yearsSince(specialDate);
  const price = video ? 7 : 5;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&qzone=1&data=${encodeURIComponent(SITE_URL + "/m/" + slug)}&bgcolor=FFFFFF&color=${accentHex}`;

  function selectOccasion(key) {
    setOccasion(key);
    setAccent(OCCASIONS[key].accent);
    if (!mainText || mainText === meta.suggestion) setMainText(OCCASIONS[key].suggestion);
  }

  function handlePhotoUpload(e) {
    const files = Array.from(e.target.files || []).slice(0, photoCount - photos.length);
    files.forEach((file) => {
      if (mb(file.size) > MAX_PHOTO_MB) {
        toast.error(`"${file.name}" pesa ${mb(file.size).toFixed(1)}MB. Comprime la foto (máx. ${MAX_PHOTO_MB}MB) e inténtalo de nuevo.`, { duration: 6000 });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => setPhotos((p) => [...p, { id: Math.random().toString(36).slice(2), file, url: reader.result, caption: "" }]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }
  function updateCaption(id, caption) { setPhotos((p) => p.map((ph) => (ph.id === id ? { ...ph, caption } : ph))); }
  function removePhoto(id) { setPhotos((p) => p.filter((ph) => ph.id !== id)); }
  function handlePhotoCount(n) { setPhotoCount(n); if (photos.length > n) setPhotos((p) => p.slice(0, n)); }

  function handleVideoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoWarning("");

    if (mb(file.size) > MAX_VIDEO_MB) {
      const msg = `Ese video pesa ${mb(file.size).toFixed(1)}MB y el máximo permitido es ${MAX_VIDEO_MB}MB. Comprime el video (por ejemplo con el compresor de tu celular, HandBrake, o una app como "Video Compressor") y vuelve a subirlo.`;
      toast.error(msg, { duration: 7000 });
      setVideoWarning(msg);
      e.target.value = "";
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    setVideo({ file, url: blobUrl });
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      if (v.duration && v.duration > 30) {
        setVideoWarning(`El video dura ${Math.round(v.duration)}s — recomendado recortarlo a 30s máx.`);
      }
    };
    v.src = blobUrl;
    e.target.value = "";
  }
  function removeVideo() {
    if (video?.url) URL.revokeObjectURL(video.url);
    setVideo(null);
    setVideoWarning("");
  }

  function handleSongUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (mb(file.size) > MAX_SONG_MB) {
      toast.error(`Ese audio pesa ${mb(file.size).toFixed(1)}MB. Comprime o recorta el mp3 (máx. ${MAX_SONG_MB}MB) e inténtalo de nuevo.`, { duration: 6000 });
      e.target.value = "";
      return;
    }
    if (song?.url) URL.revokeObjectURL(song.url);
    setSong({ file, url: URL.createObjectURL(file) });
    e.target.value = "";
  }
  function removeSong() {
    if (song?.url) URL.revokeObjectURL(song.url);
    setSong(null);
  }

  function handleCustomImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setCustomImage({ file, url: reader.result }); setBackground("custom"); };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function simulateScan() {
    setScanning(true);
    setTimeout(() => { setScanning(false); setRevealed(true); }, 1400);
  }
  function reset() { setRevealed(false); setScanning(false); }

  const hasMainPhoto = photos.length > 0;
  const storyBg =
    background === "custom" && customImage
      ? { backgroundImage: `linear-gradient(180deg, rgba(251,247,239,0.55), rgba(251,247,239,0.9)), url(${customImage.url})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: BACKGROUNDS[background === "custom" ? "crema" : background].css };

  function validateContact() {
    if (!fullName.trim()) return "Ingresa tu nombre completo.";
    if (!/^\S+@\S+\.\S+$/.test(email)) return "Ingresa un correo electrónico válido.";
    if (whatsapp.replace(/\D/g, "").length < 8) return "Ingresa un número de WhatsApp válido (con código de país).";
    if (!hasMainPhoto) return "Sube al menos una foto antes de continuar.";
    return null;
  }

  async function handleConfirm() {
    const err = validateContact();
    if (err) { toast.error(err); return; }
    if (!WHATSAPP_NUMBER) {
      toast.error("Falta configurar el número de WhatsApp del negocio (VITE_WHATSAPP_NUMBER).");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Subiendo tus fotos y datos...");
    try {
      const uploadedPhotos = await uploadPhotos(photos);
      const videoUrl = video ? await uploadFile(video.file, "videos") : null;
      const songUrl = song ? await uploadFile(song.file, "songs") : null;
      const customBgUrl = background === "custom" && customImage ? await uploadFile(customImage.file, "backgrounds") : null;

      const order = await createOrder({
        full_name: fullName,
        email,
        whatsapp,
        occasion,
        accent,
        background,
        custom_background_url: customBgUrl,
        font,
        main_text: mainText,
        closing_text: closingText,
        special_date: specialDate,
        youtube_url: youtubeUrl,
        youtube_start: youtubeStart,
        song_url: songUrl,
        photos: uploadedPhotos,
        video_url: videoUrl,
        price,
      });

      toast.success("¡Pedido guardado! Redirigiendo a WhatsApp...", { id: toastId });
      setOrderDone(order);

      const message =
        `Hola! Quiero confirmar el pago de mi cápsula Revela 🎁\n` +
        `Código de pedido: ${order.order_code}\n` +
        `Monto: $${price}\n` +
        `Te envío la captura de pago a continuación.`;
      const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
      setTimeout(() => { window.location.href = waUrl; }, 900);
    } catch (e) {
      console.error(e);
      toast.error("Algo salió mal guardando tu pedido. Intenta de nuevo.", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  }

  if (orderDone) {
    return (
      <div style={{ background: PAGE_BG, minHeight: "100vh", color: TEXT_DARK }} className="w-full flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center rounded-2xl p-8" style={{ background: PANEL_BG, border: `1px solid ${INPUT_BORDER}` }}>
          <CheckCircle2 size={40} color={`#${accentHex}`} className="mx-auto mb-4" />
          <h2 className="mb-2" style={{ fontSize: 22, fontWeight: 600 }}>¡Pedido recibido!</h2>
          <p className="rv-mono mb-1" style={{ color: TEXT_MUTED, fontSize: 12 }}>Código de pedido</p>
          <p className="mb-4" style={{ fontSize: 20, fontFamily: fontDef.css }}>{orderDone.order_code}</p>
          <p style={{ color: TEXT_MUTED, fontSize: 13, lineHeight: 1.6 }}>
            Te llevamos a WhatsApp para que envíes la captura de tu pago. En cuanto lo confirmemos,
            recibirás un correo en <b>{email}</b> con tu QR final listo para usar.
          </p>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola! Mi código de pedido es ${orderDone.order_code}`)}`}
            className="inline-block mt-5 rounded-full"
            style={{ background: `#${accentHex}`, color: "#FFF", fontWeight: 600, fontSize: 13, padding: "10px 22px" }}
          >
            Abrir WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: PAGE_BG, minHeight: "100vh", color: TEXT_DARK, fontFamily: "'Space Grotesk', sans-serif" }} className="w-full">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,500&family=Playfair+Display:ital,wght@0,500;1,500&family=Cormorant+Garamond:ital,wght@0,500;1,500&family=Dancing+Script:wght@600;700&family=Caveat:wght@600;700&family=Quicksand:wght@500;600&family=Poppins:wght@500;600&family=Montserrat:wght@500;600&family=Space+Grotesk:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .rv-mono { font-family: 'IBM Plex Mono', monospace; }
        .rv-scroll::-webkit-scrollbar { width: 4px; }
        .rv-scroll::-webkit-scrollbar-thumb { background: #E3D9C6; border-radius: 4px; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.35); }
        @keyframes rv-sweep { 0% { transform: translateY(-110%); } 100% { transform: translateY(110%); } }
        @keyframes rv-fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .rv-fade { animation: rv-fadein .6s ease both; }
      `}</style>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-10 rv-fade">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-full" style={{ width: 34, height: 34, background: `#${accentHex}22`, border: `1px solid #${accentHex}66` }}>
              <Sparkles size={16} color={`#${accentHex}`} />
            </div>
            <span className="rv-mono uppercase" style={{ color: TEXT_MUTED, fontSize: 12, letterSpacing: "0.1em" }}>Revela</span>
          </div>
          <span className="rv-mono" style={{ color: TEXT_MUTED, fontSize: 12 }}>un qr, un momento</span>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          {/* LEFT: creation form */}
          <div className="rv-fade rounded-2xl p-6" style={{ background: PANEL_BG, border: `1px solid ${INPUT_BORDER}` }}>
            <h1 className="mb-2" style={{ fontFamily: fontDef.css, fontStyle: fontDef.italic ? "italic" : "normal", fontSize: 32, lineHeight: 1.15 }}>Crea tu cápsula</h1>
            <p className="mb-8" style={{ color: TEXT_MUTED, fontSize: 14 }}>Elige la ocasión, sube tus fotos y video, y arma tu mensaje paso a paso.</p>

            <Section num="1" title="¿Cuál es la ocasión?">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(OCCASIONS).map(([key, o]) => {
                  const Icon = o.icon; const active = occasion === key;
                  return (
                    <button key={key} onClick={() => selectOccasion(key)} className="flex items-center gap-2 rounded-lg px-3 py-3 text-left"
                      style={{ background: active ? `#${ACCENTS[o.accent].hex}1A` : INPUT_BG, border: `1px solid ${active ? "#" + ACCENTS[o.accent].hex + "77" : INPUT_BORDER}` }}>
                      <Icon size={16} color={active ? `#${ACCENTS[o.accent].hex}` : TEXT_MUTED} />
                      <span style={{ fontSize: 13, color: active ? TEXT_DARK : TEXT_MUTED }}>{o.label}</span>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section num="2" title="Fondo del mensaje">
              <p className="rv-mono mb-2" style={{ color: TEXT_MUTED, fontSize: 11 }}>Elige un fondo claro o usa tu propia imagen</p>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(BACKGROUNDS).map(([key, b]) => (
                  <button key={key} onClick={() => setBackground(key)} title={b.label} className="rounded-lg"
                    style={{ width: 40, height: 40, background: b.css, outline: background === key ? `2px solid ${TEXT_DARK}` : `1px solid ${INPUT_BORDER}`, outlineOffset: 2 }} />
                ))}
                {customImage && (
                  <button onClick={() => setBackground("custom")} title="Mi imagen" className="rounded-lg overflow-hidden"
                    style={{ width: 40, height: 40, outline: background === "custom" ? `2px solid ${TEXT_DARK}` : `1px solid ${INPUT_BORDER}`, outlineOffset: 2 }}>
                    <img src={customImage.url} alt="" className="w-full h-full object-cover" />
                  </button>
                )}
                <button onClick={() => imageInputRef.current?.click()} className="rounded-lg flex items-center justify-center" style={{ width: 40, height: 40, border: `1px dashed #${accentHex}88`, color: `#${accentHex}` }}>
                  <Droplet size={15} />
                </button>
              </div>
              <input ref={imageInputRef} type="file" accept="image/*" onChange={handleCustomImage} className="hidden" />
            </Section>

            <Section num="3" title="Tipo de letra">
              <div className="flex gap-2 flex-wrap">
                {Object.entries(FONTS).map(([key, f]) => (
                  <button key={key} onClick={() => setFont(key)} className="rounded-lg px-3 py-2"
                    style={{ background: font === key ? `#${accentHex}1A` : INPUT_BG, border: `1px solid ${font === key ? "#" + accentHex + "77" : INPUT_BORDER}`, fontFamily: f.css, fontStyle: f.italic ? "italic" : "normal", fontSize: 15, color: TEXT_DARK }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </Section>

            <Section num="4" title="Fotos (máximo 4, con texto opcional)">
              <div className="flex gap-2 mb-3">
                {[1, 2, 3, 4].map((n) => (
                  <button key={n} onClick={() => handlePhotoCount(n)} className="rounded-full flex items-center justify-center" style={{ width: 30, height: 30, background: photoCount === n ? `#${accentHex}` : INPUT_BG, color: photoCount === n ? "#FFF" : TEXT_MUTED, fontSize: 13, border: `1px solid ${INPUT_BORDER}` }}>{n}</button>
                ))}
              </div>
              <div className="flex flex-col gap-2 mb-2">
                {photos.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <img src={p.url} alt="" className="rounded-lg object-cover" style={{ width: 48, height: 48 }} />
                    <input value={p.caption} onChange={(e) => updateCaption(p.id, e.target.value)} placeholder={i === 0 ? "Texto para la foto principal (opcional)" : "Texto para esta foto (opcional)"} className="flex-1 rounded-lg px-3 py-2 outline-none" style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, color: TEXT_DARK, fontSize: 12 }} />
                    <button onClick={() => removePhoto(p.id)}><X size={14} color={TEXT_MUTED} /></button>
                  </div>
                ))}
                {photos.length < photoCount && (
                  <button onClick={() => photoInputRef.current?.click()} className="flex items-center justify-center gap-2 rounded-lg py-2" style={{ border: `1px dashed #${accentHex}88`, color: `#${accentHex}`, fontSize: 12 }}>
                    <Upload size={13} /> Subir foto ({photos.length}/{photoCount})
                  </button>
                )}
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
            </Section>

            <Section num="5" title={meta.dateLabel}>
              <div className="flex items-center gap-2">
                <Calendar size={15} color={TEXT_MUTED} />
                <input type="date" value={specialDate} onChange={(e) => setSpecialDate(e.target.value)} className="rounded-lg px-3 py-2 outline-none" style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, color: TEXT_DARK, fontSize: 13 }} />
              </div>
              {specialDate && years !== null && (occasion === "cumpleanos" || occasion === "aniversario") && (
                <p className="rv-mono mt-2" style={{ color: `#${accentHex}`, fontSize: 11 }}>Se mostrará automáticamente: "{years} {years === 1 ? "año" : "años"}"</p>
              )}
            </Section>

            <Section num="6" title="Canción (primeros 30 segundos)">
              <div className="flex items-center gap-2 mb-2">
                <Music2 size={15} color={TEXT_MUTED} />
                <input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="Pega el link de YouTube" className="flex-1 rounded-lg px-3 py-2 outline-none" style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, color: TEXT_DARK, fontSize: 12 }} />
              </div>
              {youtubeId && (
                <div className="flex items-center gap-2">
                  <span className="rv-mono" style={{ color: TEXT_MUTED, fontSize: 11 }}>Empieza en (seg.)</span>
                  <input type="number" min="0" value={youtubeStart} onChange={(e) => setYoutubeStart(Number(e.target.value))} className="rounded-lg px-2 py-1 outline-none" style={{ width: 64, background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, color: TEXT_DARK, fontSize: 12 }} />
                </div>
              )}
              {!youtubeId && youtubeUrl && <p className="rv-mono mt-2" style={{ color: "#B5545F", fontSize: 10 }}>No reconozco ese link, revisa que sea una URL de YouTube válida.</p>}

              <div className="mt-3 pt-3" style={{ borderTop: `1px dashed ${INPUT_BORDER}` }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => songInputRef.current?.click()} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, fontSize: 11.5, color: TEXT_MUTED }}>
                    <Music2 size={12} /> {song ? "Cambiar audio (mp3)" : "Subir un mp3 corto (opcional)"}
                  </button>
                  {song && (
                    <>
                      <span className="rv-mono" style={{ fontSize: 10, color: `#${accentHex}` }}>✓ agregado</span>
                      <button onClick={removeSong}><X size={13} color={TEXT_MUTED} /></button>
                    </>
                  )}
                </div>
              </div>
              <input ref={songInputRef} type="file" accept="audio/*" onChange={handleSongUpload} className="hidden" />
            </Section>

            <Section num="7" title="Texto principal">
              <textarea value={mainText} onChange={(e) => setMainText(e.target.value)} rows={3} className="w-full rounded-lg px-4 py-3 outline-none resize-none" style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, color: TEXT_DARK, fontSize: 13, lineHeight: 1.6 }} />
            </Section>

            <Section num="8" title="Texto final">
              <textarea value={closingText} onChange={(e) => setClosingText(e.target.value)} rows={2} className="w-full rounded-lg px-4 py-3 outline-none resize-none" style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, color: TEXT_DARK, fontSize: 13, lineHeight: 1.6 }} />
            </Section>

            <Section num="9" title="Video (máx. 30 segundos, antes del texto final)">
              <button onClick={() => videoInputRef.current?.click()} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, fontSize: 12, color: TEXT_MUTED }}>
                <Film size={13} /> {video ? "Cambiar video" : "Subir video"}
              </button>
              <p className="rv-mono mt-2" style={{ color: TEXT_MUTED, fontSize: 10 }}>Peso máximo {MAX_VIDEO_MB}MB. Si tu celular graba en 4K, comprime el video antes de subirlo.</p>
              {video && (
                <div className="flex items-center gap-2 mt-2">
                  <video src={video.url} className="rounded-lg" style={{ width: 120, height: 68, objectFit: "cover" }} muted />
                  <span className="rv-mono" style={{ fontSize: 10, color: `#${accentHex}` }}>✓ agregado</span>
                  <button onClick={removeVideo}><X size={14} color={TEXT_MUTED} /></button>
                </div>
              )}
              {videoWarning && <p className="rv-mono mt-2" style={{ color: "#B5545F", fontSize: 10 }}>{videoWarning}</p>}
              <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
            </Section>

            <Section num="•" title="Color de acento del QR">
              <div className="flex gap-2">
                {Object.entries(ACCENTS).map(([key, val]) => (
                  <button key={key} onClick={() => setAccent(key)} className="rounded-full" style={{ width: 28, height: 28, background: `#${val.hex}`, outline: accent === key ? `2px solid ${TEXT_DARK}` : "none", outlineOffset: 2 }} aria-label={val.label} />
                ))}
              </div>
            </Section>

            <Section num="10" title="Tus datos de contacto">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}` }}>
                  <User size={14} color={TEXT_MUTED} />
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nombre completo" className="flex-1 bg-transparent outline-none" style={{ color: TEXT_DARK, fontSize: 13 }} />
                </div>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}` }}>
                  <Mail size={14} color={TEXT_MUTED} />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo electrónico (para enviarte el QR final)" className="flex-1 bg-transparent outline-none" style={{ color: TEXT_DARK, fontSize: 13 }} />
                </div>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}` }}>
                  <Phone size={14} color={TEXT_MUTED} />
                  <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="Tu WhatsApp, con código de país (Ej: 5939...)" className="flex-1 bg-transparent outline-none" style={{ color: TEXT_DARK, fontSize: 13 }} />
                </div>
              </div>
            </Section>

            <div className="rounded-xl p-5 mt-2" style={{ background: `#${accentHex}12`, border: `1px solid #${accentHex}44` }}>
              <div className="flex items-center gap-2 mb-3">
                <Tag size={14} color={`#${accentHex}`} />
                <span className="rv-mono uppercase" style={{ fontSize: 11, letterSpacing: "0.08em", color: TEXT_DARK }}>Resumen y precio</span>
              </div>
              <ul style={{ fontSize: 12, color: TEXT_MUTED, lineHeight: 1.9 }}>
                <li>• Ocasión: <span style={{ color: TEXT_DARK }}>{meta.label}</span></li>
                <li>• Fotos: <span style={{ color: TEXT_DARK }}>{photos.length} de {photoCount}</span></li>
                <li>• Canción: <span style={{ color: TEXT_DARK }}>{youtubeId ? "sí" : "no"}</span></li>
                <li>• Video: <span style={{ color: TEXT_DARK }}>{video ? "sí (incluido)" : "no"}</span></li>
              </ul>
              <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid #${accentHex}33` }}>
                <span style={{ fontSize: 13, color: TEXT_DARK }}>{video ? "Fotos + video" : "Solo fotos"}</span>
                <span style={{ fontSize: 22, fontFamily: fontDef.css, fontStyle: fontDef.italic ? "italic" : "normal", color: `#${accentHex}` }}>${price}</span>
              </div>
              <p className="rv-mono mt-2" style={{ fontSize: 9.5, color: TEXT_MUTED }}>Referencial: $5 solo con fotos · $7 con fotos + video.</p>

              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="w-full mt-4 rounded-full flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: `#${accentHex}`, color: "#FFF", fontWeight: 600, fontSize: 14, padding: "12px 20px" }}
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
                {submitting ? "Procesando..." : "Confirmar y pagar por WhatsApp"}
              </button>
              <p className="rv-mono mt-2 text-center" style={{ fontSize: 9.5, color: TEXT_MUTED }}>
                Te llevaremos a WhatsApp para enviar tu captura de pago. Tu QR final llega por correo tras la aprobación.
              </p>
            </div>
          </div>

          {/* RIGHT: phone preview */}
          <div className="flex flex-col items-center rv-fade">
            <div className="relative overflow-hidden" style={{ width: 300, height: 600, background: "#0E0A1C", border: "8px solid #241D3F", borderRadius: "2.5rem", boxShadow: "0 30px 60px -20px rgba(0,0,0,0.5)" }}>
              <div className="absolute top-0 left-1/2 z-20" style={{ width: 120, height: 20, background: "#241D3F", borderRadius: "0 0 12px 12px", transform: "translateX(-50%)" }} />

              {!revealed && !scanning && (
                <div className="w-full h-full flex flex-col items-center justify-center px-8 text-center" style={{ background: "#FFFDF8" }}>
                  <span style={{ fontSize: 22 }} className="mb-1">{meta.emoji}</span>
                  <p className="mb-4" style={{ fontFamily: fontDef.css, fontStyle: fontDef.italic ? "italic" : "normal", fontSize: 15, color: TEXT_DARK }}>{meta.qrMessage}</p>
                  <div className="p-4 rounded-2xl mb-4" style={{ background: "#FBF7EF", border: `1px solid ${INPUT_BORDER}` }}>
                    <img src={qrUrl} alt="Código QR" width={170} height={170} className="rounded-lg" />
                  </div>
                  <p className="rv-mono" style={{ color: TEXT_MUTED, fontSize: 10 }}>{SITE_URL.replace(/^https?:\/\//, "")}/m/{slug}</p>
                  <button onClick={simulateScan} disabled={!hasMainPhoto} className="mt-6 rounded-full flex items-center gap-2 disabled:opacity-40" style={{ background: `#${accentHex}`, color: "#FFF", fontWeight: 600, fontSize: 13, padding: "10px 20px" }}>
                    <QrCode size={15} /> Simular escaneo
                  </button>
                  {!hasMainPhoto && <p className="rv-mono mt-3" style={{ color: TEXT_MUTED, fontSize: 10 }}>sube al menos una foto</p>}
                </div>
              )}

              {scanning && (
                <div className="w-full h-full relative flex items-center justify-center overflow-hidden" style={{ background: "#FFFDF8" }}>
                  <div className="absolute left-0 right-0" style={{ height: "40%", background: `linear-gradient(180deg, transparent, #${accentHex}33, transparent)`, animation: "rv-sweep 1.4s ease-in-out" }} />
                  <p className="rv-mono uppercase" style={{ color: `#${accentHex}`, fontSize: 12, letterSpacing: "0.1em" }}>revelando...</p>
                </div>
              )}

              {revealed && hasMainPhoto && (
                <CapsuleStory
                  onBack={reset}
                  order={{
                    emoji: meta.emoji, accentHex, fontDef, specialDate, occasion, mainText,
                    youtubeUrl, youtubeStart, songUrl: song?.url, photos, videoUrl: video?.url,
                    closingText, storyBg,
                  }}
                />
              )}
            </div>

            <div className="flex items-center gap-4 mt-6 rv-mono" style={{ color: TEXT_MUTED, fontSize: 10 }}>
              <span className="flex items-center gap-1"><ImageIcon size={11} /> fotos</span>
              <span className="flex items-center gap-1"><Film size={11} /> video</span>
              <span className="flex items-center gap-1"><Type size={11} /> tipografía</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ num, title, children }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="rv-mono flex items-center justify-center rounded-full" style={{ width: 20, height: 20, background: INPUT_BG, color: TEXT_MUTED, fontSize: 10 }}>{num}</span>
        <span className="rv-mono uppercase" style={{ color: TEXT_MUTED, fontSize: 11, letterSpacing: "0.08em" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}
