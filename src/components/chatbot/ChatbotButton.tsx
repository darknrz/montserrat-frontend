import { MessageCircle } from "lucide-react";

type ChatbotButtonProps = {
  onClick: () => void;
};

export function ChatbotButton({ onClick }: ChatbotButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group fixed bottom-6 right-6 z-40 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-monserrat-red to-red-900 text-white shadow-[0_18px_45px_rgba(79,9,12,0.35)] ring-4 ring-monserrat-gold/20 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(79,9,12,0.45)] hover:ring-monserrat-gold/40 focus:outline-none focus:ring-4 focus:ring-monserrat-gold/45 active:scale-95"
      aria-label="Abrir chatbot"
    >
      <span className="absolute inset-0 rounded-full bg-monserrat-gold/20 opacity-0 blur-xl transition group-hover:opacity-100" />
      <MessageCircle size={26} className="relative transition group-hover:scale-110" />
      <span className="absolute right-1 top-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow-sm">
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
      </span>
    </button>
  );
}