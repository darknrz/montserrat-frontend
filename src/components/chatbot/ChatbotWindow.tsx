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

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") onSend();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  return (
    <div className="fixed bottom-4 right-3 z-50 flex h-[min(560px,calc(100vh-2rem))] w-[calc(100vw-1.5rem)] max-w-[380px] flex-col overflow-hidden rounded-[20px] border border-black/8 bg-white shadow-[0_2px_24px_rgba(0,0,0,0.08)] sm:bottom-6 sm:right-6">

      {/* Header */}
      <div className="flex flex-shrink-0 items-center gap-3 bg-[#111] px-[18px] py-4">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border border-white/8 bg-[#1e1e1e]">
          <Bot size={17} className="text-[#c8a96e]" />
        </span>
        <div>
          <p className="text-[13px] font-medium leading-tight tracking-[0.01em] text-white">
            Asistente Monserrat
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/40">
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
          className="ml-auto flex rounded-md p-1 text-white/35 transition hover:text-white/70"
          aria-label="Cerrar chat"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-white px-4 py-[18px] [scrollbar-width:thin]">
        {messages.map((message) => (
          <ChatbotMessage key={message.id} message={message} />
        ))}
        {isTyping && (
          <div className="flex self-start">
            <div className="flex items-center gap-[5px] rounded-[14px] rounded-bl-[4px] border border-black/8 bg-gray-50 px-[14px] py-3">
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
      <div className="flex flex-shrink-0 items-center gap-2 border-t border-black/8 bg-white px-[14px] py-3 pb-[14px]">
        <input
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu consulta…"
          className="min-w-0 flex-1 rounded-xl border border-black/10 bg-gray-50 px-3 py-2 text-[13px] text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-black/20 focus:bg-white"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-[#111] text-[#c8a96e] transition hover:opacity-75 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Enviar mensaje"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}