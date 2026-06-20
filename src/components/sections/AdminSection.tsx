import { BookOpen, Edit3, GraduationCap, ImagePlus, LogOut, Plus, Save, School, ShieldCheck, Trash2, Upload, UserPlus, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { monserratApi } from "../../api/monserrat";
import type { AsignacionAcademica, Ingresante, Institution, LoginResponse, RedSocial, UsuarioAcademico, Video } from "../../types";
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

type AdminSectionProps = {
  institution: Institution;
  ingresantes: Ingresante[];
  videos: Video[];
  redes: RedSocial[];
  onRefresh: () => Promise<void>;
};

type Tab = "institucion" | "ingresantes" | "videos" | "redes" | "academico" | "asignaciones";

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
  const [tab, setTab] = useState<Tab>("ingresantes");
  const [status, setStatus] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // filtros tabla ingresantes
  const [filterYear, setFilterYear] = useState("");
  const [filterSel, setFilterSel] = useState("");
  const [academicoSearch, setAcademicoSearch] = useState("");

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
      editingUsuarioAcademico
        ? await monserratApi.updateUsuarioAcademico(editingUsuarioAcademico.id, usuarioAcademicoForm, token)
        : await monserratApi.createUsuarioAcademico(usuarioAcademicoForm, token);
      setUsuariosAcademicos(await monserratApi.usuariosAcademicos(token));
      setEditingUsuarioAcademico(null);
      setUsuarioAcademicoForm(emptyUsuarioAcademico);
    }, "Usuario academico guardado");
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
  const videoPreview = videoMediaFile
    ? { src: URL.createObjectURL(videoMediaFile), type: videoMediaFile.type.startsWith("video/") ? "video" : "image" }
    : { src: videoForm.thumbnailUrl || videoForm.mediaUrl, type: videoForm.mediaType };

  const docentes = useMemo(() => usuariosAcademicos.filter((u) => u.rol === "DOCENTE"), [usuariosAcademicos]);
  const alumnos = useMemo(() => usuariosAcademicos.filter((u) => u.rol === "ALUMNO"), [usuariosAcademicos]);
  const alumnosDelAula = useMemo(() => alumnos.filter((u) =>
    u.nivelEducativo === asignacionAcademicaForm.nivelEducativo
    && u.grado === asignacionAcademicaForm.grado
    && u.seccion === asignacionAcademicaForm.seccion
  ), [alumnos, asignacionAcademicaForm.grado, asignacionAcademicaForm.nivelEducativo, asignacionAcademicaForm.seccion]);
  const docentesSugeridos = useMemo(() => {
    if (asignacionAcademicaForm.nivelEducativo !== "SECUNDARIA") return docentes;
    return docentes.filter((u) => !u.materia || u.materia === asignacionAcademicaForm.curso);
  }, [asignacionAcademicaForm.curso, asignacionAcademicaForm.nivelEducativo, docentes]);
  const asignacionesDelAula = useMemo(() => asignacionesAcademicas.filter((a) =>
    a.nivelEducativo === asignacionAcademicaForm.nivelEducativo
    && a.grado === asignacionAcademicaForm.grado
    && a.seccion === asignacionAcademicaForm.seccion
  ), [asignacionesAcademicas, asignacionAcademicaForm.grado, asignacionAcademicaForm.nivelEducativo, asignacionAcademicaForm.seccion]);
  const usuariosFiltrados = useMemo(() => {
    const term = academicoSearch.trim().toLowerCase();
    if (!term) return usuariosAcademicos;
    return usuariosAcademicos.filter((u) => [u.codigo, u.dni, u.nombre, u.rol, u.grado, u.seccion, u.materia, u.especialidad]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term)));
  }, [academicoSearch, usuariosAcademicos]);

  const TABS: { id: Tab; label: string }[] = [
    { id: "institucion", label: "Institución" },
    { id: "ingresantes", label: "Ingresantes" },
    { id: "videos", label: "Carrusel" },
    { id: "redes", label: "Redes sociales" },
    { id: "asignaciones", label: "Asignaciones" },
    { id: "academico", label: "Academico" },
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
                          onClick={() => setAsignacionAcademicaForm({ ...asignacionAcademicaForm, nivelEducativo: nivel, grado: defaultGrado(nivel), curso: nivel === "SECUNDARIA" ? asignacionAcademicaForm.curso : "MATEMATICA" })}
                          className={`rounded-[10px] border px-3 py-2 text-[12px] font-black transition ${asignacionAcademicaForm.nivelEducativo === nivel ? "border-monserrat-red bg-monserrat-red text-white" : "border-monserrat-ink/10 bg-monserrat-cream/45 text-monserrat-ink/65 hover:border-monserrat-ink/25"}`}>
                          {labelFromEnum(nivel)}
                        </button>
                      ))}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <AdminField label="Grado">
                        <select value={asignacionAcademicaForm.grado ?? "PRIMERO_PRIMARIA"} onChange={(e) => setAsignacionAcademicaForm({ ...asignacionAcademicaForm, grado: e.target.value })} className="admin-input" required>
                          {gradosPorNivel(asignacionAcademicaForm.nivelEducativo).map((grado) => <option key={grado} value={grado}>{labelFromEnum(grado)}</option>)}
                        </select>
                      </AdminField>
                      <AdminField label="Seccion">
                        <select value={asignacionAcademicaForm.seccion ?? "A"} onChange={(e) => setAsignacionAcademicaForm({ ...asignacionAcademicaForm, seccion: e.target.value })} className="admin-input" required>
                          {SECCIONES.map((seccion) => <option key={seccion} value={seccion}>{seccion}</option>)}
                        </select>
                      </AdminField>
                    </div>
                    {(asignacionAcademicaForm.nivelEducativo === "SECUNDARIA" || editingAsignacionAcademica) && (
                      <AdminField label="Curso">
                        <select value={asignacionAcademicaForm.curso} onChange={(e) => setAsignacionAcademicaForm({ ...asignacionAcademicaForm, curso: e.target.value })} className="admin-input" required>
                          {CURSOS.map((curso) => <option key={curso} value={curso}>{labelFromEnum(curso)}</option>)}
                        </select>
                      </AdminField>
                    )}
                    <AdminField label="Docente">
                      <select value={asignacionAcademicaForm.docenteDni} onChange={(e) => setAsignacionAcademicaForm({ ...asignacionAcademicaForm, docenteDni: e.target.value })} className="admin-input" required>
                        <option value="">Selecciona</option>
                        {docentesSugeridos.map((u) => (
                          <option key={u.dni} value={u.dni}>{u.nombre} - {u.materia ? labelFromEnum(u.materia) : u.dni}</option>
                        ))}
                      </select>
                    </AdminField>
                    {editingAsignacionAcademica && (
                      <AdminField label="Alumno">
                        <select value={asignacionAcademicaForm.alumnoDni} onChange={(e) => setAsignacionAcademicaForm({ ...asignacionAcademicaForm, alumnoDni: e.target.value })} className="admin-input" required>
                          <option value="">Selecciona</option>
                          {usuariosAcademicos.filter((u) => u.rol === "ALUMNO").map((u) => (
                            <option key={u.dni} value={u.dni}>{u.nombre} - {u.dni}</option>
                          ))}
                        </select>
                      </AdminField>
                    )}
                    <div className="rounded-[12px] border border-monserrat-ink/8 bg-monserrat-cream/35 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/45">Alumnos que recibiran la asignacion</p>
                      <div className="mt-2 max-h-32 overflow-y-auto">
                        {alumnosDelAula.length === 0 ? (
                          <p className="text-[12px] font-semibold text-monserrat-red">No hay alumnos activos en esta aula.</p>
                        ) : (
                          alumnosDelAula.slice(0, 8).map((alumno) => <p key={alumno.dni} className="truncate text-[12px] font-bold text-monserrat-ink/70">{alumno.nombre}</p>)
                        )}
                        {alumnosDelAula.length > 8 && <p className="mt-1 text-[11px] font-black text-monserrat-ink/45">+{alumnosDelAula.length - 8} mas</p>}
                      </div>
                    </div>
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
                        <h4 className="mt-1 font-serif text-[20px] font-black text-monserrat-ink">{labelFromEnum(asignacionAcademicaForm.grado ?? "")} {asignacionAcademicaForm.seccion}</h4>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          <MiniStat label="Alumnos" value={String(alumnosDelAula.length)} />
                          <MiniStat label="Docentes asignados" value={String(new Set(asignacionesDelAula.map((a) => a.docenteDni)).size)} />
                          <MiniStat label="Cursos cubiertos" value={String(new Set(asignacionesDelAula.map((a) => a.curso)).size)} />
                        </div>
                      </div>
                      <AdminTable headers={["Docente", "Alumno", "Curso", "Aula", "Estado"]}
                        rows={asignacionesDelAula.map((a) => ({
                          id: a.id,
                          values: [a.docenteNombre, a.alumnoNombre, labelFromEnum(a.curso), `${labelFromEnum(a.grado ?? "")} ${a.seccion ?? ""}`.trim(), a.activo ? "Activa" : "Inactiva"],
                          onEdit: () => {
                            if (a.nivelEducativo === "PRIMARIA") {
                              setStatus("Para cambiar primaria, asigna nuevamente el tutor al aula completa.");
                              setEditingAsignacionAcademica(null);
                              setAsignacionAcademicaForm({ docenteDni: a.docenteDni, alumnoDni: "", curso: "MATEMATICA", nivelEducativo: a.nivelEducativo ?? "PRIMARIA", grado: a.grado ?? "PRIMERO_PRIMARIA", seccion: a.seccion ?? "A", activo: true });
                              return;
                            }
                            setEditingAsignacionAcademica(a);
                            setAsignacionAcademicaForm({ docenteDni: a.docenteDni, alumnoDni: a.alumnoDni, curso: a.curso, nivelEducativo: a.nivelEducativo ?? "PRIMARIA", grado: a.grado ?? "PRIMERO_PRIMARIA", seccion: a.seccion ?? "A", activo: Boolean(a.activo) });
                          },
                          onDelete: () => void runAdminAction(async () => {
                            await monserratApi.deleteAsignacionAcademica(a.id, token);
                            setAsignacionesAcademicas(await monserratApi.asignacionesAcademicas(token));
                          }, "Asignacion desactivada"),
                        }))} />
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
                  <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
                  <form onSubmit={submitUsuarioAcademico}
                    className="grid content-start gap-4 rounded-[18px] border border-monserrat-ink/8 bg-white p-5 shadow-sm">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-red">Registro academico</p>
                      <h4 className="mt-1 font-serif text-[20px] font-black text-monserrat-ink">
                        {editingUsuarioAcademico ? "Editar usuario" : "Nuevo usuario"}
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(["ALUMNO", "DOCENTE"] as const).map((rol) => (
                        <button key={rol} type="button"
                          onClick={() => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, rol, materia: rol === "DOCENTE" ? (usuarioAcademicoForm.materia || "MATEMATICA") : "", nivelEducativo: rol === "ALUMNO" ? (usuarioAcademicoForm.nivelEducativo || "PRIMARIA") : usuarioAcademicoForm.nivelEducativo })}
                          className={`rounded-[10px] border px-3 py-2 text-[12px] font-black transition ${usuarioAcademicoForm.rol === rol ? "border-monserrat-red bg-monserrat-red text-white" : "border-monserrat-ink/10 bg-monserrat-cream/45 text-monserrat-ink/65 hover:border-monserrat-ink/25"}`}>
                          {rol === "ALUMNO" ? "Alumno" : "Docente"}
                        </button>
                      ))}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <AdminField label="Estado">
                        <select value={usuarioAcademicoForm.estado ?? "ACTIVO"} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, estado: e.target.value })} className="admin-input">
                          {ESTADOS_USUARIO.map((estado) => <option key={estado} value={estado}>{labelFromEnum(estado)}</option>)}
                        </select>
                      </AdminField>
                      <AdminField label="Codigo">
                        <input value={usuarioAcademicoForm.codigo ?? ""} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, codigo: e.target.value })} className="admin-input" />
                      </AdminField>
                      <AdminField label="DNI">
                        <input value={usuarioAcademicoForm.dni} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, dni: e.target.value })} className="admin-input" required disabled={Boolean(editingUsuarioAcademico)} />
                      </AdminField>
                      <AdminField label="Nombre completo">
                        <input value={usuarioAcademicoForm.nombre} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, nombre: e.target.value })} className="admin-input" required />
                      </AdminField>
                      <AdminField label="Correo">
                        <input type="email" value={usuarioAcademicoForm.correo ?? ""} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, correo: e.target.value })} className="admin-input" />
                      </AdminField>
                      <AdminField label="Telefono">
                        <input value={usuarioAcademicoForm.telefono ?? ""} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, telefono: e.target.value })} className="admin-input" />
                      </AdminField>
                    </div>
                    {usuarioAcademicoForm.rol === "DOCENTE" ? (
                      <div className="grid gap-3 rounded-[12px] border border-monserrat-ink/8 bg-monserrat-cream/35 p-3 sm:grid-cols-2">
                        <AdminField label="Curso principal">
                          <select value={usuarioAcademicoForm.materia ?? "MATEMATICA"} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, materia: e.target.value })} className="admin-input">
                            {CURSOS.map((curso) => <option key={curso} value={curso}>{labelFromEnum(curso)}</option>)}
                          </select>
                        </AdminField>
                        <AdminField label="Especialidad">
                          <input value={usuarioAcademicoForm.especialidad ?? ""} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, especialidad: e.target.value })} className="admin-input" />
                        </AdminField>
                      </div>
                    ) : (
                      <div className="grid gap-3 rounded-[12px] border border-monserrat-ink/8 bg-monserrat-cream/35 p-3 sm:grid-cols-2">
                        <AdminField label="Nivel">
                          <select value={usuarioAcademicoForm.nivelEducativo ?? "PRIMARIA"} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, nivelEducativo: e.target.value, grado: defaultGrado(e.target.value) })} className="admin-input">
                            {NIVELES.map((nivel) => <option key={nivel} value={nivel}>{labelFromEnum(nivel)}</option>)}
                          </select>
                        </AdminField>
                        <AdminField label="Grado">
                          <select value={usuarioAcademicoForm.grado ?? "PRIMERO_PRIMARIA"} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, grado: e.target.value })} className="admin-input">
                            {gradosPorNivel(usuarioAcademicoForm.nivelEducativo).map((grado) => <option key={grado} value={grado}>{labelFromEnum(grado)}</option>)}
                          </select>
                        </AdminField>
                        <AdminField label="Seccion">
                          <select value={usuarioAcademicoForm.seccion ?? "A"} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, seccion: e.target.value })} className="admin-input">
                            {SECCIONES.map((seccion) => <option key={seccion} value={seccion}>{seccion}</option>)}
                          </select>
                        </AdminField>
                        <AdminField label="Estado matricula">
                          <select value={usuarioAcademicoForm.estadoMatricula ?? "MATRICULADO"} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, estadoMatricula: e.target.value })} className="admin-input">
                            {ESTADOS_MATRICULA.map((estado) => <option key={estado} value={estado}>{labelFromEnum(estado)}</option>)}
                          </select>
                        </AdminField>
                        <label className="flex items-center gap-2 text-[12px] font-bold text-monserrat-ink/65">
                          <input type="checkbox" checked={Boolean(usuarioAcademicoForm.pensionPagada)} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, pensionPagada: e.target.checked })} />
                          Pension pagada
                        </label>
                        <AdminField label="Observacion pension">
                          <textarea value={usuarioAcademicoForm.pensionObservacion ?? ""} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, pensionObservacion: e.target.value })} className="admin-input" />
                        </AdminField>
                      </div>
                    )}
                    <details className="rounded-[12px] border border-monserrat-ink/8 bg-monserrat-cream/20 p-3">
                      <summary className="cursor-pointer text-[11px] font-black uppercase tracking-[0.08em] text-monserrat-ink/50">Datos opcionales</summary>
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
                        <AdminField label="Foto URL" className="sm:col-span-2">
                          <input value={usuarioAcademicoForm.fotoUrl ?? ""} onChange={(e) => setUsuarioAcademicoForm({ ...usuarioAcademicoForm, fotoUrl: e.target.value })} className="admin-input" />
                        </AdminField>
                      </div>
                    </details>
                    <div className="flex gap-2">
                      <button disabled={isBusy} className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-monserrat-red py-2.5 text-[12px] font-black text-white transition hover:bg-monserrat-red/85 disabled:opacity-60">
                        {editingUsuarioAcademico ? <><Save size={13} /> Guardar</> : <><UserPlus size={13} /> Crear</>}
                      </button>
                      {editingUsuarioAcademico && (
                        <button type="button" onClick={() => { setEditingUsuarioAcademico(null); setUsuarioAcademicoForm(emptyUsuarioAcademico); }}
                          className="rounded-[10px] border border-monserrat-ink/12 px-3 text-[12px] font-bold text-monserrat-ink/60 hover:border-monserrat-ink/25">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold leading-5 text-monserrat-ink/45">
                      La contrasena inicial sera el mismo DNI y se pedira cambiarla en el primer ingreso.
                    </p>
                  </form>

                    <div className="grid gap-4">
                      <div className="rounded-[16px] border border-monserrat-ink/8 bg-white p-4 shadow-sm">
                        <AdminField label="Buscar usuario">
                          <input value={academicoSearch} onChange={(e) => setAcademicoSearch(e.target.value)} className="admin-input" placeholder="Nombre, DNI, aula o curso" />
                        </AdminField>
                      </div>
                      <AdminTable headers={["Codigo", "Nombre", "Rol", "Estado", "Detalle"]}
                        rows={usuariosFiltrados.map((u) => ({
                          id: u.id,
                          values: [u.codigo || u.dni, u.nombre, labelFromEnum(u.rol), labelFromEnum(u.estado ?? ""), u.rol === "DOCENTE" ? (u.especialidad || labelFromEnum(u.materia ?? "")) : `${labelFromEnum(u.grado ?? "")} ${u.seccion ?? ""}`.trim()],
                          onEdit: () => {
                            setEditingUsuarioAcademico(u);
                            setUsuarioAcademicoForm({ ...u });
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

function gradosPorNivel(nivel?: string) {
  return nivel === "SECUNDARIA" ? GRADOS_SECUNDARIA : GRADOS_PRIMARIA;
}

function defaultGrado(nivel: string) {
  return nivel === "SECUNDARIA" ? "PRIMERO_SECUNDARIA" : "PRIMERO_PRIMARIA";
}

function labelFromEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

