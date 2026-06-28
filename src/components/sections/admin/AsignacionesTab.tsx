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

  const autocompletarPrimariaPorGrado = (grado: string, forzarPrimaria = false) => {
    if (!forzarPrimaria && asignacionAcademicaForm.nivelEducativo !== "PRIMARIA") {
      setAsignacionAcademicaForm({ ...asignacionAcademicaForm, grado });
      return;
    }

    const seccion =
      seccionesActivasPorNivel("PRIMARIA").find((item) =>
        alumnos.some(
          (alumno) =>
            alumno.nivelEducativo === "PRIMARIA" &&
            alumno.grado === grado &&
            alumno.seccion === item
        )
      ) ?? "A";
    const asignacionExistente = asignacionesAcademicas.find(
      (asignacion) =>
        asignacion.nivelEducativo === "PRIMARIA" &&
        asignacion.grado === grado &&
        asignacion.seccion === seccion &&
        asignacion.activo
    );
    const docenteDisponible = docentesPrimaria.find(
      (docente) =>
        !asignacionesAcademicas.some(
          (asignacion) =>
            asignacion.nivelEducativo === "PRIMARIA" &&
            asignacion.docenteDni === docente.dni &&
            asignacion.activo &&
            (asignacion.grado !== grado || asignacion.seccion !== seccion)
        )
    );

    setAulaNumero(aulaPorGradoSeccion("PRIMARIA", grado, seccion));
    setAsignacionAcademicaForm({
      ...asignacionAcademicaForm,
      nivelEducativo: "PRIMARIA",
      grado,
      seccion,
      curso: "MATEMATICA",
      docenteDni: asignacionExistente?.docenteDni ?? docenteDisponible?.dni ?? "",
    });
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
    <div className="grid gap-5">
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <form
          onSubmit={submitAsignacionAcademica}
          className="grid content-start gap-4 rounded-[18px] border border-monserrat-ink/8 bg-white p-5 shadow-sm"
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-red">
              Asignacion por aula
            </p>
            <h4 className="mt-1 font-serif text-[20px] font-black text-monserrat-ink">
              {editingAsignacionAcademica ? "Editar asignacion" : "Configurar salon"}
            </h4>
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
                  if (nivel === "PRIMARIA") {
                    autocompletarPrimariaPorGrado(grado, true);
                    return;
                  }
                  const curso = asignacionAcademicaForm.curso || "MATEMATICA";
                  const asignacionCurso = asignacionesAcademicas.find(
                    (asignacion) =>
                      asignacion.nivelEducativo === "SECUNDARIA" &&
                      asignacion.grado === grado &&
                      asignacion.seccion === seccion &&
                      asignacion.curso === curso
                  );
                  const docenteCurso = docentesSecundaria.find((docente) => docente.materia === curso);
                  const tutorAula = asignacionesAcademicas.find(
                    (asignacion) =>
                      asignacion.nivelEducativo === "SECUNDARIA" &&
                      asignacion.grado === grado &&
                      asignacion.seccion === seccion
                  );
                  setTutorSecundariaDni(tutorAula?.docenteDni ?? "");
                  setAsignacionAcademicaForm({
                    ...asignacionAcademicaForm,
                    nivelEducativo: nivel,
                    grado,
                    seccion,
                    curso,
                    docenteDni: asignacionCurso?.docenteDni ?? docenteCurso?.dni ?? "",
                  });
                  setAulaNumero(aulaPorGradoSeccion(nivel, grado, seccion));
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
                onChange={(e) => setAulaNumero(e.target.value)}
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
                onChange={(e) => autocompletarPrimariaPorGrado(e.target.value)}
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
                  setAulaNumero(
                    aulaPorGradoSeccion(
                      asignacionAcademicaForm.nivelEducativo,
                      asignacionAcademicaForm.grado ??
                        defaultGrado(asignacionAcademicaForm.nivelEducativo ?? "PRIMARIA"),
                      seccion
                    )
                  );
                  setAsignacionAcademicaForm({ ...asignacionAcademicaForm, seccion });
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
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-monserrat-red py-2.5 text-[12px] font-black text-white transition hover:bg-monserrat-red/85 disabled:opacity-60"
            >
              {editingAsignacionAcademica ? (
                <>
                  <Save size={13} /> Guardar
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
                className="rounded-[10px] border border-monserrat-ink/12 px-3 hover:border-monserrat-ink/25"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </form>
        <div className="grid min-h-[390px] grid-rows-[auto_minmax(280px,1fr)] gap-4">
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
            <div className="grid min-h-0 gap-4 lg:grid-cols-2">
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
                className="h-full min-h-[280px]"
                bodyClassName="max-h-none"
              />
              <RosterPanel
                title="Cursos y docente a cargo"
                empty="Aun no hay cursos asignados"
                rows={cursosDelAula.map((curso) => ({
                  id: curso.id,
                  title: curso.title,
                  detail: curso.detail,
                }))}
                className="h-full min-h-[280px]"
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
              className="h-full min-h-[280px]"
              bodyClassName="max-h-none min-h-[220px]"
            />
          )}
        </div>
      </div>
    </div>
  );
}
