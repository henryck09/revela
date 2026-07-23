import { useState } from "react";
import { Play, ExternalLink, ArrowLeft } from "lucide-react";
import {
  StoryBlock, formatDate, yearsSince, extractYoutubeId,
  TEXT_DARK, TEXT_MUTED, INPUT_BORDER,
} from "../lib/capsuleConfig";

/**
 * Renderiza la "cápsula" ya revelada: mensaje principal, canción, fotos, video y cierre.
 * Se usa tanto en la vista previa del creador como en la página pública /m/:code.
 *
 * order: { emoji, accentHex, fontDef, specialDate, occasion, mainText, youtubeUrl,
 *          youtubeStart, songUrl, photos, videoUrl, closingText, storyBg }
 * onBack: opcional, si se pasa muestra un botón "volver a editar"
 */
export default function CapsuleStory({ order, onBack }) {
  const [playSong, setPlaySong] = useState(false);
  const {
    emoji, accentHex, fontDef, specialDate, occasion, mainText,
    youtubeUrl, youtubeStart = 0, songUrl, photos = [], videoUrl,
    closingText, storyBg,
  } = order;

  const youtubeId = extractYoutubeId(youtubeUrl);
  const years = yearsSince(specialDate);
  const youtubeWatchUrl = youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}&t=${youtubeStart}s` : "#";
  const textStyle = { fontFamily: fontDef.css, fontStyle: fontDef.italic ? "italic" : "normal" };

  return (
    <div className="w-full h-full flex flex-col" style={storyBg}>
      <div className="relative flex-1 overflow-y-auto rv-scroll">
        <StoryBlock>
          <div className="flex flex-col justify-center px-6 py-10" style={{ minHeight: 220 }}>
            <span style={{ fontSize: 26 }} className="mb-3">{emoji}</span>
            {specialDate && (
              <p className="rv-mono mb-3" style={{ color: `#${accentHex}`, fontSize: 11 }}>
                {formatDate(specialDate)}{years !== null && (occasion === "cumpleanos" || occasion === "aniversario") ? ` · ${years} ${years === 1 ? "año" : "años"}` : ""}
              </p>
            )}
            <p style={{ ...textStyle, fontSize: 20, lineHeight: 1.4, color: TEXT_DARK }}>{mainText}</p>

            {(youtubeId || songUrl) && (
              <div className="rounded-lg overflow-hidden mt-5" style={{ border: `1px solid #${accentHex}55` }}>
                {!playSong ? (
                  <button onClick={() => setPlaySong(true)} className="w-full flex items-center justify-center gap-2 py-4" style={{ background: `#${accentHex}15`, color: `#${accentHex}`, fontSize: 12 }}>
                    <Play size={14} /> reproducir canción {songUrl ? "" : "(30s)"}
                  </button>
                ) : songUrl ? (
                  <audio src={songUrl} controls autoPlay loop className="w-full" style={{ height: 40 }} />
                ) : (
                  <div>
                    <iframe
                      width="100%" height="90"
                      src={`https://www.youtube.com/embed/${youtubeId}?start=${youtubeStart}&end=${youtubeStart + 30}&autoplay=1`}
                      title="Canción" frameBorder="0"
                      allow="autoplay; encrypted-media"
                    />
                    <a href={youtubeWatchUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-1.5 py-2" style={{ background: `#${accentHex}10`, color: `#${accentHex}`, fontSize: 10.5 }}>
                      <ExternalLink size={11} /> ¿no suena? ábrela directo en YouTube
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </StoryBlock>

        {photos.map((p, i) => (
          <StoryBlock key={p.id || i}>
            <div className="px-4 py-3">
              <img src={p.url} alt="" className="w-full rounded-xl object-cover" style={{ maxHeight: 300 }} />
              {p.caption && <p className="mt-2 px-1" style={{ ...textStyle, fontSize: 13, color: TEXT_DARK }}>{p.caption}</p>}
            </div>
          </StoryBlock>
        ))}

        {videoUrl && (
          <StoryBlock>
            <div className="px-4 py-3">
              <p className="rv-mono uppercase text-center mb-2" style={{ fontSize: 10, letterSpacing: "0.1em", color: TEXT_MUTED }}>un último momento</p>
              <video src={videoUrl} className="w-full rounded-xl object-cover" style={{ maxHeight: 340 }} controls autoPlay loop muted playsInline />
            </div>
          </StoryBlock>
        )}

        <StoryBlock>
          <div className="px-6 pt-4 pb-10 text-center">
            <p style={{ ...textStyle, fontSize: 18, lineHeight: 1.5, color: TEXT_DARK }}>{closingText}</p>
          </div>
        </StoryBlock>
      </div>

      {onBack && (
        <button onClick={onBack} className="rv-mono uppercase flex items-center justify-center gap-2 py-3" style={{ color: TEXT_MUTED, background: "#FFFDF8", fontSize: 10, letterSpacing: "0.1em", borderTop: `1px solid ${INPUT_BORDER}` }}>
          <ArrowLeft size={11} /> volver a editar
        </button>
      )}
    </div>
  );
}
