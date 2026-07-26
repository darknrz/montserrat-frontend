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
    <div className="fixed bottom-4 right-3 z-50 flex h-[min(600px,calc(100vh-2rem))] w-[calc(100vw-1.5rem)] max-w-[390px] flex-col overflow-hidden rounded-[22px] border border-black/5 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] ring-1 ring-black/5 sm:bottom-6 sm:right-6">

      {/* Header */}
      <div className="relative flex flex-shrink-0 items-center gap-3 overflow-hidden bg-gradient-to-br from-[#181818] to-[#0c0c0c] px-[18px] py-4">
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-monserrat-gold/10 blur-2xl" />
        <span className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-[#1e1e1e] shadow-inner">
          <Bot size={18} className="text-monserrat-gold" />
        </span>
        <div className="relative">
          <p className="text-[13.5px] font-semibold leading-tight tracking-[0.01em] text-white">
            Asistente Monserrat
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/45">
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
          className="relative ml-auto flex rounded-full p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white/80"
          aria-label="Cerrar chat"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-gradient-to-b from-monserrat-cream/25 to-white px-4 py-[18px] [scrollbar-width:thin]">
        {messages.map((message) => (
          <ChatbotMessage key={message.id} message={message} />
        ))}
        {isTyping && (
          <div className="flex self-start">
            <div className="flex items-center gap-[5px] rounded-[14px] rounded-bl-[4px] border border-black/8 bg-gray-50 px-[14px] py-3 shadow-sm">
              {[0, 120, 240].map((delay) => (
                <span
                  key={delay}
                  className="h-1.5 w-1.5 animate-[blink_1.2s_ease_infinite] rounded-full bg-gray-400"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex flex-shrink-0 items-end gap-2 border-t border-black/8 bg-white px-[14px] py-3 pb-[14px]">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu consulta…"
          rows={1}
          className="min-w-0 flex-1 resize-none rounded-2xl border border-black/10 bg-gray-50 px-3.5 py-2.5 text-[13px] leading-5 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-monserrat-gold/50 focus:bg-white focus:ring-2 focus:ring-monserrat-gold/15 [scrollbar-width:thin]"
          style={{ maxHeight: MAX_TEXTAREA_HEIGHT, overflowY: "auto" }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] bg-[#111] text-monserrat-gold shadow-sm transition hover:opacity-80 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Enviar mensaje"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}