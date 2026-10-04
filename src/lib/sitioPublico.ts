import type { Ingresante, Institution, Video } from "../types";

/** true si el texto existe y no está en blanco. */
export const hayTexto = (valor: unknown): valor is string => typeof valor === "string" && valor.trim().length > 0;

export type SeccionId = "inicio" | "nosotros" | "ingresantes" | "videos" | "ubicacion";

/**
 * Decide qué secciones del sitio público se muestran según los datos disponibles. Una sección sin datos
 * se oculta por completo (y su enlace del menú/pie de página también).
 */
export function seccionesVisibles(
  institution: Institution | null,
  ingresantes: Ingresante[],
  videos: Video[]
): Set<SeccionId> {
  const visibles = new Set<SeccionId>(["inicio"]);
  if (!institution) return visibles;
  const datosGenerales = [institution.direccion, institution.anioFundacion, institution.tipo, institution.niveles, institution.email]
    .some(hayTexto);
  if (datosGenerales || hayTexto(institution.mision) || hayTexto(institution.vision)) visibles.add("nosotros");
  if (ingresantes.length > 0) visibles.add("ingresantes");
  if (videos.length > 0) visibles.add("videos");
  if (hayTexto(institution.direccion) || hayTexto(institution.ciudad)) visibles.add("ubicacion");
  return visibles;
}
