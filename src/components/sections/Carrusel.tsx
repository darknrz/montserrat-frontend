import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { tagClasses } from "../../constants/colors";
import { useCarrusel } from "../../hooks/useCarrusel";
import type { Video } from "../../types";
import { Badge } from "../ui/Badge";
import { SectionHeader } from "../ui/SectionHeader";

type CarruselProps = { videos: Video[] };

const IconPlay = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const IconPause = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);

const IconVolume = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);

const IconMuted = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

const IconFullscreen = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

const IconInfo = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="8.5" />
    <line x1="12" y1="12" x2="12" y2="16" />
  </svg>
);

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export function Carrusel({ videos }: CarruselProps) {
  const { index, setIndex, pause, resume } = useCarrusel(
    videos.length,
    7000
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const userMutePref = useRef(true);
  const userDidPause = useRef(false);
  const changingSlide = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [currentT, setCurrentT] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [muteTooltip, setMuteTooltip] = useState(false);

  const current = videos[index];
  const isVideo = current?.mediaType === "video";

  const goTo = useCallback(
    (i: number) => {
      changingSlide.current = true;

      const vid = videoRef.current;

           if (vid) {
        vid.pause();
        vid.currentTime = 0;
      }

      setPlaying(false);
      setCurrentT(0);
      setDuration(0);

      userDidPause.current = false;

      resume();
      setIndex(i);

      setTimeout(() => {
        changingSlide.current = false;
      }, 0);
    },
    [resume, setIndex]
  );

  useEffect(() => {
    const vid = videoRef.current;

    if (!vid || current?.mediaType !== "video") return;

    vid.muted = userMutePref.current;

    setMuted(userMutePref.current);

    vid.play().then(() => setPlaying(true)).catch(() => {});
  }, [index, current?.mediaType]);

  const togglePlay = useCallback(() => {
  const vid = videoRef.current;

  if (!vid) return;

  if (vid.paused) {
    userDidPause.current = false;
    vid.play();
  } else {

    // SI pausó teniendo audio activo,
    // el siguiente video arrancará muteado
    if (!vid.muted) {
      userMutePref.current = true;
      setMuted(true);
    }

    userDidPause.current = true;

    vid.pause();
  }
}, []);

  const toggleMute = useCallback(() => {
    const vid = videoRef.current;

    if (!vid) return;

    vid.muted = !vid.muted;

    userMutePref.current = vid.muted;

    setMuted(vid.muted);
  }, []);

  const requestFullscreen = useCallback(() => {
  const el = playerRef.current;

  if (!el) return;

  // SI YA ESTÁ EN FULLSCREEN → SALIR
  if (document.fullscreenElement) {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    }

    return;
  }

  // ENTRAR A FULLSCREEN
  if (el.requestFullscreen) {
    el.requestFullscreen();
  } else if ((el as any).webkitRequestFullscreen) {
    (el as any).webkitRequestFullscreen();
  }
}, []);

  const seekTo = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const vid = videoRef.current;
      const bar = progressRef.current;

      if (!vid || !bar || !duration) return;

      const rect = bar.getBoundingClientRect();

      const ratio = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width)
      );

      vid.currentTime = ratio * duration;
    },
    [duration]
  );

  const progressPct = duration > 0 ? (currentT / duration) * 100 : 0;

  const slidePct = ((index + 1) / videos.length) * 100;

  return (
    <section
      id="videos"
      className="bg-monserrat-cream px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Galería multimedia"
          title="Imágenes y videos institucionales"
          description="Publica banners, fotos y videos del colegio desde el panel administrador."
        />

        {current ? (
          <div className="mt-12 grid gap-4 lg:grid-cols-[1fr_300px]">

            {/* PLAYER */}
            <div className="overflow-hidden rounded-[24px] bg-monserrat-black shadow-[0_8px_32px_rgba(28,20,16,0.15)]">
              <div
                ref={playerRef}
                className="relative aspect-[16/9] overflow-hidden cursor-pointer"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => {
                  setHovered(false);
                  setMuteTooltip(false);
                }}
                onClick={isVideo ? togglePlay : undefined}
              >
                {isVideo ? (
                  <video
                    ref={videoRef}
                    key={current.id}
                    src={current.mediaUrl}
                    poster={current.thumbnailUrl}
                    muted
                    playsInline
                    autoPlay
                    className="h-full w-full object-cover"
                    onPlay={() => {
                      setPlaying(true);
                      pause();
                    }}
                    onPause={() => {
                      setPlaying(false);

                      // Solo marcar pausa manual
                      if (!changingSlide.current) {
                        userDidPause.current = true;
                      }

                      resume();
                    }}
                    onEnded={() => {
                      userDidPause.current = false;
                      setPlaying(false);
                      resume();
                      goTo((index + 1) % videos.length);
                    }}
                    onTimeUpdate={(e) =>
                      setCurrentT(e.currentTarget.currentTime)
                    }
                    onLoadedMetadata={(e) =>
                      setDuration(e.currentTarget.duration)
                    }
                  />
                ) : (
                  <img
                    src={current.mediaUrl}
                    alt={current.titulo}
                    className="h-full w-full object-cover"
                  />
                )}

                {/* GRADIENTE */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-monserrat-black/85 via-monserrat-black/10 to-transparent" />

                {/* INFO */}
                <div
                  className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none"
                  style={{ paddingBottom: isVideo ? "56px" : "24px" }}
                >
                  <Badge
                    className={`${
                      tagClasses[current.tag] ??
                      "bg-gray-700 text-white ring-gray-700"
                    } mb-3`}
                  >
                    {current.tag}
                  </Badge>

                  <h3 className="font-serif text-2xl font-black leading-tight text-monserrat-cream">
                    {current.titulo}
                  </h3>

                  {current.descripcion && (
                    <p className="mt-2 max-w-lg text-[12px] leading-relaxed text-monserrat-cream/65">
                      {current.descripcion}
                    </p>
                  )}
                </div>

                {/* MUTE INFO */}
                {isVideo && muted && (
                  <div
                    className="absolute top-3 left-3 z-30"
                    onMouseEnter={() => setMuteTooltip(true)}
                    onMouseLeave={() => setMuteTooltip(false)}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMute();
                    }}
                  >
                    <div
                      className="absolute left-7 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white pointer-events-none transition-all duration-150"
                      style={{
                        background: "rgba(28,20,16,0.82)",
                        backdropFilter: "blur(6px)",
                        opacity: muteTooltip ? 1 : 0,
                        transform: `translateY(-50%) translateX(${
                          muteTooltip ? "0px" : "-4px"
                        })`,
                      }}
                    >
                      Audio muteado — clic para activar
                    </div>

                    <button
                      type="button"
                      aria-label="Audio muteado, clic para activar"
                      className="flex h-7 w-7 items-center justify-center rounded-full transition-colors"
                      style={{
                        background: "rgba(28,20,16,0.55)",
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      <span className="text-white/80">
                        <IconInfo />
                      </span>
                    </button>
                  </div>
                )}

                {/* FLECHAS */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo((index - 1 + videos.length) % videos.length);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-monserrat-cream/90 text-monserrat-ink shadow hover:bg-white transition z-10"
                  aria-label="Anterior"
                >
                  <ChevronLeft size={18} />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo((index + 1) % videos.length);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-monserrat-cream/90 text-monserrat-ink shadow hover:bg-white transition z-10"
                  aria-label="Siguiente"
                >
                  <ChevronRight size={18} />
                </button>

                {/* CONTROLES */}
                {isVideo && (
                  <div
                    className="absolute bottom-0 left-0 right-0 z-20 transition-all duration-200"
                    style={{
                      opacity: hovered ? 1 : 0,
                      pointerEvents: hovered ? "auto" : "none",
                      background:
                        "linear-gradient(transparent, rgba(0,0,0,0.65))",
                      padding: "24px 14px 10px",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* PROGRESS */}
                    <div
                      ref={progressRef}
                      className="mb-2 h-[4px] w-full cursor-pointer rounded-full bg-white/20 relative group/bar"
                      onClick={seekTo}
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-monserrat-red to-monserrat-gold transition-[width] duration-100"
                        style={{ width: `${progressPct}%` }}
                      />

                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-white shadow opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none"
                        style={{ left: `${progressPct}%` }}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="flex items-center justify-center rounded-full p-1 hover:bg-white/15 transition"
                        aria-label={playing ? "Pausar" : "Reproducir"}
                      >
                        {playing ? <IconPause /> : <IconPlay />}
                      </button>

                      <button
                        type="button"
                        onClick={toggleMute}
                        className="flex items-center justify-center rounded-full p-1 hover:bg-white/15 transition"
                        aria-label={
                          muted ? "Activar sonido" : "Silenciar"
                        }
                      >
                        {muted ? <IconMuted /> : <IconVolume />}
                      </button>

                      <span className="text-[11px] text-white/80 tabular-nums select-none">
                        {fmtTime(currentT)} / {fmtTime(duration)}
                      </span>

                      <div className="flex-1" />

                      <button
                        type="button"
                        onClick={requestFullscreen}
                        className="flex items-center justify-center rounded-full p-1 hover:bg-white/15 transition"
                        aria-label="Pantalla completa"
                      >
                        <IconFullscreen />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* DOTS */}
              <div className="flex justify-center gap-1.5 py-3">
                {videos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    aria-label={`Ir al slide ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      i === index
                        ? "w-5 bg-monserrat-red"
                        : "w-1.5 bg-monserrat-cream/25"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* SIDEBAR */}
            <div className="flex flex-col gap-2 overflow-y-auto lg:max-h-[420px]">
              {videos.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goTo(i)}
                  className={`flex items-center gap-3 rounded-[16px] border p-2.5 text-left transition ${
                    i === index
                      ? "border-monserrat-red bg-white shadow-[0_4px_16px_rgba(139,26,26,0.12)]"
                      : "border-monserrat-ink/8 bg-white/70 hover:border-monserrat-ink/18 hover:bg-white"
                  }`}
                >
                  <div className="relative h-[52px] w-[72px] flex-shrink-0 overflow-hidden rounded-[10px] bg-monserrat-black">
                    <img
                      src={item.thumbnailUrl || item.mediaUrl}
                      alt={item.titulo}
                      className="h-full w-full object-cover opacity-90"
                    />

                    {item.mediaType === "video" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                        <IconPlay />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="mb-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-monserrat-red">
                      {item.mediaType}
                    </p>

                    <p className="truncate text-[12.5px] font-black text-monserrat-ink">
                      {item.titulo}
                    </p>

                    {item.descripcion && (
                      <p className="mt-0.5 truncate text-[11px] text-monserrat-ink/50">
                        {item.descripcion}
                      </p>
                    )}
                  </div>

                  {i === index && (
                    <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-monserrat-red" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-12 rounded-[24px] border border-dashed border-monserrat-ink/15 bg-white px-6 py-16 text-center">
            <p className="text-3xl mb-3">🎬</p>

            <h3 className="text-xl font-black text-monserrat-ink">
              El carrusel aún no tiene contenido
            </h3>

            <p className="mt-2 text-[13px] text-monserrat-ink/55">
              Sube imágenes o videos desde el panel administrador para
              publicarlos aquí.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}