import { useState, useRef } from "react";
import toast from "react-hot-toast";
import { X, Upload, Loader2, Film, Music2 } from "lucide-react";
import { updateOrder } from "../services/orders";
import { uploadFile } from "../services/mediaUpload";
import { PANEL_BG, INPUT_BG, INPUT_BORDER, TEXT_DARK, TEXT_MUTED } from "../lib/capsuleConfig";

const MAX_PHOTOS = 4;
const MAX_VIDEO_MB = 20;
const MAX_PHOTO_MB = 8;
const MAX_SONG_MB = 8;
const mb = (bytes) => bytes / (1024 * 1024);

/**
 * Ventana modal para editar un pedido existente desde el panel admin:
 * texto principal/final, canción (YouTube o audio propio), fotos y video.
 * Los archivos nuevos se suben a Storage al guardar; los que no se tocan
 * conservan su URL original (no se vuelven a subir).
 */
export default function EditOrderModal({ order, onClose, onSaved }) {
  const [mainText, setMainText] = useState(order.main_text || "");
  const [closingText, setClosingText] = useState(order.closing_text || "");
  const [youtubeUrl, setYoutubeUrl] = useState(order.youtube_url || "");
  const [youtubeStart, setYoutubeStart] = useState(order.youtube_start || 0);
  const [photos, setPhotos] = useState(
    (order.photos || []).map((p, i) => ({ id: `existing-${i}`, url: p.url, caption: p.caption || "", file: null }))
  );
  const [video, setVideo] = useState(order.video_url ? { url: order.video_url, file: null, existing: true } : null);
  const [song, setSong] = useState(order.song_url ? { url: order.song_url, file: null, existing: true } : null);
  const [removeVideo, setRemoveVideo] = useState(false);
  const [removeSong, setRemoveSong] = useState(false);
  const [saving, setSaving] = useState(false);

  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const songInputRef = useRef(null);

  function handleAddPhoto(e) {
    const files = Array.from(e.target.files || []).slice(0, MAX_PHOTOS - photos.length);
    files.forEach((file) => {
      if (mb(file.size) > MAX_PHOTO_MB) {
        toast.error(`"${file.name}" pesa demasiado (máx. ${MAX_PHOTO_MB}MB).`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () =>
        setPhotos((p) => [...p, { id: Math.random().toString(36).slice(2), url: reader.result, caption: "", file }]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }
  function removePhoto(id) { setPhotos((p) => p.filter((ph) => ph.id !== id)); }
  function updateCaption(id, caption) { setPhotos((p) => p.map((ph) => (ph.id === id ? { ...ph, caption } : ph))); }

  function handleVideoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (mb(file.size) > MAX_VIDEO_MB) { toast.error(`El video pesa demasiado (máx. ${MAX_VIDEO_MB}MB).`); return; }
    setVideo({ url: URL.createObjectURL(file), file, existing: false });
    setRemoveVideo(false);
    e.target.value = "";
  }
  function handleSongChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (mb(file.size) > MAX_SONG_MB) { toast.error(`El audio pesa demasiado (máx. ${MAX_SONG_MB}MB).`); return; }
    setSong({ url: URL.createObjectURL(file), file, existing: false });
    setRemoveSong(false);
    e.target.value = "";
  }

  async function handleSave() {
    setSaving(true);
    const toastId = toast.loading("Guardando cambios...");
    try {
      const finalPhotos = [];
      for (const ph of photos) {
        if (ph.file) {
          const url = await uploadFile(ph.file, "photos");
          finalPhotos.push({ url, caption: ph.caption });
        } else {
          finalPhotos.push({ url: ph.url, caption: ph.caption });
        }
      }

      let videoUrl = order.video_url || null;
      if (removeVideo) videoUrl = null;
      else if (video?.file) videoUrl = await uploadFile(video.file, "videos");

      let songUrl = order.song_url || null;
      if (removeSong) songUrl = null;
      else if (song?.file) songUrl = await uploadFile(song.file, "songs");

      await updateOrder(order.id, {
        main_text: mainText,
        closing_text: closingText,
        youtube_url: youtubeUrl || null,
        youtube_start: youtubeStart || 0,
        photos: finalPhotos,
        video_url: videoUrl,
        song_url: songUrl,
      });

      toast.success("Pedido actualizado.", { id: toastId });
      onSaved();
    } catch (e) {
      console.error("No se pudo actualizar el pedido:", e);
      toast.error("No se pudo guardar. Intenta de nuevo.", { id: toastId });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(20,15,35,0.55)" }}>
      <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: PANEL_BG, maxHeight: "90vh", overflowY: "auto" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: 18, fontWeight: 600, color: TEXT_DARK }}>Editar pedido {order.order_code}</h2>
          <button onClick={onClose}><X size={18} color={TEXT_MUTED} /></button>
        </div>

        <FieldLabel>Texto principal</FieldLabel>
        <textarea
          value={mainText} onChange={(e) => setMainText(e.target.value)} rows={3}
          className="w-full rounded-lg px-3 py-2 mb-4 mt-1 outline-none"
          style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, fontSize: 13, color: TEXT_DARK }}
        />

        <FieldLabel>Texto final</FieldLabel>
        <textarea
          value={closingText} onChange={(e) => setClosingText(e.target.value)} rows={2}
          className="w-full rounded-lg px-3 py-2 mb-4 mt-1 outline-none"
          style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, fontSize: 13, color: TEXT_DARK }}
        />

        <FieldLabel>Canción (YouTube)</FieldLabel>
        <div className="flex items-center gap-2 mb-4 mt-1">
          <Music2 size={14} color={TEXT_MUTED} />
          <input
            value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="Link de YouTube"
            className="flex-1 rounded-lg px-3 py-2 outline-none" style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, fontSize: 12, color: TEXT_DARK }}
          />
          <input
            type="number" value={youtubeStart} onChange={(e) => setYoutubeStart(Number(e.target.value))}
            className="rounded-lg px-2 py-2 outline-none" style={{ width: 60, background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, fontSize: 12, color: TEXT_DARK }}
          />
        </div>

        <FieldLabel>Audio propio (opcional, reemplaza a YouTube)</FieldLabel>
        <div className="flex items-center gap-2 mb-4 mt-1">
          <button onClick={() => songInputRef.current?.click()} className="rounded-lg px-3 py-2" style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, fontSize: 11, color: TEXT_MUTED }}>
            {song ? "Cambiar audio" : "Subir audio"}
          </button>
          {song && !removeSong && (
            <>
              <span style={{ fontSize: 11, color: TEXT_MUTED }}>✓ {song.existing ? "actual" : "nuevo"}</span>
              <button onClick={() => setRemoveSong(true)}><X size={13} color={TEXT_MUTED} /></button>
            </>
          )}
          {removeSong && <span style={{ fontSize: 11, color: "#B5545F" }}>se eliminará al guardar</span>}
        </div>
        <input ref={songInputRef} type="file" accept="audio/*" onChange={handleSongChange} className="hidden" />

        <FieldLabel>{`Fotos (${photos.length}/${MAX_PHOTOS})`}</FieldLabel>
        <div className="flex flex-col gap-2 mb-4 mt-1">
          {photos.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <img src={p.url} alt="" className="rounded-lg object-cover" style={{ width: 44, height: 44 }} />
              <input
                value={p.caption} onChange={(e) => updateCaption(p.id, e.target.value)} placeholder="Texto de la foto (opcional)"
                className="flex-1 rounded-lg px-2 py-1.5 outline-none" style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, fontSize: 11, color: TEXT_DARK }}
              />
              <button onClick={() => removePhoto(p.id)}><X size={13} color={TEXT_MUTED} /></button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button onClick={() => photoInputRef.current?.click()} className="flex items-center justify-center gap-2 rounded-lg py-2" style={{ border: `1px dashed ${INPUT_BORDER}`, fontSize: 11, color: TEXT_MUTED }}>
              <Upload size={12} /> Agregar foto
            </button>
          )}
        </div>
        <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={handleAddPhoto} className="hidden" />

        <FieldLabel>Video</FieldLabel>
        <div className="flex items-center gap-2 mb-6 mt-1">
          <button onClick={() => videoInputRef.current?.click()} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, fontSize: 11, color: TEXT_MUTED }}>
            <Film size={12} /> {video ? "Cambiar video" : "Subir video"}
          </button>
          {video && !removeVideo && (
            <>
              <span style={{ fontSize: 11, color: TEXT_MUTED }}>✓ {video.existing ? "actual" : "nuevo"}</span>
              <button onClick={() => setRemoveVideo(true)}><X size={13} color={TEXT_MUTED} /></button>
            </>
          )}
          {removeVideo && <span style={{ fontSize: 11, color: "#B5545F" }}>se eliminará al guardar</span>}
        </div>
        <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoChange} className="hidden" />

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-full py-2.5" style={{ border: `1px solid ${INPUT_BORDER}`, fontSize: 13, color: TEXT_MUTED }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 rounded-full py-2.5 flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: TEXT_DARK, color: "#FFF", fontSize: 13, fontWeight: 600 }}>
            {saving && <Loader2 size={14} className="animate-spin" />}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return <label className="rv-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.05em", color: TEXT_MUTED }}>{children}</label>;
}
