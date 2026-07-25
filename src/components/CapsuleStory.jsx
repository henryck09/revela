import { useState } from "react";
import { Play, Pause, ArrowLeft } from "lucide-react";
import {
  StoryBlock, formatDate, yearsSince, extractYoutubeId,
  TEXT_DARK, TEXT_MUTED, INPUT_BORDER,
} from "../lib/capsuleConfig";

/**
 * Renders the revealed capsule in the editor preview and public page.
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

            {songUrl && (
              <div className="rounded-lg overflow-hidden mt-5" style={{ border: `1px solid #${accentHex}55` }}>
                <audio src={songUrl} controls className="w-full" style={{ height: 42 }}>
                  Tu navegador no puede reproducir esta canción.
                </audio>
              </div>
            )}

            {!songUrl && youtubeId && (
              <div className="relative rounded-lg overflow-hidden mt-5" style={{ border: `1px solid #${accentHex}55` }}>
                {playSong && (
                  <iframe
                    width="1"
                    height="1"
                    src={`https://www.youtube.com/embed/${youtubeId}?start=${youtubeStart}&end=${youtubeStart + 30}&autoplay=1&controls=0&playsinline=1`}
                    title="Reproductor de audio"
                    allow="autoplay; encrypted-media"
                    style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
                  />
                )}
                <button onClick={() => setPlaySong((playing) => !playing)} className="w-full flex items-center justify-center gap-2 py-4" style={{ background: `#${accentHex}15`, color: `#${accentHex}`, fontSize: 12 }}>
                  {playSong ? <Pause size={14} /> : <Play size={14} />}
                  {playSong ? "pausar canción" : "reproducir canción (30s)"}
                </button>
              </div>
            )}
          </div>
        </StoryBlock>

        {photos.map((photo, index) => (
          <StoryBlock key={photo.id || index}>
            <div className="px-4 py-3">
              <img src={photo.url} alt="" className="w-full rounded-xl object-cover" style={{ maxHeight: 300 }} />
              {photo.caption && <p className="mt-2 px-1" style={{ ...textStyle, fontSize: 13, color: TEXT_DARK }}>{photo.caption}</p>}
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
