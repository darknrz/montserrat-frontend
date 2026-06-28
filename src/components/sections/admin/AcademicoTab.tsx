import {
  BookOpen,
  Download,
  FileSpreadsheet,
  GraduationCap,
  School,
  Save,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { monserratApi } from "../../../api/monserrat";
import type { UsuarioAcademico } from "../../../types";
import { ConfirmForceDeleteModal } from "../../ui/ConfirmForceDeleteModal";
import {
  AdminField,
  AdminMetric,
  AdminTable,
  MediaPicker,
} from "./adminComponents";
import {
  ESTADOS_MATRICULA,
  NIVELES,
  defaultGrado,
  labelFromEnum,
  normalizeGrado,
  normalizeNivel,
  parseBooleanCell,
  type AcademicoConfig,
} from "./adminShared";

type AcademicoTabProps = {
  usuariosAcademicos: UsuarioAcademico[];
  setUsuariosAcademicos: React.Dispatch<React.SetStateAction<UsuarioAcademico[]>>;
  academicoConfig: AcademicoConfig;
  token: string;
  isBusy: boolean;
  setIsBusy: (busy: boolean) => void;
  setStatus: (status: string | null) => void;
  setErrorMessage: (msg: string | null) => void;
  runAdminAction: (action: () => Promise<void>, successMessage: string) => void;
  cursosActivosPorNivel: (nivel?: string) => string[];
  seccionesActivasPorNivel: (nivel?: string) => string[];
  gradosActivosPorNivel: (nivel?: string) => string[];
  labelAcademico: (id: string) => string;
};

const emptyUsuarioAcademico: Omit<UsuarioAcademico, "id"> = {
  dni: "",
  codigo: "",
  nombre: "",
  nombres: "",
  apellidos: "",
  correo: "",
  direccion: "",
  fechaNacimiento: "",
  rol: "ALUMNO",
  estado: "ACTIVO",
  telefono: "",
  fotoUrl: "",
  nivelEducativo: "PRIMARIA",
  grado: "PRIMERO_PRIMARIA",
  seccion: "A",
  materia: "",
  especialidad: "",
  estadoMatricula: "MATRICULADO",
  pensionPagada: false,
  pensionObservacion: "",
};

export function AcademicoTab({
  usuariosAcademicos,
  setUsuariosAcademicos,
  academicoConfig,
  token,
  isBusy,
  setIsBusy,
  setStatus,
  setErrorMessage,
  runAdminAction,
  cursosActivosPorNivel,
  seccionesActivasPorNivel,
  gradosActivosPorNivel,
  labelAcademico,
}: AcademicoTabProps) {
  const [editingUsuarioAcademico, setEditingUsuarioAcademico] =
    useState<UsuarioAcademico | null>(null);
  const [usuarioAcademicoForm, setUsuarioAcademicoForm] =
    useState<Omit<UsuarioAcademico, "id">>(emptyUsuarioAcademico);
  const [usuarioAcademicoPhotoFile, setUsuarioAcademicoPhotoFile] = useState<File | null>(null);
  const [academicoSearch, setAcademicoSearch] = useState("");
  const [academicoNivelFiltro, setAcademicoNivelFiltro] = useState("TODOS");
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [forceDeleteTarget, setForceDeleteTarget] = useState<{
    id: number;
    name: string;
    message: string;
  } | null>(null);

  const docentes = useMemo(
    () => usuariosAcademicos.filter((u) => u.rol === "DOCENTE"),
    [usuariosAcademicos]
  );
  const alumnos = useMemo(
    () => usuariosAcademicos.filter((u) => u.rol === "ALUMNO"),
    [usuariosAcademicos]
  );

  const usuariosFiltrados = useMemo(() => {
    const term = academicoSearch.trim().toLowerCase();
    return usuariosAcademicos
      .filter((u) => academicoNivelFiltro === "TODOS" || u.nivelEducativo === academicoNivelFiltro)
      .filter(
        (u) =>
          !term ||
          [
            u.codigo,
            u.dni,
            u.nombre,
            u.rol,
            u.nivelEducativo,
            u.grado,
            u.seccion,
            u.materia,
            u.especialidad,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term))
      );
  }, [academicoNivelFiltro, academicoSearch, usuariosAcademicos]);

  const eliminarUsuarioAcademico = async (
    usuario: Pick<UsuarioAcademico, "id" | "nombre">,
    force = false
  ) => {
    setIsBusy(true);
    setStatus(null);
    setErrorMessage(null);
    try {
      await monserratApi.deleteUsuarioAcademico(usuario.id, token, force);
      setUsuariosAcademicos((prev) => prev.filter((item) => item.id !== usuario.id));
      setStatus("Usuario academico eliminado");
      setForceDeleteTarget(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo eliminar el usuario academico";
      if (!force && /datos vinculados|no se puede eliminar|dependencias/i.test(message)) {
        setForceDeleteTarget({ id: usuario.id, name: usuario.nombre, message });
      } else {
        setErrorMessage(message);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const uploadUsuarioAcademicoPhoto = async () => {
    if (!usuarioAcademicoPhotoFile) return usuarioAcademicoForm.fotoUrl ?? "";
    return (await monserratApi.uploadMedia(usuarioAcademicoPhotoFile, "academico", token))
      .secureUrl;
  };

  const submitUsuarioAcademico = (e: FormEvent) => {
    e.preventDefault();
    runAdminAction(async () => {
      const fotoUrl = await uploadUsuarioAcademicoPhoto();
      const payload = { ...usuarioAcademicoForm, fotoUrl };
      if (editingUsuarioAcademico) {
        await monserratApi.updateUsuarioAcademico(editingUsuarioAcademico.id, payload, token);
      } else {
        await monserratApi.createUsuarioAcademico(payload, token);
      }
      setUsuariosAcademicos(await monserratApi.usuariosAcademicos(token));
      setEditingUsuarioAcademico(null);
      setUsuarioAcademicoForm(emptyUsuarioAcademico);
      setUsuarioAcademicoPhotoFile(null);
    }, "Usuario academico guardado");
  };

  const prepararFormularioAcademico = (rol: "ALUMNO" | "DOCENTE", nivel: string) => {
    const primerCurso = cursosActivosPorNivel(nivel)[0] ?? "";
    const primerGrado = gradosActivosPorNivel(nivel)[0] ?? defaultGrado(nivel);
    const primeraSeccion = seccionesActivasPorNivel(nivel)[0] ?? "A";
    setEditingUsuarioAcademico(null);
    setImportSummary(null);
    setUsuarioAcademicoPhotoFile(null);
    setUsuarioAcademicoForm({
      ...emptyUsuarioAcademico,
      rol,
      nivelEducativo: nivel,
      grado: rol === "ALUMNO" ? primerGrado : "",
      seccion: rol === "ALUMNO" ? primeraSeccion : "",
      materia: rol === "DOCENTE" && nivel === "SECUNDARIA" ? primerCurso : "",
      especialidad: rol === "DOCENTE" && nivel === "PRIMARIA" ? "Docente de aula" : "",
    });
  };

  const exportarAlumnosExcel = async () => {
    const XLSX = await import("xlsx");
    const data = alumnos.map((alumno) => ({
      codigo: alumno.codigo ?? "",
      dni: alumno.dni,
      nombre: alumno.nombre,
      nombres: alumno.nombres ?? "",
      apellidos: alumno.apellidos ?? "",
      correo: alumno.correo ?? "",
      telefono: alumno.telefono ?? "",
      nivelEducativo: alumno.nivelEducativo ?? "",
      grado: alumno.grado ?? "",
      seccion: alumno.seccion ?? "",
      estadoMatricula: alumno.estadoMatricula ?? "MATRICULADO",
      pensionPagada: alumno.pensionPagada ? "SI" : "NO",
      pensionObservacion: alumno.pensionObservacion ?? "",
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), "Alumnos");
    XLSX.writeFile(workbook, "alumnos_monserrat.xlsx");
  };

  const descargarPlantillaAlumnos = async () => {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    const rows = [
      {
        codigo: "A-0001",
        dni: "70000001",
        nombre: "Alumno Ejemplo",
        nombres: "Alumno",
        apellidos: "Ejemplo",
        correo: "alumno@correo.com",
        telefono: "999999999",
        nivelEducativo: "PRIMARIA",
        grado: gradosActivosPorNivel("PRIMARIA")[0] ?? "PRIMERO_PRIMARIA",
        seccion: seccionesActivasPorNivel("PRIMARIA")[0] ?? "A",
        estadoMatricula: "MATRICULADO",
        pensionPagada: "NO",
        pensionObservacion: "",
      },
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Alumnos");
    XLSX.writeFile(workbook, "plantilla_alumnos_monserrat.xlsx");
  };

  const importarAlumnosExcel = async (file: File) => {
    setImportSummary(null);
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const existentes = new Set(usuariosAcademicos.map((usuario) => usuario.dni));

    let alumnosCreados = 0;
    let alumnosOmitidos = 0;
    let docentesPrimariaCreados = 0;
    let docentesPrimariaOmitidos = 0;
    let docentesSecundariaCreados = 0;
    let docentesSecundariaOmitidos = 0;

    await runAdminAction(async () => {
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

        const sheetLower = sheetName.trim().toLowerCase().replace(/\s+/g, "_");

        const isDocentePrimariaSheet =
          sheetLower === "docentes_primaria" ||
          /docente.*primaria|primaria.*docente/i.test(sheetName);
        const isDocenteSecundariaSheet =
          sheetLower === "docentes_secundaria" ||
          /docente.*secundaria|secundaria.*docente/i.test(sheetName);
        const isEstudiantesSheet =
          sheetLower === "estudiantes" ||
          sheetLower === "alumnos" ||
          (!isDocentePrimariaSheet &&
            !isDocenteSecundariaSheet &&
            /estudiante|alumno/i.test(sheetName));

        const isEstudiantes =
          isEstudiantesSheet ||
          (workbook.SheetNames.length === 1 &&
            !isDocentePrimariaSheet &&
            !isDocenteSecundariaSheet);
        const isDocentePrimaria = !isEstudiantes && isDocentePrimariaSheet;
        const isDocenteSecundaria = !isEstudiantes && !isDocentePrimaria && isDocenteSecundariaSheet;

        for (const row of rows) {
          const normalize = (s: string) =>
            s
              .trim()
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "");
          const findVal = (keys: string[]): string => {
            const rowKeys = Object.keys(row);
            for (const key of keys) {
              const normKey = normalize(key);
              const matchedKey = rowKeys.find((k) => normalize(k) === normKey);
              if (matchedKey) return String(row[matchedKey] ?? "").trim();
            }
            return "";
          };

          const dni = findVal(["dni", "d.n.i", "documento"]);
          const nombreCompleto = findVal([
            "nombre completo",
            "nombre_completo",
            "nombres y apellidos",
            "apellidos y nombres",
            "nombre",
          ]);

          if (!dni || !nombreCompleto || existentes.has(dni)) {
            if (isEstudiantes) alumnosOmitidos += 1;
            else if (isDocentePrimaria) docentesPrimariaOmitidos += 1;
            else if (isDocenteSecundaria) docentesSecundariaOmitidos += 1;
            continue;
          }

          const nombres_col = findVal(["nombres"]);
          const apellidos_col = findVal(["apellidos", "apellido"]);
          let nombres = nombres_col;
          let apellidos = apellidos_col;
          if (!nombres || !apellidos) {
            const parts = nombreCompleto.split(/\s+/);
            if (parts.length >= 3) {
              apellidos = `${parts[0]} ${parts[1]}`;
              nombres = parts.slice(2).join(" ");
            } else if (parts.length === 2) {
              apellidos = parts[0];
              nombres = parts[1];
            } else {
              nombres = nombreCompleto;
              apellidos = "-";
            }
          }

          const rawCorreo = findVal(["correo", "correo electronico", "email", "e-mail"]);
          const correo = rawCorreo && rawCorreo.includes("@") ? rawCorreo : undefined;
          const telefono = findVal(["telefono", "celular", "movil"]);
          const codigo = findVal(["codigo", "codigo_estudiante", "cod"]);

          if (isEstudiantes) {
            const rawNivel = findVal([
              "nivel(primaria o secundaria)",
              "nivel",
              "nivel educativo",
              "nivel_educativo",
            ]);
            const nivelEducativo = normalizeNivel(rawNivel || "PRIMARIA");
            const rawGrado = findVal(["grado", "grado_academico"]);
            const grado = normalizeGrado(rawGrado, nivelEducativo);
            const seccion = findVal(["seccion", "aula"]).toUpperCase() || "A";

            if (!nivelEducativo || !grado || !seccion) {
              alumnosOmitidos += 1;
              continue;
            }

            await monserratApi.createUsuarioAcademico(
              {
                ...emptyUsuarioAcademico,
                codigo: codigo || dni,
                dni,
                nombre: nombreCompleto,
                nombres,
                apellidos,
                correo,
                telefono,
                rol: "ALUMNO",
                nivelEducativo,
                grado,
                seccion,
                estadoMatricula:
                  findVal(["estado matricula", "estado_matricula", "matricula", "estado"]) ||
                  "MATRICULADO",
                pensionPagada: parseBooleanCell(
                  findVal(["pension", "pension pagada", "pension_pagada", "pagado"])
                ),
                pensionObservacion: findVal([
                  "observacion",
                  "observaciones",
                  "pension observacion",
                  "pension_observacion",
                ]),
              },
              token
            );
            existentes.add(dni);
            alumnosCreados += 1;
          } else if (isDocentePrimaria) {
            await monserratApi.createUsuarioAcademico(
              {
                ...emptyUsuarioAcademico,
                codigo: codigo || dni,
                dni,
                nombre: nombreCompleto,
                nombres,
                apellidos,
                correo,
                telefono,
                rol: "DOCENTE",
                nivelEducativo: "PRIMARIA",
                materia: "",
                especialidad: "PRIMARIA",
              },
              token
            );
            existentes.add(dni);
            docentesPrimariaCreados += 1;
          } else if (isDocenteSecundaria) {
            const rawCurso = findVal(["curso", "materia", "asignatura"]);
            const normalizeCurso = (val: string): string => {
              const raw = val
                .toUpperCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
              if (raw.includes("MATEMATICA")) return "MATEMATICA";
              if (raw.includes("COMUNICACION")) return "COMUNICACION";
              if (raw.includes("CIENCIA") || raw.includes("TECNOLOGIA")) return "CIENCIA_TECNOLOGIA";
              if (raw.includes("HISTORIA")) return "HISTORIA";
              if (raw.includes("INGLES")) return "INGLES";
              return raw;
            };
            const materia = normalizeCurso(rawCurso || "MATEMATICA");

            await monserratApi.createUsuarioAcademico(
              {
                ...emptyUsuarioAcademico,
                codigo: codigo || dni,
                dni,
                nombre: nombreCompleto,
                nombres,
                apellidos,
                correo,
                telefono,
                rol: "DOCENTE",
                nivelEducativo: "SECUNDARIA",
                materia,
                especialidad: "SECUNDARIA",
              },
              token
            );
            existentes.add(dni);
            docentesSecundariaCreados += 1;
          }
        }
      }
      setUsuariosAcademicos(await monserratApi.usuariosAcademicos(token));

      const parts = [];
      if (alumnosCreados > 0 || alumnosOmitidos > 0) {
        parts.push(`${alumnosCreados} alumnos creados (${alumnosOmitidos} omitidos)`);
      }
      if (docentesPrimariaCreados > 0 || docentesPrimariaOmitidos > 0) {
        parts.push(
          `${docentesPrimariaCreados} docentes de primaria creados (${docentesPrimariaOmitidos} omitidos)`
        );
      }
      if (docentesSecundariaCreados > 0 || docentesSecundariaOmitidos > 0) {
        parts.push(
          `${docentesSecundariaCreados} docentes de secundaria creados (${docentesSecundariaOmitidos} omitidos)`
        );
      }
      setImportSummary(
        `Importación completada: ${parts.join(", ") || "ningún registro importado"}.`
      );
    }, "Importación completada con éxito");
  };

  const handleEditClick = (u: UsuarioAcademico) => {
    setEditingUsuarioAcademico(u);
    setUsuarioAcademicoForm({ ...u });
    setUsuarioAcademicoPhotoFile(null);
  };

  const usuarioAcademicoPhotoPreview = usuarioAcademicoPhotoFile
    ? URL.createObjectURL(usuarioAcademicoPhotoFile)
    : usuarioAcademicoForm.fotoUrl;

  return (
    <div className="grid gap-5">
      <ConfirmForceDeleteModal
        isOpen={Boolean(forceDeleteTarget)}
        title={forceDeleteTarget?.name ?? "Usuario academico"}
        message={forceDeleteTarget?.message ?? ""}
        onClose={() => setForceDeleteTarget(null)}
        onForceDelete={() => {
          if (!forceDeleteTarget) return;
          void eliminarUsuarioAcademico(
            { id: forceDeleteTarget.id, nombre: forceDeleteTarget.name },
            true
          );
        }}
      />

      <div className="grid gap-5 xl:grid-cols-[430px_1fr] items-start">

        {/* IZQUIERDA: formulario */}
        <form
          onSubmit={submitUsuarioAcademico}
          className="grid content-start gap-4 rounded-[18px] border border-monserrat-ink/8 bg-white p-2 shadow-sm overflow-y-auto max-h-[calc(100vh-120px)] admin-table-scroll"
        >
          <div className="flex items-start justify-between gap-3">
            <div>

              <h4 className="mt-1 font-serif text-[20px] font-black text-monserrat-ink">
                {editingUsuarioAcademico ? "Editar usuario" : "Agregar alumno o docente"}
              </h4>
            </div>
            {editingUsuarioAcademico && (
              <button
                type="button"
                onClick={() => prepararFormularioAcademico("ALUMNO", "PRIMARIA")}
                className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-monserrat-ink/12 text-monserrat-ink/55 hover:border-monserrat-ink/30"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              {(["ALUMNO", "DOCENTE"] as const).map((rol) => (
                <button
                  key={rol}
                  type="button"
                  onClick={() =>
                    prepararFormularioAcademico(rol, usuarioAcademicoForm.nivelEducativo ?? "PRIMARIA")
                  }
                  className={`flex items-center justify-center gap-2 rounded-[10px] border px-3 py-2.5 text-[12px] font-black transition ${usuarioAcademicoForm.rol === rol
                    ? "border-monserrat-red bg-monserrat-red text-white"
                    : "border-monserrat-ink/10 bg-monserrat-cream/45 text-monserrat-ink/65 hover:border-monserrat-ink/25"
                    }`}
                >
                  {rol === "ALUMNO" ? <Users size={14} /> : <GraduationCap size={14} />}
                  {rol === "ALUMNO" ? "Alumno" : "Docente"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {NIVELES.map((nivel) => (
                <button
                  key={nivel}
                  type="button"
                  onClick={() =>
                    prepararFormularioAcademico(
                      usuarioAcademicoForm.rol === "DOCENTE" ? "DOCENTE" : "ALUMNO",
                      nivel
                    )
                  }
                  className={`rounded-[10px] border px-3 py-2 text-[12px] font-black transition ${usuarioAcademicoForm.nivelEducativo === nivel
                    ? "border-monserrat-ink bg-monserrat-ink text-white"
                    : "border-monserrat-ink/10 bg-white text-monserrat-ink/60 hover:border-monserrat-ink/25"
                    }`}
                >
                  {labelFromEnum(nivel)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-1 sm:grid-cols-2">
            <AdminField label="DNI">
              <input
                value={usuarioAcademicoForm.dni}
                onChange={(e) =>
                  setUsuarioAcademicoForm({ ...usuarioAcademicoForm, dni: e.target.value })
                }
                className="admin-input"
                required
                disabled={Boolean(editingUsuarioAcademico)}
              />
            </AdminField>
            <AdminField label="Codigo">
              <input
                value={usuarioAcademicoForm.codigo ?? ""}
                onChange={(e) =>
                  setUsuarioAcademicoForm({ ...usuarioAcademicoForm, codigo: e.target.value })
                }
                className="admin-input"
              />
            </AdminField>
            <AdminField label="Nombre completo" className="sm:col-span-2">
              <input
                value={usuarioAcademicoForm.nombre}
                onChange={(e) =>
                  setUsuarioAcademicoForm({ ...usuarioAcademicoForm, nombre: e.target.value })
                }
                className="admin-input"
                required
              />
            </AdminField>
            <AdminField label="Correo">
              <input
                type="email"
                value={usuarioAcademicoForm.correo ?? ""}
                onChange={(e) =>
                  setUsuarioAcademicoForm({ ...usuarioAcademicoForm, correo: e.target.value })
                }
                className="admin-input"
              />
            </AdminField>
            <AdminField label="Telefono">
              <input
                value={usuarioAcademicoForm.telefono ?? ""}
                onChange={(e) =>
                  setUsuarioAcademicoForm({ ...usuarioAcademicoForm, telefono: e.target.value })
                }
                className="admin-input"
              />
            </AdminField>
          </div>

          <MediaPicker
            label="Foto del usuario"
            accept="image/*"
            previewUrl={usuarioAcademicoPhotoPreview}
            previewType="image"
            onFileChange={setUsuarioAcademicoPhotoFile}
          />

          {usuarioAcademicoForm.rol === "ALUMNO" ? (
            <div className="grid gap-3 rounded-[12px] border border-monserrat-ink/8 bg-monserrat-cream/35 p-3 sm:grid-cols-2">
              <AdminField label="Grado">
                <select
                  value={
                    usuarioAcademicoForm.grado ??
                    defaultGrado(usuarioAcademicoForm.nivelEducativo ?? "PRIMARIA")
                  }
                  onChange={(e) =>
                    setUsuarioAcademicoForm({ ...usuarioAcademicoForm, grado: e.target.value })
                  }
                  className="admin-input"
                >
                  {gradosActivosPorNivel(usuarioAcademicoForm.nivelEducativo).map((grado) => (
                    <option key={grado} value={grado}>
                      {labelAcademico(grado)}
                    </option>
                  ))}
                </select>
              </AdminField>
              <AdminField label="Seccion">
                <select
                  value={usuarioAcademicoForm.seccion ?? "A"}
                  onChange={(e) =>
                    setUsuarioAcademicoForm({ ...usuarioAcademicoForm, seccion: e.target.value })
                  }
                  className="admin-input"
                >
                  {seccionesActivasPorNivel(usuarioAcademicoForm.nivelEducativo).map((seccion) => (
                    <option key={seccion} value={seccion}>
                      {labelAcademico(seccion)}
                    </option>
                  ))}
                </select>
              </AdminField>
              <AdminField label="Estado matricula">
                <select
                  value={usuarioAcademicoForm.estadoMatricula ?? "MATRICULADO"}
                  onChange={(e) =>
                    setUsuarioAcademicoForm({
                      ...usuarioAcademicoForm,
                      estadoMatricula: e.target.value,
                    })
                  }
                  className="admin-input"
                >
                  {ESTADOS_MATRICULA.map((estado) => (
                    <option key={estado} value={estado}>
                      {labelFromEnum(estado)}
                    </option>
                  ))}
                </select>
              </AdminField>
              <label className="flex items-center gap-2 rounded-[10px] bg-white px-3 py-2 text-[12px] font-bold text-monserrat-ink/65">
                <input
                  type="checkbox"
                  checked={Boolean(usuarioAcademicoForm.pensionPagada)}
                  onChange={(e) =>
                    setUsuarioAcademicoForm({
                      ...usuarioAcademicoForm,
                      pensionPagada: e.target.checked,
                    })
                  }
                />
                Pension pagada
              </label>
            </div>
          ) : (
            <div className="grid gap-3 rounded-[12px] border border-monserrat-ink/8 bg-monserrat-cream/35 p-3 sm:grid-cols-2">
              {usuarioAcademicoForm.nivelEducativo === "SECUNDARIA" && (
                <AdminField label="Curso que ensena">
                  <select
                    value={usuarioAcademicoForm.materia ?? ""}
                    onChange={(e) =>
                      setUsuarioAcademicoForm({ ...usuarioAcademicoForm, materia: e.target.value })
                    }
                    className="admin-input"
                  >
                    {cursosActivosPorNivel("SECUNDARIA").map((curso) => (
                      <option key={curso} value={curso}>
                        {labelAcademico(curso)}
                      </option>
                    ))}
                  </select>
                </AdminField>
              )}
              <AdminField
                label={
                  usuarioAcademicoForm.nivelEducativo === "PRIMARIA"
                    ? "Rol en primaria"
                    : "Especialidad"
                }
                className={
                  usuarioAcademicoForm.nivelEducativo === "PRIMARIA" ? "sm:col-span-2" : ""
                }
              >
                <input
                  value={usuarioAcademicoForm.especialidad ?? ""}
                  onChange={(e) =>
                    setUsuarioAcademicoForm({
                      ...usuarioAcademicoForm,
                      especialidad: e.target.value,
                    })
                  }
                  className="admin-input"
                  placeholder={
                    usuarioAcademicoForm.nivelEducativo === "PRIMARIA"
                      ? "Docente de aula"
                      : "Especialidad del docente"
                  }
                />
              </AdminField>
            </div>
          )}

          <details className="rounded-[12px] border border-monserrat-ink/8 bg-monserrat-cream/20 p-3">
            <summary className="cursor-pointer text-[11px] font-black uppercase tracking-[0.08em] text-monserrat-ink/50">
              Datos adicionales
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <AdminField label="Nombres">
                <input
                  value={usuarioAcademicoForm.nombres ?? ""}
                  onChange={(e) =>
                    setUsuarioAcademicoForm({ ...usuarioAcademicoForm, nombres: e.target.value })
                  }
                  className="admin-input"
                />
              </AdminField>
              <AdminField label="Apellidos">
                <input
                  value={usuarioAcademicoForm.apellidos ?? ""}
                  onChange={(e) =>
                    setUsuarioAcademicoForm({ ...usuarioAcademicoForm, apellidos: e.target.value })
                  }
                  className="admin-input"
                />
              </AdminField>
              <AdminField label="Nacimiento">
                <input
                  type="date"
                  value={usuarioAcademicoForm.fechaNacimiento ?? ""}
                  onChange={(e) =>
                    setUsuarioAcademicoForm({
                      ...usuarioAcademicoForm,
                      fechaNacimiento: e.target.value,
                    })
                  }
                  className="admin-input"
                />
              </AdminField>
              <AdminField label="Direccion">
                <input
                  value={usuarioAcademicoForm.direccion ?? ""}
                  onChange={(e) =>
                    setUsuarioAcademicoForm({ ...usuarioAcademicoForm, direccion: e.target.value })
                  }
                  className="admin-input"
                />
              </AdminField>
              {usuarioAcademicoForm.rol === "ALUMNO" && (
                <AdminField label="Observacion pension" className="sm:col-span-2">
                  <textarea
                    value={usuarioAcademicoForm.pensionObservacion ?? ""}
                    onChange={(e) =>
                      setUsuarioAcademicoForm({
                        ...usuarioAcademicoForm,
                        pensionObservacion: e.target.value,
                      })
                    }
                    className="admin-input"
                  />
                </AdminField>
              )}
            </div>
          </details>

          <button
            disabled={isBusy}
            className="flex items-center justify-center gap-1.5 rounded-[10px] bg-monserrat-red py-2.5 text-[12px] font-black text-white transition hover:bg-monserrat-red/85 disabled:opacity-60"
          >
            {editingUsuarioAcademico ? (
              <>
                <Save size={13} /> Guardar cambios
              </>
            ) : (
              <>
                <UserPlus size={13} /> Crear registro
              </>
            )}
          </button>
          <p className="text-[11px] font-semibold leading-5 text-monserrat-ink/45">
            La contrasena inicial sera el mismo DNI y se pedira cambiarla en el primer ingreso.
          </p>
        </form>

        {/* DERECHA: métricas + panel tabla */}
        <div className="grid gap-5">

          {/* Métricas */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AdminMetric icon={<Users size={18} />} label="Alumnos" value={String(alumnos.length)} />
            <AdminMetric
              icon={<GraduationCap size={18} />}
              label="Docentes"
              value={String(docentes.length)}
            />
            <AdminMetric
              icon={<School size={18} />}
              label="Primaria"
              value={String(alumnos.filter((u) => u.nivelEducativo === "PRIMARIA").length)}
            />
            <AdminMetric
              icon={<BookOpen size={18} />}
              label="Secundaria"
              value={String(alumnos.filter((u) => u.nivelEducativo === "SECUNDARIA").length)}
            />
          </div>

          {/* Panel búsqueda + tabla */}
          <div className="grid gap-4">
            <div className="grid gap-3 rounded-[16px] border border-monserrat-ink/8 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">
                    Padron academico
                  </p>
                  <p className="mt-1 text-sm font-black text-monserrat-ink">
                    Alumnos y docentes registrados
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void descargarPlantillaAlumnos()}
                    className="inline-flex items-center gap-1.5 rounded-[9px] border border-monserrat-ink/12 px-2.5 py-1.5 text-[11px] font-black text-monserrat-ink/65 hover:border-monserrat-ink/30"
                  >
                    <FileSpreadsheet size={14} /> Plantilla
                  </button>
                  <button
                    type="button"
                    onClick={() => void exportarAlumnosExcel()}
                    className="inline-flex items-center gap-1.5 rounded-[9px] border border-monserrat-ink/12 px-2.5 py-1.5 text-[11px] font-black text-monserrat-ink/65 hover:border-monserrat-ink/30"
                  >
                    <Download size={14} /> Exportar alumnos
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] bg-monserrat-ink px-2.5 py-1.5 text-[11px] font-black text-white hover:bg-monserrat-ink/90">
                    <Upload size={14} /> Importar alumnos
                    <input
                      type="file"
                      accept=".csv,.xls,.xlsx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void importarAlumnosExcel(file);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-[1fr_170px]">
                <AdminField label="Buscar usuario">
                  <input
                    value={academicoSearch}
                    onChange={(e) => setAcademicoSearch(e.target.value)}
                    className="admin-input"
                    placeholder="Nombre, DNI, aula o curso"
                  />
                </AdminField>
                <AdminField label="Nivel">
                  <select
                    value={academicoNivelFiltro}
                    onChange={(e) => setAcademicoNivelFiltro(e.target.value)}
                    className="admin-input"
                  >
                    <option value="TODOS">Todos</option>
                    {NIVELES.map((nivel) => (
                      <option key={nivel} value={nivel}>
                        {labelFromEnum(nivel)}
                      </option>
                    ))}
                  </select>
                </AdminField>
              </div>
              {importSummary && (
                <p className="rounded-[10px] bg-emerald-50 px-3 py-2 text-[12px] font-bold text-emerald-700">
                  {importSummary}
                </p>
              )}
            </div>

            <AdminTable
              headers={["Codigo", "Nombre", "Rol", "Estado", "Detalle"]}
              rows={usuariosFiltrados.map((u) => ({
                id: u.id,
                values: [
                  u.codigo || u.dni,
                  u.nombre,
                  labelFromEnum(u.rol),
                  labelFromEnum(u.estado ?? ""),
                  u.rol === "DOCENTE"
                    ? `${labelFromEnum(u.nivelEducativo ?? "")} ${u.materia ? `- ${labelAcademico(u.materia)}` : "- Aula primaria"
                      }`.trim()
                    : `${labelFromEnum(u.nivelEducativo ?? "")} - ${labelAcademico(
                      u.grado ?? ""
                    )} ${u.seccion ?? ""}`.trim(),
                ],
                onEdit: () => handleEditClick(u),
                onDelete: () => void eliminarUsuarioAcademico(u),
              }))}
              className="bg-white shadow-sm"
              bodyClassName="max-h-[600px] overflow-auto admin-table-scroll"
            />
          </div>

        </div>
      </div>
    </div>
  );
}
