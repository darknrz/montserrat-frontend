import { X } from "lucide-react";
import { useState } from "react";
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

export function AnnouncementPopup({ announcements, isOpen, onClose }: AnnouncementPopupProps) {
  const [imageAspect, setImageAspect] = useState<number>(FALLBACK_ASPECT);

  if (!isOpen || announcements.length === 0) {
    return null;
  }

  const primary = announcements[0];
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
      <div className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_50px_100px_rgba(0,0,0,0.35)] md:flex-row">
        {/* Close button floats over everything */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-monserrat-ink shadow-sm backdrop-blur transition hover:bg-white"
          aria-label="Cerrar anuncio"
        >
          <X size={16} />
        </button>

        {/* Left: visual — width tracks the image's real aspect ratio, so no leftover bars,
            but capped so it never crowds out the text on the right */}
        {visualImage && (
          <div
            className="relative hidden shrink-0 overflow-hidden bg-monserrat-cream md:block"
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
              <video src={visualImage.src} controls className="h-full w-full object-contain" />
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
              <video src={visualImage.src} controls className="max-h-[45vh] w-full object-contain" />
            )}
          </div>
        )}

        {/* Right: content */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-6 px-8 py-10 sm:px-12 sm:py-12">
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