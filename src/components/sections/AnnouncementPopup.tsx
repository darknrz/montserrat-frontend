import { X } from "lucide-react";
import type { Anuncio } from "../../types";

type AnnouncementPopupProps = {
  announcements: Anuncio[];
  isOpen: boolean;
  onClose: () => void;
};

export function AnnouncementPopup({ announcements, isOpen, onClose }: AnnouncementPopupProps) {
  if (!isOpen || announcements.length === 0) {
    return null;
  }

  const primary = announcements[0];
  const hasAttachment = Boolean(primary.attachmentUrl);
  const attachmentLabel = primary.verMasTexto || "Ver más";
  const attachmentTarget = primary.attachmentUrl;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="w-full max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-[0_40px_80px_rgba(0,0,0,0.25)]">
        <div className="flex items-start justify-between border-b border-monserrat-ink/8 bg-monserrat-cream px-6 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-red">Anuncio importante</p>
            <h2 className="mt-2 text-2xl font-black text-monserrat-ink">{primary.titulo}</h2>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-monserrat-ink/12 text-monserrat-ink/70 transition hover:border-monserrat-ink/20 hover:text-monserrat-ink"
            aria-label="Cerrar anuncio"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {primary.mensaje && (
              <p className="text-sm leading-7 text-monserrat-ink/85">{primary.mensaje}</p>
            )}

            <div className="flex flex-wrap gap-3">
              {hasAttachment && (
                <a
                  href={attachmentTarget}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-monserrat-red px-6 py-3 text-sm font-black text-white transition hover:bg-monserrat-red/90"
                >
                  {attachmentLabel}
                </a>
              )}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-full border border-monserrat-ink/10 bg-white px-6 py-3 text-sm font-black text-monserrat-ink transition hover:border-monserrat-ink/25 hover:bg-monserrat-cream"
              >
                Cerrar
              </button>
            </div>
          </div>

          {hasAttachment && primary.attachmentResourceType === "image" && (
            <div className="overflow-hidden rounded-[20px] border border-monserrat-ink/10 bg-monserrat-cream">
              <img src={primary.attachmentUrl} alt={primary.titulo} className="h-full w-full object-cover" />
            </div>
          )}

          {hasAttachment && primary.attachmentResourceType === "video" && (
            <div className="overflow-hidden rounded-[20px] border border-monserrat-ink/10 bg-monserrat-cream">
              <video src={primary.attachmentUrl} controls className="h-full w-full object-cover" />
            </div>
          )}

          {hasAttachment && primary.attachmentResourceType === "raw" && (
            <div className="rounded-[20px] border border-monserrat-ink/10 bg-monserrat-cream p-6 text-center">
              <p className="text-sm font-black text-monserrat-ink">Documento adjunto listo para descargar.</p>
              <a
                href={attachmentTarget}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center justify-center rounded-full bg-monserrat-red px-6 py-3 text-sm font-black text-white transition hover:bg-monserrat-red/90"
              >
                {attachmentLabel}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
