import { useEffect, useState } from "react";
import { monserratApi } from "../api/monserrat";

let cache: number | null = null;

/** Invalida el año activo en memoria (se llama tras migrar de año escolar). */
export function resetAnioActivoCache() {
  cache = null;
}

/** Año activo ya cargado (para código fuera de componentes); si no hay, el año calendario. */
export function getAnioActivoCache(): number {
  return cache ?? new Date().getFullYear();
}

/**
 * Año escolar activo según el backend. Mientras carga (o si falla) devuelve el año calendario,
 * que es el comportamiento anterior, así que las pantallas nunca quedan sin año.
 */
export function useAnioActivo(token: string): number {
  const [anio, setAnio] = useState<number>(cache ?? new Date().getFullYear());

  useEffect(() => {
    if (!token) return;
    let cancelado = false;
    monserratApi
      .anioEscolarActivo(token)
      .then((res) => {
        cache = res.anio;
        if (!cancelado) setAnio(res.anio);
      })
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, [token]);

  return anio;
}
