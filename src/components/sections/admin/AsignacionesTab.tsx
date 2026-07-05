import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Plus } from "lucide-react";
import { monserratApi } from "../../../api/monserrat";
import type { AsignacionAcademica, UsuarioAcademico } from "../../../types";
import { AdminField, RosterPanel, CompetenciaPickerModal, matrixKey } from "./adminComponents";
import {
  NIVELES,
  defaultGrado,
  aulaPorGradoSeccion,
  labelFromEnum,
  type AcademicoConfig,
} from "./adminShared";

type AsignacionesTabProps = {
  usuariosAcademicos: UsuarioAcademico[];
  asignacionesAcademicas: AsignacionAcademica[];
  setAsignacionesAcademicas: React.Dispatch<React.SetStateAction<AsignacionAcademica[]>>;
  academicoConfig: AcademicoConfig;
  token: string;
  isBusy: boolean;
  runAdminAction: (action: () => Promise<void>, successMessage: string) => void;
  cursosActivosPorNivel: (nivel?: string) => string[];
  seccionesActivasPorNivel: (nivel?: string) => string[];
  gradosActivosPorNivel: (nivel?: string) => string[];
  salonesActivosPorNivel: (nivel?: string) => string[];
  labelAcademico: (id: string) => string;
  saveAcademicoConfig: (next: AcademicoConfig) => void;
};

const emptyAsignacion = {
  docenteDni: "",
  alumnoDni: "",
  curso: "MATEMATICA",
  nivelEducativo: "PRIMARIA",
  grado: "PRIMERO_PRIMARIA",
  seccion: "A",
  activo: true,
};

export function AsignacionesTab({
  usuariosAcademicos,
  asignacionesAcademicas,
  setAsignacionesAcademicas,
  academicoConfig,
  token,
  isBusy,
  runAdminAction,
  cursosActivosPorNivel,
  seccionesActivasPorNivel,
  gradosActivosPorNivel,
  salonesActivosPorNivel,
  labelAcademico,
  saveAcademicoConfig,
}: AsignacionesTabProps) {
  const [editingAsignacionAcademica, setEditingAsignacionAcademica] =
    useState<AsignacionAcademica | null>(null);
  const [asignacionAcademicaForm, setAsignacionAcademicaForm] = useState(emptyAsignacion);
  const [aulaNumero, setAulaNumero] = useState("101");
  const [tutorSecundariaDni, setTutorSecundariaDni] = useState("");
  const [selectedCompetencia, setSelectedCompetencia] = useState<string>("");
  const [addingCompetenciaCurso, setAddingCompetenciaCurso] = useState<string | null>(null);

  useEffect(() => {
    const matchingSalon = academicoConfig.salones.find(
      (s) =>
        s.nivel === asignacionAcademicaForm.nivelEducativo &&
        s.grado === asignacionAcademicaForm.grado &&
        s.seccion === asignacionAcademicaForm.seccion
    );
    if (matchingSalon) {
      setAulaNumero(matchingSalon.aula);
    } else {
      const activeSalons = academicoConfig.salones.filter(
        (s) => s.active && s.nivel === asignacionAcademicaForm.nivelEducativo
      );
      setAulaNumero(activeSalons[0]?.aula ?? "");
    }
  }, [
    academicoConfig.salones,
    asignacionAcademicaForm.nivelEducativo,
    asignacionAcademicaForm.grado,
    asignacionAcademicaForm.seccion,
  ]);

  const docentes = useMemo(
    () => usuariosAcademicos.filter((u) => u.rol === "DOCENTE"),
    [usuariosAcademicos]
  );
  const alumnos = useMemo(
    () => usuariosAcademicos.filter((u) => u.rol === "ALUMNO"),
    [usuariosAcademicos]
  );
  const docentesPrimaria = useMemo(
    () => docentes.filter((u) => u.nivelEducativo === "PRIMARIA"),
    [docentes]
  );
  const docentesSecundaria = useMemo(
    () => docentes.filter((u) => u.nivelEducativo === "SECUNDARIA"),
    [docentes]
  );

  const alumnosDelAula = useMemo(
    () =>
      alumnos.filter(
        (u) =>
          u.nivelEducativo === asignacionAcademicaForm.nivelEducativo &&
          u.grado === asignacionAcademicaForm.grado &&
          u.seccion === asignacionAcademicaForm.seccion
      ),
    [alumnos, asignacionAcademicaForm.grado, asignacionAcademicaForm.nivelEducativo, asignacionAcademicaForm.seccion]
  );

  const docentesDelCurso = useMemo(() => {
    if (asignacionAcademicaForm.nivelEducativo !== "SECUNDARIA") {
      return asignacionAcademicaForm.curso
        ? docentesPrimaria.filter((u) => !u.materia || u.materia === asignacionAcademicaForm.curso)
        : docentesPrimaria;
    }
    return docentesSecundaria.filter(
      (u) => !u.materia || u.materia === asignacionAcademicaForm.curso
    );
  }, [asignacionAcademicaForm.curso, asignacionAcademicaForm.nivelEducativo, docentesPrimaria, docentesSecundaria]);

  const asignacionesDelAula = useMemo(
    () =>
      asignacionesAcademicas.filter(
        (a) =>
          a.nivelEducativo === asignacionAcademicaForm.nivelEducativo &&
          a.grado === asignacionAcademicaForm.grado &&
          a.seccion === asignacionAcademicaForm.seccion
      ),
    [asignacionesAcademicas, asignacionAcademicaForm.grado, asignacionAcademicaForm.nivelEducativo, asignacionAcademicaForm.seccion]
  );

  const profesoresDelAula = useMemo(() => {
    const byDni = new Map<string, AsignacionAcademica>();
    asignacionesDelAula.forEach((asignacion) => byDni.set(asignacion.docenteDni, asignacion));
    return Array.from(byDni.values());
  }, [asignacionesDelAula]);

  const tutorSecundariaVisible = useMemo(() => {
    const selected = docentesSecundaria.find((docente) => docente.dni === tutorSecundariaDni);
    return selected?.nombre ?? profesoresDelAula[0]?.docenteNombre ?? "Sin tutor";
  }, [docentesSecundaria, profesoresDelAula, tutorSecundariaDni]);

  const cursosPrimariaActivos = useMemo(
    () => academicoConfig.cursosPrimaria.filter((item) => item.active).map((item) => item.id),
    [academicoConfig.cursosPrimaria]
  );

  const competenciasPrimaria = useMemo(
    () => academicoConfig.competenciasPrimaria.filter((item) => item.active),
    [academicoConfig.competenciasPrimaria]
  );

  // Mapa curso -> ids de competencias vinculadas a esa área curricular
  const competenciasPorCurso = academicoConfig.competenciasPorCursoPrimaria ?? {};

  // Competencias vinculadas al área curricular seleccionada (columna 3).
  // Si el área no tiene ninguna vinculada, queda vacía y se ofrece "Vincular".
  const competenciasDelCurso = useMemo(() => {
    if (!asignacionAcademicaForm.curso) return [];
    const ids = competenciasPorCurso[asignacionAcademicaForm.curso] ?? [];
    return competenciasPrimaria.filter((c) => ids.includes(c.id));
  }, [competenciasPorCurso, competenciasPrimaria, asignacionAcademicaForm.curso]);

  useEffect(() => {
    // Si la competencia seleccionada ya no pertenece al área actual, se limpia/actualiza
    if (selectedCompetencia && !competenciasDelCurso.some((c) => c.id === selectedCompetencia)) {
      setSelectedCompetencia(competenciasDelCurso[0]?.id ?? "");
    } else if (!selectedCompetencia && competenciasDelCurso.length > 0) {
      setSelectedCompetencia(competenciasDelCurso[0].id);
    }
  }, [competenciasDelCurso, selectedCompetencia]);

  // Asignación docente por (grado, curso, competencia) -> dni, vive en academicoConfig
  const docentesPorCompetencia = academicoConfig.docentesPorCompetencia ?? {};

  const claveActual = useMemo(
    () => matrixKey(asignacionAcademicaForm.grado ?? "", asignacionAcademicaForm.curso ?? "", selectedCompetencia),
    [asignacionAcademicaForm.grado, asignacionAcademicaForm.curso, selectedCompetencia]
  );

  const docenteAsignadoActual = docentesPorCompetencia[claveActual];

  const docentePrimariaVisible = useMemo(() => {
    if (!selectedCompetencia) return "Selecciona una competencia";
    const docente = docentesPrimaria.find((d) => d.dni === docenteAsignadoActual);
    return docente?.nombre ?? "Sin docente asignado";
  }, [docenteAsignadoActual, docentesPrimaria, selectedCompetencia]);

  const autocompletarPorGradoYSeccion = (grado: string, seccion: string, nivel: string) => {
    const matchingSalon = academicoConfig.salones.find(
      (s) => s.nivel === nivel && s.grado === grado && s.seccion === seccion
    );
    const aula = matchingSalon ? matchingSalon.aula : aulaPorGradoSeccion(nivel, grado, seccion);
    setAulaNumero(aula);

    if (nivel === "PRIMARIA") {
      const curso = asignacionAcademicaForm.curso || cursosActivosPorNivel("PRIMARIA")[0] || "MATEMATICA";
      setAsignacionAcademicaForm({
        ...asignacionAcademicaForm,
        nivelEducativo: "PRIMARIA",
        grado,
        seccion,
        curso,
      });
    } else {
      // SECUNDARIA
      const curso = asignacionAcademicaForm.curso || "MATEMATICA";
      const asignacionCurso = asignacionesAcademicas.find(
        (a) =>
          a.nivelEducativo === "SECUNDARIA" &&
          a.grado === grado &&
          a.seccion === seccion &&
          a.curso === curso &&
          a.activo
      );

      const tutorAula = asignacionesAcademicas.find(
        (a) =>
          a.nivelEducativo === "SECUNDARIA" &&
          a.grado === grado &&
          a.seccion === seccion &&
          a.activo
      );

      setTutorSecundariaDni(tutorAula?.docenteDni ?? "");

      const docenteCurso = docentesSecundaria.find((docente) => docente.materia === curso);

      setAsignacionAcademicaForm({
        ...asignacionAcademicaForm,
        nivelEducativo: "SECUNDARIA",
        grado,
        seccion,
        curso,
        docenteDni: asignacionCurso?.docenteDni ?? docenteCurso?.dni ?? "",
      });
    }
  };

  const handleSalonChange = (aula: string) => {
    setAulaNumero(aula);
    const matchingSalon = academicoConfig.salones.find((s) => s.aula === aula);
    if (matchingSalon) {
      autocompletarPorGradoYSeccion(
        matchingSalon.grado,
        matchingSalon.seccion,
        matchingSalon.nivel
      );
    }
  };

  const submitAsignacionAcademica = (e: FormEvent) => {
    e.preventDefault();
    runAdminAction(async () => {
      const nivelEducativo = asignacionAcademicaForm.nivelEducativo ?? "PRIMARIA";
      if (editingAsignacionAcademica) {
        await monserratApi.updateAsignacionAcademica(
          editingAsignacionAcademica.id,
          {
            docenteDni: asignacionAcademicaForm.docenteDni,
            alumnoDni: asignacionAcademicaForm.alumnoDni,
            curso: asignacionAcademicaForm.curso,
            nivelEducativo,
            grado: asignacionAcademicaForm.grado ?? "",
            seccion: asignacionAcademicaForm.seccion ?? "",
            activo: asignacionAcademicaForm.activo,
          },
          token
        );
      } else {
        await monserratApi.createAsignacionAula(
          {
            docenteDni: asignacionAcademicaForm.docenteDni,
            curso: asignacionAcademicaForm.curso,
            nivelEducativo,
            grado: asignacionAcademicaForm.grado ?? "",
            seccion: asignacionAcademicaForm.seccion ?? "",
            activo: asignacionAcademicaForm.activo,
          },
          token
        );
      }

      const nextSalones = academicoConfig.salones.map((s) => {
        if (s.aula === aulaNumero && s.nivel === nivelEducativo) {
          return {
            ...s,
            grado: asignacionAcademicaForm.grado ?? "",
            seccion: asignacionAcademicaForm.seccion ?? "",
          };
        }
        if (
          s.grado === asignacionAcademicaForm.grado &&
          s.seccion === asignacionAcademicaForm.seccion &&
          s.nivel === nivelEducativo
        ) {
          return { ...s, grado: "", seccion: "" };
        }
        return s;
      });

      saveAcademicoConfig({
        ...academicoConfig,
        salones: nextSalones,
      });

      setAsignacionesAcademicas(await monserratApi.asignacionesAcademicas(token));
      setEditingAsignacionAcademica(null);
      setAsignacionAcademicaForm(emptyAsignacion);
    }, "Asignacion academica guardada");
  };

  const cursosDelAula = useMemo(
    () =>
      cursosActivosPorNivel(asignacionAcademicaForm.nivelEducativo).map((curso) => {
        const asignacion = asignacionesDelAula.find((item) => item.curso === curso);
        return {
          id: curso,
          title: labelAcademico(curso),
          detail: asignacion?.docenteNombre ?? "Sin docente asignado",
          raw: asignacion,
        };
      }),
    [asignacionesDelAula, asignacionAcademicaForm.nivelEducativo, cursosActivosPorNivel, labelAcademico]
  );

  const toggleCompetenciaForCurso = (curso: string, competenciaId: string) => {
    if (!curso) return;
    const current = new Set(competenciasPorCurso[curso] ?? []);
    if (current.has(competenciaId)) current.delete(competenciaId);
    else current.add(competenciaId);
    const next = { ...(competenciasPorCurso || {}), [curso]: Array.from(current) };
    saveAcademicoConfig({ ...academicoConfig, competenciasPorCursoPrimaria: next });
  };

  const asignarDocenteCompetencia = (docenteDni: string) => {
    if (!asignacionAcademicaForm.grado || !asignacionAcademicaForm.curso || !selectedCompetencia) return;
    const key = matrixKey(asignacionAcademicaForm.grado, asignacionAcademicaForm.curso, selectedCompetencia);
    const next = { ...(academicoConfig.docentesPorCompetencia ?? {}) };
    if (docenteDni) {
      next[key] = docenteDni;
    } else {
      delete next[key];
    }
    saveAcademicoConfig({ ...academicoConfig, docentesPorCompetencia: next });
  };

  const handleGradoSelect = (gradoId: string) => {
    const seccion = "A";
    const nivel = "PRIMARIA";
    setAsignacionAcademicaForm({
      ...asignacionAcademicaForm,
      nivelEducativo: nivel,
      grado: gradoId,
      seccion,
    });
    setAulaNumero(aulaPorGradoSeccion(nivel, gradoId, seccion));
  };

  const handleAreaSelect = (curso: string) => {
    setAsignacionAcademicaForm({ ...asignacionAcademicaForm, curso });
    setSelectedCompetencia("");
  };

  const handleEditClick = (item: AsignacionAcademica) => {
    setEditingAsignacionAcademica(item);
    setAsignacionAcademicaForm({
      docenteDni: item.docenteDni,
      alumnoDni: item.alumnoDni ?? "",
      curso: item.curso ?? "MATEMATICA",
      nivelEducativo: item.nivelEducativo ?? "PRIMARIA",
      grado: item.grado ?? "PRIMERO_PRIMARIA",
      seccion: item.seccion ?? "A",
      activo: item.activo ?? true,
    });
  };

  const esSecundaria = asignacionAcademicaForm.nivelEducativo === "SECUNDARIA";

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="grid gap-5 flex-1 min-h-0">
        <div className="grid grid-rows-[auto_1fr] gap-4 h-full min-h-0">
          <div className="rounded-[16px] border border-monserrat-ink/8 bg-monserrat-cream/35 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/45">
              Vista del aula seleccionada
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
              <h4 className="font-serif text-[18px] font-black text-monserrat-ink">
                Aula {aulaNumero} -{" "}
                {labelFromEnum(asignacionAcademicaForm.grado ?? "")}{" "}
                {asignacionAcademicaForm.seccion}
              </h4>
              <div className="flex flex-wrap gap-2">
                <div className="rounded-[10px] bg-white px-3 py-1.5">
                  <p className="text-[9px] font-black uppercase tracking-[0.1em] text-monserrat-ink/40">
                    Alumnos
                  </p>
                  <p className="text-sm font-black text-monserrat-ink">{alumnosDelAula.length}</p>
                </div>
                {esSecundaria && (
                  <div className="rounded-[10px] bg-white px-3 py-1.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.1em] text-monserrat-ink/40">
                      Tutor
                    </p>
                    <p className="max-w-[180px] truncate text-sm font-black text-monserrat-ink">
                      {tutorSecundariaVisible}
                    </p>
                  </div>
                )}
                {esSecundaria && (
                  <div className="rounded-[10px] bg-white px-3 py-1.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.1em] text-monserrat-ink/40">
                      Cursos
                    </p>
                    <p className="text-sm font-black text-monserrat-ink">
                      {new Set(asignacionesDelAula.map((a) => a.curso)).size}
                    </p>
                  </div>
                )}
                {!esSecundaria && (
                  <>
                    <div className="rounded-[10px] bg-white px-3 py-1.5">
                      <p className="text-[9px] font-black uppercase tracking-[0.1em] text-monserrat-ink/40">
                        Docente
                      </p>
                      <p className="max-w-[220px] truncate text-sm font-black text-monserrat-ink">
                        {docentePrimariaVisible}
                      </p>
                    </div>
                    {selectedCompetencia && (
                      <div className="rounded-[10px] bg-white px-3 py-1.5">
                        <p className="text-[9px] font-black uppercase tracking-[0.1em] text-monserrat-ink/40">
                          Competencia
                        </p>
                        <p className="max-w-[220px] truncate text-sm font-black text-monserrat-ink">
                          {competenciasPrimaria.find((item) => item.id === selectedCompetencia)?.label ?? selectedCompetencia}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          {esSecundaria ? (
            <div className="grid min-h-0 gap-4 lg:grid-cols-2 h-full">
              <RosterPanel
                title="Alumnos del aula"
                empty="No hay alumnos en esta aula"
                rows={alumnosDelAula.map((alumno) => ({
                  id: alumno.dni,
                  title: alumno.nombre,
                  detail: `${alumno.codigo || alumno.dni} - ${labelAcademico(
                    alumno.grado ?? ""
                  )} ${labelAcademico(alumno.seccion ?? "")}`,
                }))}
                className="h-full min-h-0"
                bodyClassName="max-h-none"
              />
              <RosterPanel
                title="Cursos y docente a cargo"
                empty="Aun no hay cursos asignados"
                rows={cursosDelAula.map((curso) => ({
                  id: curso.id,
                  title: curso.title,
                  detail: curso.detail,
                  raw: curso.raw,
                }))}
                onEdit={(asignacion) => {
                  if (asignacion) {
                    handleEditClick(asignacion);
                  }
                }}
                className="h-full min-h-0"
                bodyClassName="max-h-none"
              />
            </div>
          ) : (
            <div className="grid min-h-0 gap-4 lg:grid-cols-4 h-full">
              <RosterPanel
                title="Grados"
                empty="No hay grados activos"
                rows={academicoConfig.gradosPrimaria.filter((g) => g.active).map((grado) => ({
                  id: grado.id,
                  title: labelAcademico(grado.id),
                  detail: grado.label,
                  raw: grado.id,
                }))}
                selectedId={asignacionAcademicaForm.grado}
                onSelect={(grado) => handleGradoSelect(grado)}
                className="h-full min-h-0"
                bodyClassName="max-h-none"
              />
              <RosterPanel
                title="Áreas curriculares"
                empty="No hay áreas activas"
                rows={cursosPrimariaActivos.map((curso) => {
                  const vinculadas = (competenciasPorCurso[curso] ?? []).length;
                  return {
                    id: curso,
                    title: labelAcademico(curso),
                    detail: vinculadas > 0 ? `${vinculadas} competencia(s) vinculada(s)` : "Sin competencias vinculadas",
                    raw: curso,
                  };
                })}
                selectedId={asignacionAcademicaForm.curso}
                onSelect={(curso) => handleAreaSelect(curso)}
                className="h-full min-h-0"
                bodyClassName="max-h-none"
              />
              <RosterPanel
                title="Competencias"
                empty="Sin competencias vinculadas a esta área"
                rows={competenciasDelCurso.map((competencia) => {
                  const key = matrixKey(asignacionAcademicaForm.grado ?? "", asignacionAcademicaForm.curso ?? "", competencia.id);
                  const dni = docentesPorCompetencia[key];
                  const docente = docentesPrimaria.find((d) => d.dni === dni);
                  return {
                    id: competencia.id,
                    title: competencia.label,
                    detail: docente ? docente.nombre : "Sin docente asignado",
                    raw: competencia.id,
                  };
                })}
                selectedId={selectedCompetencia}
                onSelect={(competenciaId) => setSelectedCompetencia(competenciaId)}
                headerAction={
                  asignacionAcademicaForm.curso ? (
                    <button
                      type="button"
                      onClick={() => setAddingCompetenciaCurso(asignacionAcademicaForm.curso)}
                      className="inline-flex items-center gap-1 rounded-[8px] bg-white/10 px-2.5 py-1.5 text-[10px] font-black text-monserrat-cream hover:bg-white/18"
                    >
                      <Plus size={11} /> Vincular
                    </button>
                  ) : undefined
                }
                className="h-full min-h-0"
                bodyClassName="max-h-none"
              />
              <RosterPanel
                title="Docentes"
                empty="No hay docentes disponibles"
                rows={docentesDelCurso.map((doc) => ({
                  id: doc.dni,
                  title: doc.nombre,
                  detail:
                    selectedCompetencia && doc.dni === docenteAsignadoActual
                      ? "Asignado a esta competencia y grado"
                      : doc.materia
                      ? labelFromEnum(doc.materia)
                      : "Docente primaria",
                  raw: doc.dni,
                }))}
                selectedId={docenteAsignadoActual}
                onSelect={(dni) => {
                  if (!selectedCompetencia) return;
                  asignarDocenteCompetencia(dni === docenteAsignadoActual ? "" : dni);
                }}
                className="h-full min-h-0"
                bodyClassName="max-h-none"
              />
            </div>
          )}
        </div>
      </div>

      {addingCompetenciaCurso && (
        <CompetenciaPickerModal
          curso={addingCompetenciaCurso}
          catalogo={competenciasPrimaria}
          yaVinculadas={competenciasPorCurso[addingCompetenciaCurso] ?? []}
          labelAcademico={labelAcademico}
          onToggle={(competenciaId) => toggleCompetenciaForCurso(addingCompetenciaCurso, competenciaId)}
          onClose={() => setAddingCompetenciaCurso(null)}
        />
      )}
    </div>
  );
}