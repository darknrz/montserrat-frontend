import React, { useEffect, useMemo, useState } from "react";
import { Award, BookOpen, ClipboardList, MessageSquare, Sparkles } from "lucide-react";
import { monserratApi } from "../../../api/monserrat";
import type { NotaAcademica, AsignacionAcademica } from "../../../types";
import type { AcademicoConfig, CatalogItem } from "../admin/adminShared";
import { accentFor, rise } from "./kidTheme";

const BIMESTRES = ["BIMESTRE_1", "BIMESTRE_2", "BIMESTRE_3", "BIMESTRE_4"] as const;

const PARCIALES_PREFIX = "@parciales:";

// Misma paleta que usa el docente al calificar, para que el alumno vea
// exactamente los mismos colores por nivel en toda la plataforma.
const NIVELES = [
  { value: "C", description: "En inicio", color: "#9f171b", soft: "rgb(159 23 27 / 0.08)" },
  { value: "B", description: "En proceso", color: "#5b6b8c", soft: "rgb(91 107 140 / 0.1)" },
  { value: "A", description: "Logro esperado", color: "#3f7d54", soft: "rgb(63 125 84 / 0.1)" },
  { value: "AD", description: "Logro destacado", color: "#d8a842", soft: "rgb(216 168 66 / 0.14)" }
] as const;

function nivelInfo(value?: string | null) {
  return NIVELES.find((n) => n.value === value);
}

const nivelDesdeValor = (valor?: number | null) => {
  if (valor === 4) return "AD";
  if (valor === 3) return "A";
  if (valor === 2) return "B";
  if (valor === 1) return "C";
  return null;
};

function decodeObservacion(raw?: string | null) {
  if (!raw) return { parciales: [] as { label: string; nivel: string }[], comentario: "" };
  if (!raw.startsWith(PARCIALES_PREFIX)) return { parciales: [], comentario: raw };
  const newlineIdx = raw.indexOf("\n");
  const jsonPart = newlineIdx === -1 ? raw.slice(PARCIALES_PREFIX.length) : raw.slice(PARCIALES_PREFIX.length, newlineIdx);
  const resto = newlineIdx === -1 ? "" : raw.slice(newlineIdx + 1);
  try {
    const parsed = JSON.parse(jsonPart) as { label: string; nivel: string }[];
    return { parciales: parsed.map((p) => ({ label: p.label, nivel: p.nivel })), comentario: resto };
  } catch {
    return { parciales: [], comentario: raw };
  }
}

function promedioBimestralParaCompetencia(notasCurso: NotaAcademica[], competenciaId: string) {
  const relevantes = notasCurso.filter(
    (n) => (BIMESTRES as readonly string[]).includes(n.periodo) && (n.competenciaId || "GENERAL") === competenciaId && n.valor
  );
  if (relevantes.length === 0) return null;
  const promedio = relevantes.reduce((s, n) => s + n.valor, 0) / relevantes.length;
  const nivel = nivelDesdeValor(Math.round(promedio));
  return { promedio, nivel, detalle: relevantes.map((n) => ({ periodo: n.periodo, nivel: nivelDesdeValor(n.valor) })) };
}

function labelFromEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// Círculo compacto con el nivel (C/B/A/AD), coloreado; "—" gris si aún no hay nota.
function NivelDot({ nivel, size = "md" }: { nivel?: string | null; size?: "sm" | "md" | "lg" }) {
  const info = nivelInfo(nivel ?? undefined);
  const dims = size === "lg" ? "h-14 w-14 text-lg" : size === "sm" ? "h-10 w-10 text-[13px]" : "h-11 w-11 text-sm";
  return (
    <span
      className={`flex flex-none items-center justify-center rounded-full border-[3px] font-black ${dims}`}
      style={{
        borderColor: info ? info.color : "rgb(31 27 24 / 0.14)",
        backgroundColor: info ? info.soft : "white",
        color: info ? info.color : "rgb(31 27 24 / 0.3)"
      }}
    >
      {nivel || "—"}
    </span>
  );
}

export function AlumnoNotas({ token }: { token: string }) {
  const [notas, setNotas] = useState<NotaAcademica[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionAcademica[]>([]);
  const [academicoConfig, setAcademicoConfig] = useState<AcademicoConfig | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedCurso, setSelectedCurso] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!token) return;
    void Promise.all([
      monserratApi.notasAlumno(token),
      monserratApi.asignacionesAlumno(token),
      monserratApi.academicoConfiguracion<AcademicoConfig>(token)
    ])
      .then(([n, a, config]) => {
        setNotas(n);
        setAsignaciones(a);
        setAcademicoConfig(config);
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : String(error)));
  }, [token]);

  // Catálogo id -> nombre real de la competencia (el mismo que usa el docente al calificar),
  // combinando primaria y secundaria porque el id de una nota ya guardada es único
  // independientemente del nivel educativo del alumno.
  const competenciaLabelPorId = useMemo(() => {
    const map = new Map<string, string>();
    const todas: CatalogItem[] = [
      ...(academicoConfig?.competenciasPrimaria ?? []),
      ...(academicoConfig?.competenciasSecundaria ?? [])
    ];
    todas.forEach((c) => map.set(c.id, c.label));
    return map;
  }, [academicoConfig]);

  const nombreCompetencia = (compId: string) => {
    if (compId === "GENERAL") return "General";
    return competenciaLabelPorId.get(compId) ?? labelFromEnum(compId);
  };

  const cursosAlumno = useMemo(() => Array.from(new Set(asignaciones.map((a) => a.curso))).filter(Boolean), [asignaciones]);

  const promedioPorCurso = useMemo(() => {
    return cursosAlumno.map((curso) => {
      const cursoNotas = notas.filter((nota) => nota.curso === curso);
      const promedio = cursoNotas.length === 0 ? 0 : cursoNotas.reduce((sum, nota) => sum + nota.valor, 0) / cursoNotas.length;
      return { curso, promedio, conteo: cursoNotas.length, nivel: cursoNotas.length ? nivelDesdeValor(Math.round(promedio)) : null };
    });
  }, [cursosAlumno, notas]);

  useEffect(() => {
    if (!selectedCurso && promedioPorCurso.length > 0) {
      setSelectedCurso(promedioPorCurso[0].curso);
    }
  }, [promedioPorCurso, selectedCurso]);

  const promedioGeneral = useMemo(() => {
    if (notas.length === 0) return null;
    const promedio = notas.reduce((sum, nota) => sum + nota.valor, 0) / notas.length;
    return { promedio, nivel: nivelDesdeValor(Math.round(promedio)) };
  }, [notas]);

  const notasCursoActual = useMemo(() => notas.filter((nota) => nota.curso === selectedCurso), [notas, selectedCurso]);
  const cursoActualDatos = promedioPorCurso.find((c) => c.curso === selectedCurso);

  const competenciasDelCursoActual = useMemo(() => {
    const ids = Array.from(new Set(notasCursoActual.map((n) => n.competenciaId).filter(Boolean))) as string[];
    if (ids.length === 0 && notasCursoActual.length > 0) ids.push("GENERAL");
    return ids;
  }, [notasCursoActual]);

  const toggleExpand = (key: string) => setExpanded((current) => ({ ...current, [key]: !current[key] }));

  return (
    <div className="grid gap-4">
      <div className="kid-rise">
        <h2 className="text-[26px] font-black text-monserrat-ink">Tus notas</h2>
        <p className="text-[15px] font-semibold text-monserrat-ink/65">Mira cómo vas en cada curso. ¡Tú puedes!</p>
      </div>
      {status && (
        <div role="alert" className="rounded-[18px] border-2 border-[#e9b3b4] bg-[#fbe9e9] px-4 py-3 text-[14px] font-bold text-[#9f171b]">
          {status}
        </div>
      )}

      {/* Resumen general: cuántos cursos, el promedio global (con su nivel) y cuántos registros hay. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="kid-card kid-rise flex items-center gap-3 p-4" style={rise(0)}>
          <span className="kid-icon-badge" style={{ backgroundColor: "#fbe9e9", color: "#9f171b" }}>
            <BookOpen size={26} />
          </span>
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-monserrat-ink/55">Cursos</p>
            <p className="text-3xl font-black text-monserrat-ink">{cursosAlumno.length}</p>
          </div>
        </div>
        <div className="kid-card kid-rise flex items-center gap-3 p-4" style={rise(1)}>
          <span className="kid-icon-badge" style={{ backgroundColor: "#fbf0d6", color: "#8a6a14" }}>
            <Award size={26} />
          </span>
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-monserrat-ink/55">Promedio general</p>
              <p className="text-3xl font-black text-monserrat-ink">{promedioGeneral ? promedioGeneral.promedio.toFixed(1) : "—"}</p>
            </div>
            {promedioGeneral && <NivelDot nivel={promedioGeneral.nivel} size="sm" />}
          </div>
        </div>
        <div className="kid-card kid-rise flex items-center gap-3 p-4" style={rise(2)}>
          <span className="kid-icon-badge" style={{ backgroundColor: "#e4eefa", color: "#2c5d8f" }}>
            <ClipboardList size={26} />
          </span>
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-monserrat-ink/55">Registros totales</p>
            <p className="text-3xl font-black text-monserrat-ink">{notas.length}</p>
          </div>
        </div>
      </div>

      {promedioPorCurso.length === 0 ? (
        <div className="kid-card kid-rise grid place-items-center gap-3 border-dashed p-10 text-center">
          <span className="kid-icon-badge kid-bob" style={{ backgroundColor: "#fbf0d6", color: "#8a6a14" }}>
            <Sparkles size={28} />
          </span>
          <p className="text-[16px] font-extrabold text-monserrat-ink">Aún no tienes notas registradas</p>
          <p className="text-[14px] font-semibold text-monserrat-ink/60">Cuando tus profes las registren, las verás aquí.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr] lg:items-start">
          {/* Selector de curso: chips con el nivel promedio como referencia rápida */}
          <div className="kid-card kid-rise grid gap-2 p-4 lg:sticky lg:top-4">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-monserrat-ink/55">Elige un curso</p>
            <div className="grid gap-1.5">
              {promedioPorCurso.map((c) => {
                const active = c.curso === selectedCurso;
                return (
                  <button
                    key={c.curso}
                    type="button"
                    onClick={() => setSelectedCurso(c.curso)}
                    aria-pressed={active}
                    className={`flex min-h-[56px] items-center gap-3 rounded-[16px] border-2 px-3 py-2.5 text-left transition-all ${
                      active ? "border-monserrat-red bg-[#fbe9e9] shadow-sm" : "border-transparent bg-[#fbf6ea] hover:border-monserrat-gold/50 hover:bg-[#fbf0d6]"
                    }`}
                  >
                    <NivelDot nivel={c.nivel} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-black text-monserrat-ink">{labelFromEnum(c.curso)}</span>
                      <span className="block text-[12px] font-bold text-monserrat-ink/55">{c.conteo} nota(s)</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detalle del curso seleccionado */}
          <div className="grid gap-3">
            {cursoActualDatos && (
              <div className="kid-card kid-rise flex flex-wrap items-center justify-between gap-3 p-5" style={{ borderColor: accentFor(cursoActualDatos.curso).ring }}>
                <div>
                  <p className="text-[13px] font-extrabold uppercase tracking-[0.1em]" style={{ color: accentFor(cursoActualDatos.curso).fg }}>{labelFromEnum(cursoActualDatos.curso)}</p>
                  <p className="mt-1 text-3xl font-black text-monserrat-ink">
                    Promedio {cursoActualDatos.conteo ? cursoActualDatos.promedio.toFixed(1) : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <NivelDot nivel={cursoActualDatos.nivel} size="lg" />
                  <div className="kid-chip bg-[#fbf0d6] text-[#6f4b14]">
                    {cursoActualDatos.conteo} notas
                  </div>
                </div>
              </div>
            )}

            {/* Leyenda de niveles, para que quede claro qué significa cada letra/color */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[18px] border-2 border-monserrat-gold/25 bg-[#fbf6ea] px-4 py-3">
              {NIVELES.map((nivel) => (
                <span key={nivel.value} className="flex items-center gap-2 text-[13px] font-bold text-monserrat-ink/75">
                  <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: nivel.color }} />
                  {nivel.value} · {nivel.description}
                </span>
              ))}
            </div>

            {/* Una competencia por fila: línea de tiempo de bimestres -> nota final,
                para verla de un vistazo en vez de bloques largos apilados. */}
            <div className="grid gap-3">
              {competenciasDelCursoActual.map((compId, ci) => {
                const notasComp = notasCursoActual.filter((n) => (n.competenciaId || "GENERAL") === compId);
                const notaFinal = notasComp.find((n) => n.periodo === "GENERAL");
                const sugerencia = promedioBimestralParaCompetencia(notasCursoActual, compId);
                const nivelFinal = notaFinal ? nivelDesdeValor(notaFinal.valor) : sugerencia?.nivel ?? null;
                const decodedFinal = notaFinal ? decodeObservacion(notaFinal.observacion) : { parciales: [], comentario: "" };
                const infoFinal = nivelInfo(nivelFinal ?? undefined);

                return (
                  <div
                    key={compId}
                    className="kid-card kid-rise p-5"
                    style={{ ...rise(ci + 1), borderLeft: `8px solid ${infoFinal ? infoFinal.color : "rgb(31 27 24 / 0.12)"}` }}
                  >
                    <p className="text-[15px] font-black text-monserrat-ink">{nombreCompetencia(compId)}</p>

                    {/* Línea de tiempo: B1 — B2 — B3 — B4 — Final, conectados */}
                    <div className="mt-4 flex items-center">
                      {BIMESTRES.map((periodo, idx) => {
                        const n = notasComp.find((x) => x.periodo === periodo);
                        const nivel = nivelDesdeValor(n?.valor);
                        const decoded = decodeObservacion(n?.observacion);
                        const hasDetail = decoded.parciales.length > 0 || Boolean(decoded.comentario);
                        const key = `${selectedCurso}||${compId}||${periodo}`;
                        return (
                          <React.Fragment key={periodo}>
                            <button
                              type="button"
                              disabled={!hasDetail}
                              onClick={() => toggleExpand(key)}
                              className="relative flex min-h-[44px] flex-none flex-col items-center gap-1 rounded-xl disabled:cursor-default"
                            >
                              <NivelDot nivel={nivel} size="md" />
                              {hasDetail && (
                                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-monserrat-gold text-white">
                                  <MessageSquare size={11} />
                                </span>
                              )}
                              <span className="text-[12px] font-extrabold uppercase tracking-wide text-monserrat-ink/55">
                                {labelFromEnum(periodo).replace("Bimestre ", "B")}
                              </span>
                            </button>
                            <span className="mb-5 h-1 flex-1 rounded-full bg-monserrat-gold/25" />
                          </React.Fragment>
                        );
                      })}
                      <button
                        type="button"
                        disabled={!decodedFinal.comentario}
                        onClick={() => toggleExpand(`${selectedCurso}||${compId}||GENERAL`)}
                        className="flex min-h-[44px] flex-none flex-col items-center gap-1 rounded-xl disabled:cursor-default"
                      >
                        <NivelDot nivel={nivelFinal} size="lg" />
                        <span className="text-[12px] font-extrabold uppercase tracking-wide text-monserrat-goldDark">
                          {notaFinal ? "Final" : sugerencia ? "Final (sug.)" : "Final"}
                        </span>
                      </button>
                    </div>

                    {/* Paneles desplegables: parciales y comentario de cada bimestre */}
                    {BIMESTRES.map((periodo) => {
                      const n = notasComp.find((x) => x.periodo === periodo);
                      const decoded = decodeObservacion(n?.observacion);
                      const key = `${selectedCurso}||${compId}||${periodo}`;
                      if (!expanded[key] || (decoded.parciales.length === 0 && !decoded.comentario)) return null;
                      return (
                        <div key={periodo} className="kid-rise mt-3 rounded-[16px] bg-[#fbf6ea] p-4">
                          <p className="text-[12px] font-extrabold uppercase tracking-wide text-monserrat-ink/60">{labelFromEnum(periodo)}</p>
                          {decoded.parciales.length > 0 && (
                            <div className="mt-2 grid gap-1.5">
                              {decoded.parciales.map((p, idx) => (
                                <div key={idx} className="flex items-center justify-between rounded-[12px] bg-white px-3 py-2">
                                  <span className="text-[14px] font-semibold text-monserrat-ink">{p.label}</span>
                                  <NivelDot nivel={p.nivel} size="sm" />
                                </div>
                              ))}
                            </div>
                          )}
                          {decoded.comentario && <p className="mt-2 text-[14px] font-medium text-monserrat-ink/75">{decoded.comentario}</p>}
                        </div>
                      );
                    })}

                    {expanded[`${selectedCurso}||${compId}||GENERAL`] && decodedFinal.comentario && (
                      <div className="kid-rise mt-3 rounded-[16px] border-2 border-monserrat-gold/35 bg-[#fbf0d6] p-4">
                        <p className="text-[12px] font-extrabold uppercase tracking-wide text-monserrat-goldDark">Nota final</p>
                        <p className="mt-1 text-[14px] font-medium text-monserrat-ink/75">{decodedFinal.comentario}</p>
                      </div>
                    )}

                    {!notaFinal && sugerencia && (
                      <p className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-monserrat-ink/60">
                        <Sparkles size={14} />
                        Nota final sugerida a partir del promedio de bimestres ({sugerencia.promedio.toFixed(2)})
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AlumnoNotas;