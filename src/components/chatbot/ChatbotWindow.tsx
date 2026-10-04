import { Bot, Send, X } from "lucide-react";
import { useEffect, useRef } from "react";
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
  onQuickSend: (value: string) => void;
  onClose: () => void;
};

const MAX_TEXTAREA_HEIGHT = 120; // px

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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) onSend();
    }
  };

  // Auto-resize del textarea según el contenido
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT);
    textarea.style.height = `${nextHeight}px`;
  }, [input]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  const handleSend = () => {
    onSend();
    // Vuelve a colapsar el textarea tras enviar
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    });
  };

  return (
    <div className="fixed bottom-4 right-3 z-50 flex h-[min(600px,calc(100vh-2rem))] w-[calc(100vw-1.5rem)] max-w-[390px] flex-col overflow-hidden rounded-[28px] border-2 border-monserrat-gold/35 bg-[#fffdf8] shadow-[0_24px_70px_rgba(79,9,12,0.22)] sm:bottom-6 sm:right-6">

      {/* Header */}
      <div className="relative flex flex-shrink-0 items-center gap-3 overflow-hidden border-b-2 border-monserrat-gold/30 bg-[linear-gradient(120deg,#fff7e3_0%,#fdecc4_100%)] px-[18px] py-4">
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-monserrat-red/10 blur-2xl" />
        <span className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-monserrat-red shadow-[0_8px_18px_rgba(159,23,27,0.25)]">
          <Bot size={19} className="text-white" />
        </span>
        <div className="relative">
          <p className="text-[14.5px] font-black leading-tight tracking-[0.01em] text-monserrat-ink">
            Asistente Monserrat
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-monserrat-ink/55">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isConnected ? "animate-pulse bg-emerald-400" : "bg-amber-300"
              }`}
            />
            {isConnected ? "En línea" : "Conectando"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="relative ml-auto flex rounded-full p-2 text-monserrat-ink/45 transition hover:bg-white/70 hover:text-monserrat-red"
          aria-label="Cerrar chat"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-gradient-to-b from-monserrat-cream/40 to-[#fffdf8] px-4 py-[18px] [scrollbar-width:thin]">
        {messages.map((message) => (
          <ChatbotMessage key={message.id} message={message} />
        ))}
        {isTyping && (
          <div className="flex self-start">
            <div className="flex items-center gap-[5px] rounded-3xl rounded-bl-md border-2 border-monserrat-gold/30 bg-white px-[14px] py-3 shadow-sm">
              {[0, 120, 240].map((delay) => (
                <span
                  key={delay}
                  className="h-1.5 w-1.5 animate-[blink_1.2s_ease_infinite] rounded-full bg-monserrat-gold"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex flex-shrink-0 items-end gap-2 border-t-2 border-monserrat-gold/25 bg-[#fffdf8] px-[14px] py-3 pb-[14px]">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu consulta…"
          rows={1}
          className="min-w-0 flex-1 resize-none rounded-2xl border-2 border-monserrat-gold/40 bg-white px-3.5 py-2.5 text-[13px] leading-5 text-monserrat-ink outline-none transition placeholder:text-monserrat-ink/35 focus:border-monserrat-red focus:ring-4 focus:ring-monserrat-red/10 [scrollbar-width:thin]"
          style={{ maxHeight: MAX_TEXTAREA_HEIGHT, overflowY: "auto" }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-monserrat-red text-white shadow-[0_8px_18px_rgba(159,23,27,0.25)] transition hover:bg-monserrat-redDark active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Enviar mensaje"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}