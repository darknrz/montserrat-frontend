import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, GraduationCap, Layers, UserRound, Users2 } from "lucide-react";
import { SectionHeader } from "../../ui/SectionHeader";
import { monserratApi } from "../../../api/monserrat";
import type { AsignacionAcademica } from "../../../types";

// Mismo cuarteto de colores de marca que se usa en notas y asistencias
// (rojo / azul-gris / verde / oro), reutilizado aquí como paleta de acento
// por curso para que cada tarjeta sea reconocible de un vistazo.
const PALETA_CURSOS = ["#9f171b", "#5b6b8c", "#3f7d54", "#d8a842"];

function labelFromEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// Color estable por nombre de curso: el mismo curso siempre cae en el mismo
// color, sin necesidad de guardar nada extra en el backend.
function colorPorCurso(curso: string) {
  let hash = 0;
  for (let i = 0; i < curso.length; i += 1) hash = (hash + curso.charCodeAt(i)) % PALETA_CURSOS.length;
  return PALETA_CURSOS[hash];
}

function initials(name?: string) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function InfoChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[16px] border border-monserrat-ink/10 bg-white p-5 shadow-sm">
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[12px] bg-monserrat-red/10 text-monserrat-red">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-ink/40">{label}</p>
        <p className="truncate text-xl font-black text-monserrat-ink">{value}</p>
      </div>
    </div>
  );
}

export function AlumnoCursos({ token }: { token: string }) {
  const [asignaciones, setAsignaciones] = useState<AsignacionAcademica[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void monserratApi
      .asignacionesAlumno(token)
      .then(setAsignaciones)
      .catch((error) => setStatus(error instanceof Error ? error.message : String(error)));
  }, [token]);

  // Un curso puede tener más de una asignación (p. ej. si cambia de docente
  // durante el año); nos quedamos con la más reciente para mostrar un solo
  // docente por tarjeta.
  const cursos = useMemo(() => {
    const map = new Map<string, AsignacionAcademica>();
    asignaciones
      .filter((a) => a.curso)
      .forEach((a) => {
        const previa = map.get(a.curso);
        if (!previa || (a.updatedAt ?? a.createdAt ?? "") > (previa.updatedAt ?? previa.createdAt ?? "")) {
          map.set(a.curso, a);
        }
      });
    return Array.from(map.values()).sort((a, b) => a.curso.localeCompare(b.curso));
  }, [asignaciones]);

  const grupo = useMemo(() => {
    if (!asignaciones.length) return null;
    const { grado, seccion, nivelEducativo } = asignaciones[0];
    return {
      grado: grado ? labelFromEnum(grado.replace(/_PRIMARIA|_SECUNDARIA/g, "")) : "-",
      seccion: seccion || "-",
      nivel: nivelEducativo ? labelFromEnum(nivelEducativo) : "-"
    };
  }, [asignaciones]);

  return (
    <div className="grid gap-4">
      <SectionHeader title="Mis cursos" description="Cursos y grupo académico del alumno." align="left" />
      {status && <div className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{status}</div>}

      {/* Resumen del grupo académico: mismo lenguaje de chip con ícono que
          usan Mis notas y Mis asistencias, para que las tres pantallas se
          sientan parte de una sola libreta. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoChip icon={<GraduationCap size={20} />} label="Nivel" value={grupo?.nivel ?? "Sin datos"} />
        <InfoChip icon={<Layers size={20} />} label="Grado" value={grupo?.grado ?? "Sin datos"} />
        <InfoChip icon={<Users2 size={20} />} label="Sección" value={grupo?.seccion ?? "Sin datos"} />
        <InfoChip icon={<BookOpen size={20} />} label="Cursos" value={String(cursos.length)} />
      </div>

      {cursos.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-[20px] border border-dashed border-monserrat-ink/15 bg-white p-10 text-center">
          <BookOpen size={28} className="text-monserrat-ink/30" />
          <p className="text-sm font-semibold text-monserrat-ink/50">No se encontraron cursos para tu grupo.</p>
        </div>
      ) : (
        // Una tarjeta por curso con acento de color estable y el docente a
        // cargo, en vez de una lista plana de nombres de curso.
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cursos.map((asignacion) => {
            const color = colorPorCurso(asignacion.curso);
            return (
              <div
                key={asignacion.curso}
                className="rounded-[18px] border border-monserrat-ink/10 bg-white p-5 shadow-sm"
                style={{ borderLeft: `4px solid ${color}` }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-11 w-11 flex-none items-center justify-center rounded-[12px] text-sm font-black"
                    style={{ backgroundColor: `${color}18`, color }}
                  >
                    <BookOpen size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-ink/40">Curso</p>
                    <p className="truncate text-lg font-black text-monserrat-ink">{labelFromEnum(asignacion.curso)}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2.5 rounded-[12px] bg-monserrat-cream/40 p-2.5">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-monserrat-ink/8 text-[11px] font-black text-monserrat-ink/60">
                    {asignacion.docenteNombre ? initials(asignacion.docenteNombre) : <UserRound size={14} />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-monserrat-ink">{asignacion.docenteNombre || "Docente por asignar"}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-monserrat-ink/35">Docente a cargo</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AlumnoCursos;