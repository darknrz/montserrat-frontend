export const TIPOS_SELECCION = ["Ordinario", "Primera Selección", "Ingreso Especial"] as const;
export type TipoSeleccion = typeof TIPOS_SELECCION[number];

export const YEARS = ["2025", "2024", "2023", "2022", "2021"];
export const NIVELES = ["PRIMARIA", "SECUNDARIA"] as const;
export const GRADOS_PRIMARIA = ["PRIMERO_PRIMARIA", "SEGUNDO_PRIMARIA", "TERCERO_PRIMARIA", "CUARTO_PRIMARIA", "QUINTO_PRIMARIA", "SEXTO_PRIMARIA"] as const;
export const GRADOS_SECUNDARIA = ["PRIMERO_SECUNDARIA", "SEGUNDO_SECUNDARIA", "TERCERO_SECUNDARIA", "CUARTO_SECUNDARIA", "QUINTO_SECUNDARIA"] as const;
export const SECCIONES = ["A", "B", "C", "D"] as const;
export const CURSOS = [
  "DPCC",
  "CIENCIAS_SOCIALES",
  "EDUCACION_RELIGIOSA",
  "EDUCACION_TRABAJO",
  "EDUCACION_FISICA",
  "COMUNICACION",
  "ARTE_CULTURA",
  "CASTELLANO_SEGUNDA_LENGUA",
  "INGLES",
  "MATEMATICA",
  "CIENCIA_TECNOLOGIA"
] as const;
export const ESTADOS_USUARIO = ["ACTIVO", "INACTIVO", "SUSPENDIDO"] as const;
export const ESTADOS_MATRICULA = ["MATRICULADO", "RETIRADO", "TRASLADADO", "EGRESADO"] as const;
export const MESES_PENSION = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"] as const;

export const ADMIN_TAB_STORAGE_KEY = "monserrat_admin_active_tab";

export type Tab = "institucion" | "ingresantes" | "anuncios" | "videos" | "redes" | "academico" | "asignaciones" | "pensiones" | "configuracion";
export type CatalogItem = { id: string; label: string; active: boolean };
export type SalonItem = { nivel: string; grado: string; seccion: string; aula: string; active: boolean };
export type ConfigView = "primaria-cursos" | "primaria-competencias" | "primaria-grados" | "primaria-secciones" | "primaria-salones" | "secundaria-cursos" | "secundaria-competencias" | "secundaria-grados" | "secundaria-secciones" | "secundaria-salones";

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
  competenciasSecundaria: CatalogItem[];
  // mapeo: cursoId -> lista de competenciasSecundaria ids
  competenciasPorCursoSecundaria?: Record<string, string[]>;
  // mapeo: `${gradoId}||${cursoId}||${competenciaId}` -> docenteDni para secundaria
  docentesPorCompetenciaSecundaria?: Record<string, string>;
  gradosPrimaria: CatalogItem[];
  gradosSecundaria: CatalogItem[];
  seccionesPrimaria: CatalogItem[];
  seccionesSecundaria: CatalogItem[];
  salones: SalonItem[];
  minAsistenciaPorcentaje?: number;
  ingresantesModelo?: string;
  nivelesAcademicos?: CatalogItem[];
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
  CIENCIA_TECNOLOGIA: "Ciencia y Tecnologia",
  DPCC: "Desarrollo Personal, Ciudadanía y Cívica",
  CIENCIAS_SOCIALES: "Ciencias Sociales",
  EDUCACION_TRABAJO: "Educación para el Trabajo"
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
    { id: "C1", label: "Construye su identidad.", active: true },
    { id: "C2", label: "Convive y participa democráticamente en la búsqueda del bien común.", active: true },
    { id: "C3", label: "Construye interpretaciones históricas.", active: true },
    { id: "C4", label: "Gestiona responsablemente el espacio y el ambiente.", active: true },
    { id: "C5", label: "Gestiona responsablemente los recursos económicos.", active: true },
    { id: "C6", label: "Construye su identidad como persona humana, amada por Dios, digna, libre y trascendente, comprendiendo la doctrina de su propia religión y abierta al diálogo con las que le son cercanas.", active: true },
    { id: "C7", label: "Asume la experiencia del encuentro personal y comunitario con Dios en su proyecto de vida, en coherencia con su creencia religiosa.", active: true },
    { id: "C8", label: "Se desenvuelve de manera autónoma a través de su motricidad.", active: true },
    { id: "C9", label: "Asume una vida saludable.", active: true },
    { id: "C10", label: "Interactúa a través de sus habilidades sociomotrices.", active: true },
    { id: "C11", label: "Se comunica oralmente en su lengua materna.", active: true },
    { id: "C12", label: "Lee diversos tipos de textos escritos.", active: true },
    { id: "C13", label: "Escribe diversos tipos de textos.", active: true },
    { id: "C14", label: "Aprecia de manera crítica manifestaciones artístico-culturales.", active: true },
    { id: "C15", label: "Crea proyectos desde los lenguajes artísticos.", active: true },
    { id: "C16", label: "Se comunica oralmente en castellano como segunda lengua.", active: true },
    { id: "C17", label: "Se comunica oralmente en inglés como lengua extranjera.", active: true },
    { id: "C18", label: "Lee diversos tipos de textos en inglés como lengua extranjera.", active: true },
    { id: "C19", label: "Escribe diversos tipos de textos en inglés como lengua extranjera.", active: true },
    { id: "C20", label: "Resuelve problemas de cantidad.", active: true },
    { id: "C21", label: "Resuelve problemas de regularidad, equivalencia y cambio.", active: true },
    { id: "C22", label: "Resuelve problemas de forma, movimiento y localización.", active: true },
    { id: "C23", label: "Resuelve problemas de gestión de datos e incertidumbre.", active: true },
    { id: "C24", label: "Indaga mediante métodos científicos para construir conocimientos.", active: true },
    { id: "C25", label: "Explica el mundo físico basándose en conocimientos sobre los seres vivos, materia y energía, biodiversidad, Tierra y Universo.", active: true },
    { id: "C26", label: "Diseña y construye soluciones tecnológicas para resolver problemas de su entorno.", active: true },
    { id: "C27", label: "Se desenvuelve en entornos virtuales generados por las TIC.", active: true },
    { id: "C28", label: "Gestiona su aprendizaje de manera autónoma.", active: true },
    { id: "C29", label: "Lee diversos tipos de textos escritos en castellano como segunda lengua.", active: true },
    { id: "C30", label: "Escribe diversos tipos de textos en castellano como segunda lengua.", active: true }
  ],
  competenciasPorCursoPrimaria: {
    INGLES: ["C17", "C18", "C19"],
    PERSONAL_SOCIAL: ["C1", "C2", "C3", "C4", "C5"],
    EDUCACION_RELIGIOSA: ["C6", "C7"],
    EDUCACION_FISICA: ["C8", "C9", "C10"],
    COMUNICACION: ["C11", "C12", "C13"],
    ARTE_CULTURA: ["C14", "C15"],
    CASTELLANO_SEGUNDA_LENGUA: ["C16", "C29", "C30"],
    MATEMATICA: ["C20", "C21", "C22", "C23"],
    CIENCIA_TECNOLOGIA: ["C24", "C25", "C26"],
    COMPETENCIAS_TRANSVERSALES: ["C27", "C28"]
  },
  docentesPorCompetencia: {
    // Inglés C17, C18, C19 (Daniela: 10000001)
    "PRIMERO_PRIMARIA||INGLES||C17": "10000001",
    "PRIMERO_PRIMARIA||INGLES||C18": "10000001",
    "PRIMERO_PRIMARIA||INGLES||C19": "10000001",
    "SEGUNDO_PRIMARIA||INGLES||C17": "10000001",
    "SEGUNDO_PRIMARIA||INGLES||C18": "10000001",
    "SEGUNDO_PRIMARIA||INGLES||C19": "10000001",
    "TERCERO_PRIMARIA||INGLES||C17": "10000001",
    "TERCERO_PRIMARIA||INGLES||C18": "10000001",
    "TERCERO_PRIMARIA||INGLES||C19": "10000001",
    "CUARTO_PRIMARIA||INGLES||C17": "10000001",
    "CUARTO_PRIMARIA||INGLES||C18": "10000001",
    "CUARTO_PRIMARIA||INGLES||C19": "10000001",
    "QUINTO_PRIMARIA||INGLES||C17": "10000001",
    "QUINTO_PRIMARIA||INGLES||C18": "10000001",
    "QUINTO_PRIMARIA||INGLES||C19": "10000001",
    "SEXTO_PRIMARIA||INGLES||C17": "10000001",
    "SEXTO_PRIMARIA||INGLES||C18": "10000001",
    "SEXTO_PRIMARIA||INGLES||C19": "10000001",

    // Personal Social C1-C3, C5 (1ro: Leslie: 10000002)
    "PRIMERO_PRIMARIA||PERSONAL_SOCIAL||C1": "10000002",
    "PRIMERO_PRIMARIA||PERSONAL_SOCIAL||C2": "10000002",
    "PRIMERO_PRIMARIA||PERSONAL_SOCIAL||C3": "10000002",
    "PRIMERO_PRIMARIA||PERSONAL_SOCIAL||C5": "10000002",

    // Personal Social C1-C3 (2do: Mirian Diego: 10000003)
    "SEGUNDO_PRIMARIA||PERSONAL_SOCIAL||C1": "10000003",
    "SEGUNDO_PRIMARIA||PERSONAL_SOCIAL||C2": "10000003",
    "SEGUNDO_PRIMARIA||PERSONAL_SOCIAL||C3": "10000003",

    // Personal Social C1-C5 (3ro, 4to, 5to: Karin: 10000004)
    "TERCERO_PRIMARIA||PERSONAL_SOCIAL||C1": "10000004",
    "TERCERO_PRIMARIA||PERSONAL_SOCIAL||C2": "10000004",
    "TERCERO_PRIMARIA||PERSONAL_SOCIAL||C3": "10000004",
    "TERCERO_PRIMARIA||PERSONAL_SOCIAL||C4": "10000004",
    "TERCERO_PRIMARIA||PERSONAL_SOCIAL||C5": "10000004",
    "CUARTO_PRIMARIA||PERSONAL_SOCIAL||C1": "10000004",
    "CUARTO_PRIMARIA||PERSONAL_SOCIAL||C2": "10000004",
    "CUARTO_PRIMARIA||PERSONAL_SOCIAL||C3": "10000004",
    "CUARTO_PRIMARIA||PERSONAL_SOCIAL||C4": "10000004",
    "CUARTO_PRIMARIA||PERSONAL_SOCIAL||C5": "10000004",
    "QUINTO_PRIMARIA||PERSONAL_SOCIAL||C1": "10000004",
    "QUINTO_PRIMARIA||PERSONAL_SOCIAL||C2": "10000004",
    "QUINTO_PRIMARIA||PERSONAL_SOCIAL||C3": "10000004",
    "QUINTO_PRIMARIA||PERSONAL_SOCIAL||C4": "10000004",
    "QUINTO_PRIMARIA||PERSONAL_SOCIAL||C5": "10000004",

    // Personal Social C1-C3 (6to: Rosvita: 10000005)
    "SEXTO_PRIMARIA||PERSONAL_SOCIAL||C1": "10000005",
    "SEXTO_PRIMARIA||PERSONAL_SOCIAL||C2": "10000005",
    "SEXTO_PRIMARIA||PERSONAL_SOCIAL||C3": "10000005",
    // Personal Social C4 (6to: Karin: 10000004)
    "SEXTO_PRIMARIA||PERSONAL_SOCIAL||C4": "10000004",

    // Educación Religiosa C6-C7
    "PRIMERO_PRIMARIA||EDUCACION_RELIGIOSA||C6": "10000002",
    "PRIMERO_PRIMARIA||EDUCACION_RELIGIOSA||C7": "10000002",
    "SEGUNDO_PRIMARIA||EDUCACION_RELIGIOSA||C6": "10000003",
    "SEGUNDO_PRIMARIA||EDUCACION_RELIGIOSA||C7": "10000003",
    "TERCERO_PRIMARIA||EDUCACION_RELIGIOSA||C6": "10000001",
    "TERCERO_PRIMARIA||EDUCACION_RELIGIOSA||C7": "10000001",
    "CUARTO_PRIMARIA||EDUCACION_RELIGIOSA||C6": "10000006",
    "CUARTO_PRIMARIA||EDUCACION_RELIGIOSA||C7": "10000006",
    "QUINTO_PRIMARIA||EDUCACION_RELIGIOSA||C6": "10000006",
    "QUINTO_PRIMARIA||EDUCACION_RELIGIOSA||C7": "10000006",
    "SEXTO_PRIMARIA||EDUCACION_RELIGIOSA||C6": "10000004",
    "SEXTO_PRIMARIA||EDUCACION_RELIGIOSA||C7": "10000004",

    // Educación Física C8-C10
    "PRIMERO_PRIMARIA||EDUCACION_FISICA||C8": "10000002",
    "PRIMERO_PRIMARIA||EDUCACION_FISICA||C9": "10000002",
    "PRIMERO_PRIMARIA||EDUCACION_FISICA||C10": "10000002",
    "SEGUNDO_PRIMARIA||EDUCACION_FISICA||C8": "10000003",
    "SEGUNDO_PRIMARIA||EDUCACION_FISICA||C9": "10000003",
    "SEGUNDO_PRIMARIA||EDUCACION_FISICA||C10": "10000003",
    "TERCERO_PRIMARIA||EDUCACION_FISICA||C8": "10000008",
    "TERCERO_PRIMARIA||EDUCACION_FISICA||C9": "10000008",
    "TERCERO_PRIMARIA||EDUCACION_FISICA||C10": "10000008",
    "CUARTO_PRIMARIA||EDUCACION_FISICA||C8": "10000008",
    "CUARTO_PRIMARIA||EDUCACION_FISICA||C9": "10000008",
    "CUARTO_PRIMARIA||EDUCACION_FISICA||C10": "10000008",
    "QUINTO_PRIMARIA||EDUCACION_FISICA||C8": "10000008",
    "QUINTO_PRIMARIA||EDUCACION_FISICA||C9": "10000008",
    "QUINTO_PRIMARIA||EDUCACION_FISICA||C10": "10000008",
    "SEXTO_PRIMARIA||EDUCACION_FISICA||C8": "10000008",
    "SEXTO_PRIMARIA||EDUCACION_FISICA||C9": "10000008",
    "SEXTO_PRIMARIA||EDUCACION_FISICA||C10": "10000008",

    // Comunicación C11-C13
    "PRIMERO_PRIMARIA||COMUNICACION||C11": "10000002",
    "PRIMERO_PRIMARIA||COMUNICACION||C12": "10000002",
    "PRIMERO_PRIMARIA||COMUNICACION||C13": "10000002",
    "SEGUNDO_PRIMARIA||COMUNICACION||C11": "10000003",
    "SEGUNDO_PRIMARIA||COMUNICACION||C12": "10000003",
    "SEGUNDO_PRIMARIA||COMUNICACION||C13": "10000003",
    "TERCERO_PRIMARIA||COMUNICACION||C11": "10000004",
    "TERCERO_PRIMARIA||COMUNICACION||C12": "10000004",
    "TERCERO_PRIMARIA||COMUNICACION||C13": "10000004",
    "CUARTO_PRIMARIA||COMUNICACION||C11": "10000004",
    "CUARTO_PRIMARIA||COMUNICACION||C12": "10000009",
    "CUARTO_PRIMARIA||COMUNICACION||C13": "10000004",
    "QUINTO_PRIMARIA||COMUNICACION||C11": "10000009",
    "QUINTO_PRIMARIA||COMUNICACION||C12": "10000009",
    "QUINTO_PRIMARIA||COMUNICACION||C13": "10000009",
    "SEXTO_PRIMARIA||COMUNICACION||C11": "10000009",
    "SEXTO_PRIMARIA||COMUNICACION||C12": "10000009",
    "SEXTO_PRIMARIA||COMUNICACION||C13": "10000009",

    // Arte y Cultura C14-C15
    "PRIMERO_PRIMARIA||ARTE_CULTURA||C14": "10000002",
    "PRIMERO_PRIMARIA||ARTE_CULTURA||C15": "10000002",
    "SEGUNDO_PRIMARIA||ARTE_CULTURA||C14": "10000003",
    "SEGUNDO_PRIMARIA||ARTE_CULTURA||C15": "10000003",
    "TERCERO_PRIMARIA||ARTE_CULTURA||C14": "10000010",
    "TERCERO_PRIMARIA||ARTE_CULTURA||C15": "10000010",
    "CUARTO_PRIMARIA||ARTE_CULTURA||C14": "10000010",
    "CUARTO_PRIMARIA||ARTE_CULTURA||C15": "10000010",
    "QUINTO_PRIMARIA||ARTE_CULTURA||C14": "10000010",
    "QUINTO_PRIMARIA||ARTE_CULTURA||C15": "10000010",
    "SEXTO_PRIMARIA||ARTE_CULTURA||C14": "10000010",
    "SEXTO_PRIMARIA||ARTE_CULTURA||C15": "10000010",

    // Ciencia y Tecnología C24-C26
    "PRIMERO_PRIMARIA||CIENCIA_TECNOLOGIA||C24": "10000002",
    "PRIMERO_PRIMARIA||CIENCIA_TECNOLOGIA||C25": "10000002",
    "PRIMERO_PRIMARIA||CIENCIA_TECNOLOGIA||C26": "10000002",
    "SEGUNDO_PRIMARIA||CIENCIA_TECNOLOGIA||C24": "10000003",
    "SEGUNDO_PRIMARIA||CIENCIA_TECNOLOGIA||C25": "10000003",
    "SEGUNDO_PRIMARIA||CIENCIA_TECNOLOGIA||C26": "10000003",
    "TERCERO_PRIMARIA||CIENCIA_TECNOLOGIA||C24": "10000004",
    "TERCERO_PRIMARIA||CIENCIA_TECNOLOGIA||C25": "10000004",
    "TERCERO_PRIMARIA||CIENCIA_TECNOLOGIA||C26": "10000004",
    "CUARTO_PRIMARIA||CIENCIA_TECNOLOGIA||C24": "10000011",
    "CUARTO_PRIMARIA||CIENCIA_TECNOLOGIA||C25": "10000011",
    "CUARTO_PRIMARIA||CIENCIA_TECNOLOGIA||C26": "10000011",
    "QUINTO_PRIMARIA||CIENCIA_TECNOLOGIA||C24": "10000011",
    "QUINTO_PRIMARIA||CIENCIA_TECNOLOGIA||C25": "10000011",
    "QUINTO_PRIMARIA||CIENCIA_TECNOLOGIA||C26": "10000011",
    "SEXTO_PRIMARIA||CIENCIA_TECNOLOGIA||C24": "10000011",
    "SEXTO_PRIMARIA||CIENCIA_TECNOLOGIA||C25": "10000011",
    "SEXTO_PRIMARIA||CIENCIA_TECNOLOGIA||C26": "10000011",

    // ==========================================
    // SECUNDARIA
    // ==========================================
    // DPCC CS1: Adaluz Paye (20000001) para 1ro, 2do, 3ro; Rosvita Gómez (20000002) para 4to, 5to
    "PRIMERO_SECUNDARIA||DPCC||CS1": "20000001",
    "SEGUNDO_SECUNDARIA||DPCC||CS1": "20000001",
    "TERCERO_SECUNDARIA||DPCC||CS1": "20000001",
    "CUARTO_SECUNDARIA||DPCC||CS1": "20000002",
    "QUINTO_SECUNDARIA||DPCC||CS1": "20000002",

    // DPCC CS2: Rosvita Gómez (20000002) para 1ro a 5to
    "PRIMERO_SECUNDARIA||DPCC||CS2": "20000002",
    "SEGUNDO_SECUNDARIA||DPCC||CS2": "20000002",
    "TERCERO_SECUNDARIA||DPCC||CS2": "20000002",
    "CUARTO_SECUNDARIA||DPCC||CS2": "20000002",
    "QUINTO_SECUNDARIA||DPCC||CS2": "20000002",

    // Ciencias Sociales CS3, CS4, CS5: Rosvita Gómez (20000002) para 1ro a 5to
    "PRIMERO_SECUNDARIA||CIENCIAS_SOCIALES||CS3": "20000002",
    "PRIMERO_SECUNDARIA||CIENCIAS_SOCIALES||CS4": "20000002",
    "PRIMERO_SECUNDARIA||CIENCIAS_SOCIALES||CS5": "20000002",
    "SEGUNDO_SECUNDARIA||CIENCIAS_SOCIALES||CS3": "20000002",
    "SEGUNDO_SECUNDARIA||CIENCIAS_SOCIALES||CS4": "20000002",
    "SEGUNDO_SECUNDARIA||CIENCIAS_SOCIALES||CS5": "20000002",
    "TERCERO_SECUNDARIA||CIENCIAS_SOCIALES||CS3": "20000002",
    "TERCERO_SECUNDARIA||CIENCIAS_SOCIALES||CS4": "20000002",
    "TERCERO_SECUNDARIA||CIENCIAS_SOCIALES||CS5": "20000002",
    "CUARTO_SECUNDARIA||CIENCIAS_SOCIALES||CS3": "20000002",
    "CUARTO_SECUNDARIA||CIENCIAS_SOCIALES||CS4": "20000002",
    "CUARTO_SECUNDARIA||CIENCIAS_SOCIALES||CS5": "20000002",
    "QUINTO_SECUNDARIA||CIENCIAS_SOCIALES||CS3": "20000002",
    "QUINTO_SECUNDARIA||CIENCIAS_SOCIALES||CS4": "20000002",
    "QUINTO_SECUNDARIA||CIENCIAS_SOCIALES||CS5": "20000002",

    // Educación Religiosa CS6, CS7
    "PRIMERO_SECUNDARIA||EDUCACION_RELIGIOSA||CS6": "20000001",
    "PRIMERO_SECUNDARIA||EDUCACION_RELIGIOSA||CS7": "20000001",
    "SEGUNDO_SECUNDARIA||EDUCACION_RELIGIOSA||CS6": "20000003",
    "SEGUNDO_SECUNDARIA||EDUCACION_RELIGIOSA||CS7": "20000003",
    "TERCERO_SECUNDARIA||EDUCACION_RELIGIOSA||CS6": "20000004",
    "TERCERO_SECUNDARIA||EDUCACION_RELIGIOSA||CS7": "20000004",
    "CUARTO_SECUNDARIA||EDUCACION_RELIGIOSA||CS6": "20000002",
    "CUARTO_SECUNDARIA||EDUCACION_RELIGIOSA||CS7": "20000002",
    "QUINTO_SECUNDARIA||EDUCACION_RELIGIOSA||CS6": "20000002",
    "QUINTO_SECUNDARIA||EDUCACION_RELIGIOSA||CS7": "20000002",

    // Educación para el Trabajo CS8: Adaluz Paye (20000001) para 1ro a 5to
    "PRIMERO_SECUNDARIA||EDUCACION_TRABAJO||CS8": "20000001",
    "SEGUNDO_SECUNDARIA||EDUCACION_TRABAJO||CS8": "20000001",
    "TERCERO_SECUNDARIA||EDUCACION_TRABAJO||CS8": "20000001",
    "CUARTO_SECUNDARIA||EDUCACION_TRABAJO||CS8": "20000001",
    "QUINTO_SECUNDARIA||EDUCACION_TRABAJO||CS8": "20000001",

    // Comunicación CS12, CS13, CS14: Miriam Marcelo (20000003) para 1ro a 5to
    "PRIMERO_SECUNDARIA||COMUNICACION||CS12": "20000003",
    "PRIMERO_SECUNDARIA||COMUNICACION||CS13": "20000003",
    "PRIMERO_SECUNDARIA||COMUNICACION||CS14": "20000003",
    "SEGUNDO_SECUNDARIA||COMUNICACION||CS12": "20000003",
    "SEGUNDO_SECUNDARIA||COMUNICACION||CS13": "20000003",
    "SEGUNDO_SECUNDARIA||COMUNICACION||CS14": "20000003",
    "TERCERO_SECUNDARIA||COMUNICACION||CS12": "20000003",
    "TERCERO_SECUNDARIA||COMUNICACION||CS13": "20000003",
    "TERCERO_SECUNDARIA||COMUNICACION||CS14": "20000003",
    "CUARTO_SECUNDARIA||COMUNICACION||CS12": "20000003",
    "CUARTO_SECUNDARIA||COMUNICACION||CS13": "20000003",
    "CUARTO_SECUNDARIA||COMUNICACION||CS14": "20000003",
    "QUINTO_SECUNDARIA||COMUNICACION||CS12": "20000003",
    "QUINTO_SECUNDARIA||COMUNICACION||CS13": "20000003",
    "QUINTO_SECUNDARIA||COMUNICACION||CS14": "20000003",

    // Arte y Cultura CS15, CS16: Adaluz Paye (20000001) para 1ro a 5to
    "PRIMERO_SECUNDARIA||ARTE_CULTURA||CS15": "20000001",
    "PRIMERO_SECUNDARIA||ARTE_CULTURA||CS16": "20000001",
    "SEGUNDO_SECUNDARIA||ARTE_CULTURA||CS15": "20000001",
    "SEGUNDO_SECUNDARIA||ARTE_CULTURA||CS16": "20000001",
    "TERCERO_SECUNDARIA||ARTE_CULTURA||CS15": "20000001",
    "TERCERO_SECUNDARIA||ARTE_CULTURA||CS16": "20000001",
    "CUARTO_SECUNDARIA||ARTE_CULTURA||CS15": "20000001",
    "CUARTO_SECUNDARIA||ARTE_CULTURA||CS16": "20000001",
    "QUINTO_SECUNDARIA||ARTE_CULTURA||CS15": "20000001",
    "QUINTO_SECUNDARIA||ARTE_CULTURA||CS16": "20000001",

    // Inglés CS20, CS21, CS22: Daniela Ydrogo (20000005) para 1ro a 5to
    "PRIMERO_SECUNDARIA||INGLES||CS20": "20000005",
    "PRIMERO_SECUNDARIA||INGLES||CS21": "20000005",
    "PRIMERO_SECUNDARIA||INGLES||CS22": "20000005",
    "SEGUNDO_SECUNDARIA||INGLES||CS20": "20000005",
    "SEGUNDO_SECUNDARIA||INGLES||CS21": "20000005",
    "SEGUNDO_SECUNDARIA||INGLES||CS22": "20000005",
    "TERCERO_SECUNDARIA||INGLES||CS20": "20000005",
    "TERCERO_SECUNDARIA||INGLES||CS21": "20000005",
    "TERCERO_SECUNDARIA||INGLES||CS22": "20000005",
    "CUARTO_SECUNDARIA||INGLES||CS20": "20000005",
    "CUARTO_SECUNDARIA||INGLES||CS21": "20000005",
    "CUARTO_SECUNDARIA||INGLES||CS22": "20000005",
    "QUINTO_SECUNDARIA||INGLES||CS20": "20000005",
    "QUINTO_SECUNDARIA||INGLES||CS21": "20000005",
    "QUINTO_SECUNDARIA||INGLES||CS22": "20000005",

    // Matemática
    // CS23 (Cantidad): 1ro, 2do -> Omar Bruno (20000006); 3ro, 4to, 5to -> Eladio Magariño (20000008)
    "PRIMERO_SECUNDARIA||MATEMATICA||CS23": "20000006",
    "SEGUNDO_SECUNDARIA||MATEMATICA||CS23": "20000006",
    "TERCERO_SECUNDARIA||MATEMATICA||CS23": "20000008",
    "CUARTO_SECUNDARIA||MATEMATICA||CS23": "20000008",
    "QUINTO_SECUNDARIA||MATEMATICA||CS23": "20000008",

    // CS24 (Regularidad): 1ro -> Christian Magariño (20000007); 2do a 5to -> Eladio Magariño (20000008)
    "PRIMERO_SECUNDARIA||MATEMATICA||CS24": "20000007",
    "SEGUNDO_SECUNDARIA||MATEMATICA||CS24": "20000008",
    "TERCERO_SECUNDARIA||MATEMATICA||CS24": "20000008",
    "CUARTO_SECUNDARIA||MATEMATICA||CS24": "20000008",
    "QUINTO_SECUNDARIA||MATEMATICA||CS24": "20000008",

    // CS25 (Forma): 1ro, 2do -> Christian Magariño (20000007); 3ro, 4to, 5to -> Eladio Magariño (20000008)
    "PRIMERO_SECUNDARIA||MATEMATICA||CS25": "20000007",
    "SEGUNDO_SECUNDARIA||MATEMATICA||CS25": "20000007",
    "TERCERO_SECUNDARIA||MATEMATICA||CS25": "20000008",
    "CUARTO_SECUNDARIA||MATEMATICA||CS25": "20000008",
    "QUINTO_SECUNDARIA||MATEMATICA||CS25": "20000008",

    // CS26 (Gestión de datos): 1ro, 2do -> Omar Bruno (20000006); 3ro, 4to, 5to -> Jhonatan Carhuancho (20000009)
    "PRIMERO_SECUNDARIA||MATEMATICA||CS26": "20000006",
    "SEGUNDO_SECUNDARIA||MATEMATICA||CS26": "20000006",
    "TERCERO_SECUNDARIA||MATEMATICA||CS26": "20000009",
    "CUARTO_SECUNDARIA||MATEMATICA||CS26": "20000009",
    "QUINTO_SECUNDARIA||MATEMATICA||CS26": "20000009",

    // Ciencia y Tecnología
    // CS27 (Indaga): 1ro a 5to -> Fernando Jacinto (20000010)
    "PRIMERO_SECUNDARIA||CIENCIA_TECNOLOGIA||CS27": "20000010",
    "SEGUNDO_SECUNDARIA||CIENCIA_TECNOLOGIA||CS27": "20000010",
    "TERCERO_SECUNDARIA||CIENCIA_TECNOLOGIA||CS27": "20000010",
    "CUARTO_SECUNDARIA||CIENCIA_TECNOLOGIA||CS27": "20000010",
    "QUINTO_SECUNDARIA||CIENCIA_TECNOLOGIA||CS27": "20000010",

    // CS28 (Mundo físico): 1ro, 2do -> Lourdes Bonilla (20000004); 3ro, 4to, 5to -> Zenon Meza (20000011)
    "PRIMERO_SECUNDARIA||CIENCIA_TECNOLOGIA||CS28": "20000004",
    "SEGUNDO_SECUNDARIA||CIENCIA_TECNOLOGIA||CS28": "20000004",
    "TERCERO_SECUNDARIA||CIENCIA_TECNOLOGIA||CS28": "20000011",
    "CUARTO_SECUNDARIA||CIENCIA_TECNOLOGIA||CS28": "20000011",
    "QUINTO_SECUNDARIA||CIENCIA_TECNOLOGIA||CS28": "20000011",

    // CS29 (Diseña): 1ro -> Omar Bruno (20000006); 2do -> Omar Bruno (20000006); 3ro, 4to, 5to -> César Veliz (20000012)
    "PRIMERO_SECUNDARIA||CIENCIA_TECNOLOGIA||CS29": "20000006",
    "SEGUNDO_SECUNDARIA||CIENCIA_TECNOLOGIA||CS29": "20000006",
    "TERCERO_SECUNDARIA||CIENCIA_TECNOLOGIA||CS29": "20000012",
    "CUARTO_SECUNDARIA||CIENCIA_TECNOLOGIA||CS29": "20000012",
    "QUINTO_SECUNDARIA||CIENCIA_TECNOLOGIA||CS29": "20000012"
  },
  cursosSecundaria: CURSOS.map((id) => ({ id, label: labelFromEnum(id), active: true })),
  competenciasSecundaria: [
    { id: "CS1", label: "Construye su identidad.", active: true },
    { id: "CS2", label: "Convive y participa democráticamente en la búsqueda del bien común.", active: true },
    { id: "CS3", label: "Construye interpretaciones históricas.", active: true },
    { id: "CS4", label: "Gestiona responsablemente el espacio y el ambiente.", active: true },
    { id: "CS5", label: "Gestiona responsablemente los recursos económicos.", active: true },
    { id: "CS6", label: "Construye su identidad como persona humana, amada por Dios, digna, libre y trascendente, comprendiendo la doctrina de su propia religión, abierto al diálogo con las que le son cercanas.", active: true },
    { id: "CS7", label: "Asume la experiencia del encuentro personal y comunitario con Dios en su proyecto de vida en coherencia con su creencia religiosa.", active: true },
    { id: "CS8", label: "Gestiona proyectos de emprendimiento económico o social.", active: true },
    { id: "CS9", label: "Se desenvuelve de manera autónoma a través de su motricidad.", active: true },
    { id: "CS10", label: "Asume una vida saludable.", active: true },
    { id: "CS11", label: "Interactúa a través de sus habilidades sociomotrices.", active: true },
    { id: "CS12", label: "Se comunica oralmente en su lengua materna.", active: true },
    { id: "CS13", label: "Lee diversos tipos de textos escritos.", active: true },
    { id: "CS14", label: "Escribe diversos tipos de textos.", active: true },
    { id: "CS15", label: "Aprecia de manera crítica manifestaciones artístico-culturales.", active: true },
    { id: "CS16", label: "Crea proyectos desde los lenguajes artísticos.", active: true },
    { id: "CS17", label: "Se comunica oralmente en lengua materna.", active: true },
    { id: "CS18", label: "Lee diversos tipos de textos escritos.", active: true },
    { id: "CS19", label: "Escribe diversos tipos de textos.", active: true },
    { id: "CS20", label: "Se comunica oralmente en inglés como lengua extranjera.", active: true },
    { id: "CS21", label: "Lee diversos tipos de textos en inglés como lengua extranjera.", active: true },
    { id: "CS22", label: "Escribe diversos tipos de textos en inglés como lengua extranjera.", active: true },
    { id: "CS23", label: "Resuelve problemas de cantidad.", active: true },
    { id: "CS24", label: "Resuelve problemas de regularidad, equivalencia y cambio.", active: true },
    { id: "CS25", label: "Resuelve problemas de movimiento, forma y localización.", active: true },
    { id: "CS26", label: "Resuelve problemas de gestión de datos e incertidumbre.", active: true },
    { id: "CS27", label: "Indaga mediante métodos científicos para construir sus conocimientos.", active: true },
    { id: "CS28", label: "Explica el mundo físico basándose en conocimientos sobre los seres vivos, materia y energía, biodiversidad, Tierra y universo.", active: true },
    { id: "CS29", label: "Diseña y construye soluciones tecnológicas para resolver problemas de su entorno.", active: true }
  ],
  competenciasPorCursoSecundaria: {
    DPCC: ["CS1", "CS2"],
    CIENCIAS_SOCIALES: ["CS3", "CS4", "CS5"],
    EDUCACION_RELIGIOSA: ["CS6", "CS7"],
    EDUCACION_TRABAJO: ["CS8"],
    EDUCACION_FISICA: ["CS9", "CS10", "CS11"],
    COMUNICACION: ["CS12", "CS13", "CS14"],
    ARTE_CULTURA: ["CS15", "CS16"],
    CASTELLANO_SEGUNDA_LENGUA: ["CS17", "CS18", "CS19"],
    INGLES: ["CS20", "CS21", "CS22"],
    MATEMATICA: ["CS23", "CS24", "CS25", "CS26"],
    CIENCIA_TECNOLOGIA: ["CS27", "CS28", "CS29"]
  },
  docentesPorCompetenciaSecundaria: {},
  gradosPrimaria: GRADOS_PRIMARIA.map((id) => ({ id, label: labelFromEnum(id), active: true })),
  gradosSecundaria: GRADOS_SECUNDARIA.map((id) => ({ id, label: labelFromEnum(id), active: true })),
  seccionesPrimaria: SECCIONES.map((id) => ({ id, label: id, active: true })),
  seccionesSecundaria: SECCIONES.map((id) => ({ id, label: id, active: true })),
  salones: [...GRADOS_PRIMARIA.map((grado) => ({ nivel: "PRIMARIA", grado })), ...GRADOS_SECUNDARIA.map((grado) => ({ nivel: "SECUNDARIA", grado }))]
    .flatMap(({ nivel, grado }) => SECCIONES.map((seccion) => ({ nivel, grado, seccion, aula: aulaPorGradoSeccion(nivel, grado, seccion), active: true }))),
  minAsistenciaPorcentaje: 70,
  ingresantesModelo: "card-grid",
  nivelesAcademicos: [
    { id: "1RO_PRIM", label: "1ro prim", active: true },
    { id: "2DO_PRIM", label: "2do prim", active: true },
    { id: "3RO_PRIM", label: "3ro prim", active: true },
    { id: "4TO_PRIM", label: "4to prim", active: true },
    { id: "PREFORMATIVO", label: "preformativo", active: true },
    { id: "CICLADO", label: "ciclado", active: true },
    { id: "ANUAL", label: "anual", active: true },
    { id: "LETRAS_CIENCIAS", label: "Letras/Ciencias", active: true }
  ]
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
    competenciasSecundaria: config.competenciasSecundaria ?? defaultAcademicoConfig.competenciasSecundaria,
    competenciasPorCursoSecundaria: config.competenciasPorCursoSecundaria ?? defaultAcademicoConfig.competenciasPorCursoSecundaria,
    docentesPorCompetenciaSecundaria: config.docentesPorCompetenciaSecundaria ?? defaultAcademicoConfig.docentesPorCompetenciaSecundaria,
    gradosPrimaria: config.gradosPrimaria ?? defaultAcademicoConfig.gradosPrimaria,
    gradosSecundaria: config.gradosSecundaria ?? defaultAcademicoConfig.gradosSecundaria,
    seccionesPrimaria: config.seccionesPrimaria ?? legacy.secciones ?? defaultAcademicoConfig.seccionesPrimaria,
    seccionesSecundaria: config.seccionesSecundaria ?? defaultAcademicoConfig.seccionesSecundaria,
    salones: config.salones ?? defaultAcademicoConfig.salones,
    minAsistenciaPorcentaje: config.minAsistenciaPorcentaje ?? defaultAcademicoConfig.minAsistenciaPorcentaje,
    ingresantesModelo: (config as any).ingresantesModelo ?? defaultAcademicoConfig.ingresantesModelo,
    nivelesAcademicos: config.nivelesAcademicos ?? defaultAcademicoConfig.nivelesAcademicos
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

export function getGradosPorNivelAcademico(nivelAcademicoId: string): string[] {
  if (!nivelAcademicoId) return [];
  const cleanId = nivelAcademicoId.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  if (cleanId.includes("1RO_PRIM") || cleanId === "1_PRIM") return ["PRIMERO_PRIMARIA"];
  if (cleanId.includes("2DO_PRIM") || cleanId === "2_PRIM") return ["SEGUNDO_PRIMARIA"];
  if (cleanId.includes("3RO_PRIM") || cleanId === "3_PRIM") return ["TERCERO_PRIMARIA"];
  if (cleanId.includes("4TO_PRIM") || cleanId === "4_PRIM") return ["CUARTO_PRIMARIA"];
  if (cleanId.includes("PREFORMATIVO")) return ["QUINTO_PRIMARIA"];
  if (cleanId.includes("CICLADO")) return ["SEXTO_PRIMARIA", "PRIMERO_SECUNDARIA"];
  if (cleanId.includes("ANUAL")) return ["PRIMERO_SECUNDARIA", "SEGUNDO_SECUNDARIA", "TERCERO_SECUNDARIA"];
  if (cleanId.includes("LETRAS_CIENCIAS") || cleanId.includes("LETRAS") || cleanId.includes("CIENCIAS")) {
    return ["TERCERO_SECUNDARIA", "CUARTO_SECUNDARIA", "QUINTO_SECUNDARIA"];
  }
  return [];
}