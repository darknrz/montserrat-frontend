import { Plus, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { monserratApi } from "../../../api/monserrat";
import type { AsignacionAcademica, UsuarioAcademico } from "../../../types";
import { AdminField, RosterPanel } from "./adminComponents";
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
  const docentesPrimaria = useMemo(() => docentes.filter((u) => !u.materia), [docentes]);
  const docentesSecundaria = useMemo(() => docentes.filter((u) => Boolean(u.materia)), [docentes]);

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

  const docentesSugeridos = useMemo(() => {
    if (asignacionAcademicaForm.nivelEducativo !== "SECUNDARIA") return docentesPrimaria;
    return docentesSecundaria;
  }, [asignacionAcademicaForm.nivelEducativo, docentesPrimaria, docentesSecundaria]);

  const docentesDelCurso = useMemo(() => {
    if (asignacionAcademicaForm.nivelEducativo !== "SECUNDARIA") return docentesPrimaria;
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

  const docentePrimariaVisible = useMemo(() => {
    const asignado = profesoresDelAula[0]?.docenteNombre;
    if (asignado) return asignado;
    return (
      docentesPrimaria.find((docente) => docente.dni === asignacionAcademicaForm.docenteDni)
        ?.nombre ?? "Sin docente"
    );
  }, [asignacionAcademicaForm.docenteDni, docentesPrimaria, profesoresDelAula]);

  const autocompletarPorGradoYSeccion = (grado: string, seccion: string, nivel: string) => {
    const matchingSalon = academicoConfig.salones.find(
      (s) => s.nivel === nivel && s.grado === grado && s.seccion === seccion
    );
    const aula = matchingSalon ? matchingSalon.aula : aulaPorGradoSeccion(nivel, grado, seccion);
    setAulaNumero(aula);

    if (nivel === "PRIMARIA") {
      const asignacionExistente = asignacionesAcademicas.find(
        (a) =>
          a.nivelEducativo === "PRIMARIA" &&
          a.grado === grado &&
          a.seccion === seccion &&
          a.activo
      );
      const docenteDisponible = docentesPrimaria.find(
        (docente) =>
          !asignacionesAcademicas.some(
            (a) =>
              a.nivelEducativo === "PRIMARIA" &&
              a.docenteDni === docente.dni &&
              a.activo &&
              (a.grado !== grado || a.seccion !== seccion)
          )
      );

      setAsignacionAcademicaForm({
        ...asignacionAcademicaForm,
        nivelEducativo: "PRIMARIA",
        grado,
        seccion,
        curso: "MATEMATICA",
        docenteDni: asignacionExistente?.docenteDni ?? docenteDisponible?.dni ?? "",
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
            curso: nivelEducativo === "SECUNDARIA" ? asignacionAcademicaForm.curso : undefined,
            nivelEducativo,
            grado: asignacionAcademicaForm.grado ?? "",
            seccion: asignacionAcademicaForm.seccion ?? "",
            activo: asignacionAcademicaForm.activo,
          },
          token
        );
      }

      // Link selected classroom with selected grade and section
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

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="grid gap-5 xl:grid-cols-[380px_1fr] flex-1 min-h-0">
        <form
          onSubmit={submitAsignacionAcademica}
          className={`grid content-start gap-4 rounded-[18px] border bg-white p-5 shadow-sm transition-all duration-300 ${
            editingAsignacionAcademica
              ? "border-amber-500 ring-2 ring-amber-500/20"
              : "border-monserrat-ink/8"
          }`}
        >
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-red">
                  Asignacion por aula
                </p>
                <h4 className="mt-1 font-serif text-[20px] font-black text-monserrat-ink">
                  {editingAsignacionAcademica ? "Editar asignación" : "Configurar salón"}
                </h4>
              </div>
              
              {editingAsignacionAcademica ? (
                <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-800 border border-amber-200 uppercase tracking-wider">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  Edición
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Nuevo
                </span>
              )}
            </div>
            
            {editingAsignacionAcademica && (
              <div className="text-[11px] bg-amber-500/10 text-amber-800 p-2 rounded-lg border border-amber-500/20">
                Estás editando la asignación de <strong>{editingAsignacionAcademica.docenteNombre}</strong> en <strong>{labelAcademico(editingAsignacionAcademica.grado ?? "")} - {editingAsignacionAcademica.seccion}</strong>.
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {NIVELES.map((nivel) => (
              <button
                key={nivel}
                type="button"
                disabled={Boolean(editingAsignacionAcademica)}
                onClick={() => {
                  const grado = defaultGrado(nivel);
                  const seccion = "A";
                  autocompletarPorGradoYSeccion(grado, seccion, nivel);
                }}
                className={`rounded-[10px] border px-3 py-2 text-[12px] font-black transition ${
                  asignacionAcademicaForm.nivelEducativo === nivel
                    ? "border-monserrat-red bg-monserrat-red text-white"
                    : "border-monserrat-ink/10 bg-monserrat-cream/45 text-monserrat-ink/65 hover:border-monserrat-ink/25"
                }`}
              >
                {labelFromEnum(nivel)}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField label="Salon">
              <select
                value={aulaNumero}
                onChange={(e) => handleSalonChange(e.target.value)}
                className="admin-input"
                required
              >
                {salonesActivosPorNivel(asignacionAcademicaForm.nivelEducativo).map((aula) => (
                  <option key={aula} value={aula}>
                    Aula {aula}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Grado">
              <select
                value={asignacionAcademicaForm.grado ?? "PRIMERO_PRIMARIA"}
                onChange={(e) => {
                  const grado = e.target.value;
                  const nivel = asignacionAcademicaForm.nivelEducativo ?? "PRIMARIA";
                  const seccion = asignacionAcademicaForm.seccion ?? "A";
                  autocompletarPorGradoYSeccion(grado, seccion, nivel);
                }}
                className="admin-input"
                required
              >
                {gradosActivosPorNivel(asignacionAcademicaForm.nivelEducativo).map((grado) => (
                  <option key={grado} value={grado}>
                    {labelAcademico(grado)}
                  </option>
                ))}
              </select>
            </AdminField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField label="Seccion">
              <select
                value={asignacionAcademicaForm.seccion ?? "A"}
                onChange={(e) => {
                  const seccion = e.target.value;
                  const nivel = asignacionAcademicaForm.nivelEducativo ?? "PRIMARIA";
                  const grado = asignacionAcademicaForm.grado ?? defaultGrado(nivel);
                  autocompletarPorGradoYSeccion(grado, seccion, nivel);
                }}
                className="admin-input"
                required
              >
                {seccionesActivasPorNivel(asignacionAcademicaForm.nivelEducativo).map((seccion) => (
                  <option key={seccion} value={seccion}>
                    {labelAcademico(seccion)}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField
              label={
                asignacionAcademicaForm.nivelEducativo === "SECUNDARIA"
                  ? "Tutor del aula"
                  : "Docente de primaria"
              }
            >
              <select
                value={
                  asignacionAcademicaForm.nivelEducativo === "SECUNDARIA"
                    ? tutorSecundariaDni
                    : asignacionAcademicaForm.docenteDni
                }
                onChange={(e) => {
                  if (asignacionAcademicaForm.nivelEducativo === "SECUNDARIA") {
                    setTutorSecundariaDni(e.target.value);
                    return;
                  }
                  setAsignacionAcademicaForm({
                    ...asignacionAcademicaForm,
                    docenteDni: e.target.value,
                  });
                }}
                className="admin-input"
                required={asignacionAcademicaForm.nivelEducativo !== "SECUNDARIA"}
              >
                <option value="">Selecciona</option>
                {docentesSugeridos.map((u) => (
                  <option key={u.dni} value={u.dni}>
                    {u.nombre} -{" "}
                    {u.materia ? labelFromEnum(u.materia) : "Docente primaria"}
                  </option>
                ))}
              </select>
            </AdminField>
          </div>
          {(asignacionAcademicaForm.nivelEducativo === "SECUNDARIA" ||
            editingAsignacionAcademica) && (
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Curso">
                <select
                  value={asignacionAcademicaForm.curso}
                  onChange={(e) => {
                    const curso = e.target.value;
                    const asignacionCurso = asignacionesDelAula.find(
                      (asignacion) => asignacion.curso === curso
                    );
                    const docenteCurso = docentesSecundaria.find((docente) => docente.materia === curso);
                    setAsignacionAcademicaForm({
                      ...asignacionAcademicaForm,
                      curso,
                      docenteDni: asignacionCurso?.docenteDni ?? docenteCurso?.dni ?? "",
                    });
                  }}
                  className="admin-input"
                  required
                >
                  {cursosActivosPorNivel(asignacionAcademicaForm.nivelEducativo).map((curso) => (
                    <option key={curso} value={curso}>
                      {labelAcademico(curso)}
                    </option>
                  ))}
                </select>
              </AdminField>
              <AdminField label="Docente del curso">
                <select
                  value={asignacionAcademicaForm.docenteDni}
                  onChange={(e) =>
                    setAsignacionAcademicaForm({
                      ...asignacionAcademicaForm,
                      docenteDni: e.target.value,
                    })
                  }
                  className="admin-input"
                  required
                >
                  <option value="">Selecciona</option>
                  {docentesDelCurso.map((u) => (
                    <option key={u.dni} value={u.dni}>
                      {u.nombre} - {labelFromEnum(u.materia ?? "")}
                    </option>
                  ))}
                </select>
              </AdminField>
            </div>
          )}
          {editingAsignacionAcademica && (
            <AdminField label="Alumno">
              <select
                value={asignacionAcademicaForm.alumnoDni}
                onChange={(e) =>
                  setAsignacionAcademicaForm({
                    ...asignacionAcademicaForm,
                    alumnoDni: e.target.value,
                  })
                }
                className="admin-input"
                required
              >
                <option value="">Selecciona</option>
                {alumnosDelAula.map((u) => (
                  <option key={u.dni} value={u.dni}>
                    {u.nombre} - {u.dni}
                  </option>
                ))}
              </select>
            </AdminField>
          )}
          <label className="flex items-center gap-2 text-[12px] font-bold text-monserrat-ink/65">
            <input
              type="checkbox"
              checked={Boolean(asignacionAcademicaForm.activo)}
              onChange={(e) =>
                setAsignacionAcademicaForm({ ...asignacionAcademicaForm, activo: e.target.checked })
              }
            />
            Activa
          </label>
          <div className="flex gap-2">
            <button
              disabled={isBusy}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-[10px] py-2.5 text-[12px] font-black text-white transition cursor-pointer disabled:opacity-60 ${
                editingAsignacionAcademica
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-monserrat-red hover:bg-monserrat-red/85"
              }`}
            >
              {editingAsignacionAcademica ? (
                <>
                  <Save size={13} /> Guardar cambios
                </>
              ) : (
                <>
                  <Plus size={13} /> Asignar aula
                </>
              )}
            </button>
            {editingAsignacionAcademica && (
              <button
                type="button"
                onClick={() => {
                  setEditingAsignacionAcademica(null);
                  setAsignacionAcademicaForm(emptyAsignacion);
                }}
                className="flex items-center justify-center gap-1.5 rounded-[10px] border border-monserrat-ink/12 px-4 py-2.5 text-[12px] font-bold text-monserrat-ink/75 transition hover:bg-monserrat-cream/15 hover:border-monserrat-ink/25 cursor-pointer"
              >
                <X size={13} /> Cancelar edición
              </button>
            )}
          </div>
        </form>
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
                {asignacionAcademicaForm.nivelEducativo === "SECUNDARIA" && (
                  <div className="rounded-[10px] bg-white px-3 py-1.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.1em] text-monserrat-ink/40">
                      Tutor
                    </p>
                    <p className="max-w-[180px] truncate text-sm font-black text-monserrat-ink">
                      {tutorSecundariaVisible}
                    </p>
                  </div>
                )}
                {asignacionAcademicaForm.nivelEducativo === "SECUNDARIA" && (
                  <div className="rounded-[10px] bg-white px-3 py-1.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.1em] text-monserrat-ink/40">
                      Cursos
                    </p>
                    <p className="text-sm font-black text-monserrat-ink">
                      {new Set(asignacionesDelAula.map((a) => a.curso)).size}
                    </p>
                  </div>
                )}
                {asignacionAcademicaForm.nivelEducativo !== "SECUNDARIA" && (
                  <div className="rounded-[10px] bg-white px-3 py-1.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.1em] text-monserrat-ink/40">
                      Docente
                    </p>
                    <p className="max-w-[220px] truncate text-sm font-black text-monserrat-ink">
                      {docentePrimariaVisible}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          {asignacionAcademicaForm.nivelEducativo === "SECUNDARIA" ? (
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
            <RosterPanel
              title="Alumnos del salon"
              empty="No hay alumnos en esta aula"
              rows={alumnosDelAula.map((alumno) => ({
                id: alumno.dni,
                title: alumno.nombre,
                detail: `${alumno.codigo || alumno.dni} - ${labelAcademico(
                  alumno.grado ?? ""
                )} ${labelAcademico(alumno.seccion ?? "")}`,
              }))}
              className="h-full min-h-0"
              bodyClassName="max-h-none min-h-0"
            />
          )}
        </div>
      </div>
    </div>
  );
}
