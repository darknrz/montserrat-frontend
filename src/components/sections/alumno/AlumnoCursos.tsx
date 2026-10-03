import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, GraduationCap, Layers, UserRound, Users2 } from "lucide-react";
import { monserratApi } from "../../../api/monserrat";
import type { AsignacionAcademica } from "../../../types";
import { accentFor, rise } from "./kidTheme";

function labelFromEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function initials(name?: string) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function InfoChip({ icon, label, value, index }: { icon: React.ReactNode; label: string; value: string; index: number }) {
  const accent = accentFor(label);
  return (
    <div className="kid-card kid-rise flex items-center gap-3 p-4" style={rise(index)}>
      <span className="kid-icon-badge" style={{ backgroundColor: accent.bg, color: accent.fg }}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-monserrat-ink/55">{label}</p>
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
    <div className="grid gap-5">
      <div className="kid-rise">
        <h2 className="text-[26px] font-black text-monserrat-ink">Tus cursos</h2>
        <p className="text-[15px] font-semibold text-monserrat-ink/65">Mira qué cursos llevas y quién es tu profe en cada uno.</p>
      </div>
      {status && (
        <div role="alert" className="rounded-[18px] border-2 border-[#e9b3b4] bg-[#fbe9e9] px-4 py-3 text-[14px] font-bold text-[#9f171b]">
          {status}
        </div>
      )}

      {/* Resumen del grupo académico */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoChip index={0} icon={<GraduationCap size={26} />} label="Nivel" value={grupo?.nivel ?? "Sin datos"} />
        <InfoChip index={1} icon={<Layers size={26} />} label="Grado" value={grupo?.grado ?? "Sin datos"} />
        <InfoChip index={2} icon={<Users2 size={26} />} label="Sección" value={grupo?.seccion ?? "Sin datos"} />
        <InfoChip index={3} icon={<BookOpen size={26} />} label="Cursos" value={String(cursos.length)} />
      </div>

      {cursos.length === 0 ? (
        <div className="kid-card kid-rise grid place-items-center gap-3 border-dashed p-10 text-center">
          <span className="kid-icon-badge kid-bob" style={{ backgroundColor: "#fbf0d6", color: "#8a6a14" }}>
            <BookOpen size={28} />
          </span>
          <p className="text-[16px] font-extrabold text-monserrat-ink">Aún no tienes cursos asignados</p>
          <p className="text-[14px] font-semibold text-monserrat-ink/60">Cuando tu colegio los asigne, aparecerán aquí.</p>
        </div>
      ) : (
        // Una tarjeta por curso con color estable y el docente a cargo.
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cursos.map((asignacion, i) => {
            const accent = accentFor(asignacion.curso);
            return (
              <div
                key={asignacion.curso}
                className="kid-card kid-card-hover kid-rise p-5"
                style={{ ...rise(i + 4), borderColor: accent.ring }}
              >
                <div className="flex items-center gap-4">
                  <span className="kid-icon-badge" style={{ backgroundColor: accent.bg, color: accent.fg }}>
                    <BookOpen size={28} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-monserrat-ink/55">Curso</p>
                    <p className="truncate text-[19px] font-black text-monserrat-ink">{labelFromEnum(asignacion.curso)}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-[16px] p-3" style={{ backgroundColor: accent.bg }}>
                  <span
                    className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white text-[13px] font-black"
                    style={{ color: accent.fg }}
                  >
                    {asignacion.docenteNombre ? initials(asignacion.docenteNombre) : <UserRound size={18} />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-extrabold text-monserrat-ink">{asignacion.docenteNombre || "Docente por asignar"}</p>
                    <p className="text-[12px] font-bold text-monserrat-ink/60">Tu profe de este curso</p>
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
