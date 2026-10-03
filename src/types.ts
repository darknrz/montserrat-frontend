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

// Los 3 tipos de cuenta admin: SUPER_ADMIN ve todo, ADMIN ve todo excepto
// pensiones, ADMIN_PENSIONES solo ve pensiones.
export const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN", "ADMIN_PENSIONES"] as const;

export function isAdminRole(rol?: string | null): boolean {
  return !!rol && (ADMIN_ROLES as readonly string[]).includes(rol);
}

export function isPensionesOnlyAdmin(rol?: string | null): boolean {
  return rol === "ADMIN_PENSIONES";
}

export function canAccessPensiones(rol?: string | null): boolean {
  return rol === "SUPER_ADMIN" || rol === "ADMIN_PENSIONES";
}

export function canAccessAdminGeneral(rol?: string | null): boolean {
  return rol === "SUPER_ADMIN" || rol === "ADMIN";
}

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
  codigoChatbot?: string;
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
  competenciaId?: string;
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

export type Matricula = {
  id?: number;
  alumnoDni: string;
  alumnoCodigo?: string;
  alumnoNombre: string;
  nivelEducativo?: string;
  grado?: string;
  seccion?: string;
  anio: number;
  monto?: number;
  pagada: boolean;
  observacion?: string;
  actualizadoEn?: string;
};

export type TallerCatalogo = {
  id: number;
  anio: number;
  nombre: string;
  monto: number;
  // "SALON:CICLADO I" | "GRADO:SEGUNDO_SECUNDARIA"
  aplicaA: string[];
};

export type Taller = {
  id: number;
  catalogoId?: number | null;
  montoPagado?: number | null;
  alumnoDni: string;
  alumnoCodigo?: string;
  alumnoNombre: string;
  nivelEducativo?: string;
  grado?: string;
  seccion?: string;
  anio: number;
  nombre: string;
  monto: number;
  pagada: boolean;
  observacion?: string;
  creadoEn?: string;
  actualizadoEn?: string;
};

export type PeriodoBimestre = {
  id?: number;
  anio: number;
  numeroBimestre: number; // 1, 2, 3, 4
  fechaInicio: string; // ISO date format
  fechaFin: string; // ISO date format
  createdAt?: string;
  updatedAt?: string;
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
  imageUrl?: string;
  imagePublicId?: string;
  imageMimeType?: string;
  attachmentUrl?: string;
  attachmentPublicId?: string;
  attachmentResourceType?: string;
  attachmentMimeType?: string;
  mostrarEnPopup?: boolean;
  activo?: boolean;
  orden?: number;
  expiresAt?: string;
};

export type EstadoAnioEscolar = "PLANIFICADO" | "ACTIVO" | "CERRADO";
export type AccionMigracion = "PROMOVER" | "REPETIR" | "EGRESAR" | "RETIRAR";

export type AnioEscolar = {
  id: number;
  anio: number;
  estado: EstadoAnioEscolar;
  fechaCierre?: string;
  cerradoPor?: string;
  totalPromovidos?: number;
  totalRepitentes?: number;
  totalEgresados?: number;
  totalRetirados?: number;
};

export type MigracionDecision = {
  alumnoId: number;
  accion?: AccionMigracion;
  seccion?: string;
};

export type MigracionRequest = {
  anioDestino: number;
  copiarBimestres: boolean;
  decisiones: MigracionDecision[];
  confirmacion?: string;
};

export type MigracionItem = {
  alumnoId: number;
  dni: string;
  codigo?: string;
  nombre: string;
  nivelActual?: string;
  gradoActual?: string;
  seccionActual?: string;
  accion: AccionMigracion;
  nivelDestino?: string;
  gradoDestino?: string;
  seccionDestino?: string;
  seccionesPermitidas: string[];
  requiereSeccion: boolean;
  usaGrupo: boolean;
  salonSugerido: boolean;
};

export type MigracionPreview = {
  anioOrigen: number;
  anioDestino: number;
  items: MigracionItem[];
  promovidos: number;
  repitentes: number;
  egresados: number;
  retirados: number;
  pendientesSeccion: number;
  notasAArchivar: number;
  asistenciasAArchivar: number;
  bimestresACopiar: number;
  omitidos: string[];
  puedeEjecutar: boolean;
};

export type MigracionResultado = {
  anioOrigen: number;
  anioDestino: number;
  promovidos: number;
  repitentes: number;
  egresados: number;
  retirados: number;
  notasArchivadas: number;
  asistenciasArchivadas: number;
  bimestresCopiados: number;
  alumnosSinAsignaciones: number;
};
