import { normalizeGrupo } from "../admin/adminShared";
import { esSalonGrupo, getSalon, getSalonIdDeAlumno, getSalonIdDeGrado, getSalonLabel, getSalones } from "../admin/academicoRegistry";

// Los docentes enseñan y ponen notas por SALÓN, no por grado. El orden y los nombres salen de
// Configuración → Salones (registro académico), así que renombrar o reordenar se refleja aquí.

/** Id de salón del registro para una clave de salón (grupo o grado). */
function salonIdDeClave(key: string): string {
  if (getSalon(key)) return key; // ya es un id de salón
  return esSalonGrupo(key) && getSalon(key) ? key : getSalonIdDeGrado(key);
}

/**
 * Clave del salón de un alumno = id del salón (CICLADO_I, ANUAL, PREFORMATIVO, 1RO_PRIM...), o "" si
 * todavía no tiene salón asignado. Los docentes trabajan por salón, así que quien no tiene salón no se lista.
 */
export function salonKey(grado?: string | null, seccion?: string | null) {
  return getSalonIdDeAlumno(grado, normalizeGrupo(seccion));
}

/** Etiqueta configurada del salón (por defecto: PRIMERO PRIMARIA ... PRE FORMATIVO, CICLADO I, ANUAL, CIENCIAS, LETRAS). */
export function salonLabel(key: string) {
  return getSalonLabel(salonIdDeClave(key)) || key.replace(/_/g, " ");
}

export function ordenSalon(key: string) {
  const idx = getSalones().findIndex((s) => s.id === salonIdDeClave(key));
  return idx === -1 ? getSalones().length : idx;
}

export function ordenarSalones(keys: Iterable<string>) {
  return Array.from(keys).sort((a, b) => ordenSalon(a) - ordenSalon(b) || a.localeCompare(b));
}
