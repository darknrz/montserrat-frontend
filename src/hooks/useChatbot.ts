import { useEffect, useMemo, useRef, useState } from "react";
import { monserratApi, WS_CHAT_URL } from "../api/monserrat";

export type ChatMessage = {
  id: number;
  sender: "bot" | "user";
  text: string;
  intent?: string;
};

type SocketPayload = {
  type: "typing" | "message";
  conversationId: number;
  sender: "bot" | "user";
  text: string;
  intent?: string;
  messageId?: number;
};

const initialMessage: ChatMessage = {
  id: 1,
  sender: "bot",
  text: "Hola, soy el **Asistente Monserrat**. Puedo ayudarte con **matricula**, **uniforme**, **horario**, **ingresantes**, **ubicacion** y **pensiones**."
};

export function useChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const canSend = useMemo(
    () => input.trim().length > 0 && Boolean(conversationId) && isConnected,
    [conversationId, input, isConnected]
  );

  useEffect(() => {
    if (!isOpen || conversationId) return;

    void monserratApi.createChatbotConversation().then(async (response) => {
      setConversationId(response.conversationId);
      const history = await monserratApi.chatbotHistory(response.conversationId);

      if (history.length > 0) {
        setMessages(history.map((item) => ({
          id: item.id,
          sender: item.sender,
          text: item.text,
          intent: item.intent
        })));
      }
    }).catch(() => {
      setMessages((current) => [...current, {
        id: Date.now(),
        sender: "bot",
        text: "No pude iniciar la conversacion con el servidor. Verifica que el backend este activo."
      }]);
    });
  }, [conversationId, isOpen]);

  useEffect(() => {
    if (!conversationId || socketRef.current) return;

    const socket = new WebSocket(WS_CHAT_URL);
    socketRef.current = socket;

    socket.onopen = () => setIsConnected(true);
    socket.onclose = () => {
      setIsConnected(false);
      socketRef.current = null;
    };
    socket.onerror = () => setIsConnected(false);
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data as string) as SocketPayload;

      if (payload.type === "typing") {
        setIsTyping(true);
        return;
      }

      setIsTyping(false);
      setMessages((current) => {
        if (payload.messageId && current.some((message) => message.id === payload.messageId)) {
          return current;
        }

        return [...current, {
          id: payload.messageId ?? Date.now(),
          sender: payload.sender,
          text: payload.text,
          intent: payload.intent
        }];
      });
    };

    return () => {
      socket.close();
    };
  }, [conversationId]);

  const sendMessage = (messageOverride?: string) => {
    const trimmed = (messageOverride ?? input).trim();
    if (!trimmed || !conversationId || socketRef.current?.readyState !== WebSocket.OPEN) return;

    socketRef.current.send(JSON.stringify({ conversationId, message: trimmed }));
    if (!messageOverride) {
      setInput("");
    }
  };

  return {
    isOpen,
    setIsOpen,
    messages,
    input,
    setInput,
    canSend,
    sendMessage,
    isConnected,
    isTyping
  };
}
