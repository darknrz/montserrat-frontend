import React, { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, MessageSquarePlus, Plus, Save, Search, Sparkles, X } from "lucide-react";
import { SectionHeader } from "../../ui/SectionHeader";
import { monserratApi } from "../../../api/monserrat";
import type { AsignacionAcademica, UsuarioAcademico, NotaAcademica } from "../../../types";
import { getGradosPorNivelAcademico, type AcademicoConfig, type CatalogItem } from "../admin/adminShared";

const BIMESTRES = ["BIMESTRE_1", "BIMESTRE_2", "BIMESTRE_3", "BIMESTRE_4"] as const;
const PERIODOS = [...BIMESTRES, "GENERAL"] as const;
type Periodo = (typeof PERIODOS)[number];

type ParcialNota = {
  id: string;
  label: string;
  nivel: string;
};

type NotaDraftValue = {
  nivel?: string;
  descripcion?: string;
  parciales?: ParcialNota[];
};

type NotaDrafts = Record<string, NotaDraftValue>;

// Progresión "en inicio -> destacado" usando el rojo y el oro de la marca
// como extremos, y dos tonos de apoyo para los pasos intermedios.
const NIVELES = [
  { value: "C", label: "C", description: "En inicio", color: "#9f171b", soft: "rgb(159 23 27 / 0.08)" },
  { value: "B", label: "B", description: "En proceso", color: "#5b6b8c", soft: "rgb(91 107 140 / 0.1)" },
  { value: "A", label: "A", description: "Logro esperado", color: "#3f7d54", soft: "rgb(63 125 84 / 0.1)" },
  { value: "AD", label: "AD", description: "Logro destacado", color: "#d8a842", soft: "rgb(216 168 66 / 0.14)" }
] as const;

// Los "parciales" (prácticas, exámenes, etc.) no tienen columna propia en NotaAcademica,
// así que se codifican dentro de `observacion` con este marcador y se separan del
// comentario libre del docente al leer/escribir. No afecta al contrato del backend:
// `observacion` sigue siendo un string común.
const PARCIALES_PREFIX = "@parciales:";

function encodeObservacion(parciales: ParcialNota[], comentario: string) {
  const limpio = parciales.filter((p) => p.label.trim() || p.nivel);
  if (limpio.length === 0) return comentario;
  const payload = limpio.map((p) => ({ label: p.label, nivel: p.nivel }));
  return `${PARCIALES_PREFIX}${JSON.stringify(payload)}\n${comentario}`;
}

function decodeObservacion(raw?: string | null): { parciales: ParcialNota[]; comentario: string } {
  if (!raw) return { parciales: [], comentario: "" };
  if (!raw.startsWith(PARCIALES_PREFIX)) return { parciales: [], comentario: raw };
  const newlineIdx = raw.indexOf("\n");
  const jsonPart = newlineIdx === -1 ? raw.slice(PARCIALES_PREFIX.length) : raw.slice(PARCIALES_PREFIX.length, newlineIdx);
  const resto = newlineIdx === -1 ? "" : raw.slice(newlineIdx + 1);
  try {
    const parsed = JSON.parse(jsonPart) as { label: string; nivel: string }[];
    return { parciales: parsed.map((p, i) => ({ id: `saved-${i}`, label: p.label, nivel: p.nivel })), comentario: resto };
  } catch {
    return { parciales: [], comentario: raw };
  }
}

function makeParcialId() {
  return `p${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
}

function nivelInfo(value: string) {
  return NIVELES.find((n) => n.value === value);
}

function labelFromEnum(value?: string | null) {
  if (!value) return "";
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

const nivelDesdeValor = (valor?: number | null) => {
  if (valor === 4) return "AD";
  if (valor === 3) return "A";
  if (valor === 2) return "B";
  if (valor === 1) return "C";
  return "";
};

const valorDesdeNivel = (nivel: string) => {
  if (nivel === "AD") return 4;
  if (nivel === "A") return 3;
  if (nivel === "B") return 2;
  if (nivel === "C") return 1;
  return 0;
};

export function DocenteNotas({ token }: { token: string }) {
  const [alumnos, setAlumnos] = useState<UsuarioAcademico[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionAcademica[]>([]);
  const [notas, setNotas] = useState<NotaAcademica[]>([]);
  const [academicoConfig, setAcademicoConfig] = useState<AcademicoConfig | null>(null);
  const [selectedCurso, setSelectedCurso] = useState("");
  const [selectedNivelAcademico, setSelectedNivelAcademico] = useState("");
  const [selectedAlumnoDni, setSelectedAlumnoDni] = useState("");
  const [alumnoQuery, setAlumnoQuery] = useState("");
  const [activePeriodo, setActivePeriodo] = useState<Periodo>(BIMESTRES[0]);
  const [toast, setToast] = useState<{ text: string; kind: "ok" | "error" } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [drafts, setDrafts] = useState<NotaDrafts>({});
  const [savingCompetencia, setSavingCompetencia] = useState<string | null>(null);
  const [openComentario, setOpenComentario] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!token) return;

    void Promise.all([
      monserratApi.alumnosDocenteAcademicos(token),
      monserratApi.asignacionesDocente(token),
      monserratApi.notasDocente(token),
      monserratApi.academicoConfiguracion<AcademicoConfig>(token)
    ])
      .then(([al, asig, nt, config]) => {
        setAlumnos(al);
        setAsignaciones(asig);
        setNotas(nt);
        setAcademicoConfig(config);
      })
      .catch((e) => showToast(String(e), "error"));
  }, [token]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  function showToast(text: string, kind: "ok" | "error" = "ok") {
    setToast({ text, kind });
  }

  const cursosDisponibles = useMemo(() => Array.from(new Set(asignaciones.map((a) => a.curso))).filter(Boolean), [asignaciones]);

  const nivelesDeCurso = useMemo(() => {
    if (!selectedCurso) return [] as { id: string; label: string }[];
    const activeLevels = (academicoConfig?.nivelesAcademicos ?? []).filter((nivel) => nivel.active);
    const map = new Map<string, { id: string; label: string }>();
    asignaciones
      .filter((a) => a.curso === selectedCurso && a.grado)
      .forEach((a) => {
        const matchingLevel = activeLevels.find((nivel) =>
          getGradosPorNivelAcademico(nivel.id).includes(a.grado ?? "")
        );
        if (matchingLevel && !map.has(matchingLevel.id)) {
          map.set(matchingLevel.id, { id: matchingLevel.id, label: matchingLevel.label });
        }
      });
    return Array.from(map.values());
  }, [academicoConfig?.nivelesAcademicos, selectedCurso, asignaciones]);

  useEffect(() => {
    if (nivelesDeCurso.length > 0) {
      const stillValid = nivelesDeCurso.some((nivel) => nivel.id === selectedNivelAcademico);
      if (!stillValid) {
        setSelectedNivelAcademico(nivelesDeCurso[0].id);
      }
    } else {
      setSelectedNivelAcademico("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivelesDeCurso]);

  const alumnosFiltrados = useMemo(() => {
    if (!selectedCurso || !selectedNivelAcademico) return [] as UsuarioAcademico[];
    const gradosDelNivel = getGradosPorNivelAcademico(selectedNivelAcademico);
    return alumnos.filter((al) =>
      asignaciones.some((a) => a.alumnoDni === al.dni && a.curso === selectedCurso && gradosDelNivel.includes(a.grado ?? ""))
    );
  }, [selectedCurso, selectedNivelAcademico, alumnos, asignaciones]);

  const alumnosVisibles = useMemo(() => {
    const query = alumnoQuery.trim().toLowerCase();
    if (!query) return alumnosFiltrados;
    return alumnosFiltrados.filter((al) => al.nombre.toLowerCase().includes(query) || al.dni.includes(query));
  }, [alumnosFiltrados, alumnoQuery]);

  useEffect(() => {
    if (alumnosFiltrados.length > 0) {
      const stillValid = alumnosFiltrados.some((al) => al.dni === selectedAlumnoDni);
      if (!stillValid) setSelectedAlumnoDni(alumnosFiltrados[0].dni);
    } else {
      setSelectedAlumnoDni("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alumnosFiltrados]);

  const alumnoSeleccionado = alumnos.find((al) => al.dni === selectedAlumnoDni);

  const competenciasDelCurso = useMemo(() => {
    if (!selectedCurso || !selectedNivelAcademico || !academicoConfig) return [] as CatalogItem[];
    const gradosDelNivel = getGradosPorNivelAcademico(selectedNivelAcademico);
    const esSecundaria = gradosDelNivel.some((grado) => grado.endsWith("_SECUNDARIA"));
    const competenciasPorCurso = esSecundaria
      ? academicoConfig.competenciasPorCursoSecundaria ?? {}
      : academicoConfig.competenciasPorCursoPrimaria ?? {};
    const competenciasDisponibles = esSecundaria
      ? academicoConfig.competenciasSecundaria ?? []
      : academicoConfig.competenciasPrimaria ?? [];
    const ids = competenciasPorCurso[selectedCurso] ?? [];
    return competenciasDisponibles.filter((competencia) => ids.includes(competencia.id));
  }, [academicoConfig, selectedCurso, selectedNivelAcademico]);

  const periodoActivo = activePeriodo;

  const notasPorCompetencia = useMemo(() => {
    if (!selectedAlumnoDni || !selectedCurso) return [] as NotaAcademica[];
    return notas.filter((nota) => nota.alumnoDni === selectedAlumnoDni && nota.curso === selectedCurso);
  }, [notas, selectedAlumnoDni, selectedCurso]);

  // Progreso general del alumno: 4 bimestres + la nota final del período lectivo, por competencia.
  const progresoPorAlumno = useMemo(() => {
    const total = competenciasDelCurso.length * PERIODOS.length;
    const map = new Map<string, { done: number; total: number }>();
    alumnosFiltrados.forEach((al) => {
      const done = notas.filter(
        (n) =>
          n.alumnoDni === al.dni &&
          n.curso === selectedCurso &&
          (PERIODOS as readonly string[]).includes(n.periodo) &&
          competenciasDelCurso.some((c) => c.id === n.competenciaId) &&
          n.valor
      ).length;
      map.set(al.dni, { done, total });
    });
    return map;
  }, [alumnosFiltrados, notas, selectedCurso, competenciasDelCurso]);

  const progresoAlumnoActual = progresoPorAlumno.get(selectedAlumnoDni) ?? { done: 0, total: competenciasDelCurso.length };

  const getNotaKey = (periodo: string, competenciaId: string) => `${selectedAlumnoDni}||${selectedCurso}||${periodo}||${competenciaId}`;

  // Promedio de las notas finales de bimestre YA GUARDADAS para una competencia,
  // usado como sugerencia de la nota "General".
  const promedioBimestral = (competenciaId: string) => {
    const relevantes = notasPorCompetencia.filter(
      (n) => (BIMESTRES as readonly string[]).includes(n.periodo) && n.competenciaId === competenciaId && n.valor
    );
    if (relevantes.length === 0) return { nivel: "", detalle: [] as { periodo: string; nivel: string }[] };
    const detalle = relevantes
      .slice()
      .sort((a, b) => BIMESTRES.indexOf(a.periodo as (typeof BIMESTRES)[number]) - BIMESTRES.indexOf(b.periodo as (typeof BIMESTRES)[number]))
      .map((n) => ({ periodo: n.periodo, nivel: nivelDesdeValor(n.valor) }));
    const promedio = relevantes.reduce((sum, n) => sum + n.valor, 0) / relevantes.length;
    return { nivel: nivelDesdeValor(Math.round(promedio)), detalle };
  };

  // Única fuente de verdad para leer el estado "efectivo" (borrador > guardado > sugerido)
  // de una competencia+periodo, usada tanto para pintar la UI como para guardar.
  const resolveDraft = (periodo: string, competenciaId: string) => {
    const existing = notasPorCompetencia.find((nota) => nota.periodo === periodo && nota.competenciaId === competenciaId);
    const decoded = decodeObservacion(existing?.observacion);
    const key = getNotaKey(periodo, competenciaId);
    const draft = drafts[key];

    const sugerencia = periodo === "GENERAL" ? promedioBimestral(competenciaId) : { nivel: "", detalle: [] as { periodo: string; nivel: string }[] };
    const nivelGuardado = nivelDesdeValor(existing?.valor);

    return {
      nivel: draft?.nivel || nivelGuardado || sugerencia.nivel,
      descripcion: draft?.descripcion ?? decoded.comentario,
      parciales: draft?.parciales ?? decoded.parciales,
      isSugerido: periodo === "GENERAL" && !draft?.nivel && !nivelGuardado && Boolean(sugerencia.nivel),
      sugerenciaDetalle: sugerencia.detalle
    };
  };

  const updateNivel = (periodo: string, competenciaId: string, nivel: string) => {
    const key = getNotaKey(periodo, competenciaId);
    setDrafts((current) => ({ ...current, [key]: { ...(current[key] ?? {}), nivel } }));
  };

  const updateDescripcion = (periodo: string, competenciaId: string, descripcion: string) => {
    const key = getNotaKey(periodo, competenciaId);
    setDrafts((current) => ({ ...current, [key]: { ...(current[key] ?? {}), descripcion } }));
  };

  const addParcial = (periodo: string, competenciaId: string) => {
    const key = getNotaKey(periodo, competenciaId);
    const actuales = resolveDraft(periodo, competenciaId).parciales;
    const next = [...actuales, { id: makeParcialId(), label: `Nota parcial ${actuales.length + 1}`, nivel: "" }];
    setDrafts((current) => ({ ...current, [key]: { ...(current[key] ?? {}), parciales: next } }));
  };

  const updateParcial = (periodo: string, competenciaId: string, parcialId: string, field: "label" | "nivel", value: string) => {
    const key = getNotaKey(periodo, competenciaId);
    const actuales = resolveDraft(periodo, competenciaId).parciales;
    const next = actuales.map((p) => (p.id === parcialId ? { ...p, [field]: value } : p));
    setDrafts((current) => ({ ...current, [key]: { ...(current[key] ?? {}), parciales: next } }));
  };

  const removeParcial = (periodo: string, competenciaId: string, parcialId: string) => {
    const key = getNotaKey(periodo, competenciaId);
    const actuales = resolveDraft(periodo, competenciaId).parciales;
    const next = actuales.filter((p) => p.id !== parcialId);
    setDrafts((current) => ({ ...current, [key]: { ...(current[key] ?? {}), parciales: next } }));
  };

  // Guarda una competencia para los periodos indicados. No refresca `notas` por sí sola
  // (para poder encadenar varias llamadas al guardar todo sin recargar de más).
  const persistCompetencia = async (competenciaId: string, periodos: string[]) => {
    for (const periodo of periodos) {
      const resolved = resolveDraft(periodo, competenciaId);
      if (!resolved.nivel) continue;

      const valor = valorDesdeNivel(resolved.nivel);
      const observacion = periodo === "GENERAL" ? resolved.descripcion : encodeObservacion(resolved.parciales, resolved.descripcion);
      const existing = notasPorCompetencia.find((nota) => nota.periodo === periodo && nota.competenciaId === competenciaId);

      if (existing) {
        await monserratApi.updateNota(
          existing.id,
          {
            alumnoDni: selectedAlumnoDni,
            curso: selectedCurso,
            periodo,
            tipoEvaluacion: existing.tipoEvaluacion ?? "EXAMEN",
            valor,
            observacion,
            competenciaId
          },
          token
        );
      } else {
        await monserratApi.createNota(
          {
            alumnoDni: selectedAlumnoDni,
            curso: selectedCurso,
            periodo,
            tipoEvaluacion: "EXAMEN",
            valor,
            observacion,
            competenciaId
          },
          token
        );
      }
    }
  };

  const saveCompetencia = async (competenciaId: string) => {
    if (!selectedAlumnoDni || !selectedCurso || !token) {
      showToast("Selecciona alumno y curso para guardar las notas.", "error");
      return;
    }

    setIsBusy(true);
    setSavingCompetencia(competenciaId);

    try {
      await persistCompetencia(competenciaId, [periodoActivo]);
      const updated = await monserratApi.notasDocente(token);
      setNotas(updated);
      showToast("Nota guardada correctamente.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo guardar la nota.", "error");
    } finally {
      setIsBusy(false);
      setSavingCompetencia(null);
    }
  };

  const saveTodas = async () => {
    if (!selectedAlumnoDni || !selectedCurso || !token || competenciasDelCurso.length === 0) {
      showToast("Selecciona alumno y curso para guardar las notas.", "error");
      return;
    }

    setIsBusy(true);
    setIsSavingAll(true);

    try {
      for (const competencia of competenciasDelCurso) {
        await persistCompetencia(competencia.id, [periodoActivo]);
      }
      const updated = await monserratApi.notasDocente(token);
      setNotas(updated);
      showToast(
        `Guardado: ${competenciasDelCurso.length} competencia(s) para ${
          periodoActivo === "GENERAL" ? "la nota final" : labelFromEnum(periodoActivo)
        }.`
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudieron guardar todas las notas.", "error");
    } finally {
      setIsBusy(false);
      setIsSavingAll(false);
    }
  };

  const puedeCalificar = Boolean(selectedAlumnoDni && selectedCurso && competenciasDelCurso.length > 0);

  return (
    <div className="grid gap-4">
      <SectionHeader
        title="Notas del docente"
        description="Registra notas por competencias según los bimestres del año escolar y una nota general por estudiante."
        align="left"
      />

      {/* Layout en columnas: la selección (curso/salón/alumno) queda fija a la
          izquierda como una barra lateral, y el panel de calificación ocupa
          el resto del ancho a la derecha — en vez de apilar todo hacia abajo. */}
      <div className="grid gap-4 lg:grid-cols-[300px_1fr] lg:items-start">
        {/* Paso 1, 2 y 3: curso, salón y alumno */}
        <div className="grid gap-4 rounded-[18px] border border-monserrat-ink/10 bg-white p-5  lg:sticky lg:top-4">
          <div className="grid gap-1.5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-ink/40">1. Curso</p>
            {cursosDisponibles.length === 0 ? (
              <p className="text-sm font-semibold text-monserrat-ink/50">Aún no tienes cursos asignados.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {cursosDisponibles.map((curso) => (
                  <button
                    key={curso}
                    type="button"
                    onClick={() => setSelectedCurso(curso)}
                    className={`rounded-full px-4 py-2 text-xs font-black transition-all ${
                      selectedCurso === curso
                        ? "bg-[#e3e3e1] text-monserrat-ink  shadow-monserrat-red/20"
                        : "border border-monserrat-ink/12 bg-[#f2f2f1] text-monserrat-ink/65 hover:bg-[#f2f2f1]/70"
                    }`}
                  >
                    {labelFromEnum(curso)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedCurso && (
            <div className="grid gap-1.5">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-ink/40">2. Nivel académico</p>
              <div className="flex flex-wrap gap-2">
                {nivelesDeCurso.map((nivel) => {
                  const active = nivel.id === selectedNivelAcademico;
                  return (
                    <button
                      key={nivel.id}
                      type="button"
                      onClick={() => setSelectedNivelAcademico(nivel.id)}
                      className={`rounded-full px-4 py-2 text-xs font-black transition-all ${
                        active
                          ? "bg-[#e3e3e1] text-monserrat-ink "
                          : "border border-monserrat-ink/12 bg-[#f2f2f1] text-monserrat-ink/65 hover:bg-[#f2f2f1]/70"
                      }`}
                    >
                      {nivel.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Paso 3: alumno, con buscador y barra de progreso */}
          {selectedNivelAcademico && (
            <div className="grid gap-1.5">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-ink/40">3. Alumno</p>
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-monserrat-ink/35" />
                <input
                  value={alumnoQuery}
                  onChange={(e) => setAlumnoQuery(e.target.value)}
                  placeholder="Buscar por nombre o DNI…"
                  className="admin-input pl-8"
                />
              </div>
              <div className="admin-table-scroll mt-1 grid max-h-[28rem] gap-1.5 overflow-y-auto pr-1">
                {alumnosVisibles.length === 0 && (
                  <p className="px-2 py-3 text-sm font-semibold text-monserrat-ink/45">No se encontró ningún alumno con ese criterio.</p>
                )}
                {alumnosVisibles.map((alumno) => {
                  const progreso = progresoPorAlumno.get(alumno.dni) ?? { done: 0, total: competenciasDelCurso.length };
                  const completo = progreso.total > 0 && progreso.done >= progreso.total;
                  const active = alumno.dni === selectedAlumnoDni;
                  return (
                    <button
                      key={alumno.dni}
                      type="button"
                      onClick={() => setSelectedAlumnoDni(alumno.dni)}
                      className={`flex items-center gap-3 rounded-[14px] border px-3 py-2 text-left transition-all ${
                        active ? "border-black/25 bg-[#e9e9e8]" : "border-monserrat-ink/8 bg-white hover:bg-[#f2f2f1]"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-[11px] font-black ${
                          active ? "bg-[#e3e3e1] text-monserrat-ink" : "bg-[#f2f2f1]/70 text-monserrat-ink/60"
                        }`}
                      >
                        {initials(alumno.nombre)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-monserrat-ink">{alumno.nombre}</span>
                        <span className="block text-[11px] font-semibold text-monserrat-ink/45">DNI: {alumno.dni}</span>
                      </span>
                      {progreso.total > 0 && (
                        <span
                          className={`flex flex-none items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black ${
                            completo ? "bg-[#3f7d54]/12 text-[#3f7d54]" : "bg-[#e3e3e1]/6 text-monserrat-ink/50"
                          }`}
                        >
                          {completo && <Check size={11} />}
                          {progreso.done}/{progreso.total}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Panel de calificación */}
        <div className="grid gap-4">
          {puedeCalificar ? (
            <div className="grid gap-4 rounded-[18px] border border-monserrat-ink/10 bg-white p-5 ">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#e3e3e1] text-sm font-black text-monserrat-ink">
                    {initials(alumnoSeleccionado?.nombre)}
                  </span>
                  <div>
                    <p className="text-sm font-black text-monserrat-ink">{alumnoSeleccionado?.nombre}</p>
                    <p className="text-[11px] font-semibold text-monserrat-ink/50">
                      {labelFromEnum(selectedCurso)} · {progresoAlumnoActual.done}/{progresoAlumnoActual.total} notas registradas
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void saveTodas()}
                  className="inline-flex items-center gap-1.5 rounded-[12px] border border-black/15 px-3 py-1.5 text-xs font-black text-monserrat-ink disabled:opacity-50"
                >
                  <Save size={13} />
                  {isSavingAll ? "Guardando todo…" : "Guardar todo"}
                </button>
              </div>

              {/* Los 4 bimestres en orden, y al final la nota de cierre del período lectivo,
                  separada visualmente porque resume a las anteriores. */}
              <div className="flex items-stretch gap-2 overflow-x-auto rounded-[14px] bg-[#f2f2f1] p-1.5">
                {BIMESTRES.map((periodo) => (
                  <button
                    key={periodo}
                    type="button"
                    onClick={() => setActivePeriodo(periodo)}
                    className={`flex-1 whitespace-nowrap rounded-[10px] px-3 py-2 text-xs font-black transition-all ${
                      activePeriodo === periodo ? "bg-white text-monserrat-ink " : "text-monserrat-ink/50 hover:text-monserrat-ink/80"
                    }`}
                  >
                    {labelFromEnum(periodo)}
                  </button>
                ))}
                <div className="w-px flex-none self-stretch bg-[#e3e3e1]/12" />
                <button
                  type="button"
                  onClick={() => setActivePeriodo("GENERAL")}
                  className={`flex-1 whitespace-nowrap rounded-[10px] px-3 py-2 text-xs font-black transition-all ${
                    activePeriodo === "GENERAL"
                      ? "bg-monserrat-gold text-monserrat-ink "
                      : "text-monserrat-goldDark/70 hover:text-monserrat-goldDark"
                  }`}
                >
                  Nota final
                </button>
              </div>

              <p className="text-xs font-bold text-monserrat-ink/45">
                {competenciasDelCurso.length} competencia(s) ·{" "}
                {activePeriodo === "GENERAL" ? "NL al finalizar el período lectivo" : labelFromEnum(activePeriodo)}
              </p>

              {/* Una competencia por fila (ocupa todo el ancho), pero cada tarjeta se
                  divide internamente en dos columnas: info a la izquierda, calificación
                  a la derecha — así se aprovecha el ancho sin que las tarjetas salten
                  de columna en columna. */}
              <div className="grid gap-3">
                {competenciasDelCurso.map((competencia) => {
                  const resolved = resolveDraft(periodoActivo, competencia.id);
                  const info = nivelInfo(resolved.nivel);
                  const key = getNotaKey(periodoActivo, competencia.id);
                  const comentarioAbierto = openComentario[key] ?? Boolean(resolved.descripcion);

                  return (
                    <div
                      key={competencia.id}
                      className="rounded-[16px] border border-monserrat-ink/10 bg-[#f2f2f1] p-4"
                      style={{ borderLeft: `4px solid ${info ? info.color : "rgb(31 27 24 / 0.12)"}` }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-black text-monserrat-ink">{competencia.label}</p>
                        <button
                          type="button"
                          disabled={isBusy || !resolved.nivel}
                          onClick={() => void saveCompetencia(competencia.id)}
                          className="inline-flex items-center gap-1.5 rounded-[12px] bg-[#e3e3e1] px-3 py-1.5 text-xs font-black text-monserrat-ink disabled:opacity-40"
                        >
                          <Save size={13} />
                          {savingCompetencia === competencia.id ? "Guardando…" : "Guardar"}
                        </button>
                      </div>

                      {/* Dos columnas dentro de la tarjeta: a la izquierda el contexto
                          (parciales o resumen de bimestres), a la derecha la calificación. */}
                      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1.3fr] md:items-start">
                        <div className="grid gap-3">
                          {/* Notas parciales: solo dentro de un bimestre puntual */}
                          {periodoActivo !== "GENERAL" && (
                            <div className="grid gap-2 rounded-[12px] border border-dashed border-monserrat-ink/15 bg-white/60 p-3">
                              <div className="flex items-center justify-between">
                                <p className="text-[11px] font-black uppercase tracking-wide text-monserrat-ink/45">
                                  Parciales ({resolved.parciales.length})
                                </p>
                                <button
                                  type="button"
                                  onClick={() => addParcial(periodoActivo, competencia.id)}
                                  className="inline-flex items-center gap-1 text-[11px] font-black text-monserrat-ink"
                                >
                                  <Plus size={12} /> Agregar
                                </button>
                              </div>

                              {resolved.parciales.length === 0 && (
                                <p className="text-[11px] font-semibold text-monserrat-ink/40">
                                  Aún no hay notas parciales (prácticas, exámenes, etc.).
                                </p>
                              )}

                              {resolved.parciales.map((parcial) => (
                                <div key={parcial.id} className="grid gap-1.5 rounded-[10px] bg-[#f2f2f1] p-2">
                                  <div className="flex items-center gap-2">
                                    <input
                                      value={parcial.label}
                                      onChange={(e) => updateParcial(periodoActivo, competencia.id, parcial.id, "label", e.target.value)}
                                      className="admin-input min-w-0 flex-1 !py-1.5 !text-xs"
                                      placeholder="Ej. Práctica 1"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeParcial(periodoActivo, competencia.id, parcial.id)}
                                      className="flex-none text-monserrat-ink/30 hover:text-monserrat-ink"
                                      aria-label="Quitar nota parcial"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                  <div className="flex gap-1">
                                    {NIVELES.map((nivel) => {
                                      const active = parcial.nivel === nivel.value;
                                      return (
                                        <button
                                          key={nivel.value}
                                          type="button"
                                          onClick={() => updateParcial(periodoActivo, competencia.id, parcial.id, "nivel", nivel.value)}
                                          className="flex-1 rounded-[8px] border-[1.5px] px-2 py-1 text-[11px] font-black transition-all"
                                          style={{
                                            borderColor: active ? nivel.color : "rgb(31 27 24 / 0.12)",
                                            backgroundColor: active ? nivel.soft : "transparent",
                                            color: active ? nivel.color : "rgb(31 27 24 / 0.4)"
                                          }}
                                        >
                                          {nivel.value}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Resumen de los 4 bimestres: solo en la pestaña "Nota final", en
                              formato 2x2, para que el docente vea de un vistazo lo que ya
                              registró antes de decidir la nota de cierre. */}
                          {periodoActivo === "GENERAL" && (
                            <div className="grid gap-1.5 rounded-[12px] border border-dashed border-monserrat-ink/15 bg-white/60 p-3">
                              <p className="text-[11px] font-black uppercase tracking-wide text-monserrat-ink/45">Por bimestre</p>
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {BIMESTRES.map((periodo) => {
                                  const bimResolved = resolveDraft(periodo, competencia.id);
                                  const bimInfo = nivelInfo(bimResolved.nivel);
                                  return (
                                    <div
                                      key={periodo}
                                      title={bimResolved.descripcion || undefined}
                                      className="flex items-center justify-between gap-2 rounded-[10px] border border-monserrat-ink/10 bg-[#f2f2f1] px-2.5 py-1.5"
                                    >
                                      <span className="text-[10px] font-black uppercase tracking-wide text-monserrat-ink/40">
                                        {labelFromEnum(periodo).replace("Bimestre ", "B")}
                                      </span>
                                      <span
                                        className="text-sm font-black"
                                        style={{ color: bimInfo ? bimInfo.color : "rgb(31 27 24 / 0.25)" }}
                                      >
                                        {bimResolved.nivel || "—"}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="grid gap-2">
                          <p className="text-[11px] font-black uppercase tracking-wide text-monserrat-ink/45">
                            {periodoActivo === "GENERAL" ? "NL al finalizar el período lectivo" : "NL del bimestre"}
                          </p>

                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {NIVELES.map((nivel) => {
                              const active = resolved.nivel === nivel.value;
                              return (
                                <button
                                  key={nivel.value}
                                  type="button"
                                  onClick={() => updateNivel(periodoActivo, competencia.id, nivel.value)}
                                  className="rounded-[12px] border-2 px-3 py-2 text-left transition-all"
                                  style={{
                                    borderColor: active ? nivel.color : "rgb(31 27 24 / 0.1)",
                                    backgroundColor: active ? nivel.soft : "white"
                                  }}
                                >
                                  <span className="flex items-center gap-1.5 text-sm font-black" style={{ color: active ? nivel.color : "#1f1b18" }}>
                                    {nivel.label}
                                    {active && <Check size={13} />}
                                  </span>
                                  <span className="block text-[11px] font-semibold text-monserrat-ink/50">{nivel.description}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* La "Conclusión descriptiva" (comentario) solo existe por bimestre
                              en el acta; la columna final no lleva comentario propio. */}
                          {periodoActivo !== "GENERAL" &&
                            (comentarioAbierto ? (
                              <textarea
                                value={resolved.descripcion}
                                onChange={(event) => updateDescripcion(periodoActivo, competencia.id, event.target.value)}
                                className="admin-input min-h-16"
                                placeholder="Conclusión descriptiva (opcional)"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => setOpenComentario((current) => ({ ...current, [key]: true }))}
                                className="inline-flex items-center gap-1.5 justify-self-start text-xs font-black text-monserrat-ink/45 hover:text-monserrat-ink/70"
                              >
                                <MessageSquarePlus size={13} />
                                Añadir comentario
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {!selectedCurso && cursosDisponibles.length > 0 && <EmptyHint text="Elige un curso para empezar." />}
              {selectedCurso && !selectedNivelAcademico && <EmptyHint text="Elige un nivel académico para ver a tus alumnos." />}
              {selectedNivelAcademico && !selectedAlumnoDni && <EmptyHint text="Selecciona un alumno para registrar sus notas." />}
              {selectedAlumnoDni && competenciasDelCurso.length === 0 && (
                <EmptyHint text="Este curso todavía no tiene competencias vinculadas por el área académica." />
              )}
            </>
          )}
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-[12px] border border-black/12 px-4 py-3 text-sm font-black text-monserrat-ink ${
            toast.kind === "ok" ? "bg-[#e3e3e1]" : "bg-[#e9e9e8]"
          }`}
        >
          {toast.kind === "ok" ? <Sparkles size={15} /> : <ChevronRight size={15} />}
          {toast.text}
        </div>
      )}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-[18px] border border-dashed border-monserrat-ink/15 bg-white p-6 text-center text-sm font-semibold text-monserrat-ink/50">
      {text}
    </div>
  );
}

export default DocenteNotas;
