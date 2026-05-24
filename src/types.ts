export type Institution = {
  id?: number;
  nombre: string;
  direccion: string;
  ciudad: string;
  distrito?: string;
  anioFundacion: string;
  telefono?: string;
  email: string;
  niveles: string;
  tipo: string;
  mision: string;
  vision: string;
  descripcion: string;
  logoUrl?: string;
  bannerUrl?: string;
  horarioAtencion: string;
};

export type Ingresante = {
  id: number;
  nombre: string;
  universidad: string;
  universidadSiglas: string;
  carrera: string;
  anio: string;
  tipoSeleccion: string;
  fotoUrl?: string;
  activo?: boolean;
};

export type Video = {
  id: number;
  titulo: string;
  descripcion: string;
  mediaType: "image" | "video" | string;
  mediaUrl: string;
  publicId: string;
  thumbnailUrl?: string;
  formato?: string;
  tag: string;
  tagColor: string;
  activo?: boolean;
  orden?: number;
};

export type RedSocial = {
  id: number;
  nombre: "Facebook" | "YouTube" | string;
  icono: string;
  url: string;
  activo?: boolean;
  orden?: number;
};

export type LoginResponse = {
  token: string;
  tipo: string;
  username: string;
  nombre: string;
  rol: string;
};

export type ChatbotConversationResponse = {
  conversationId: number;
  status: string;
};

export type ChatbotMessageDTO = {
  id: number;
  conversationId: number;
  sender: "bot" | "user";
  text: string;
  intent?: string;
  createdAt?: string;
};

export type MediaUploadResponse = {
  publicId: string;
  resourceType: "image" | "video" | string;
  secureUrl: string;
  thumbnailUrl?: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  duration?: number;
  originalFilename?: string;
};
