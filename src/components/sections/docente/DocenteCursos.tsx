import React, { useEffect, useMemo, useState } from "react";
import { monserratApi } from "../../../api/monserrat";
import type { AsignacionAcademica, LoginResponse, UsuarioAcademico } from "../../../types";
import { ChevronDown, ChevronRight } from "lucide-react";
import { competenciaConAbreviatura, normalizeDocentesPorCompetencia, tieneAccesoCompetencia, type AcademicoConfig } from "../admin/adminShared";
import { ordenSalon, salonKey, salonLabel } from "./salones";

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
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});

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

  const docenteDni = useMemo(() => {
    try {
      const sessionStr = window.localStorage.getItem("monserrat_academic_session");
      return sessionStr ? (JSON.parse(sessionStr) as LoginResponse).username : "";
    } catch {
      return "";
    }
  }, []);

  // Salones (Ciclado I, Anual, Ciencias, 3ro Prim...) con los cursos y SOLO las competencias
  // que este docente dicta, numeradas C1, C2... segun el orden de la boleta.
  const salones = useMemo(() => {
    const grouped = new Map<string, { key: string; alumnos: Set<string>; cursos: Map<string, { grado?: string; seccion?: string; nivel?: string }[]> }>();

    asignaciones.forEach((item) => {
      const key = salonKey(item.grado, item.seccion);
      if (!key) return;
      if (!grouped.has(key)) grouped.set(key, { key, alumnos: new Set<string>(), cursos: new Map() });
      const current = grouped.get(key)!;
      if (item.alumnoDni) current.alumnos.add(item.alumnoDni);
      if (item.curso) {
        const list = current.cursos.get(item.curso) ?? [];
        list.push({ grado: item.grado, seccion: item.seccion, nivel: item.nivelEducativo });
        current.cursos.set(item.curso, list);
      }
    });

    return Array.from(grouped.values())
      .sort((a, b) => ordenSalon(a.key) - ordenSalon(b.key))
      .map((item) => {
        const cursos = Array.from(item.cursos.entries()).map(([curso, contextos]) => {
          // Se agrupa por POSICIÓN (C1, C2...): primaria y secundaria usan ids distintos para la misma
          // competencia, así que por id aparecería repetida en un salón mixto.
          const comps = new Map<number, { id: string; label: string }>();
          contextos.forEach((ctx) => {
            const isSec = (ctx.nivel || "").toUpperCase().includes("SECUNDARIA") || (ctx.grado ?? "").endsWith("_SECUNDARIA");
            const ids: string[] = (isSec ? academicoConfig?.competenciasPorCursoSecundaria : academicoConfig?.competenciasPorCursoPrimaria)?.[curso] ?? [];
            const catalogo = isSec ? academicoConfig?.competenciasSecundaria ?? [] : academicoConfig?.competenciasPrimaria ?? [];
            const mapping = normalizeDocentesPorCompetencia((isSec ? academicoConfig?.docentesPorCompetenciaSecundaria : academicoConfig?.docentesPorCompetencia) as any);
            ids.forEach((id, index) => {
              if (comps.has(index)) return;
              if (!tieneAccesoCompetencia(mapping, ctx.grado, ctx.seccion, curso, id, docenteDni)) return;
              const c = catalogo.find((x) => x.id === id);
              if (c) comps.set(index, { id, label: competenciaConAbreviatura(c.label, index) });
            });
          });
          const competencias = Array.from(comps.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([, v]) => v);
          return { curso, competencias };
        })
          // Solo las áreas en las que este docente dicta alguna competencia.
          .filter((c) => c.competencias.length > 0);
        return {
          key: item.key,
          salon: salonLabel(item.key),
          alumnoCount: item.alumnos.size,
          cursoCount: cursos.length,
          cursos
        };
      })
      .filter((salon) => !academicoConfig || salon.cursoCount > 0);
  }, [asignaciones, academicoConfig, docenteDni]);

  return (
    <div className="grid gap-4">
      <p className="mb-1 text-sm font-semibold text-monserrat-ink/60">Salones y cursos que atiendes como docente.</p>

      {status && <div className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{status}</div>}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="pro-card pro-rise p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-ink/40">Cursos activos</p>
          <p className="mt-4 text-3xl font-black text-monserrat-ink">{new Set(salones.flatMap((s) => s.cursos.map((c) => c.curso))).size}</p>
          <p className="mt-2 text-sm text-monserrat-ink/60">Cursos diferentes que atiendes.</p>
        </div>
        <div className="pro-card pro-rise p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-ink/40">Salones asignados</p>
          <p className="mt-4 text-3xl font-black text-monserrat-ink">{salones.length}</p>
          <p className="mt-2 text-sm text-monserrat-ink/60">Salones que atiendes.</p>
        </div>
        <div className="pro-card pro-rise p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-ink/40">Alumnos totales</p>
          <p className="mt-4 text-3xl font-black text-monserrat-ink">{alumnos.length}</p>
          <p className="mt-2 text-sm text-monserrat-ink/60">Estudiantes bajo tu responsabilidad.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {salones.length === 0 ? (
          <div className="rounded-[18px] border border-monserrat-ink/10 bg-[#f2f2f1] p-5 text-sm text-monserrat-ink/60">No hay salones asignados.</div>
        ) : (
          salones.map((salon) => {
            const abierto = abiertos[salon.key] ?? false;
            return (
              <div key={salon.key} className="pro-card pro-rise p-5">
                <button
                  type="button"
                  onClick={() => setAbiertos((cur) => ({ ...cur, [salon.key]: !abierto }))}
                  className="flex w-full flex-wrap items-center justify-between gap-4 text-left"
                  aria-expanded={abierto}
                >
                  <div className="flex items-center gap-2">
                    {abierto ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    <p className="text-xl font-black text-monserrat-ink">{salon.salon}</p>
                  </div>
                  <div className="flex gap-3 text-sm text-monserrat-ink/60">
                    <span>{salon.alumnoCount} alumnos</span>
                    <span>{salon.cursoCount} cursos</span>
                  </div>
                </button>
                {abierto && (
                  <div className="mt-4 grid gap-2">
                    {salon.cursos.map((c) => (
                      <details key={c.curso} className="rounded-xl border border-monserrat-gold/25 bg-[#fbf4e4] p-3">
                        <summary className="flex cursor-pointer items-center justify-between gap-2">
                          <span className="font-black text-monserrat-ink">{labelFromEnum(c.curso)}</span>
                          <span className="text-sm text-monserrat-ink/60">{c.competencias.length} {c.competencias.length === 1 ? "competencia" : "competencias"}</span>
                        </summary>
                        <ul className="mt-3 grid gap-1.5">
                          {c.competencias.length === 0 && <li className="text-xs text-monserrat-ink/50">Sin competencias asignadas.</li>}
                          {c.competencias.map((comp) => (
                            <li key={comp.id} className="rounded-lg border border-monserrat-gold/20 bg-white/80 px-2.5 py-1.5 text-xs font-semibold text-monserrat-ink">
                              {comp.label}
                            </li>
                          ))}
                        </ul>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default DocenteCursos;
