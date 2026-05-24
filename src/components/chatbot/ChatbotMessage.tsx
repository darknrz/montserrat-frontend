import type { ChatMessage } from "../../hooks/useChatbot";

type ChatbotMessageProps = {
  message: ChatMessage;
};

export function ChatbotMessage({ message }: ChatbotMessageProps) {
  const isUser = message.sender === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-lg px-4 py-3 text-sm leading-5 ${
          isUser ? "bg-monserrat-red text-white" : "border border-black/10 bg-white text-monserrat-ink"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}
