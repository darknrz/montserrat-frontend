import type { ChatbotConversationResponse, ChatbotMessageDTO, Ingresante, Institution, LoginResponse, MediaUploadResponse, RedSocial, Video } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get("Content-Type") ?? "";

  if (contentType.includes("application/json")) {
    const data = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
    return data?.message ?? data?.error ?? fallback;
  }

  const text = await response.text().catch(() => "");
  return text || fallback;
}

function resolveWebSocketUrl(): string {
  const configuredUrl = import.meta.env.VITE_WS_CHAT_URL;
  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window === "undefined") {
    return "ws://localhost:8080/ws/chat";
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/chat`;
}

export const WS_CHAT_URL = resolveWebSocketUrl();

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, `Error ${response.status} al cargar ${path}`));
  }

  return (await response.json()) as T;
}

async function sendJson<T>(path: string, method: string, body: unknown, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, `Error ${response.status} al guardar ${path}`));
  }

  return (await response.json()) as T;
}

async function deleteRequest(path: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, `Error ${response.status} al eliminar ${path}`));
  }
}

async function uploadFile(file: File, folder: string, token: string): Promise<MediaUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const response = await fetch(`${API_BASE_URL}/media/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, `Error ${response.status} al subir archivo`));
  }

  return (await response.json()) as MediaUploadResponse;
}

export const monserratApi = {
  login: (username: string, password: string) =>
    sendJson<LoginResponse>("/auth/login", "POST", { username, password }),
  institution: () => getJson<Institution>("/institution"),
  ingresantes: () => getJson<Ingresante[]>("/ingresantes"),
  videos: () => getJson<Video[]>("/videos"),
  redesSociales: () => getJson<RedSocial[]>("/redes-sociales"),
  createChatbotConversation: () =>
    sendJson<ChatbotConversationResponse>("/chatbot/conversations", "POST", {}),
  chatbotHistory: (conversationId: number) =>
    getJson<ChatbotMessageDTO[]>(`/chatbot/conversations/${conversationId}/messages`),
  updateInstitution: (id: number, data: Institution, token: string) =>
    sendJson<Institution>(`/institution/${id}`, "PUT", data, token),
  createIngresante: (data: Omit<Ingresante, "id">, token: string) =>
    sendJson<Ingresante>("/ingresantes", "POST", data, token),
  updateIngresante: (id: number, data: Omit<Ingresante, "id">, token: string) =>
    sendJson<Ingresante>(`/ingresantes/${id}`, "PUT", data, token),
  deleteIngresante: (id: number, token: string) => deleteRequest(`/ingresantes/${id}`, token),
  createVideo: (data: Omit<Video, "id">, token: string) =>
    sendJson<Video>("/videos", "POST", data, token),
  updateVideo: (id: number, data: Omit<Video, "id">, token: string) =>
    sendJson<Video>(`/videos/${id}`, "PUT", data, token),
  deleteVideo: (id: number, token: string) => deleteRequest(`/videos/${id}`, token),
  createRedSocial: (data: Omit<RedSocial, "id">, token: string) =>
    sendJson<RedSocial>("/redes-sociales", "POST", data, token),
  updateRedSocial: (id: number, data: Omit<RedSocial, "id">, token: string) =>
    sendJson<RedSocial>(`/redes-sociales/${id}`, "PUT", data, token),
  deleteRedSocial: (id: number, token: string) => deleteRequest(`/redes-sociales/${id}`, token),
  uploadMedia: (file: File, folder: string, token: string) => uploadFile(file, folder, token),
  deleteMedia: (publicId: string, resourceType: string, token: string) =>
    deleteRequest(`/media?publicId=${encodeURIComponent(publicId)}&resourceType=${encodeURIComponent(resourceType)}`, token)
};
