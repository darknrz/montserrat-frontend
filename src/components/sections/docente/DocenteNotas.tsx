import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Search, Sparkles, X } from "lucide-react";
import { SectionHeader } from "../../ui/SectionHeader";
import { monserratApi } from "../../../api/monserrat";
import type { AsignacionAcademica, UsuarioAcademico, NotaAcademica, LoginResponse } from "../../../types";
import { competenciaConAbreviatura, formatGrado, GRUPO_LABELS, normalizeDocentesPorCompetencia, normalizeGrupo, tieneAccesoCompetencia, type AcademicoConfig, type CatalogItem } from "../admin/adminShared";

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

// Salón = grupo (Ciclado I/II, Anual, Ciencias, Letras) si el alumno lo tiene; si no, su grado.
const SALON_ORDER = [
  "PRIMERO_PRIMARIA", "SEGUNDO_PRIMARIA", "TERCERO_PRIMARIA", "CUARTO_PRIMARIA", "QUINTO_PRIMARIA",
  "CICLADO_I", "CICLADO_II", "ANUAL", "CIENCIAS", "LETRAS"
];

function salonKey(grado?: string | null, seccion?: string | null) {
  const g = normalizeGrupo(seccion);
  if (g) return g;
  return String(grado ?? "").toUpperCase();
}

function salonLabel(key: string) {
  if (key === "QUINTO_PRIMARIA") return "Preformativo";
  return GRUPO_LABELS[key] ?? formatGrado(key);
}

const MAX_PARCIALES = 4;
const EMPTY_PARCIALES: ParcialNota[] = [];

export function DocenteNotas({ token }: { token: string }) {
  const [alumnos, setAlumnos] = useState<UsuarioAcademico[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionAcademica[]>([]);
  const [notas, setNotas] = useState<NotaAcademica[]>([]);
  const [academicoConfig, setAcademicoConfig] = useState<AcademicoConfig | null>(null);
  const [selectedCurso, setSelectedCurso] = useState("");
  const [selectedSalon, setSelectedSalon] = useState("");
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

  // Salones donde el docente realmente enseña el curso elegido (según sus asignaciones).
  const salonesDelCurso = useMemo(() => {
    if (!selectedCurso) return [] as string[];
    const keys = new Set<string>();
    asignaciones.forEach((a) => {
      if (a.curso !== selectedCurso) return;
      const k = salonKey(a.grado, a.seccion);
      if (k) keys.add(k);
    });
    const ordenados = SALON_ORDER.filter((k) => keys.has(k));
    const extras = Array.from(keys).filter((k) => !SALON_ORDER.includes(k));
    return [...ordenados, ...extras];
  }, [selectedCurso, asignaciones]);

  useEffect(() => {
    if (salonesDelCurso.length === 0) {
      if (selectedSalon !== "") setSelectedSalon("");
    } else if (!salonesDelCurso.includes(selectedSalon)) {
      setSelectedSalon(salonesDelCurso[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonesDelCurso]);

  const alumnosFiltrados = useMemo(() => {
    if (!selectedCurso || !selectedSalon) return [] as UsuarioAcademico[];
    const dnis = new Set<string>();
    asignaciones.forEach((a) => {
      if (a.curso === selectedCurso && salonKey(a.grado, a.seccion) === selectedSalon) dnis.add(a.alumnoDni);
    });
    return alumnos.filter((al) => dnis.has(al.dni));
  }, [selectedCurso, selectedSalon, alumnos, asignaciones]);

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

  const mappingPrimaria = useMemo(() => normalizeDocentesPorCompetencia(academicoConfig?.docentesPorCompetencia as any), [academicoConfig]);
  const mappingSecundaria = useMemo(() => normalizeDocentesPorCompetencia(academicoConfig?.docentesPorCompetenciaSecundaria as any), [academicoConfig]);

  // Competencias (con abreviatura C1, C2... según el orden de la boleta) que el docente
  // realmente dicta en este curso y salón, más el set de celdas habilitadas por alumno.
  const { competenciasDelCurso, habilitadas } = useMemo(() => {
    const habil = new Set<string>();
    const found = new Map<string, { item: CatalogItem; index: number }>();
    if (!selectedCurso || !selectedSalon || !academicoConfig) {
      return { competenciasDelCurso: [] as CatalogItem[], habilitadas: habil };
    }
    alumnosFiltrados.forEach((alumno) => {
      const esSecundaria = alumno.nivelEducativo === "SECUNDARIA" || (alumno.grado ?? "").endsWith("_SECUNDARIA");
      const ids = (esSecundaria ? academicoConfig.competenciasPorCursoSecundaria : academicoConfig.competenciasPorCursoPrimaria)?.[selectedCurso] ?? [];
      const catalogo = esSecundaria ? academicoConfig.competenciasSecundaria ?? [] : academicoConfig.competenciasPrimaria ?? [];
      const mapping = esSecundaria ? mappingSecundaria : mappingPrimaria;
      ids.forEach((id, index) => {
        if (!tieneAccesoCompetencia(mapping, alumno.grado, alumno.seccion, selectedCurso, id, docenteDni)) return;
        habil.add(`${alumno.dni}||${id}`);
        if (!found.has(id)) {
          const item = catalogo.find((c) => c.id === id);
          if (item) found.set(id, { item, index });
        }
      });
    });
    const lista = Array.from(found.values())
      .sort((a, b) => a.index - b.index)
      .map(({ item, index }) => ({ ...item, label: competenciaConAbreviatura(item.label, index) }));
    return { competenciasDelCurso: lista, habilitadas: habil };
  }, [academicoConfig, selectedCurso, selectedSalon, alumnosFiltrados, docenteDni, mappingPrimaria, mappingSecundaria]);

  const periodoActivo = activePeriodo;

  // Índice O(1) de notas guardadas (con la observación ya decodificada) del curso actual.
  const notasIndex = useMemo(() => {
    const map = new Map<string, { nota: NotaAcademica; decoded: { parciales: ParcialNota[]; comentario: string } }>();
    notas.forEach((n) => {
      if (n.curso !== selectedCurso) return;
      map.set(`${n.alumnoDni}||${n.curso}||${n.periodo}||${n.competenciaId}`, { nota: n, decoded: decodeObservacion(n.observacion) });
    });
    return map;
  }, [notas, selectedCurso]);

  // Promedio de las notas finales de bimestre YA GUARDADAS para una competencia,
  // usado como sugerencia de la nota "General".
  const promedioBimestral = (competenciaId: string, alumnoDni = selectedAlumnoDni) => {
    const relevantes = BIMESTRES.map((b) => notasIndex.get(`${alumnoDni}||${selectedCurso}||${b}||${competenciaId}`)?.nota).filter(
      (n): n is NotaAcademica => Boolean(n && n.valor)
    );
    if (relevantes.length === 0) return { nivel: "", detalle: [] as { periodo: string; nivel: string }[] };
    const detalle = relevantes.map((n) => ({ periodo: n.periodo, nivel: nivelDesdeValor(n.valor) }));
    const promedio = relevantes.reduce((sum, n) => sum + n.valor, 0) / relevantes.length;
    return { nivel: nivelDesdeValor(Math.round(promedio)), detalle };
  };

  const getNotaKey = (periodo: string, competenciaId: string, alumnoDni = selectedAlumnoDni) =>
    `${alumnoDni}||${selectedCurso}||${periodo}||${competenciaId}`;

  // Única fuente de verdad para leer el estado "efectivo" (borrador > guardado > sugerido)
  // de una competencia+periodo, usada tanto para pintar la UI como para guardar.
  const resolveDraft = (periodo: string, competenciaId: string, alumnoDni = selectedAlumnoDni) => {
    const key = getNotaKey(periodo, competenciaId, alumnoDni);
    const entry = notasIndex.get(key);
    const decoded = entry?.decoded;
    const draft = drafts[key];

    const sugerencia = periodo === "GENERAL" ? promedioBimestral(competenciaId, alumnoDni) : { nivel: "", detalle: [] as { periodo: string; nivel: string }[] };
    const nivelGuardado = nivelDesdeValor(entry?.nota.valor);

    return {
      nivel: draft?.nivel || nivelGuardado || sugerencia.nivel,
      descripcion: draft?.descripcion ?? decoded?.comentario ?? "",
      parciales: draft?.parciales ?? decoded?.parciales ?? EMPTY_PARCIALES,
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
    if (actuales.length >= MAX_PARCIALES) return;
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

  // Primaria y secundaria tienen ids distintos para la misma competencia: una sola columna por nombre.
  const columnas = useMemo(() => {
    const map = new Map<string, { label: string; ids: string[] }>();
    competenciasDelCurso.forEach((c) => {
      const k = c.label.trim().toLowerCase();
      const g = map.get(k);
      if (g) g.ids.push(c.id);
      else map.set(k, { label: c.label, ids: [c.id] });
    });
    return Array.from(map.values());
  }, [competenciasDelCurso]);

  const puedeCalificar = Boolean(selectedCurso && selectedSalon && alumnosVisibles.length > 0 && competenciasDelCurso.length > 0);

  const abrirModal = useCallback((alumnoDni: string, competenciaId: string) => {
    setSelectedAlumnoDni(alumnoDni);
    setModalCtx({ alumnoDni, competenciaId });
  }, []);

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
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_260px]">
          <label className="grid gap-1 text-[11px] font-black uppercase text-monserrat-ink/55">
            Curso
            <AcademicoSelect
              value={selectedCurso}
              onChange={setSelectedCurso}
              placeholder="Seleccionar curso"
              options={cursosDisponibles.map((curso) => ({ value: curso, label: labelFromEnum(curso) }))}
            />
          </label>

          <label className="grid gap-1 text-[11px] font-black uppercase text-monserrat-ink/55">
            Salón
            <AcademicoSelect
              value={selectedSalon}
              onChange={setSelectedSalon}
              placeholder="Seleccionar salón"
              disabled={!selectedCurso || salonesDelCurso.length === 0}
              options={salonesDelCurso.map((k) => ({ value: k, label: salonLabel(k) }))}
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
                      <th className="sticky left-0 z-30 w-10 border border-[#9ebfe1] bg-[#dcebfa] px-2 py-2 font-semibold">N</th>
                      <th className="sticky left-10 z-30 w-20 border border-[#9ebfe1] bg-[#dcebfa] px-2 py-2 font-semibold">Grado</th>
                      <th className="sticky left-[120px] z-30 w-56 border border-[#9ebfe1] bg-[#dcebfa] px-2 py-2 font-semibold">Apellidos y Nombres</th>
                      {columnas.map((competencia) => (
                        <th
                          key={competencia.ids[0]}
                          className="min-w-[200px] whitespace-normal border border-[#9ebfe1] bg-[#dcebfa] px-2 py-1.5 text-center text-[10px] font-black normal-case leading-snug text-[#2f7fce]"
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
                            {formatGrado(alumno.grado)}
                          </td>
                          <td className="sticky left-[120px] z-20 border border-[#b7d0ea] bg-inherit px-2 py-1">
                            <button
                              type="button"
                              onClick={() => setSelectedAlumnoDni(alumno.dni)}
                              className="block w-full truncate text-left font-semibold uppercase text-[#4c6074] hover:text-[#2f7fce]"
                              title={alumno.nombre}
                            >
                              {alumno.nombre}
                            </button>
                          </td>
                          {columnas.map((columna) => {
                            const competenciaId = columna.ids.find((id) => habilitadas.has(`${alumno.dni}||${id}`));
                            if (!competenciaId) {
                              return (
                                <td
                                  key={columna.ids[0]}
                                  className="border border-[#b7d0ea] bg-[#f6f8fa] px-2 py-2 text-center text-[10px] font-semibold text-monserrat-ink/35"
                                >
                                  No asignada
                                </td>
                              );
                            }

                            const resolved = resolveDraft(periodoActivo, competenciaId, alumno.dni);
                            const key = getNotaKey(periodoActivo, competenciaId, alumno.dni);
                            // En "Nota final" las 4 cajas chicas son los bimestres; en un bimestre, las notas parciales.
                            const subNotas =
                              periodoActivo === "GENERAL"
                                ? BIMESTRES.map((b) => nivelDesdeValor(notasIndex.get(`${alumno.dni}||${selectedCurso}||${b}||${competenciaId}`)?.nota.valor))
                                : resolved.parciales.slice(0, MAX_PARCIALES).map((p) => p.nivel);

                            return (
                              <NotaCell
                                key={columna.ids[0]}
                                alumnoDni={alumno.dni}
                                competenciaId={competenciaId}
                                nivel={resolved.nivel}
                                subNotas={subNotas.join(",")}
                                saving={autoSaveState[key] === "saving"}
                                onOpen={abrirModal}
                              />
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
              {selectedCurso && !selectedSalon && <EmptyHint text="Elige un salón para ver a tus alumnos." />}
              {selectedCurso && selectedSalon && alumnosVisibles.length === 0 && <EmptyHint text="No se encontraron alumnos para los filtros seleccionados." />}
              {selectedCurso && selectedSalon && alumnosVisibles.length > 0 && competenciasDelCurso.length === 0 && (
                <EmptyHint text="No tienes competencias asignadas en este curso y salón." />
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

// Celda memoizada: solo se vuelve a renderizar si cambia su propia nota (evita el lag
// al escribir/cambiar de pestaña en grillas grandes de primaria).
const NotaCell = memo(function NotaCell({
  alumnoDni,
  competenciaId,
  nivel,
  subNotas,
  saving,
  onOpen
}: {
  alumnoDni: string;
  competenciaId: string;
  nivel: string;
  subNotas: string;
  saving: boolean;
  onOpen: (alumnoDni: string, competenciaId: string) => void;
}) {
  const info = nivelInfo(nivel);
  const subs = subNotas ? subNotas.split(",") : [];
  const cajas = Array.from({ length: MAX_PARCIALES }, (_, i) => subs[i] ?? "");
  return (
    <td className="border border-[#b7d0ea] px-1.5 py-1.5 text-center align-middle">
      <button
        type="button"
        onClick={() => onOpen(alumnoDni, competenciaId)}
        className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-[6px] px-1 py-1 transition-colors hover:bg-[#eaf3fc]"
        title="Editar notas"
      >
        <span className="flex gap-0.5">
          {cajas.map((n, i) => {
            const si = nivelInfo(n);
            return (
              <span
                key={i}
                className="flex h-5 w-5 items-center justify-center rounded-[3px] border text-[9px] font-black"
                style={{
                  borderColor: si ? si.color : "#c9d9ea",
                  backgroundColor: si ? si.soft : "#f7fbff",
                  color: si?.color
                }}
              >
                {n}
              </span>
            );
          })}
        </span>
        <span
          className={`flex h-8 w-9 items-center justify-center rounded-[5px] text-sm font-black ${nivel ? "border-2" : "border-2 border-dashed"}`}
          style={{
            borderColor: info ? info.color : "#b7cfe8",
            backgroundColor: info ? info.soft : "#f7fbff",
            color: info?.color
          }}
        >
          {saving ? "…" : nivel || <Plus size={13} className="text-[#8fb2da]" />}
        </span>
      </button>
    </td>
  );
});

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
                disabled={resolved.parciales.length >= MAX_PARCIALES}
                className="inline-flex items-center justify-center gap-1 border border-dashed border-[#9ebfe1] bg-[#f7fbff] px-2 py-1.5 text-[11px] font-black text-[#2f7fce] hover:bg-[#eef6fc] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={12} /> Agregar nota parcial ({resolved.parciales.length}/{MAX_PARCIALES})
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
