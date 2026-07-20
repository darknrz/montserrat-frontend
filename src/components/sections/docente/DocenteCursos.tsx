import React, { useEffect, useMemo, useState } from "react";
import { SectionHeader } from "../../ui/SectionHeader";
import { monserratApi } from "../../../api/monserrat";
import type { AsignacionAcademica, UsuarioAcademico } from "../../../types";
import { getGradosPorNivelAcademico, type AcademicoConfig } from "../admin/adminShared";

function labelFromEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function DocenteCursos({ token }: { token: string }) {
  const [asignaciones, setAsignaciones] = useState<AsignacionAcademica[]>([]);
  const [alumnos, setAlumnos] = useState<UsuarioAcademico[]>([]);
  const [academicoConfig, setAcademicoConfig] = useState<AcademicoConfig | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void Promise.all([monserratApi.asignacionesDocente(token), monserratApi.alumnosDocenteAcademicos(token), monserratApi.academicoConfiguracion<AcademicoConfig>(token)])
      .then(([a, al, config]) => {
        setAsignaciones(a);
        setAlumnos(al);
        setAcademicoConfig(config);
      })
      .catch((e) => setStatus(String(e)));
  }, [token]);

  const salones = useMemo(() => {
    const grouped = new Map<string, { nivel: string; grado?: string; alumnos: Set<string>; cursos: Set<string> }>();

    asignaciones.forEach((item) => {
      const key = `${item.nivelEducativo ?? ""}-${item.grado ?? ""}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          nivel: item.nivelEducativo ?? "",
          grado: item.grado,
          alumnos: new Set<string>(),
          cursos: new Set<string>()
        });
      }
      const current = grouped.get(key)!;
      if (item.alumnoDni) current.alumnos.add(item.alumnoDni);
      if (item.curso) current.cursos.add(item.curso);
    });

    return Array.from(grouped.values()).map((item) => {
      const cursos = Array.from(item.cursos);
      const cursosWithCompetencias = cursos.map((curso) => {
        const isSec = (item.nivel || "").toUpperCase().includes("SECUNDARIA");
        const competenciasMap = isSec ? academicoConfig?.competenciasPorCursoSecundaria ?? {} : academicoConfig?.competenciasPorCursoPrimaria ?? {};
        const competenciasCatalog = isSec ? academicoConfig?.competenciasSecundaria ?? [] : academicoConfig?.competenciasPrimaria ?? [];
        const ids: string[] = competenciasMap[curso] ?? [];
        const competencias = competenciasCatalog.filter((c) => ids.includes(c.id)).map((c) => ({ id: c.id, label: c.label }));
        return { curso, competencias };
      });

      const nivelAcademico = (academicoConfig?.nivelesAcademicos ?? []).find((nivel) =>
        item.grado ? getGradosPorNivelAcademico(nivel.id).includes(item.grado) : false
      );

      return {
        ...item,
        salon: nivelAcademico?.label || (item.grado ? labelFromEnum(item.grado.replace(/_PRIMARIA|_SECUNDARIA/g, "")) : "Sin nivel"),
        nivel: item.nivel ? labelFromEnum(item.nivel) : "Sin nivel",
        alumnoCount: item.alumnos.size,
        cursoCount: item.cursos.size,
        cursos: cursosWithCompetencias
      };
    });
  }, [asignaciones]);

  const cursosTotales = useMemo(() => Array.from(new Set(asignaciones.map((item) => item.curso))).filter(Boolean), [asignaciones]);

  return (
    <div className="grid gap-4">
      <SectionHeader title="Cursos" description="Salones y cursos que atiendes como docente." align="left" />

      {status && <div className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{status}</div>}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[18px] border border-monserrat-ink/10 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-ink/40">Cursos activos</p>
          <p className="mt-4 text-3xl font-black text-monserrat-ink">{cursosTotales.length}</p>
          <p className="mt-2 text-sm text-monserrat-ink/60">Cursos diferentes que atiendes.</p>
        </div>
        <div className="rounded-[18px] border border-monserrat-ink/10 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-ink/40">Niveles académicos</p>
          <p className="mt-4 text-3xl font-black text-monserrat-ink">{salones.length}</p>
          <p className="mt-2 text-sm text-monserrat-ink/60">Grados y niveles asignados.</p>
        </div>
        <div className="rounded-[18px] border border-monserrat-ink/10 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-ink/40">Alumnos totales</p>
          <p className="mt-4 text-3xl font-black text-monserrat-ink">{alumnos.length}</p>
          <p className="mt-2 text-sm text-monserrat-ink/60">Estudiantes bajo tu responsabilidad.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {salones.length === 0 ? (
          <div className="rounded-[18px] border border-monserrat-ink/10 bg-monserrat-cream/40 p-5 text-sm text-monserrat-ink/60">No hay niveles académicos asignados.</div>
        ) : (
          salones.map((salon) => (
            <div key={`${salon.salon}-${salon.nivel}`} className="rounded-[18px] border border-monserrat-ink/10 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-monserrat-ink/40">{salon.salon || "Salón"}</p>
                  <p className="mt-2 text-xl font-black text-monserrat-ink">{salon.nivel}</p>
                </div>
                <div className="flex gap-2 text-sm text-monserrat-ink/60">
                  <span>{salon.alumnoCount} alumnos</span>
                  <span>{salon.cursoCount} cursos</span>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                {salon.cursos.map((c: any) => (
                  <div key={c.curso} className="flex flex-col gap-2 rounded-[10px] border border-monserrat-ink/8 bg-monserrat-cream/40 p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-black text-monserrat-ink">{labelFromEnum(c.curso)}</div>
                      <div className="text-sm text-monserrat-ink/60">{(c.competencias || []).length} competencias</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(c.competencias || []).slice(0, 6).map((comp: any) => (
                        <span key={comp.id} className="rounded-full bg-white/70 px-2 py-1 text-xs font-semibold text-monserrat-ink border border-monserrat-ink/8">{comp.label}</span>
                      ))}
                      {(c.competencias || []).length > 6 && <span className="text-xs text-monserrat-ink/50">+{(c.competencias || []).length - 6} más</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default DocenteCursos;
