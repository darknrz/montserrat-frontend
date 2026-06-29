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
  userId?: number;
  username: string;
  nombre: string;
  rol: string;
  debeCambiarContrasena?: boolean;
};

export type UsuarioAcademico = {
  id: number;
  dni: string;
  codigo?: string;
  nombre: string;
  nombres?: string;
  apellidos?: string;
  correo?: string;
  direccion?: string;
  fechaNacimiento?: string;
  rol: "ADMIN" | "DOCENTE" | "ALUMNO" | string;
  estado?: "ACTIVO" | "INACTIVO" | "SUSPENDIDO" | string;
  activo?: boolean;
  telefono?: string;
  fotoUrl?: string;
  nivelEducativo?: "PRIMARIA" | "SECUNDARIA" | string;
  grado?: "PRIMERO_PRIMARIA" | "SEGUNDO_PRIMARIA" | "TERCERO_PRIMARIA" | "CUARTO_PRIMARIA" | "QUINTO_PRIMARIA" | "SEXTO_PRIMARIA" | "PRIMERO_SECUNDARIA" | "SEGUNDO_SECUNDARIA" | "TERCERO_SECUNDARIA" | "CUARTO_SECUNDARIA" | "QUINTO_SECUNDARIA" | string;
  seccion?: "A" | "B" | "C" | "D" | string;
  materia?: string;
  especialidad?: string;
  estadoMatricula?: "MATRICULADO" | "RETIRADO" | "TRASLADADO" | "EGRESADO" | string;
  pensionPagada?: boolean;
  pensionObservacion?: string;
  debeCambiarContrasena?: boolean;
  createdAt?: string;
  inicioPeriodo?: string;
};

export type PerfilAcademico = UsuarioAcademico & {
  activo?: boolean;
};

export type AsignacionAcademica = {
  id: number;
  docenteId: number;
  docenteDni: string;
  docenteNombre: string;
  alumnoId: number;
  alumnoDni: string;
  alumnoNombre: string;
  curso: string;
  nivelEducativo?: string;
  grado?: string;
  seccion?: string;
  activo?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AsistenciaAcademica = {
  id: number;
  alumnoDni: string;
  alumnoNombre: string;
  docenteNombre: string;
  fecha: string;
  estado: string;
  observacion?: string;
};

export type NotaAcademica = {
  id: number;
  alumnoDni: string;
  alumnoNombre: string;
  docenteNombre: string;
  curso: string;
  periodo: string;
  tipoEvaluacion?: string;
  valor: number;
  observacion?: string;
};

export type PensionEstado = {
  dni: string;
  nombre: string;
  pagada: boolean;
  observacion?: string;
};

export type PensionMensual = {
  alumnoDni: string;
  alumnoCodigo?: string;
  alumnoNombre: string;
  nivelEducativo?: string;
  grado?: string;
  seccion?: string;
  anio: number;
  mes: number;
  pagada: boolean;
  activa?: boolean;
  observacion?: string;
  actualizadoEn?: string;
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
  resourceType: "image" | "video" | "raw" | string;
  secureUrl: string;
  thumbnailUrl?: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  duration?: number;
  originalFilename?: string;
};

export type Anuncio = {
  id: number;
  titulo: string;
  mensaje?: string;
  verMasTexto: string;
  attachmentUrl?: string;
  attachmentPublicId?: string;
  attachmentResourceType?: string;
  attachmentMimeType?: string;
  mostrarEnPopup?: boolean;
  activo?: boolean;
  orden?: number;
};

