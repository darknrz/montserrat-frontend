export const TIPOS_SELECCION = ["Ordinario", "Primera Selección", "Ingreso Especial"] as const;
export type TipoSeleccion = typeof TIPOS_SELECCION[number];

export const YEARS = ["2025", "2024", "2023", "2022", "2021"];
export const NIVELES = ["PRIMARIA", "SECUNDARIA"] as const;
export const GRADOS_PRIMARIA = ["PRIMERO_PRIMARIA", "SEGUNDO_PRIMARIA", "TERCERO_PRIMARIA", "CUARTO_PRIMARIA", "QUINTO_PRIMARIA", "SEXTO_PRIMARIA"] as const;
export const GRADOS_SECUNDARIA = ["PRIMERO_SECUNDARIA", "SEGUNDO_SECUNDARIA", "TERCERO_SECUNDARIA", "CUARTO_SECUNDARIA", "QUINTO_SECUNDARIA"] as const;
export const SECCIONES = ["A", "B", "C", "D"] as const;
export const CURSOS = ["MATEMATICA", "COMUNICACION", "CIENCIA_TECNOLOGIA", "HISTORIA", "INGLES"] as const;
export const ESTADOS_USUARIO = ["ACTIVO", "INACTIVO", "SUSPENDIDO"] as const;
export const ESTADOS_MATRICULA = ["MATRICULADO", "RETIRADO", "TRASLADADO", "EGRESADO"] as const;
export const MESES_PENSION = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"] as const;

export const ADMIN_TAB_STORAGE_KEY = "monserrat_admin_active_tab";

export type Tab = "institucion" | "ingresantes" | "anuncios" | "videos" | "redes" | "academico" | "asignaciones" | "pensiones" | "configuracion";
export type CatalogItem = { id: string; label: string; active: boolean };
export type SalonItem = { nivel: string; grado: string; seccion: string; aula: string; active: boolean };
export type ConfigView = "primaria-cursos" | "primaria-competencias" | "primaria-grados" | "primaria-secciones" | "primaria-salones" | "secundaria-cursos" | "secundaria-grados" | "secundaria-secciones" | "secundaria-salones";

export type AcademicoConfig = {
  cursosPrimaria: CatalogItem[];
  competenciasPrimaria: CatalogItem[];
  // mapeo: cursoId -> lista de competenciasPrimaria ids
  competenciasPorCursoPrimaria?: Record<string, string[]>;
  // mapeo: `${gradoId}||${cursoId}||${competenciaId}` -> docenteDni
  // Permite que un mismo docente enseñe la misma competencia en varios grados,
  // y que cada competencia de cada área curricular tenga su propio docente por grado.
  docentesPorCompetencia?: Record<string, string>;
  cursosSecundaria: CatalogItem[];
  gradosPrimaria: CatalogItem[];
  gradosSecundaria: CatalogItem[];
  seccionesPrimaria: CatalogItem[];
  seccionesSecundaria: CatalogItem[];
  salones: SalonItem[];
  minAsistenciaPorcentaje?: number;
  ingresantesModelo?: string;
};

// ---------------------------------------------------------------------------
// IMPORTANTE: LABEL_OVERRIDES y labelFromEnum deben declararse ANTES de
// defaultAcademicoConfig, porque defaultAcademicoConfig los usa de inmediato
// (dentro de los .map()) al momento de cargarse el módulo. Si se declaran
// más abajo en el archivo, se produce:
// "Uncaught ReferenceError: Cannot access 'LABEL_OVERRIDES' before initialization"
// ---------------------------------------------------------------------------

const LABEL_OVERRIDES: Record<string, string> = {
  ARTE_CULTURA: "Arte y Cultura",
  PERSONAL_SOCIAL: "Personal Social",
  EDUCACION_RELIGIOSA: "Educacion Religiosa",
  EDUCACION_FISICA: "Educacion Fisica",
  CASTELLANO_SEGUNDA_LENGUA: "Castellano como Segunda Lengua",
  COMPETENCIAS_TRANSVERSALES: "Competencias Transversales",
  CIENCIA_TECNOLOGIA: "Ciencia y Tecnologia"
};

export function labelFromEnum(value: string) {
  if (!value) return "";
  const override = LABEL_OVERRIDES[value];
  if (override) return override;
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const defaultAcademicoConfig: AcademicoConfig = {
  cursosPrimaria: [
    "INGLES",
    "PERSONAL_SOCIAL",
    "EDUCACION_RELIGIOSA",
    "EDUCACION_FISICA",
    "COMUNICACION",
    "ARTE_CULTURA",
    "CASTELLANO_SEGUNDA_LENGUA",
    "MATEMATICA",
    "CIENCIA_TECNOLOGIA",
    "COMPETENCIAS_TRANSVERSALES"
  ].map((id) => ({ id, label: labelFromEnum(id), active: true })),
  competenciasPrimaria: [
    { id: "C1", label: "Indaga mediante métodos científicos para construir sus conocimientos.", active: true },
    { id: "C2", label: "Explica el mundo físico basándose en conocimientos sobre los seres vivos, materia y energía, biodiversidad, Tierra y universo.", active: true },
    { id: "C3", label: "Diseña y construye soluciones tecnológicas para resolver problemas de su entorno.", active: true },
  ],
  competenciasPorCursoPrimaria: {},
  docentesPorCompetencia: {},
  cursosSecundaria: CURSOS.map((id) => ({ id, label: labelFromEnum(id), active: true })),
  gradosPrimaria: GRADOS_PRIMARIA.map((id) => ({ id, label: labelFromEnum(id), active: true })),
  gradosSecundaria: GRADOS_SECUNDARIA.map((id) => ({ id, label: labelFromEnum(id), active: true })),
  seccionesPrimaria: SECCIONES.map((id) => ({ id, label: id, active: true })),
  seccionesSecundaria: SECCIONES.map((id) => ({ id, label: id, active: true })),
  salones: [...GRADOS_PRIMARIA.map((grado) => ({ nivel: "PRIMARIA", grado })), ...GRADOS_SECUNDARIA.map((grado) => ({ nivel: "SECUNDARIA", grado }))]
    .flatMap(({ nivel, grado }) => SECCIONES.map((seccion) => ({ nivel, grado, seccion, aula: aulaPorGradoSeccion(nivel, grado, seccion), active: true }))),
  minAsistenciaPorcentaje: 70
  ,ingresantesModelo: "card-grid"
};

// available templates for ingresantes
export const INGRESANTES_MODELS = ["card-grid", "card-featured"] as const;


export function mergeAcademicoConfig(config: Partial<AcademicoConfig>) {
  const legacy = config as Partial<AcademicoConfig> & { cursos?: CatalogItem[]; secciones?: CatalogItem[] };
  const hasSavedConfig = [
    config.cursosPrimaria,
    config.cursosSecundaria,
    config.gradosPrimaria,
    config.gradosSecundaria,
    config.seccionesPrimaria,
    config.seccionesSecundaria,
    config.salones,
    legacy.cursos,
    legacy.secciones,
    config.minAsistenciaPorcentaje !== undefined
  ].some((items) => Array.isArray(items) || typeof items === "boolean" && items);

  if (!hasSavedConfig) return defaultAcademicoConfig;

  return {
    cursosPrimaria: config.cursosPrimaria ?? legacy.cursos ?? defaultAcademicoConfig.cursosPrimaria,
    competenciasPrimaria: config.competenciasPrimaria ?? defaultAcademicoConfig.competenciasPrimaria,
    competenciasPorCursoPrimaria: config.competenciasPorCursoPrimaria ?? defaultAcademicoConfig.competenciasPorCursoPrimaria,
    docentesPorCompetencia: config.docentesPorCompetencia ?? defaultAcademicoConfig.docentesPorCompetencia,
    cursosSecundaria: config.cursosSecundaria ?? legacy.cursos ?? defaultAcademicoConfig.cursosSecundaria,
    gradosPrimaria: config.gradosPrimaria ?? defaultAcademicoConfig.gradosPrimaria,
    gradosSecundaria: config.gradosSecundaria ?? defaultAcademicoConfig.gradosSecundaria,
    seccionesPrimaria: config.seccionesPrimaria ?? legacy.secciones ?? defaultAcademicoConfig.seccionesPrimaria,
    seccionesSecundaria: config.seccionesSecundaria ?? defaultAcademicoConfig.seccionesSecundaria,
    salones: config.salones ?? defaultAcademicoConfig.salones,
    minAsistenciaPorcentaje: config.minAsistenciaPorcentaje ?? defaultAcademicoConfig.minAsistenciaPorcentaje,
    ingresantesModelo: (config as any).ingresantesModelo ?? defaultAcademicoConfig.ingresantesModelo
  };
}

export function isAdminTab(value: string | null): value is Tab {
  return value === "institucion"
    || value === "ingresantes"
    || value === "videos"
    || value === "redes"
    || value === "academico"
    || value === "asignaciones"
    || value === "pensiones"
    || value === "configuracion";
}

export function createCatalogId(label: string, existing: CatalogItem[]) {
  const base = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "NUEVO";
  let id = base;
  let counter = 1;
  while (existing.some((item) => item.id === id)) {
    counter += 1;
    id = `${base}_${counter}`;
  }
  return id;
}

export function gradosPorNivel(nivel?: string) {
  return nivel === "SECUNDARIA" ? GRADOS_SECUNDARIA : GRADOS_PRIMARIA;
}

export function defaultGrado(nivel: string) {
  return nivel === "SECUNDARIA" ? "PRIMERO_SECUNDARIA" : "PRIMERO_PRIMARIA";
}

export function aulasPorNivel(nivel?: string) {
  const grados = nivel === "SECUNDARIA" ? GRADOS_SECUNDARIA : GRADOS_PRIMARIA;
  return grados.flatMap((grado) => SECCIONES.map((seccion) => aulaPorGradoSeccion(nivel, grado, seccion)));
}

export function aulaPorGradoSeccion(nivel: string | undefined, grado: string, seccion: string) {
  const grados = nivel === "SECUNDARIA" ? GRADOS_SECUNDARIA : GRADOS_PRIMARIA;
  const base = nivel === "SECUNDARIA" ? 700 : 100;
  const gradoIndex = Math.max(grados.indexOf(grado as never), 0) + 1;
  const seccionIndex = Math.max(SECCIONES.indexOf(seccion as never), 0) + 1;
  return String(base + gradoIndex * 10 + seccionIndex);
}

export function normalizeNivel(value: unknown) {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
  if (normalized.includes("SECUNDARIA")) return "SECUNDARIA";
  if (normalized.includes("PRIMARIA")) return "PRIMARIA";
  return "";
}

export function normalizeGrado(value: unknown, nivel: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const grados = nivel === "SECUNDARIA" ? GRADOS_SECUNDARIA : GRADOS_PRIMARIA;
  const exact = grados.find((grado) => grado === normalized);
  if (exact) return exact;
  const ordinalMap: Record<string, string> = {
    "1": "PRIMERO",
    "01": "PRIMERO",
    PRIMERO: "PRIMERO",
    PRIMER: "PRIMERO",
    "2": "SEGUNDO",
    "02": "SEGUNDO",
    SEGUNDO: "SEGUNDO",
    "3": "TERCERO",
    "03": "TERCERO",
    TERCERO: "TERCERO",
    TERCER: "TERCERO",
    "4": "CUARTO",
    "04": "CUARTO",
    CUARTO: "CUARTO",
    "5": "QUINTO",
    "05": "QUINTO",
    QUINTO: "QUINTO",
    "6": "SEXTO",
    "06": "SEXTO",
    SEXTO: "SEXTO"
  };
  const token = normalized.split("_").find((part) => ordinalMap[part]);
  const ordinal = token ? ordinalMap[token] : "";
  return grados.find((grado) => grado.startsWith(ordinal)) ?? "";
}

export function parseBooleanCell(value: unknown) {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "SI" || normalized === "SÍ" || normalized === "TRUE" || normalized === "1" || normalized === "PAGADA";
}