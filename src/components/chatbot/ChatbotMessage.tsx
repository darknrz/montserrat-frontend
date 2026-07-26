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
  let tableRows: string[][] = [];

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

  const flushTable = () => {
    if (tableRows.length === 0) return;

    const [header, ...rows] = tableRows;
    blocks.push(
      <div key={`table-${blocks.length}`} className="my-2 max-w-full overflow-x-auto rounded-lg border border-monserrat-ink/10">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead className="bg-monserrat-cream/60 text-monserrat-ink">
            <tr>
              {header.map((cell, index) => (
                <th key={`${cell}-${index}`} className="border-b border-monserrat-ink/10 px-3 py-2 font-black">
                  {renderInline(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`} className="border-t border-monserrat-ink/6">
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`} className="px-3 py-2 align-top">
                    {renderInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      flushTable();
      blocks.push(<div key={`space-${index}`} className="h-2" />);
      return;
    }

    if (isMarkdownTableSeparator(trimmed)) {
      return;
    }

    if (isMarkdownTableRow(trimmed)) {
      flushList();
      tableRows.push(parseMarkdownTableRow(trimmed));
      return;
    }

    if (trimmed.startsWith("- ")) {
      flushTable();
      listItems.push(trimmed.slice(2));
      return;
    }

    flushList();
    flushTable();

    const isHeading = trimmed.endsWith(":") && trimmed.length <= 80;
    blocks.push(
      <p key={`line-${index}`} className={isHeading ? "mt-2 font-extrabold text-current first:mt-0" : "mt-1 first:mt-0"}>
        {renderInline(trimmed)}
      </p>
    );
  });

  flushList();
  flushTable();

  return <div className="break-words">{blocks}</div>;
}

function isMarkdownTableRow(line: string) {
  return line.startsWith("|") && line.endsWith("|") && line.slice(1, -1).includes("|");
}

function isMarkdownTableSeparator(line: string) {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line);
}

function parseMarkdownTableRow(line: string) {
  return line
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
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
