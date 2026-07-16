import type { Anuncio, AsignacionAcademica, AsistenciaAcademica, ChatbotConversationResponse, ChatbotMessageDTO, Ingresante, Institution, LoginResponse, MediaUploadResponse, NotaAcademica, PensionEstado, PensionMensual, PeriodoBimestre, PerfilAcademico, RedSocial, UsuarioAcademico, Video } from "../types";

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

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function getJsonAuth<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

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

  if (response.status === 204) {
    return undefined as T;
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
    deleteRequest(`/media?publicId=${encodeURIComponent(publicId)}&resourceType=${encodeURIComponent(resourceType)}`, token),
  anuncios: () => getJson<Anuncio[]>('/anuncios'),
  createAnuncio: (data: Omit<Anuncio, 'id'>, token: string) => sendJson<Anuncio>('/anuncios', 'POST', data, token),
  updateAnuncio: (id: number, data: Omit<Anuncio, 'id'>, token: string) => sendJson<Anuncio>(`/anuncios/${id}`, 'PUT', data, token),
  deleteAnuncio: (id: number, token: string) => deleteRequest(`/anuncios/${id}`, token),
  usuariosAcademicos: (token: string) => getJsonAuth<UsuarioAcademico[]>('/academico/usuarios', token),
  academicoConfiguracion: <T>(token: string) => getJsonAuth<T>("/academico/configuracion", token),
  updateAcademicoConfiguracion: <T>(data: T, token: string) =>
    sendJson<T>("/academico/configuracion", "PUT", data, token),
  asignacionesAcademicas: (token: string) => getJsonAuth<AsignacionAcademica[]>("/academico/asignaciones", token),
  asignacionesDocente: (token: string) => getJsonAuth<AsignacionAcademica[]>("/academico/docente/asignaciones", token),
  asignacionesAlumno: (token: string) => getJsonAuth<AsignacionAcademica[]>("/academico/alumno/asignaciones", token),
  alumnosDocenteAcademicos: (token: string) => getJsonAuth<UsuarioAcademico[]>("/academico/docente/alumnos", token),
  createUsuarioAcademico: (data: Omit<UsuarioAcademico, "id">, token: string) =>
    sendJson<UsuarioAcademico>("/academico/usuarios", "POST", data, token),
  updateUsuarioAcademico: (id: number, data: Partial<UsuarioAcademico>, token: string) =>
    sendJson<UsuarioAcademico>(`/academico/usuarios/${id}`, "PUT", data, token),
  deleteUsuarioAcademico: (id: number, token: string, force = false) =>
    deleteRequest(`/academico/usuarios/${id}${force ? "?force=true" : ""}`, token),
  createAsignacionAcademica: (data: { docenteDni: string; alumnoDni: string; curso: string; nivelEducativo: string; grado: string; seccion: string; activo?: boolean }, token: string) =>
    sendJson<AsignacionAcademica>("/academico/asignaciones", "POST", data, token),
  createAsignacionAula: (data: { docenteDni: string; curso?: string; nivelEducativo: string; grado: string; seccion: string; activo?: boolean }, token: string) =>
    sendJson<AsignacionAcademica[]>("/academico/asignaciones/aula", "POST", data, token),
  updateAsignacionAcademica: (id: number, data: { docenteDni: string; alumnoDni: string; curso: string; nivelEducativo: string; grado: string; seccion: string; activo?: boolean }, token: string) =>
    sendJson<AsignacionAcademica>(`/academico/asignaciones/${id}`, "PUT", data, token),
  deleteAsignacionAcademica: (id: number, token: string) => deleteRequest(`/academico/asignaciones/${id}`, token),
  perfilAcademico: (token: string) => getJsonAuth<PerfilAcademico>("/academico/me", token),
  updatePerfilAcademico: (data: Partial<PerfilAcademico>, token: string) =>
    sendJson<PerfilAcademico>("/academico/me", "PUT", data, token),
  cambiarPasswordAcademico: (currentPassword: string, newPassword: string, token: string) =>
    sendJson<void>("/academico/me/password", "POST", { currentPassword, newPassword }, token),
  alumnosAcademicos: (token: string) => getJsonAuth<UsuarioAcademico[]>("/academico/alumnos", token),
  pensionesAcademicas: (anio: number, token: string) =>
    getJsonAuth<PensionMensual[]>(`/academico/pensiones?anio=${encodeURIComponent(String(anio))}`, token),
  updatePensionAcademica: (data: { alumnoDni: string; anio: number; mes: number; pagada: boolean; observacion?: string }, token: string) =>
    sendJson<PensionMensual>("/academico/pensiones", "PUT", data, token),
  asistenciasDocente: (token: string) => getJsonAuth<AsistenciaAcademica[]>("/academico/docente/asistencias", token),
  createAsistencia: (data: { alumnoDni: string; fecha: string; estado: string; observacion?: string }, token: string) =>
    sendJson<AsistenciaAcademica>("/academico/docente/asistencias", "POST", data, token),
  notasDocente: (token: string) => getJsonAuth<NotaAcademica[]>("/academico/docente/notas", token),
  createNota: (data: { alumnoDni: string; curso: string; periodo: string; tipoEvaluacion: string; valor: number; observacion?: string }, token: string) =>
    sendJson<NotaAcademica>("/academico/docente/notas", "POST", data, token),
  updateNota: (id: number, data: { alumnoDni: string; curso: string; periodo: string; tipoEvaluacion: string; valor: number; observacion?: string }, token: string) =>
    sendJson<NotaAcademica>(`/academico/docente/notas/${id}`, "PUT", data, token),
  notasAlumno: (token: string) => getJsonAuth<NotaAcademica[]>("/academico/alumno/notas", token),
  pensionAlumno: (token: string) => getJsonAuth<PensionEstado>("/academico/alumno/pension", token),
  asistenciasAlumno: (token: string) => getJsonAuth<AsistenciaAcademica[]>("/academico/alumno/asistencias", token),
  pensionesAlumnoDetalle: (anio: number, token: string) =>
    getJsonAuth<PensionMensual[]>(`/academico/alumno/pension/detalle?anio=${encodeURIComponent(String(anio))}`, token),
  
  // Períodos Bimestrales
  listarPeriodosBimestres: (anio: number, token: string) =>
    getJsonAuth<PeriodoBimestre[]>(`/academico/periodos-bimestres?anio=${encodeURIComponent(String(anio))}`, token),
  crearPeriodoBimestre: (data: Omit<PeriodoBimestre, 'id' | 'createdAt' | 'updatedAt'>, token: string) =>
    sendJson<PeriodoBimestre>("/academico/periodos-bimestres", "POST", data, token),
  actualizarPeriodoBimestre: (id: number, data: Omit<PeriodoBimestre, 'id' | 'createdAt' | 'updatedAt'>, token: string) =>
    sendJson<PeriodoBimestre>(`/academico/periodos-bimestres/${id}`, "PUT", data, token),
  eliminarPeriodoBimestre: (id: number, token: string) =>
    deleteRequest(`/academico/periodos-bimestres/${id}`, token)
};
