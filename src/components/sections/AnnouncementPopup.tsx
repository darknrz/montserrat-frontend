import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import type { Anuncio } from "../../types";

type AnnouncementPopupProps = {
  announcements: Anuncio[];
  isOpen: boolean;
  onClose: () => void;
};

const FALLBACK_ASPECT = 4 / 5; // used until the real image loads
const MIN_ASPECT = 0.55; // don't let very tall images shrink the panel too narrow
const MAX_ASPECT = 1.6; // don't let very wide images dominate the whole modal
const SLIDE_MS = 7000; // tiempo que se muestra cada anuncio antes de pasar al siguiente
const VIDEO_MAX_MS = 60000; // tope de seguridad por si un video nunca termina

export function AnnouncementPopup({ announcements, isOpen, onClose }: AnnouncementPopupProps) {
  const [imageAspect, setImageAspect] = useState<number>(FALLBACK_ASPECT);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const directionRef = useRef<"next" | "prev">("next");

  const total = announcements.length;
  const hasMany = total > 1;
  const safeIndex = total === 0 ? 0 : Math.min(index, total - 1);

  const goTo = useCallback(
    (next: number) => {
      if (total === 0) return;
      setImageAspect(FALLBACK_ASPECT);
      setIndex((current) => {
        directionRef.current = next >= current ? "next" : "prev";
        return ((next % total) + total) % total;
      });
    },
    [total]
  );

  const current = total === 0 ? null : announcements[safeIndex];
  const currentIsVideo = Boolean(
    current && !current.imageUrl && current.attachmentUrl && current.attachmentResourceType === "video"
  );

  // Avance automático como un carrusel común: cada SLIDE_MS pasa al siguiente si nadie interactúa.
  // Los videos avanzan cuando terminan (onEnded) o, como máximo, tras VIDEO_MAX_MS.
  useEffect(() => {
    if (!isOpen || !hasMany || paused) return;
    const delay = currentIsVideo ? VIDEO_MAX_MS : SLIDE_MS;
    const timer = window.setTimeout(() => {
      directionRef.current = "next";
      goTo(safeIndex + 1);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [isOpen, hasMany, paused, currentIsVideo, safeIndex, goTo]);

  // Cada vez que se abre, vuelve al primer anuncio.
  useEffect(() => {
    if (isOpen) {
      setIndex(0);
      setPaused(false);
    }
  }, [isOpen]);

  // Teclado: flechas para navegar y Esc para cerrar.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && total > 1) goTo(safeIndex + 1);
      else if (e.key === "ArrowLeft" && total > 1) goTo(safeIndex - 1);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, total, safeIndex, goTo, onClose]);

  if (!isOpen || announcements.length === 0) {
    return null;
  }

  const primary = announcements[safeIndex];
  const hasAttachment = Boolean(primary.attachmentUrl);
  const attachmentLabel = primary.verMasTexto || "Ver más";
  const attachmentTarget = primary.attachmentUrl;

  const visualImage = primary.imageUrl
    ? { type: "image" as const, src: primary.imageUrl }
    : hasAttachment && primary.attachmentResourceType === "image"
      ? { type: "image" as const, src: primary.attachmentUrl }
      : hasAttachment && primary.attachmentResourceType === "video"
        ? { type: "video" as const, src: primary.attachmentUrl }
        : null;

  const handleImageLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth > 0 && naturalHeight > 0) {
      const ratio = naturalWidth / naturalHeight;
      setImageAspect(Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, ratio)));
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-monserrat-ink/70 backdrop-blur-sm px-4 py-6">
      <div
        className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_50px_100px_rgba(0,0,0,0.35)] md:flex-row"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        {/* Barra de progreso del tiempo restante del anuncio actual */}
        {hasMany && !currentIsVideo && (
          <div className="absolute inset-x-0 top-0 z-20 h-1 bg-monserrat-ink/10">
            <div
              key={`${safeIndex}-${total}`}
              className="h-full bg-monserrat-red"
              style={{
                animation: `popup-progress ${SLIDE_MS}ms linear forwards`,
                animationPlayState: paused ? "paused" : "running",
              }}
            />
          </div>
        )}
        {/* Close button floats over everything */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-monserrat-ink shadow-sm backdrop-blur transition hover:bg-white"
          aria-label="Cerrar anuncio"
        >
          <X size={16} />
        </button>

        {hasMany && (
          <>
            <button
              type="button"
              onClick={() => goTo(safeIndex - 1)}
              className="absolute left-3 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-monserrat-ink shadow-md backdrop-blur transition hover:bg-white"
              aria-label="Anuncio anterior"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => goTo(safeIndex + 1)}
              className="absolute right-3 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-monserrat-ink shadow-md backdrop-blur transition hover:bg-white"
              aria-label="Anuncio siguiente"
            >
              <ChevronRight size={20} />
            </button>
            <div className="absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-2" role="tablist" aria-label="Anuncios">
              {announcements.map((item, i) => (
                <button
                  key={item.id ?? i}
                  type="button"
                  role="tab"
                  aria-selected={i === safeIndex}
                  aria-label={`Ir al anuncio ${i + 1} de ${total}`}
                  onClick={() => goTo(i)}
                  className={`h-2 rounded-full transition-all ${i === safeIndex ? "w-6 bg-monserrat-red" : "w-2 bg-monserrat-ink/25 hover:bg-monserrat-ink/45"}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Left: visual — width tracks the image's real aspect ratio, so no leftover bars,
            but capped so it never crowds out the text on the right */}
        {visualImage && (
          <div
            key={`visual-${primary.id ?? safeIndex}`}
            className={`relative hidden shrink-0 overflow-hidden bg-monserrat-cream md:block ${directionRef.current === "prev" ? "popup-slide-prev" : "popup-slide-next"}`}
            style={{
              aspectRatio: visualImage.type === "image" ? imageAspect : undefined,
              width: visualImage.type === "video" ? "45%" : undefined,
              maxWidth: "52%",
            }}
          >
            {visualImage.type === "image" ? (
              <img
                src={visualImage.src}
                alt={primary.titulo}
                onLoad={handleImageLoad}
                className="h-full w-full object-contain"
              />
            ) : (
              <video
                key={visualImage.src}
                src={visualImage.src}
                autoPlay
                muted
                playsInline
                controls
                onEnded={() => hasMany && goTo(safeIndex + 1)}
                className="h-full w-full object-contain"
              />
            )}
          </div>
        )}

        {!visualImage && (
          <div className="relative hidden aspect-[4/5] shrink-0 bg-gradient-to-br from-monserrat-ink to-monserrat-red/40 md:flex md:items-center md:justify-center">
            <p className="p-8 text-center text-sm font-semibold text-white/70">{primary.titulo}</p>
          </div>
        )}

        {/* Mobile-only compact visual (stacked on top for small screens) */}
        {visualImage && (
          <div className="relative w-full overflow-hidden bg-monserrat-cream md:hidden" style={{ maxHeight: "45vh" }}>
            {visualImage.type === "image" ? (
              <img
                src={visualImage.src}
                alt={primary.titulo}
                className="max-h-[45vh] w-full object-contain"
              />
            ) : (
              <video
                key={visualImage.src}
                src={visualImage.src}
                autoPlay
                muted
                playsInline
                controls
                onEnded={() => hasMany && goTo(safeIndex + 1)}
                className="max-h-[45vh] w-full object-contain"
              />
            )}
          </div>
        )}

        {/* Right: content */}
        <div key={primary.id ?? safeIndex} className={`flex min-w-0 flex-1 flex-col justify-center gap-6 px-8 py-10 sm:px-12 sm:py-12 ${directionRef.current === "prev" ? "popup-slide-prev" : "popup-slide-next"} ${hasMany ? "md:pl-12 md:pr-16 pb-14" : ""}`}>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-monserrat-red">
              Anuncio importante
            </p>
            <h2 className="mt-3 break-words font-serif text-[26px] font-black leading-[1.15] text-monserrat-ink sm:text-[30px]">
              {primary.titulo}
            </h2>
          </div>

          {primary.mensaje && (
            <p className="break-words text-[14px] leading-7 text-monserrat-ink/70">{primary.mensaje}</p>
          )}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            {hasAttachment && (
              <a
                href={attachmentTarget}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-[10px] bg-monserrat-ink px-7 py-3.5 text-[12px] font-black uppercase tracking-[0.06em] text-white transition hover:bg-monserrat-ink/85"
              >
                {attachmentLabel}
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-[10px] border border-monserrat-ink/12 px-7 py-3.5 text-[12px] font-black uppercase tracking-[0.06em] text-monserrat-ink/70 transition hover:border-monserrat-ink/25 hover:text-monserrat-ink"
            >
              Cerrar
            </button>
          </div>

          {primary.expiresAt && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-monserrat-ink/40">
              Válido hasta {primary.expiresAt}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}