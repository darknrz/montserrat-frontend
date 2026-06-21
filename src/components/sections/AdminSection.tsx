import { BookOpen, CreditCard, Download, Edit3, FileSpreadsheet, GraduationCap, ImagePlus, LogOut, Plus, Save, School, ShieldCheck, Trash2, Upload, UserPlus, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { monserratApi } from "../../api/monserrat";
import type { AsignacionAcademica, Ingresante, Institution, LoginResponse, PensionMensual, RedSocial, UsuarioAcademico, Video } from "../../types";
import { SectionHeader } from "../ui/SectionHeader";

// ── Constante tipos de ingreso ──────────────────────────────
const TIPOS_SELECCION = ["Ordinario", "Primera Selección", "Ingreso Especial"] as const;
type TipoSeleccion = typeof TIPOS_SELECCION[number];

const YEARS = ["2025", "2024", "2023", "2022", "2021"];
const NIVELES = ["PRIMARIA", "SECUNDARIA"];
const GRADOS_PRIMARIA = ["PRIMERO_PRIMARIA", "SEGUNDO_PRIMARIA", "TERCERO_PRIMARIA", "CUARTO_PRIMARIA", "QUINTO_PRIMARIA", "SEXTO_PRIMARIA"];
const GRADOS_SECUNDARIA = ["PRIMERO_SECUNDARIA", "SEGUNDO_SECUNDARIA", "TERCERO_SECUNDARIA", "CUARTO_SECUNDARIA", "QUINTO_SECUNDARIA"];
const SECCIONES = ["A", "B", "C", "D"];
const CURSOS = ["MATEMATICA", "COMUNICACION", "CIENCIA_TECNOLOGIA", "HISTORIA", "INGLES"];
const ESTADOS_USUARIO = ["ACTIVO", "INACTIVO", "SUSPENDIDO"];
const ESTADOS_MATRICULA = ["MATRICULADO", "RETIRADO", "TRASLADADO", "EGRESADO"];
const MESES_PENSION = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];

type AdminSectionProps = {
  institution: Institution;
  ingresantes: Ingresante[];
  videos: Video[];
  redes: RedSocial[];
  onRefresh: () => Promise<void>;
};

type Tab = "institucion" | "ingresantes" | "videos" | "redes" | "academico" | "asignaciones" | "pensiones" | "configuracion";
type CatalogItem = { id: string; label: string; active: boolean };
type SalonItem = { nivel: string; grado: string; seccion: string; aula: string; active: boolean };
type ConfigView = "primaria-cursos" | "primaria-grados" | "primaria-secciones" | "primaria-salones" | "secundaria-cursos" | "secundaria-grados" | "secundaria-secciones" | "secundaria-salones";
type AcademicoConfig = {
  cursosPrimaria: CatalogItem[];
  cursosSecundaria: CatalogItem[];
  gradosPrimaria: CatalogItem[];
  gradosSecundaria: CatalogItem[];
  seccionesPrimaria: CatalogItem[];
  seccionesSecundaria: CatalogItem[];
  salones: SalonItem[];
};

const ADMIN_TAB_STORAGE_KEY = "monserrat_admin_active_tab";

const defaultAcademicoConfig: AcademicoConfig = {
  cursosPrimaria: [
    "MATEMATICA",
    "COMUNICACION",
    "CIENCIA_TECNOLOGIA",
    "ARTE_CULTURA",
    "PERSONAL_SOCIAL",
    "EDUCACION_FISICA"
  ].map((id) => ({ id, label: labelFromEnum(id), active: true })),
  cursosSecundaria: CURSOS.map((id) => ({ id, label: labelFromEnum(id), active: true })),
  gradosPrimaria: GRADOS_PRIMARIA.map((id) => ({ id, label: labelFromEnum(id), active: true })),
  gradosSecundaria: GRADOS_SECUNDARIA.map((id) => ({ id, label: labelFromEnum(id), active: true })),
  seccionesPrimaria: SECCIONES.map((id) => ({ id, label: id, active: true })),
  seccionesSecundaria: SECCIONES.map((id) => ({ id, label: id, active: true })),
  salones: [...GRADOS_PRIMARIA.map((grado) => ({ nivel: "PRIMARIA", grado })), ...GRADOS_SECUNDARIA.map((grado) => ({ nivel: "SECUNDARIA", grado }))]
    .flatMap(({ nivel, grado }) => SECCIONES.map((seccion) => ({ nivel, grado, seccion, aula: aulaPorGradoSeccion(nivel, grado, seccion), active: true })))
};

const emptyIngresante: Omit<Ingresante, "id"> = {
  nombre: "", universidad: "", universidadSiglas: "",
  carrera: "", anio: "2025",
  tipoSeleccion: "Ordinario",
  fotoUrl: "", activo: true,
};

const emptyVideo: Omit<Video, "id"> = {
  titulo: "", descripcion: "", mediaType: "image", mediaUrl: "",
  publicId: "", thumbnailUrl: "", formato: "",
  tag: "Institucional", tagColor: "red", activo: true, orden: 1,
};

const emptyRed: Omit<RedSocial, "id"> = {
  nombre: "", icono: "", url: "", activo: true, orden: 1,
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
  pensionObservacion: ""
};

const emptyAsignacion: Omit<AsignacionAcademica, "id" | "docenteId" | "docenteNombre" | "alumnoId" | "alumnoNombre" | "createdAt" | "updatedAt"> = {
  docenteDni: "",
  alumnoDni: "",
  curso: "MATEMATICA",
  nivelEducativo: "PRIMARIA",
  grado: "PRIMERO_PRIMARIA",
  seccion: "A",
  activo: true
};

export function AdminSection({ institution, ingresantes, videos, redes, onRefresh }: AdminSectionProps) {
  const [session, setSession] = useState<LoginResponse | null>(() => {
    const stored = window.localStorage.getItem("monserrat_admin_session");
    return stored ? (JSON.parse(stored) as LoginResponse) : null;
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<Tab>(() => {
    const stored = window.localStorage.getItem(ADMIN_TAB_STORAGE_KEY);
    return isAdminTab(stored) ? stored : "ingresantes";
  });
  const [status, setStatus] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // filtros tabla ingresantes
  const [filterYear, setFilterYear] = useState("");
  const [filterSel, setFilterSel] = useState("");
  const [academicoSearch, setAcademicoSearch] = useState("");
  const [academicoNivelFiltro, setAcademicoNivelFiltro] = useState("TODOS");
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [pensiones, setPensiones] = useState<PensionMensual[]>([]);
  const [pensionYear, setPensionYear] = useState(new Date().getFullYear());
  const [pensionSearch, setPensionSearch] = useState("");
  const [aulaNumero, setAulaNumero] = useState("101");
  const [tutorSecundariaDni, setTutorSecundariaDni] = useState("");
  const [configView, setConfigView] = useState<ConfigView>("primaria-cursos");
  const [academicoConfig, setAcademicoConfig] = useState<AcademicoConfig>(defaultAcademicoConfig);

  const [editingIngresante, setEditingIngresante] = useState<Ingresante | null>(null);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editingRed, setEditingRed] = useState<RedSocial | null>(null);
  const [editingUsuarioAcademico, setEditingUsuarioAcademico] = useState<UsuarioAcademico | null>(null);
  const [editingAsignacionAcademica, setEditingAsignacionAcademica] = useState<AsignacionAcademica | null>(null);

  const [institutionForm, setInstitutionForm] = useState<Institution>(institution);
  const [ingresanteForm, setIngresanteForm] = useState<Omit<Ingresante, "id">>(emptyIngresante);
  const [videoForm, setVideoForm] = useState<Omit<Video, "id">>(emptyVideo);
  const [redForm, setRedForm] = useState<Omit<RedSocial, "id">>(emptyRed);
  const [usuariosAcademicos, setUsuariosAcademicos] = useState<UsuarioAcademico[]>([]);
  const [usuarioAcademicoForm, setUsuarioAcademicoForm] = useState<Omit<UsuarioAcademico, "id">>(emptyUsuarioAcademico);
  const [asignacionesAcademicas, setAsignacionesAcademicas] = useState<AsignacionAcademica[]>([]);
  const [asignacionAcademicaForm, setAsignacionAcademicaForm] = useState(emptyAsignacion);

  const [institutionLogoFile, setInstitutionLogoFile] = useState<File | null>(null);
  const [ingresantePhotoFile, setIngresantePhotoFile] = useState<File | null>(null);
  const [usuarioAcademicoPhotoFile, setUsuarioAcademicoPhotoFile] = useState<File | null>(null);
  const [videoMediaFile, setVideoMediaFile] = useState<File | null>(null);

  const token = session?.token ?? "";
  const isAdmin = session?.rol === "ADMIN";

  useEffect(() => {
    if (session && !isAdmin) {
      window.localStorage.removeItem("monserrat_admin_session");
      setSession(null);
      setStatus("Este acceso es solo para administradores");
    }
  }, [isAdmin, session]);

  useEffect(() => {
    if (!token) return;
    void Promise.all([monserratApi.usuariosAcademicos(token), monserratApi.asignacionesAcademicas(token)])
      .then(([usuariosData, asignacionesData]) => {
        setUsuariosAcademicos(usuariosData);
        setAsignacionesAcademicas(asignacionesData);
      })
      .catch((error: unknown) => setStatus(error instanceof Error ? error.message : "No se pudieron cargar datos academicos"));
  }, [token]);

  const sortedIngresantes = useMemo(() =>
    [...ingresantes].sort((a, b) => Number(b.anio) - Number(a.anio) || b.id - a.id),
    [ingresantes]
  );

  const filteredIngresantes = useMemo(() =>
    sortedIngresantes.filter((i) => {
      const matchYear = !filterYear || i.anio === filterYear;
      const matchSel  = !filterSel  || i.tipoSeleccion === filterSel;
      return matchYear && matchSel;
    }),
    [sortedIngresantes, filterYear, filterSel]
  );

  useEffect(() => { setInstitutionForm(institution); }, [institution]);

  useEffect(() => {
    window.localStorage.setItem(ADMIN_TAB_STORAGE_KEY, tab);
  }, [tab]);

  useEffect(() => {
    if (!token) return;
    void monserratApi.academicoConfiguracion<AcademicoConfig>(token)
      .then((config) => setAcademicoConfig(mergeAcademicoConfig(config)))
      .catch((error: unknown) => setStatus(error instanceof Error ? error.message : "No se pudo cargar la configuracion academica"));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void monserratApi.pensionesAcademicas(pensionYear, token)
      .then(setPensiones)
      .catch((error: unknown) => setStatus(error instanceof Error ? error.message : "No se pudo cargar pensiones"));
  }, [pensionYear, token]);

  const runAdminAction = async (action: () => Promise<void>, successMessage: string) => {
    setIsBusy(true); setStatus(null);
    try { await action(); await onRefresh(); setStatus(successMessage); }
    catch (e) { setStatus(e instanceof Error ? e.message : "Error al completar la operación"); }
    finally { setIsBusy(false); }
  };

  const logout = () => {
    window.localStorage.removeItem("monserrat_admin_session");
    window.location.href = "/portal";
  };

  // uploads
  const uploadLogo = async () => {
    if (!institutionLogoFile) return institutionForm.logoUrl ?? "";
    return (await monserratApi.uploadMedia(institutionLogoFile, "institution", token)).secureUrl;
  };
  const uploadPhoto = async () => {
    if (!ingresantePhotoFile) return ingresanteForm.fotoUrl ?? "";
    return (await monserratApi.uploadMedia(ingresantePhotoFile, "ingresantes", token)).secureUrl;
  };
  const uploadUsuarioAcademicoPhoto = async () => {
    if (!usuarioAcademicoPhotoFile) return usuarioAcademicoForm.fotoUrl ?? "";
    return (await monserratApi.uploadMedia(usuarioAcademicoPhotoFile, "academico", token)).secureUrl;
  };
  const uploadVideoMedia = async () => {
    if (!videoMediaFile) {
      if (!videoForm.mediaUrl || !videoForm.publicId) throw new Error("Sube una imagen o video.");
      return { mediaType: videoForm.mediaType, mediaUrl: videoForm.mediaUrl, publicId: videoForm.publicId, thumbnailUrl: videoForm.thumbnailUrl ?? videoForm.mediaUrl, formato: videoForm.formato ?? "" };
    }
    const u = await monserratApi.uploadMedia(videoMediaFile, "carousel", token);
    return { mediaType: u.resourceType, mediaUrl: u.secureUrl, publicId: u.publicId, thumbnailUrl: u.thumbnailUrl ?? u.secureUrl, formato: u.format ?? "" };
  };

  const submitIngresante = (e: FormEvent) => {
    e.preventDefault();
    void runAdminAction(async () => {
      const fotoUrl = await uploadPhoto();
      const payload = { ...ingresanteForm, fotoUrl };
      editingIngresante
        ? await monserratApi.updateIngresante(editingIngresante.id, payload, token)
        : await monserratApi.createIngresante(payload, token);
      setEditingIngresante(null); setIngresanteForm(emptyIngresante); setIngresantePhotoFile(null);
    }, "Ingresante guardado correctamente");
  };

  const submitVideo = (e: FormEvent) => {
    e.preventDefault();
    void runAdminAction(async () => {
      const media = await uploadVideoMedia();
      const payload = { ...videoForm, ...media };
      editingVideo
        ? await monserratApi.updateVideo(editingVideo.id, payload, token)
        : await monserratApi.createVideo(payload, token);
      if (videoMediaFile && editingVideo?.publicId && editingVideo.publicId !== media.publicId)
        await monserratApi.deleteMedia(editingVideo.publicId, editingVideo.mediaType, token);
      setEditingVideo(null); setVideoForm(emptyVideo); setVideoMediaFile(null);
    }, "Medio guardado correctamente");
  };

  const submitRed = (e: FormEvent) => {
    e.preventDefault();
    void runAdminAction(async () => {
      editingRed
        ? await monserratApi.updateRedSocial(editingRed.id, redForm, token)
        : await monserratApi.createRedSocial(redForm, token);
      setEditingRed(null); setRedForm(emptyRed);
    }, "Red social guardada");
  };

  const submitInstitution = (e: FormEvent) => {
    e.preventDefault();
    void runAdminAction(async () => {
      const logoUrl = await uploadLogo();
      await monserratApi.updateInstitution(institutionForm.id ?? 1, { ...institutionForm, logoUrl }, token);
      setInstitutionLogoFile(null);
    }, "Datos institucionales actualizados");
  };

  const submitUsuarioAcademico = (e: FormEvent) => {
    e.preventDefault();
    void runAdminAction(async () => {
      const fotoUrl = await uploadUsuarioAcademicoPhoto();
      const payload = { ...usuarioAcademicoForm, fotoUrl };
      editingUsuarioAcademico
        ? await monserratApi.updateUsuarioAcademico(editingUsuarioAcademico.id, payload, token)
        : await monserratApi.createUsuarioAcademico(payload, token);
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
      pensionObservacion: alumno.pensionObservacion ?? ""
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
        pensionObservacion: ""
      }
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Alumnos");
    XLSX.writeFile(workbook, "plantilla_alumnos_monserrat.xlsx");
  };

  const importarAlumnosExcel = async (file: File) => {
    setImportSummary(null);
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    const existentes = new Set(usuariosAcademicos.map((usuario) => usuario.dni));
    let creados = 0;
    let omitidos = 0;

    await runAdminAction(async () => {
      for (const row of rows) {
        const dni = String(row.dni ?? row.DNI ?? "").trim();
        const nombre = String(row.nombre ?? row.Nombre ?? "").trim();
        const nivelEducativo = normalizeNivel(row.nivelEducativo ?? row.nivel ?? row.Nivel);
        const grado = normalizeGrado(row.grado ?? row.Grado, nivelEducativo);
        const seccion = String(row.seccion ?? row.Seccion ?? row["sección"] ?? "").trim().toUpperCase();

        if (!dni || !nombre || !nivelEducativo || !grado || !seccion || existentes.has(dni)) {
          omitidos += 1;
          continue;
        }

        await monserratApi.createUsuarioAcademico({
          ...emptyUsuarioAcademico,
          codigo: String(row.codigo ?? row.Codigo ?? row["código"] ?? dni).trim(),
          dni,
          nombre,
          nombres: String(row.nombres ?? row.Nombres ?? "").trim(),
          apellidos: String(row.apellidos ?? row.Apellidos ?? "").trim(),
          correo: String(row.correo ?? row.Correo ?? "").trim(),
          telefono: String(row.telefono ?? row.Telefono ?? row["teléfono"] ?? "").trim(),
          rol: "ALUMNO",
          nivelEducativo,
          grado,
          seccion,
          estadoMatricula: String(row.estadoMatricula ?? row.EstadoMatricula ?? "MATRICULADO").trim() || "MATRICULADO",
          pensionPagada: parseBooleanCell(row.pensionPagada ?? row.PensionPagada),
          pensionObservacion: String(row.pensionObservacion ?? row.PensionObservacion ?? "").trim()
        }, token);
        existentes.add(dni);
        creados += 1;
      }
      setUsuariosAcademicos(await monserratApi.usuariosAcademicos(token));
      setImportSummary(`${creados} alumnos importados. ${omitidos} filas omitidas.`);
    }, "Importacion de alumnos completada");
  };

  const actualizarPensionMensual = (pension: PensionMensual, pagada: boolean) => {
    void runAdminAction(async () => {
      const saved = await monserratApi.updatePensionAcademica({
        alumnoDni: pension.alumnoDni,
        anio: pensionYear,
        mes: pension.mes,
        pagada,
        observacion: pension.observacion ?? ""
      }, token);
      setPensiones((current) => current.map((item) =>
        item.alumnoDni === saved.alumnoDni && item.anio === saved.anio && item.mes === saved.mes ? saved : item
      ));
    }, pagada ? "Pension marcada como pagada" : "Pension marcada como pendiente");
  };

  const exportarPensionesExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = alumnosConPensiones.map(({ alumno, meses }) => ({
      codigo: alumno.codigo ?? "",
      dni: alumno.dni,
      alumno: alumno.nombre,
      nivel: labelFromEnum(alumno.nivelEducativo ?? ""),
      grado: labelFromEnum(alumno.grado ?? ""),
      seccion: alumno.seccion ?? "",
      ...Object.fromEntries(MESES_PENSION.map((mes, index) => [mes, meses[index + 1]?.pagada ? "PAGADO" : "PENDIENTE"])),
      pagados: MESES_PENSION.filter((_, index) => meses[index + 1]?.pagada).length,
      pendientes: MESES_PENSION.filter((_, index) => !meses[index + 1]?.pagada).length
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), `Pensiones ${pensionYear}`);
    XLSX.writeFile(workbook, `pensiones_monserrat_${pensionYear}.xlsx`);
  };

  const submitAsignacionAcademica = (e: FormEvent) => {
    e.preventDefault();
    void runAdminAction(async () => {
      const nivelEducativo = asignacionAcademicaForm.nivelEducativo ?? "PRIMARIA";
      if (editingAsignacionAcademica) {
        await monserratApi.updateAsignacionAcademica(editingAsignacionAcademica.id, {
          docenteDni: asignacionAcademicaForm.docenteDni,
          alumnoDni: asignacionAcademicaForm.alumnoDni,
          curso: asignacionAcademicaForm.curso,
          nivelEducativo,
          grado: asignacionAcademicaForm.grado ?? "",
          seccion: asignacionAcademicaForm.seccion ?? "",
          activo: asignacionAcademicaForm.activo
        }, token);
      } else {
        await monserratApi.createAsignacionAula({
          docenteDni: asignacionAcademicaForm.docenteDni,
          curso: nivelEducativo === "SECUNDARIA" ? asignacionAcademicaForm.curso : undefined,
          nivelEducativo,
          grado: asignacionAcademicaForm.grado ?? "",
          seccion: asignacionAcademicaForm.seccion ?? "",
          activo: asignacionAcademicaForm.activo
        }, token);
      }
      setAsignacionesAcademicas(await monserratApi.asignacionesAcademicas(token));
      setEditingAsignacionAcademica(null);
      setAsignacionAcademicaForm(emptyAsignacion);
    }, "Asignacion academica guardada");
  };

  const institutionLogoPreview = institutionLogoFile ? URL.createObjectURL(institutionLogoFile) : institutionForm.logoUrl;
  const ingresantePhotoPreview = ingresantePhotoFile ? URL.createObjectURL(ingresantePhotoFile) : ingresanteForm.fotoUrl;
  const usuarioAcademicoPhotoPreview = usuarioAcademicoPhotoFile ? URL.createObjectURL(usuarioAcademicoPhotoFile) : usuarioAcademicoForm.fotoUrl;
  const videoPreview = videoMediaFile
    ? { src: URL.createObjectURL(videoMediaFile), type: videoMediaFile.type.startsWith("video/") ? "video" : "image" }
    : { src: videoForm.thumbnailUrl || videoForm.mediaUrl, type: videoForm.mediaType };
  const cursosPrimariaActivos = useMemo(() => academicoConfig.cursosPrimaria.filter((item) => item.active).map((item) => item.id), [academicoConfig.cursosPrimaria]);
  const cursosSecundariaActivos = useMemo(() => academicoConfig.cursosSecundaria.filter((item) => item.active).map((item) => item.id), [academicoConfig.cursosSecundaria]);
  const cursosActivosPorNivel = (nivel?: string) => nivel === "SECUNDARIA" ? cursosSecundariaActivos : cursosPrimariaActivos;
  const seccionesPrimariaActivas = useMemo(() => academicoConfig.seccionesPrimaria.filter((item) => item.active).map((item) => item.id), [academicoConfig.seccionesPrimaria]);
  const seccionesSecundariaActivas = useMemo(() => academicoConfig.seccionesSecundaria.filter((item) => item.active).map((item) => item.id), [academicoConfig.seccionesSecundaria]);
  const seccionesActivasPorNivel = (nivel?: string) => nivel === "SECUNDARIA" ? seccionesSecundariaActivas : seccionesPrimariaActivas;
  const gradosActivosPorNivel = (nivel?: string) =>
    (nivel === "SECUNDARIA" ? academicoConfig.gradosSecundaria : academicoConfig.gradosPrimaria)
      .filter((item) => item.active)
      .map((item) => item.id);
  const salonesActivosPorNivel = (nivel?: string) =>
    academicoConfig.salones
      .filter((item) => item.active && item.nivel === (nivel === "SECUNDARIA" ? "SECUNDARIA" : "PRIMARIA"))
      .map((item) => item.aula);
  const labelAcademico = (id: string) =>
    [...academicoConfig.cursosPrimaria, ...academicoConfig.cursosSecundaria, ...academicoConfig.gradosPrimaria, ...academicoConfig.gradosSecundaria, ...academicoConfig.seccionesPrimaria, ...academicoConfig.seccionesSecundaria]
      .find((item) => item.id === id)?.label ?? labelFromEnum(id);
  const saveAcademicoConfig = (next: AcademicoConfig) => {
    setAcademicoConfig(next);
    if (!token) return;
    void monserratApi.updateAcademicoConfiguracion(next, token)
      .then((saved) => setAcademicoConfig(mergeAcademicoConfig(saved as AcademicoConfig)))
      .catch((error: unknown) => setStatus(error instanceof Error ? error.message : "No se pudo guardar la configuracion academica"));
  };
  const updateSalonConfig = (target: SalonItem, patch: Partial<SalonItem>) => {
    saveAcademicoConfig({
      ...academicoConfig,
      salones: academicoConfig.salones.map((salon) => salon === target ? { ...salon, ...patch } : salon)
    });
  };
  const addSalonConfig = (nivel = "PRIMARIA") => {
    const grado = gradosActivosPorNivel(nivel)[0] ?? GRADOS_PRIMARIA[0];
    const seccion = seccionesActivasPorNivel(nivel)[0] ?? "A";
    const aula = aulaPorGradoSeccion(nivel, grado, seccion);
    saveAcademicoConfig({
      ...academicoConfig,
      salones: [...academicoConfig.salones, { nivel, grado, seccion, aula, active: true }]
    });
  };
  const deleteSalonConfig = (target: SalonItem) => {
    saveAcademicoConfig({
      ...academicoConfig,
      salones: academicoConfig.salones.filter((salon) => salon !== target)
    });
  };

  const docentes = useMemo(() => usuariosAcademicos.filter((u) => u.rol === "DOCENTE"), [usuariosAcademicos]);
  const alumnos = useMemo(() => usuariosAcademicos.filter((u) => u.rol === "ALUMNO"), [usuariosAcademicos]);
  const docentesPrimaria = useMemo(() => docentes.filter((u) => !u.materia), [docentes]);
  const docentesSecundaria = useMemo(() => docentes.filter((u) => Boolean(u.materia)), [docentes]);
  const alumnosDelAula = useMemo(() => alumnos.filter((u) =>
    u.nivelEducativo === asignacionAcademicaForm.nivelEducativo
    && u.grado === asignacionAcademicaForm.grado
    && u.seccion === asignacionAcademicaForm.seccion
  ), [alumnos, asignacionAcademicaForm.grado, asignacionAcademicaForm.nivelEducativo, asignacionAcademicaForm.seccion]);
  const docentesSugeridos = useMemo(() => {
    if (asignacionAcademicaForm.nivelEducativo !== "SECUNDARIA") return docentesPrimaria;
    return docentesSecundaria;
  }, [asignacionAcademicaForm.curso, asignacionAcademicaForm.nivelEducativo, docentesPrimaria, docentesSecundaria]);
  const docentesDelCurso = useMemo(() => {
    if (asignacionAcademicaForm.nivelEducativo !== "SECUNDARIA") return docentesPrimaria;
    return docentesSecundaria.filter((u) => !u.materia || u.materia === asignacionAcademicaForm.curso);
  }, [asignacionAcademicaForm.curso, asignacionAcademicaForm.nivelEducativo, docentesPrimaria, docentesSecundaria]);
  const asignacionesDelAula = useMemo(() => asignacionesAcademicas.filter((a) =>
    a.nivelEducativo === asignacionAcademicaForm.nivelEducativo
    && a.grado === asignacionAcademicaForm.grado
    && a.seccion === asignacionAcademicaForm.seccion
  ), [asignacionesAcademicas, asignacionAcademicaForm.grado, asignacionAcademicaForm.nivelEducativo, asignacionAcademicaForm.seccion]);
  const profesoresDelAula = useMemo(() => {
    const byDni = new Map<string, AsignacionAcademica>();
    asignacionesDelAula.forEach((asignacion) => byDni.set(asignacion.docenteDni, asignacion));
    return Array.from(byDni.values());
  }, [asignacionesDelAula]);
  const tutorSecundariaVisible = useMemo(() => {
    const selected = docentesSecundaria.find((docente) => docente.dni === tutorSecundariaDni);
    return selected?.nombre ?? profesoresDelAula[0]?.docenteNombre ?? "Sin tutor";
  }, [docentesSecundaria, profesoresDelAula, tutorSecundariaDni]);
  const cursosDelAula = useMemo(() => cursosActivosPorNivel(asignacionAcademicaForm.nivelEducativo).map((curso) => {
    const asignacion = asignacionesDelAula.find((item) => item.curso === curso);
    return {
      id: curso,
      title: labelAcademico(curso),
      detail: asignacion?.docenteNombre ?? "Sin docente asignado"
    };
  }), [asignacionesDelAula, asignacionAcademicaForm.nivelEducativo, academicoConfig]);
  const docentePrimariaVisible = useMemo(() => {
    const asignado = profesoresDelAula[0]?.docenteNombre;
    if (asignado) return asignado;
    return docentesPrimaria.find((docente) => docente.dni === asignacionAcademicaForm.docenteDni)?.nombre ?? "Sin docente";
  }, [asignacionAcademicaForm.docenteDni, docentesPrimaria, profesoresDelAula]);
  const autocompletarPrimariaPorGrado = (grado: string, forzarPrimaria = false) => {
    if (!forzarPrimaria && asignacionAcademicaForm.nivelEducativo !== "PRIMARIA") {
      setAsignacionAcademicaForm({ ...asignacionAcademicaForm, grado });
      return;
    }

    const seccion = seccionesActivasPorNivel("PRIMARIA").find((item) => alumnos.some((alumno) =>
      alumno.nivelEducativo === "PRIMARIA"
      && alumno.grado === grado
      && alumno.seccion === item
    )) ?? "A";
    const asignacionExistente = asignacionesAcademicas.find((asignacion) =>
      asignacion.nivelEducativo === "PRIMARIA"
      && asignacion.grado === grado
      && asignacion.seccion === seccion
      && asignacion.activo
    );
    const docenteDisponible = docentesPrimaria.find((docente) =>
      !asignacionesAcademicas.some((asignacion) =>
        asignacion.nivelEducativo === "PRIMARIA"
        && asignacion.docenteDni === docente.dni
        && asignacion.activo
        && (asignacion.grado !== grado || asignacion.seccion !== seccion)
      )
    );

    setAulaNumero(aulaPorGradoSeccion("PRIMARIA", grado, seccion));
    setAsignacionAcademicaForm({
      ...asignacionAcademicaForm,
      nivelEducativo: "PRIMARIA",
      grado,
      seccion,
      curso: "MATEMATICA",
      docenteDni: asignacionExistente?.docenteDni ?? docenteDisponible?.dni ?? ""
    });
  };
  const usuariosFiltrados = useMemo(() => {
    const term = academicoSearch.trim().toLowerCase();
    return usuariosAcademicos
      .filter((u) => academicoNivelFiltro === "TODOS" || u.nivelEducativo === academicoNivelFiltro)
      .filter((u) => !term || [u.codigo, u.dni, u.nombre, u.rol, u.nivelEducativo, u.grado, u.seccion, u.materia, u.especialidad]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)));
  }, [academicoNivelFiltro, academicoSearch, usuariosAcademicos]);

  const alumnosConPensiones = useMemo(() => {
    const term = pensionSearch.trim().toLowerCase();
    const pagosDelAnio = pensiones.filter((pension) => pension.anio === pensionYear);
    return alumnos
      .filter((alumno) => !term || [alumno.codigo, alumno.dni, alumno.nombre, alumno.nivelEducativo, alumno.grado, alumno.seccion]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)))
      .map((alumno) => {
        const meses = Object.fromEntries(Array.from({ length: 12 }, (_, index) => {
          const mes = index + 1;
          return [mes, pagosDelAnio.find((pension) => pension.alumnoDni === alumno.dni && pension.mes === mes)];
        })) as Record<number, PensionMensual | undefined>;
        return { alumno, meses };
      });
  }, [alumnos, pensionSearch, pensionYear, pensiones]);

  const TABS: { id: Tab; label: string }[] = [
    { id: "institucion", label: "Institución" },
    { id: "ingresantes", label: "Ingresantes" },
    { id: "videos", label: "Carrusel" },
    { id: "redes", label: "Redes sociales" },
    { id: "asignaciones", label: "Asignaciones" },
    { id: "academico", label: "Academico" },
    { id: "pensiones", label: "Pensiones" },
    { id: "configuracion", label: "Configuracion academica" },
  ];

  if (!session) return null;

  return (
    <section id="admin" className="bg-monserrat-cream px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Administración"
          title="Panel Administrador"
          description="Gestiona la información publicada en la página institucional."
        />

        <div className="mt-10 overflow-hidden rounded-[24px] border border-monserrat-ink/8 bg-white shadow-[0_4px_24px_rgba(28,20,16,0.07)]">

            {/* topbar */}
            <div className="flex items-center justify-between border-b border-monserrat-ink/7 px-6 py-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-red">Sesión activa</p>
                <h3 className="font-serif text-[20px] font-black text-monserrat-ink">{session.nombre}</h3>
              </div>
              <button onClick={logout}
                className="inline-flex items-center gap-2 rounded-full border border-monserrat-ink/12 px-4 py-2 text-[12px] font-bold text-monserrat-ink/60 transition hover:border-monserrat-ink/30 hover:text-monserrat-ink">
                <LogOut size={14} /> Cerrar sesión
              </button>
            </div>

            {/* tabs */}
            <div className="flex gap-1 overflow-x-auto border-b border-monserrat-ink/7 bg-monserrat-cream/40 px-6 py-3">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`rounded-full px-4 py-1.5 text-[12px] font-bold whitespace-nowrap transition ${
                    tab === t.id ? "bg-monserrat-red text-white" : "text-monserrat-ink/55 hover:bg-monserrat-ink/6 hover:text-monserrat-ink"
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {status && (
                <div className="mb-5 rounded-[12px] border border-monserrat-red/15 bg-monserrat-red/6 px-4 py-2.5 text-[12px] font-bold text-monserrat-red">
                  {status}
                </div>
              )}

              {/* ── TAB INSTITUCIÓN ── */}
              {tab === "institucion" && (
                <form onSubmit={submitInstitution} className="grid gap-4 lg:grid-cols-2">
                  <AdminField label="Nombre"><input value={institutionForm.nombre} onChange={(e) => setInstitutionForm({ ...institutionForm, nombre: e.target.value })} className="admin-input" required /></AdminField>
                  <AdminField label="Dirección"><input value={institutionForm.direccion} onChange={(e) => setInstitutionForm({ ...institutionForm, direccion: e.target.value })} className="admin-input" required /></AdminField>
                  <AdminField label="Ciudad"><input value={institutionForm.ciudad} onChange={(e) => setInstitutionForm({ ...institutionForm, ciudad: e.target.value })} className="admin-input" required /></AdminField>
                  <AdminField label="Fundación"><input value={institutionForm.anioFundacion} onChange={(e) => setInstitutionForm({ ...institutionForm, anioFundacion: e.target.value })} className="admin-input" required /></AdminField>
                  <AdminField label="Correo"><input value={institutionForm.email} onChange={(e) => setInstitutionForm({ ...institutionForm, email: e.target.value })} className="admin-input" required /></AdminField>
                  <AdminField label="Horario"><input value={institutionForm.horarioAtencion} onChange={(e) => setInstitutionForm({ ...institutionForm, horarioAtencion: e.target.value })} className="admin-input" /></AdminField>
                  <div className="lg:col-span-2">
                    <MediaPicker label="Logo institucional" accept="image/*" previewUrl={institutionLogoPreview} previewType="image" onFileChange={setInstitutionLogoFile} />
                  </div>
                  <AdminField label="Misión" className="lg:col-span-1">
                    <textarea value={institutionForm.mision} onChange={(e) => setInstitutionForm({ ...institutionForm, mision: e.target.value })} className="admin-input resize-y" rows={4} required />
                  </AdminField>
                  <AdminField label="Visión" className="lg:col-span-1">
                    <textarea value={institutionForm.vision} onChange={(e) => setInstitutionForm({ ...institutionForm, vision: e.target.value })} className="admin-input resize-y" rows={4} required />
                  </AdminField>
                  <div className="lg:col-span-2">
                    <AdminField label="Descripción">
                      <textarea value={institutionForm.descripcion} onChange={(e) => setInstitutionForm({ ...institutionForm, descripcion: e.target.value })} className="admin-input resize-y" rows={3} />
                    </AdminField>
                  </div>
                  <div className="lg:col-span-2">
                    <AdminFormBtn isBusy={isBusy} />
                  </div>
                </form>
              )}

              {/* ── TAB INGRESANTES ── */}
              {tab === "ingresantes" && (
                <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
                  {/* form */}
                  <form onSubmit={submitIngresante}
                    className="grid content-start gap-3 rounded-[18px] border border-monserrat-ink/8 bg-monserrat-cream/40 p-5">
                    <h4 className="font-serif text-[16px] font-black text-monserrat-ink">
                      {editingIngresante ? "Editar ingresante" : "Nuevo ingresante"}
                    </h4>
                    <AdminField label="Nombre completo">
                      <input value={ingresanteForm.nombre} onChange={(e) => setIngresanteForm({ ...ingresanteForm, nombre: e.target.value })} className="admin-input" required />
                    </AdminField>
                    <AdminField label="Universidad">
                      <input value={ingresanteForm.universidad} onChange={(e) => setIngresanteForm({ ...ingresanteForm, universidad: e.target.value })} className="admin-input" required />
                    </AdminField>
                    <AdminField label="Siglas">
                      <input value={ingresanteForm.universidadSiglas} onChange={(e) => setIngresanteForm({ ...ingresanteForm, universidadSiglas: e.target.value.toUpperCase() })} className="admin-input" required />
                    </AdminField>
                    <AdminField label="Carrera">
                      <input value={ingresanteForm.carrera} onChange={(e) => setIngresanteForm({ ...ingresanteForm, carrera: e.target.value })} className="admin-input" required />
                    </AdminField>
                    <AdminField label="Año">
                      <select value={ingresanteForm.anio} onChange={(e) => setIngresanteForm({ ...ingresanteForm, anio: e.target.value })} className="admin-input">
                        {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </AdminField>
                    {/* TIPO SELECCIÓN — solo 3 opciones */}
                    <AdminField label="Tipo de ingreso">
                      <select value={ingresanteForm.tipoSeleccion} onChange={(e) => setIngresanteForm({ ...ingresanteForm, tipoSeleccion: e.target.value })} className="admin-input">
                        {TIPOS_SELECCION.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </AdminField>
                    <MediaPicker label="Foto (opcional)" accept="image/*" previewUrl={ingresantePhotoPreview} previewType="image" onFileChange={setIngresantePhotoFile} />
                    <div className="flex gap-2">
                      <button disabled={isBusy}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-monserrat-red py-2.5 text-[12px] font-black text-white transition hover:bg-monserrat-red/85 disabled:opacity-60">
                        {editingIngresante ? <><Save size={13} /> Guardar</> : <><Plus size={13} /> Crear</>}
                      </button>
                      {editingIngresante && (
                        <button type="button" onClick={() => { setEditingIngresante(null); setIngresanteForm(emptyIngresante); setIngresantePhotoFile(null); }}
                          className="rounded-[10px] border border-monserrat-ink/12 px-3 text-[12px] font-bold text-monserrat-ink/60 hover:border-monserrat-ink/25">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </form>

                  {/* tabla */}
                  <div>
                    {/* filtros */}
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex gap-2 flex-wrap">
                        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}
                          className="rounded-full border border-monserrat-ink/10 bg-white py-1.5 pl-3 pr-7 text-[12px] font-bold text-monserrat-ink/60 outline-none"
                          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%231C1410' stroke-width='2' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", appearance: "none" as const }}>
                          <option value="">Todos los años</option>
                          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select value={filterSel} onChange={(e) => setFilterSel(e.target.value)}
                          className="rounded-full border border-monserrat-ink/10 bg-white py-1.5 pl-3 pr-7 text-[12px] font-bold text-monserrat-ink/60 outline-none"
                          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%231C1410' stroke-width='2' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", appearance: "none" as const }}>
                          <option value="">Todos los ingresos</option>
                          {TIPOS_SELECCION.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <p className="text-[12px] font-semibold text-monserrat-ink/50">
                        <span className="font-black text-monserrat-ink">{filteredIngresantes.length}</span> registros
                      </p>
                    </div>

                    <div className="overflow-hidden rounded-[16px] border border-monserrat-ink/8">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px] border-collapse text-left text-[12.5px]">
                          <thead className="bg-monserrat-ink text-monserrat-cream">
                            <tr>
                              {["Nombre", "Universidad", "Carrera", "Año", "Ingreso", ""].map((h) => (
                                <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-monserrat-cream/70">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredIngresantes.length === 0 ? (
                              <tr><td colSpan={6} className="py-10 text-center text-[13px] font-semibold text-monserrat-ink/35">Sin resultados</td></tr>
                            ) : filteredIngresantes.map((item) => (
                              <tr key={item.id} className="border-t border-monserrat-ink/6 transition hover:bg-monserrat-cream/30">
                                <td className="px-4 py-3 font-bold text-monserrat-ink">{item.nombre}</td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-black ring-1">
                                    {item.universidadSiglas}
                                  </span>
                                </td>
                                <td className="max-w-[180px] truncate px-4 py-3 text-monserrat-ink/70">{item.carrera}</td>
                                <td className="px-4 py-3 font-black text-monserrat-red">{item.anio}</td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-monserrat-gold/90">
                                    <span className="h-[5px] w-[5px] rounded-full bg-monserrat-gold" />
                                    {item.tipoSeleccion}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-1.5">
                                    <button type="button" onClick={() => { setEditingIngresante(item); setIngresanteForm({ ...item }); setIngresantePhotoFile(null); }}
                                      className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-monserrat-ink/12 bg-white transition hover:border-monserrat-ink/30">
                                      <Edit3 size={13} />
                                    </button>
                                    <button type="button" onClick={() => void runAdminAction(() => monserratApi.deleteIngresante(item.id, token), "Ingresante eliminado")}
                                      className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-monserrat-red/8 text-monserrat-red transition hover:bg-monserrat-red/16">
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB VIDEOS ── */}
              {tab === "videos" && (
                <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
                  <form onSubmit={submitVideo}
                    className="grid content-start gap-3 rounded-[18px] border border-monserrat-ink/8 bg-monserrat-cream/40 p-5">
                    <h4 className="font-serif text-[16px] font-black text-monserrat-ink">
                      {editingVideo ? "Editar medio" : "Nuevo medio"}
                    </h4>
                    <AdminField label="Título"><input value={videoForm.titulo} onChange={(e) => setVideoForm({ ...videoForm, titulo: e.target.value })} className="admin-input" required /></AdminField>
                    <AdminField label="Descripción"><textarea value={videoForm.descripcion} onChange={(e) => setVideoForm({ ...videoForm, descripcion: e.target.value })} className="admin-input resize-y" rows={3} /></AdminField>
                    <MediaPicker label="Imagen o video" accept="image/*,video/*" previewUrl={videoPreview.src} previewType={videoPreview.type} onFileChange={setVideoMediaFile} />
                    <AdminField label="Tag">
                      <select value={videoForm.tag} onChange={(e) => setVideoForm({ ...videoForm, tag: e.target.value })} className="admin-input">
                        {["Institucional", "Eventos", "Logros", "Deportes", "Académico"].map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </AdminField>
                    <AdminField label="Orden"><input type="number" value={videoForm.orden} onChange={(e) => setVideoForm({ ...videoForm, orden: Number(e.target.value) })} className="admin-input" /></AdminField>
                    <div className="flex gap-2">
                      <button disabled={isBusy} className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-monserrat-red py-2.5 text-[12px] font-black text-white transition hover:bg-monserrat-red/85 disabled:opacity-60">
                        {editingVideo ? <><Save size={13} /> Guardar</> : <><Plus size={13} /> Crear</>}
                      </button>
                      {editingVideo && <button type="button" onClick={() => { setEditingVideo(null); setVideoForm(emptyVideo); setVideoMediaFile(null); }} className="rounded-[10px] border border-monserrat-ink/12 px-3 hover:border-monserrat-ink/25"><X size={14} /></button>}
                    </div>
                  </form>
                  <AdminTable headers={["Título", "Tipo", "Orden"]}
                    rows={videos.map((v) => ({
                      id: v.id, values: [v.titulo, v.mediaType, String(v.orden ?? 0)],
                      onEdit: () => { setEditingVideo(v); setVideoForm({ ...v }); setVideoMediaFile(null); },
                      onDelete: () => void runAdminAction(async () => { await monserratApi.deleteVideo(v.id, token); await monserratApi.deleteMedia(v.publicId, v.mediaType, token); }, "Medio eliminado"),
                    }))} />
                </div>
              )}

              {/* ── TAB REDES ── */}
              {tab === "redes" && (
                <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
                  <form onSubmit={submitRed}
                    className="grid content-start gap-3 rounded-[18px] border border-monserrat-ink/8 bg-monserrat-cream/40 p-5">
                    <h4 className="font-serif text-[16px] font-black text-monserrat-ink">
                      {editingRed ? "Editar red social" : "Nueva red social"}
                    </h4>
                    <AdminField label="Nombre"><input value={redForm.nombre} onChange={(e) => setRedForm({ ...redForm, nombre: e.target.value })} className="admin-input" required /></AdminField>
                    <AdminField label="Ícono"><input value={redForm.icono} onChange={(e) => setRedForm({ ...redForm, icono: e.target.value })} className="admin-input" placeholder="facebook, tiktok..." required /></AdminField>
                    <AdminField label="URL"><input value={redForm.url} onChange={(e) => setRedForm({ ...redForm, url: e.target.value })} className="admin-input" required /></AdminField>
                    <AdminField label="Orden"><input type="number" value={redForm.orden} onChange={(e) => setRedForm({ ...redForm, orden: Number(e.target.value) })} className="admin-input" /></AdminField>
                    <div className="flex gap-2">
                      <button disabled={isBusy} className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-monserrat-red py-2.5 text-[12px] font-black text-white transition hover:bg-monserrat-red/85 disabled:opacity-60">
                        {editingRed ? <><Save size={13} /> Guardar</> : <><Plus size={13} /> Crear</>}
                      </button>
                      {editingRed && <button type="button" onClick={() => { setEditingRed(null); setRedForm(emptyRed); }} className="rounded-[10px] border border-monserrat-ink/12 px-3 hover:border-monserrat-ink/25"><X size={14} /></button>}
                    </div>
                  </form>
                  <AdminTable headers={["Nombre", "Ícono", "URL"]}
                    rows={redes.map((r) => ({
                      id: r.id, values: [r.nombre, r.icono, r.url],
                      onEdit: () => { setEditingRed(r); setRedForm({ ...r }); },
                      onDelete: () => void runAdminAction(() => monserratApi.deleteRedSocial(r.id, token), "Red social eliminada"),
                    }))} />
                </div>
              )}

              {tab === "asignaciones" && (
                <div className="grid gap-5">


                  <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
                  <form onSubmit={submitAsignacionAcademica}
                    className="grid content-start gap-4 rounded-[18px] border border-monserrat-ink/8 bg-white p-5 shadow-sm">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-red">Asignacion por aula</p>
                      <h4 className="mt-1 font-serif text-[20px] font-black text-monserrat-ink">
                        {editingAsignacionAcademica ? "Editar asignacion" : "Configurar salon"}
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {NIVELES.map((nivel) => (
                        <button key={nivel} type="button" disabled={Boolean(editingAsignacionAcademica)}
                          onClick={() => {
                            const grado = defaultGrado(nivel);
                            const seccion = "A";
                            if (nivel === "PRIMARIA") {
                              autocompletarPrimariaPorGrado(grado, true);
                              return;
                            }
                            const curso = asignacionAcademicaForm.curso || "MATEMATICA";
                            const asignacionCurso = asignacionesAcademicas.find((asignacion) =>
                              asignacion.nivelEducativo === "SECUNDARIA"
                              && asignacion.grado === grado
                              && asignacion.seccion === seccion
                              && asignacion.curso === curso
                            );
                            const docenteCurso = docentesSecundaria.find((docente) => docente.materia === curso);
                            const tutorAula = asignacionesAcademicas.find((asignacion) =>
                              asignacion.nivelEducativo === "SECUNDARIA"
                              && asignacion.grado === grado
                              && asignacion.seccion === seccion
                            );
                            setTutorSecundariaDni(tutorAula?.docenteDni ?? "");
                            setAsignacionAcademicaForm({ ...asignacionAcademicaForm, nivelEducativo: nivel, grado, seccion, curso, docenteDni: asignacionCurso?.docenteDni ?? docenteCurso?.dni ?? "" });
                            setAulaNumero(aulaPorGradoSeccion(nivel, grado, seccion));
                          }}
                          className={`rounded-[10px] border px-3 py-2 text-[12px] font-black transition ${asignacionAcademicaForm.nivelEducativo === nivel ? "border-monserrat-red bg-monserrat-red text-white" : "border-monserrat-ink/10 bg-monserrat-cream/45 text-monserrat-ink/65 hover:border-monserrat-ink/25"}`}>
                          {labelFromEnum(nivel)}
                        </button>
                      ))}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <AdminField label="Salon">
                        <select value={aulaNumero} onChange={(e) => setAulaNumero(e.target.value)} className="admin-input" required>
                          {salonesActivosPorNivel(asignacionAcademicaForm.nivelEducativo).map((aula) => <option key={aula} value={aula}>Aula {aula}</option>)}
                        </select>
                      </AdminField>
                      <AdminField label="Grado">
                        <select value={asignacionAcademicaForm.grado ?? "PRIMERO_PRIMARIA"} onChange={(e) => autocompletarPrimariaPorGrado(e.target.value)} className="admin-input" required>
                          {gradosActivosPorNivel(asignacionAcademicaForm.nivelEducativo).map((grado) => <option key={grado} value={grado}>{labelAcademico(grado)}</option>)}
                        </select>
                      </AdminField>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <AdminField label="Seccion">
                        <select value={asignacionAcademicaForm.seccion ?? "A"} onChange={(e) => {
                          const seccion = e.target.value;
                          setAulaNumero(aulaPorGradoSeccion(asignacionAcademicaForm.nivelEducativo, asignacionAcademicaForm.grado ?? defaultGrado(asignacionAcademicaForm.nivelEducativo ?? "PRIMARIA"), seccion));
                          setAsignacionAcademicaForm({ ...asignacionAcademicaForm, seccion });
                        }} className="admin-input" required>
                          {seccionesActivasPorNivel(asignacionAcademicaForm.nivelEducativo).map((seccion) => <option key={seccion} value={seccion}>{labelAcademico(seccion)}</option>)}
                        </select>
                      </AdminField>
                      <AdminField label={asignacionAcademicaForm.nivelEducativo === "SECUNDARIA" ? "Tutor del aula" : "Docente de primaria"}>
                        <select
                          value={asignacionAcademicaForm.nivelEducativo === "SECUNDARIA" ? tutorSecundariaDni : asignacionAcademicaForm.docenteDni}
                          onChange={(e) => {
                            if (asignacionAcademicaForm.nivelEducativo === "SECUNDARIA") {
                              setTutorSecundariaDni(e.target.value);
                              return;
                            }
                            setAsignacionAcademicaForm({ ...asignacionAcademicaForm, docenteDni: e.target.value });
                          }}
                          className="admin-input"
                          required={asignacionAcademicaForm.nivelEducativo !== "SECUNDARIA"}
                        >
                          <option value="">Selecciona</option>
                          {docentesSugeridos.map((u) => (
                            <option key={u.dni} value={u.dni}>{u.nombre} - {u.materia ? labelFromEnum(u.materia) : "Docente primaria"}</option>
                          ))}
                        </select>
                      </AdminField>
                    </div>
                    {(asignacionAcademicaForm.nivelEducativo === "SECUNDARIA" || editingAsignacionAcademica) && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <AdminField label="Curso">
                          <select value={asignacionAcademicaForm.curso} onChange={(e) => {
                            const curso = e.target.value;
                            const asignacionCurso = asignacionesDelAula.find((asignacion) => asignacion.curso === curso);
                            const docenteCurso = docentesSecundaria.find((docente) => docente.materia === curso);
                            setAsignacionAcademicaForm({ ...asignacionAcademicaForm, curso, docenteDni: asignacionCurso?.docenteDni ?? docenteCurso?.dni ?? "" });
                          }} className="admin-input" required>
                            {cursosActivosPorNivel(asignacionAcademicaForm.nivelEducativo).map((curso) => <option key={curso} value={curso}>{labelAcademico(curso)}</option>)}
                          </select>
                        </AdminField>
                        <AdminField label="Docente del curso">
                          <select value={asignacionAcademicaForm.docenteDni} onChange={(e) => setAsignacionAcademicaForm({ ...asignacionAcademicaForm, docenteDni: e.target.value })} className="admin-input" required>
                            <option value="">Selecciona</option>
                            {docentesDelCurso.map((u) => (
                              <option key={u.dni} value={u.dni}>{u.nombre} - {labelFromEnum(u.materia ?? "")}</option>
                            ))}
                          </select>
                        </AdminField>
                      </div>
                    )}
                    {editingAsignacionAcademica && (
                      <AdminField label="Alumno">
                        <select value={asignacionAcademicaForm.alumnoDni} onChange={(e) => setAsignacionAcademicaForm({ ...asignacionAcademicaForm, alumnoDni: e.target.value })} className="admin-input" required>
                          <option value="">Selecciona</option>
                          {alumnosDelAula.map((u) => (
                            <option key={u.dni} value={u.dni}>{u.nombre} - {u.dni}</option>
                          ))}
                        </select>
                      </AdminField>
                    )}
                    <label className="flex items-center gap-2 text-[12px] font-bold text-monserrat-ink/65">
                      <input type="checkbox" checked={Boolean(asignacionAcademicaForm.activo)} onChange={(e) => setAsignacionAcademicaForm({ ...asignacionAcademicaForm, activo: e.target.checked })} />
                      Activa
                    </label>
                    <div className="flex gap-2">
                      <button disabled={isBusy} className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-monserrat-red py-2.5 text-[12px] font-black text-white transition hover:bg-monserrat-red/85 disabled:opacity-60">
                        {editingAsignacionAcademica ? <><Save size={13} /> Guardar</> : <><Plus size={13} /> Asignar aula</>}
                      </button>
                      {editingAsignacionAcademica && <button type="button" onClick={() => { setEditingAsignacionAcademica(null); setAsignacionAcademicaForm(emptyAsignacion); }} className="rounded-[10px] border border-monserrat-ink/12 px-3 hover:border-monserrat-ink/25"><X size={14} /></button>}
                    </div>
                  </form>
                    <div className="grid gap-4">
                      <div className="rounded-[16px] border border-monserrat-ink/8 bg-monserrat-cream/35 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/45">Vista del aula seleccionada</p>
                        <h4 className="mt-1 font-serif text-[20px] font-black text-monserrat-ink">Aula {aulaNumero} - {labelFromEnum(asignacionAcademicaForm.grado ?? "")} {asignacionAcademicaForm.seccion}</h4>
                        <div className={`mt-3 grid gap-2 ${asignacionAcademicaForm.nivelEducativo === "SECUNDARIA" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                          <MiniStat label="Alumnos" value={String(alumnosDelAula.length)} />
                          {asignacionAcademicaForm.nivelEducativo === "SECUNDARIA" && <MiniStat label="Tutor" value={tutorSecundariaVisible} />}
                          {asignacionAcademicaForm.nivelEducativo === "SECUNDARIA" && <MiniStat label="Cursos cubiertos" value={String(new Set(asignacionesDelAula.map((a) => a.curso)).size)} />}
                          {asignacionAcademicaForm.nivelEducativo !== "SECUNDARIA" && <MiniStat label="Docente asignado" value={docentePrimariaVisible} />}
                        </div>
                      </div>
                      {asignacionAcademicaForm.nivelEducativo === "SECUNDARIA" ? (
                        <div className="grid gap-4 lg:grid-cols-2">
                          <RosterPanel title="Alumnos del aula" empty="No hay alumnos en esta aula" rows={alumnosDelAula.map((alumno) => ({
                            id: alumno.dni,
                            title: alumno.nombre,
                            detail: `${alumno.codigo || alumno.dni} - ${labelAcademico(alumno.grado ?? "")} ${labelAcademico(alumno.seccion ?? "")}`
                          }))} />
                          <RosterPanel title="Cursos y docente a cargo" empty="Aun no hay cursos asignados" rows={cursosDelAula.map((curso) => ({
                            id: curso.id,
                            title: curso.title,
                            detail: curso.detail
                          }))} />
                        </div>
                      ) : (
                        <RosterPanel title="Alumnos del salon" empty="No hay alumnos en esta aula" rows={alumnosDelAula.map((alumno) => ({
                          id: alumno.dni,
                          title: alumno.nombre,
                          detail: `${alumno.codigo || alumno.dni} - ${labelAcademico(alumno.grado ?? "")} ${labelAcademico(alumno.seccion ?? "")}`
                        }))} />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {tab === "academico" && (
                <div className="grid gap-5">
                  <div className="grid gap-3 md:grid-cols-4">
                    <AdminMetric icon={<Users size={18} />} label="Alumnos" value={String(alumnos.length)} />
                    <AdminMetric icon={<GraduationCap size={18} />} label="Docentes" value={String(docentes.length)} />
                    <AdminMetric icon={<School size={18} />} label="Primaria" value={String(alumnos.filter((u) => u.nivelEducativo === "PRIMARIA").length)} />
                    <AdminMetric icon={<BookOpen size={18} />} label="Secundaria" value={String(alumnos.filter((u) => u.nivelEducativo === "SECUNDARIA").length)} />
                  </div>
                  <div className="grid gap-5 xl:grid-cols-[430px_1fr]">
                    <form onSubmit={submitUsuarioAcademico}
                      className="grid content-start gap-4 rounded-[18px] border border-monserrat-ink/8 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-red">Registro academico</p>
                          <h4 className="mt-1 font-serif text-[20px] font-black text-monserrat-ink">
                            {editingUsuarioAcademico ? "Editar usuario" : "Agregar alumno o docente"}
                          </h4>
                        </div>
                        {editingUsuarioAcademico && (
                          <button type="button" onClick={() => prepararFormularioAcademico("ALUMNO", "PRIMARIA")}
                            className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-monserrat-ink/12 text-monserrat-ink/55 hover:border-monserrat-ink/30">
                            <X size={15} />
                          </button>
                        )}
                      </div>

                      <div className="grid gap-2">
                        <div className="grid grid-cols-2 gap-2">
                          {(["ALUMNO", "DOCENTE"] as const).map((rol) => (
                            <button key={rol} type="button"
                              onClick={() => prepararFormularioAcademico(rol, usuarioAcademicoForm.nivelEducativo ?? "PRIMARIA")}
                              className={`flex items-center justify-center gap-2 rounded-[10px] border px-3 py-2.5 text-[12px] font-black transition ${usuarioAcademicoForm.rol === rol ? "border-monserrat-red bg-monserrat-red text-white" : "border-monserrat-ink/10 bg-monserrat-cream/45 text-monserrat-ink/65 hover:border-monserrat-ink/25"}`}>
                              {rol === "ALUMNO" ? <Users size={14} /> : <GraduationCap size={14} />}
                              {rol === "ALUMNO" ? "Alumno" : "Docente"}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {NIVELES.map((nivel) => (
                            <button key={nivel} type="button"
                              onClick={() => prepararFormularioAcademico(usuarioAcademicoForm.rol === "DOCENTE" ? "DOCENTE" : "ALUMNO", nivel)}
                              className={`rounded-[10px] border px-3 py-2 text-[12px] font-black transition ${usuarioAcademicoForm.nivelEducativo === nivel ? "border-monserrat-ink bg-monserrat-ink text-white" : "border-monserrat-ink/10 bg-white text-monserrat-ink/60 hover:border-monserrat-ink/25"}`}>
                              {labelFromEnum(nivel)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <AdminField label="DNI">
                          <input value={usuarioAcademicoForm.dni} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, dni: e.target.value })} className="admin-input" required disabled={Boolean(editingUsuarioAcademico)} />
                        </AdminField>
                        <AdminField label="Codigo">
                          <input value={usuarioAcademicoForm.codigo ?? ""} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, codigo: e.target.value })} className="admin-input" />
                        </AdminField>
                        <AdminField label="Nombre completo" className="sm:col-span-2">
                          <input value={usuarioAcademicoForm.nombre} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, nombre: e.target.value })} className="admin-input" required />
                        </AdminField>
                        <AdminField label="Correo">
                          <input type="email" value={usuarioAcademicoForm.correo ?? ""} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, correo: e.target.value })} className="admin-input" />
                        </AdminField>
                        <AdminField label="Telefono">
                          <input value={usuarioAcademicoForm.telefono ?? ""} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, telefono: e.target.value })} className="admin-input" />
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
                            <select value={usuarioAcademicoForm.grado ?? defaultGrado(usuarioAcademicoForm.nivelEducativo ?? "PRIMARIA")} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, grado: e.target.value })} className="admin-input">
                              {gradosActivosPorNivel(usuarioAcademicoForm.nivelEducativo).map((grado) => <option key={grado} value={grado}>{labelAcademico(grado)}</option>)}
                            </select>
                          </AdminField>
                          <AdminField label="Seccion">
                            <select value={usuarioAcademicoForm.seccion ?? "A"} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, seccion: e.target.value })} className="admin-input">
                              {seccionesActivasPorNivel(usuarioAcademicoForm.nivelEducativo).map((seccion) => <option key={seccion} value={seccion}>{labelAcademico(seccion)}</option>)}
                            </select>
                          </AdminField>
                          <AdminField label="Estado matricula">
                            <select value={usuarioAcademicoForm.estadoMatricula ?? "MATRICULADO"} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, estadoMatricula: e.target.value })} className="admin-input">
                              {ESTADOS_MATRICULA.map((estado) => <option key={estado} value={estado}>{labelFromEnum(estado)}</option>)}
                            </select>
                          </AdminField>
                          <label className="flex items-center gap-2 rounded-[10px] bg-white px-3 py-2 text-[12px] font-bold text-monserrat-ink/65">
                            <input type="checkbox" checked={Boolean(usuarioAcademicoForm.pensionPagada)} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, pensionPagada: e.target.checked })} />
                            Pension pagada
                          </label>
                        </div>
                      ) : (
                        <div className="grid gap-3 rounded-[12px] border border-monserrat-ink/8 bg-monserrat-cream/35 p-3 sm:grid-cols-2">
                          {usuarioAcademicoForm.nivelEducativo === "SECUNDARIA" && (
                            <AdminField label="Curso que ensena">
                              <select value={usuarioAcademicoForm.materia ?? ""} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, materia: e.target.value })} className="admin-input">
                                {cursosActivosPorNivel("SECUNDARIA").map((curso) => <option key={curso} value={curso}>{labelAcademico(curso)}</option>)}
                              </select>
                            </AdminField>
                          )}
                          <AdminField label={usuarioAcademicoForm.nivelEducativo === "PRIMARIA" ? "Rol en primaria" : "Especialidad"} className={usuarioAcademicoForm.nivelEducativo === "PRIMARIA" ? "sm:col-span-2" : ""}>
                            <input value={usuarioAcademicoForm.especialidad ?? ""} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, especialidad: e.target.value })} className="admin-input" placeholder={usuarioAcademicoForm.nivelEducativo === "PRIMARIA" ? "Docente de aula" : "Especialidad del docente"} />
                          </AdminField>
                        </div>
                      )}

                      <details className="rounded-[12px] border border-monserrat-ink/8 bg-monserrat-cream/20 p-3">
                        <summary className="cursor-pointer text-[11px] font-black uppercase tracking-[0.08em] text-monserrat-ink/50">Datos adicionales</summary>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <AdminField label="Nombres">
                            <input value={usuarioAcademicoForm.nombres ?? ""} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, nombres: e.target.value })} className="admin-input" />
                          </AdminField>
                          <AdminField label="Apellidos">
                            <input value={usuarioAcademicoForm.apellidos ?? ""} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, apellidos: e.target.value })} className="admin-input" />
                          </AdminField>
                          <AdminField label="Nacimiento">
                            <input type="date" value={usuarioAcademicoForm.fechaNacimiento ?? ""} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, fechaNacimiento: e.target.value })} className="admin-input" />
                          </AdminField>
                          <AdminField label="Direccion">
                            <input value={usuarioAcademicoForm.direccion ?? ""} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, direccion: e.target.value })} className="admin-input" />
                          </AdminField>
                          {usuarioAcademicoForm.rol === "ALUMNO" && (
                            <AdminField label="Observacion pension" className="sm:col-span-2">
                              <textarea value={usuarioAcademicoForm.pensionObservacion ?? ""} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, pensionObservacion: e.target.value })} className="admin-input" />
                            </AdminField>
                          )}
                        </div>
                      </details>

                      <button disabled={isBusy} className="flex items-center justify-center gap-1.5 rounded-[10px] bg-monserrat-red py-2.5 text-[12px] font-black text-white transition hover:bg-monserrat-red/85 disabled:opacity-60">
                        {editingUsuarioAcademico ? <><Save size={13} /> Guardar cambios</> : <><UserPlus size={13} /> Crear registro</>}
                      </button>
                      <p className="text-[11px] font-semibold leading-5 text-monserrat-ink/45">
                        La contrasena inicial sera el mismo DNI y se pedira cambiarla en el primer ingreso.
                      </p>
                    </form>

                    <div className="grid gap-4">
                      <div className="grid gap-3 rounded-[16px] border border-monserrat-ink/8 bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">Padron academico</p>
                            <p className="mt-1 text-sm font-black text-monserrat-ink">Alumnos y docentes registrados</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => void descargarPlantillaAlumnos()} className="inline-flex items-center gap-1.5 rounded-[10px] border border-monserrat-ink/12 px-3 py-2 text-[12px] font-black text-monserrat-ink/65 hover:border-monserrat-ink/30">
                              <FileSpreadsheet size={14} /> Plantilla
                            </button>
                            <button type="button" onClick={() => void exportarAlumnosExcel()} className="inline-flex items-center gap-1.5 rounded-[10px] border border-monserrat-ink/12 px-3 py-2 text-[12px] font-black text-monserrat-ink/65 hover:border-monserrat-ink/30">
                              <Download size={14} /> Exportar alumnos
                            </button>
                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] bg-monserrat-ink px-3 py-2 text-[12px] font-black text-white hover:bg-monserrat-ink/90">
                              <Upload size={14} /> Importar alumnos
                              <input type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void importarAlumnosExcel(file);
                                e.currentTarget.value = "";
                              }} />
                            </label>
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                          <AdminField label="Buscar usuario">
                            <input value={academicoSearch} onChange={(e) => setAcademicoSearch(e.target.value)} className="admin-input" placeholder="Nombre, DNI, aula o curso" />
                          </AdminField>
                          <AdminField label="Nivel">
                            <select value={academicoNivelFiltro} onChange={(e) => setAcademicoNivelFiltro(e.target.value)} className="admin-input">
                              <option value="TODOS">Todos</option>
                              {NIVELES.map((nivel) => <option key={nivel} value={nivel}>{labelFromEnum(nivel)}</option>)}
                            </select>
                          </AdminField>
                        </div>
                        {importSummary && <p className="rounded-[10px] bg-emerald-50 px-3 py-2 text-[12px] font-bold text-emerald-700">{importSummary}</p>}
                      </div>
                      <AdminTable headers={["Codigo", "Nombre", "Rol", "Estado", "Detalle"]}
                        rows={usuariosFiltrados.map((u) => ({
                          id: u.id,
                          values: [
                            u.codigo || u.dni,
                            u.nombre,
                            labelFromEnum(u.rol),
                            labelFromEnum(u.estado ?? ""),
                            u.rol === "DOCENTE"
                              ? `${labelFromEnum(u.nivelEducativo ?? "")} ${u.materia ? `- ${labelAcademico(u.materia)}` : "- Aula primaria"}`.trim()
                              : `${labelFromEnum(u.nivelEducativo ?? "")} - ${labelAcademico(u.grado ?? "")} ${u.seccion ?? ""}`.trim()
                          ],
                          onEdit: () => {
                            setEditingUsuarioAcademico(u);
                            setUsuarioAcademicoForm({ ...u });
                            setUsuarioAcademicoPhotoFile(null);
                          },
                          onDelete: () => void runAdminAction(async () => {
                            await monserratApi.deleteUsuarioAcademico(u.id, token);
                            setUsuariosAcademicos(await monserratApi.usuariosAcademicos(token));
                          }, "Usuario academico desactivado"),
                        }))} />
                    </div>
                  </div>
                </div>
              )}

              {tab === "pensiones" && (
                <div className="grid gap-5">
                  <div className="grid gap-3 md:grid-cols-4">
                    <AdminMetric icon={<Users size={18} />} label="Alumnos" value={String(alumnosConPensiones.length)} />
                    <AdminMetric icon={<CreditCard size={18} />} label="Pagos registrados" value={String(pensiones.filter((p) => p.anio === pensionYear && p.pagada).length)} />
                    <AdminMetric icon={<School size={18} />} label="Pendientes" value={String(pensiones.filter((p) => p.anio === pensionYear && !p.pagada).length)} />
                    <AdminMetric icon={<BookOpen size={18} />} label="Año" value={String(pensionYear)} />
                  </div>

                  <div className="grid gap-3 rounded-[16px] border border-monserrat-ink/8 bg-white p-4 shadow-sm md:grid-cols-[160px_1fr_auto]">
                    <AdminField label="Año">
                      <select value={pensionYear} onChange={(e) => setPensionYear(Number(e.target.value))} className="admin-input">
                        {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </AdminField>
                    <AdminField label="Buscar alumno">
                      <input value={pensionSearch} onChange={(e) => setPensionSearch(e.target.value)} className="admin-input" placeholder="Nombre, DNI, grado o sección" />
                    </AdminField>
                    <div className="flex items-end">
                      <button type="button" onClick={() => void exportarPensionesExcel()}
                        className="inline-flex items-center gap-1.5 rounded-[10px] bg-monserrat-ink px-4 py-2.5 text-[12px] font-black text-white hover:bg-monserrat-ink/90">
                        <Download size={14} /> Exportar pensiones
                      </button>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[16px] border border-monserrat-ink/8 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="min-w-[1280px] w-full border-collapse text-left text-[12px]">
                        <thead className="bg-monserrat-ink text-monserrat-cream">
                          <tr>
                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em]">Alumno</th>
                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em]">Nivel</th>
                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em]">Grado</th>
                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em]">Sección</th>
                            {MESES_PENSION.map((mes) => (
                              <th key={mes} className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.1em]">{mes}</th>
                            ))}
                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em]">Resumen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {alumnosConPensiones.length === 0 ? (
                            <tr>
                              <td colSpan={17} className="px-4 py-10 text-center text-[13px] font-semibold text-monserrat-ink/40">
                                No hay alumnos para mostrar
                              </td>
                            </tr>
                          ) : alumnosConPensiones.map(({ alumno, meses }) => {
                            const pagados = Object.values(meses).filter((mes) => mes?.pagada).length;
                            return (
                              <tr key={alumno.dni} className="border-t border-monserrat-ink/6 hover:bg-monserrat-cream/20">
                                <td className="px-4 py-3">
                                  <p className="font-black text-monserrat-ink">{alumno.nombre}</p>
                                  <p className="text-[11px] font-semibold text-monserrat-ink/45">{alumno.codigo || alumno.dni}</p>
                                </td>
                                <td className="px-4 py-3 text-monserrat-ink/70">{labelFromEnum(alumno.nivelEducativo ?? "")}</td>
                                <td className="px-4 py-3 text-monserrat-ink/70">{labelAcademico(alumno.grado ?? "")}</td>
                                <td className="px-4 py-3 text-monserrat-ink/70">{alumno.seccion ?? "-"}</td>
                                {Array.from({ length: 12 }, (_, index) => {
                                  const mes = index + 1;
                                  const registro = meses[mes];
                                  const pagada = Boolean(registro?.pagada);
                                  return (
                                    <td key={mes} className="px-2 py-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => actualizarPensionMensual(registro ?? { alumnoDni: alumno.dni, alumnoCodigo: alumno.codigo, alumnoNombre: alumno.nombre, nivelEducativo: alumno.nivelEducativo, grado: alumno.grado, seccion: alumno.seccion, anio: pensionYear, mes, pagada: false }, !pagada)}
                                        className={`inline-flex min-w-[78px] items-center justify-center rounded-[10px] px-2 py-2 text-[11px] font-black transition ${pagada ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-monserrat-cream/60 text-monserrat-ink/55 hover:bg-monserrat-cream"}`}>
                                        {pagada ? "Pagado" : "Pendiente"}
                                      </button>
                                    </td>
                                  );
                                })}
                                <td className="px-4 py-3 text-[11px] font-bold text-monserrat-ink/70">
                                  {pagados}/12
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {tab === "configuracion" && (
                <div className="grid gap-5">
                  <div className="grid gap-3 md:grid-cols-4">
                    <AdminMetric icon={<BookOpen size={18} />} label="Cursos primaria" value={String(cursosPrimariaActivos.length)} />
                    <AdminMetric icon={<School size={18} />} label="Grados primaria" value={String(gradosActivosPorNivel("PRIMARIA").length)} />
                    <AdminMetric icon={<GraduationCap size={18} />} label="Cursos secundaria" value={String(cursosSecundariaActivos.length)} />
                    <AdminMetric icon={<Users size={18} />} label="Grados secundaria" value={String(gradosActivosPorNivel("SECUNDARIA").length)} />
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
                    <div className="grid content-start gap-2 rounded-[16px] border border-monserrat-ink/8 bg-white p-3 shadow-sm">
                      <p className="px-2 pt-1 text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">Primaria</p>
                      {([
                        { id: "primaria-cursos" as const, icon: <BookOpen size={16} />, title: "Cursos", count: academicoConfig.cursosPrimaria.length },
                        { id: "primaria-grados" as const, icon: <School size={16} />, title: "Grados", count: academicoConfig.gradosPrimaria.length },
                        { id: "primaria-secciones" as const, icon: <Users size={16} />, title: "Secciones", count: academicoConfig.seccionesPrimaria.length },
                        { id: "primaria-salones" as const, icon: <ShieldCheck size={16} />, title: "Salones", count: academicoConfig.salones.filter((salon) => salon.nivel === "PRIMARIA").length }
                      ]).map((item) => (
                        <button key={item.id} type="button" onClick={() => setConfigView(item.id)}
                          className={`flex items-center justify-between gap-3 rounded-[12px] px-3 py-3 text-left transition ${configView === item.id ? "bg-monserrat-red text-white" : "bg-monserrat-cream/45 text-monserrat-ink/65 hover:bg-monserrat-cream"}`}>
                          <span className="flex min-w-0 items-center gap-2">
                            {item.icon}
                            <span className="truncate text-[13px] font-black">{item.title}</span>
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${configView === item.id ? "bg-white/18" : "bg-white"}`}>{item.count}</span>
                        </button>
                      ))}
                      <p className="px-2 pt-3 text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">Secundaria</p>
                      {([
                        { id: "secundaria-cursos" as const, icon: <BookOpen size={16} />, title: "Cursos", count: academicoConfig.cursosSecundaria.length },
                        { id: "secundaria-grados" as const, icon: <GraduationCap size={16} />, title: "Grados", count: academicoConfig.gradosSecundaria.length },
                        { id: "secundaria-secciones" as const, icon: <Users size={16} />, title: "Secciones", count: academicoConfig.seccionesSecundaria.length },
                        { id: "secundaria-salones" as const, icon: <ShieldCheck size={16} />, title: "Salones", count: academicoConfig.salones.filter((salon) => salon.nivel === "SECUNDARIA").length }
                      ]).map((item) => (
                        <button key={item.id} type="button" onClick={() => setConfigView(item.id)}
                          className={`flex items-center justify-between gap-3 rounded-[12px] px-3 py-3 text-left transition ${configView === item.id ? "bg-monserrat-red text-white" : "bg-monserrat-cream/45 text-monserrat-ink/65 hover:bg-monserrat-cream"}`}>
                          <span className="flex min-w-0 items-center gap-2">
                            {item.icon}
                            <span className="truncate text-[13px] font-black">{item.title}</span>
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${configView === item.id ? "bg-white/18" : "bg-white"}`}>{item.count}</span>
                        </button>
                      ))}
                      <button type="button" onClick={() => saveAcademicoConfig(defaultAcademicoConfig)}
                        className="mt-3 rounded-[10px] border border-monserrat-ink/12 px-3 py-2 text-[12px] font-black text-monserrat-ink/60 hover:border-monserrat-ink/30">
                        Restaurar valores iniciales
                      </button>
                    </div>

                    <div className="min-w-0">
                      {configView === "primaria-cursos" && (
                        <ConfigPanel title="Cursos de primaria" items={academicoConfig.cursosPrimaria} onChange={(items) => saveAcademicoConfig({ ...academicoConfig, cursosPrimaria: items })} />
                      )}
                      {configView === "primaria-secciones" && (
                        <ConfigPanel title="Secciones de primaria" items={academicoConfig.seccionesPrimaria} onChange={(items) => saveAcademicoConfig({ ...academicoConfig, seccionesPrimaria: items })} />
                      )}
                      {configView === "primaria-grados" && (
                        <ConfigPanel title="Grados de primaria" items={academicoConfig.gradosPrimaria} onChange={(items) => saveAcademicoConfig({ ...academicoConfig, gradosPrimaria: items })} />
                      )}
                      {configView === "secundaria-cursos" && (
                        <ConfigPanel title="Cursos de secundaria" items={academicoConfig.cursosSecundaria} onChange={(items) => saveAcademicoConfig({ ...academicoConfig, cursosSecundaria: items })} />
                      )}
                      {configView === "secundaria-secciones" && (
                        <ConfigPanel title="Secciones de secundaria" items={academicoConfig.seccionesSecundaria} onChange={(items) => saveAcademicoConfig({ ...academicoConfig, seccionesSecundaria: items })} />
                      )}
                      {configView === "secundaria-grados" && (
                        <ConfigPanel title="Grados de secundaria" items={academicoConfig.gradosSecundaria} onChange={(items) => saveAcademicoConfig({ ...academicoConfig, gradosSecundaria: items })} />
                      )}
                      {(configView === "primaria-salones" || configView === "secundaria-salones") && (
                        <SalonConfigPanel
                          nivel={configView === "secundaria-salones" ? "SECUNDARIA" : "PRIMARIA"}
                          salones={academicoConfig.salones.filter((salon) => salon.nivel === (configView === "secundaria-salones" ? "SECUNDARIA" : "PRIMARIA"))}
                          addSalon={() => addSalonConfig(configView === "secundaria-salones" ? "SECUNDARIA" : "PRIMARIA")}
                          updateSalon={updateSalonConfig}
                          deleteSalon={deleteSalonConfig}
                          gradosActivosPorNivel={gradosActivosPorNivel}
                          seccionesActivas={seccionesActivasPorNivel(configView === "secundaria-salones" ? "SECUNDARIA" : "PRIMARIA")}
                          labelAcademico={labelAcademico}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      </div>
    </section>
  );
}

/* ── Helpers UI ─────────────────────────────────────────── */

function AdminField({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <label className="text-[11px] font-black uppercase tracking-[0.08em] text-monserrat-ink/50">{label}</label>
      {children}
    </div>
  );
}

function AdminFormBtn({ isBusy }: { isBusy: boolean }) {
  return (
    <button disabled={isBusy}
      className="inline-flex items-center gap-2 rounded-[12px] bg-monserrat-red px-6 py-2.5 text-[13px] font-black text-white transition hover:bg-monserrat-red/85 disabled:opacity-60">
      <Save size={15} /> Guardar cambios
    </button>
  );
}

function AdminMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[16px] border border-monserrat-ink/8 bg-white p-4 shadow-sm">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] bg-monserrat-red/8 text-monserrat-red">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">{label}</p>
        <p className="mt-0.5 text-xl font-black text-monserrat-ink">{value}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-white px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-monserrat-ink/40">{label}</p>
      <p className="mt-1 text-lg font-black text-monserrat-ink">{value}</p>
    </div>
  );
}

function RosterPanel({ title, empty, rows }: { title: string; empty: string; rows: { id: string; title: string; detail: string }[] }) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-monserrat-ink/8 bg-white shadow-sm">
      <div className="border-b border-monserrat-ink/8 bg-monserrat-ink px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-cream/70">{title}</p>
      </div>
      <div className="max-h-[420px] overflow-y-auto p-3">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm font-semibold text-monserrat-ink/40">{empty}</p>
        ) : rows.map((row) => (
          <div key={row.id} className="border-b border-monserrat-ink/6 px-2 py-3 last:border-b-0">
            <p className="truncate text-sm font-black text-monserrat-ink">{row.title}</p>
            <p className="mt-1 truncate text-[12px] font-semibold text-monserrat-ink/50">{row.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfigPanel({ title, items, onChange }: { title: string; items: CatalogItem[]; onChange: (items: CatalogItem[]) => void }) {
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const updateItem = (index: number, patch: Partial<CatalogItem>) => {
    onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };
  const addItem = () => {
    const label = `Nuevo ${title.toLowerCase()} ${items.length + 1}`;
    onChange([...items, { id: createCatalogId(label, items), label, active: true }]);
  };
  const deleteItem = (index: number) => {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
    setDeleteIndex(null);
  };
  const itemToDelete = deleteIndex === null ? null : items[deleteIndex];

  return (
    <div className="overflow-hidden rounded-[16px] border border-monserrat-ink/8 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-monserrat-ink/8 bg-monserrat-ink px-5 py-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-cream/70">Configuracion</p>
          <h4 className="font-serif text-xl font-black text-white">{title}</h4>
        </div>
        <button type="button" onClick={addItem} className="inline-flex items-center gap-1 rounded-[10px] bg-white/10 px-3 py-2 text-[11px] font-black text-monserrat-cream hover:bg-white/18">
          <Plus size={12} /> Agregar
        </button>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => (
          <div key={item.id} className={`rounded-[14px] border p-4 transition ${item.active ? "border-monserrat-ink/8 bg-monserrat-cream/25" : "border-monserrat-ink/8 bg-white opacity-60"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">{item.id}</p>
                <input value={item.label} onChange={(e) => updateItem(index, { label: e.target.value })} className="mt-2 w-full rounded-[10px] border border-monserrat-ink/10 bg-white px-3 py-2 text-sm font-black text-monserrat-ink outline-none focus:border-monserrat-red" />
              </div>
              <button type="button" onClick={() => setDeleteIndex(index)} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] bg-monserrat-red/8 text-monserrat-red hover:bg-monserrat-red/16">
                <Trash2 size={13} />
              </button>
            </div>
            <button type="button" onClick={() => updateItem(index, { active: !item.active })}
              className={`mt-3 w-full rounded-[10px] px-3 py-2 text-[11px] font-black ${item.active ? "bg-emerald-600 text-white" : "bg-monserrat-ink/8 text-monserrat-ink/55"}`}>
              {item.active ? "Activo" : "Inactivo"}
            </button>
          </div>
        ))}
      </div>
      {itemToDelete && (
        <ConfirmDeleteModal
          title="Eliminar configuracion"
          message={`Vas a eliminar "${itemToDelete.label}". Si hay alumnos, docentes, salones o asignaciones vinculadas, pueden quedar afectados.`}
          onCancel={() => setDeleteIndex(null)}
          onConfirm={() => {
            if (deleteIndex !== null) deleteItem(deleteIndex);
          }}
        />
      )}
    </div>
  );
}

function SalonConfigPanel({
  nivel,
  salones,
  addSalon,
  updateSalon,
  deleteSalon,
  gradosActivosPorNivel,
  seccionesActivas,
  labelAcademico
}: {
  nivel: string;
  salones: SalonItem[];
  addSalon: () => void;
  updateSalon: (salon: SalonItem, patch: Partial<SalonItem>) => void;
  deleteSalon: (salon: SalonItem) => void;
  gradosActivosPorNivel: (nivel?: string) => string[];
  seccionesActivas: string[];
  labelAcademico: (id: string) => string;
}) {
  const [deleteTarget, setDeleteTarget] = useState<SalonItem | null>(null);
  return (
    <div className="overflow-hidden rounded-[16px] border border-monserrat-ink/8 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-monserrat-ink/8 bg-monserrat-ink px-5 py-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-cream/70">Configuracion</p>
          <h4 className="font-serif text-xl font-black text-white">Salones de {labelAcademico(nivel)}</h4>
        </div>
        <button type="button" onClick={addSalon} className="inline-flex items-center gap-1 rounded-[10px] bg-white/10 px-3 py-2 text-[11px] font-black text-monserrat-cream hover:bg-white/18">
          <Plus size={12} /> Agregar
        </button>
      </div>
      <div className="grid gap-3 p-4 xl:grid-cols-2">
        {salones.map((salon) => (
          <div key={`${salon.nivel}-${salon.grado}-${salon.seccion}-${salon.aula}`} className={`rounded-[14px] border p-4 ${salon.active ? "border-monserrat-ink/8 bg-monserrat-cream/25" : "border-monserrat-ink/8 bg-white opacity-60"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">{labelAcademico(salon.nivel)}</p>
                <h5 className="mt-1 font-serif text-lg font-black text-monserrat-ink">Aula {salon.aula}</h5>
              </div>
              <button type="button" onClick={() => setDeleteTarget(salon)} className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-monserrat-red/8 text-monserrat-red hover:bg-monserrat-red/16">
                <Trash2 size={13} />
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <AdminField label="Nivel">
                <input value={labelAcademico(salon.nivel)} className="admin-input" disabled />
              </AdminField>
              <AdminField label="Aula">
                <input value={salon.aula} onChange={(e) => updateSalon(salon, { aula: e.target.value })} className="admin-input" />
              </AdminField>
              <AdminField label="Grado">
                <select value={salon.grado} onChange={(e) => updateSalon(salon, { grado: e.target.value })} className="admin-input">
                  {gradosActivosPorNivel(salon.nivel).map((grado) => <option key={grado} value={grado}>{labelAcademico(grado)}</option>)}
                </select>
              </AdminField>
              <AdminField label="Seccion">
                <select value={salon.seccion} onChange={(e) => updateSalon(salon, { seccion: e.target.value })} className="admin-input">
                  {seccionesActivas.map((seccion) => <option key={seccion} value={seccion}>{labelAcademico(seccion)}</option>)}
                </select>
              </AdminField>
            </div>
            <button type="button" onClick={() => updateSalon(salon, { active: !salon.active })}
              className={`mt-3 w-full rounded-[10px] px-3 py-2 text-[11px] font-black ${salon.active ? "bg-emerald-600 text-white" : "bg-monserrat-ink/8 text-monserrat-ink/55"}`}>
              {salon.active ? "Activo" : "Inactivo"}
            </button>
          </div>
        ))}
      </div>
      {deleteTarget && (
        <ConfirmDeleteModal
          title="Eliminar salon"
          message={`Vas a eliminar el aula ${deleteTarget.aula}. Si hay alumnos, docentes o asignaciones vinculadas, pueden quedar afectados.`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteSalon(deleteTarget);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}

function ConfirmDeleteModal({ title, message, onCancel, onConfirm }: { title: string; message: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[420px] overflow-hidden rounded-[18px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="border-b border-monserrat-ink/8 bg-monserrat-cream px-5 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-red">Confirmacion requerida</p>
          <h3 className="mt-1 font-serif text-xl font-black text-monserrat-ink">{title}</h3>
        </div>
        <div className="grid gap-4 p-5">
          <p className="text-sm font-semibold leading-6 text-monserrat-ink/70">{message}</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="rounded-[10px] border border-monserrat-ink/12 px-4 py-2 text-[12px] font-black text-monserrat-ink/60 hover:border-monserrat-ink/30">
              Cancelar
            </button>
            <button type="button" onClick={onConfirm} className="rounded-[10px] bg-monserrat-red px-4 py-2 text-[12px] font-black text-white hover:bg-monserrat-red/85">
              Si, eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function mergeAcademicoConfig(config: Partial<AcademicoConfig>) {
  const legacy = config as Partial<AcademicoConfig> & { cursos?: CatalogItem[]; secciones?: CatalogItem[] };
  const hasSavedConfig = [
    config.cursosPrimaria,
    config.cursosSecundaria,
    config.gradosPrimaria,
    config.gradosSecundaria,
    config.seccionesPrimaria,
    config.seccionesSecundaria,
    config.salones,
    legacy.cursos,
    legacy.secciones
  ].some((items) => Array.isArray(items));

  if (!hasSavedConfig) return defaultAcademicoConfig;

  return {
    cursosPrimaria: config.cursosPrimaria ?? legacy.cursos ?? defaultAcademicoConfig.cursosPrimaria,
    cursosSecundaria: config.cursosSecundaria ?? legacy.cursos ?? defaultAcademicoConfig.cursosSecundaria,
    gradosPrimaria: config.gradosPrimaria ?? defaultAcademicoConfig.gradosPrimaria,
    gradosSecundaria: config.gradosSecundaria ?? defaultAcademicoConfig.gradosSecundaria,
    seccionesPrimaria: config.seccionesPrimaria ?? legacy.secciones ?? defaultAcademicoConfig.seccionesPrimaria,
    seccionesSecundaria: config.seccionesSecundaria ?? legacy.secciones ?? defaultAcademicoConfig.seccionesSecundaria,
    salones: config.salones ?? defaultAcademicoConfig.salones
  };
}

function isAdminTab(value: string | null): value is Tab {
  return value === "institucion"
    || value === "ingresantes"
    || value === "videos"
    || value === "redes"
    || value === "academico"
    || value === "asignaciones"
    || value === "pensiones"
    || value === "configuracion";
}

function createCatalogId(label: string, existing: CatalogItem[]) {
  const base = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "NUEVO";
  let id = base;
  let counter = 1;
  while (existing.some((item) => item.id === id)) {
    counter += 1;
    id = `${base}_${counter}`;
  }
  return id;
}

function gradosPorNivel(nivel?: string) {
  return nivel === "SECUNDARIA" ? GRADOS_SECUNDARIA : GRADOS_PRIMARIA;
}

function defaultGrado(nivel: string) {
  return nivel === "SECUNDARIA" ? "PRIMERO_SECUNDARIA" : "PRIMERO_PRIMARIA";
}

function aulasPorNivel(nivel?: string) {
  const grados = nivel === "SECUNDARIA" ? GRADOS_SECUNDARIA : GRADOS_PRIMARIA;
  return grados.flatMap((grado) => SECCIONES.map((seccion) => aulaPorGradoSeccion(nivel, grado, seccion)));
}

function aulaPorGradoSeccion(nivel: string | undefined, grado: string, seccion: string) {
  const grados = nivel === "SECUNDARIA" ? GRADOS_SECUNDARIA : GRADOS_PRIMARIA;
  const base = nivel === "SECUNDARIA" ? 700 : 100;
  const gradoIndex = Math.max(grados.indexOf(grado), 0) + 1;
  const seccionIndex = Math.max(SECCIONES.indexOf(seccion), 0) + 1;
  return String(base + gradoIndex * 10 + seccionIndex);
}

function labelFromEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeNivel(value: unknown) {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
  if (normalized.includes("SECUNDARIA")) return "SECUNDARIA";
  if (normalized.includes("PRIMARIA")) return "PRIMARIA";
  return "";
}

function normalizeGrado(value: unknown, nivel: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const grados = nivel === "SECUNDARIA" ? GRADOS_SECUNDARIA : GRADOS_PRIMARIA;
  const exact = grados.find((grado) => grado === normalized);
  if (exact) return exact;
  const ordinalMap: Record<string, string> = {
    "1": "PRIMERO",
    "01": "PRIMERO",
    PRIMERO: "PRIMERO",
    PRIMER: "PRIMERO",
    "2": "SEGUNDO",
    "02": "SEGUNDO",
    SEGUNDO: "SEGUNDO",
    "3": "TERCERO",
    "03": "TERCERO",
    TERCERO: "TERCERO",
    TERCER: "TERCERO",
    "4": "CUARTO",
    "04": "CUARTO",
    CUARTO: "CUARTO",
    "5": "QUINTO",
    "05": "QUINTO",
    QUINTO: "QUINTO",
    "6": "SEXTO",
    "06": "SEXTO",
    SEXTO: "SEXTO"
  };
  const token = normalized.split("_").find((part) => ordinalMap[part]);
  const ordinal = token ? ordinalMap[token] : "";
  return grados.find((grado) => grado.startsWith(ordinal)) ?? "";
}

function parseBooleanCell(value: unknown) {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "SI" || normalized === "SÍ" || normalized === "TRUE" || normalized === "1" || normalized === "PAGADA";
}

function MediaPicker({ label, accept, previewUrl, previewType, onFileChange }: { label: string; accept: string; previewUrl?: string; previewType?: string; onFileChange: (f: File | null) => void }) {
  return (
    <div className="grid gap-2">
      <p className="text-[11px] font-black uppercase tracking-[0.08em] text-monserrat-ink/50">{label}</p>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed border-monserrat-ink/18 bg-white py-2.5 text-[12px] font-bold text-monserrat-ink/60 transition hover:border-monserrat-red hover:text-monserrat-red">
        <Upload size={14} /> Subir archivo
        <input type="file" accept={accept} onChange={(e) => onFileChange(e.target.files?.[0] ?? null)} className="hidden" />
      </label>
      {previewUrl ? (
        <div className="overflow-hidden rounded-[10px] border border-monserrat-ink/8">
          {previewType === "video"
            ? <video src={previewUrl} controls className="h-40 w-full bg-black object-cover" />
            : <img src={previewUrl} alt="" className="h-40 w-full object-cover" />}
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-[10px] border border-dashed border-monserrat-ink/10 bg-white text-[12px] font-semibold text-monserrat-ink/40">
          <ImagePlus size={16} className="mr-2" /> Sin archivo
        </div>
      )}
    </div>
  );
}

function AdminTable({ headers, rows }: { headers: string[]; rows: { id: number; values: string[]; onEdit: () => void; onDelete: () => void }[] }) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-monserrat-ink/8">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[12.5px]">
          <thead className="bg-monserrat-ink">
            <tr>{headers.map((h) => <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-monserrat-cream/70">{h}</th>)}
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-monserrat-cream/70"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-monserrat-ink/6 hover:bg-monserrat-cream/20">
                {row.values.map((v, i) => <td key={i} className="max-w-[220px] truncate px-4 py-3 text-monserrat-ink/80">{v}</td>)}
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <button type="button" onClick={row.onEdit} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-monserrat-ink/12 bg-white hover:border-monserrat-ink/30"><Edit3 size={13} /></button>
                    <button type="button" onClick={row.onDelete} className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-monserrat-red/8 text-monserrat-red hover:bg-monserrat-red/16"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
