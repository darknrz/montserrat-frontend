import { MessageCircle } from "lucide-react";

type ChatbotButtonProps = {
  onClick: () => void;
};

export function ChatbotButton({ onClick }: ChatbotButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 inline-flex h-16 w-16 items-center justify-center rounded-full bg-monserrat-red text-white shadow-[0_18px_45px_rgba(79,9,12,0.35)] ring-4 ring-monserrat-gold/25 transition hover:-translate-y-0.5 hover:bg-red-800 focus:outline-none focus:ring-4 focus:ring-monserrat-gold/45"
      aria-label="Abrir chatbot"
    >
      <MessageCircle size={28} />
      <span className="absolute right-1 top-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
    </button>
  );
}
