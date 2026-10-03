import { formatSalon, normalizeGrupo } from "../admin/adminShared";

// Los docentes enseñan y ponen notas por SALÓN, no por grado. Orden y formato oficiales.
export const SALON_ORDER = [
  "INICIAL",
  "PRIMERO_PRIMARIA", "SEGUNDO_PRIMARIA", "TERCERO_PRIMARIA", "CUARTO_PRIMARIA", "QUINTO_PRIMARIA",
  "CICLADO_I", "CICLADO_II", "ANUAL", "CIENCIAS", "LETRAS"
];

/** Clave del salón: el grupo (Ciclado I/II, Anual, Ciencias, Letras) si lo tiene; si no, su grado. */
export function salonKey(grado?: string | null, seccion?: string | null) {
  const g = normalizeGrupo(seccion);
  return g || String(grado ?? "").toUpperCase();
}

/** Etiqueta oficial en mayúsculas: PRIMERO PRIMARIA ... PRE FORMATIVO, CICLADO I, ANUAL, CIENCIAS, LETRAS. */
export function salonLabel(key: string) {
  return formatSalon(key, key) || key.replace(/_/g, " ");
}

export function ordenSalon(key: string) {
  const idx = SALON_ORDER.indexOf(key);
  return idx === -1 ? SALON_ORDER.length : idx;
}

export function ordenarSalones(keys: Iterable<string>) {
  return Array.from(keys).sort((a, b) => ordenSalon(a) - ordenSalon(b) || a.localeCompare(b));
}
