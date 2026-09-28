import { Component, useEffect, useRef, useState } from "react";
import { Play, ArrowLeft, Volume2 } from "lucide-react";
import {
  StoryBlock, formatDate, yearsSince, extractYoutubeId,
  TEXT_DARK, TEXT_MUTED, INPUT_BORDER,
} from "../lib/capsuleConfig";

/**
 * Si algo dentro de la música (el reproductor de YouTube) llegara a fallar,
 * esto evita que se caiga TODA la cápsula a pantalla en blanco: solo se
 * reemplaza esta sección por el link de respaldo.
 */
class MusicErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

/**
 * Reproductor de YouTube embebido con la API oficial (más confiable que el
 * truco de parámetros en la URL). Arranca en silencio -el autoplay mudo sí
 * lo permiten prácticamente todos los navegadores- y un botón de "activar
 * sonido" hace de gesto directo del usuario para poder subir el volumen.
 * Si el script no carga o el navegador es demasiado restrictivo, después de
 * unos segundos cede el paso al link de respaldo (fallback) en vez de
 * quedarse colgado.
 */
function YoutubeInlinePlayer({ youtubeId, youtubeStart, accentHex, onFail }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timeoutId;

    function createPlayer() {
      if (cancelled || !containerRef.current || !window.YT?.Player) return;
      try {
        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId: youtubeId,
          playerVars: { start: youtubeStart || 0, autoplay: 1, mute: 1, playsinline: 1, controls: 1, modestbranding: 1, rel: 0 },
          events: {
            onReady: (e) => {
              if (cancelled) return;
              clearTimeout(timeoutId);
              try { e.target.playVideo(); } catch { /* noop */ }
            },
            onError: () => { if (!cancelled) onFail(); },
          },
        });
      } catch {
        if (!cancelled) onFail();
      }
    }

    // Si el script de YouTube no llega a cargar (red lenta, bloqueado, etc.), no nos quedamos colgados
    timeoutId = setTimeout(() => { if (!cancelled) onFail(); }, 6000);

    if (window.YT?.Player) {
      createPlayer();
    } else {
      if (!document.getElementById("youtube-iframe-api")) {
        const tag = document.createElement("script");
        tag.id = "youtube-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); createPlayer(); };
    }

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      try { playerRef.current?.destroy(); } catch { /* noop */ }
    };
  }, [youtubeId, youtubeStart, onFail]);

  function unmute() {
    try { playerRef.current?.unMute(); playerRef.current?.setVolume(100); setMuted(false); } catch { /* noop */ }
  }

  return (
    <div>
      <div ref={containerRef} style={{ width: "100%", height: 84 }} />
      {muted && (
        <button onClick={unmute} className="w-full flex items-center justify-center gap-2 py-2" style={{ background: `#${accentHex}15`, color: `#${accentHex}`, fontSize: 11 }}>
          <Volume2 size={13} /> activar sonido
        </button>
      )}
    </div>
  );
}

/**
 * Renders the revealed capsule in the editor preview and public page.
 */
export default function CapsuleStory({ order, onBack }) {
  const {
    emoji, accentHex, fontDef, specialDate, occasion, mainText,
    youtubeUrl, youtubeStart = 0, songUrl, photos = [], videoUrl,
    closingText, storyBg,
  } = order;
  const [playerFailed, setPlayerFailed] = useState(false);

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
              <div className="rounded-lg overflow-hidden mt-5" style={{ border: `1px solid #${accentHex}55` }}>
                {playerFailed ? (
                  <a
                    href={`https://www.youtube.com/watch?v=${youtubeId}&t=${youtubeStart}s`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-4"
                    style={{ background: `#${accentHex}15`, color: `#${accentHex}`, fontSize: 12 }}
                  >
                    <Play size={14} /> escuchar canción en YouTube
                  </a>
                ) : (
                  <MusicErrorBoundary
                    fallback={
                      <a
                        href={`https://www.youtube.com/watch?v=${youtubeId}&t=${youtubeStart}s`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 py-4"
                        style={{ background: `#${accentHex}15`, color: `#${accentHex}`, fontSize: 12 }}
                      >
                        <Play size={14} /> escuchar canción en YouTube
                      </a>
                    }
                  >
                    <YoutubeInlinePlayer youtubeId={youtubeId} youtubeStart={youtubeStart} accentHex={accentHex} onFail={() => setPlayerFailed(true)} />
                  </MusicErrorBoundary>
                )}
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
