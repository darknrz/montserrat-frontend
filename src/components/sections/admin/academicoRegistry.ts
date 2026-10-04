import { useSyncExternalStore } from "react";

/**
 * Fuente única de la organización académica en el frontend: nombres de grados y salones, y qué
 * grados admite cada salón. Se alimenta de la configuración (Configuración → Grados / Salones) a
 * través de `setAcademicoRegistry`, y todo el sistema lee de aquí. Mientras no se cargue la
 * configuración se usan los valores por defecto de la institución (Curricula_Monserrat.xlsx).
 *
 * Los IDs son estables (no cambian al renombrar); solo cambia la etiqueta que se muestra.
 */

export type GradoConfig = { id: string; label: string; active?: boolean };
export type SalonConfig = { id: string; label: string; active: boolean; grados: string[] };

/** Salones "propios de grado": el salón se deduce del grado y no se guarda en el alumno. */
export const SALONES_PROPIOS_IDS = ["INICIAL", "1RO_PRIM", "2DO_PRIM", "3RO_PRIM", "4TO_PRIM", "PREFORMATIVO"] as const;

/** Los 5 salones tipo grupo por defecto (alias de compatibilidad; los salones nuevos también son grupos). */
export const GRUPO_IDS = ["CICLADO_I", "CICLADO_II", "ANUAL", "LETRAS", "CIENCIAS"] as const;

/**
 * Salón tipo "grupo": se guarda como id en el campo seccion del alumno. Es cualquier salón que NO sea
 * propio de un grado, incluidos los que el admin agrega en Configuración → Salones.
 */
export const esSalonGrupo = (id: string | null | undefined): boolean =>
  !!id && !(SALONES_PROPIOS_IDS as readonly string[]).includes(id);

/** Los 11 salones canónicos (no se pueden eliminar, solo desactivar). */
export const esSalonCanonico = (id: string): boolean => DEFAULT_SALONES.some((s) => s.id === id);

export const DEFAULT_GRADO_LABELS: Record<string, string> = {
  INICIAL: "Inicial",
  PRIMERO_PRIMARIA: "1ro Prim",
  SEGUNDO_PRIMARIA: "2do Prim",
  TERCERO_PRIMARIA: "3ro Prim",
  CUARTO_PRIMARIA: "4to Prim",
  QUINTO_PRIMARIA: "5to Prim",
  SEXTO_PRIMARIA: "6to Prim",
  PRIMERO_SECUNDARIA: "1ro Sec",
  SEGUNDO_SECUNDARIA: "2do Sec",
  TERCERO_SECUNDARIA: "3ro Sec",
  CUARTO_SECUNDARIA: "4to Sec",
  QUINTO_SECUNDARIA: "5to Sec",
};

// Orden = escalera académica (de menor a mayor nivel).
export const DEFAULT_SALONES: SalonConfig[] = [
  { id: "INICIAL", label: "INICIAL", active: true, grados: ["INICIAL"] },
  { id: "1RO_PRIM", label: "PRIMERO PRIMARIA", active: true, grados: ["PRIMERO_PRIMARIA"] },
  { id: "2DO_PRIM", label: "SEGUNDO PRIMARIA", active: true, grados: ["SEGUNDO_PRIMARIA"] },
  { id: "3RO_PRIM", label: "TERCERO PRIMARIA", active: true, grados: ["TERCERO_PRIMARIA"] },
  { id: "4TO_PRIM", label: "CUARTO PRIMARIA", active: true, grados: ["CUARTO_PRIMARIA"] },
  { id: "PREFORMATIVO", label: "PRE FORMATIVO", active: true, grados: ["QUINTO_PRIMARIA"] },
  { id: "CICLADO_I", label: "CICLADO I", active: true, grados: ["SEXTO_PRIMARIA", "PRIMERO_SECUNDARIA"] },
  { id: "CICLADO_II", label: "CICLADO II", active: true, grados: ["SEXTO_PRIMARIA", "PRIMERO_SECUNDARIA"] },
  { id: "ANUAL", label: "ANUAL", active: true, grados: ["PRIMERO_SECUNDARIA", "SEGUNDO_SECUNDARIA", "TERCERO_SECUNDARIA"] },
  { id: "LETRAS", label: "LETRAS", active: true, grados: ["TERCERO_SECUNDARIA", "CUARTO_SECUNDARIA", "QUINTO_SECUNDARIA"] },
  { id: "CIENCIAS", label: "CIENCIAS", active: true, grados: ["TERCERO_SECUNDARIA", "CUARTO_SECUNDARIA", "QUINTO_SECUNDARIA"] },
];

/** Grados que existen en el sistema, por nivel (los ids son fijos: los guarda el backend). */
export const GRADOS_POR_NIVEL = {
  INICIAL: ["INICIAL"],
  PRIMARIA: ["PRIMERO_PRIMARIA", "SEGUNDO_PRIMARIA", "TERCERO_PRIMARIA", "CUARTO_PRIMARIA", "QUINTO_PRIMARIA", "SEXTO_PRIMARIA"],
  SECUNDARIA: ["PRIMERO_SECUNDARIA", "SEGUNDO_SECUNDARIA", "TERCERO_SECUNDARIA", "CUARTO_SECUNDARIA", "QUINTO_SECUNDARIA"],
} as const;

let gradoLabels: Record<string, string> = { ...DEFAULT_GRADO_LABELS };
let gradoActivo: Record<string, boolean> = {};
let salones: SalonConfig[] = DEFAULT_SALONES.map((s) => ({ ...s, grados: [...s.grados] }));
let version = 0;
const listeners = new Set<() => void>();

const isGrupoId = esSalonGrupo;

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

/**
 * Actualiza el registro con la configuración. Los grados/salones que no vengan en la configuración
 * conservan su valor por defecto, así el sistema nunca queda sin nombres.
 */
export function setAcademicoRegistry(input: { grados?: GradoConfig[]; salones?: SalonConfig[] }) {
  const nextGrados: Record<string, string> = { ...DEFAULT_GRADO_LABELS };
  const nextActivo: Record<string, boolean> = {};
  (input.grados ?? []).forEach((g) => {
    if (g?.id && g.label && g.label.trim()) nextGrados[g.id] = g.label.trim();
    if (g?.id) nextActivo[g.id] = g.active !== false;
  });

  const byId = new Map((input.salones ?? []).map((s) => [s.id, s]));
  const canonicos: SalonConfig[] = DEFAULT_SALONES.map((def) => {
    const cfg = byId.get(def.id);
    if (!cfg) return { ...def, grados: [...def.grados] };
    return {
      id: def.id,
      label: cfg.label && cfg.label.trim() ? cfg.label.trim() : def.label,
      active: cfg.active !== false,
      grados: Array.isArray(cfg.grados) && cfg.grados.length > 0 ? [...cfg.grados] : [...def.grados],
    };
  });
  // Salones personalizados (agregados en Configuración → Salones): después de los canónicos, en el orden recibido.
  const defaultIds = new Set(DEFAULT_SALONES.map((d) => d.id));
  const personalizados: SalonConfig[] = (input.salones ?? [])
    .filter((c) => c?.id && !defaultIds.has(c.id) && c.label && c.label.trim())
    .map((c) => ({
      id: c.id,
      label: c.label.trim(),
      active: c.active !== false,
      grados: Array.isArray(c.grados) ? [...c.grados] : [],
    }));
  const nextSalones: SalonConfig[] = [...canonicos, ...personalizados];

  if (
    JSON.stringify(nextGrados) === JSON.stringify(gradoLabels) &&
    JSON.stringify(nextActivo) === JSON.stringify(gradoActivo) &&
    JSON.stringify(nextSalones) === JSON.stringify(salones)
  ) {
    return;
  }
  gradoLabels = nextGrados;
  gradoActivo = nextActivo;
  salones = nextSalones;
  emit();
}

export function resetAcademicoRegistry() {
  setAcademicoRegistry({});
}

/** Etiqueta configurada del grado ("1ro Prim", o el nombre que haya puesto el admin). */
export function getGradoLabel(gradoId: string | null | undefined): string {
  if (!gradoId) return "";
  const key = String(gradoId).toUpperCase();
  return gradoLabels[key] ?? "";
}

/** Grados activos (según Configuración → Grados), de menor a mayor; opcionalmente de un solo nivel. */
export function getGradosActivos(nivel?: keyof typeof GRADOS_POR_NIVEL): string[] {
  const niveles = nivel ? [nivel] : (Object.keys(GRADOS_POR_NIVEL) as (keyof typeof GRADOS_POR_NIVEL)[]);
  return niveles.flatMap((n) => GRADOS_POR_NIVEL[n] as readonly string[]).filter((g) => gradoActivo[g] !== false);
}

/** Todos los salones, en orden de la escalera académica. */
export function getSalones(): SalonConfig[] {
  return salones;
}

export function getSalon(salonId: string | null | undefined): SalonConfig | undefined {
  if (!salonId) return undefined;
  return salones.find((s) => s.id === salonId);
}

export function getSalonLabel(salonId: string | null | undefined): string {
  return getSalon(salonId)?.label ?? "";
}

/** Grados que admite un salón. */
export function getGradosDeSalon(salonId: string | null | undefined): string[] {
  return getSalon(salonId)?.grados ?? [];
}

/** Salón "propio" de un grado (1ro prim → PRIMERO PRIMARIA, 5to prim → PRE FORMATIVO...). */
export function getSalonIdDeGrado(grado: string | null | undefined): string {
  if (!grado) return "";
  const key = String(grado).toUpperCase();
  return salones.find((s) => !isGrupoId(s.id) && s.grados.includes(key))?.id ?? "";
}

/**
 * Salones tipo "grupo" (los que se guardan en el campo seccion del alumno) que admite un grado,
 * en el orden de la escalera. Es lo que usan los formularios de alumno, asignaciones y la migración.
 */
export function getGruposDeGrado(grado: string | null | undefined): string[] {
  if (!grado) return [];
  const key = String(grado).toUpperCase();
  return salones.filter((s) => isGrupoId(s.id) && s.active && s.grados.includes(key)).map((s) => s.id);
}

export type OpcionSalon = { value: string; label: string; propio: boolean };

/**
 * Opciones del campo SALÓN para un alumno de este grado, según Configuración → Salones:
 *  - el salón propio del grado (value "" = el alumno no lleva sección: su salón se deduce del grado), y/o
 *  - los salones tipo grupo vinculados al grado (value = id del salón).
 * Un grado puede tener ambos (ej. 3ro Prim con su salón propio y uno adicional creado por el admin).
 */
export function getOpcionesSalonDeGrado(grado: string | null | undefined): OpcionSalon[] {
  if (!grado) return [];
  const key = String(grado).toUpperCase();
  return salones
    .filter((s) => s.active && s.grados.includes(key))
    .map((s) => (isGrupoId(s.id) ? { value: s.id, label: s.label, propio: false } : { value: "", label: s.label, propio: true }));
}

/** Sección que se le propone a un alumno nuevo del grado (vacía si el grado tiene salón propio). */
export function getSeccionInicialDeGrado(grado: string | null | undefined): string | undefined {
  const opciones = getOpcionesSalonDeGrado(grado);
  if (opciones.length === 0 || opciones.some((o) => o.propio)) return undefined;
  return opciones[0].value;
}

/** Id del salón de un alumno según su grado y su grupo guardado. */
export function getSalonIdDeAlumno(grado: string | null | undefined, grupo: string | null | undefined): string {
  const g = String(grupo ?? "").toUpperCase();
  const key = String(grado ?? "").toUpperCase();
  if (g && isGrupoId(g)) {
    const salon = salones.find((s) => s.id === g);
    if (salon && (!key || salon.grados.includes(key))) return g;
  }
  return getSalonIdDeGrado(key);
}

/** Etiqueta del salón de un alumno (vacía si no se puede determinar). */
export function getSalonLabelDeAlumno(grado: string | null | undefined, grupo: string | null | undefined): string {
  return getSalonLabel(getSalonIdDeAlumno(grado, grupo));
}

/** Vuelve a renderizar el componente cuando cambian los nombres o la organización de grados y salones. */
export function useAcademicoRegistry(): number {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => version,
    () => version
  );
}
