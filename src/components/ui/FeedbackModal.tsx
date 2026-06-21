import { AlertTriangle, X } from "lucide-react";

type FeedbackModalProps = {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
};

export function FeedbackModal({ isOpen, title, message, onClose }: FeedbackModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md overflow-hidden rounded-[18px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between gap-4 border-b border-monserrat-ink/8 bg-red-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-monserrat-red text-white">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-red">Error detectado</p>
              <h3 className="mt-1 text-lg font-black text-monserrat-ink">{title}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-monserrat-ink/60 transition hover:bg-black/5 hover:text-monserrat-ink"
            aria-label="Cerrar alerta"
          >
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-4 px-5 py-5">
          <p className="text-sm leading-6 text-monserrat-ink/70">{message}</p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-[12px] bg-monserrat-red px-4 py-2.5 text-sm font-black text-white transition hover:bg-monserrat-red/85"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
