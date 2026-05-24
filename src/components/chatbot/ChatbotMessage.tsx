import type { ReactNode } from "react";
import type { ChatMessage } from "../../hooks/useChatbot";

type ChatbotMessageProps = {
  message: ChatMessage;
};

export function ChatbotMessage({ message }: ChatbotMessageProps) {
  const isUser = message.sender === "user";

  return (
    <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-monserrat-black text-xs font-black text-monserrat-gold">
          M
        </span>
      )}
      <div
        className={`max-w-[84%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
          isUser
            ? "rounded-br-md bg-monserrat-red text-white"
            : "rounded-bl-md border border-black/10 bg-white text-monserrat-ink"
        }`}
      >
        <RichMessage text={message.text} isUser={isUser} />
      </div>
    </div>
  );
}

function RichMessage({ text, isUser }: { text: string; isUser: boolean }) {
  const lines = text.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;

    blocks.push(
      <ul key={`list-${blocks.length}`} className="my-2 space-y-1.5">
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-2">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${isUser ? "bg-white/80" : "bg-monserrat-red"}`} />
            <span>{renderInline(item)}</span>
          </li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      blocks.push(<div key={`space-${index}`} className="h-2" />);
      return;
    }

    if (trimmed.startsWith("- ")) {
      listItems.push(trimmed.slice(2));
      return;
    }

    flushList();

    const isHeading = trimmed.endsWith(":") && trimmed.length <= 80;
    blocks.push(
      <p key={`line-${index}`} className={isHeading ? "mt-2 font-extrabold text-current first:mt-0" : "mt-1 first:mt-0"}>
        {renderInline(trimmed)}
      </p>
    );
  });

  flushList();

  return <div className="break-words">{blocks}</div>;
}

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`} className="font-extrabold">{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={`${part}-${index}`} className="italic">{part.slice(1, -1)}</em>;
    }

    return part;
  });
}
