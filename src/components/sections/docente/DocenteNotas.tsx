import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Search, Sparkles, X } from "lucide-react";
import { SectionHeader } from "../../ui/SectionHeader";
import { monserratApi } from "../../../api/monserrat";
import type { AsignacionAcademica, UsuarioAcademico, NotaAcademica, LoginResponse } from "../../../types";
import { getGruposPorGrado, GRUPO_LABELS, normalizeDocentesPorCompetencia, tieneAccesoCompetencia, type AcademicoConfig, type CatalogItem } from "../admin/adminShared";

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

function truncar(texto: string, max: number) {
  return texto.length > max ? `${texto.slice(0, max).trimEnd()}...` : texto;
}

function labelFromEnum(value?: string | null) {
  if (!value) return "";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
  const [selectedGradoAcademico, setSelectedGradoAcademico] = useState("");
  const [selectedGrupo, setSelectedGrupo] = useState("");
  const [selectedAlumnoDni, setSelectedAlumnoDni] = useState("");
  const [alumnoQuery, setAlumnoQuery] = useState("");
  const [activePeriodo, setActivePeriodo] = useState<Periodo>(BIMESTRES[0]);
  const [toast, setToast] = useState<{ text: string; kind: "ok" | "error" } | null>(null);
  const [drafts, setDrafts] = useState<NotaDrafts>({});
  const [autoSaveState, setAutoSaveState] = useState<Record<string, "idle" | "saving" | "saved" | "error">>({});
  // Ya no hay una celda de comentario/parciales por fila: todo el detalle de una
  // competencia (para un alumno + periodo) vive en este modal, que reemplaza a las
  // 3-5 columnas por competencia que hacían la tabla horizontalmente ilegible.
  const [modalCtx, setModalCtx] = useState<{ alumnoDni: string; competenciaId: string } | null>(null);

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

  // Cerrar el modal con Escape, como cualquier modal estándar.
  useEffect(() => {
    if (!modalCtx) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalCtx(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalCtx]);

  function showToast(text: string, kind: "ok" | "error" = "ok") {
    setToast({ text, kind });
  }

  const cursosDisponibles = useMemo(() => Array.from(new Set(asignaciones.map((a) => a.curso))).filter(Boolean), [asignaciones]);

  // Grados donde el docente realmente tiene asignaciones para el curso elegido
  // (sin pasar por el catalogo decorativo de "nivel academico").
  const gradosDelCurso = useMemo(() => {
    if (!selectedCurso) return [] as string[];
    return Array.from(
      new Set(asignaciones.filter((a) => a.curso === selectedCurso && a.grado).map((a) => a.grado as string))
    );
  }, [selectedCurso, asignaciones]);

  useEffect(() => {
    if (gradosDelCurso.length > 0) {
      const stillValid = gradosDelCurso.includes(selectedGradoAcademico);
      if (!stillValid) setSelectedGradoAcademico(gradosDelCurso[0]);
    } else {
      setSelectedGradoAcademico("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradosDelCurso]);

  // Grupo (Ciclado I/II, Anual, Letras, Ciencias): solo aplica a los grados que
  // realmente lo tienen; para el resto no se muestra ningun selector adicional.
  const gruposDelGrado = useMemo(() => getGruposPorGrado(selectedGradoAcademico), [selectedGradoAcademico]);

  useEffect(() => {
    if (gruposDelGrado.length === 0) {
      if (selectedGrupo !== "") setSelectedGrupo("");
      return;
    }
    if (!gruposDelGrado.includes(selectedGrupo)) setSelectedGrupo(gruposDelGrado[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gruposDelGrado]);

  const alumnosFiltrados = useMemo(() => {
    if (!selectedCurso || !selectedGradoAcademico) return [] as UsuarioAcademico[];
    return alumnos.filter(
      (al) =>
        (gruposDelGrado.length === 0 || al.seccion === selectedGrupo) &&
        asignaciones.some((a) => a.alumnoDni === al.dni && a.curso === selectedCurso && a.grado === selectedGradoAcademico)
    );
  }, [selectedCurso, selectedGradoAcademico, gruposDelGrado, selectedGrupo, alumnos, asignaciones]);

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

  const docenteDni = useMemo(() => {
    const sessionStr = window.localStorage.getItem("monserrat_academic_session");
    return sessionStr ? (JSON.parse(sessionStr) as LoginResponse).username : "";
  }, []);

  const competenciasDelCurso = useMemo(() => {
    if (!selectedCurso || !selectedGradoAcademico || !academicoConfig) return [] as CatalogItem[];
    const map = new Map<string, CatalogItem>();
    const alumnosBase = alumnosFiltrados.length > 0 ? alumnosFiltrados : alumnos;

    alumnosBase.forEach((alumno) => {
      const esSecundaria = alumno.nivelEducativo === "SECUNDARIA" || (alumno.grado ?? "").endsWith("_SECUNDARIA");
      const competenciasPorCurso = esSecundaria
        ? academicoConfig.competenciasPorCursoSecundaria ?? {}
        : academicoConfig.competenciasPorCursoPrimaria ?? {};
      const competenciasDisponibles = esSecundaria
        ? academicoConfig.competenciasSecundaria ?? []
        : academicoConfig.competenciasPrimaria ?? [];
      const mappingRaw = esSecundaria
        ? academicoConfig.docentesPorCompetenciaSecundaria
        : academicoConfig.docentesPorCompetencia;
      const mapping = normalizeDocentesPorCompetencia(mappingRaw as any);
      const ids = competenciasPorCurso[selectedCurso] ?? [];

      competenciasDisponibles
        .filter((competencia) => ids.includes(competencia.id))
        .filter((competencia) =>
          tieneAccesoCompetencia(mapping, alumno.grado, alumno.seccion, selectedCurso, competencia.id, docenteDni)
        )
        .forEach((competencia) => map.set(competencia.id, competencia));
    });

    return Array.from(map.values());
  }, [academicoConfig, selectedCurso, selectedGradoAcademico, alumnosFiltrados, alumnos, docenteDni]);

  const numeroCompetencia = (competenciaId: string) => {
    if (!selectedCurso || !academicoConfig) return competenciasDelCurso.findIndex((c) => c.id === competenciaId) + 1;
    const alumnoBase = alumnosFiltrados[0] ?? alumnos[0];
    const esSecundaria = alumnoBase?.nivelEducativo === "SECUNDARIA" || (alumnoBase?.grado ?? "").endsWith("_SECUNDARIA");
    const competenciasPorCurso = esSecundaria
      ? academicoConfig.competenciasPorCursoSecundaria ?? {}
      : academicoConfig.competenciasPorCursoPrimaria ?? {};
    const ids = competenciasPorCurso[selectedCurso] ?? [];
    const index = ids.indexOf(competenciaId);
    return index >= 0 ? index + 1 : competenciasDelCurso.findIndex((c) => c.id === competenciaId) + 1;
  };

  const puedeCalificarCompetenciaAlumno = (alumno: UsuarioAcademico, competenciaId: string) => {
    if (!selectedCurso || !academicoConfig) return false;
    const esSecundaria = alumno.nivelEducativo === "SECUNDARIA" || (alumno.grado ?? "").endsWith("_SECUNDARIA");
    const competenciasPorCurso = esSecundaria
      ? academicoConfig.competenciasPorCursoSecundaria ?? {}
      : academicoConfig.competenciasPorCursoPrimaria ?? {};
    const ids = competenciasPorCurso[selectedCurso] ?? [];
    if (!ids.includes(competenciaId)) return false;

    const mappingRaw = esSecundaria
      ? academicoConfig.docentesPorCompetenciaSecundaria
      : academicoConfig.docentesPorCompetencia;
    const mapping = normalizeDocentesPorCompetencia(mappingRaw as any);
    return tieneAccesoCompetencia(mapping, alumno.grado, alumno.seccion, selectedCurso, competenciaId, docenteDni);
  };

  const periodoActivo = activePeriodo;

  // Promedio de las notas finales de bimestre YA GUARDADAS para una competencia,
  // usado como sugerencia de la nota "General".
  const promedioBimestral = (competenciaId: string, alumnoDni = selectedAlumnoDni) => {
    const relevantes = notas.filter(
      (n) => (BIMESTRES as readonly string[]).includes(n.periodo) && n.competenciaId === competenciaId && n.valor
        && n.alumnoDni === alumnoDni && n.curso === selectedCurso
    );
    if (relevantes.length === 0) return { nivel: "", detalle: [] as { periodo: string; nivel: string }[] };
    const detalle = relevantes
      .slice()
      .sort((a, b) => BIMESTRES.indexOf(a.periodo as (typeof BIMESTRES)[number]) - BIMESTRES.indexOf(b.periodo as (typeof BIMESTRES)[number]))
      .map((n) => ({ periodo: n.periodo, nivel: nivelDesdeValor(n.valor) }));
    const promedio = relevantes.reduce((sum, n) => sum + n.valor, 0) / relevantes.length;
    return { nivel: nivelDesdeValor(Math.round(promedio)), detalle };
  };

  // Progreso general del alumno: 4 bimestres + la nota final del período lectivo, por competencia.
  const progresoPorAlumno = useMemo(() => {
    const map = new Map<string, { done: number; total: number }>();
    if (!selectedCurso || !academicoConfig) return map;

    alumnosFiltrados.forEach((al) => {
      const esSec = al.nivelEducativo === "SECUNDARIA" || (al.grado ?? "").endsWith("_SECUNDARIA");
      const compsPorCurso = esSec
        ? academicoConfig.competenciasPorCursoSecundaria ?? {}
        : academicoConfig.competenciasPorCursoPrimaria ?? {};
      const compsDisponibles = esSec
        ? academicoConfig.competenciasSecundaria ?? []
        : academicoConfig.competenciasPrimaria ?? [];
      const mappingRaw = esSec
        ? academicoConfig.docentesPorCompetenciaSecundaria
        : academicoConfig.docentesPorCompetencia;
      const mapping = normalizeDocentesPorCompetencia(mappingRaw as any);
      const ids = compsPorCurso[selectedCurso] ?? [];
      const compsDelAlumno = compsDisponibles.filter(
        (c) => ids.includes(c.id) && tieneAccesoCompetencia(mapping, al.grado, al.seccion, selectedCurso, c.id, docenteDni)
      );

      const total = compsDelAlumno.length * PERIODOS.length;
      const done = total === 0 ? 0 : notas.filter(
        (n) =>
          n.alumnoDni === al.dni &&
          n.curso === selectedCurso &&
          (PERIODOS as readonly string[]).includes(n.periodo) &&
          compsDelAlumno.some((c) => c.id === n.competenciaId) &&
          n.valor
      ).length;
      map.set(al.dni, { done, total });
    });
    return map;
  }, [alumnosFiltrados, notas, selectedCurso, academicoConfig, docenteDni]);

  const getNotaKey = (periodo: string, competenciaId: string, alumnoDni = selectedAlumnoDni) =>
    `${alumnoDni}||${selectedCurso}||${periodo}||${competenciaId}`;

  // Única fuente de verdad para leer el estado "efectivo" (borrador > guardado > sugerido)
  // de una competencia+periodo, usada tanto para pintar la UI como para guardar.
  const resolveDraft = (periodo: string, competenciaId: string, alumnoDni = selectedAlumnoDni) => {
    const existing = notas.find(
      (nota) => nota.alumnoDni === alumnoDni && nota.curso === selectedCurso && nota.periodo === periodo && nota.competenciaId === competenciaId
    );
    const decoded = decodeObservacion(existing?.observacion);
    const key = getNotaKey(periodo, competenciaId, alumnoDni);
    const draft = drafts[key];

    const sugerencia = periodo === "GENERAL" ? promedioBimestral(competenciaId, alumnoDni) : { nivel: "", detalle: [] as { periodo: string; nivel: string }[] };
    const nivelGuardado = nivelDesdeValor(existing?.valor);

    return {
      nivel: draft?.nivel || nivelGuardado || sugerencia.nivel,
      descripcion: draft?.descripcion ?? decoded.comentario,
      parciales: draft?.parciales ?? decoded.parciales,
      isSugerido: periodo === "GENERAL" && !draft?.nivel && !nivelGuardado && Boolean(sugerencia.nivel),
      sugerenciaDetalle: sugerencia.detalle
    };
  };

  const persistDraft = async (periodo: string, competenciaId: string, draftValue?: NotaDraftValue, alumnoDni = selectedAlumnoDni): Promise<boolean> => {
    if (!alumnoDni || !selectedCurso || !token) return false;

    const resolved = draftValue ?? resolveDraft(periodo, competenciaId, alumnoDni);
    if (!resolved.nivel) return false;

    const key = getNotaKey(periodo, competenciaId, alumnoDni);
    setAutoSaveState((current) => ({ ...current, [key]: "saving" }));

    try {
      const valor = valorDesdeNivel(resolved.nivel);
      const observacion = periodo === "GENERAL"
        ? (resolved.descripcion ?? "")
        : encodeObservacion(resolved.parciales ?? [], resolved.descripcion ?? "");
      const existing = notas.find(
        (nota) => nota.alumnoDni === alumnoDni && nota.curso === selectedCurso && nota.periodo === periodo && nota.competenciaId === competenciaId
      );

      const saved = existing
        ? await monserratApi.updateNota(
            existing.id,
            {
              alumnoDni,
              curso: selectedCurso,
              periodo,
              tipoEvaluacion: existing.tipoEvaluacion ?? "EXAMEN",
              valor,
              observacion,
              competenciaId
            },
            token
          )
        : await monserratApi.createNota(
            {
              alumnoDni,
              curso: selectedCurso,
              periodo,
              tipoEvaluacion: "EXAMEN",
              valor,
              observacion,
              competenciaId
            },
            token
          );

      setNotas((current) => {
        const exists = current.some((nota) => nota.id === saved.id);
        if (exists) {
          return current.map((nota) => (nota.id === saved.id ? saved : nota));
        }
        return [...current, saved];
      });
      setAutoSaveState((current) => ({ ...current, [key]: "saved" }));
      return true;
    } catch (error) {
      setAutoSaveState((current) => ({ ...current, [key]: "error" }));
      showToast(error instanceof Error ? error.message : "No se pudo guardar la nota.", "error");
      return false;
    }
  };

  // Ya no se guarda solo al escribir/seleccionar: estas funciones solo actualizan
  // el borrador en memoria. El guardado real ocurre al presionar "Guardar" (ver
  // guardarNota más abajo), como pidió el usuario.
  const updateNivel = (periodo: string, competenciaId: string, nivel: string, alumnoDni = selectedAlumnoDni) => {
    const key = getNotaKey(periodo, competenciaId, alumnoDni);
    const nextDraft = { ...(drafts[key] ?? {}), nivel };
    setDrafts((current) => ({ ...current, [key]: nextDraft }));
    setAutoSaveState((current) => ({ ...current, [key]: "idle" }));
  };

  const updateDescripcion = (periodo: string, competenciaId: string, descripcion: string, alumnoDni = selectedAlumnoDni) => {
    const key = getNotaKey(periodo, competenciaId, alumnoDni);
    const nextDraft = { ...(drafts[key] ?? {}), descripcion };
    setDrafts((current) => ({ ...current, [key]: nextDraft }));
    setAutoSaveState((current) => ({ ...current, [key]: "idle" }));
  };

  const addParcial = (periodo: string, competenciaId: string, alumnoDni = selectedAlumnoDni) => {
    const key = getNotaKey(periodo, competenciaId, alumnoDni);
    const actuales = resolveDraft(periodo, competenciaId, alumnoDni).parciales;
    const next = [...actuales, { id: makeParcialId(), label: `Nota parcial ${actuales.length + 1}`, nivel: "" }];
    const nextDraft = { ...(drafts[key] ?? {}), parciales: next };
    setDrafts((current) => ({ ...current, [key]: nextDraft }));
    setAutoSaveState((current) => ({ ...current, [key]: "idle" }));
  };

  const updateParcial = (periodo: string, competenciaId: string, parcialId: string, field: "label" | "nivel", value: string, alumnoDni = selectedAlumnoDni) => {
    const key = getNotaKey(periodo, competenciaId, alumnoDni);
    const actuales = resolveDraft(periodo, competenciaId, alumnoDni).parciales;
    const next = actuales.map((p) => (p.id === parcialId ? { ...p, [field]: value } : p));
    const nextDraft = { ...(drafts[key] ?? {}), parciales: next };
    setDrafts((current) => ({ ...current, [key]: nextDraft }));
    setAutoSaveState((current) => ({ ...current, [key]: "idle" }));
  };

  const removeParcial = (periodo: string, competenciaId: string, parcialId: string, alumnoDni = selectedAlumnoDni) => {
    const key = getNotaKey(periodo, competenciaId, alumnoDni);
    const actuales = resolveDraft(periodo, competenciaId, alumnoDni).parciales;
    const next = actuales.filter((p) => p.id !== parcialId);
    const nextDraft = { ...(drafts[key] ?? {}), parciales: next };
    setDrafts((current) => ({ ...current, [key]: nextDraft }));
    setAutoSaveState((current) => ({ ...current, [key]: "idle" }));
  };

  // Guarda de verdad, solo cuando el docente hace clic en "Guardar".
  const guardarNota = async (periodo: string, competenciaId: string, alumnoDni = selectedAlumnoDni) => {
    return persistDraft(periodo, competenciaId, undefined, alumnoDni);
  };

  // Borra la nota YA GUARDADA (no solo el borrador en memoria). Antes solo se
  // podia sobreescribir el nivel; esto permite dejar la celda vacia de nuevo.
  const eliminarNotaGuardada = async (periodo: string, competenciaId: string, alumnoDni = selectedAlumnoDni): Promise<boolean> => {
    const existing = notas.find(
      (nota) => nota.alumnoDni === alumnoDni && nota.curso === selectedCurso && nota.periodo === periodo && nota.competenciaId === competenciaId
    );
    if (!existing) return false;

    try {
      await monserratApi.deleteNota(existing.id, token);
      setNotas((current) => current.filter((n) => n.id !== existing.id));
      const key = getNotaKey(periodo, competenciaId, alumnoDni);
      setDrafts((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      setAutoSaveState((current) => ({ ...current, [key]: "idle" }));
      showToast("Nota borrada");
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo borrar la nota.", "error");
      return false;
    }
  };

  const puedeCalificar = Boolean(selectedCurso && selectedGradoAcademico && alumnosVisibles.length > 0 && competenciasDelCurso.length > 0);

  const modalAlumno = modalCtx ? alumnos.find((al) => al.dni === modalCtx.alumnoDni) : undefined;
  const modalCompetencia = modalCtx ? competenciasDelCurso.find((c) => c.id === modalCtx.competenciaId) : undefined;
  const modalResolved = modalCtx ? resolveDraft(periodoActivo, modalCtx.competenciaId, modalCtx.alumnoDni) : null;
  const modalKey = modalCtx ? getNotaKey(periodoActivo, modalCtx.competenciaId, modalCtx.alumnoDni) : "";
  const modalTieneGuardada = modalCtx
    ? notas.some(
        (nota) =>
          nota.alumnoDni === modalCtx.alumnoDni &&
          nota.curso === selectedCurso &&
          nota.periodo === periodoActivo &&
          nota.competenciaId === modalCtx.competenciaId
      )
    : false;

  return (
    <div className="grid gap-4">
      <SectionHeader
        title="Notas del docente"
        description="Registra notas por competencias según los bimestres del año escolar y una nota general por estudiante."
        align="left"
      />

      <div className="grid gap-3 rounded-[10px] border border-[#9ebfe1] bg-white p-3">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_260px]">
          <label className="grid gap-1 text-[11px] font-black uppercase text-monserrat-ink/55">
            Curso
            <AcademicoSelect
              value={selectedCurso}
              onChange={(value) => {
                setSelectedCurso(value);
                setSelectedGradoAcademico("");
              }}
              placeholder="Seleccionar curso"
              options={cursosDisponibles.map((curso) => ({ value: curso, label: labelFromEnum(curso) }))}
            />
          </label>

          <label className="grid gap-1 text-[11px] font-black uppercase text-monserrat-ink/55">
            Grado
            <AcademicoSelect
              value={selectedGradoAcademico}
              onChange={setSelectedGradoAcademico}
              placeholder="Seleccionar grado"
              disabled={!selectedCurso || gradosDelCurso.length <= 1}
              options={gradosDelCurso.map((grado) => ({ value: grado, label: labelFromEnum(grado) }))}
            />
          </label>

          <label className="grid gap-1 text-[11px] font-black uppercase text-monserrat-ink/55">
            Grupo
            <AcademicoSelect
              value={selectedGrupo}
              onChange={setSelectedGrupo}
              placeholder={gruposDelGrado.length > 0 ? "Seleccionar grupo" : "No aplica"}
              disabled={gruposDelGrado.length === 0}
              options={gruposDelGrado.map((grupo) => ({ value: grupo, label: GRUPO_LABELS[grupo] ?? grupo }))}
            />
          </label>

          <label className="grid gap-1 text-[11px] font-black uppercase text-monserrat-ink/55">
            Alumno
            <span className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-monserrat-ink/35" />
              <input
                value={alumnoQuery}
                onChange={(e) => setAlumnoQuery(e.target.value)}
                placeholder="Buscar nombre o DNI"
                className="w-full rounded-[8px] border border-[#d6e4f2] bg-white py-2 pl-8 pr-3 text-sm font-semibold normal-case text-monserrat-ink shadow-sm outline-none transition-all duration-150 hover:border-[#9ebfe1] focus:border-[#2f7fce] focus:shadow-md focus:ring-2 focus:ring-[#2f7fce]/15"
              />
            </span>
          </label>
        </div>
      </div>

      <div className="grid gap-4">
          {puedeCalificar ? (
            <div className="grid gap-3 rounded-[10px] border border-[#9ebfe1] bg-white p-3">
              <div className="">

                <div className="grid gap-1 text-center text-sm text-monserrat-ink sm:grid-cols-3">
                </div>
              </div>

              <div className="flex items-stretch gap-1 overflow-x-auto rounded-[4px] border border-[#b7d0ea] bg-[#e7f0fa] p-1">
                {BIMESTRES.map((periodo) => (
                  <button
                    key={periodo}
                    type="button"
                    onClick={() => setActivePeriodo(periodo)}
                    className={`flex-1 whitespace-nowrap rounded-[3px] px-3 py-1.5 text-[11px] font-black transition-all ${
                      activePeriodo === periodo ? "bg-white text-[#2f7fce]" : "text-monserrat-ink/60 hover:bg-white/60"
                    }`}
                  >
                    {labelFromEnum(periodo)}
                  </button>
                ))}
                <div className="w-px flex-none self-stretch bg-[#b7d0ea]" />
                <button
                  type="button"
                  onClick={() => setActivePeriodo("GENERAL")}
                  className={`flex-1 whitespace-nowrap rounded-[3px] px-3 py-1.5 text-[11px] font-black transition-all ${
                    activePeriodo === "GENERAL" ? "bg-[#8fbe7b] text-white" : "text-[#4f7d3f] hover:bg-white/60"
                  }`}
                >
                  Nota final
                </button>
              </div>

              <p className="text-[10px] font-semibold text-monserrat-ink/40">
                Haz clic en una celda para ver y editar parciales, comentario y (en Nota final) el detalle por bimestre.
              </p>

              {/* Cada competencia ahora ocupa una sola columna: la celda muestra el
                  nivel + indicadores, y el detalle completo vive en el modal. Esto
                  evita el scroll horizontal interminable que había con 3-5 columnas
                  por competencia. */}
              <div className="admin-table-scroll overflow-auto rounded-[6px] border border-[#9ebfe1] bg-white">
                <table className="min-w-full border-collapse text-[11px] leading-tight text-monserrat-ink">
                  <thead>
                    <tr>
                      <th rowSpan={2} className="sticky left-0 z-30 w-10 border border-[#9ebfe1] bg-[#dcebfa] px-2 py-2 font-semibold">N</th>
                      <th rowSpan={2} className="sticky left-10 z-30 w-20 border border-[#9ebfe1] bg-[#dcebfa] px-2 py-2 font-semibold">Nivel</th>
                      <th rowSpan={2} className="sticky left-[120px] z-30 w-32 border border-[#9ebfe1] bg-[#dcebfa] px-2 py-2 font-semibold">Grado</th>
                      <th rowSpan={2} className="sticky left-[248px] z-30 w-56 border border-[#9ebfe1] bg-[#dcebfa] px-2 py-2 font-semibold">Apellidos y Nombres</th>
                      {competenciasDelCurso.map((competencia) => (
                        <th
                          key={competencia.id}
                          className="w-44 border border-[#9ebfe1] bg-[#dcebfa] px-2 py-1.5 text-center font-black uppercase text-[#2f7fce]"
                        >
                          Competencia {numeroCompetencia(competencia.id)}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {competenciasDelCurso.map((competencia) => (
                        <th
                          key={competencia.id}
                          className="w-44 whitespace-normal border border-[#9ebfe1] bg-[#f6fbff] px-2 py-1.5 text-[10px] font-semibold normal-case leading-snug text-monserrat-ink/70"
                        >
                          {competencia.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {alumnosVisibles.map((alumno, rowIndex) => {
                      const activeRow = alumno.dni === selectedAlumnoDni;
                      return (
                        <tr key={alumno.dni} className={activeRow ? "bg-[#f7fbff]" : "odd:bg-white even:bg-[#fbfdff]"}>
                          <td className="sticky left-0 z-20 border border-[#b7d0ea] bg-inherit px-2 py-1 text-center text-[#4c6074]">{rowIndex + 1}</td>
                          <td className="sticky left-10 z-20 border border-[#b7d0ea] bg-inherit px-2 py-1 text-center text-[#4c6074]">
                            {labelFromEnum(alumno.nivelEducativo)}
                          </td>
                          <td className="sticky left-[120px] z-20 border border-[#b7d0ea] bg-inherit px-2 py-1 text-center text-[#4c6074]">
                            {labelFromEnum(alumno.grado ?? "")}
                          </td>
                          <td className="sticky left-[248px] z-20 border border-[#b7d0ea] bg-inherit px-2 py-1">
                            <button
                              type="button"
                              onClick={() => setSelectedAlumnoDni(alumno.dni)}
                              className="block w-full truncate text-left font-semibold uppercase text-[#4c6074] hover:text-[#2f7fce]"
                              title={alumno.nombre}
                            >
                              {alumno.nombre}
                            </button>
                          </td>
                          {competenciasDelCurso.map((competencia) => {
                            const habilitada = puedeCalificarCompetenciaAlumno(alumno, competencia.id);
                            if (!habilitada) {
                              return (
                                <td
                                  key={competencia.id}
                                  className="border border-[#b7d0ea] bg-[#f6f8fa] px-2 py-2 text-center text-[10px] font-semibold text-monserrat-ink/35"
                                >
                                  No asignada
                                </td>
                              );
                            }

                            const resolved = resolveDraft(periodoActivo, competencia.id, alumno.dni);
                            const info = nivelInfo(resolved.nivel);
                            const key = getNotaKey(periodoActivo, competencia.id, alumno.dni);

                            const tieneNota = Boolean(resolved.nivel);

                            return (
                              <td key={competencia.id} className="border border-[#b7d0ea] px-1.5 py-1.5 text-center align-top">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAlumnoDni(alumno.dni);
                                    setModalCtx({ alumnoDni: alumno.dni, competenciaId: competencia.id });
                                  }}
                                  className={`group relative flex w-full cursor-pointer flex-col items-center gap-0.5 rounded-[8px] px-2 py-1.5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
                                    tieneNota ? "border-2" : "border-2 border-dashed"
                                  }`}
                                  style={{
                                    borderColor: info ? info.color : "#b7cfe8",
                                    backgroundColor: info ? info.soft : "#f7fbff"
                                  }}
                                >
                                  {tieneNota ? (
                                    <span className="text-base font-black" style={{ color: info?.color }}>
                                      {resolved.nivel}
                                    </span>
                                  ) : (
                                    <Plus size={14} className="text-[#8fb2da] transition-colors group-hover:text-[#2f7fce]" />
                                  )}
                                  {periodoActivo !== "GENERAL" && (resolved.parciales.length > 0 || autoSaveState[key] === "saving") && (
                                    <span className="flex h-3 items-center gap-1 text-[9px] font-bold text-monserrat-ink/40">
                                      {resolved.parciales.length > 0 && <span>{resolved.parciales.length}p</span>}
                                      {autoSaveState[key] === "saving" && <span>guardando</span>}
                                    </span>
                                  )}
                                  {resolved.descripcion && (
                                    <span
                                      className={`w-full text-[9px] font-semibold normal-case leading-snug text-monserrat-ink/55 ${
                                        periodoActivo === "GENERAL" ? "" : "line-clamp-2"
                                      }`}
                                      title={resolved.descripcion}
                                    >
                                      {periodoActivo === "GENERAL" ? truncar(resolved.descripcion, 30) : resolved.descripcion}
                                    </span>
                                  )}

                                  {/* Tooltip: en Nota final, en vez de 4 columnas fijas por bimestre,
                                      el desglose aparece al pasar el cursor. */}
                                  {periodoActivo === "GENERAL" && resolved.sugerenciaDetalle.length > 0 && (
                                    <span className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-1.5 hidden -translate-x-1/2 gap-2 whitespace-nowrap rounded-[6px] border border-[#e2ecf7] bg-white px-2 py-1 text-[10px] font-bold text-monserrat-ink shadow-lg group-hover:flex">
                                      {resolved.sugerenciaDetalle.map((d) => (
                                        <span key={d.periodo}>
                                          {labelFromEnum(d.periodo).replace("Bimestre ", "B")}:{" "}
                                          <span style={{ color: nivelInfo(d.nivel)?.color }}>{d.nivel || "-"}</span>
                                        </span>
                                      ))}
                                    </span>
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <>
              {!selectedCurso && cursosDisponibles.length > 0 && <EmptyHint text="Elige un curso para empezar." />}
              {cursosDisponibles.length === 0 && <EmptyHint text="Aun no tienes cursos asignados." />}
              {selectedCurso && !selectedGradoAcademico && <EmptyHint text="Elige un grado para ver a tus alumnos." />}
              {selectedCurso && selectedGradoAcademico && gruposDelGrado.length > 0 && !selectedGrupo && <EmptyHint text="Elige un grupo para evitar mezclar competencias de distintos grupos." />}
              {selectedCurso && selectedGradoAcademico && (gruposDelGrado.length === 0 || selectedGrupo) && alumnosVisibles.length === 0 && <EmptyHint text="No se encontraron alumnos para los filtros seleccionados." />}
              {selectedCurso && selectedGradoAcademico && (gruposDelGrado.length === 0 || selectedGrupo) && alumnosVisibles.length > 0 && competenciasDelCurso.length === 0 && (
                <EmptyHint text="Este curso todavía no tiene competencias vinculadas por el área académica." />
              )}
            </>
          )}
      </div>

      {modalCtx && modalAlumno && modalCompetencia && modalResolved && (
        <NotaModal
          alumno={modalAlumno}
          competencia={modalCompetencia}
          periodo={periodoActivo}
          resolved={modalResolved}
          autoSaveStatus={autoSaveState[modalKey] ?? "idle"}
          onNivel={(nivel) => updateNivel(periodoActivo, modalCtx.competenciaId, nivel, modalCtx.alumnoDni)}
          onDescripcion={(descripcion) => updateDescripcion(periodoActivo, modalCtx.competenciaId, descripcion, modalCtx.alumnoDni)}
          onAddParcial={() => addParcial(periodoActivo, modalCtx.competenciaId, modalCtx.alumnoDni)}
          onUpdateParcial={(parcialId, field, value) => updateParcial(periodoActivo, modalCtx.competenciaId, parcialId, field, value, modalCtx.alumnoDni)}
          onRemoveParcial={(parcialId) => removeParcial(periodoActivo, modalCtx.competenciaId, parcialId, modalCtx.alumnoDni)}
          onGuardar={async () => {
            const ok = await guardarNota(periodoActivo, modalCtx.competenciaId, modalCtx.alumnoDni);
            if (ok) setModalCtx(null);
          }}
          onEliminar={
            modalTieneGuardada
              ? async () => {
                  const ok = await eliminarNotaGuardada(periodoActivo, modalCtx.competenciaId, modalCtx.alumnoDni);
                  if (ok) setModalCtx(null);
                }
              : undefined
          }
          onClose={() => setModalCtx(null)}
        />
      )}

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

// Combobox propio para Curso / Nivel académico: borde suave en reposo, azul
// claro en hover, azul + anillo al abrir, panel separado con sombra, e ítem
// seleccionado con acento a la izquierda en vez de fondo plano.
function AcademicoSelect({
  value,
  onChange,
  options,
  placeholder = "Seleccionar",
  disabled = false
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-2 rounded-[8px] border bg-white px-3 py-2 text-sm font-semibold normal-case text-monserrat-ink shadow-sm transition-all duration-150 ${
          disabled
            ? "cursor-not-allowed border-[#e2e8f0] bg-[#f2f2f1] text-monserrat-ink/40"
            : open
            ? "border-[#2f7fce] shadow-md ring-2 ring-[#2f7fce]/15"
            : "border-[#d6e4f2] hover:border-[#9ebfe1] hover:shadow-md"
        }`}
      >
        <span className={selected ? "" : "text-monserrat-ink/40"}>{selected ? selected.label : placeholder}</span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-monserrat-ink/35 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && !disabled && (
        <div className="absolute left-0 right-0 z-40 mt-1.5 max-h-64 overflow-y-auto rounded-[10px] border border-[#e2ecf7] bg-white p-1.5 shadow-lg">
          {options.length === 0 && (
            <p className="px-3 py-2 text-xs font-semibold text-monserrat-ink/40">Sin opciones</p>
          )}
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`block w-full rounded-[6px] border-l-[3px] px-2.5 py-1.5 text-left text-sm font-semibold normal-case transition-colors ${
                  active
                    ? "border-l-[#2f7fce] bg-[#eaf3fc] text-[#2f7fce]"
                    : "border-l-transparent text-monserrat-ink/75 hover:bg-[#f2f8fd] hover:text-[#2f7fce]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NivelPicker({
  value,
  onChange,
  compact = false
}: {
  value: string;
  onChange: (nivel: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={`grid grid-cols-4 ${compact ? "gap-0.5" : "gap-1"}`}>
      {NIVELES.map((nivel) => {
        const active = value === nivel.value;
        return (
          <button
            key={nivel.value}
            type="button"
            title={nivel.description}
            onClick={() => onChange(nivel.value)}
            className={`border text-center font-black transition-all ${compact ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-1 text-[11px]"}`}
            style={{
              borderColor: active ? nivel.color : "#b7d0ea",
              backgroundColor: active ? nivel.soft : "#ffffff",
              color: active ? nivel.color : "rgb(31 27 24 / 0.42)"
            }}
          >
            {nivel.label}
          </button>
        );
      })}
    </div>
  );
}

// Modal que concentra todo el detalle de una competencia (nivel, parciales,
// comentario y, en "Nota final", el desglose por bimestre) para un alumno y un
// periodo. Reemplaza las columnas de Parciales/Promedio/Comentario que antes
// vivían siempre visibles en la tabla.
function NotaModal({
  alumno,
  competencia,
  periodo,
  resolved,
  autoSaveStatus,
  onNivel,
  onDescripcion,
  onAddParcial,
  onUpdateParcial,
  onRemoveParcial,
  onGuardar,
  onEliminar,
  onClose
}: {
  alumno: UsuarioAcademico;
  competencia: CatalogItem;
  periodo: Periodo;
  resolved: { nivel: string; descripcion: string; parciales: ParcialNota[]; sugerenciaDetalle: { periodo: string; nivel: string }[] };
  autoSaveStatus: "idle" | "saving" | "saved" | "error";
  onNivel: (nivel: string) => void;
  onDescripcion: (descripcion: string) => void;
  onAddParcial: () => void;
  onUpdateParcial: (parcialId: string, field: "label" | "nivel", value: string) => void;
  onRemoveParcial: (parcialId: string) => void;
  onGuardar: () => void | Promise<void>;
  onEliminar?: () => void | Promise<void>;
  onClose: () => void;
}) {
  const nivelColor = nivelInfo(resolved.nivel)?.color ?? "#9ebfe1";
  const [isEliminando, setIsEliminando] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="grid max-h-[85vh] w-full max-w-lg gap-3 overflow-y-auto rounded-[14px] border-t-4 bg-white p-4 shadow-2xl transition-colors"
        style={{ borderTopColor: nivelColor }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e2ecf7] pb-3">
          <div>
            <p className="text-[10px] font-black uppercase text-monserrat-ink/45">{labelFromEnum(periodo)}</p>
            <h4 className="text-sm font-black uppercase text-monserrat-ink">{alumno.nombre}</h4>
            <p className="text-xs font-semibold text-[#2f7fce]">{competencia.label}</p>
          </div>
          <button type="button" onClick={onClose} className="text-monserrat-ink/40 hover:text-monserrat-ink" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div>
          <p className="mb-1 text-[10px] font-black uppercase text-monserrat-ink/50">
            {periodo === "GENERAL" ? "Nota general" : "Promedio de la competencia"}
          </p>
          <NivelPicker value={resolved.nivel} onChange={onNivel} />
        </div>

        {periodo === "GENERAL" && resolved.sugerenciaDetalle.length > 0 && (
          <div className="grid gap-1 rounded-[8px] border border-[#e2ecf7] bg-[#f7fbff] p-2">
            <p className="text-[10px] font-black uppercase text-monserrat-ink/45">Bimestres registrados</p>
            <div className="flex flex-wrap gap-3">
              {resolved.sugerenciaDetalle.map((d) => (
                <span key={d.periodo} className="text-[11px] font-bold text-monserrat-ink/70">
                  {labelFromEnum(d.periodo).replace("Bimestre ", "B")}:{" "}
                  <span style={{ color: nivelInfo(d.nivel)?.color }}>{d.nivel || "-"}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {periodo !== "GENERAL" && (
          <div>
            <p className="mb-1 text-[10px] font-black uppercase text-monserrat-ink/50">Notas parciales</p>
            <div className="grid gap-2">
              {resolved.parciales.map((parcial) => (
                <div key={parcial.id} className="flex items-center gap-2 rounded-[6px] border border-[#e2ecf7] p-2">
                  <input
                    value={parcial.label}
                    onChange={(e) => onUpdateParcial(parcial.id, "label", e.target.value)}
                    className="min-w-0 flex-1 border-b border-[#d9e7f5] bg-transparent px-1 text-xs font-semibold outline-none focus:border-[#2f7fce]"
                    placeholder="Criterio"
                  />
                  <NivelPicker value={parcial.nivel} compact onChange={(nivel) => onUpdateParcial(parcial.id, "nivel", nivel)} />
                  <button
                    type="button"
                    onClick={() => onRemoveParcial(parcial.id)}
                    className="text-monserrat-ink/35 hover:text-monserrat-ink"
                    aria-label="Quitar nota parcial"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={onAddParcial}
                className="inline-flex items-center justify-center gap-1 border border-dashed border-[#9ebfe1] bg-[#f7fbff] px-2 py-1.5 text-[11px] font-black text-[#2f7fce] hover:bg-[#eef6fc]"
              >
                <Plus size={12} /> Agregar nota parcial
              </button>
            </div>
          </div>
        )}

        <div>
          <p className="mb-1 text-[10px] font-black uppercase text-monserrat-ink/50">Comentario</p>
          <textarea
            value={resolved.descripcion}
            onChange={(e) => onDescripcion(e.target.value)}
            className="h-20 w-full resize-y rounded-[6px] border border-[#e2ecf7] bg-white px-2 py-1.5 text-xs font-semibold outline-none focus:border-[#2f7fce]"
            placeholder="Conclusion descriptiva"
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#e2ecf7] pt-3">
          <span className="text-[10px] font-bold text-monserrat-ink/40">
            {autoSaveStatus === "saving"
              ? "Guardando..."
              : autoSaveStatus === "saved"
              ? "Guardado"
              : autoSaveStatus === "error"
              ? "Error al guardar"
              : "Cambios sin guardar"}
          </span>
          <div className="flex items-center gap-2">
            {onEliminar && (
              <button
                type="button"
                onClick={async () => {
                  setIsEliminando(true);
                  await onEliminar();
                  setIsEliminando(false);
                }}
                disabled={isEliminando || autoSaveStatus === "saving"}
                className="rounded-[6px] border border-monserrat-red/25 bg-monserrat-red/[0.04] px-3 py-1.5 text-xs font-black text-monserrat-red transition-colors hover:bg-monserrat-red/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isEliminando ? "Borrando..." : "Borrar nota"}
              </button>
            )}
            <button
              type="button"
              onClick={onGuardar}
              disabled={!resolved.nivel || autoSaveStatus === "saving"}
              className="rounded-[6px] bg-[#2f7fce] px-5 py-1.5 text-xs font-black text-white transition-colors hover:bg-[#2568ac] disabled:cursor-not-allowed disabled:bg-[#b7d0ea]"
            >
              {autoSaveStatus === "saving" ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocenteNotas;
