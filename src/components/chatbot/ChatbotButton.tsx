import { MessageCircle } from "lucide-react";

type ChatbotButtonProps = {
  onClick: () => void;
};

export function ChatbotButton({ onClick }: ChatbotButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 inline-flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-monserrat-red text-white shadow-2xl ring-4 ring-monserrat-red/25 transition hover:bg-red-800"
      aria-label="Abrir chatbot"
    >
      <MessageCircle size={28} />
    </button>
  );
}
