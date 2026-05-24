import { Send, X } from "lucide-react";
import type { KeyboardEvent } from "react";
import type { ChatMessage } from "../../hooks/useChatbot";
import { ChatbotMessage } from "./ChatbotMessage";

type ChatbotWindowProps = {
  messages: ChatMessage[];
  input: string;
  canSend: boolean;
  isConnected: boolean;
  isTyping: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onClose: () => void;
};

export function ChatbotWindow({
  messages,
  input,
  canSend,
  isConnected,
  isTyping,
  onInputChange,
  onSend,
  onClose
}: ChatbotWindowProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") onSend();
  };

  return (
    <div className="fixed bottom-6 right-4 z-50 flex h-[480px] w-[calc(100vw-2rem)] max-w-[350px] flex-col overflow-hidden rounded-lg border border-black/10 bg-monserrat-cream shadow-2xl sm:right-6">
      <div className="flex items-center justify-between bg-monserrat-black px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-monserrat-gold bg-monserrat-red font-black text-monserrat-gold">
            M
          </span>
          <div>
            <p className="text-sm font-black">Asistente Monserrat</p>
            <p className="text-xs text-white/55">{isConnected ? "Conectado en tiempo real" : "Conectando..."}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-white/10" aria-label="Cerrar chatbot">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <ChatbotMessage key={message.id} message={message} />
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="rounded-lg border border-black/10 bg-white px-4 py-3 text-sm text-monserrat-ink/70">
              El asistente esta escribiendo...
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t border-black/10 bg-white p-3">
        <input
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu consulta"
          className="min-w-0 flex-1 rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-monserrat-red focus:ring-2 focus:ring-monserrat-red/20"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-monserrat-red text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-45"
          aria-label="Enviar mensaje"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
