import { X } from "lucide-react";
import type { PropsWithChildren } from "react";

type ModalProps = PropsWithChildren<{
  title: string;
  isOpen: boolean;
  onClose: () => void;
}>;

export function Modal({ title, isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-monserrat-ink/60 px-4 py-8 backdrop-blur-[3px]" role="dialog" aria-modal="true">
      <div className="w-full max-w-4xl overflow-hidden rounded-[20px] bg-[#fffdf8] shadow-[0_24px_80px_rgba(31,27,24,0.28)]">
        <div className="h-[3px] bg-gradient-to-r from-monserrat-red via-monserrat-gold to-monserrat-red" />
        <div className="flex items-center justify-between border-b border-monserrat-gold/20 bg-gradient-to-r from-monserrat-cream/50 to-white px-5 py-4">
          <h3 className="text-lg font-bold text-monserrat-ink">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-monserrat-ink/60 transition hover:bg-monserrat-red/10 hover:text-monserrat-red"
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
