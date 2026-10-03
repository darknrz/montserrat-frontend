// Colores e íconos del portal del alumno. Se mantienen en la paleta de la institución
// (rojo, dorado, crema) con algunos tonos suaves de apoyo para distinguir cursos y estados.

export type Accent = {
  /** Fondo suave del icono / tarjeta */
  bg: string;
  /** Color del icono y del texto destacado */
  fg: string;
  /** Borde/acento */
  ring: string;
};

const ACCENTS: Accent[] = [
  { bg: "#fbe9e9", fg: "#9f171b", ring: "#e9b3b4" }, // rojo institucional
  { bg: "#fbf0d6", fg: "#8a6a14", ring: "#e8cf8b" }, // dorado
  { bg: "#e5f3ea", fg: "#2f6b45", ring: "#a9d4b7" }, // verde suave
  { bg: "#e4eefa", fg: "#2c5d8f", ring: "#a8c6e6" }, // azul suave
  { bg: "#f1e6f6", fg: "#6d3f86", ring: "#d1b5df" }, // lila suave
];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

/** Color estable para un curso/área (siempre el mismo para el mismo nombre). */
export function accentFor(key: string): Accent {
  return ACCENTS[hash(key || "x") % ACCENTS.length];
}

/** Colores para los estados de asistencia y pagos. */
export const STATUS_ACCENT = {
  ok: { bg: "#e5f3ea", fg: "#2f6b45", ring: "#a9d4b7" } as Accent,
  warn: { bg: "#fbf0d6", fg: "#8a6a14", ring: "#e8cf8b" } as Accent,
  bad: { bg: "#fbe9e9", fg: "#9f171b", ring: "#e9b3b4" } as Accent,
  info: { bg: "#e4eefa", fg: "#2c5d8f", ring: "#a8c6e6" } as Accent,
};

/** Primer nombre en formato "Camila" a partir de "APELLIDOS NOMBRES" o "Nombres Apellidos". */
export function primerNombre(nombreCompleto: string, nombres?: string): string {
  const base = (nombres || nombreCompleto || "").trim().split(/\s+/)[0] ?? "";
  if (!base) return "";
  return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
}

/** Saludo según la hora del día. */
export function saludo(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "¡Buenos días";
  if (h < 19) return "¡Buenas tardes";
  return "¡Buenas noches";
}

/** Estilo para la entrada escalonada de elementos de una lista. */
export function rise(index: number): React.CSSProperties {
  return { ["--i" as string]: Math.min(index, 12) } as React.CSSProperties;
}
